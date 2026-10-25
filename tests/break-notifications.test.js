import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  beginBreakNotificationOptIn,
  executeBreakNotificationPlan,
  planBreakNotification,
} from "../src/platform/break-notifications.js";
import {
  PERSONAL_BREAK_NOTIFICATIONS_KEY,
  loadPersonalBreakNotifications,
  onPersonalBreakNotificationsChanged,
  savePersonalBreakNotifications,
} from "../src/shared/preferences.js";
import { normalizeBreakTimerModel } from "../src/shared/break-clock.js";
import {
  browserViewIsActive,
  onBreakClockViewVisibilityChanged,
} from "../src/platform/browser.js";

const NOW = 10_000;

function timerDueAt(dueAt) {
  return normalizeBreakTimerModel({
    version: 1,
    clock: {
      enabled: true,
      intervalMinutes: 15,
      dueAt,
      pausedRemainingMs: null,
      revealedSuggestion: "",
    },
  });
}

function activeState(overrides = {}) {
  return {
    enabled: true,
    permissionGranted: true,
    presentationMode: "personal",
    personalPresentation: "private",
    endingKind: "none",
    timer: timerDueAt(NOW + 1_000),
    notifiedDueAt: null,
    viewVisible: false,
    now: NOW,
    ...overrides,
  };
}

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

function eventChannel() {
  const listeners = [];
  return {
    addListener(listener) {
      listeners.push(listener);
    },
    emit(...args) {
      for (const listener of listeners) listener(...args);
    },
  };
}

test("a running Private timer schedules one background alarm", () => {
  assert.deepEqual(planBreakNotification(activeState()), {
    action: "schedule",
    dueAt: NOW + 1_000,
  });
});

test("a due Private timer notifies only when every CueDone view is closed", () => {
  const due = activeState({ timer: timerDueAt(NOW) });
  assert.deepEqual(planBreakNotification(due), {
    action: "notify",
    dueAt: NOW,
  });
  assert.deepEqual(planBreakNotification({ ...due, viewVisible: true }), {
    action: "visible",
    dueAt: NOW,
  });
  assert.deepEqual(planBreakNotification({ ...due, notifiedDueAt: NOW }), {
    action: "notified",
    dueAt: NOW,
  });
});

test("disabled, paused, Public, and Client states suppress background alerts", () => {
  const cases = [
    { enabled: false },
    { permissionGranted: false },
    { endingKind: "pause" },
    { personalPresentation: "public" },
    { presentationMode: "client" },
    {
      timer: normalizeBreakTimerModel({
        clock: {
          enabled: false,
          intervalMinutes: 15,
          dueAt: null,
          pausedRemainingMs: null,
          revealedSuggestion: "",
        },
      }),
    },
  ];

  for (const overrides of cases) {
    assert.deepEqual(planBreakNotification(activeState(overrides)), {
      action: "inactive",
      dueAt: null,
    });
  }
});

test("notification plans schedule, show once, and clear stale alerts", async () => {
  const calls = [];
  const actions = {
    scheduleAlarm(dueAt) {
      calls.push(["schedule", dueAt]);
      return Promise.resolve();
    },
    clearAlarm() {
      calls.push(["clear-alarm"]);
      return Promise.resolve();
    },
    showNotification() {
      calls.push(["show"]);
      return Promise.resolve();
    },
    clearNotification() {
      calls.push(["clear-notification"]);
      return Promise.resolve();
    },
    showBadge() {
      calls.push(["show-badge"]);
      return Promise.resolve();
    },
    clearBadge() {
      calls.push(["clear-badge"]);
      return Promise.resolve();
    },
    saveNotifiedDueAt(dueAt) {
      calls.push(["save-marker", dueAt]);
      return Promise.resolve();
    },
  };

  await executeBreakNotificationPlan(
    { action: "schedule", dueAt: NOW + 1_000 },
    actions
  );
  assert.deepEqual(calls.splice(0), [
    ["schedule", NOW + 1_000],
    ["clear-notification"],
    ["clear-badge"],
  ]);

  await executeBreakNotificationPlan(
    { action: "notify", dueAt: NOW },
    actions
  );
  assert.deepEqual(calls.splice(0), [
    ["clear-alarm"],
    ["show"],
    ["show-badge"],
    ["save-marker", NOW],
  ]);

  await executeBreakNotificationPlan(
    { action: "visible", dueAt: NOW },
    actions
  );
  assert.deepEqual(calls.splice(0), [
    ["clear-alarm"],
    ["clear-notification"],
    ["show-badge"],
    ["save-marker", NOW],
  ]);

  await executeBreakNotificationPlan(
    { action: "inactive", dueAt: null },
    actions
  );
  assert.deepEqual(calls, [
    ["clear-alarm"],
    ["clear-notification"],
    ["clear-badge"],
  ]);
});

