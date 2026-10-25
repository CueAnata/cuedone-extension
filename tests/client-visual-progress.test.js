import test from "node:test";
import assert from "node:assert/strict";
import {normalizeClientVisualProgress,clientVisualSettings,clientVisualForList,clientCompletionStyle,CLIENT_VISUAL_PROGRESS_KEY} from "../src/shared/client-visual-progress.js";
import {RANDOM_VISUAL_THEME_VALUES} from "../src/shared/random-visual-theme.js";
import {loadClientVisualProgress,saveClientVisualProgress,saveList,loadList,TASKS_STORAGE_KEY,PUBLIC_TASKS_STORAGE_KEY} from "../src/shared/task-store.js";
import {captureClientRoutine} from "../src/shared/client-routines.js";
const tasks=[{id:"a",text:"One",completed:false,createdAt:1},{id:"b",text:"Two",completed:false,createdAt:2}];
function storage(initial={}) {const data=structuredClone(initial);let fail=false;globalThis.chrome={storage:{local:{async get(key){return {[key]:structuredClone(data[key])};},async set(values){if(fail)throw Error("Rejected");Object.assign(data,structuredClone(values));}}}};return {data,reject(value){fail=value;}};}
test("Client visuals default Off/Random and save separately from Personal with false preserved",async()=>{
 const fake=storage({'cuedone.personalVisualTheme':'coffee','cuedone.personalRandomTheme.v1':{active:'plant'}});
 assert.equal((await loadClientVisualProgress()).enabled,false);
 assert.equal((await loadClientVisualProgress()).theme,'random');
 for(const enabled of [true,false]) {
  await saveClientVisualProgress(clientVisualSettings({}, {enabled,theme:'battery'}));
  assert.equal((await loadClientVisualProgress()).enabled,enabled);
 }
 assert.equal(fake.data['cuedone.personalVisualTheme'],'coffee');
 assert.deepEqual(fake.data['cuedone.personalRandomTheme.v1'],{active:'plant'});
 fake.reject(true);await assert.rejects(saveClientVisualProgress({enabled:true,theme:'coffee'}));
 assert.equal(fake.data[CLIENT_VISUAL_PROGRESS_KEY].theme,'battery');
});
test("Client Random keeps the list's theme through checks, ordinary unchecks and reload; new completed lists exhaust the bag",()=>{
 let state=clientVisualSettings({}, {enabled:true});const chosen=[];let previous=[];
 for(let i=0;i<RANDOM_VISUAL_THEME_VALUES.length;i++) {
  const list=tasks.map(t=>({...t,id:t.id+i}));
  state=clientVisualForList(state,previous,list,()=>.4);chosen.push(state.randomState.active);
  const done=list.map(t=>({...t,completed:true}));
  const after=clientVisualForList(state,list,done,()=>.4);
  assert.equal(after.randomState.active,state.randomState.active);
  assert.deepEqual(clientVisualForList(after,done,list,()=>.4),after);
  assert.equal(normalizeClientVisualProgress(JSON.parse(JSON.stringify(after))).randomState.active,after.randomState.active);
  state=clientVisualForList(after,done,[],()=>.4);previous=[];
 }
 assert.equal(new Set(chosen).size,RANDOM_VISUAL_THEME_VALUES.length);
});
test("Private task saves persist Client random lifecycle atomically; Public never touches it",async()=>{
 const model=clientVisualSettings({}, {enabled:true});
 const fake=storage({[TASKS_STORAGE_KEY]:tasks,[CLIENT_VISUAL_PROGRESS_KEY]:model});
 const done=tasks.map(t=>({...t,completed:true}));await saveList('private',done);
 const before=fake.data[CLIENT_VISUAL_PROGRESS_KEY].randomState.active;
 await saveList('private',[]);await saveList('private',[{...tasks[0],id:'next'}]);
 assert.notEqual(fake.data[CLIENT_VISUAL_PROGRESS_KEY].randomState.active,before);
 const saved=structuredClone(fake.data[CLIENT_VISUAL_PROGRESS_KEY]);await saveList('public',tasks);
 assert.deepEqual(fake.data[CLIENT_VISUAL_PROGRESS_KEY],saved);
 assert.deepEqual(await loadList('public'),tasks);
 fake.reject(true);await assert.rejects(saveList('private',[]));
 assert.deepEqual(fake.data[CLIENT_VISUAL_PROGRESS_KEY],saved);
});
test("visual progress makes sound independent of saved Simple style; routines contain no visual settings",()=>{
 assert.equal(clientCompletionStyle('simple',true),'celebrate');
 assert.equal(clientCompletionStyle('simple',false),'simple');
 assert.equal(clientCompletionStyle('celebrate',false),'celebrate');
 const routine=captureClientRoutine('Tasks',tasks,{enabled:false});
 assert.equal(Object.hasOwn(routine,'visualProgress'),false);
 assert.equal(Object.hasOwn(routine.sequence,'randomState'),false);
});

