import assert from "node:assert/strict";
import test from "node:test";
import { createTask } from "../src/shared/tasks.js";
import {
  PUBLIC_TASKS_STORAGE_KEY,
  TASKS_STORAGE_KEY,
  loadList,
  loadPublicTasks,
  loadTasks,
  onListChanged,
  onTasksChanged,
  saveList,
  savePublicTasks,
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

test("existing saved tasks stay on the Private list and Public starts empty", async () => {
  const privateTasks = [createTask("Keep private", 1, "keep-1")];
  const store = mockChromeStorage({
    [TASKS_STORAGE_KEY]: privateTasks,
  });

  assert.deepEqual(await loadTasks(), privateTasks);
  assert.deepEqual(await loadPublicTasks(), []);
  assert.deepEqual(await loadList("public"), []);
  assert.equal(store[PUBLIC_TASKS_STORAGE_KEY], undefined);
});

test("Public and Private lists persist separately without copying tasks", async () => {
  const store = mockChromeStorage({
    [TASKS_STORAGE_KEY]: [createTask("Private note", 1, "priv-1")],
  });
  const publicTasks = [createTask("Meeting agenda", 2, "pub-1")];

  await savePublicTasks(publicTasks);

  assert.deepEqual(await loadList("private"), [
    createTask("Private note", 1, "priv-1"),
  ]);
  assert.deepEqual(await loadList("public"), publicTasks);
  assert.deepEqual(store[TASKS_STORAGE_KEY], [
    createTask("Private note", 1, "priv-1"),
  ]);
  assert.notDeepEqual(store[PUBLIC_TASKS_STORAGE_KEY], store[TASKS_STORAGE_KEY]);
});

test("invalid Public storage does not fall back to Private tasks", async () => {
  mockChromeStorage({
    [TASKS_STORAGE_KEY]: [createTask("Secret", 1, "secret")],
    [PUBLIC_TASKS_STORAGE_KEY]: [{ broken: true }],
  });

  assert.deepEqual(await loadPublicTasks(), []);
  assert.equal((await loadPublicTasks()).some((task) => task.text === "Secret"), false);
});

test("a failed Public save leaves Private storage unchanged", async () => {
  const privateTasks = [createTask("Stay", 1, "stay")];
  const store = mockChromeStorage({
    [TASKS_STORAGE_KEY]: privateTasks,
  });
  const originalSet = globalThis.chrome.storage.local.set;
  globalThis.chrome.storage.local.set = async (values) => {
    if (PUBLIC_TASKS_STORAGE_KEY in values) {
      throw new Error("quota");
    }
    return originalSet(values);
  };

  await assert.rejects(
    () => savePublicTasks([createTask("Nope", 2, "nope")]),
    /quota/
  );
  assert.deepEqual(store[TASKS_STORAGE_KEY], privateTasks);
  assert.equal(store[PUBLIC_TASKS_STORAGE_KEY], undefined);
});

test("onListChanged reports each list and ignores the other", async () => {
  mockChromeStorage();
  const received = [];
  const unsubscribe = onListChanged((kind, tasks) =>
    received.push({ kind, tasks })
  );

  const privateTasks = [createTask("Private sync", 1, "priv-sync")];
  const publicTasks = [createTask("Public sync", 2, "pub-sync")];
  await saveList("private", privateTasks);
  await saveList("public", publicTasks);
  unsubscribe();
  await saveList("private", []);

  assert.deepEqual(received, [
    { kind: "private", tasks: privateTasks },
    { kind: "public", tasks: publicTasks },
  ]);
});
