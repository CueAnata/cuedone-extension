import { createSystem, UIKit, UIKitMLAsset, VisibilityState, RayInteractable, PokeInteractable } from '@iwsdk/core';
import { Group, Mesh, MeshBasicMaterial, SphereGeometry, BackSide, Vector3, Quaternion, Matrix4 } from 'three';
import { AnchorRecovery, DEFAULT_SPATIAL, ProgressTween, readSpatial, saveSpatial,
  SPATIAL_KEY, type SpatialSettings } from './spatial-state.js';
import { SpatialThemes } from './spatial-themes.js';
import { watchLocalStorage, withLocalLock } from './local-sync.js';
import { GardenProgress, type SpatialTask } from './garden-progress.js';
import { PanelDrag } from './panel-drag.js';
import { ZenAudio } from './zen-audio.js';

const progress = new GardenProgress();
export function publishSpatialProgress(tasks: readonly SpatialTask[], animate: boolean): void {
  progress.publish(tasks,animate);
}

export class SpatialPresentationSystem extends createSystem({}) {
  private readonly root = new Group();
  private readonly drag = new PanelDrag(this.root);
  private dragHand: 'left' | 'right' | null = null;
  private handle!: UIKit.Container;
  private roomOverride = false;
  private savingPlacement = false;
  private placementGeneration = 0;
  private lastDragTick = 0;
  private readonly themes = new SpatialThemes();
  private readonly tween = new ProgressTween();
  private readonly audio = new ZenAudio();

  private unlockAudio(): Promise<boolean> {
    return this.audio.unlock();
  }
  private readonly forward = new Vector3();
  private readonly up = new Vector3();
  private readonly soundPosition = new Vector3();
  private settings: SpatialSettings = { ...DEFAULT_SPATIAL };
  private storage!: Storage;
  private anchors!: AnchorRecovery;
  private panel!: UIKitMLAsset;
  private ready = false;
  private message = '';
  private revision = -1;
  private finaleAudioPending = false;
  private activeSession: XRSession | undefined;
  private fade = 0;
  private fadeMesh!: Mesh<SphereGeometry, MeshBasicMaterial>;
  private readonly position = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly offset = new Vector3(0.7, -0.15, -1.8);
  private readonly matrix = new Matrix4();
  private readonly unit = new Vector3(1,1,1);
  private readonly media = window.matchMedia('(prefers-reduced-motion: reduce)');
  private lastAnchorStatus = '';
  private restoreAnchor = true;

