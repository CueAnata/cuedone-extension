import test from 'node:test';
import assert from 'node:assert/strict';
import { HomeEvolution, HOME_STAGES, homeStage } from './home-evolution.ts';
import { ProgressTween } from './spatial-state.ts';

test('all seven exact scenes replace each other with futuristic finale only at 100 percent',()=>{
  const home=new HomeEvolution();
  assert.deepEqual(home.stages.map(s=>s.name),HOME_STAGES);
  for(let i=0;i<7;i++) {
    home.setProgress(i/6);
    assert.deepEqual(home.stages.map(s=>s.visible),HOME_STAGES.map((_,j)=>i===j));
  }
  assert.equal(homeStage(0.999999),5);assert.equal(homeStage(1),6);
  home.setProgress(0);assert.equal(home.stages[0].visible,true);
});
test('1–10 task lists scale by exact progress, including reverse/reset and smooth single-task traversal',()=>{
  const home=new HomeEvolution();
  for(let total=1;total<=10;total++)for(let complete=0;complete<=total;complete++) {
    home.setProgress(complete/total);
    assert.equal(home.stages[homeStage(complete/total)].visible,true);
    assert.equal(home.stages[6].visible,complete===total);
  }
  const tween=new ProgressTween(),seen=new Set<number>();tween.set(1,true);
  for(let i=0;i<60;i++)seen.add(homeStage(tween.tick(1/90)));
  assert.deepEqual([...seen],[0,1,2,3,4,5,6]);
  home.setProgress(0);assert.equal(home.stages[6].visible,false);
});
test('scene details include every requested architecture and sci-fi element',()=>{
  const home=new HomeEvolution();
  for(const [stage,name] of [[1,'Grass roof'],[2,'Flat roof tile'],[3,'Inverted-V white trim'],
    [3,'Round attic window'],[4,'Brick bottom floor'],[4,'Siding upper floor'],
    [4,'Roof overhang'],[5,'NYC skyscraper apartment tower'],[6,'Oblong panoramic window rim'],
    [6,'Serving tray'],[6,'White serving apron'],[6,'Robot dog']] as const) {
    assert.ok(home.stages[stage].getObjectByName(name),name);
  }
  const names:string[]=[];home.root.traverse(o=>names.push(o.name));
  assert.equal(names.some(n=>/garden|trellis|bird|butterfl/i.test(n)),false);
});
test('flying cars move only with motion enabled and retain a bounded scene graph',()=>{
  const home=new HomeEvolution();home.setProgress(1);
  const count=home.root.getObjectsByProperty('isMesh',true).length;
  const first=home.cars[0].position.clone();home.update(1/90,true);
  assert.notDeepEqual(home.cars[0].position,first);
  const still=home.cars[0].position.clone();home.update(99,false);
  assert.deepEqual(home.cars[0].position,still);
  for(let i=0;i<500;i++){home.setProgress((i%101)/100);home.update(1/90,true);}
  assert.equal(home.root.getObjectsByProperty('isMesh',true).length,count);
});
