import test from 'node:test';
import assert from 'node:assert/strict';
import { HybridCelebration, IMMERSIVE_CELEBRATION_MS } from './hybrid-celebration.ts';

const before=[{id:'one',completed:false},{id:'two',completed:false}];
const after=[{id:'one',completed:true},{id:'two',completed:false}];
function fixture() {
  let timer: (() => void) | undefined, delay=0, ends=0;
  const session=Object.assign(new EventTarget(),{async end(){ends++; session.dispatchEvent(new Event('end'));}});
  const controller=new HybridCelebration(
    ((callback: () => void, milliseconds: number) => {timer=callback; delay=milliseconds; return 1;}) as unknown as typeof setTimeout,
    (() => {timer=undefined;}) as unknown as typeof clearTimeout,
  );
  return {controller,session,get delay(){return delay;},get timer(){return timer;},get ends(){return ends;}};
}
const flush=async()=>{await Promise.resolve(); await Promise.resolve();};

test('requests AR synchronously within the task gesture and starts exactly 4500ms on animation frame',async()=>{
  const f=fixture(); const order:string[]=[]; let starts=0;
  f.controller.onStart(()=>starts++);
  const pending=f.controller.run(before,async()=>{order.push('save');return true;},()=>after,()=>{order.push('request');return Promise.resolve(f.session);});
  assert.deepEqual(order,['request','save']); assert.equal(f.timer,undefined);
  assert.equal((await pending).saved,true); assert.equal(f.timer,undefined);
  assert.deepEqual(f.controller.start(f.session,after),{before,after});
  assert.equal(f.delay,4500); assert.equal(f.delay,IMMERSIVE_CELEBRATION_MS); assert.equal(starts,1);
  assert.equal(f.controller.start(f.session),undefined); assert.equal(starts,1);
  f.timer!(); await flush(); assert.equal(f.ends,1); assert.equal(f.controller.busy,false);
});

test('a failed save closes AR without starting animation or scheduling the return timer',async()=>{
  const f=fixture();
  assert.equal((await f.controller.run(before,async()=>false,()=>before,async()=>f.session)).saved,false);
  assert.equal(f.ends,1); assert.equal(f.timer,undefined); assert.equal(f.controller.start(f.session),undefined);
});

test('denied or unsupported AR preserves the saved completion and returns an error for 2D feedback',async()=>{
  for(const request of [async()=>undefined, async()=>{throw Error('Permission denied');}]) {
    const f=fixture(); let saves=0;
    const result=await f.controller.run(before,async()=>{saves++;return true;},()=>after,request);
    assert.equal(result.saved,true); assert.ok(result.error); assert.equal(saves,1);
    assert.equal(f.controller.busy,false); assert.equal(f.timer,undefined);
  }
});

test('rapid repeat completion cannot save twice or request another session',async()=>{
  const f=fixture(); let requests=0,saves=0; let resolve!:(value:boolean)=>void;
  const pending=f.controller.run(before,()=>{saves++;return new Promise(r=>{resolve=r;});},()=>after,async()=>{requests++;return f.session;});
  assert.deepEqual(await f.controller.run(before,async()=>{saves++;return true;},()=>after,async()=>{requests++;return f.session;}),{saved:false});
  resolve(true); await pending; assert.equal(saves,1); assert.equal(requests,1); f.controller.cancel(); await flush();
});

test('manual XR exit clears the timer and never ends a later unrelated session',async()=>{
  const f=fixture(); await f.controller.run(before,async()=>true,()=>after,async()=>f.session);
  f.controller.start(f.session); await f.session.end();
  assert.equal(f.timer,undefined); assert.equal(f.controller.busy,false); assert.equal(f.ends,1);
});

test('early manual exit while storage is pending does not replay or end the session twice',async()=>{
  const f=fixture(); let resolve!:(value:boolean)=>void;
  const pending=f.controller.run(before,()=>new Promise(r=>{resolve=r;}),()=>after,async()=>f.session);
  await flush(); await f.session.end(); resolve(true); await pending;
  assert.equal(f.ends,1); assert.equal(f.controller.busy,false); assert.equal(f.controller.error,'');
});

test('cancel during a delayed session request closes late adoption and never animates',async()=>{
  const f=fixture(); let adopt!:(value:typeof f.session)=>void;
  const pending=f.controller.run(before,async()=>true,()=>after,()=>new Promise(r=>{adopt=r;}));
  f.controller.cancel(); adopt(f.session); await pending; await flush();
  assert.equal(f.ends,1); assert.equal(f.timer,undefined); assert.equal(f.controller.busy,false);
});

test('changed task data before the first frame cancels rather than animating a stale list',async()=>{
  const f=fixture(); await f.controller.run(before,async()=>true,()=>after,async()=>f.session);
  assert.equal(f.controller.start(f.session,before),undefined); await flush();
  assert.equal(f.ends,1); assert.equal(f.timer,undefined);
});

test('session end failure exposes a recoverable Exit AR message without changing tasks',async()=>{
  const f=fixture(); const session=Object.assign(new EventTarget(),{async end(){throw Error('End failed');}});
  await f.controller.run(before,async()=>true,()=>after,async()=>session);
  f.controller.start(session); f.timer!(); await flush();
  assert.match(f.controller.error,/Exit AR/); assert.equal(f.controller.busy,true);
  session.dispatchEvent(new Event('end')); assert.equal(f.controller.busy,false);
});


test('each later task starts a fresh timed session without replaying previous completions',async()=>{
  const f=fixture(); let starts=0; f.controller.onStart(()=>starts++);
  await f.controller.run(before,async()=>true,()=>after,async()=>f.session);
  f.controller.start(f.session,after); f.timer!(); await flush();
  const second=Object.assign(new EventTarget(),{async end(){second.dispatchEvent(new Event('end'));}});
  const allDone=after.map(task=>({...task,completed:true}));
  await f.controller.run(after,async()=>true,()=>allDone,async()=>second);
  assert.equal(f.controller.start(f.session),undefined);
  assert.deepEqual(f.controller.start(second,allDone),{before:after,after:allDone});
  assert.equal(starts,2); assert.equal(f.delay,4500);
  f.timer!(); await flush(); assert.equal(f.controller.busy,false);
});
