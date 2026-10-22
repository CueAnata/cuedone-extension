import test from 'node:test';
import assert from 'node:assert/strict';
import { GardenProgress, isFinalCompletion } from './garden-progress.ts';
const before=[{id:'a',completed:true},{id:'b',completed:false}];
const done=before.map(task=>({...task,completed:true}));
test('finale is only a forward completion on the same nonempty list',()=>{
  assert.equal(isFinalCompletion(before,done),true);
  for(const [a,b] of [[[],[]],[done,done],[before,[done[0]]],[[],done],[done,before]] as const)
    assert.equal(isFinalCompletion(a,b),false);
});
test('load, synchronization echo and replacing a list never replay a finale',()=>{
  const progress=new GardenProgress();progress.publish(before,false);
  assert.equal(progress.finale,false);
  progress.publish(done,true);assert.equal(progress.finale,true);
  const revision=progress.revision;progress.publish(done,true);assert.equal(progress.revision,revision);
  progress.publish([{id:'other',completed:true}],false);assert.equal(progress.finale,false);
  progress.publish([],true);assert.equal(progress.ratio,0);assert.equal(progress.finale,false);
});
test('unchanged counts with changed task identities update constellation bindings',()=>{
  const p=new GardenProgress();p.publish(before,false);const rev=p.revision;
  p.publish([{id:'c',completed:true},{id:'d',completed:false}],false);
  assert.equal(p.revision,rev+1);assert.equal(p.animate,false);
});
