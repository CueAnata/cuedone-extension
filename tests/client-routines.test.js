import test from "node:test";
import assert from "node:assert/strict";
import { captureClientRoutine, instantiateClientRoutine, normalizeClientRoutines } from "../src/shared/client-routines.js";
import { CLIENT_ACTIVITIES, CLIENT_ACTIVITY_GROUPS, GROUPED_CLIENT_ACTIVITIES } from "../src/shared/client-activities.js";
import { loadClientRoutines, saveClientRoutines, CLIENT_ROUTINES_KEY, TASKS_STORAGE_KEY } from "../src/shared/task-store.js";
const tasks=[{id:"a",text:"Tell a story",completed:true,createdAt:1},{id:"b",text:"Computer",completed:false,createdAt:2}];
const sequence={enabled:true,partCount:4,assignments:{a:0,b:3},activities:{0:"story",3:"computer"},taskActivities:{a:"story"},fullListLayout:"activities"};
test("grouped activity picker covers every choice exactly once and retains Custom",()=>{
 const ids=CLIENT_ACTIVITY_GROUPS.flatMap(g=>g.ids);
 assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual([...ids].sort(),[...CLIENT_ACTIVITIES.map(a=>a.id),""].sort());
 assert.equal(GROUPED_CLIENT_ACTIVITIES.filter(a=>a.heading).length,4);
});
test("routine stores content/layout without checks and restores fresh task identities",()=>{
 const before=structuredClone(tasks);
 const routine=captureClientRoutine(" Session ",tasks,sequence,"routine");
 assert.equal(routine.name,"Session");
 assert.ok(routine.tasks.every(t=>!Object.hasOwn(t,"completed")&&!Object.hasOwn(t,"id")));
 const first=instantiateClientRoutine(routine),second=instantiateClientRoutine(routine);
 assert.ok(first.tasks.every(t=>!t.completed));
 assert.notEqual(first.tasks[0].id,second.tasks[0].id);
 assert.equal(first.sequence.assignments[first.tasks[1].id],3);
 assert.equal(first.sequence.taskActivities[first.tasks[0].id],"story");
 assert.equal(first.sequence.fullListLayout,"activities");
 assert.deepEqual(tasks,before);
});
test("empty, single and uneven routine lists retain their tasks and settings",()=>{
 for(const list of [[],tasks.slice(0,1),[...tasks,...Array.from({length:7},(_,i)=>({...tasks[0],id:String(i)}))]]) {
  const restored=instantiateClientRoutine(captureClientRoutine("Routine",list,sequence));
  assert.equal(restored.tasks.length,list.length);
  assert.deepEqual(restored.tasks.map(t=>t.text),list.map(t=>t.text));
 }
 assert.throws(()=>captureClientRoutine(" ",tasks,sequence));
 assert.deepEqual(normalizeClientRoutines([null,{id:"bad",name:"Bad",tasks:[{}]}]),[]);
});
test("routine save/reload/delete never changes active tasks; rejected writes preserve routines",async()=>{
 const store={[TASKS_STORAGE_KEY]:structuredClone(tasks)};let fail=false;
 globalThis.chrome={storage:{local:{async get(key){return {[key]:structuredClone(store[key])};},async set(values){if(fail)throw Error("rejected");Object.assign(store,structuredClone(values));}}}};
 const routine=captureClientRoutine("Session",tasks,sequence,"r");
 await saveClientRoutines([routine]);
 assert.deepEqual(await loadClientRoutines(),[routine]);
 fail=true;await assert.rejects(saveClientRoutines([]));
 assert.deepEqual(store[CLIENT_ROUTINES_KEY],[routine]);
 fail=false;await saveClientRoutines([]);
 assert.deepEqual(await loadClientRoutines(),[]);
 assert.deepEqual(store[TASKS_STORAGE_KEY],tasks);
});

test("new activity choices survive routine save and reload alongside Work Activity",()=>{
 const ids=["quiz","art","puzzles","daily-living","work-activity","reading","worksheet","flash-cards","free-play","writing","math","speech","ot","pt","outside-play","special-activity"];
 const list=ids.map((id,index)=>({id,text:id,completed:false,createdAt:index}));
 const routine=captureClientRoutine("New choices",list,{...sequence,taskActivities:Object.fromEntries(ids.map(id=>[id,id]))});
 const restored=instantiateClientRoutine(normalizeClientRoutines([routine])[0]);
 assert.deepEqual(Object.values(restored.sequence.taskActivities),ids);
});

test("Custom remains available after expanding the grouped activity catalog",()=>{
 const custom=GROUPED_CLIENT_ACTIVITIES.filter(activity=>activity.id === "");
 assert.equal(custom.length,1);
 assert.equal(custom[0].label,"Custom");
});
