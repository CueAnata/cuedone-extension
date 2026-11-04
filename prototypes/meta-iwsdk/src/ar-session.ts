import { isFinalCompletion, type SpatialTask } from './garden-progress.ts';
import { buildSessionInit, normalizeReferenceSpec, resolveReferenceSpaceType,
  SessionMode, type World } from '@iwsdk/core';

/** Keep native AR optional-feature handling: unsupported overlays never force VR. */
export function arSessionInit(base: XRSessionInit, overlay: Element): XRSessionInit {
  return {
    ...base,
    optionalFeatures: [...new Set([...(base.optionalFeatures ?? []), 'dom-overlay'])],
    domOverlay: {root: overlay},
  };
}

/** Prototype-local launcher until IWSDK exposes DOM overlay in XROptions. */
export async function launchAR(
  world: World,
  overlay: HTMLElement,
  xr: Pick<XRSystem, 'requestSession'> | undefined = navigator.xr,
  onSession?: (session: XRSession) => void,
  onRestored?: () => void,
): Promise<boolean> {
  if(world.session || world.sessionRequestPending)return false;
  if(!world.xrEnabled || !xr)throw new Error('Mixed reality is unavailable in this browser.');
  const options = {...world.xrDefaults, sessionMode: SessionMode.ImmersiveAR};
  const init = arSessionInit(buildSessionInit(options), overlay);
  const reference = normalizeReferenceSpec(options.referenceSpace);
  const camera = world.camera.clone();
  let session: XRSession | undefined;
  let ended = false;
  world.sessionRequestPending = true;
  overlay.hidden = false;
  const onEnd = () => {
    ended = true;
    overlay.hidden = true;
    if(!onRestored && world.session === session)world.session = undefined;
    // Let Three finish releasing its XR camera before restoring the browser view.
    const restore = () => {
      if(onRestored && world.renderer.xr.isPresenting) {
        requestAnimationFrame(restore);
        return;
      }
      if(onRestored && world.session === session)world.session = undefined;
      if(!world.session && options.restoreCameraOnExit !== false) {
        world.camera.copy(camera, false);
        world.camera.updateMatrixWorld(true);
      }
      onRestored?.();
    };
    requestAnimationFrame(restore);
  };
  try {
    // Request synchronously in the click gesture. Try immersive-ar first, fallback to immersive-vr.
    try {
      session = await xr.requestSession('immersive-ar', init);
    } catch (arError) {
      // Fallback to immersive-vr if AR unavailable (e.g., Quest Browser without AR)
      const vrInit: XRSessionInit = {
        ...init,
        optionalFeatures: (init.optionalFeatures ?? []).filter(f => f !== 'dom-overlay'),
        domOverlay: undefined,
      };
      try {
        session = await xr.requestSession('immersive-vr', vrInit);
      } catch {
        throw arError;
      }
    }
    session.addEventListener('end', onEnd, {once: true});
    onSession?.(session);
    const type = await resolveReferenceSpaceType(session, reference.type,
      reference.required ? [] : reference.fallbackOrder);
    if(ended)return false;
    world.renderer.xr.enabled = true;
    world.renderer.xr.setReferenceSpaceType(type);
    await world.renderer.xr.setSession(session);
    if(ended)return false;
    world.session = session;
    return true;
  } catch(error) {
    overlay.hidden = true;
    if(session && !ended) {
      try {await session.end();} catch { /* original setup error takes precedence */ }
    }
    throw error;
  } finally {
    world.sessionRequestPending = false;
  }
}


