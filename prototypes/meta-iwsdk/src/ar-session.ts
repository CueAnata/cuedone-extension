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
    if(world.session === session)world.session = undefined;
    // Let Three finish releasing its XR camera before restoring the browser view.
    requestAnimationFrame(() => {
      if(!world.session && options.restoreCameraOnExit !== false) {
        world.camera.copy(camera, false);
        world.camera.updateMatrixWorld(true);
      }
    });
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
    if(session) {
      try {await session.end();} catch { /* original setup error takes precedence */ }
    }
    throw error;
  } finally {
    world.sessionRequestPending = false;
  }
}


export const FINAL_AR_MS = 4500;
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
    this.schedule = schedule; this.clear = clear;
  }
  get busy(): boolean {return !!this.current;}
  get waiting(): boolean {return !!this.current && !this.current.started;}
  get before(): readonly SpatialTask[] {return this.current?.before ?? [];}
  begin(before: readonly SpatialTask[]): FinaleRun | undefined {
    if(this.current || !before.length || before.filter(task => !task.completed).length !== 1)return;
    this.error = '';
    return this.current = {before: before.map(({id,completed}) => ({id,completed})),
      cancelled: false, closed: false, started: false, ending: false};
  }
  attach(run: FinaleRun, session: FinaleSession): void {
    run.session = session;
    session.addEventListener('end', () => {
      run.closed = true;
      if(run.timer !== undefined)this.clear(run.timer);
      if(this.current === run)this.current = undefined;
      this.error = '';
    }, {once: true});
    if(run.cancelled || this.current !== run) {void this.close(run); return;}
    // This starts as soon as the native session exists, even if renderer setup stalls.
    this.arm(run);
  }
  saved(run: FinaleRun, after: readonly SpatialTask[]): void {
    if(!isFinalCompletion(run.before, after)) {this.cancel(run); return;}
    run.after = after.map(({id,completed}) => ({id,completed}));
  }
  start(session: FinaleSession, currentTasks: readonly SpatialTask[]): {before: SpatialTask[]; after: SpatialTask[]} | undefined {
    const run = this.current;
    if(!run || run.session !== session || !run.after || run.started || run.cancelled || run.closed)return;
    if(JSON.stringify(run.after) !== JSON.stringify(currentTasks.map(({id,completed}) => ({id,completed})))) {
      this.cancel(run); return;
    }
    run.started = true;
    this.arm(run); // The visible 3D finale now has exactly 4.5 seconds.
    return {before: run.before, after: run.after};
  }
  cancel(run: FinaleRun): void {
    run.cancelled = true;
    if(run.session)void this.close(run);
    else if(this.current === run)this.current = undefined;
  }
  private arm(run: FinaleRun): void {
    if(run.timer !== undefined)this.clear(run.timer);
    run.timer = this.schedule(() => {void this.close(run);}, FINAL_AR_MS);
  }
  private async close(run: FinaleRun): Promise<void> {
    if(run.closed || run.ending)return;
    run.ending = true;
    if(run.timer !== undefined)this.clear(run.timer);
    try {
      await run.session?.end();
      if(this.current === run)this.current = undefined;
    } catch {
      run.ending = false;
      this.error = 'Could not close AR. Select Exit AR; your task is saved.';
    }
  }
}
export const finalTaskAR = new FinalTaskAR();
