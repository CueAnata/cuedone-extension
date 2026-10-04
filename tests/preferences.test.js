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
  PERSONAL_PRESENTATION_KEY,
  PRESENTATION_MODE_KEY,
  END_MOTIVATOR_KEY,
  REWARD_KEY,
  loadPersonalPresentation,
  loadPresentationMode,
  loadEndMotivator,
  loadReward,
  normalizePresentationMode,
  normalizeEndMotivator,
  savePersonalPresentation,
  savePresentationMode,
  saveEndMotivator,
  saveReward,
  COMPLETION_STYLE_KEY,
  COMPLETION_SOUND_KEY,
  FINAL_CELEBRATION_KEY,
  FINAL_SOUND_KEY,
  TASK_SOUND_KEY,
  loadCompletionStyle,
  loadCompletionSound,
  loadFinalCelebration,
  loadFinalSound,
  loadTaskSound,
  onFinalSoundChanged,
  onTaskSoundChanged,
  normalizeCompletionStyle,
  normalizeCompletionSound,
  normalizeFinalCelebration,
  normalizeFinalSound,
  normalizeTaskSound,
  saveCompletionStyle,
  saveCompletionSound,
  saveFinalCelebration,
  saveFinalSound,
  saveTaskSound,
  PERSONAL_COMPLETION_SOUND_KEY,
  PERSONAL_FINAL_SOUND_KEY,
  PERSONAL_TASK_SOUND_KEY,
  loadPersonalCompletionSound,
  loadPersonalFinalSound,
  loadPersonalTaskSound,
  onPersonalCompletionSoundChanged,
  onPersonalFinalSoundChanged,
  onPersonalTaskSoundChanged,
  savePersonalCompletionSound,
  savePersonalFinalSound,
  savePersonalTaskSound,
} from "../src/shared/preferences.js";