  init(): void {
    this.panel = this.world.requireSceneObject<UIKitMLAsset>('task-panel');
    this.root.name = 'CueDone personal spatial dashboard';
    this.handle = this.panel.requireElementById<UIKit.Container>('grab-handle');
    this.handle.name = 'PanelGrabHandle';
    this.handle.setProperties({
      hover: {backgroundColor: '#FFD28A'},
      onPointerDown: event => {
        if(!this.ready || this.savingPlacement || this.drag.owner !== null ||
          this.world.visibilityState.value !== VisibilityState.Visible)return;
        const hand = (['left','right'] as const).find(hand =>
          this.world.input.xr.multiPointers[hand].getPointer('ray').id === event.pointerId &&
          this.world.input.xr.getPrimaryInputSource(hand)?.hand);
        if(!hand || !this.drag.begin(event.pointerId,event.ray,event.point))return;
        event.stopPropagation();
        this.dragHand = hand;
        this.anchors.end(); // Invalidate old/in-flight anchors before moving the board.
        this.handle.setPointerCapture(event.pointerId);
        this.message = 'Moving panel. Release pinch to place it.';
        this.renderControls();
      },
      onPointerMove: event => {
        if(this.drag.owner !== event.pointerId)return;
        event.stopPropagation();
        this.drag.move(event.pointerId,event.ray);
      },
      onPointerUp: event => {
        if(this.drag.owner !== event.pointerId)return;
        event.stopPropagation();
        const id = event.pointerId;
        this.drag.end(id);
        this.dragHand = null;
        this.handle.releasePointerCapture(id);
        this.roomOverride = true;
        void this.saveDraggedPlacement();
      },
      onPointerCancel: event => {
        if(this.drag.owner === event.pointerId) {event.stopPropagation(); this.cancelDrag();}
      },
      onClick: event => event.stopPropagation(),
    });
    this.world.scene.add(this.root);
    this.root.position.copy(this.panel.position);
    // Keep the authored panel under its ECS parent. IWSDK restores that parent
    // every tick, so reparenting it to a raw Three Group would lose placement.
    this.root.add(this.themes.root);
    const dashboard=this.world.createTransformEntity(this.root);
    const trellis=this.world.createTransformEntity(this.themes.trellis.root,{parent:dashboard});
    trellis.addComponent(RayInteractable);trellis.addComponent(PokeInteractable);
    const highlight=(event: {point?: Vector3})=>{
      if(event.point)this.themes.trellis.highlight(event.point);
    };
    trellis.object3D!.addEventListener('pointerdown',highlight);
    this.cleanupFuncs.push(()=>{
      trellis.object3D?.removeEventListener('pointerdown',highlight);
      trellis.dispose({disposeResources:false});dashboard.dispose({disposeResources:false});
    });
    this.panel.scale.setScalar(0.792);
    this.fadeMesh = new Mesh(new SphereGeometry(0.3, 12, 8),
      new MeshBasicMaterial({color: 0x000000, side: BackSide, transparent: true,
        opacity: 0, depthTest: false, depthWrite: false}));
    this.fadeMesh.renderOrder = 10000;
    this.world.scene.add(this.fadeMesh);

    const controls: Array<[string, () => void]> = [
      ['spatial-scale', () => this.change({scale: this.settings.scale === 1 ? 1.25 : this.settings.scale === 1.25 ? 1.5 : 1})],
      ['spatial-placement', () => this.change({placement: this.settings.placement === 'head' ? 'hand' : this.settings.placement === 'hand' ? 'room' : 'head'})],
      ['spatial-motion', () => this.change({motion: !this.settings.motion})],
      ['spatial-sound', () => {void this.change({zenSound: !this.settings.zenSound}, this.unlockAudio());}],
      ['spatial-recenter', () => this.recenter(false)],
      ['spatial-retry', () => this.load()],
    ];
    for (const [id, action] of controls) {
      const spatial = this.panel.requireElementById(id);
      const browser = document.getElementById(`browser-${id}`)!;
      spatial.addEventListener('click', action);
      browser.addEventListener('click', action);
      this.cleanupFuncs.push(() => {
        spatial.removeEventListener('click', action);
        browser.removeEventListener('click', action);
      });
    }
    const unlock = () => {void this.unlockAudio();};
    const enterSpatial=this.panel.requireElementById('xr-button');
    const enterBrowser=document.getElementById('browser-xr-button')!;
    enterSpatial.addEventListener('click',unlock);enterBrowser.addEventListener('click',unlock);
    this.cleanupFuncs.push(()=>{enterSpatial.removeEventListener('click',unlock);enterBrowser.removeEventListener('click',unlock);});
    this.load();
    this.cleanupFuncs.push(watchLocalStorage(window,[SPATIAL_KEY],()=>this.refreshSettings()));
    this.cleanupFuncs.push(this.world.onXRFrame(frame => this.frame(frame)));
    this.cleanupFuncs.push(this.world.visibilityState.subscribe(() => {
      const visible = this.world.visibilityState.value === VisibilityState.Visible;
      this.root.visible = visible;
      const interruptedSave = this.savingPlacement;
      this.cancelDrag();
      this.placementGeneration++;
      this.savingPlacement = false;
      if(interruptedSave) {
        this.roomOverride = false;
        if(this.activeSession)this.anchors.begin(this.activeSession,true);
        this.message = 'Placement interrupted. Restoring saved room placement.';
      }
      this.audio.stop();this.finaleAudioPending=false;this.themes.trellis.cancel();
      if (visible) {
        this.revision = -1; // Resume at saved progress without replaying a tween.
        this.tween.set(progress.total ? progress.complete / progress.total : 0, false);
        this.fade = 0.3;
      }
      this.renderControls();
    }));
    const ended = () => {
      this.cancelDrag();
      this.placementGeneration++;
      this.savingPlacement = false;
      this.roomOverride = false;
      this.anchors?.end();
      this.audio.stop();this.finaleAudioPending=false;this.themes.trellis.cancel();
      this.activeSession = undefined;
      this.fadeMesh.visible = false;
      this.root.position.set(0.7, 1.3, -1.8);
      this.root.quaternion.identity();
      this.panel.position.set(0.7, 1.3, -1.8);
      this.panel.quaternion.identity();
    };
    this.world.renderer.xr.addEventListener('sessionend', ended);
    this.cleanupFuncs.push(() => this.world.renderer.xr.removeEventListener('sessionend', ended));
    this.cleanupFuncs.push(() => {
      this.cancelDrag();
      this.placementGeneration++;
      this.anchors?.end();
      this.audio.dispose();
      this.themes.dispose();
      this.root.removeFromParent();
      this.fadeMesh.removeFromParent();
      this.fadeMesh.geometry.dispose();
      this.fadeMesh.material.dispose();
    });
  }

