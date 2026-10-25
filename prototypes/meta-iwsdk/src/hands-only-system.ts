import { createSystem, VisibilityState } from '@iwsdk/core';

/** Interaction guidance changes only when tracking state changes, not every frame. */
export class HandsOnlySystem extends createSystem({}) {
  private previous='';
  private previousDiagnostic='';
  update():void {
    const xr=this.world.input.xr;
    const focus=this.world.visibilityState.value;
    const nativeHands=Array.from(this.world.xrSession?.inputSources ?? [])
      .filter(source => source.hand).map(source => source.handedness).join(',') || 'none';
    const sdkHands=(['left','right'] as const)
      .filter(hand => xr.getPrimaryInputSource(hand)?.hand).join(',') || 'none';
    // IWSDK adds these hit-target snapshots to the Three scene at runtime.
    const scene=this.world.scene as typeof this.world.scene & {
      touchDescendants?: readonly unknown[];
      rayDescendants?: readonly unknown[];
    };
    const touchTargets=scene.touchDescendants?.length ?? 0;
    const rayTargets=scene.rayDescendants?.length ?? 0;
    const diagnostic=`XR: ${focus} | Hands: ${nativeHands} / SDK: ${sdkHands} | Touch: ${touchTargets ? 'on' : 'off'} (${touchTargets}) | Ray: ${rayTargets ? 'on' : 'off'} (${rayTargets})`;
    if(diagnostic !== this.previousDiagnostic) {
      this.previousDiagnostic=diagnostic;
      this.world.requireSceneObject<import('@iwsdk/core').UIKitMLAsset>('task-panel')
        .requireElementById('input-diagnostic').setProperties({text: diagnostic});
      document.getElementById('browser-input-diagnostic')!.textContent=diagnostic;
    }
    const visible=focus===VisibilityState.Visible;
    const tracked=visible && (xr.getPrimaryInputSource('left')?.hand || xr.getPrimaryInputSource('right')?.hand);
    const text=visible && !tracked
      ? 'Hands only: show your hands to the headset. Controllers are disabled.'
      : 'Hands only: aim and pinch, or touch. Trellis touches highlight without changing tasks.';
    if(text===this.previous)return;
    this.previous=text;
    this.world.requireSceneObject<import('@iwsdk/core').UIKitMLAsset>('task-panel')
      .requireElementById('spatial-input-status').setProperties({text});
    document.getElementById('browser-spatial-input-status')!.textContent=text;
  }
}
