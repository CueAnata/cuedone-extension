import test from "node:test";
import assert from "node:assert/strict";
import { normalizeClientSequence, reconcileClientSequence, assignClientSequencePart, clientSequenceState } from "../src/shared/client-sequence.js";
import { createTask, toggleTask, reorderTasks, deleteTask } from "../src/shared/tasks.js";
import { newListFromCarryover } from "../src/shared/list-lifecycle.js";
import { CLIENT_SEQUENCE_KEY, TASKS_STORAGE_KEY, PUBLIC_TASKS_STORAGE_KEY, loadClientSequence, saveClientSequence, saveList, loadList, onClientSequenceChanged } from "../src/shared/task-store.js";

const tasks = count => Array.from({length:count},(_,index)=>createTask(`Task ${index+1}`,index,String(index)));
const model = (list, parts=4) => reconcileClientSequence({enabled:true,partCount:parts},list);

test("sequence defaults Off and empty lists never have an active part or completion", () => {
  assert.deepEqual(normalizeClientSequence(),{version:1,enabled:false,partCount:2,assignments:{},activities:{},taskActivities:{},fullListLayout:"custom"});
  for (const count of [2,3,4]) {
    const state=clientSequenceState(model([],count),[]);
    assert.equal(state.groups.length,count);
    assert.equal(state.activeIndex,null);
    assert.equal(state.complete,false);
    assert.ok(state.groups.every(group=>!group.complete));
  }
});

test("one task can occupy any part; empty parts are skipped", () => {
  const list=tasks(1);
  const settings=assignClientSequencePart(model(list),"0",3);
  let state=clientSequenceState(settings,list);
  assert.equal(state.activeIndex,3);
  assert.deepEqual(state.groups.map(group=>group.label),["First","Then","Next","Last"]);
  state=clientSequenceState(settings,toggleTask(list,"0"));
  assert.equal(state.complete,true);
  assert.equal(state.activeIndex,null);
  assert.equal(state.groups[3].complete,true);
});

test("arbitrary uneven groups advance only after every task in the active part completes", () => {
  let list=tasks(9);
  let settings=model(list);
  for (const task of list.slice(3,4)) settings=assignClientSequencePart(settings,task.id,1);
  for (const task of list.slice(4)) settings=assignClientSequencePart(settings,task.id,3);
  assert.deepEqual(clientSequenceState(settings,list).groups.map(group=>group.tasks.length),[3,1,0,5]);
  for (const id of ["0","1"]) {
    list=toggleTask(list,id);
    assert.equal(clientSequenceState(settings,list).activeIndex,0);
  }
  list=toggleTask(list,"2");
  assert.equal(clientSequenceState(settings,list).activeIndex,1);
  list=toggleTask(list,"3");
  assert.equal(clientSequenceState(settings,list).activeIndex,3);
  for (const id of ["4","5","6","7","8"]) list=toggleTask(list,id);
  assert.equal(clientSequenceState(settings,list).complete,true);
  list=toggleTask(list,"1");
  assert.equal(clientSequenceState(settings,list).activeIndex,0);
});

test("assignments survive disabling, reducing parts, edits, reorder, delete, and carryover", () => {
  let list=tasks(6);
  let settings=assignClientSequencePart(model(list),"0",3);
  settings=assignClientSequencePart(settings,"2",1);
  const original=structuredClone(list);
  const reduced=normalizeClientSequence({...settings,partCount:2});
  assert.equal(clientSequenceState(reduced,list).groups[1].tasks.some(task=>task.id==="0"),true);
  assert.equal(reduced.assignments["0"],3);
  const restored=normalizeClientSequence({...reduced,enabled:false,partCount:4});
  assert.equal(restored.assignments["0"],3);
  list=list.map(task=>task.id==="0"?{...task,text:"Edited task"}:task);
  list=reorderTasks(list,0,5);
  list=toggleTask(list,"2");
  settings=reconcileClientSequence(settings,list);
  assert.equal(settings.assignments["0"],3);
  assert.equal(clientSequenceState(settings,list).groups[3].tasks[0].text,"Edited task");
  list=deleteTask(list,"1");
  settings=reconcileClientSequence(settings,list);
  assert.equal(Object.hasOwn(settings.assignments,"1"),false);
  list=newListFromCarryover(list,list.filter(task=>!task.completed).map(task=>task.id));
  settings=reconcileClientSequence(settings,list);
  assert.equal(Object.hasOwn(settings.assignments,"2"),false);
  assert.equal(settings.assignments["0"],3);
  assert.deepEqual(original,tasks(6));
});

