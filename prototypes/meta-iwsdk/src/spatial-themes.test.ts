import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SpatialThemes } from './spatial-themes.ts';

test('empty garden keeps its margin frame without growing or playing a finale', () => {
  const scene = new SpatialThemes();
  scene.update(1,false,1/90,false);
  assert.equal(scene.zen.visible,false);
  assert.equal(scene.trellis.root.visible,true);
  assert.equal(scene.trellis.vines[0].geometry.drawRange.count,0);
  assert.equal(scene.trellis.update(1/90,false),false);
  scene.dispose();
});

test('permanent garden has no constellation and keeps a bounded scene during progress updates', () => {
  const scene = new SpatialThemes();
  const names:string[]=[];
  scene.root.traverse(object=>names.push(object.name));
  assert.equal(names.some(name=>/constellation|star/i.test(name)),false);
  const count = scene.zen.children.length;
  for(let i=0;i<500;i++)scene.update(0.5,true,1/90,false);
  assert.equal(scene.zen.visible,true);
  assert.equal(scene.zen.children.length,count);
  const particles = scene.zen.children[scene.zen.children.length-1];
  assert.equal(particles.rotation.y,0);
  scene.update(1,true,1/90,true);
  assert.ok(scene.trellis.vines[0].geometry.drawRange.count>0);
  scene.dispose();
});