function mockChromeStorage(initial = {}) {
  const store = { ...initial };
  const listeners = [];

  globalThis.chrome = {
    storage: {
      local: {
        async get(key) {
          return { [key]: store[key] };
        },
        async set(values) {
          const changes = Object.fromEntries(
            Object.entries(values).map(([key, newValue]) => [
              key,
              { oldValue: store[key], newValue },
            ])
          );
          Object.assign(store, values);
          listeners.forEach((listener) => listener(changes, "local"));
        },
      },
      onChanged: {
        addListener(listener) {
          listeners.push(listener);
        },
        removeListener(listener) {
          const index = listeners.indexOf(listener);
          if (index !== -1) {
            listeners.splice(index, 1);
          }
        },
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

test("Personal presentation defaults to Private and persists Public separately", async () => {
  const store = mockChromeStorage();
  assert.equal(await loadPersonalPresentation(), "private");
  await savePersonalPresentation("public");
  assert.equal(store[PERSONAL_PRESENTATION_KEY], "public");
  assert.equal(await loadPersonalPresentation(), "public");
  await savePersonalPresentation("not-a-list");
  assert.equal(await loadPersonalPresentation(), "private");
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

test("final sound defaults to the existing tone and persists valid choices", async () => {
  const store = mockChromeStorage();
  assert.equal(normalizeFinalSound(undefined), "current");
  assert.equal(normalizeFinalSound("yay"), "yay");
  assert.equal(normalizeFinalSound("applause"), "applause");
  assert.equal(normalizeFinalSound("trumpet-fanfare"), "trumpet-fanfare");
  assert.equal(normalizeFinalSound("hurrah"), "hurrah");
  assert.equal(normalizeFinalSound("confetti"), "current");
  assert.equal(await loadFinalSound(), "current");
  await saveFinalSound("hurrah");
  assert.equal(store[FINAL_SOUND_KEY], "hurrah");
  assert.equal(await loadFinalSound(), "hurrah");
});

test("final sound changes synchronize through shared local storage", async () => {
  mockChromeStorage();
  const observed = [];
  const unsubscribe = onFinalSoundChanged((value) => observed.push(value));
  await saveFinalSound("trumpet-fanfare");
  await saveFinalSound("not-a-choice");
  unsubscribe();
  await saveFinalSound("yay");
  assert.deepEqual(observed, ["trumpet-fanfare", "current"]);
});

test("task sound defaults to Bubble Pop and persists every valid choice", async () => {
  const store = mockChromeStorage();
  assert.equal(normalizeTaskSound(undefined), "bubble-pop");
  assert.equal(normalizeTaskSound("none"), "none");
  assert.equal(normalizeTaskSound("bubble-pop"), "bubble-pop");
  assert.equal(normalizeTaskSound("soft-click"), "soft-click");
  assert.equal(normalizeTaskSound("wood-tap"), "wood-tap");
  assert.equal(normalizeTaskSound("random"), "random");
  assert.equal(normalizeTaskSound("current"), "bubble-pop");
  assert.equal(await loadTaskSound(), "bubble-pop");
  await saveTaskSound("wood-tap");
  assert.equal(store[TASK_SOUND_KEY], "wood-tap");
  assert.equal(await loadTaskSound(), "wood-tap");
});

test("task sound changes synchronize through shared local storage", async () => {
  mockChromeStorage();
  const observed = [];
  const unsubscribe = onTaskSoundChanged((value) => observed.push(value));
  await saveTaskSound("random");
  await saveTaskSound("not-a-choice");
  unsubscribe();
  await saveTaskSound("soft-click");
  assert.deepEqual(observed, ["random", "bubble-pop"]);
});

test("Personal audio preferences persist separately from Client audio", async () => {
  const store = mockChromeStorage();
  assert.equal(await loadPersonalCompletionSound(), "off");
  assert.equal(await loadPersonalTaskSound(), "bubble-pop");
  assert.equal(await loadPersonalFinalSound(), "current");
  await saveCompletionSound("on");
  await saveTaskSound("wood-tap");
  await saveFinalSound("hurrah");
  assert.equal(await loadPersonalCompletionSound(), "off");
  assert.equal(await loadPersonalTaskSound(), "bubble-pop");
  assert.equal(await loadPersonalFinalSound(), "current");
  await savePersonalCompletionSound("on");
  await savePersonalTaskSound("soft-click");
  await savePersonalFinalSound("applause");
  assert.equal(store[PERSONAL_COMPLETION_SOUND_KEY], "on");
  assert.equal(store[PERSONAL_TASK_SOUND_KEY], "soft-click");
  assert.equal(store[PERSONAL_FINAL_SOUND_KEY], "applause");
  assert.equal(store[COMPLETION_SOUND_KEY], "on");
  assert.equal(store[TASK_SOUND_KEY], "wood-tap");
  assert.equal(store[FINAL_SOUND_KEY], "hurrah");
  assert.equal(await loadCompletionSound(), "on");
  assert.equal(await loadTaskSound(), "wood-tap");
  assert.equal(await loadFinalSound(), "hurrah");
});

test("Personal audio preference changes synchronize through shared local storage", async () => {
  mockChromeStorage();
  const sounds = [];
  const tasks = [];
  const finals = [];
  const stopSound = onPersonalCompletionSoundChanged((value) => sounds.push(value));
  const stopTask = onPersonalTaskSoundChanged((value) => tasks.push(value));
  const stopFinal = onPersonalFinalSoundChanged((value) => finals.push(value));
  await savePersonalCompletionSound("on");
  await savePersonalTaskSound("random");
  await savePersonalFinalSound("yay");
  stopSound();
  stopTask();
  stopFinal();
  await savePersonalCompletionSound("off");
  await savePersonalTaskSound("none");
  await savePersonalFinalSound("hurrah");
  assert.deepEqual(sounds, ["on"]);
  assert.deepEqual(tasks, ["random"]);
  assert.deepEqual(finals, ["yay"]);
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
  await saveFinalSound("applause");
  await saveTaskSound("soft-click");
  await savePersonalPresentation("public");
  await savePersonalCompletionSound("on");
  await savePersonalTaskSound("none");
  await savePersonalFinalSound("yay");
  assert.deepEqual(await loadTasks(), tasks);
  assert.equal(TASKS_STORAGE_KEY, "cuedone.tasks");
  const { loadPublicTasks } = await import("../src/shared/task-store.js");
  assert.deepEqual(await loadPublicTasks(), []);
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
