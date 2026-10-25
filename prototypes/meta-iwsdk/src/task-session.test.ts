import assert from 'node:assert/strict';
import test from 'node:test';
import type { Task } from '../../../src/shared/tasks.js';
import {
  COMPLETE_INPUT_GUARD_MS,
  PersonalTaskSession,
  type TaskStore,
} from './task-session.ts';

class MemoryStore implements TaskStore {
  saves: Task[][] = [];
  failSave = false;
  stored: Task[];

  constructor(stored: Task[] = []) {
    this.stored = stored;
  }

  async load(): Promise<Task[]> {
    return this.stored.map((task) => ({ ...task }));
  }

  async save(tasks: Task[]): Promise<void> {
    if (this.failSave) throw new Error('Save failed for test.');
    this.stored = tasks.map((task) => ({ ...task }));
    this.saves.push(this.stored);
  }
}

function task(id: string, completed = false): Task {
  return { id, text: `Task ${id}`, completed, createdAt: 1 };
}

test('adds with the shared schema and restores the same list', async () => {
  const store = new MemoryStore();
  const session = new PersonalTaskSession(store, () => 10, () => 'task-id');

  assert.equal(await session.load(), true);
  assert.equal(await session.add('  Write outline  '), true);
  assert.deepEqual(store.stored, [
    { id: 'task-id', text: 'Write outline', completed: false, createdAt: 10 },
  ]);

  const reopened = new PersonalTaskSession(store);
  assert.equal(await reopened.load(), true);
  assert.equal(reopened.activeTask?.id, 'task-id');
});

test('adds consecutive tasks in order and confirms the queued second task', async () => {
  const store = new MemoryStore();
  const ids = ['task-1', 'task-2'];
  const session = new PersonalTaskSession(
    store,
    () => 10,
    () => ids.shift() ?? 'unexpected',
  );

  assert.equal(await session.load(), true);
  assert.equal(await session.add('First task'), true);
  assert.equal(session.message, 'Saved: task is NOW.');
  assert.equal(session.activeTask?.id, 'task-1');
  assert.equal(session.waitingTaskCount, 0);
  assert.equal(await session.add('Second task'), true);

  assert.deepEqual(session.tasks, [
    { id: 'task-1', text: 'First task', completed: false, createdAt: 10 },
    { id: 'task-2', text: 'Second task', completed: false, createdAt: 10 },
  ]);
  assert.equal(session.message, 'Saved: added to waiting.');
  assert.equal(session.activeTask?.id, 'task-1');
  assert.equal(session.waitingTaskCount, 1);
  assert.deepEqual(store.saves[store.saves.length - 1], session.tasks);
});

test('saves before advancing and ignores a duplicate completion input', async () => {
  let releaseSave!: () => void;
  const store = new MemoryStore([task('a'), task('b')]);
  store.save = async (tasks) => {
    await new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    store.stored = tasks.map((item) => ({ ...item }));
  };
  const session = new PersonalTaskSession(store);
  await session.load();
  assert.equal(session.waitingTaskCount, 1);

  const first = session.completeActive(1_000);
  assert.equal(session.activeTask?.id, 'a');
  assert.equal(await session.completeActive(1_001), false);
  releaseSave();
  assert.equal(await first, true);
  assert.equal(session.activeTask?.id, 'b');
  assert.equal(session.waitingTaskCount, 0);
  assert.equal(
    await session.completeActive(1_000 + COMPLETE_INPUT_GUARD_MS - 1),
    false,
  );
  assert.equal(session.activeTask?.id, 'b');
});

test('a failed save keeps the displayed task and allows a retry', async () => {
  const store = new MemoryStore([task('a'), task('b')]);
  const session = new PersonalTaskSession(store);
  await session.load();
  store.failSave = true;

  assert.equal(await session.completeActive(1_000), false);
  assert.equal(session.activeTask?.id, 'a');
  assert.match(session.message, /Save failed/);

  store.failSave = false;
  assert.equal(await session.completeActive(1_001), true);
  assert.equal(session.activeTask?.id, 'b');
});

test('new list carries only unfinished tasks after storage succeeds', async () => {
  let releaseSave!: () => void;
  const original = [task('done', true), task('carry-a'), task('carry-b')];
  const store = new MemoryStore(original);
  store.save = async (tasks) => {
    await new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    store.stored = tasks.map((item) => ({ ...item }));
  };
  const session = new PersonalTaskSession(store);
  await session.load();

  const pending = session.startNewList(true);
  assert.deepEqual(session.tasks, original);
  assert.equal(session.phase, 'saving');
  releaseSave();

  assert.equal(await pending, true);
  assert.deepEqual(session.tasks, [task('carry-a'), task('carry-b')]);
  assert.equal(session.completedCount, 0);
  assert.equal(session.activeTask?.id, 'carry-a');
  assert.equal(session.waitingTaskCount, 1);
  assert.equal(session.message, 'Saved: new list has 2 carried tasks.');
});

