import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioContext as ThreeAudioContext, Object3D, Vector3, PositionalAudio } from 'three';
import { SpaceAudioManager,synthesizeSpace,SPACE_VOICES,SPACE_GAIN,SPACE_MASTER } from './space-audio.ts';
function fixture(state='running'){
 const events:Array<{kind:string;value:number;time?:number}>=[];
 const param=()=>({value:0,setTargetAtTime(v:number){this.value=v;},
 setValueAtTime(v:number,t:number){this.value=v;events.push({kind:'set',value:v,time:t});},
 linearRampToValueAtTime(v:number,t:number){events.push({kind:'ramp',value:v,time:t});},
 cancelScheduledValues(t:number){events.push({kind:'cancel',value:t});}});
 const node=()=>({connect(){},disconnect(){},gain:param()});
 const sources:Array<{stopped:boolean;onended:null|(()=>void);stop:()=>void}>=[];
 const buffers:Float32Array[]=[];
 const c={state,currentTime:0,destination:{},sampleRate:48000,
 listener:Object.fromEntries(['positionX','positionY','positionZ','forwardX','forwardY','forwardZ','upX','upY','upZ'].map(k=>[k,param()])),
 async resume(){this.state='running';},createGain:node,
 createDynamicsCompressor:()=>({...node(),threshold:param(),knee:param(),ratio:param(),attack:param(),release:param()}),
 createPanner:()=>({...node(),positionX:param(),positionY:param(),positionZ:param(),orientationX:param(),orientationY:param(),orientationZ:param()}),
 createBuffer:(_channels:number,length:number,rate:number)=>({duration:length/rate,copyToChannel(data:Float32Array){buffers.push(data.slice());}}),
 createBufferSource:()=>{const source={...node(),playbackRate:param(),detune:param(),stopped:false,onended:null,start(){},stop(){this.stopped=true;}};sources.push(source);return source;}};
 ThreeAudioContext.setContext(c as unknown as AudioContext);
 const head=new Object3D(),scene=new Object3D();scene.add(head);
 return {c,head,scene,sources,buffers,events,manager:new SpaceAudioManager(head,scene)};
}
test('procedural buffers have silent edges, finite samples and conservative mix headroom',()=>{
 for(const kind of ['plasma','pulsar'] as const){
  const samples=synthesizeSpace(kind);assert.equal(samples[0],0);assert.equal(samples[samples.length-1],0);
  assert.ok(samples.every(v=>Number.isFinite(v)&&Math.abs(v)<=.601));
 }
 // Peak budget leaves ample room for the existing 0.081 bird and 0.041 chime.
 assert.ok(.601*SPACE_GAIN*SPACE_MASTER*SPACE_VOICES+.081+.041<.2);
});
test('alignment uses real Three PositionalAudio at the star and drops excess voices',async()=>{
 const {manager,head,sources,buffers}=fixture();
 assert.equal(head.children.length,0);assert.equal(manager.playAt(new Vector3()),false);
 assert.equal(await manager.unlock(),true);assert.equal(buffers.length,2);
 assert.equal(head.children[0].type,'AudioListener');
 for(let i=0;i<SPACE_VOICES;i++)assert.equal(manager.playAt(new Vector3(i,1,-2)),true);
 assert.equal(manager.playAt(new Vector3()),false);assert.equal(sources.length,3);
 const voice=manager.root.children[1] as PositionalAudio;
 assert.ok(voice instanceof PositionalAudio);assert.deepEqual(voice.position.toArray(),[1,1,-2]);
 assert.equal(voice.panner.panningModel,'HRTF');
 sources[0].onended?.();assert.equal(manager.playAt(new Vector3(9,1,-2)),true);
 manager.stop();assert.ok(sources.slice(1).every(s=>s.stopped));
 manager.dispose();assert.equal(head.children.length,0);assert.equal(manager.root.parent,null);
});
test('suspended contexts never queue; stopping the space bus cancels playback without touching other audio',async()=>{
 const {manager,c,sources,events}=fixture('suspended');
 assert.equal(manager.playAt(new Vector3()),false);await manager.unlock();assert.equal(sources.length,0);
 assert.equal(manager.playAt(new Vector3()),true);assert.equal(sources[0].stopped,false);
 c.state='suspended';assert.equal(manager.playAt(new Vector3()),false);
 const count=sources.length;c.state='running';assert.equal(sources.length,count);
 manager.stop();assert.equal(sources[0].stopped,true);manager.dispose();
 assert.equal(await manager.unlock(),false);
});
