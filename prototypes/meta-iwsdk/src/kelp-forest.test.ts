import test from 'node:test';
import assert from 'node:assert/strict';
import { Matrix4 } from 'three';
import { KelpForest } from './kelp-forest.ts';
import { TrellisGarden } from './trellis-garden.ts';
import { SpatialThemes } from './spatial-themes.ts';

function grown(kelp:KelpForest):number {
  const matrix=new Matrix4();let visible=0;
  for(let i=0;i<kelp.stems.count;i++){kelp.stems.getMatrixAt(i,matrix);if(matrix.determinant()>1e-12)visible++;}
  return visible;
}
test('each completion adds one leafy section to BOTH fronds for 1–10 tasks; reset and uncheck reverse growth',()=>{
  const kelp=new KelpForest();
  for(let total=1;total<=10;total++) {
    kelp.setTaskCount(total);
    for(let complete=0;complete<=total;complete++) {
      kelp.setProgress(complete/total);assert.equal(grown(kelp),complete*2);
    }
    kelp.setProgress(0);assert.equal(grown(kelp),0);
    kelp.setProgress(1/total);assert.equal(grown(kelp),2);
  }
  kelp.setTaskCount(0);kelp.setProgress(1);kelp.celebrate(true);kelp.update(1,false);
  assert.equal(grown(kelp),0);assert.equal(kelp.jellyfish.some(j=>j.visible),false);
});
test('longer lists preserve every task section without growing the graph during animation',()=>{
  const kelp=new KelpForest();kelp.setTaskCount(14);kelp.setProgress(1);assert.equal(grown(kelp),28);
  const children=kelp.root.children.length,geometry=kelp.leaves.geometry,stems=kelp.stems;
  for(let i=0;i<500;i++){kelp.setProgress((i%101)/100);kelp.update(1/90,true);}
  assert.equal(kelp.root.children.length,children);assert.equal(kelp.leaves.geometry,geometry);assert.equal(kelp.stems,stems);
});
test('gentle current remains on outer edges and freezes with reduced motion',()=>{
  const kelp=new KelpForest();kelp.setTaskCount(6);kelp.setProgress(0.5);
  const start=kelp.point(1,1);kelp.update(1/30,true);assert.notDeepEqual(kelp.point(1,1),start);
  const still=kelp.point(1,1);kelp.update(99,false);assert.deepEqual(kelp.point(1,1),still);
  for(let i=0;i<100;i++) {
    kelp.update(1/90,true);
    assert.ok(kelp.point(1,-1).x<-0.4);assert.ok(kelp.point(1,1).x>0.4);
  }
});
test('only live full completion opens fronds outward and raises pulsing, undulating jellyfish',()=>{
  const kelp=new KelpForest();kelp.setTaskCount(5);kelp.setProgress(0.8);kelp.celebrate(true);kelp.update(1/90,true);
  assert.equal(kelp.jellyfish.some(j=>j.visible),false);
  kelp.setProgress(1);kelp.update(1/90,true);assert.equal(kelp.jellyfish.some(j=>j.visible),false);
  const left=kelp.point(1,-1).x,right=kelp.point(1,1).x;
  kelp.celebrate(true);const height=kelp.jellyfish[0].position.y,bell=kelp.bells[0].scale.y,tentacle=kelp.tentacles[0][0].rotation.z;
  for(let i=0;i<60;i++)kelp.update(1/90,true);
  assert.ok(kelp.point(1,-1).x<left);assert.ok(kelp.point(1,1).x>right);
  assert.ok(kelp.jellyfish[0].position.y>height);assert.notEqual(kelp.bells[0].scale.y,bell);
  assert.notEqual(kelp.tentacles[0][0].rotation.z,tentacle);
  kelp.cancel();assert.equal(kelp.jellyfish.some(j=>j.visible),false);
  kelp.celebrate(false);const staticBell=kelp.bells[0].scale.clone();kelp.update(99,false);
  assert.deepEqual(kelp.bells[0].scale,staticBell);
  kelp.setProgress(0.5);assert.equal(kelp.jellyfish.some(j=>j.visible),false);
});
test('browser/XR fit uses the same scene, keeps sea creatures proportional and hides all garden scenery',()=>{
  const scene=new SpatialThemes();scene.trellis.setTheme('coral');scene.trellis.setTaskCount(5);
  for(const presentation of ['browser','immersive'] as const) {
    scene.trellis.fit(0.8,1,presentation);scene.update(1,true,1/90,false);
    scene.trellis.celebrate();assert.equal(scene.trellis.update(1/90,false),true);
    const scale=scene.trellis.root.scale,jelly=scene.trellis.kelp.jellyfish[0];
    assert.ok(Math.abs(scale.x*jelly.scale.x-scale.y)<1e-10);
    assert.equal(scene.zen.visible,false);assert.equal(scene.trellis.wings.visible,false);
    assert.equal(scene.trellis.vines.some(v=>v.visible),false);
  }
  scene.dispose();
});
