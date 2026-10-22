import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LocalTaskStore,
  TASK_STORE_KEY,
  TASK_STORE_VERSION,
  type TaskStorage,
} from './task-store.ts';

class MemoryStorage implements TaskStorage {
  readonly values = new Map<string, string>();
  failRead = false;
  failWrite = false;

  getItem(key: string): string | null {
    if (this.failRead) throw new Error('read failed');
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrite) throw new Error('write failed');
    this.values.set(key, value);
  }
}

test('uses an isolated, versioned local-storage envelope', async () => {
  const storage = new MemoryStorage();
  const store = new LocalTaskStore(storage);
  const tasks = [
    { id: 'a', text: 'First', completed: false, createdAt: 1 },
  ];

  await store.save(tasks);

  assert.deepEqual(JSON.parse(storage.values.get(TASK_STORE_KEY)!), {
    version: TASK_STORE_VERSION,
    tasks,
  });
  assert.deepEqual(await store.load(), tasks);
});

test('reports corrupt, unavailable, and failed storage without replacing data', async () => {
  const storage = new MemoryStorage();
  const store = new LocalTaskStore(storage);
  storage.values.set(TASK_STORE_KEY, '{not-json');

  await assert.rejects(store.load(), /could not restore/);
  assert.equal(storage.values.get(TASK_STORE_KEY), '{not-json');

  storage.failRead = true;
  await assert.rejects(store.load(), /could not read/);
  storage.failRead = false;
  storage.failWrite = true;
  await assert.rejects(store.save([]), /could not save/);
});

test('stale companion writes cannot replace a newer list',async()=>{
  const storage=new MemoryStorage();const store=new LocalTaskStore(storage);
  const first=[{id:'a',text:'First',completed:false,createdAt:1}];
  const newer=[...first,{id:'b',text:'Second',completed:false,createdAt:2}];
  await store.save(first);await store.save(newer,first);
  await assert.rejects(store.save([{...first[0],completed:true}],first),/another window/);
  assert.deepEqual(await store.load(),newer);
});
test('companion writes fail safely rather than overwriting corrupt stored tasks',async()=>{
  const storage=new MemoryStorage();const store=new LocalTaskStore(storage);
  storage.values.set(TASK_STORE_KEY,'corrupt');
  await assert.rejects(store.save([],[]),/could not restore/);
  assert.equal(storage.values.get(TASK_STORE_KEY),'corrupt');
});