function mockStorage(initial) {
  const store=structuredClone(initial);const listeners=new Set();let fail=false;
  globalThis.chrome={storage:{local:{async get(key){return {[key]:structuredClone(store[key])}},async set(values){
    if(fail)throw Error("Rejected synthetic write");
    const changes=Object.fromEntries(Object.entries(values).map(([key,value])=>[key,{oldValue:store[key],newValue:structuredClone(value)}]));
    Object.assign(store,structuredClone(values));for(const listener of listeners)listener(changes,"local");
  }},onChanged:{addListener(fn){listeners.add(fn)},removeListener(fn){listeners.delete(fn)}}}};
  return {store,reject(value){fail=value}};
}

test("saved-list reload retains config and per-task assignments without migrating old lists", async () => {
  const list=tasks(7);const fake=mockStorage({[TASKS_STORAGE_KEY]:list});
  const original=structuredClone(list);
  assert.equal((await loadClientSequence()).enabled,false);
  assert.equal(Object.hasOwn(fake.store,CLIENT_SEQUENCE_KEY),false);
  let settings=assignClientSequencePart(model(list,3),"6",2);
  const observed=[];const unsubscribe=onClientSequenceChanged(value=>observed.push(value));
  await saveClientSequence(settings);
  assert.deepEqual(await loadList("private"),original);
  assert.deepEqual(await loadClientSequence(),settings);
  assert.equal(observed.length,1);
  // An independently loaded view uses the saved metadata and same underlying list.
  const reopened=clientSequenceState(await loadClientSequence(),await loadList("private"));
  assert.equal(reopened.groups[2].tasks[0].id,"6");
  const added=[...list,createTask("Added in Then",9,"added")];
  settings=reconcileClientSequence(settings,added,1);
  await saveList("private",added,{clientSequence:settings});
  assert.equal((await loadClientSequence()).assignments.added,1);
  await saveList("private",deleteTask(added,"6"));
  assert.equal(Object.hasOwn((await loadClientSequence()).assignments,"6"),false);
  const privateState=structuredClone(fake.store[CLIENT_SEQUENCE_KEY]);
  await saveList("public",[createTask("Public task",10,"public")]);
  assert.deepEqual(fake.store[CLIENT_SEQUENCE_KEY],privateState);
  assert.equal(fake.store[PUBLIC_TASKS_STORAGE_KEY][0].text,"Public task");
  unsubscribe();
});

test("failed metadata or task writes retain last saved assignments and tasks", async () => {
  const list=tasks(3);const settings=model(list);const fake=mockStorage({[TASKS_STORAGE_KEY]:list,[CLIENT_SEQUENCE_KEY]:settings});
  const saved=structuredClone(fake.store);fake.reject(true);
  await assert.rejects(saveClientSequence(assignClientSequencePart(settings,"0",2)));
  await assert.rejects(saveList("private",toggleTask(list,"0"),{clientSequence:assignClientSequencePart(settings,"0",1)}));
  assert.deepEqual(fake.store,saved);
});