export const FINAL_AR_MS = 5750;
const FINAL_AR_WATCHDOG_MS = 4500;
/** Local console diagnostics only; never includes task text or sends telemetry. */
export function traceEnhanced(stage: string, detail: Record<string, unknown> = {}): void {
  console.info('[CueDone Enhanced]', {atMs: Math.round(performance.now()), stage, ...detail});
}
interface FinaleSession extends EventTarget { end(): Promise<void>; }
interface FinaleRun {
  before: SpatialTask[];
  after?: SpatialTask[];
  session?: FinaleSession;
  timer?: ReturnType<typeof setTimeout>;
  cancelled: boolean;
  closed: boolean;
  started: boolean;
  ending: boolean;
}
/** Only the final task uses AR. A native-session watchdog prevents a no-frame trap. */
export class FinalTaskAR {
  private current?: FinaleRun;
  private readonly schedule: typeof setTimeout;
  private readonly clear: typeof clearTimeout;
  error = '';
  constructor(schedule: typeof setTimeout = setTimeout, clear: typeof clearTimeout = clearTimeout) {
    this.schedule = schedule.bind(globalThis); this.clear = clear.bind(globalThis);
  }
  get busy(): boolean {return !!this.current;}
  get waiting(): boolean {return !!this.current && !this.current.started;}
  get before(): readonly SpatialTask[] {return this.current?.before ?? [];}
  begin(before: readonly SpatialTask[]): FinaleRun | undefined {
    if(this.current || !before.length || before.filter(task => !task.completed).length !== 1)return;
    this.error = '';
    traceEnhanced('begin');
    return this.current = {before: before.map(({id,completed}) => ({id,completed})),
      cancelled: false, closed: false, started: false, ending: false};
  }
  attach(run: FinaleRun, session: FinaleSession): void {
    run.session = session;
    traceEnhanced('native-session-attached');
    session.addEventListener('end', () => {
      traceEnhanced('native-session-ended', {visibleFrameSeen: run.started, endRequested: run.ending});
      run.closed = true;
      if(run.timer !== undefined)this.clear(run.timer);
      if(this.current === run)this.current = undefined;
      this.error = '';
    }, {once: true});
    if(run.cancelled || this.current !== run) {void this.close(run); return;}
    // This starts as soon as the native session exists, even if renderer setup stalls.
    this.arm(run, FINAL_AR_WATCHDOG_MS);
  }
  saved(run: FinaleRun, after: readonly SpatialTask[]): void {
    if(!isFinalCompletion(run.before, after)) {this.cancel(run); return;}
    traceEnhanced('final-completion-saved');
    run.after = after.map(({id,completed}) => ({id,completed}));
  }
  start(session: FinaleSession, currentTasks: readonly SpatialTask[]): {before: SpatialTask[]; after: SpatialTask[]} | undefined {
    const run = this.current;
    if(!run || run.session !== session || !run.after || run.started || run.cancelled || run.closed || run.ending)return;
    if(JSON.stringify(run.after) !== JSON.stringify(currentTasks.map(({id,completed}) => ({id,completed})))) {
      this.cancel(run); return;
    }
    run.started = true;
    traceEnhanced('first-visible-finale-frame');
    this.arm(run); // Count only after the first visible, saved-list XR frame.
    return {before: run.before, after: run.after};
  }
  cancel(run: FinaleRun): void {
    traceEnhanced('cancel', {sessionAttached: !!run.session, visibleFrameSeen: run.started});
    run.cancelled = true;
    if(run.session)void this.close(run);
    else if(this.current === run)this.current = undefined;
  }
  end(): void {
    traceEnhanced('exit-button');
    if(this.current)void this.close(this.current);
  }
  private arm(run: FinaleRun, duration = FINAL_AR_MS): void {
    if(run.timer !== undefined)this.clear(run.timer);
    traceEnhanced('timer-armed', {durationMs: duration, kind: run.started ? 'visible-finale' : 'no-frame-watchdog'});
    run.timer = this.schedule(() => {
      traceEnhanced('timer-expired', {kind: run.started ? 'visible-finale' : 'no-frame-watchdog'});
      void this.close(run);
    }, duration);
  }
  private async close(run: FinaleRun): Promise<void> {
    if(run.closed || run.ending)return;
    run.ending = true;
    traceEnhanced('session-end-requested', {visibleFrameSeen: run.started});
    if(run.timer !== undefined)this.clear(run.timer);
    try {
      await run.session?.end();
    } catch(error) {
      traceEnhanced('session-end-rejected', {error: String(error)});
      run.ending = false;
      this.error = 'Could not close AR. Select Exit AR; your task is saved.';
    }
  }
}
export const finalTaskAR = new FinalTaskAR();
