import test from 'node:test';
import assert from 'node:assert/strict';
import { ZenAudio } from './zen-audio.ts';
function context(state='running') {
  const sources: Array<{stopped:boolean;stops:number;onended:null|(()=>void);frequency:ReturnType<typeof param>;start:(t:number)=>void;stop:()=>void;connect:()=>void;disconnect:()=>void}> = [];
  function param(){return{value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}};}
  const node=()=>({connect(){},disconnect(){},gain:param()});
  const c={state,currentTime:0,destination:{},listener:Object.fromEntries(['positionX','positionY','positionZ','forwardX','forwardY','forwardZ','upX','upY','upZ'].map(k=>[k,param()])),
    async resume(){this.state='running';},async close(){this.state='closed';},
    createGain:node,
    createPanner:()=>({...node(),positionX:param(),positionY:param(),positionZ:param()}),
    createOscillator:()=>{const o={...node(),stopped:false,stops:0,onended:null,frequency:param(),start(){},stop(){this.stopped=true;this.stops++;}};sources.push(o);return o;},
  };
  return{c,sources,audio:new ZenAudio(()=>c as unknown as AudioContext)};
}
test('locked or inactive audio never queues a future bird cue',async()=>{
  const {audio,sources}=context();assert.equal(audio.play(),false);
  await audio.unlock();assert.equal(sources.length,0);audio.dispose();
});
test('bird cue uses four local chirps and Off stops scheduled chirps immediately',async()=>{
  const {audio,sources}=context();await audio.unlock();assert.equal(audio.play(),true);
  assert.equal(sources.length,4);audio.stop();assert.equal(sources.every(source=>source.stops===2),true);
  audio.dispose();
});
test('replacement cues stop prior audio rather than overlapping it',async()=>{
  const {audio,sources}=context();await audio.unlock();audio.play();audio.play();
  assert.equal(sources.length,8);assert.equal(sources.slice(0,4).every(source=>source.stopped),true);
  audio.dispose();assert.equal(sources.every(source=>source.stopped),true);
});
test('audio unavailability does not throw into task saving or garden rendering',async()=>{
  const audio=new ZenAudio(()=>{throw Error('not supported');});
  assert.equal(await audio.unlock(),false);assert.equal(audio.play(),false);audio.dispose();
});

