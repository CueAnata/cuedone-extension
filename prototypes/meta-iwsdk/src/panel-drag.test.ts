import test from 'node:test';
import assert from 'node:assert/strict';
import { Group, Ray, Vector3 } from 'three';
import { PanelDrag } from './panel-drag.ts';

function fixture() {
  const panel = new Group(); panel.position.set(0,0,-1.8);
  const drag = new PanelDrag(panel);
  const ray = new Ray(new Vector3(),new Vector3(0,0,-1));
  return {panel,drag,ray};
}

test('ray drag keeps the grab offset, moves smoothly, and holds the displayed release pose',()=>{
  const {panel,drag,ray}=fixture();
  const hit=new Vector3(0,0.2,-1.8);
  ray.direction.copy(hit).normalize();
  assert.equal(drag.begin(7,ray,hit),true);
  const movedRay=ray.clone(); movedRay.origin.set(0.5,0.1,0.2);
  assert.equal(drag.move(7,movedRay),true);
  drag.tick(1/90);
  assert.ok(panel.position.x>0 && panel.position.x<0.5);
  for(let i=0;i<120;i++)drag.tick(1/90);
  assert.ok(panel.position.distanceTo(new Vector3(0.5,0.1,-1.6))<1e-6);
  const released=panel.position.clone();
  assert.equal(drag.end(7),true);
  drag.tick(1000);
  assert.deepEqual(panel.position,released);
  assert.equal(drag.move(7,ray),false);
});

test('second hand cannot steal, move, or release an active drag',()=>{
  const {panel,drag,ray}=fixture();
  drag.begin(1,ray,panel.position.clone());
  assert.equal(drag.begin(2,ray,panel.position.clone()),false);
  assert.equal(drag.move(2,new Ray(new Vector3(1,0,0),ray.direction)),false);
  assert.equal(drag.end(2),false);
  assert.equal(drag.owner,1);
  assert.equal(panel.position.x,0);
});

test('tracking cancellation restores the starting position and clears the pointer owner',()=>{
  const {panel,drag,ray}=fixture();const original=panel.position.clone();
  drag.begin(1,ray,panel.position.clone());
  drag.move(1,new Ray(new Vector3(0.5,0,0),ray.direction));drag.tick(1/30);
  assert.ok(panel.position.x>0);
  assert.equal(drag.cancel(),true);
  assert.deepEqual(panel.position,original);
  assert.equal(drag.owner,null);
  assert.equal(drag.cancel(),false);
});

test('malformed rays cannot poison transforms and suspension cannot create a teleport',()=>{
  const {panel,drag,ray}=fixture();
  assert.equal(drag.begin(1,new Ray(new Vector3(NaN,0,0),ray.direction),panel.position),false);
  drag.begin(1,ray,panel.position.clone());
  assert.equal(drag.move(1,new Ray(new Vector3(Infinity,0,0),ray.direction)),false);
  assert.equal(drag.move(1,new Ray(new Vector3(),new Vector3(2,0,0))),false);
  drag.move(1,new Ray(new Vector3(10,0,0),ray.direction));
  const before=panel.position.clone();drag.tick(999);
  assert.ok(panel.position.distanceTo(before)<=0.080001);
  assert.equal(panel.position.toArray().every(Number.isFinite),true);
});