  private load(): void {
    try {
      this.storage = window.localStorage;
      const next = readSpatial(this.storage);
      this.anchors ??= new AnchorRecovery(this.storage);
      this.ready = true;
      this.applySettings(next);
      this.message = 'Appearance saved locally. Sound needs activation in this VR window.';
    } catch {
      this.ready = false;
      this.message = 'Could not restore appearance. Retry appearance to keep saved settings safe.';
    }
    this.renderControls();
  }

  private refreshSettings(): void {
    try {
      const next=readSpatial(this.storage);
      const wasReady=this.ready;
      this.ready=true;
      this.anchors ??= new AnchorRecovery(this.storage);
      if(JSON.stringify(next)===JSON.stringify(this.settings)){
        if(!wasReady)this.renderControls();
        return;
      }
      this.applySettings(next);
      this.renderControls();
    } catch {
      this.ready=false;
      this.audio.stop();this.finaleAudioPending=false;
      this.message='Could not restore appearance. Retry appearance to keep saved settings safe.';
      this.renderControls();
    }
  }

  private async change(patch: Partial<SpatialSettings>, activation?: Promise<boolean>): Promise<void> {
    if (!this.ready) return;
    try {
      const next=await withLocalLock(SPATIAL_KEY,()=>{
        const next={...readSpatial(this.storage),...patch};
        saveSpatial(this.storage,next);
        return next;
      });
      this.applySettings(next);
      // Unlock may remain pending. Never defer settings or queue a finale.
      if(activation)void activation.catch(()=>false);
    } catch {
      this.message='Could not save appearance. Your previous settings are unchanged.';
    }
    this.renderControls();
  }

  private applySettings(next: SpatialSettings, preservePose = false): void {
    const previous=this.settings;
    const changedPlacement=previous.placement!==next.placement;
    this.settings=next;
    
    if(!next.zenSound) {this.audio.stop(); this.finaleAudioPending=false;}
    if(!next.motion) this.themes.trellis.cancel();
    this.applyScale();
    this.message='Appearance synchronized locally.';
    if(changedPlacement && !preservePose)this.recenter();
  }

  private playGardenCue(): void {
    if(!this.finaleAudioPending)return;
    this.finaleAudioPending=false;
    if(!this.ready || !this.settings.zenSound ||
      this.world.visibilityState.value!==VisibilityState.Visible)return;
    if(!this.audio.play()) {
      this.message='Garden sound is blocked here. Use Garden sound in this VR window to enable it.';
      this.renderControls();
    }
  }

  private applyScale(): void {
    this.panel.scale.setScalar(0.792 * this.settings.scale);
    const browser = document.getElementById('browser-panel')!;
    browser.style.fontSize = `${this.settings.scale}rem`;
    browser.style.setProperty('--readable-scale', String(this.settings.scale));
  }

  private recenter(restoreAnchor = true): void {
    if (!this.ready) return;
    this.cancelDrag();
    this.placementGeneration++;
    this.savingPlacement = false;
    this.roomOverride = false;
    this.anchors.end();
    this.activeSession = undefined;
    this.restoreAnchor = restoreAnchor;
    this.fade = 0.3;
    // The next live XR frame places the panel; never reuse a previous-session pose.
    this.message = restoreAnchor ? 'Placement saved locally.' : 'Recentering on the next VR frame.';
    this.renderControls();
  }

  private cancelDrag(): void {
    const id = this.drag.owner;
    if(id === null)return;
    this.drag.cancel();
    this.dragHand = null;
    if(this.handle.hasPointerCapture(id))this.handle.releasePointerCapture(id);
    if(this.activeSession)this.anchors.begin(this.activeSession, true);
    this.message = 'Move cancelled. Previous panel position retained.';
    this.renderControls();
  }

