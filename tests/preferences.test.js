import assert from "node:assert/strict";
import test from "node:test";
import {
  PREFERRED_VIEW_KEY,
  TASK_ENTRY_OPEN_KEY,
  loadPreferredView,
  loadTaskEntryOpen,
  normalizePreferredView,
  normalizeTaskEntryOpen,
  savePreferredView,
  saveTaskEntryOpen,
  shouldAssignToolbarPopup,
  shouldRestoreSideFromPopup,
  taskEntryVisibility,
} from "../src/shared/preferences.js";

function mockChromeStorage(initial = {}) {
  const store = { ...initial };

  globalThis.chrome = {
    storage: {
      local: {
        async get(key) {
          return { [key]: store[key] };
        },
        async set(values) {
          Object.assign(store, values);
        },
      },
      onChanged: {
        addListener() {},
        removeListener() {},
      },
    },
  };

  return store;
}

test("normalizePreferredView defaults to top", () => {
  assert.equal(normalizePreferredView("side"), "side");
  assert.equal(normalizePreferredView("top"), "top");
  assert.equal(normalizePreferredView("client"), "top");
  assert.equal(normalizePreferredView(undefined), "top");
});

test("normalizeTaskEntryOpen defaults to setup/entry mode", () => {
  assert.equal(normalizeTaskEntryOpen(undefined), true);
  assert.equal(normalizeTaskEntryOpen(true), true);
  assert.equal(normalizeTaskEntryOpen(false), false);
});

test("taskEntryVisibility shows either the entry form or the add-task control", () => {
  assert.deepEqual(taskEntryVisibility(true), {
    showEntryForm: true,
    showAddTaskToggle: false,
  });
  assert.deepEqual(taskEntryVisibility(false), {
    showEntryForm: false,
    showAddTaskToggle: true,
  });
});

test("shouldAssignToolbarPopup keeps the Top popup unless Side can open from the toolbar", () => {
  assert.equal(shouldAssignToolbarPopup("top", true), true);
  assert.equal(shouldAssignToolbarPopup("top", false), true);
  assert.equal(shouldAssignToolbarPopup("side", true), false);
  assert.equal(shouldAssignToolbarPopup("side", false), true);
});

test("shouldRestoreSideFromPopup honors a saved Side preference if the popup still opens", () => {
  assert.equal(shouldRestoreSideFromPopup("side"), true);
  assert.equal(shouldRestoreSideFromPopup("top"), false);
  assert.equal(shouldRestoreSideFromPopup(undefined), false);
});

test("preferred view persists locally", async () => {
  const store = mockChromeStorage();
  assert.equal(await loadPreferredView(), "top");
  await savePreferredView("side");
  assert.equal(store[PREFERRED_VIEW_KEY], "side");
  assert.equal(await loadPreferredView(), "side");
});

test("task-entry collapsed state persists and does not default to collapsed", async () => {
  const store = mockChromeStorage();
  assert.equal(await loadTaskEntryOpen(), true);
  await saveTaskEntryOpen(false);
  assert.equal(store[TASK_ENTRY_OPEN_KEY], false);
  assert.equal(await loadTaskEntryOpen(), false);
  await saveTaskEntryOpen(true);
  assert.equal(await loadTaskEntryOpen(), true);
});

test("saving view or entry preferences does not alter tasks", async () => {
  mockChromeStorage();
  const { TASKS_STORAGE_KEY, loadTasks, saveTasks } = await import(
    "../src/shared/task-store.js"
  );
  const { createTask } = await import("../src/shared/tasks.js");
  const tasks = [createTask("Keep me", 1, "task-keep")];
  await saveTasks(tasks);
  await savePreferredView("side");
  await saveTaskEntryOpen(false);
  assert.deepEqual(await loadTasks(), tasks);
  assert.equal(TASKS_STORAGE_KEY, "cuedone.tasks");
});

test("collapsed entry CSS hides the form and shows only the add-task control", async () => {
  const { readFileSync } = await import("node:fs");
  const css = readFileSync("src/shared/styles.css", "utf8");
  assert.match(
    css,
    /\[data-entry-mode="work"\] \.task-form\s*\{[\s\S]*?display:\s*none/
  );
  assert.match(
    css,
    /\[data-entry-mode="entry"\] \.add-task-toggle[\s\S]*?display:\s*none/
  );
  assert.match(
    css,
    /\[data-entry-mode="work"\] \.add-task-toggle\s*\{[\s\S]*?display:\s*inline-flex/
  );
});