test('new list can start empty and removes completed tasks', async () => {
  const store = new MemoryStore([task('unfinished'), task('done', true)]);
  const session = new PersonalTaskSession(store);
  await session.load();

  assert.equal(await session.startNewList(false), true);
  assert.deepEqual(session.tasks, []);
  assert.deepEqual(store.stored, []);
  assert.equal(session.completedCount, 0);
  assert.equal(session.waitingTaskCount, 0);
  assert.equal(session.message, 'Saved: new list is empty.');
});

test('failed new-list storage preserves the current list and progress', async () => {
  const original = [task('done', true), task('keep')];
  const store = new MemoryStore(original);
  const session = new PersonalTaskSession(store);
  await session.load();
  store.failSave = true;

  assert.equal(await session.startNewList(false), false);
  assert.deepEqual(session.tasks, original);
  assert.equal(session.completedCount, 1);
  assert.equal(session.activeTask?.id, 'keep');
  assert.match(session.message, /Save failed/);
});

test('a load failure exposes a retryable error state', async () => {
  const store: TaskStore = {
    load: async () => {
      throw new Error('Load failed for test.');
    },
    save: async () => undefined,
  };
  const session = new PersonalTaskSession(store);

  assert.equal(await session.load(), false);
  assert.equal(session.phase, 'load-error');
  assert.match(session.message, /Load failed/);
});

test('hand-keyboard: whitespace or empty submit is rejected without saving', async () => {
  const store = new MemoryStore();
  const session = new PersonalTaskSession(store, () => 10, () => 'id-1');
  await session.load();
  assert.equal(await session.add('   '), false);
  assert.equal(session.message, 'Type a task, then press Enter or choose Done.');
  assert.equal(store.saves.length, 0);
  assert.equal(await session.add(''), false);
  assert.equal(store.saves.length, 0);
});

test('hand-keyboard: failed Add keeps tasks and allows retry with same text', async () => {
  const store = new MemoryStore();
  const session = new PersonalTaskSession(store, () => 10, () => 'retry-id');
  await session.load();
  await session.add('First');
  assert.equal(session.tasks.length, 1);
  store.failSave = true;
  assert.equal(await session.add('Second'), false);
  assert.match(session.message, /Save failed|could not save/);
  assert.equal(session.tasks.length, 1);
  assert.equal(session.phase, 'ready');
  store.failSave = false;
  assert.equal(await session.add('Second'), true);
  assert.equal(session.tasks.length, 2);
  assert.equal(session.tasks[1].text, 'Second');
  assert.equal(session.message, 'Saved: added to waiting.');
});

test('hand-keyboard: duplicate Add while saving is ignored and does not create duplicate', async () => {
  let release!: () => void;
  const store = new MemoryStore();
  store.save = async (tasks) => {
    await new Promise<void>((r) => { release = r; });
    store.stored = tasks.map((t) => ({ ...t }));
    store.saves.push(store.stored);
  };
  const ids = ['dup-1', 'dup-2'];
  const session = new PersonalTaskSession(store, () => 10, () => ids.shift() ?? 'x');
  await session.load();
  const first = session.add('Task A');
  assert.equal(session.phase, 'saving');
  // Duplicate submit while saving — should be rejected without new save
  assert.equal(await session.add('Task A'), false);
  assert.equal(store.saves.length, 0);
  release();
  assert.equal(await first, true);
  assert.equal(session.tasks.length, 1);
  assert.equal(session.tasks[0].id, 'dup-1');
});

test('a stale companion completion refreshes the latest list without checking a different task',async()=>{
  const store=new MemoryStore([task('a')]);const session=new PersonalTaskSession(store);
  await session.load();store.stored=[task('a'),task('b')];
  store.save=async()=>{const error=new Error('The list changed in another window. Review it and try again.');error.name='TaskConflictError';throw error;};
  assert.equal(await session.completeActive(1000),false);
  assert.deepEqual(session.tasks,store.stored);assert.equal(session.activeTask?.id,'a');
  assert.equal(session.phase,'ready');assert.match(session.message,/another window/);
});

test('full list can complete a chosen later task without advancing an earlier task', async () => {
  const store = new MemoryStore([task('a'), task('b'), task('c')]);
  const session = new PersonalTaskSession(store);
  await session.load();
  assert.equal(await session.completeTask('c', 1000), true);
  assert.equal(session.activeTask?.id, 'a');
  assert.deepEqual(session.tasks.map(t => t.completed), [false, false, true]);
  assert.equal(await session.completeTask('missing', 2000), false);
  assert.equal(await session.completeTask('c', 2000), false);
});

test('reset saves first, preserves task identity/order, and never clears tasks on failure', async () => {
  const original = [task('a', true), task('b')];
  const store = new MemoryStore(original);
  const session = new PersonalTaskSession(store);
  await session.load();
  store.failSave = true;
  assert.equal(await session.reset(), false);
  assert.deepEqual(session.tasks, original);
  store.failSave = false;
  assert.equal(await session.reset(), true);
  assert.deepEqual(session.tasks, [task('a'), task('b')]);
  assert.equal(session.message, 'List reset.');
});
