import { Matrix4, Object3D } from 'three';

export const PANEL_WIDTH_METERS = 0.8;
export const PANEL_HEIGHT_METERS = 1;
const worldPose = new Matrix4().makeTranslation(0, 0, -1.5);
const localPose = new Matrix4();

/** Identity orientation and scale in WORLD space, independent of the ECS parent. */
export function applyFixedPanelPose(panel: Object3D): void {
  localPose.copy(worldPose);
  if(panel.parent) {
    panel.parent.updateWorldMatrix(true, false);
    localPose.copy(panel.parent.matrixWorld).invert().multiply(worldPose);
  }
  localPose.decompose(panel.position, panel.quaternion, panel.scale);
  panel.updateWorldMatrix(false, true);
}
