import type { TaskStorage } from './task-store.js';

export const SPATIAL_KEY = 'cuedone.vr.personal.spatial.v1';
export const ANCHOR_KEY = 'cuedone.vr.personal.anchor.v1';
export type Placement = 'head' | 'hand' | 'room';
export interface SpatialSettings {
  version: 1;
  theme: 'zen';
  scale: 1 | 1.25 | 1.5;
  placement: Placement;
  motion: boolean;
  zenSound: boolean;
}
export const DEFAULT_SPATIAL: SpatialSettings = {
  version: 1, theme: 'zen', scale: 1, placement: 'room', motion: true, zenSound: false,
};

export function readSpatial(storage: TaskStorage): SpatialSettings {
  const raw = storage.getItem(SPATIAL_KEY);
  if (raw === null) return { ...DEFAULT_SPATIAL };
  const value = JSON.parse(raw);
  if (!value || value.version !== 1 ||
      !['constellation', 'zen'].includes(value.theme) ||
      ![1, 1.25, 1.5].includes(value.scale) ||
      !['head', 'hand', 'controller', 'room'].includes(value.placement) ||
      typeof value.motion !== 'boolean' ||
      (value.zenSound !== undefined && typeof value.zenSound !== 'boolean')) {
    throw new Error('Unsupported spatial preferences.');
  }
  return { version: 1, theme: 'zen', scale: value.scale,
    placement: value.placement === 'controller' ? 'hand' : value.placement, motion: value.motion, zenSound: value.zenSound ?? false };
}

/** Save before changing the displayed appearance. Never touches task storage. */
export function saveSpatial(storage: TaskStorage, settings: SpatialSettings): void {
  storage.setItem(SPATIAL_KEY, JSON.stringify(settings));
}

export function taskRatio(tasks: ReadonlyArray<{ completed: boolean }>): number {
  return tasks.length ? tasks.filter(task => task.completed).length / tasks.length : 0;
}

/** A bounded smoothstep tween. Suspension time never advances an animation. */
export class ProgressTween {
  value = 0;
  private start = 0;
  private target = 0;
  private elapsed = 0;
  set(value: number, animate: boolean): void {
    const next = Math.max(0, Math.min(1, value));
    if (!animate) {
      this.start = this.target = this.value = next;
      this.elapsed = 0;
    } else if (next !== this.target) {
      this.start = this.value;
      this.target = next;
      this.elapsed = 0;
    }
  }
  tick(delta: number): number {
    this.elapsed = Math.min(0.6, this.elapsed + Math.max(0, Math.min(delta, 1 / 30)));
    const t = this.elapsed / 0.6;
    this.value = this.start + (this.target - this.start) * t * t * (3 - 2 * t);
    return this.value;
  }
}

export interface SpatialAnchor {
  delete(): void;
  requestPersistentHandle?: () => Promise<string>;
}
export interface AnchorSession {
  restorePersistentAnchor?: (handle: string) => Promise<SpatialAnchor>;
}

/** Owns session lifetime and stale async work; placement failure never touches tasks. */
export class AnchorRecovery {
  anchor: SpatialAnchor | null = null;
  status = 'Room placement is available in VR.';
  private generation = 0;
  private attempted = false;
  private pending = false;
  private triedRestore = false;
  private session: AnchorSession | null = null;
  private readonly storage: TaskStorage;
  constructor(storage: TaskStorage) { this.storage = storage; }

  begin(session: AnchorSession, restore = true): void {
    this.end();
    this.session = session;
    this.triedRestore = !restore;
    this.status = 'Restoring room placement…';
  }
  end(): void {
    this.generation++;
    this.anchor?.delete();
    this.anchor = null;
    this.session = null;
    this.pending = false;
    this.attempted = false;
    this.triedRestore = false;
  }
  async restoreOrCreate(create?: () => Promise<SpatialAnchor>): Promise<void> {
    if (!this.session || this.pending || this.attempted) return;
    this.pending = true;
    this.attempted = true;
    const generation = this.generation;
    const session = this.session;
    let handle: string | null;
    try { handle = this.storage.getItem(ANCHOR_KEY); }
    catch {
      this.status = 'Room storage unavailable. Using seated placement.';
      this.pending = false;
      return;
    }
    let anchor: SpatialAnchor | null = null;
    let restored = false;
    try {
      if (handle && session.restorePersistentAnchor && !this.triedRestore) {
        this.triedRestore = true;
        try { anchor = await session.restorePersistentAnchor(handle); restored = !!anchor; } catch { /* recenter fallback */ }
        if (generation !== this.generation) { anchor?.delete(); return; }
        if (!anchor) {
          // A frame is only valid synchronously. Create on the NEXT live frame,
          // never use the create closure captured before an awaited restoration.
          this.attempted = false;
          this.status = 'Saved anchor unavailable. Recentering room placement…';
          return;
        }
      }
      if (generation !== this.generation) { anchor?.delete(); return; }
      if (!anchor && create) anchor = await create();
      if (generation !== this.generation) { anchor?.delete(); return; }
      if (!anchor) {
        this.status = 'Anchors unavailable. Using seated placement; your list is saved.';
        return;
      }
      this.anchor = anchor;
      this.status = 'Room placement ready for this session.';
      if(restored) {
        this.status = 'Room placement restored on this device.';
        return; // Reuse the durable handle instead of minting one per reopening.
      }
      if (anchor.requestPersistentHandle) {
        const savedHandle = await anchor.requestPersistentHandle();
        if (generation !== this.generation) return;
        this.storage.setItem(ANCHOR_KEY, savedHandle);
        this.status = 'Room placement saved on this device.';
      } else {
        this.status = 'Room placement ready. This browser cannot save anchors between sessions.';
      }
    } catch {
      if (generation === this.generation) {
        this.status = this.anchor
          ? 'Room placement active, but could not save its anchor. Your list is saved separately.'
          : 'Room placement unavailable. Using seated placement; your list is saved.';
      }
    } finally {
      if (generation === this.generation) this.pending = false;
    }
  }
}
