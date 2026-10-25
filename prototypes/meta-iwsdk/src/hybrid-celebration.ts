import { isForwardCompletion, type SpatialTask } from './garden-progress.ts';

export const IMMERSIVE_CELEBRATION_MS = 4500;
interface Session extends EventTarget { end(): Promise<void>; }
export interface CelebrationPlan { before: SpatialTask[]; after: SpatialTask[]; }
export interface CelebrationResult { saved: boolean; error?: string; }
interface Run {
  before: SpatialTask[];
  session?: Session;
  closed: boolean;
  plan?: CelebrationPlan;
  ended: boolean;
  started: boolean;
  ending: boolean;
  timer?: ReturnType<typeof setTimeout>;
  onEnd?: () => void;
}

/** Request in the click gesture; animate only after BOTH saving and AR adoption succeed. */
export class HybridCelebration {
  private current?: Run;
  private readonly requestListeners = new Set<() => void>();
  private readonly listeners = new Set<(plan: CelebrationPlan) => void>();
  error = '';
  private readonly schedule: typeof setTimeout;
  private readonly clear: typeof clearTimeout;
  constructor(schedule: typeof setTimeout = setTimeout, clear: typeof clearTimeout = clearTimeout) {
    this.schedule = schedule;
    this.clear = clear;
  }
  get busy(): boolean { return !!this.current; }
  get before(): readonly SpatialTask[] { return this.current?.before ?? []; }
  onRequest(listener: () => void): () => void {
    this.requestListeners.add(listener);
    return () => {this.requestListeners.delete(listener);};
  }
  get waitingToAnimate(): boolean { return !!this.current && !this.current.started; }
  onStart(listener: (plan: CelebrationPlan) => void): () => void {
    this.listeners.add(listener);
    return () => {this.listeners.delete(listener);};
  }
  async run(
    before: readonly SpatialTask[],
    save: () => Promise<boolean>,
    readAfter: () => readonly SpatialTask[],
    request: () => Promise<Session | undefined>,
  ): Promise<CelebrationResult> {
    if(this.current)return {saved: false};
    this.error = '';
    const run: Run = {before: before.map(({id,completed}) => ({id,completed})), closed: false, ended: false, started: false, ending: false};
    this.current = run;
    let requestError = '';
    // No await or capability probe may precede this request: it needs user activation.
    let requested: Promise<Session | undefined>;
    for(const listener of this.requestListeners)listener();
    try {requested = request();} catch(error) {requested = Promise.reject(error);}
    const adopted = requested.then(session => {
      if(!session)return undefined;
      run.session = session;
      run.onEnd = () => {run.closed = run.ended = true; this.error = ''; this.release(run);};
      session.addEventListener('end', run.onEnd, {once: true});
      if(run.ended)void this.end(run);
      return session;
    }).catch(error => {
      requestError = error instanceof Error ? error.message : 'AR is unavailable.';
      return undefined;
    });
    let saved = false;
    try {saved = await save();} catch { /* Task session owns the save error message. */ }
    const after = readAfter().map(({id,completed}) => ({id,completed}));
    const session = await adopted;
    if(!saved || !isForwardCompletion(before, after)) {
      run.ended = true;
      if(session)await this.end(run); else this.release(run);
      return {saved};
    }
    if(run.ended || this.current !== run) {
      if(session)await this.end(run);
      this.release(run);
      return {saved};
    }
    if(!session) {
      this.release(run);
      return {saved, error: requestError || 'Immersive AR is unavailable.'};
    }
    run.plan = {before: before.map(({id,completed}) => ({id,completed})), after};
    return {saved};
  }
  /** Called on the first visible, tracked XR frame that actually starts the animation. */
  start(session: Session, currentTasks?: readonly SpatialTask[]): CelebrationPlan | undefined {
    const run = this.current;
    if(!run || run.session !== session || !run.plan || run.started || run.ended)return;
    if(currentTasks && JSON.stringify(run.plan.after) !== JSON.stringify(currentTasks.map(({id,completed}) => ({id,completed})))) {
      this.cancel(); return;
    }
    run.started = true;
    run.timer = this.schedule(() => {void this.end(run);}, IMMERSIVE_CELEBRATION_MS);
    for(const listener of this.listeners)listener(run.plan);
    return run.plan;
  }
  cancel(): void {
    const run = this.current;
    if(!run)return;
    run.ended = true;
    if(run.session)void this.end(run);
    else this.release(run); // A late adoption will observe ended and close itself.
  }
  private async end(run: Run): Promise<void> {
    if(run.ending || run.closed)return;
    run.ending = true;
    if(run.timer !== undefined) {this.clear(run.timer); run.timer = undefined;}
    try {
      await run.session?.end();
      this.release(run);
    } catch {
      run.ending = false;
      this.error = 'Could not return to standard view. Select Exit AR to return; your task is saved.';
    }
  }
  private release(run: Run): void {
    if(run.timer !== undefined)this.clear(run.timer);
    if(run.session && run.onEnd)run.session.removeEventListener('end', run.onEnd);
    if(this.current === run)this.current = undefined;
  }
}

export const hybridCelebration = new HybridCelebration();
