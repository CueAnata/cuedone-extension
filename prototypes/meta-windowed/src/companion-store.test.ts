import assert from 'node:assert/strict';
import test from 'node:test';
import {
  TASK_STORE_KEY,
  TASK_STORE_VERSION,
  WindowedTaskStore,
  type TaskStorage,
} from './companion-store.ts';

class MemoryStorage implements TaskStorage {
  values = new Map<string, string>();
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

test('uses only the windowed storage key and restores a versioned envelope', async () => {
  const storage = new MemoryStorage();
  const store = new WindowedTaskStore(storage);
  const tasks = [{ id: 'a', text: 'Task A', completed: false, createdAt: 1 }];

  await store.save(tasks);
  assert.equal(storage.values.has(TASK_STORE_KEY), true);
  assert.equal(storage.values.has('cuedone.vr.personal.tasks.v1'), false);
  assert.deepEqual(JSON.parse(storage.values.get(TASK_STORE_KEY) ?? ''), {
    version: TASK_STORE_VERSION,
    tasks,
  });
  assert.deepEqual(await store.load(), tasks);
});

test('reports read, write, and invalid-data failures without inventing tasks', async () => {
  const storage = new MemoryStorage();
  const store = new WindowedTaskStore(storage);

  storage.failWrite = true;
  await assert.rejects(store.save([]), /could not save/);
  storage.failWrite = false;
  storage.values.set(TASK_STORE_KEY, '{bad json');
  await assert.rejects(store.load(), /could not restore/);
  storage.failRead = true;
  await assert.rejects(store.load(), /could not read/);
});
