import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AnchorRecovery, ANCHOR_KEY, DEFAULT_SPATIAL, SPATIAL_KEY,
  readSpatial, saveSpatial, ProgressTween, taskRatio, type SpatialAnchor } from './spatial-state.ts';

function storage() {
  const data = new Map<string,string>();
  return { data, getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); } };
}
function anchor() {
  let deleted = false;
  return { delete: () => { deleted = true; }, requestPersistentHandle: async () => 'saved-room',
    get deleted() { return deleted; } };
}

test('spatial preferences are versioned and never touch task storage', () => {
  const store = storage();
  assert.deepEqual(readSpatial(store), DEFAULT_SPATIAL);
  const next = {...DEFAULT_SPATIAL, scale: 1.5 as const, theme: 'zen' as const, placement: 'room' as const};
  saveSpatial(store, next);
  assert.deepEqual(readSpatial(store), next);
  assert.deepEqual([...store.data.keys()], [SPATIAL_KEY]);
});
test('corrupt or unsupported appearance is retained rather than silently replaced', () => {
  const store = storage();
  for (const raw of ['bad', 'null', '{"version":2}', JSON.stringify({...DEFAULT_SPATIAL,scale:100})]) {
    store.data.set(SPATIAL_KEY, raw);
    assert.throws(() => readSpatial(store));
    assert.equal(store.data.get(SPATIAL_KEY), raw);
  }
});
test('failed preference writes preserve last saved settings', () => {
  const store = storage();
  saveSpatial(store, DEFAULT_SPATIAL);
  assert.throws(() => saveSpatial({...store, setItem: () => { throw Error('full'); }}, {...DEFAULT_SPATIAL,theme:'zen'}));
  assert.deepEqual(readSpatial(store), DEFAULT_SPATIAL);
});
test('empty lists have no finale and ratios include the exact task count', () => {
  assert.equal(taskRatio([]), 0);
  assert.equal(taskRatio([{completed:true},{completed:false},{completed:false}]), 1/3);
});
test('progress tween clamps suspension deltas and restore snaps without replay', () => {
  const tween = new ProgressTween();
  tween.set(1, true);
  assert.ok(tween.tick(3600) < 0.05);
  for(let i=0;i<25;i++) tween.tick(1/30);
  assert.equal(tween.value, 1);
  tween.set(0.4, false);
  assert.equal(tween.value, 0.4);
  tween.set(0, true);
  assert.ok(tween.tick(1/30) < 0.4);
});
test('anchor creation persists only a same-device handle', async () => {
  const store = storage(); const a = anchor(); const recovery = new AnchorRecovery(store);
  recovery.begin({});
  await recovery.restoreOrCreate(async () => a);
  assert.equal(recovery.anchor, a);
  assert.equal(store.data.get(ANCHOR_KEY), 'saved-room');
  assert.deepEqual([...store.data.keys()], [ANCHOR_KEY]);
});
test('saved anchor restores without creating another anchor', async () => {
  const store = storage(); store.data.set(ANCHOR_KEY, 'old'); const a = anchor();
  const recovery = new AnchorRecovery(store);
  recovery.begin({restorePersistentAnchor: async handle => { assert.equal(handle,'old'); return a; }});
  await recovery.restoreOrCreate(async () => { throw Error('must not create'); });
  assert.equal(recovery.anchor,a);
});
test('failed restoration creates only on a fresh frame, not a stale captured frame', async () => {
  const store = storage(); store.data.set(ANCHOR_KEY, 'gone'); const recovery = new AnchorRecovery(store);
  recovery.begin({restorePersistentAnchor: async () => { throw Error('gone'); }});
  await recovery.restoreOrCreate(async () => { throw Error('stale frame used'); });
  assert.equal(recovery.anchor, null);
  const a = anchor();
  await recovery.restoreOrCreate(async () => a);
  assert.equal(recovery.anchor, a);
});
test('unsupported anchors fall back once and leave tasks untouched', async () => {
  const store = storage(); store.data.set('cuedone.vr.personal.tasks.v1','saved tasks');
  const recovery = new AnchorRecovery(store); recovery.begin({});
  await recovery.restoreOrCreate();
  assert.match(recovery.status,/unavailable/);
  await recovery.restoreOrCreate(async () => { throw Error('should not retry per frame'); });
  assert.equal(store.data.get('cuedone.vr.personal.tasks.v1'),'saved tasks');
});
test('session ending cancels pending restoration and discards its late anchor', async () => {
  const store = storage(); store.data.set(ANCHOR_KEY, 'old'); const recovery = new AnchorRecovery(store);
  let resolve!: (a: SpatialAnchor) => void;
  recovery.begin({restorePersistentAnchor: () => new Promise(r => { resolve = r; })});
  const pending = recovery.restoreOrCreate(); recovery.end();
  const a = anchor(); resolve(a); await pending;
  assert.equal(recovery.anchor,null); assert.equal(a.deleted,true);
  assert.equal(store.data.get(ANCHOR_KEY),'old');
});
test('late persistent handle from an ended session cannot overwrite recovery state', async () => {
  const store = storage(); const recovery = new AnchorRecovery(store);
  let resolve!: (handle: string) => void;
  const a = {delete() {}, requestPersistentHandle: () => new Promise<string>(r => {resolve=r;})};
  recovery.begin({}); const pending = recovery.restoreOrCreate(async () => a);
  await Promise.resolve(); recovery.end(); resolve('late'); await pending;
  assert.equal(store.data.has(ANCHOR_KEY),false);
});
test('anchor storage failure leaves an active session anchor usable', async () => {
  const store = storage(); const recovery = new AnchorRecovery({...store,setItem: () => {throw Error('full');}});
  const a = anchor(); recovery.begin({}); await recovery.restoreOrCreate(async () => a);
  assert.equal(recovery.anchor,a); assert.match(recovery.status,/could not save/);
});
test('recenter skips old restoration and saves a fresh room anchor', async () => {
  const store = storage(); store.data.set(ANCHOR_KEY,'old'); const recovery = new AnchorRecovery(store);
  recovery.begin({restorePersistentAnchor: async () => {throw Error('must not restore');}},false);
  const a = anchor(); await recovery.restoreOrCreate(async () => a);
  assert.equal(recovery.anchor,a); assert.equal(store.data.get(ANCHOR_KEY),'saved-room');
});

test('legacy spatial preferences gain only a silent Garden sound default',()=>{
  const store=storage();const {zenSound,...legacy}=DEFAULT_SPATIAL;
  store.data.set(SPATIAL_KEY,JSON.stringify(legacy));
  assert.equal(readSpatial(store).zenSound,false);
  assert.equal(store.data.get(SPATIAL_KEY),JSON.stringify(legacy));
});

test('legacy controller-relative placement becomes hand-relative without rewriting saved data',()=>{
  const store=storage();const raw=JSON.stringify({...DEFAULT_SPATIAL,placement:'controller'});
  store.data.set(SPATIAL_KEY,raw);assert.equal(readSpatial(store).placement,'hand');
  assert.equal(store.data.get(SPATIAL_KEY),raw);
});

test('legacy Constellation choice resolves to permanent Zen without rewriting storage or losing preferences', () => {
  const store = storage();
  const legacy = {...DEFAULT_SPATIAL,theme:'constellation',scale:1.5,zenSound:true,placement:'room'};
  const raw = JSON.stringify(legacy);
  store.data.set(SPATIAL_KEY,raw);
  assert.deepEqual(readSpatial(store), {...legacy,theme:'zen'});
  assert.equal(store.data.get(SPATIAL_KEY),raw);
});
