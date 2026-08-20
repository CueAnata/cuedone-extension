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
  PRESENTATION_MODE_KEY,
  END_MOTIVATOR_KEY,
  REWARD_KEY,
  loadPresentationMode,
  loadEndMotivator,
  loadReward,
  normalizePresentationMode,
  normalizeEndMotivator,
  savePresentationMode,
  saveEndMotivator,
  saveReward,
  COMPLETION_STYLE_KEY,
  COMPLETION_SOUND_KEY,
  FINAL_CELEBRATION_KEY,
  loadCompletionStyle,
  loadCompletionSound,
  loadFinalCelebration,
  normalizeCompletionStyle,
  normalizeCompletionSound,
  normalizeFinalCelebration,
  saveCompletionStyle,
  saveCompletionSound,
  saveFinalCelebration,
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

test("presentation mode defaults to Personal and persists Client separately from tasks", async () => {
  const store = mockChromeStorage();
  assert.equal(normalizePresentationMode(undefined), "personal");
  assert.equal(normalizePresentationMode("client"), "client");
  assert.equal(normalizePresentationMode("side"), "personal");
  assert.equal(await loadPresentationMode(), "personal");
  await savePresentationMode("client");
  assert.equal(store[PRESENTATION_MODE_KEY], "client");
  assert.equal(await loadPresentationMode(), "client");
});

test("end motivator is optional, trimmed, and persisted locally", async () => {
  const store = mockChromeStorage();
  assert.equal(normalizeEndMotivator(undefined), "");
  assert.equal(normalizeEndMotivator("  game time  "), "game time");
  assert.equal(normalizeEndMotivator("x".repeat(200)).length, 120);
  assert.equal(await loadEndMotivator(), "");
  await saveEndMotivator("  5 minutes of your choice  ");
  assert.equal(await loadEndMotivator(), "5 minutes of your choice");
  assert.deepEqual(store[REWARD_KEY], {
    id: "custom",
    customText: "5 minutes of your choice",
  });
});

test("Client reward selection persists independently from custom text", async () => {
  const store = mockChromeStorage();
  assert.deepEqual(await loadReward(), { id: "none", customText: "" });
  await saveReward({ id: "game-time", customText: "  extra  " });
  assert.deepEqual(store[REWARD_KEY], {
    id: "game-time",
    customText: "extra",
  });
  assert.deepEqual(await loadReward(), {
    id: "game-time",
    customText: "extra",
  });
  await saveReward({ id: "custom", customText: "pizza" });
  assert.deepEqual(await loadReward(), {
    id: "custom",
    customText: "pizza",
  });
});

test("legacy freeform motivator migrates to a Custom reward", async () => {
  mockChromeStorage({ [END_MOTIVATOR_KEY]: "  drawing time  " });
  assert.deepEqual(await loadReward(), {
    id: "custom",
    customText: "drawing time",
  });
});

test("Client completion style persists independently from sound preference", async () => {
  const store = mockChromeStorage();
  assert.equal(normalizeCompletionStyle(undefined), "simple");
  assert.equal(normalizeCompletionStyle("celebrate"), "celebrate");
  assert.equal(normalizeCompletionStyle("confetti"), "simple");
  assert.equal(normalizeCompletionSound(undefined), "off");
  assert.equal(normalizeCompletionSound("on"), "on");
  assert.equal(normalizeCompletionSound("celebrate"), "off");
  assert.equal(await loadCompletionStyle(), "simple");
  assert.equal(await loadCompletionSound(), "off");
  await saveCompletionStyle("celebrate");
  await saveCompletionSound("on");
  assert.equal(store[COMPLETION_STYLE_KEY], "celebrate");
  assert.equal(store[COMPLETION_SOUND_KEY], "on");
  assert.equal(await loadCompletionStyle(), "celebrate");
  assert.equal(await loadCompletionSound(), "on");
});

test("final celebration preference persists locally", async () => {
  const store = mockChromeStorage();
  assert.equal(normalizeFinalCelebration(undefined), "random");
  assert.equal(normalizeFinalCelebration("balloons"), "balloons");
  assert.equal(normalizeFinalCelebration("stars"), "stars");
  assert.equal(normalizeFinalCelebration("cars"), "cars");
  assert.equal(normalizeFinalCelebration("butterflies"), "butterflies");
  assert.equal(normalizeFinalCelebration("random"), "random");
  assert.equal(normalizeFinalCelebration("confetti"), "random");
  assert.equal(await loadFinalCelebration(), "random");
  await saveFinalCelebration("cars");
  assert.equal(store[FINAL_CELEBRATION_KEY], "cars");
  assert.equal(await loadFinalCelebration(), "cars");
  await saveFinalCelebration("balloons");
  assert.equal(await loadFinalCelebration(), "balloons");
});

test("saving Client presentation or motivator does not alter tasks", async () => {
  mockChromeStorage();
  const { TASKS_STORAGE_KEY, loadTasks, saveTasks } = await import(
    "../src/shared/task-store.js"
  );
  const { createTask } = await import("../src/shared/tasks.js");
  const tasks = [createTask("Keep me", 1, "task-keep")];
  await saveTasks(tasks);
  await savePresentationMode("client");
  await saveEndMotivator("drawing");
  await saveReward({ id: "music", customText: "" });
  await saveCompletionStyle("celebrate");
  await saveCompletionSound("on");
  await saveFinalCelebration("butterflies");
  assert.deepEqual(await loadTasks(), tasks);
  assert.equal(TASKS_STORAGE_KEY, "cuedone.tasks");
});

test("Client presentation CSS is scoped and does not restyle Personal View", async () => {
  const { readFileSync } = await import("node:fs");
  const css = readFileSync("src/shared/styles.css", "utf8");
  assert.match(css, /\[data-presentation="client"\] \.task-item\.is-current-task/);
  assert.match(css, /\[data-presentation="client"\] \.task-item\.is-complete/);
  assert.match(
    css,
    /\[data-presentation="client"\] \.client-progress:not\(\[hidden\]\)/
  );
  assert.match(
    css,
    /\[data-presentation="client"\] \.client-motivator:not\(\[hidden\]\)/
  );
  assert.match(css, /\.client-reward-setup\[hidden\]/);
  assert.match(
    css,
    /\.client-motivator\.is-editing \.client-reward-setup:not\(\[hidden\]\)/
  );
  for (const occurrence of css.split(".is-current-task").slice(0, -1)) {
    assert.match(occurrence, /\[data-presentation="client"\]/);
  }
});
