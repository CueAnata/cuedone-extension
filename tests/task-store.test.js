import assert from "node:assert/strict";
import test from "node:test";
import { PERSONAL_ENDING_KEY } from "../src/shared/preferences.js";
import { bindEndingToTasks } from "../src/shared/personal-messages.js";
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


test("Private task updates clear the old ending in the same storage write", async () => {
  const original = [createTask("Private", 1, "private")];
  const ending = bindEndingToTasks({ kind: "complete", text: "Done" }, original);
  const publicTasks = [createTask("Public", 2, "public")];
  const store = mockChromeStorage({ [TASKS_STORAGE_KEY]: original, [PUBLIC_TASKS_STORAGE_KEY]: publicTasks, [PERSONAL_ENDING_KEY]: ending });
  const writes = [];
  const set = chrome.storage.local.set;
  chrome.storage.local.set = async (values) => {
    writes.push(values);
    // Reproduce the old partial failure: a separate ending clear would fail.
    if (PERSONAL_ENDING_KEY in values && !(TASKS_STORAGE_KEY in values)) {
      throw new Error("ending-only save failed");
    }
    return set(values);
  };
  const changed = [...original, createTask("Added", 3, "added")];
  await saveList("private", changed);
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0], { [TASKS_STORAGE_KEY]: changed, [PERSONAL_ENDING_KEY]: { kind: "none", text: "" } });
  assert.deepEqual(store[TASKS_STORAGE_KEY], changed);
  assert.deepEqual(store[PERSONAL_ENDING_KEY], { kind: "none", text: "" });
  assert.deepEqual(store[PUBLIC_TASKS_STORAGE_KEY], publicTasks);
});

test("failed combined Private write preserves tasks and the matching ending", async () => {
  const original = [createTask("Stay", 1, "stay")];
  const ending = bindEndingToTasks({ kind: "pause", text: "Pause" }, original);
  const store = mockChromeStorage({ [TASKS_STORAGE_KEY]: original, [PERSONAL_ENDING_KEY]: ending });
  chrome.storage.local.set = async () => { throw new Error("storage unavailable"); };
  await assert.rejects(() => saveList("private", []), /storage unavailable/);
  assert.deepEqual(store[TASKS_STORAGE_KEY], original);
  assert.deepEqual(store[PERSONAL_ENDING_KEY], ending);
});

test("Public task updates leave Private tasks and endings untouched", async () => {
  const original = [createTask("Private", 1, "private")];
  const ending = bindEndingToTasks({ kind: "pause", text: "Private pause" }, original);
  const store = mockChromeStorage({ [TASKS_STORAGE_KEY]: original, [PERSONAL_ENDING_KEY]: ending });
  await saveList("public", [createTask("Agenda", 2, "agenda")]);
  assert.deepEqual(store[TASKS_STORAGE_KEY], original);
  assert.deepEqual(store[PERSONAL_ENDING_KEY], ending);
});


test("ordinary Private edits retain deliberate pause; Reset and New List clear it", async () => {
  const tasks = [createTask("Original", 1, "original")];
  const pause = { kind: "pause", text: "Pause here" };
  const store = mockChromeStorage({ [TASKS_STORAGE_KEY]: tasks, [PERSONAL_ENDING_KEY]: pause });
  const changed = [...tasks, createTask("Added while paused", 2, "added")];
  await saveList("private", changed);
  assert.deepEqual(store[TASKS_STORAGE_KEY], changed);
  assert.deepEqual(store[PERSONAL_ENDING_KEY], pause);
  await saveList("private", changed, { clearEnding: true });
  assert.deepEqual(store[PERSONAL_ENDING_KEY], { kind: "none", text: "" });
});

test("Continue list during an ordinary task save cannot resurrect the pause", async () => {
  const tasks = [createTask("Original", 1, "original")];
  const store = mockChromeStorage({ [PERSONAL_ENDING_KEY]: { kind: "pause", text: "Pause" } });
  const set = chrome.storage.local.set;
  chrome.storage.local.set = async values => {
    if (TASKS_STORAGE_KEY in values) store[PERSONAL_ENDING_KEY] = { kind: "none", text: "" };
    return set(values);
  };
  await saveTasks(tasks);
  assert.deepEqual(store[PERSONAL_ENDING_KEY], { kind: "none", text: "" });
});