test("large lists keep every task exactly once and future completion cannot bypass an unfinished part", () => {
  const list=tasks(103);
  const settings=model(list);
  for (let i=0;i<list.length;i++) settings.assignments[list[i].id]=i<1?0:i<21?1:i<96?2:3;
  const state=clientSequenceState(settings,list);
  assert.deepEqual(state.groups.map(group=>group.tasks.length),[1,20,75,7]);
  assert.equal(new Set(state.orderedTasks.map(task=>task.id)).size,103);
  assert.equal(state.orderedTasks.length,list.length);
  const futureComplete=list.map((task,index)=>({...task,completed:index>0}));
  assert.equal(clientSequenceState(settings,futureComplete).activeIndex,0);
  assert.equal(clientSequenceState(settings,futureComplete).complete,false);
});

test("part advancement is not a final-list completion event", async () => {
  const { isFinalCompletionTransition } = await import("../src/shared/client-view.js");
  const list=tasks(3);
  let settings=model(list,2);
  settings=assignClientSequencePart(settings,"2",1);
  const before=toggleTask(list,"0");
  const partFinished=toggleTask(before,"1");
  assert.equal(clientSequenceState(settings,partFinished).activeIndex,1);
  assert.equal(isFinalCompletionTransition(before,partFinished),false);
  assert.equal(isFinalCompletionTransition(partFinished,toggleTask(partFinished,"2")),true);
});

test("activity choices have visible labels and local pictograms for all requested activities", async () => {
  const { CLIENT_ACTIVITIES, clientActivityIconMarkup } = await import("../src/shared/client-activities.js");
  assert.deepEqual(CLIENT_ACTIVITIES.map(activity=>activity.label),[
    "Listening","Answering Questions","Story","Music","Work Activity","Movement","Sensory",
    "Play","Chat/Talk","Practice","Computer","Greetings","Goodbye","Reward",
  ]);
  for (const activity of CLIENT_ACTIVITIES) {
    const icon=clientActivityIconMarkup(activity.id);
    assert.match(icon,/<svg/);
    assert.match(icon,/aria-hidden="true"/);
    assert.doesNotMatch(icon,/https?:|<image/);
  }
});

test("activities are optional, preserve custom task data, and survive grouping changes and reload", async () => {
  const { assignClientPartActivity } = await import("../src/shared/client-sequence.js");
  const list=tasks(5);const original=structuredClone(list);
  let settings=model(list);
  assert.deepEqual(settings.activities,{});
  settings=assignClientPartActivity(settings,0,"listening");
  settings=assignClientPartActivity(settings,3,"reward");
  assert.equal(clientSequenceState(settings,list).groups[3].activity.label,"Reward");
  assert.deepEqual(list,original);
  const reduced=normalizeClientSequence({...settings,partCount:2});
  assert.equal(reduced.activities[3],"reward");
  const expanded=normalizeClientSequence({...reduced,partCount:4});
  assert.equal(expanded.activities[3],"reward");
  settings=assignClientPartActivity(settings,3,"music"); // Reward is never forced.
  assert.equal(settings.activities[3],"music");
  settings=assignClientPartActivity(settings,0,"");
  assert.equal(clientSequenceState(settings,list).groups[0].activity,null);
  assert.deepEqual(assignClientPartActivity(settings,0,"unrecognized"),settings);
  const fake=mockStorage({[TASKS_STORAGE_KEY]:list});
  await saveClientSequence(settings);
  assert.deepEqual((await loadClientSequence()).activities,{3:"music"});
  await saveList("private",toggleTask(list,"0"));
  assert.deepEqual((await loadClientSequence()).activities,{3:"music"});
  assert.deepEqual(fake.store[TASKS_STORAGE_KEY],toggleTask(list,"0"));
  await saveClientSequence({...settings,enabled:false});
  assert.deepEqual((await loadClientSequence()).activities,{3:"music"});
});

