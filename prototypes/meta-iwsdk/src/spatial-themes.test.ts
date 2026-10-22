import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SpatialThemes } from './spatial-themes.ts';

test('spatial themes never render an empty-list finale', () => {
  const scene = new SpatialThemes();
  scene.update('constellation',1,false,1/90,false);
  assert.equal(scene.constellation.visible,false); assert.equal(scene.zen.visible,false);
  scene.update('zen',1,false,1/90,false);
  assert.equal(scene.zen.visible,false); scene.dispose();
});
test('theme switching preserves bounded scene graph and exact Constellation edges', () => {
  const scene = new SpatialThemes();
  scene.update('constellation',1,true,1/90,false);
  assert.equal(scene.constellation.visible,true);
  assert.equal(scene.constellation.children[1].type,'LineSegments');
  const lines = scene.constellation.children[1] as import('three').LineSegments;
  assert.equal(lines.geometry.drawRange.count,14);
  scene.update('constellation',0,true,1/90,false);
  assert.equal(lines.geometry.drawRange.count,0);
  const count = scene.zen.children.length;
  for(let i=0;i<500;i++) scene.update('zen',0.5,true,1/90,false);
  assert.equal(scene.zen.visible,true); assert.equal(scene.constellation.visible,false);
  assert.equal(scene.zen.children.length,count);
  const particles = scene.zen.children[scene.zen.children.length - 1];
  assert.equal(particles.rotation.y,0); scene.dispose();
});

test('task constellation tracks every task identity and current active task without extra objects',()=>{
  const scene=new SpatialThemes();const count=scene.constellation.children.length;
  const tasks=Array.from({length:100},(_,i)=>({id:`task-${i}`,completed:i<10}));
  scene.bindTasks(tasks);
  const nodes=scene.constellation.getObjectByName('Task constellation nodes') as import('three').Points;
  assert.equal(nodes.geometry.getAttribute('position').count,100);
  assert.equal(nodes.userData.activeTaskId,'task-10');
  assert.deepEqual(nodes.userData.taskIds,tasks.map(task=>task.id));
  scene.bindTasks([]);assert.equal(nodes.geometry.getAttribute('position').count,0);
  assert.equal(scene.constellation.children.length,count);scene.dispose();
});
