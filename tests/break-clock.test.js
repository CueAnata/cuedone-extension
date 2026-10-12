import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  BUILT_IN_BREAK_SUGGESTIONS,
  addCustomBreakSuggestion,
  breakClockStatus,
  changeBreakInterval,
  disableBreakClock,
  dismissBreak,
  enableBreakClock,
  formatBreakClockStatus,
  normalizeBreakTimerModel,
  normalizeBreakClock,
  normalizeCustomBreakSuggestions,
  pauseBreakClock,
  removeCustomBreakSuggestion,
  resumeBreakClock,
  revealBreakSuggestion,
} from "../src/shared/break-clock.js";
import {
  PERSONAL_BREAK_TIMER_KEY,
  PERSONAL_ENDING_KEY,
  loadPersonalBreakTimer,
  onPersonalBreakTimerChanged,
  savePersonalBreakTimer,
  savePersonalSessionState,
} from "../src/shared/preferences.js";

function mockChromeStorage(initial = {}, { failSet = false } = {}) {
  const store = { ...initial };
  const listeners = [];
  globalThis.chrome = {
    storage: {
      local: {
        async get(key) {
          return { [key]: store[key] };
        },
        async set(values) {
          if (failSet) {
            throw new Error("storage failed");
          }
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
          if (index !== -1) listeners.splice(index, 1);
        },
      },
    },
  };
  return store;
}

test("break clock defaults off and enabling starts one persisted interval", () => {
  const now = 1_000_000;
  const initial = normalizeBreakClock();
  assert.deepEqual(initial, {
    enabled: false,
    intervalMinutes: 30,
    dueAt: null,
    pausedRemainingMs: null,
    revealedSuggestion: "",
  });

  const enabled = enableBreakClock(initial, now);
  assert.equal(enabled.dueAt, now + 30 * 60 * 1000);
  assert.equal(breakClockStatus(enabled, now).phase, "running");
  assert.equal(
    breakClockStatus(enabled, enabled.dueAt).phase,
    "due"
  );
  assert.equal(formatBreakClockStatus(enabled, now), "Next break in about 30 minutes.");
});

test("wall-clock deadlines become due after a long sleep or closed popup", () => {
  const enabled = enableBreakClock(
    { enabled: false, intervalMinutes: 15 },
    10_000
  );
  const restored = normalizeBreakClock(JSON.parse(JSON.stringify(enabled)));
  assert.equal(breakClockStatus(restored, 10_000 + 14 * 60_000).phase, "running");
  assert.equal(breakClockStatus(restored, 10_000 + 90 * 60_000).phase, "due");
});

test("changing the interval restarts a running interval and updates a paused one", () => {
  const running = enableBreakClock(
    { enabled: false, intervalMinutes: 30 },
    1_000
  );
  const changed = changeBreakInterval(running, 45, 2_000);
  assert.equal(changed.intervalMinutes, 45);
  assert.equal(changed.dueAt, 2_000 + 45 * 60_000);

  const paused = pauseBreakClock(changed, 3_000);
  const pausedChanged = changeBreakInterval(paused, 10, 999_000);
  assert.equal(pausedChanged.dueAt, null);
  assert.equal(pausedChanged.pausedRemainingMs, 10 * 60_000);
});

test("session pause preserves remaining time and Continue resumes it", () => {
  const running = enableBreakClock(
    { enabled: false, intervalMinutes: 20 },
    5_000
  );
  const paused = pauseBreakClock(running, 5_000 + 7 * 60_000);
  assert.equal(paused.dueAt, null);
  assert.equal(paused.pausedRemainingMs, 13 * 60_000);
  assert.equal(breakClockStatus(paused, 999_000).phase, "paused");

  const resumed = resumeBreakClock(paused, 2_000_000);
  assert.equal(resumed.pausedRemainingMs, null);
  assert.equal(resumed.dueAt, 2_000_000 + 13 * 60_000);
  assert.equal(disableBreakClock(resumed).enabled, false);
});

test("Show respects Choose for me or Custom and Skip or Done starts the next interval", () => {
  const due = enableBreakClock(
    { enabled: false, intervalMinutes: 5 },
    1_000
  );
  const custom = [{ id: "custom-1", text: "Balance a pencil." }];
  const chosenForMe = revealBreakSuggestion(
    due,
    custom,
    "choose-for-me",
    () => 0.999,
    due.dueAt
  );
  assert.equal(chosenForMe.revealedSuggestion, "Do a tiny victory dance.");
  const shown = revealBreakSuggestion(
    due,
    custom,
    "custom",
    () => 0,
    due.dueAt
  );
  assert.equal(shown.revealedSuggestion, "Balance a pencil.");
  assert.deepEqual(
    revealBreakSuggestion(shown, custom, "custom", () => 0, due.dueAt),
    shown
  );
  assert.equal(
    revealBreakSuggestion(due, [], "custom", () => 0, due.dueAt)
      .revealedSuggestion,
    ""
  );

  const skipped = dismissBreak(due, due.dueAt + 2_000);
  assert.equal(skipped.revealedSuggestion, "");
  assert.equal(skipped.dueAt, due.dueAt + 2_000 + 5 * 60_000);
  const finishedShown = dismissBreak(shown, due.dueAt + 3_000);
  assert.equal(finishedShown.revealedSuggestion, "");
  assert.equal(breakClockStatus(finishedShown, due.dueAt + 3_000).phase, "running");
  assert.ok(BUILT_IN_BREAK_SUGGESTIONS.length >= 5);
});