  private async saveDraggedPlacement(): Promise<void> {
    const session = this.world.xrSession;
    if(!session)return;
    const generation = ++this.placementGeneration;
    this.savingPlacement = true;
    this.message = 'Panel placed. Saving room placement…';
    this.renderControls();
    try {
      const next = await withLocalLock(SPATIAL_KEY, () => {
        if(generation !== this.placementGeneration)return null;
        const next = {...readSpatial(this.storage), placement: 'room' as const};
        saveSpatial(this.storage,next);
        return next;
      });
      if(!next || generation !== this.placementGeneration || session !== this.world.xrSession)return;
      this.applySettings(next, true);
      this.roomOverride = false;
      // Begin without restoring the old handle. The next live XR frame creates
      // the replacement at the released pose, never from an expired frame.
      this.anchors.begin(session, false);
      this.lastAnchorStatus = '';
      this.message = 'Panel placed. Saving anchor on the next tracked frame.';
    } catch {
      if(generation === this.placementGeneration)
        this.message = 'Panel held for this session. Could not save room placement.';
    } finally {
      if(generation === this.placementGeneration) {
        this.savingPlacement = false;
        this.renderControls();
      }
    }
  }

  private placeFromHead(): void {
    const head = this.world.playerSpaceEntities.head.object3D!;
    head.getWorldPosition(this.position);
    head.getWorldQuaternion(this.rotation);
    // Keep the board upright: head tilt must not tilt the task text.
    const forward = new Vector3(0,0,-1).applyQuaternion(this.rotation);
    const yaw = Math.atan2(-forward.x, -forward.z);
    this.root.rotation.set(0, yaw, 0);
    this.root.position.copy(this.offset).applyQuaternion(this.root.quaternion).add(this.position);
  }

  private frame(frame: XRFrame): void {
    if (!this.ready || this.world.visibilityState.value !== VisibilityState.Visible) return;
    const session = this.world.xrSession;
    const space = this.world.xrReferenceSpace;
    if (!session || !space || !frame.getViewerPose(space)) return;
    if (session !== this.activeSession) {
      this.activeSession = session;
      this.anchors.begin(session, this.restoreAnchor);
      this.restoreAnchor = true;
      this.placeFromHead();
      this.fade = 0.3;
      this.revision = progress.revision;
      this.tween.set(progress.total ? progress.complete / progress.total : 0, false);
    }
    if(this.drag.owner !== null) {
      const source = this.dragHand && this.world.input.xr.getPrimaryInputSource(this.dragHand);
      if(!source?.hand || !frame.getPose(source.targetRaySpace,space))this.cancelDrag();
      else {
        const now = performance.now();
        this.drag.tick(this.lastDragTick ? (now-this.lastDragTick)/1000 : 1/90);
        this.lastDragTick = now;
      }
    } else this.lastDragTick = 0;
    if(this.drag.owner !== null || this.roomOverride || this.savingPlacement) {
      // Drag owns the world pose. Never apply a stale anchor or wrist transform.
    } else if (this.settings.placement === 'head') {
      // Seated companion stays put between deliberate recenter/session entry.
    } else if (this.settings.placement === 'hand') {
      // Prefer a left-hand anchor so the right index finger can touch the board.
      const input=this.world.input.xr;
      const source=input.getPrimaryInputSource('left') ?? input.getPrimaryInputSource('right');
      const wrist=source?.hand?.get('wrist');
      const pose=wrist && frame.getJointPose ? frame.getJointPose(wrist,space) : null;
      if(pose) {
        this.position.set(pose.transform.position.x,pose.transform.position.y,pose.transform.position.z);
        this.world.player.localToWorld(this.position);
        this.world.playerSpaceEntities.head.object3D!.getWorldQuaternion(this.rotation);
        this.root.position.set(0,0.12,-0.25).applyQuaternion(this.rotation).add(this.position);
        this.root.quaternion.copy(this.rotation);
      } else {
        this.placeFromHead();
      }
    } else {
      // XR anchor poses are reference-space coordinates; convert through the player rig.
      const anchor = this.anchors.anchor as XRAnchor | null;
      const pose = anchor ? frame.getPose(anchor.anchorSpace, space) : null;
      if (pose) {
        this.matrix.fromArray(pose.transform.matrix);
        this.matrix.premultiply(this.world.player.matrixWorld);
        this.matrix.decompose(this.root.position, this.root.quaternion, this.unit);
      }
      if (!anchor) {
        const local = this.root.position.clone();
        this.world.player.worldToLocal(local);
        const quaternion = this.world.player.getWorldQuaternion(this.rotation).invert().multiply(this.root.quaternion);
        const transform = new XRRigidTransform(local, quaternion);
        void this.anchors.restoreOrCreate(frame.createAnchor
          ? () => frame.createAnchor!(transform, space) : undefined);
      }
      if (this.lastAnchorStatus !== this.anchors.status) {
        this.lastAnchorStatus = this.anchors.status;
        this.message = this.anchors.status;
        this.renderControls();
      }
    }
    this.root.updateWorldMatrix(true, false);
    const parent = this.panel.parent!;
    parent.updateWorldMatrix(true, false);
    this.matrix.copy(parent.matrixWorld).invert().multiply(this.root.matrixWorld);
    this.matrix.decompose(this.panel.position, this.panel.quaternion, this.unit);
    const size=this.panel.document.computedSize;
    if(size) this.themes.trellis.fit(size.width*0.01*this.panel.scale.x*this.panel.document.scale.x,
      size.height*0.01*this.panel.scale.y*this.panel.document.scale.y);
    const head=this.world.playerSpaceEntities.head.object3D!;
    head.getWorldPosition(this.position);head.getWorldQuaternion(this.rotation);
    this.forward.set(0,0,-1).applyQuaternion(this.rotation);this.up.set(0,1,0).applyQuaternion(this.rotation);
    this.soundPosition.set(0,0.79,0.04);this.themes.trellis.root.localToWorld(this.soundPosition);
    this.audio.update(this.position,this.forward,this.up,this.soundPosition);
  }