test("regular Client activities preserve custom text, checks, saved choices, and reconciliation", async () => {
  const { assignClientTaskActivity } = await import("../src/shared/client-sequence.js");
  const list = tasks(3); list[1].completed = true;
  const snapshot = structuredClone(list);
  let state = assignClientTaskActivity(normalizeClientSequence(), list[1].id, "computer");
  state = reconcileClientSequence(JSON.parse(JSON.stringify(state)), list);
  assert.equal(state.enabled, false);
  assert.equal(state.taskActivities[list[1].id], "computer");
  assert.deepEqual(list, snapshot);
  assert.equal(reconcileClientSequence(state, [...list].reverse()).taskActivities[list[1].id], "computer");
  assert.deepEqual(reconcileClientSequence(state, [list[0]]).taskActivities, {});
  assert.deepEqual(assignClientTaskActivity(state, list[1].id, "").taskActivities, {});
  assert.equal(normalizeClientSequence({activities:{0:"game-time",1:"free-choice"}}).activities[0], "game-time");
});

test("activity task creation uses normal task completion and sequence advancement", async () => {
  const { addTask } = await import("../src/shared/tasks.js");
  const { assignClientPartActivity } = await import("../src/shared/client-sequence.js");
  const { clientActivity } = await import("../src/shared/client-activities.js");
  let state = assignClientPartActivity({ enabled:true, partCount:2 }, 0, "greetings");
  state = assignClientPartActivity(state, 1, "reward");
  let list = addTask([], clientActivity(state.activities[0]).label);
  state = reconcileClientSequence(state, list, 0);
  list = addTask(list, clientActivity(state.activities[1]).label);
  state = reconcileClientSequence(state, list, 1);
  assert.deepEqual(list.map(task=>task.text), ["Greetings", "Reward"]);
  assert.equal(clientSequenceState(state,list).activeIndex,0);
  list = toggleTask(list,list[0].id);
  assert.equal(clientSequenceState(state,list).activeIndex,1);
  assert.equal(clientSequenceState(state,list).complete,false);
  list = toggleTask(list,list[1].id);
  assert.equal(clientSequenceState(state,list).complete,true);
});

test("Clear All saves empty tasks and cleared Client activities atomically, preserving mode", async () => {
  const list=tasks(2);
  const settings=normalizeClientSequence({enabled:true,partCount:4,activities:{0:"greetings",3:"reward"},taskActivities:{0:"computer"},assignments:{0:0,1:3}});
  const fake=mockStorage({[TASKS_STORAGE_KEY]:list,[CLIENT_SEQUENCE_KEY]:settings});
  const cleared=normalizeClientSequence({...settings,assignments:{},activities:{},taskActivities:{},fullListLayout:"custom"});
  fake.reject(true);
  await assert.rejects(saveList("private",[],{clientSequence:cleared}));
  assert.deepEqual(fake.store[TASKS_STORAGE_KEY],list);
  assert.deepEqual(fake.store[CLIENT_SEQUENCE_KEY],settings);
  fake.reject(false);
  await saveList("private",[],{clientSequence:cleared});
  assert.deepEqual(await loadList("private"),[]);
  assert.deepEqual(await loadClientSequence(),cleared);
});

test("Client full-list layout persists independently without changing sequence assignments or task data", async () => {
  const list=tasks(5);list[1].completed=true;
  mockStorage({[TASKS_STORAGE_KEY]:list});
  let state=reconcileClientSequence({enabled:true,partCount:3,assignments:{0:2},activities:{2:"reward"},taskActivities:{1:"computer"}},list);
  for(const fullListLayout of ["custom","activities"]) {
    state={...state,enabled:false,fullListLayout};
    await saveClientSequence(state);
    const saved=await loadClientSequence();
    assert.equal(saved.fullListLayout,fullListLayout);
    assert.equal(saved.assignments[0],2);
    assert.equal(saved.taskActivities[1],"computer");
    assert.deepEqual(await loadList("private"),list);
  }
  await saveClientSequence({...state,enabled:true});
  assert.equal((await loadClientSequence()).partCount,3);
});