test("custom suggestions are plain text, bounded, addable, and removable", () => {
  const added = addCustomBreakSuggestion([], "  Walk to the window.  ", "one");
  assert.deepEqual(added, [{ id: "one", text: "Walk to the window." }]);
  assert.deepEqual(addCustomBreakSuggestion(added, "", "two"), added);
  assert.deepEqual(removeCustomBreakSuggestion(added, "one"), []);
  assert.deepEqual(
    normalizeCustomBreakSuggestions([
      { id: "one", text: "First" },
      { id: "one", text: "Duplicate" },
      { id: "", text: "Missing id" },
    ]),
    [{ id: "one", text: "First" }]
  );
});

test("clock and custom suggestions persist and synchronize between views", async () => {
  const store = mockChromeStorage();
  const observed = [];
  const stop = onPersonalBreakTimerChanged((value) => observed.push(value));
  const clock = enableBreakClock(
    { enabled: false, intervalMinutes: 12 },
    50_000
  );
  const suggestions = [{ id: "mine", text: "Pet the cat." }];
  const timer = normalizeBreakTimerModel({
    version: 1,
    clock,
    suggestionSource: "custom",
    customSuggestions: suggestions,
  });

  await savePersonalBreakTimer(timer);
  stop();

  assert.deepEqual(await loadPersonalBreakTimer(), timer);
  assert.deepEqual(store[PERSONAL_BREAK_TIMER_KEY], timer);
  assert.deepEqual(observed, [timer]);
});

test("session ending and timer pause save atomically and failures preserve storage", async () => {
  const originalClock = enableBreakClock(
    { enabled: false, intervalMinutes: 20 },
    1_000
  );
  const originalEnding = { kind: "none", text: "" };
  const originalTimer = normalizeBreakTimerModel({
    version: 1,
    clock: originalClock,
  });
  const store = mockChromeStorage({
    [PERSONAL_BREAK_TIMER_KEY]: originalTimer,
    [PERSONAL_ENDING_KEY]: originalEnding,
  });
  const paused = pauseBreakClock(originalClock, 61_000);
  const pausedTimer = normalizeBreakTimerModel({
    ...originalTimer,
    clock: paused,
  });
  await savePersonalSessionState(
    { kind: "pause", text: "Good progress today." },
    pausedTimer
  );
  assert.deepEqual(store[PERSONAL_BREAK_TIMER_KEY], pausedTimer);
  assert.equal(store[PERSONAL_ENDING_KEY].kind, "pause");

  mockChromeStorage(store, { failSet: true });
  await assert.rejects(
    savePersonalSessionState(
      { kind: "none", text: "" },
      normalizeBreakTimerModel({
        ...pausedTimer,
        clock: resumeBreakClock(paused, 9_000),
      })
    )
  );
  assert.deepEqual(store[PERSONAL_BREAK_TIMER_KEY], pausedTimer);
  assert.equal(store[PERSONAL_ENDING_KEY].kind, "pause");
});

test("Private-only break UI is shared by popup and side panel and has responsive controls", () => {
  const source = readFileSync("src/shared/task-list.js", "utf8");
  const css = readFileSync("src/shared/styles.css", "utf8");
  const popup = readFileSync("src/popup/popup.js", "utf8");
  const side = readFileSync("src/sidepanel/sidepanel.js", "utf8");

  assert.match(source, /class="personal-break-alert"/);
  assert.match(source, /data-personal-break-clock="on"/);
  assert.match(source, /class="personal-break-show"/);
  assert.match(source, /class="personal-break-skip"/);
  assert.match(source, /<option value="choose-for-me">Choose for me<\/option>/);
  assert.match(source, /<option value="custom">Custom<\/option>/);
  assert.match(source, /class="personal-break-suggestion-feedback" aria-live="polite"/);
  assert.match(source, /personalBreakShow\.disabled = customBreakSuggestionsUnavailable/);
  assert.match(source, /pauseBreakClock\(personalBreakClock\)/);
  assert.match(source, /resumeBreakClock\(personalBreakClock\)/);
  assert.match(source, /scheduleBrowserAlarm/);
  assert.match(css, /data-personal-presentation="private"[\s\S]*personal-break-settings/);
  assert.match(css, /@media \(max-width: 420px\)[\s\S]*personal-break-alert/);
  assert.match(css, /@media \(prefers-reduced-motion: no-preference\)[\s\S]*break-clock-ring/);
  assert.match(popup, /mountTaskList/);
  assert.match(side, /mountTaskList/);
});