test("notification opt-in dispatches its save before Chrome can close the popup", async () => {
  const calls = [];
  let finishSave;
  let finishPermission;
  const pending = beginBreakNotificationOptIn({
    saveEnabled(value) {
      calls.push(["save", value]);
      return new Promise((resolve) => {
        finishSave = resolve;
      });
    },
    requestPermission() {
      calls.push(["permission"]);
      return new Promise((resolve) => {
        finishPermission = resolve;
      });
    },
  });

  assert.deepEqual(calls, [["save", true], ["permission"]]);
  finishSave(true);
  finishPermission(true);
  assert.deepEqual(await pending, { saved: true, granted: true });
});

test("the opt-in notification setting persists, synchronizes, and fails safely", async () => {
  const store = mockChromeStorage();
  const observed = [];
  const stop = onPersonalBreakNotificationsChanged((value) =>
    observed.push(value)
  );

  await savePersonalBreakNotifications(true);
  stop();
  assert.equal(await loadPersonalBreakNotifications(), true);
  assert.equal(store[PERSONAL_BREAK_NOTIFICATIONS_KEY], true);
  assert.deepEqual(observed, [true]);

  mockChromeStorage(store, { failSet: true });
  await assert.rejects(savePersonalBreakNotifications(false));
  assert.equal(store[PERSONAL_BREAK_NOTIFICATIONS_KEY], true);
});

test("manifest and UI keep notifications optional, Private, and privacy-safe", () => {
  const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
  const browser = readFileSync("src/platform/browser.js", "utf8");
  const taskList = readFileSync("src/shared/task-list.js", "utf8");
  const timerModel = readFileSync("src/shared/break-clock.js", "utf8");

  assert.ok(manifest.permissions.includes("alarms"));
  assert.ok(manifest.optional_permissions.includes("notifications"));
  assert.equal(manifest.permissions.includes("notifications"), false);
  assert.match(browser, /silent: true/);
  assert.match(browser, /setBadgeText\(\{ text: "!" \}\)/);
  assert.match(browser, /Break time is ready\. Open CueDone to Show or Skip\./);
  assert.doesNotMatch(browser, /TASKS_STORAGE_KEY|customSuggestions/);
  assert.match(taskList, /Notify me when CueDone is closed/);
  assert.match(
    taskList,
    /requestPermission: requestBreakNotificationPermission/
  );
  assert.match(taskList, /if \(!breakClockAllowed\(\)\)/);
  assert.doesNotMatch(timerModel, /chrome\.|document\.|notifications|alarms/);
});

test("Chrome side-panel closure overrides a stale visible port", () => {
  const runtimeConnect = eventChannel();
  const sideOpened = eventChannel();
  const sideClosed = eventChannel();
  globalThis.chrome = {
    runtime: { onConnect: runtimeConnect },
    sidePanel: { onOpened: sideOpened, onClosed: sideClosed },
  };
  const observed = [];
  onBreakClockViewVisibilityChanged((visible) => observed.push(visible));

  const messages = eventChannel();
  const disconnected = eventChannel();
  const port = {
    name: "cuedone.breakClockView",
    sender: {
      url: "chrome-extension://example/src/sidepanel/sidepanel.html",
    },
    onMessage: messages,
    onDisconnect: disconnected,
  };
  runtimeConnect.emit(port);
  messages.emit({ visible: true });
  assert.equal(observed.at(-1), true);

  sideClosed.emit({ windowId: 1 });
  assert.equal(observed.at(-1), false);

  messages.emit({ visible: true });
  assert.equal(
    observed.at(-1),
    false,
    "a retained side-panel document must not suppress the closed-view alert"
  );

  sideOpened.emit({ windowId: 1 });
  assert.equal(observed.at(-1), true);
});

test("a retained but unfocused browser view cannot suppress a closed-view alert", () => {
  assert.equal(
    browserViewIsActive({ visibilityState: "visible", hasFocus: () => true }),
    true
  );
  assert.equal(
    browserViewIsActive({ visibilityState: "visible", hasFocus: () => false }),
    false
  );
  assert.equal(
    browserViewIsActive({ visibilityState: "hidden", hasFocus: () => true }),
    false
  );
});
