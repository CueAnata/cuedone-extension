import test from 'node:test';
import assert from 'node:assert/strict';
import { SpaceRocket, rocketAltitude, ROCKET_LEFT, ROCKET_BOTTOM, ROCKET_TOP } from './space-rocket.ts';
import { TrellisGarden } from './trellis-garden.ts';

test('rocket climbs the left column at exact progress for 1–10 tasks and reverses on reset/uncheck',()=>{
  const space=new SpaceRocket();
  for(let total=1;total<=10;total++)for(let complete=0;complete<=total;complete++) {
    space.setProgress(complete/total);
    assert.equal(space.rocket.position.x,ROCKET_LEFT);
    assert.equal(space.rocket.position.y,rocketAltitude(complete/total));
    assert.equal(space.heading.rotation.z,0);
    assert.equal(space.trail.visible,complete>0);
  }
  space.setProgress(0.5);assert.equal(space.rocket.position.y,(ROCKET_BOTTOM+ROCKET_TOP)/2);
  space.setProgress(0);assert.equal(space.trail.visible,false);assert.equal(space.rocket.position.y,ROCKET_BOTTOM);
});
test('saved completion restores upright without replay; live finale turns 90 degrees and alien chases',()=>{
  const space=new SpaceRocket();space.setProgress(1);space.update(1/90,true);
  assert.equal(space.saucer.visible,false);assert.equal(space.heading.rotation.z,0);
  space.celebrate(true);
  for(let i=0;i<50;i++)space.update(1/90,true);
  assert.equal(space.heading.rotation.z,-Math.PI/2);
  assert.ok(space.rocket.position.x>ROCKET_LEFT);assert.equal(space.saucer.visible,true);
  assert.ok(space.saucer.position.x<space.rocket.position.x);
  assert.equal(space.rocket.position.y,ROCKET_TOP);
  for(let i=0;i<300;i++)space.update(1/90,true);
  const lingering=space.rocket.position.clone();space.update(1/90,true);
  assert.notDeepEqual(space.rocket.position,lingering);
  for(let i=0;i<60;i++)space.update(1/90,true);
  const end=space.rocket.position.clone();space.update(20,true);
  assert.deepEqual(space.rocket.position,end);assert.ok(end.x>0.55);
  assert.ok(space.saucer.position.x-0.075*space.saucer.scale.x>0.55);
  assert.equal(space.rocket.visible,false);assert.equal(space.saucer.visible,false);
  space.setProgress(0.5);assert.equal(space.rocket.visible,true);assert.equal(space.saucer.visible,false);assert.equal(space.heading.rotation.z,0);
});
test('reduced motion shows a static finale and suspension never jumps a live flight',()=>{
  const space=new SpaceRocket();space.setProgress(1);space.celebrate(false);
  assert.equal(space.heading.rotation.z,-Math.PI/2);assert.equal(space.saucer.visible,true);
  const still=space.rocket.position.clone();space.update(100,false);assert.deepEqual(space.rocket.position,still);
  space.cancel();space.celebrate(true);space.update(100,true);
  assert.ok(Math.abs(space.heading.rotation.z)<0.1);
  space.cancel();assert.equal(space.saucer.visible,false);assert.equal(space.heading.rotation.z,0);
});
test('scene has stars, planets, an alien pilot and a fixed object budget',()=>{
  const space=new SpaceRocket();
  for(const name of ['Deep space backdrop','Distant stars','Distant ringed planet','Distant blue planet','Green alien pilot'])assert.ok(space.root.getObjectByName(name));
  const names:string[]=[];space.root.traverse(o=>names.push(o.name));
  assert.equal(names.some(n=>/home|house|garden|trellis|bird|butterfl/i.test(n)),false);
  for(let i=0;i<500;i++){space.setProgress((i%101)/100);space.update(1/90,true);}
  const after:string[]=[];space.root.traverse(o=>after.push(o.name));assert.deepEqual(after,names);
});
test('browser and immersive fitting preserve rocket proportions and keep scene beside the panel',()=>{
  const garden=new TrellisGarden();garden.setTheme('rocket');
  for(const presentation of ['browser','immersive'] as const) {
    garden.fit(0.8,1,presentation);
    const scale=garden.root.scale;
    assert.ok(Math.abs(scale.x*garden.space.rocket.scale.x-scale.y)<1e-10);
    garden.setProgress(0.5);assert.ok(garden.space.rocket.position.x*scale.x<-0.4);
  }
  garden.dispose();
});
test('integration finale fires once only after progress reaches 100 percent and cancels on switch',()=>{
  const scene=new TrellisGarden();scene.setTheme('rocket');scene.setProgress(0.5);scene.celebrate();
  assert.equal(scene.update(1/90,true),false);assert.equal(scene.space.saucer.visible,false);
  scene.setProgress(1);assert.equal(scene.update(1/90,true),true);
  assert.equal(scene.update(1/90,true),false);assert.equal(scene.space.saucer.visible,true);
  scene.setTheme('zen');assert.equal(scene.space.saucer.visible,false);
  scene.setTheme('rocket');assert.equal(scene.update(1/90,true),false);scene.dispose();
});
