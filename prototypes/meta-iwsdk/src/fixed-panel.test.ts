import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Group, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, Raycaster, Vector3 } from 'three';
import { applyFixedPanelPose, PANEL_WIDTH_METERS, PANEL_HEIGHT_METERS } from './fixed-panel.ts';

function close(actual: number, expected: number) {assert.ok(Math.abs(actual-expected)<1e-9, `${actual} != ${expected}`);}
function fixed(panel: Group) {
  const position=panel.getWorldPosition(new Vector3());
  close(position.x,0); close(position.y,0); close(position.z,-1.5);
  close(panel.getWorldQuaternion(new Quaternion()).angleTo(new Quaternion()),0);
  panel.getWorldScale(position); for(const axis of ['x','y','z'] as const)close(position[axis],1);
}

test('fixed world pose survives repeated parent movement, rotation and saved-size scaling',()=>{
  const parent=new Group(), panel=new Group(); parent.add(panel);
  for(let frame=0; frame<120; frame++) {
    parent.position.set(Math.sin(frame),frame/120,0.3);
    parent.rotation.set(0,frame/60,0);
    parent.scale.setScalar(frame%2 ? 1.5 : 0.792);
    applyFixedPanelPose(panel); fixed(panel);
  }
});

test('rendered card has exact meter bounds and child input/Done ray hits share its fixed transform',()=>{
  const parent=new Group(), panel=new Group(); parent.add(panel);
  parent.position.set(0.7,1.3,-1.8); parent.rotation.y=0.7; parent.scale.setScalar(1.5);
  const geometry=new PlaneGeometry(PANEL_WIDTH_METERS,PANEL_HEIGHT_METERS);
  const material=new MeshBasicMaterial(); const surface=new Mesh(geometry,material); panel.add(surface);
  const done=new Group(); done.position.set(0.25,-0.2,0); panel.add(done);
  applyFixedPanelPose(panel);
  const left=surface.localToWorld(new Vector3(-0.4,-0.5,0));
  const right=surface.localToWorld(new Vector3(0.4,0.5,0));
  close(right.x-left.x,0.8); close(right.y-left.y,1);
  for(const target of [panel,done]) {
    const point=target.getWorldPosition(new Vector3());
    const ray=new Raycaster(new Vector3(),point.clone().normalize());
    const hit=ray.intersectObject(surface)[0]; assert.ok(hit);
    close(hit.point.distanceTo(point),0);
  }
  geometry.dispose(); material.dispose();
});

test('scene and viewport retain fixed metrics, viewer-origin tracking and scrollable content',()=>{
  const scene=JSON.parse(readFileSync(new URL('../public/scenes/main.iwsdk.scene.json',import.meta.url),'utf8'));
  assert.deepEqual(scene.nodes[0].transform,{position:[0,0,-1.5],scale:1});
  const config=JSON.parse(readFileSync(new URL('../iwsdk.config.json',import.meta.url),'utf8'));
  assert.deepEqual(config.world.xr.referenceSpace,{type:'local',required:true});
  assert.equal(config.world.xr.features.handTracking.required,true);
  const ui=readFileSync(new URL('../public/ui/task-panel.uikitml',import.meta.url),'utf8');
  assert.match(ui,/width: 80;/); assert.match(ui,/height: 100;/); assert.match(ui,/overflow: scroll;/);
  assert.match(ui,/id="entry-done-button"/); assert.match(ui,/id="task-input"/);
});
