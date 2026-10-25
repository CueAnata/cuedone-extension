import test from 'node:test';
import assert from 'node:assert/strict';
import { PerspectiveCamera } from 'three';
import { ReferenceSpaceType, type World } from '@iwsdk/core';
import { arSessionInit, launchAR, FinalTaskAR, FINAL_AR_MS } from './ar-session.ts';

function fixture(t: import('node:test').TestContext) {
  const original = Object.getOwnPropertyDescriptor(globalThis,'requestAnimationFrame');
  Object.defineProperty(globalThis,'requestAnimationFrame',{configurable:true,value:(callback: FrameRequestCallback)=>{callback(0);return 1;}});
  t.after(()=>{if(original)Object.defineProperty(globalThis,'requestAnimationFrame',original);else Reflect.deleteProperty(globalThis,'requestAnimationFrame');});
  const overlay = {hidden:true} as HTMLElement;
  const camera = new PerspectiveCamera();camera.position.set(0,1.45,0.8);
  const referenceRequests: string[]=[];
  const events = new EventTarget();
  const session = Object.assign(events, {
    async requestReferenceSpace(type: string) {
      referenceRequests.push(type);
      if(type==='bounded-floor')throw new Error('No room boundary');
      return {} as XRReferenceSpace;
    },
    async end(){events.dispatchEvent(new Event('end'));},
  }) as unknown as XRSession;
  let adopted=0;
  const xrRenderer = {enabled:false, setReferenceSpaceType(type:string){assert.equal(type,'local-floor');},
    async setSession(){adopted++;camera.position.set(9,9,9);}};
  const world = {camera,xrEnabled:true,sessionRequestPending:false,session:undefined,
    xrDefaults:{features:{handTracking:{required:true},anchors:true},referenceSpace:{type:ReferenceSpaceType.BoundedFloor,fallbackOrder:[ReferenceSpaceType.LocalFloor,ReferenceSpaceType.Local]}},
    renderer:{xr:xrRenderer}} as unknown as World;
  return {overlay,world,session,referenceRequests,get adopted(){return adopted;}};
}

test('DOM overlay request preserves existing required features and avoids duplicate optional descriptors',()=>{
  const overlay={} as HTMLElement;
  const init=arSessionInit({requiredFeatures:['hand-tracking'],optionalFeatures:['anchors','dom-overlay']},overlay);
  assert.deepEqual(init.requiredFeatures,['hand-tracking']);
  assert.deepEqual(init.optionalFeatures,['anchors','dom-overlay']);
  assert.equal(init.domOverlay?.root,overlay);
});

test('AR entry requests passthrough plus overlay, preserves fallback spaces, and restores camera on exit',async t=>{
  const f=fixture(t);
  const xr={async requestSession(mode:XRSessionMode,init?:XRSessionInit){
    assert.equal(mode,'immersive-ar');
    assert.ok(init?.requiredFeatures?.includes('hand-tracking'));
    assert.ok(init?.optionalFeatures?.includes('anchors'));
    assert.ok(init?.optionalFeatures?.includes('dom-overlay'));
    assert.equal(init?.domOverlay?.root,f.overlay);
    return f.session;
  }};
  assert.equal(await launchAR(f.world,f.overlay,xr),true);
  assert.equal(f.adopted,1);
  assert.deepEqual(f.referenceRequests,['bounded-floor','local-floor']);
  assert.equal(f.world.session,f.session);
  assert.equal(f.overlay.hidden,false);
  await f.session.end();
  assert.equal(f.world.session,undefined);
  assert.equal(f.overlay.hidden,true);
  assert.deepEqual(f.world.camera.position.toArray(),[0,1.45,0.8]);
});

test('double entry only makes one native request while permission is pending',async t=>{
  const f=fixture(t);let requests=0;let release!:(session:XRSession)=>void;
  const xr={requestSession(){requests++;return new Promise<XRSession>(resolve=>{release=resolve;});}};
  const pending=launchAR(f.world,f.overlay,xr);
  assert.equal(requests,1);
  assert.equal(await launchAR(f.world,f.overlay,xr),false);
  release(f.session);await pending;
  assert.equal(requests,1);
  await f.session.end();
});

test('denied AR never retries VR and clears pending UI so entry can be retried',async t=>{
  const f=fixture(t);const modes:XRSessionMode[]=[];
  const xr={async requestSession(mode:XRSessionMode){modes.push(mode);throw new Error('Permission denied');}};
  await assert.rejects(launchAR(f.world,f.overlay,xr),/Permission denied/);
  assert.deepEqual(modes,['immersive-ar']);
  assert.equal(f.world.sessionRequestPending,false);
  assert.equal(f.world.session,undefined);
  assert.equal(f.overlay.hidden,true);
});

