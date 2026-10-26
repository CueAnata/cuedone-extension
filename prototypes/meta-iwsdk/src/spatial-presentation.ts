import { createSystem, UIKit, UIKitMLAsset, VisibilityState, RayInteractable, PokeInteractable } from '@iwsdk/core';
import { Group, Mesh, MeshBasicMaterial, SphereGeometry, BackSide, Vector3, Quaternion, Vector2 } from 'three';
import { DEFAULT_SPATIAL, ProgressTween, readSpatial, saveSpatial,
  SPATIAL_KEY, type SpatialSettings } from './spatial-state.js';
import { SpatialThemes } from './spatial-themes.js';
import { watchLocalStorage, withLocalLock } from './local-sync.js';
import { GardenProgress, type SpatialTask } from './garden-progress.js';
import { applyFixedPanelPose, faceCenterPanel } from './fixed-panel.js';
import { PanelDrag } from './panel-drag.js';
import { finalTaskAR } from './ar-session.js';
import { taskRatio } from './spatial-state.js';
import { ZenAudio } from './zen-audio.js';

const progress = new GardenProgress();
export function publishSpatialProgress(tasks: readonly SpatialTask[], animate: boolean): void {
  progress.publish(tasks,animate);
}

export class SpatialPresentationSystem extends createSystem({}) {
  private readonly root = new Group();
  private readonly drag = new PanelDrag(this.root);
  private dragHand: 'left' | 'right' | null = null;
  private faceLocked = true;
  private handle!: UIKit.Container;
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
  private panel!: UIKitMLAsset;
  private ready = false;
  private message = '';
  private revision = -1;
  private finaleAudioPending = false;
  private activeSession: XRSession | undefined;
  private fade = 0;
  private fadeMesh!: Mesh<SphereGeometry, MeshBasicMaterial>;
  private readonly browserSize = new Vector2();
  private readonly position = new Vector3();
  private readonly rotation = new Quaternion();
  private readonly media = window.matchMedia('(prefers-reduced-motion: reduce)');

