import { themeAudioOutput, releaseThemeAudioOutput } from './theme-audio-output.ts';

/** Local synthesized theme cues; only the garden has an ambient bird loop. */
export class ZenAudio {
  private context: AudioContext | null = null;
  private sources: OscillatorNode[] = [];
  private voices: GainNode[] = [];
  private panner: PannerNode | null = null;
  private envelope: GainNode | null = null;
  private birdFilter: BiquadFilterNode | null = null;
  private generation = 0;
  private ambient = false;
  private ambientWait = 0;

  setAmbient(enabled: boolean): void {
    if(enabled === this.ambient)return;
    this.ambient = enabled;
    this.ambientWait = 0;
    if(!enabled)this.stop();
  }

  /** Frame-driven scheduling avoids background timers and never accumulates missed chirps. */
  tick(delta: number): void {
    if(!this.ambient || !this.context || this.context.state !== 'running')return;
    this.ambientWait -= Math.max(0, Math.min(delta, 1/30));
    if(this.ambientWait <= 0 && this.sources.length === 0) {
      if(this.play())this.ambientWait = 7;
    }
  }
  private readonly createContext: () => AudioContext;
  constructor(createContext: () => AudioContext = () => new AudioContext()) { this.createContext = createContext; }

  /** Call synchronously from a gesture in THIS document; remote storage cannot unlock audio. */
  async unlock(): Promise<boolean> {
    try {
      this.context ??= this.createContext();
      // Explicitly resume on XR entry even if the browser reports running.
      await this.context.resume();
      return this.context.state === 'running';
    } catch { return false; }
  }

  /** Never queues playback for later activation. A locked document stays silent. */
  play(style: 'garden' | 'scifi' | 'bubble' | 'whale' = 'garden'): boolean {
    this.stop();
    const context = this.context;
    if (!context || context.state !== 'running') return false;
    try {
      const generation = this.generation;
      this.panner = context.createPanner();
      this.panner.panningModel = 'HRTF';
      this.panner.distanceModel = 'inverse';
      this.panner.refDistance = 1;
      this.panner.maxDistance = 8;
      this.envelope = context.createGain();
      const now = context.currentTime;
      const bubble=style==='bubble',whale=style==='whale';
      const spacing=bubble?0.065:whale?0.55:0.3;
      const length=bubble?0.12:whale?0.85:0.26;
      const frequencies=bubble?[420,640,880]:whale?[165,130,195]:style==='scifi'?[220,330,440,880]:[1800,2400,2100,2700];
      this.envelope.gain.setValueAtTime(0,now);
      this.envelope.gain.linearRampToValueAtTime(0.045,now+(bubble?0.015:0.08));
      this.envelope.gain.exponentialRampToValueAtTime(0.0001,now+(bubble?0.26:whale?2:1.8));
      if(style === 'garden') {
        this.birdFilter = context.createBiquadFilter();
        this.birdFilter.type = 'lowpass';
        this.birdFilter.frequency.setValueAtTime(2500, now);
        this.envelope.connect(this.birdFilter);
        this.birdFilter.connect(this.panner);
      } else this.envelope.connect(this.panner);
      this.panner.connect(themeAudioOutput(context));
      for (const [index,frequency] of frequencies.entries()) {
        const oscillator = context.createOscillator();
        oscillator.type = style==='scifi'?'triangle':'sine'; oscillator.frequency.value = frequency;
        const start=now+index*spacing;
        const voice=context.createGain();
        voice.gain.setValueAtTime(0,start);
        voice.gain.linearRampToValueAtTime(0.45,start+(bubble?0.008:whale?0.12:0.025));
        voice.gain.exponentialRampToValueAtTime(0.0001,start+length-0.02);
        {
          oscillator.frequency.setValueAtTime(frequency,start);
          oscillator.frequency.exponentialRampToValueAtTime(frequency*(bubble?2.4:whale?1.25:style==='scifi'?2:1.5),start+(bubble?0.04:whale?0.35:0.08));
          oscillator.frequency.exponentialRampToValueAtTime(frequency*(bubble?0.8:whale?0.65:style==='scifi'?1.5:0.85),start+length-0.04);
        }
        oscillator.connect(voice);voice.connect(this.envelope);this.voices.push(voice);
        this.sources.push(oscillator);
        oscillator.start(start); oscillator.stop(start+length);
      }
      let remaining = this.sources.length;
      this.sources.forEach(source => { source.onended = () => {
        source.disconnect();
        if (--remaining === 0 && generation === this.generation) this.stop();
      }; });
      return true;
    } catch { this.stop(); return false; }
  }

  update(head: DOMPointInit, forward: DOMPointInit, up: DOMPointInit, source: DOMPointInit): void {
    if (!this.context) return;
    const listener = this.context.listener;
    const t = this.context.currentTime;
    const set = (parameter: AudioParam, value: number | undefined) => parameter.setValueAtTime(value ?? 0,t);
    set(listener.positionX,head.x); set(listener.positionY,head.y); set(listener.positionZ,head.z);
    set(listener.forwardX,forward.x);set(listener.forwardY,forward.y);set(listener.forwardZ,forward.z);
    set(listener.upX,up.x);set(listener.upY,up.y);set(listener.upZ,up.z);
    if(this.panner) {
      set(this.panner.positionX,source.x);set(this.panner.positionY,source.y);set(this.panner.positionZ,source.z);
    }
  }
  stop(): void {
    this.generation++;
    for (const source of this.sources) {
      source.onended = null;
      try { source.stop(); } catch { /* already ended */ }
      source.disconnect();
    }
    this.sources = [];
    this.voices.forEach(voice=>voice.disconnect());this.voices=[];
    this.envelope?.disconnect(); this.panner?.disconnect();
    this.birdFilter?.disconnect(); this.birdFilter = null;
    this.envelope = null; this.panner = null;
  }
  dispose(): void {
    this.stop();
    if(this.context) {releaseThemeAudioOutput(this.context);void this.context.close().catch(() => {});}
    this.context = null;
  }
}
