import assert from "node:assert/strict";
import test from "node:test";
import { createTask } from "../src/shared/tasks.js";
import {
  TASKS_STORAGE_KEY,
  loadTasks,
  onTasksChanged,
  saveTasks,
} from "../src/shared/task-store.js";

function mockChromeStorage(initial = {}) {
  const store = { ...initial };
  const listeners = new Set();

  globalThis.chrome = {
    storage: {
      local: {
        async get(key) {
          return { [key]: store[key] };
        },
        async set(values) {
          for (const [key, value] of Object.entries(values)) {
            const oldValue = store[key];
            store[key] = value;
            for (const listener of listeners) {
              listener({ [key]: { oldValue, newValue: value } }, "local");
            }
          }
        },
      },
      onChanged: {
        addListener(listener) {
          listeners.add(listener);
        },
        removeListener(listener) {
          listeners.delete(listener);
        },
      },
    },
  };

  return store;
}

test("loadTasks returns an empty list when storage is missing or invalid", async () => {
  mockChromeStorage();
  assert.deepEqual(await loadTasks(), []);

  mockChromeStorage({ [TASKS_STORAGE_KEY]: [{ broken: true }] });
  assert.deepEqual(await loadTasks(), []);
});

test("saveTasks and loadTasks round-trip valid tasks", async () => {
  mockChromeStorage();
  const tasks = [createTask("Read brief", 1, "task-1")];
  await saveTasks(tasks);
  assert.deepEqual(await loadTasks(), tasks);
});

test("onTasksChanged notifies listeners of local task updates", async () => {
  mockChromeStorage();
  const received = [];
  const unsubscribe = onTasksChanged((tasks) => received.push(tasks));
  const tasks = [createTask("Follow up", 2, "task-2")];

  await saveTasks(tasks);
  unsubscribe();
  await saveTasks([]);

  assert.equal(received.length, 1);
  assert.deepEqual(received[0], tasks);
});