  update(delta: number): void {
    const visible = this.world.visibilityState.value === VisibilityState.Visible;
    this.root.visible = visible;
    if (!visible) { this.fadeMesh.visible = false; this.themes.trellis.cancel(); this.audio.stop();this.finaleAudioPending=false; return; }
    const motion = this.settings.motion && !this.media.matches;
    if (this.revision !== progress.revision) {
      this.finaleAudioPending=this.revision>=0 && progress.finale && this.ready && this.settings.zenSound;
      if(progress.finale && this.revision>=0) this.themes.trellis.celebrate();
      else this.themes.trellis.cancel();
      this.tween.set(progress.total ? progress.complete / progress.total : 0,
        motion && this.revision >= 0 && progress.animate);
      this.revision = progress.revision;
    }
    if (!motion) this.tween.set(progress.total ? progress.complete / progress.total : 0, false);
    this.audio.setAmbient(this.ready && this.settings.zenSound);
    this.audio.tick(delta);
    this.themes.update(this.tween.tick(delta), progress.total > 0, delta, motion);
    if(this.themes.trellis.update(delta,motion))this.playGardenCue();
    this.fade = Math.max(0, this.fade - Math.min(delta, 1/30));
    this.fadeMesh.visible = this.fade > 0;
    this.fadeMesh.material.opacity = this.fade / 0.3;
    this.world.playerSpaceEntities.head.object3D!.getWorldPosition(this.fadeMesh.position);
  }

  private renderControls(): void {
    this.panel.requireElementById('grab-handle').setProperties({
      text: this.drag.owner !== null ? 'Moving… Release pinch to place' : this.savingPlacement ? 'Saving placement…' : 'Hold pinch here to move',
      backgroundColor: this.drag.owner !== null ? '#FFD28A' : '#FFE4B3',
      disabled: !this.ready || this.savingPlacement,
    });
    const labels: Record<string, string> = {
      'spatial-scale': `Panel size: ${this.settings.scale === 1 ? 'Standard' : this.settings.scale === 1.25 ? 'Large' : 'Extra large'}`,
      'spatial-placement': `Panel: ${this.settings.placement === 'head' ? 'Seated companion' : this.settings.placement === 'hand' ? 'Hand relative' : 'Room anchor'}`,
      'spatial-sound': `Garden sound: ${this.settings.zenSound ? 'On' : 'Off'}`,
      'spatial-motion': `Ambient motion: ${this.settings.motion ? 'On' : 'Off'}`,
    };
    for (const [id, text] of Object.entries(labels)) {
      const button = this.panel.requireElementById(id);
      button.setProperties({text, disabled: !this.ready});
      const browser = document.getElementById(`browser-${id}`) as HTMLButtonElement;
      browser.textContent = text;
      browser.disabled = !this.ready;
    }
    this.panel.requireElementById('spatial-status').setProperties({text: this.message});
    document.getElementById('browser-spatial-status')!.textContent = this.message;
    this.panel.requireElementById('spatial-retry').setProperties({display: this.ready ? 'none' : 'flex'});
    document.getElementById('browser-spatial-retry')!.hidden = this.ready;
    this.panel.requireElementById('spatial-recenter').setProperties({disabled: !this.ready});
    (document.getElementById('browser-spatial-recenter') as HTMLButtonElement).disabled = !this.ready;
  }
}
