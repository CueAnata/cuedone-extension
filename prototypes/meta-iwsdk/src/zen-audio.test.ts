import test from 'node:test';
import assert from 'node:assert/strict';
import { ZenAudio } from './zen-audio.ts';
function context(state='running') {
  const sources: Array<{stopped:boolean;stops:number;onended:null|(()=>void);frequency:ReturnType<typeof param>;start:(t:number)=>void;stop:()=>void;connect:()=>void;disconnect:()=>void}> = [];
  function param(){return{value:0,setValueAtTime(value:number){this.value=value;},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}};}
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
test('XR activation explicitly resumes a running context without starting a cue',async()=>{
  const {audio,c,sources}=context();let resumes=0;
  c.resume=async()=>{resumes++;c.state='running';};
  assert.equal(await audio.unlock(),true);
  assert.equal(resumes,1);assert.equal(sources.length,0);audio.dispose();
});
test('listener follows the camera pose before the first bird cue exists',async()=>{
  const {audio,c}=context();await audio.unlock();
  audio.update({x:1,y:2,z:3},{x:1,y:0,z:0},{x:0,y:1,z:0},{});
  assert.equal(c.listener.positionX.value,1);assert.equal(c.listener.positionY.value,2);
  assert.equal(c.listener.positionZ.value,3);assert.equal(c.listener.forwardX.value,1);
  assert.equal(c.listener.forwardZ.value,0);assert.equal(c.listener.upY.value,1);
  audio.dispose();
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


test('ambient birds require activation, repeat with bounded voices, and stop when disabled', async () => {
  const {audio,sources}=context();
  audio.setAmbient(true);
  audio.tick(1/30);
  assert.equal(sources.length,0);
  await audio.unlock();
  audio.tick(1/30);
  assert.equal(sources.length,4);
  // Finish the chirp phrase; no queued oscillator or background timer is retained.
  for(const source of sources.slice())source.onended?.();
  for(let i=0;i<240;i++)audio.tick(1/30);
  assert.equal(sources.length,8);
  audio.setAmbient(false);
  const count=sources.length;
  for(let i=0;i<1000;i++)audio.tick(1/30);
  assert.equal(sources.length,count);
  assert.equal(sources.every(source=>source.stopped),true);
  audio.dispose();
});

test('immersive reactivation resumes suspended birds and restarts the entry cue',async()=>{
  const {audio,c,sources}=context();
  await audio.unlock();audio.setAmbient(true);audio.tick(1/90);
  assert.equal(sources.length,4);
  audio.setAmbient(false);c.state='suspended';
  audio.setAmbient(true);audio.tick(1/90);
  assert.equal(sources.length,4);
  await audio.unlock();audio.tick(1/90);
  assert.equal(sources.length,8);
  audio.setAmbient(false);audio.tick(1/90);
  assert.equal(sources.length,8);audio.dispose();
});

test('sci-fi finale uses lower electronic tones, has no bird frequencies and stops immediately',async()=>{
  const {audio,sources}=context();assert.equal(audio.play('scifi'),false);
  await audio.unlock();assert.equal(audio.play('scifi'),true);
  assert.equal(sources.length,4);
  assert.ok(sources.every(source=>source.frequency.value<1800));
  audio.stop();assert.ok(sources.every(source=>source.stops===2));audio.dispose();
});