test('failed renderer adoption ends the native session without leaving an active overlay',async t=>{
  const f=fixture(t);let ended=0;
  f.session.addEventListener('end',()=>ended++);
  f.world.renderer.xr.setSession=async()=>{throw new Error('Renderer failed');};
  await assert.rejects(launchAR(f.world,f.overlay,{async requestSession(){return f.session;}}),/Renderer failed/);
  assert.equal(ended,1);
  assert.equal(f.world.session,undefined);
  assert.equal(f.world.sessionRequestPending,false);
  assert.equal(f.overlay.hidden,true);
});


const finaleBefore=[{id:'one',completed:true},{id:'two',completed:false}];
const finaleAfter=finaleBefore.map(task=>({...task,completed:true}));
function finalFixture() {
  let timer: (()=>void) | undefined, delay=0, ends=0;
  const session=Object.assign(new EventTarget(),{async end(){ends++;session.dispatchEvent(new Event('end'));}});
  const controller=new FinalTaskAR(
    ((callback:()=>void,ms:number)=>{timer=callback;delay=ms;return 1;}) as unknown as typeof setTimeout,
    (()=>{timer=undefined;}) as unknown as typeof clearTimeout,
  );
  return {controller,session,get timer(){return timer;},get delay(){return delay;},get ends(){return ends;}};
}
const settle=async()=>{await Promise.resolve();await Promise.resolve();};

test('only the last unfinished task may prepare an AR finale',()=>{
  const f=finalFixture();
  assert.equal(f.controller.begin([]),undefined);
  assert.equal(f.controller.begin(finaleAfter),undefined);
  assert.equal(f.controller.begin(finaleBefore.map(task=>({...task,completed:false}))),undefined);
  assert.ok(f.controller.begin(finaleBefore));
  assert.equal(f.controller.begin(finaleBefore),undefined);
});

test('native session watchdog ends AR after 4500ms even if no animation frame ever arrives',async()=>{
  const f=finalFixture();const run=f.controller.begin(finaleBefore)!;
  f.controller.attach(run,f.session);
  assert.equal(f.delay,FINAL_AR_MS);assert.equal(f.delay,4500);
  f.timer!();await settle();
  assert.equal(f.ends,1);assert.equal(f.controller.busy,false);
});

test('finale starts only after saving and resets its 4500ms exit deadline on the first rendered frame',async()=>{
  const f=finalFixture();const run=f.controller.begin(finaleBefore)!;
  f.controller.attach(run,f.session);
  assert.equal(f.controller.start(f.session,finaleBefore),undefined);
  f.controller.saved(run,finaleAfter);
  assert.deepEqual(f.controller.start(f.session,finaleAfter),{before:finaleBefore,after:finaleAfter});
  assert.equal(f.controller.start(f.session,finaleAfter),undefined);
  assert.equal(f.delay,4500);
  f.timer!();await settle();assert.equal(f.ends,1);
});

test('failed save, stale list, manual exit and late native adoption do not replay a finale',async()=>{
  for(const mode of ['failed','stale','manual','late']) {
    const f=finalFixture();const run=f.controller.begin(finaleBefore)!;
    if(mode==='late')f.controller.cancel(run);
    f.controller.attach(run,f.session);
    if(mode==='failed')f.controller.saved(run,finaleBefore);
    if(mode==='stale'){f.controller.saved(run,finaleAfter);assert.equal(f.controller.start(f.session,finaleBefore),undefined);}
    if(mode==='manual')await f.session.end();
    await settle();
    assert.equal(f.ends,1);assert.equal(f.timer,undefined);assert.equal(f.controller.busy,false);
    assert.equal(f.controller.start(f.session,finaleAfter),undefined);
  }
});

test('watchdog is attached before asynchronous reference-space setup can stall',async t=>{
  const f=fixture(t);const c=finalFixture();const run=c.controller.begin(finaleBefore)!;
  let release!:(space:XRReferenceSpace)=>void;
  f.session.requestReferenceSpace=()=>new Promise(resolve=>{release=resolve;});
  const pending=launchAR(f.world,f.overlay,{async requestSession(){return f.session;}},
    session=>c.controller.attach(run,session));
  await settle();assert.equal(c.delay,4500);
  c.timer!();await settle();
  assert.equal(f.overlay.hidden,true);
  release({} as XRReferenceSpace);
  assert.equal(await pending,false);
  assert.equal(f.world.sessionRequestPending,false);
});