  init(): void {
    this.panel = this.world.requireSceneObject<UIKitMLAsset>('task-panel');
    this.root.name = 'CueDone personal spatial dashboard';
    this.handle = this.panel.requireElementById<UIKit.Container>('grab-handle');
    this.handle.setProperties({
      onPointerDown: event => {
        if(this.world.visibilityState.value !== VisibilityState.Visible || this.drag.owner !== null)return;
        const hand = (['left','right'] as const).find(hand =>
          this.world.input.xr.multiPointers[hand].getPointer('ray').id === event.pointerId &&
          this.world.input.xr.getPrimaryInputSource(hand)?.hand);
        if(!hand || !this.drag.begin(event.pointerId,event.ray,event.point))return;
        event.stopPropagation(); this.dragHand = hand;
        this.handle.setPointerCapture(event.pointerId);
      },
      onPointerMove: event => {if(this.drag.owner === event.pointerId) {event.stopPropagation(); this.drag.move(event.pointerId,event.ray);}},
      onPointerUp: event => {
        if(this.drag.owner !== event.pointerId)return;
        event.stopPropagation(); this.drag.end(event.pointerId); this.dragHand = null;
        this.handle.releasePointerCapture(event.pointerId); this.faceLocked = false;
        this.renderControls();
      },
      onPointerCancel: () => this.cancelMove(),
      onClick: event => event.stopPropagation(),
    });
    this.world.scene.add(this.root);
    this.placeFixedPanel();
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
    this.panel.document.clearTargetDimensions();
    this.placeFixedPanel();
    this.fadeMesh = new Mesh(new SphereGeometry(0.3, 12, 8),
      new MeshBasicMaterial({color: 0x000000, side: BackSide, transparent: true,
        opacity: 0, depthTest: false, depthWrite: false}));
    this.fadeMesh.renderOrder = 10000;
    this.world.scene.add(this.fadeMesh);

    const controls: Array<[string, () => void]> = [
      ['spatial-motion', () => this.change({motion: !this.settings.motion})],
      ['spatial-sound', () => {void this.change({zenSound: !this.settings.zenSound}, this.unlockAudio());}],
      ['spatial-recenter', () => {this.cancelMove(); this.faceLocked = true; this.placeFixedPanel(); this.renderControls();}],
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
      this.root.visible = visible || this.world.visibilityState.value === VisibilityState.VisibleBlurred;
      if(!visible)this.cancelMove();
      this.audio.stop();this.finaleAudioPending=false;this.themes.trellis.cancel();
      if (visible) {
        this.revision = -1; // Resume at saved progress without replaying a tween.
        this.tween.set(finalTaskAR.waiting ? taskRatio(finalTaskAR.before) : (progress.total ? progress.complete / progress.total : 0), false);
        this.fade = 0.3;
      }
      this.renderControls();
    }));
    const ended = () => {
      this.audio.stop();this.finaleAudioPending=false;this.themes.trellis.cancel();
      this.activeSession = undefined;
      this.cancelMove(); this.faceLocked = true;
      this.fadeMesh.visible = false;
      this.placeFixedPanel();
    };
    this.world.renderer.xr.addEventListener('sessionend', ended);
    this.cleanupFuncs.push(() => this.world.renderer.xr.removeEventListener('sessionend', ended));
    this.cleanupFuncs.push(() => {
      this.cancelMove();
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

  private applySettings(next: SpatialSettings): void {
    this.settings=next;

    if(!next.zenSound) {this.audio.stop(); this.finaleAudioPending=false;}
    if(!next.motion) this.themes.trellis.cancel();
    this.applyScale();
    this.message='Appearance synchronized locally.';
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
    this.placeFixedPanel();
    const browser = document.getElementById('browser-panel')!;
    browser.style.fontSize = `${this.settings.scale}rem`;
    browser.style.setProperty('--readable-scale', String(this.settings.scale));
  }

  private cancelMove(): void {
    const id = this.drag.owner;
    if(id === null)return;
    this.drag.cancel(); this.dragHand = null;
    if(this.handle.hasPointerCapture(id))this.handle.releasePointerCapture(id);
  }

  private placeFixedPanel(): void {
    if(this.faceLocked && this.drag.owner === null)
      faceCenterPanel(this.root, this.world.playerSpaceEntities.head.object3D!);
    this.root.updateWorldMatrix(true, false);
    applyFixedPanelPose(this.panel, this.root.matrixWorld);
  }

  private frame(frame: XRFrame): void {
    if (!this.ready || this.world.visibilityState.value !== VisibilityState.Visible) return;
    const session = this.world.xrSession;
    const space = this.world.xrReferenceSpace;
    if (!session || !space || !frame.getViewerPose(space)) return;
    if (session !== this.activeSession) {
      this.activeSession = session;
      this.placeFixedPanel();
      this.fade = 0.3;
      this.revision = progress.revision;
      this.tween.set(finalTaskAR.waiting ? taskRatio(finalTaskAR.before) : (progress.total ? progress.complete / progress.total : 0), false);
    }
    const finale = finalTaskAR.start(session, progress.tasks);
    if(finale) {
      const motion = this.settings.motion && !this.media.matches;
      this.tween.set(taskRatio(finale.before), false);
      this.tween.set(1, motion);
      this.revision = progress.revision;
      this.fade = 0;
      this.finaleAudioPending = this.ready && this.settings.zenSound;
      this.themes.trellis.celebrate();
    }
    if(this.drag.owner !== null) {
      const source=this.dragHand && this.world.input.xr.getPrimaryInputSource(this.dragHand);
      if(!source?.hand || !frame.getPose(source.targetRaySpace,space))this.cancelMove();
    }
    this.placeFixedPanel();
    const size=this.panel.document.computedSize;
    if(size) this.themes.trellis.fit(size.width*0.01*this.panel.document.scale.x,
      size.height*0.01*this.panel.document.scale.y);
    const head=this.world.playerSpaceEntities.head.object3D!;
    head.getWorldPosition(this.position);head.getWorldQuaternion(this.rotation);
    this.forward.set(0,0,-1).applyQuaternion(this.rotation);this.up.set(0,1,0).applyQuaternion(this.rotation);
    this.soundPosition.set(0,0.79,0.04);this.themes.trellis.root.localToWorld(this.soundPosition);
    this.audio.update(this.position,this.forward,this.up,this.soundPosition);
  }

  update(delta: number): void {
    // Dynamic trellis height for 1-10 tasks — ensure vines span full frame top 1.02 to bottom stats
    if (progress.total >= 0) this.themes.trellis.setTaskCount(progress.total);
    this.drag.tick(delta);
    const state = this.world.visibilityState.value;
    const standard = state === VisibilityState.NonImmersive && !this.world.renderer.xr.isPresenting;
    const visible = state === VisibilityState.Visible;
    this.root.visible = standard || visible || state === VisibilityState.VisibleBlurred;
    if (!standard && !visible) {
      this.fadeMesh.visible = false; this.themes.trellis.cancel();
      this.audio.stop(); this.finaleAudioPending = false; return;
    }
    if(standard) {
      const rect = document.getElementById('browser-garden')!.getBoundingClientRect();
      this.root.visible = rect.width > 0 && rect.height > 0;
      this.root.position.set(0,0,0); this.root.quaternion.identity();
      this.themes.trellis.fit(0.8,1);
      if(this.root.visible) {
        const width = Math.round(rect.width), height = Math.round(rect.height);
        this.world.renderer.getSize(this.browserSize);
        if(this.browserSize.x !== width || this.browserSize.y !== height)
          this.world.renderer.setSize(width,height,false);
        this.world.camera.position.set(0,0,1.6);
        this.world.camera.lookAt(0,0,0);
        this.world.camera.fov = 50;
        this.world.camera.aspect = width/height;
        this.world.camera.updateProjectionMatrix();
      }
      this.fadeMesh.visible = false;
    }
    const motion = this.settings.motion && !this.media.matches;
    if(this.revision !== progress.revision && !(visible && finalTaskAR.waiting)) {
      const finalInAR = visible && !finalTaskAR.waiting && progress.finale;
      this.finaleAudioPending = finalInAR && this.revision >= 0 && this.ready && this.settings.zenSound;
      if(finalInAR && this.revision >= 0)this.themes.trellis.celebrate();
      else this.themes.trellis.cancel();
      this.tween.set(progress.ratio, motion && this.revision >= 0 && progress.animate);
      this.revision = progress.revision;
    }
    if(!motion && !(visible && finalTaskAR.waiting))this.tween.set(progress.ratio,false);
    if(visible) {
      this.audio.setAmbient(this.ready && this.settings.zenSound); this.audio.tick(delta);
    } else {
      this.audio.setAmbient(false); this.audio.stop(); this.finaleAudioPending = false;
    }
    this.themes.update(this.tween.tick(delta),progress.total > 0,delta,motion);
    if(this.themes.trellis.update(delta,motion) && visible)this.playGardenCue();
    if(visible) {
      this.fade = Math.max(0,this.fade-Math.min(delta,1/30));
      this.fadeMesh.visible = this.fade > 0;
      this.fadeMesh.material.opacity = this.fade/0.3;
      this.world.playerSpaceEntities.head.object3D!.getWorldPosition(this.fadeMesh.position);
    }
  }

  private renderControls(): void {
    for(const [id, text] of [
      ['spatial-scale', 'Panel size: 0.8 x 1.0 m (fixed)'],
      ['spatial-placement', this.faceLocked ? 'Panel: Face centered' : 'Panel: Placed by hand'],
    ]) {
      this.panel.requireElementById(id).setProperties({text, disabled: true});
      const browser = document.getElementById(`browser-${id}`) as HTMLButtonElement;
      browser.textContent = text;
      browser.disabled = true;
    }
    const labels: Record<string, string> = {
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
