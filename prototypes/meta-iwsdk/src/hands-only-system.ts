import { createSystem, VisibilityState } from '@iwsdk/core';

/** Interaction guidance changes only when tracking state changes, not every frame. */
export class HandsOnlySystem extends createSystem({}) {
  private previous='';
  update():void {
    const xr=this.world.input.xr;
    const visible=this.world.visibilityState.value===VisibilityState.Visible;
    const tracked=visible && (xr.getPrimaryInputSource('left')?.hand || xr.getPrimaryInputSource('right')?.hand);
    const text=visible && !tracked
      ? 'Hands only: show your hands to the headset. Controllers are disabled.'
      : 'Hands only: aim at a task checkbox and pinch index finger and thumb to complete it. Trellis touches only highlight.';
    if(text===this.previous)return;
    this.previous=text;
    this.world.requireSceneObject<import('@iwsdk/core').UIKitMLAsset>('task-panel')
      .requireElementById('spatial-input-status').setProperties({text});
    document.getElementById('browser-spatial-input-status')!.textContent=text;
  }
}
