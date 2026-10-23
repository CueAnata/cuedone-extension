/** Original local synthesized birds, for the Living Trellis and its ambient bird loop. */
export class ZenAudio {
  private context: AudioContext | null = null;
  private sources: OscillatorNode[] = [];
  private voices: GainNode[] = [];
  private panner: PannerNode | null = null;
  private envelope: GainNode | null = null;
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
      if (this.context.state !== 'running') await this.context.resume();
      return this.context.state === 'running';
    } catch { return false; }
  }

  /** Never queues playback for later activation. A locked document stays silent. */
  play(): boolean {
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
      this.envelope.gain.setValueAtTime(0,now);
      this.envelope.gain.linearRampToValueAtTime(0.045,now+0.08);
      this.envelope.gain.exponentialRampToValueAtTime(0.0001,now+1.8);
      this.envelope.connect(this.panner);
      this.panner.connect(context.destination);
      for (const [index,frequency] of [1800,2400,2100,2700].entries()) {
        const oscillator = context.createOscillator();
        oscillator.type = 'sine'; oscillator.frequency.value = frequency;
        const start=now+index*0.3;
        const voice=context.createGain();
        voice.gain.setValueAtTime(0,start);
        voice.gain.linearRampToValueAtTime(0.45,start+0.025);
        voice.gain.exponentialRampToValueAtTime(0.0001,start+0.24);
        {
          oscillator.frequency.setValueAtTime(frequency,start);
          oscillator.frequency.exponentialRampToValueAtTime(frequency*1.5,start+0.08);
          oscillator.frequency.exponentialRampToValueAtTime(frequency*0.85,start+0.22);
        }
        oscillator.connect(voice);voice.connect(this.envelope);this.voices.push(voice);
        this.sources.push(oscillator);
        oscillator.start(start); oscillator.stop(start+0.26);
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
    if (!this.context || !this.panner) return;
    const listener = this.context.listener;
    const t = this.context.currentTime;
    const set = (parameter: AudioParam, value: number | undefined) => parameter.setValueAtTime(value ?? 0,t);
    set(listener.positionX,head.x); set(listener.positionY,head.y); set(listener.positionZ,head.z);
    set(listener.forwardX,forward.x);set(listener.forwardY,forward.y);set(listener.forwardZ,forward.z);
    set(listener.upX,up.x);set(listener.upY,up.y);set(listener.upZ,up.z);
    set(this.panner.positionX,source.x);set(this.panner.positionY,source.y);set(this.panner.positionZ,source.z);
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
    this.envelope = null; this.panner = null;
  }
  dispose(): void { this.stop(); void this.context?.close().catch(() => {}); this.context = null; }
}