test("progression permits one selected completion sound while Off restores saved Simple silence", async()=>{
 const {planFromCheckboxCompletion}=await import('../src/shared/client-view.js');
 const before=[{...tasks[0],completed:true},tasks[1]];
 for(const progress of [true,false]) {
  for(const sound of ['on','off']) {
   const {plan}=planFromCheckboxCompletion({snapshot:before,liveTasks:before,id:'b',completed:true,presentation:'client',style:clientCompletionStyle('simple',progress),sound});
   assert.equal(plan.kind,progress ? 'final' : null);
   assert.equal(plan.playSound,progress && sound==='on');
  }
 }
});

test("explicit Reset refreshes both Random themes atomically without changing task identities", async () => {
 const {PERSONAL_RANDOM_THEME_KEY,PERSONAL_VISUAL_THEME_KEY}=await import('../src/shared/preferences.js');
 const {createVisualThemeSelection}=await import('../src/shared/random-visual-theme.js');
 const selection=createVisualThemeSelection(()=>0);selection.resolve('random');
 const personal=selection.snapshot();
 const client=clientVisualSettings({}, {enabled:true});
 const done=tasks.map(task=>({...task,completed:true}));
 const fake=storage({[TASKS_STORAGE_KEY]:done,[PERSONAL_VISUAL_THEME_KEY]:'random',
  [PERSONAL_RANDOM_THEME_KEY]:personal,[CLIENT_VISUAL_PROGRESS_KEY]:client});
 const original=structuredClone(fake.data);
 fake.reject(true);
 await assert.rejects(saveList('private',tasks,{clearEnding:true,resetVisualProgress:true}));
 assert.deepEqual(fake.data,original);
 fake.reject(false);
 await saveList('private',tasks,{clearEnding:true,resetVisualProgress:true});
 assert.deepEqual(fake.data[TASKS_STORAGE_KEY],tasks);
 assert.notEqual(fake.data[PERSONAL_RANDOM_THEME_KEY].active,personal.active);
 assert.notEqual(fake.data[CLIENT_VISUAL_PROGRESS_KEY].randomState.active,client.randomState.active);
 assert.equal(fake.data[PERSONAL_RANDOM_THEME_KEY].bag.length,personal.bag.length-1);
 const refreshed=structuredClone(fake.data);
 await saveList('private',tasks);
 assert.deepEqual(fake.data,refreshed);
 await saveList('public',tasks,{resetVisualProgress:true});
 assert.deepEqual(fake.data[PERSONAL_RANDOM_THEME_KEY],refreshed[PERSONAL_RANDOM_THEME_KEY]);
 assert.deepEqual(fake.data[CLIENT_VISUAL_PROGRESS_KEY],refreshed[CLIENT_VISUAL_PROGRESS_KEY]);
});

test("explicit Reset preserves fixed themes and disabled Client visuals",()=>{
 for(const settings of [{enabled:true,theme:'coffee'},{enabled:false,theme:'random'}]) {
  const state=clientVisualSettings({},settings);
  assert.deepEqual(clientVisualForList(state,tasks,tasks,()=>0,{reset:true}),state);
 }
});
