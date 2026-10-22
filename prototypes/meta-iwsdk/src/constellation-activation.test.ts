import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { ConstellationActivation,starCoordinate } from './constellation-activation.ts';
const initial=[{id:'a',completed:false},{id:'b',completed:false}];
test('saved completion emits from trellis node and aligns once at dome star',()=>{
 const c=new ConstellationActivation(()=>new Vector3(-.48,0,.02));
 let activated=0,aligned=0;c.addEventListener('activate',()=>activated++);
 c.addEventListener('aligned',e=>{aligned++;assert.ok(e.position.distanceTo(starCoordinate(0))<1e-10);});
 c.bind(initial,false);c.bind([{id:'a',completed:true},initial[1]],true);
 assert.equal(activated,1);assert.equal(aligned,0);
 c.tick(1/90,true);assert.equal(c.particles.geometry.drawRange.count,12);
 for(let i=0;i<100;i++)c.tick(1/90,true);
 assert.equal(aligned,1);assert.equal(c.particles.geometry.drawRange.count,0);
 c.bind([{id:'a',completed:true},initial[1]],true);
 for(let i=0;i<100;i++)c.tick(1/90,true);
 assert.equal(activated,1);assert.equal(aligned,1);c.dispose();
});
test('restore, uncheck, replacement, cancellation and reduced motion never emit delayed alignment',()=>{
 const c=new ConstellationActivation(()=>new Vector3());let aligned=0;c.addEventListener('aligned',()=>aligned++);
 const done=initial.map(t=>({...t,completed:true}));
 c.bind(done,false);c.bind(initial,true);c.bind(done,true);c.tick(.01,false);
 for(let i=0;i<100;i++)c.tick(1/90,true);assert.equal(aligned,0);
 c.bind(initial,false);c.bind(done,true);c.bind([{id:'new',completed:true}],true);
 for(let i=0;i<100;i++)c.tick(1/90,true);assert.equal(aligned,0);c.dispose();
});
test('particle geometry stays bounded during bulk completion',()=>{
 const c=new ConstellationActivation(()=>new Vector3());
 const tasks=Array.from({length:100},(_,i)=>({id:String(i),completed:false}));
 c.bind(tasks,false);c.bind(tasks.map(t=>({...t,completed:true})),true);c.tick(.01,true);
 assert.equal(c.particles.geometry.drawRange.count,32*12);c.cancel();
 assert.equal(c.particles.geometry.drawRange.count,0);c.dispose();
});

test('constellation finale waits for the last completion animation and never fires on partial progress',()=>{
 const c=new ConstellationActivation(()=>new Vector3());let finales=0;
 c.addEventListener('finale',()=>finales++);
 c.bind(initial,false);c.bind([{id:'a',completed:true},initial[1]],true);
 for(let i=0;i<100;i++)c.tick(1/90,true);assert.equal(finales,0);
 c.bind(initial.map(t=>({...t,completed:true})),true);
 c.tick(1/90,true);assert.equal(finales,0);
 for(let i=0;i<100;i++)c.tick(1/90,true);assert.equal(finales,1);
 for(let i=0;i<100;i++)c.tick(1/90,true);assert.equal(finales,1);
 c.bind(initial.map(t=>({...t,completed:true})),true);c.tick(1/90,true);assert.equal(finales,1);c.dispose();
});
test('constellation final audio does not replay on restore or cancellation, and reduced motion completes once',()=>{
 const c=new ConstellationActivation(()=>new Vector3());let finales=0;
 c.addEventListener('finale',()=>finales++);
 const done=initial.map(t=>({...t,completed:true}));
 c.bind(done,false);for(let i=0;i<100;i++)c.tick(1/90,true);assert.equal(finales,0);
 c.bind(initial,false);c.bind(done,true);c.cancel();for(let i=0;i<100;i++)c.tick(1/90,true);assert.equal(finales,0);
 c.bind(initial,false);c.bind(done,true);c.tick(1/90,false);assert.equal(finales,1);
 c.tick(1/90,false);assert.equal(finales,1);c.dispose();
});
