import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3, Mesh, TubeGeometry, MeshBasicMaterial } from 'three';
import { bezierVine, VineGrowthController } from './vine-growth.ts';
test('Bezier path preserves endpoints and GPU growth shares CPU contact visibility',()=>{
 const path=bezierVine(t=>new Vector3(Math.sin(t*6),t,0));
 assert.equal(path.curves.length,80);
 assert.ok(path.getPoint(0).distanceTo(new Vector3())<1e-9);
 assert.ok(path.getPoint(1).distanceTo(new Vector3(Math.sin(6),1,0))<1e-9);
 const mesh=new Mesh(new TubeGeometry(path,120,.012,5),new MeshBasicMaterial());
 const c=new VineGrowthController(mesh);
 for(const ratio of [0,.25,.5,.75,1]){
  c.setProgress(ratio);assert.equal(c.uniforms.uGrowthProgress.value,ratio);
  assert.equal(mesh.geometry.drawRange.count,Math.floor(120*ratio)*30);
 }
 const shader={uniforms:{},vertexShader:'#include <begin_vertex>'};
 mesh.material.onBeforeCompile(shader as never,{} as never);
 assert.equal((shader.uniforms as Record<string,unknown>).uGrowthProgress,c.uniforms.uGrowthProgress);
 assert.match(shader.vertexShader,/mix\(vineCenter, transformed, vineGrowth\)/);
 assert.equal(mesh.geometry.getAttribute('vineCenter').count,mesh.geometry.getAttribute('position').count);
 c.setProgress(NaN);assert.equal(c.uniforms.uGrowthProgress.value,0);
 mesh.geometry.dispose();mesh.material.dispose();
});
