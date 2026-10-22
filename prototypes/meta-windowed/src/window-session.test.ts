import assert from 'node:assert/strict';
import test from 'node:test';
import type { Task } from '../../../src/shared/tasks.js';
import {
  COMPLETE_INPUT_GUARD_MS,
  type TaskStore,
  WindowedTaskSession,
} from './window-session.ts';

class MemoryStore implements TaskStore {
  stored: Task[];
  saves: Task[][] = [];
  failLoad = false;
  failSave = false;

  constructor(tasks: Task[] = []) {
    this.stored = tasks.map((task) => ({ ...task }));
  }

  async load(): Promise<Task[]> {
    if (this.failLoad) throw new Error('Load failed for test.');
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

test('adds tasks with clear NOW and waiting feedback', async () => {
  const ids = ['a', 'b'];
  const store = new MemoryStore();
  const session = new WindowedTaskSession(store, () => 10, () => ids.shift() ?? 'x');

  assert.equal(await session.load(), true);
  assert.equal(await session.add(' First '), true);
  assert.equal(session.message, 'Saved: task is NOW.');
  assert.equal(session.waitingTaskCount, 0);
  assert.equal(await session.add('Second'), true);
  assert.equal(session.message, 'Saved: task added to waiting.');
  assert.equal(session.activeTask?.id, 'a');
  assert.equal(session.waitingTaskCount, 1);
});

test('saves completion before advancing and blocks duplicate input', async () => {
  let release!: () => void;
  const store = new MemoryStore([task('a'), task('b')]);
  store.save = async (tasks) => {
    await new Promise<void>((resolve) => { release = resolve; });
    store.stored = tasks.map((item) => ({ ...item }));
  };
  const session = new WindowedTaskSession(store);
  await session.load();

  const pending = session.completeActive(1_000);
  assert.equal(session.activeTask?.id, 'a');
  assert.equal(await session.completeActive(1_001), false);
  release();
  assert.equal(await pending, true);
  assert.equal(session.activeTask?.id, 'b');
  assert.equal(await session.completeActive(1_000 + COMPLETE_INPUT_GUARD_MS - 1), false);
});

test('persists ordering and deletion through shared task operations', async () => {
  const store = new MemoryStore([task('a'), task('b'), task('c')]);
  const session = new WindowedTaskSession(store);
  await session.load();

  assert.equal(await session.moveTask('c', -1), true);
  assert.deepEqual(session.tasks.map(({ id }) => id), ['a', 'c', 'b']);
  assert.equal(await session.removeTask('a'), true);
  assert.deepEqual(session.tasks.map(({ id }) => id), ['c', 'b']);
  assert.deepEqual(store.stored, session.tasks);
});

test('New List carries only unfinished tasks in order', async () => {
  const store = new MemoryStore([task('done', true), task('a'), task('b')]);
  const session = new WindowedTaskSession(store);
  await session.load();

  assert.equal(await session.startNewList(true), true);
  assert.deepEqual(session.tasks, [task('a'), task('b')]);
  assert.equal(session.completedCount, 0);
  assert.equal(session.message, 'Saved: new list has 2 carried tasks.');
});

test('New List can start empty and completed tasks never carry', async () => {
  const store = new MemoryStore([task('a'), task('done', true)]);
  const session = new WindowedTaskSession(store);
  await session.load();

  assert.equal(await session.startNewList(false), true);
  assert.deepEqual(session.tasks, []);
  assert.equal(session.message, 'Saved: new list is empty.');
});

test('save failure preserves tasks for add, complete, order, delete, and New List', async () => {
  const original = [task('a'), task('b'), task('done', true)];
  const store = new MemoryStore(original);
  const session = new WindowedTaskSession(store, () => 1_000, () => 'new');
  await session.load();
  store.failSave = true;

  assert.equal(await session.add('New'), false);
  assert.deepEqual(session.tasks, original);
  assert.equal(await session.completeActive(1_000), false);
  assert.deepEqual(session.tasks, original);
  assert.equal(await session.moveTask('b', -1), false);
  assert.deepEqual(session.tasks, original);
  assert.equal(await session.removeTask('a'), false);
  assert.deepEqual(session.tasks, original);
  assert.equal(await session.startNewList(false), false);
  assert.deepEqual(session.tasks, original);
  assert.match(session.message, /Save failed/);
});

test('stored tasks restore into a new session', async () => {
  const store = new MemoryStore();
  const first = new WindowedTaskSession(store, () => 10, () => 'saved');
  await first.load();
  await first.add('Restore me');

  const reopened = new WindowedTaskSession(store);
  assert.equal(await reopened.load(), true);
  assert.equal(reopened.activeTask?.text, 'Restore me');
});

test('load failure is explicit and retryable', async () => {
  const store = new MemoryStore();
  store.failLoad = true;
  const session = new WindowedTaskSession(store);

  assert.equal(await session.load(), false);
  assert.equal(session.phase, 'load-error');
  assert.match(session.message, /Load failed/);
  store.failLoad = false;
  assert.equal(await session.load(), true);
});
