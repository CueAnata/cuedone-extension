import test from 'node:test';
import assert from 'node:assert/strict';
import { TrellisGarden, VINE_SEGMENTS, BUTTERFLY_COUNT } from './trellis-garden.ts';
test('vines share the exact top-center meeting point and grow from zero to full geometry',()=>{
  const garden=new TrellisGarden();
  assert.ok(garden.vinePoint(1,-1).distanceTo(garden.vinePoint(1,1))<1e-10);
  assert.ok(Math.abs(garden.vinePoint(1,-1).x)<1e-10);
  assert.equal(garden.vines[0].geometry.drawRange.count,0);
  garden.setProgress(0.5);assert.equal(garden.vines[0].geometry.drawRange.count,VINE_SEGMENTS/2*5*6);
  garden.setProgress(1);assert.equal(garden.vines[0].geometry.drawRange.count,VINE_SEGMENTS*5*6);
  garden.dispose();
});
test('butterflies and bird cue wait for joined tips, fire once, then release their burst',()=>{
  const garden=new TrellisGarden();garden.celebrate();garden.setProgress(0.5);
  assert.equal(garden.update(1/90,true),false);assert.equal(garden.wings.visible,false);
  garden.setProgress(1);assert.equal(garden.update(1/90,true),true);
  assert.equal(garden.wings.visible,true);assert.equal(garden.wings.count,BUTTERFLY_COUNT*2);
  assert.equal(garden.update(1/90,true),false);
  for(let i=0;i<200;i++)garden.update(1/90,true);
  assert.equal(garden.wings.visible,false);garden.dispose();
});
test('reduced motion preserves the completed garden and suppresses butterfly flight',()=>{
  const garden=new TrellisGarden();garden.setProgress(1);garden.celebrate();
  assert.equal(garden.update(1/90,false),true);assert.equal(garden.wings.visible,false);
  assert.equal(garden.update(1/90,true),false);garden.dispose();
});
test('frame resizing, ordinary rendering and cancelled finales do not grow the object graph',()=>{
  const garden=new TrellisGarden();const count=garden.root.children.length;
  const geometry=garden.vines[0].geometry;
  garden.celebrate();garden.cancel();garden.setProgress(1);
  assert.equal(garden.update(1/90,true),false);
  for(let i=0;i<500;i++){garden.fit(0.8,1.5);garden.setProgress((i%100)/100);garden.update(1/90,true);}
  assert.equal(garden.root.children.length,count);assert.equal(garden.vines[0].geometry,geometry);garden.dispose();
});

test('trellis contact is transient feedback and never grows vines or starts a finale',()=>{
  const garden=new TrellisGarden();garden.setProgress(0.5);
  const before=garden.vines[0].geometry.drawRange.count;
  garden.highlight(garden.vinePoint(0.5,-1));assert.equal(garden.feedback.visible,true);
  assert.equal(garden.update(1/90,false),false);assert.equal(garden.wings.visible,false);
  for(let i=0;i<30;i++)garden.update(1/90,false);
  assert.equal(garden.feedback.visible,false);assert.equal(garden.vines[0].geometry.drawRange.count,before);garden.dispose();
});
