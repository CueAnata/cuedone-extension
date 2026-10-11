import assert from "node:assert/strict";
import test from "node:test";
import {
  loadPersonalEnding,
  PERSONAL_ENDING_KEY,
  savePersonalEnding,
} from "../src/shared/preferences.js";
import {
  bindEndingToTasks,
  clearEndingState,
  createEndingState,
  endingVisible,
} from "../src/shared/personal-messages.js";
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
  await saveList("public", publicTasks, { clearEnding: true });
  unsubscribe();
  await saveList("private", []);

  assert.deepEqual(received, [
    { kind: "private", tasks: privateTasks },
    { kind: "public", tasks: publicTasks },
  ]);
});

test("unfinished pause, task checks, and order restore until Continue list", async () => {
  const tasks = [
    { ...createTask("Finished", 1, "done"), completed: true },
    createTask("Still waiting", 2, "waiting"),
  ];
  const store = mockChromeStorage({ [TASKS_STORAGE_KEY]: tasks });
  await savePersonalEnding(createEndingState("pause"));

  const reopenedTasks = await loadTasks();
  const reopenedEnding = await loadPersonalEnding();
  assert.deepEqual(reopenedTasks, tasks);
  assert.equal(reopenedEnding.text, "Good progress today.");
  assert.equal(
    endingVisible(reopenedEnding, "personal", "private", reopenedTasks),
    true
  );

  await savePersonalEnding(clearEndingState());
  assert.deepEqual(await loadTasks(), tasks);
  assert.deepEqual(await loadPersonalEnding(), clearEndingState());
  assert.deepEqual(store[TASKS_STORAGE_KEY], tasks);
});

test("ordinary Private edits retain a deliberate unfinished pause", async () => {
  const original = [createTask("Original", 1, "original")];
  const pause = createEndingState("pause");
  const store = mockChromeStorage({
    [TASKS_STORAGE_KEY]: original,
    [PERSONAL_ENDING_KEY]: pause,
  });
  const changed = [
    { ...original[0], completed: true },
    createTask("Added while paused", 2, "added"),
  ];

  await saveList("private", changed);
  assert.deepEqual(store[TASKS_STORAGE_KEY], changed);
  assert.deepEqual(store[PERSONAL_ENDING_KEY], pause);
});

test("Reset List and Start a New List clear a deliberate pause", async () => {
  const completed = [
    { ...createTask("One", 1, "one"), completed: true },
    { ...createTask("Two", 2, "two"), completed: true },
  ];
  const pause = createEndingState("pause");
  const store = mockChromeStorage({
    [TASKS_STORAGE_KEY]: completed,
    [PERSONAL_ENDING_KEY]: pause,
  });
  const reset = completed.map((task) => ({ ...task, completed: false }));

  await saveList("private", reset, { clearEnding: true });
  assert.deepEqual(store[TASKS_STORAGE_KEY], reset);
  assert.deepEqual(store[PERSONAL_ENDING_KEY], clearEndingState());

  await savePersonalEnding(pause);
  const newList = [createTask("Carried", 3, "carried")];
  await saveList("private", newList, { clearEnding: true });
  assert.deepEqual(store[TASKS_STORAGE_KEY], newList);
  assert.deepEqual(store[PERSONAL_ENDING_KEY], clearEndingState());
});

test("completed ending remains separate from unfinished pause behavior", async () => {
  const completed = [
    { ...createTask("Done", 1, "done"), completed: true },
  ];
  mockChromeStorage({ [TASKS_STORAGE_KEY]: completed });
  const ending = bindEndingToTasks(
    createEndingState("complete", {
      choice: "all-done",
      customText: "",
    }),
    completed
  );
  await savePersonalEnding(ending);

  assert.deepEqual(await loadTasks(), completed);
  assert.deepEqual(await loadPersonalEnding(), ending);
  assert.equal(
    endingVisible(ending, "personal", "private", completed),
    true
  );
});

test("Public list changes never expose or clear the Private pause", async () => {
  const privateTasks = [createTask("Private task", 1, "private")];
  const pause = createEndingState("pause");
  const store = mockChromeStorage({
    [TASKS_STORAGE_KEY]: privateTasks,
    [PERSONAL_ENDING_KEY]: pause,
  });
  const publicTasks = [createTask("Public agenda", 2, "public")];

  await saveList("public", publicTasks);
  assert.deepEqual(store[TASKS_STORAGE_KEY], privateTasks);
  assert.deepEqual(store[PUBLIC_TASKS_STORAGE_KEY], publicTasks);
  assert.deepEqual(store[PERSONAL_ENDING_KEY], pause);
  assert.equal(endingVisible(pause, "personal", "public", publicTasks), false);
});
