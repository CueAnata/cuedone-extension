import { Matrix4, Object3D, Quaternion, Vector3 } from 'three';

export const PANEL_WIDTH_METERS = 0.8;
export const PANEL_HEIGHT_METERS = 1;
const worldPose = new Matrix4().makeTranslation(0, 0, -1.5);
const localPose = new Matrix4();

/** Identity orientation and scale in WORLD space, independent of the ECS parent. */
export function applyFixedPanelPose(panel: Object3D, pose: Matrix4 = worldPose): void {
  localPose.copy(pose);
  if(panel.parent) {
    panel.parent.updateWorldMatrix(true, false);
    localPose.copy(panel.parent.matrixWorld).invert().multiply(pose);
  }
  localPose.decompose(panel.position, panel.quaternion, panel.scale);
  panel.updateWorldMatrix(false, true);
}

const headPosition = new Vector3();
const headRotation = new Quaternion();
const facing = new Vector3();
const upright = new Vector3(0, 1, 0);
/** Face-centered, 1.5 m away, with world-up preserved during head tilt. */
export function faceCenterPanel(panel: Object3D, head: Object3D): void {
  head.getWorldPosition(headPosition);
  head.getWorldQuaternion(headRotation);
  panel.position.set(0, 0, -1.5).applyQuaternion(headRotation).add(headPosition);
  facing.copy(headPosition).sub(panel.position);
  facing.y = 0;
  // Looking straight up/down has no stable horizontal heading.
  if(facing.lengthSq() > 1e-8) {
    panel.quaternion.setFromAxisAngle(upright, Math.atan2(facing.x, facing.z));
  }
  panel.updateWorldMatrix(true, false);
}
