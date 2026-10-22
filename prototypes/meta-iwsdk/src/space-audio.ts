import { AudioListener, PositionalAudio, Group, Vector3, type Object3D } from 'three';

export const SPACE_DURATION=1.6;
export const SPACE_VOICES=3;
export const SPACE_GAIN=.025;
export const SPACE_MASTER=.5;
export type SpaceTexture='plasma'|'pulsar';

/** Original procedural sonification-inspired textures, NOT NASA/Voyager data. */
export function synthesizeSpace(texture:SpaceTexture,sampleRate=22050):Float32Array<ArrayBuffer> {
  const samples=new Float32Array(Math.ceil(sampleRate*SPACE_DURATION));
  let phase=0;
  for(let i=0;i<samples.length;i++){
    const t=i/sampleRate;
    // Smooth onset/release is embedded, including an exactly silent final sample.
    const envelope=Math.sin(Math.PI*Math.min(1,t/.12)/2)**2*
      Math.sin(Math.PI*Math.min(1,(samples.length-1-i)/(sampleRate*.4))/2)**2;
    const frequency=texture==='plasma'?170+95*Math.sin(t*2.1)+65*t:260+35*Math.sin(t*9);
    phase+=2*Math.PI*frequency/sampleRate;
    const modulation=texture==='plasma'?.65+.35*Math.sin(t*7)**2:.18+.82*Math.sin(t*Math.PI*4)**8;
    samples[i]=.6*envelope*modulation*(.65*Math.sin(phase)+.25*Math.sin(phase*1.997)+.1*Math.sin(phase*3.003));
  }
  samples[0]=0;samples[samples.length-1]=0;
  return samples;
}

/** Lazy gesture-activated Three audio graph. No fetches, queued cues or shared bird nodes. */
export class SpaceAudioManager {
  readonly root=new Group();
  private listener:AudioListener|null=null;
  private voices:PositionalAudio[]=[];
  private buffers:AudioBuffer[]=[];
  private compressor:DynamicsCompressorNode|null=null;
  private disposed=false;
  constructor(head:Object3D,scene:Object3D){
    this.head=head;this.root.name='Constellation space sonification';
    scene.add(this.root);
  }
  private readonly head:Object3D;
  async unlock():Promise<boolean>{
    if(this.disposed)return false;
    try {
      if(!this.listener){
        const listener=new AudioListener();this.listener=listener;this.head.add(listener);
        const context=listener.context;
        const compressor=context.createDynamicsCompressor();this.compressor=compressor;
        compressor.threshold.value=-20;compressor.knee.value=12;compressor.ratio.value=6;
        compressor.attack.value=.015;compressor.release.value=.25;
        listener.setFilter(compressor);listener.setMasterVolume(SPACE_MASTER);
        this.buffers=(['plasma','pulsar'] as const).map(texture=>{
          const samples=synthesizeSpace(texture);
          const buffer=context.createBuffer(1,samples.length,22050);
          buffer.copyToChannel(samples,0);return buffer;
        });
        for(let i=0;i<SPACE_VOICES;i++){
          const voice=new PositionalAudio(listener);voice.name=`Constellation space voice ${i}`;
          voice.setRefDistance(1).setMaxDistance(8).setRolloffFactor(1).setVolume(SPACE_GAIN);
          voice.panner.panningModel='HRTF';voice.setLoop(false);
          this.voices.push(voice);this.root.add(voice);
        }
      }
      const context=this.listener.context;
      if(context.state!=='running')await context.resume();
      return !this.disposed && context.state==='running';
    }catch {this.releaseGraph();return false;}
  }
  playAt(worldPosition:Vector3):boolean {
    const listener=this.listener;
    if(this.disposed || !listener || listener.context.state!=='running')return false;
    // Drop excess simultaneous events rather than stealing or queuing a voice.
    const voice=this.voices.find(v=>!v.isPlaying);if(!voice)return false;
    try {
      this.root.updateWorldMatrix(true,false);
      voice.position.copy(this.root.worldToLocal(worldPosition.clone()));
      const variant=Math.abs(Math.round(worldPosition.x*17+worldPosition.y*11+worldPosition.z*7))%this.buffers.length;
      voice.setBuffer(this.buffers[variant]);voice.play();
      this.head.updateWorldMatrix(true,false);listener.updateMatrixWorld(true);
      voice.updateMatrixWorld(true);return true;
    }catch {if(voice.isPlaying)voice.stop();return false;}
  }
  stop():void {
    for(const voice of this.voices)if(voice.isPlaying)voice.stop();
    if(this.listener){
      const context=this.listener.context,gain=this.listener.gain.gain;
      gain.cancelScheduledValues(context.currentTime);gain.setValueAtTime(SPACE_MASTER,context.currentTime);
    }
  }
  private releaseGraph():void {
    this.stop();
    for(const voice of this.voices){
      voice.disconnect();voice.gain.disconnect();voice.panner.disconnect();voice.removeFromParent();
    }
    this.voices=[];this.buffers=[];
    this.listener?.gain.disconnect();this.compressor?.disconnect();
    this.listener?.removeFromParent();this.listener=null;this.compressor=null;
    // Three owns its shared AudioContext; never close/suspend it here.
  }
  dispose():void {this.disposed=true;this.releaseGraph();this.root.removeFromParent();}
}
