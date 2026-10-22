import test from 'node:test';
import assert from 'node:assert/strict';
import { handsOnlyManager, installHandsOnlyInput, isTrackedHand, useEmulatedHands } from './hands-only-input.ts';
function fixture(){
  const tip={} as XRJointSpace;
  const hand={hand:new Map([['index-finger-tip',tip]]),handedness:'left',targetRaySpace:{}} as unknown as XRInputSource;
  const controller={handedness:'right',gamepad:{buttons:[{pressed:true}]},targetRaySpace:{}} as unknown as XRInputSource;
  let tracked=true;
  const frame={getJointPose:()=>tracked?{}:null,getPose:()=>tracked?{}:null} as unknown as XRFrame;
  class Session extends EventTarget {
    #marker='native receiver';
    inputSources=[controller,hand];trackedSources=[controller,hand];
    get marker(){return this.#marker;}
    nativeMethod(){return this.#marker;}
  }
  const session=new Session();
  const manager={getSession:()=>session as unknown as XRSession,getFrame:()=>frame,getReferenceSpace:()=>({} as XRReferenceSpace)};
  return{hand,controller,frame,session,manager,loseTracking:()=>{tracked=false;}};
}
test('controller and tracked-controller sources are excluded before pointer processing',()=>{
  const {manager,hand,loseTracking}=fixture();const filtered=handsOnlyManager(manager);
  assert.deepEqual(Array.from(filtered.getSession()!.inputSources),[hand]);
  assert.deepEqual((filtered.getSession()! as XRSession & {trackedSources:XRInputSource[]}).trackedSources,[hand]);
  loseTracking();assert.equal(filtered.getSession()!.inputSources.length,0);
});
test('session view is stable and preserves native method and event listener receivers',()=>{
  const {manager,session}=fixture();const filtered=handsOnlyManager(manager);
  const view=filtered.getSession()! as XRSession & {nativeMethod():string;marker:string};
  assert.equal(view,filtered.getSession());assert.equal(view.marker,'native receiver');assert.equal(view.nativeMethod(),'native receiver');
  let calls=0;const onSelect=()=>calls++;
  view.addEventListener('selectstart',onSelect);session.dispatchEvent(new Event('selectstart'));
  view.removeEventListener('selectstart',onSelect);session.dispatchEvent(new Event('selectstart'));assert.equal(calls,1);
});
test('missing joints, poses or hand tracking fail closed with no controller fallback',()=>{
  const {hand,controller,frame}=fixture();const space={} as XRReferenceSpace;
  assert.equal(isTrackedHand(controller,frame,space),false);
  assert.equal(isTrackedHand(hand,null,space),false);
  assert.equal(isTrackedHand(hand,frame,null),false);
  assert.equal(isTrackedHand({...hand,hand:new Map()} as unknown as XRInputSource,frame,space),false);
});
test('hands-only installation hides controller models and filters each SDK update',()=>{
  const {manager,controller}=fixture();const visuals:boolean[]=[];const seen:XRInputSource[][]=[];
  const original=function(m:typeof manager){seen.push(Array.from(m.getSession()!.inputSources));};
  const input={update:original,visualAdapters:{controller:{left:{toggleVisual:(v:boolean)=>visuals.push(v)},right:{toggleVisual:(v:boolean)=>visuals.push(v)}}}};
  const cleanup=installHandsOnlyInput(input);input.update(manager);
  assert.deepEqual(visuals,[false,false]);assert.equal(seen[0].includes(controller),false);
  cleanup();assert.equal(input.update,original);
});
test('development emulation defaults to hands and disconnects both emulated controllers',()=>{
  const device={primaryInputMode:'controller' as 'controller'|'hand',controllers:{left:{connected:true},right:{connected:true}}};
  useEmulatedHands(device);assert.equal(device.primaryInputMode,'hand');
  assert.equal(device.controllers.left.connected,false);assert.equal(device.controllers.right.connected,false);
  assert.doesNotThrow(()=>useEmulatedHands(undefined));
});
