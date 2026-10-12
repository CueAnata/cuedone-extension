import assert from "node:assert/strict";
import test from "node:test";
import {
  PERSONAL_BREAK_NOTIFICATIONS_KEY,
  PERSONAL_BREAK_TIMER_KEY,
  PERSONAL_ENDING_KEY,
  PERSONAL_PRESENTATION_KEY,
  PRESENTATION_MODE_KEY,
} from "../src/shared/preferences.js";

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

function installBackgroundChrome(initial, { permissionGranted = true } = {}) {
  const store = { ...initial };
  const storageChanged = eventChannel();
  const alarmEvent = eventChannel();
  const permissionAdded = eventChannel();
  const permissionRemoved = eventChannel();
  const notifications = [];
  const clearedNotifications = [];
  const badgeTexts = [];
  const alarms = [];
  let permissionRequests = 0;

  globalThis.chrome = {
    storage: {
      local: {
        get(keys) {
          const requested = Array.isArray(keys) ? keys : [keys];
          return Promise.resolve(
            Object.fromEntries(requested.map((key) => [key, store[key]]))
          );
        },
        set(values) {
          const changes = Object.fromEntries(
            Object.entries(values).map(([key, newValue]) => [
              key,
              { oldValue: store[key], newValue },
            ])
          );
          Object.assign(store, values);
          storageChanged.emit(changes, "local");
          return Promise.resolve();
        },
      },
      onChanged: storageChanged,
    },
    permissions: {
      contains() {
        return Promise.resolve(permissionGranted);
      },
      request() {
        permissionRequests += 1;
        return Promise.resolve(true);
      },
      onAdded: permissionAdded,
      onRemoved: permissionRemoved,
    },
    alarms: {
      create(name, info) {
        alarms.push({ name, ...info });
        return Promise.resolve();
      },
      get(name) {
        const alarm = alarms.find((item) => item.name === name);
        return Promise.resolve(
          alarm ? { ...alarm, scheduledTime: alarm.when } : undefined
        );
      },
      clear() {
        return Promise.resolve(true);
      },
      onAlarm: alarmEvent,
    },
    notifications: {
      getPermissionLevel() {
        return Promise.resolve(permissionGranted ? "granted" : "denied");
      },
      create(id, options) {
        notifications.push({ id, options });
        return Promise.resolve(id);
      },
      clear(id) {
        clearedNotifications.push(id);
        return Promise.resolve(true);
      },
      onClicked: eventChannel(),
    },
    runtime: {
      onInstalled: eventChannel(),
      onStartup: eventChannel(),
      onConnect: eventChannel(),
    },
    action: {
      setPopup() {
        return Promise.resolve();
      },
      openPopup() {
        return Promise.resolve();
      },
      onClicked: eventChannel(),
      setBadgeBackgroundColor() {
        return Promise.resolve();
      },
      setBadgeTextColor() {
        return Promise.resolve();
      },
      setBadgeText({ text }) {
        badgeTexts.push(text);
        return Promise.resolve();
      },
    },
    sidePanel: {
      setPanelBehavior() {
        return Promise.resolve();
      },
      open() {
        return Promise.resolve();
      },
      onOpened: eventChannel(),
      onClosed: eventChannel(),
    },
  };

  return {
    store,
    alarms,
    notifications,
    clearedNotifications,
    badgeTexts,
    get permissionRequests() {
      return permissionRequests;
    },
    grantNotifications() {
      permissionGranted = true;
      permissionAdded.emit({ permissions: ["notifications"] });
    },
  };
}

function flushBackground() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

test("service worker shows one privacy-safe alert when a Private due timer has no open view", async () => {
  const dueAt = Date.now() - 1_000;
  const fake = installBackgroundChrome({
    [PERSONAL_BREAK_NOTIFICATIONS_KEY]: true,
    [PERSONAL_BREAK_TIMER_KEY]: {
      version: 1,
      clock: {
        enabled: true,
        intervalMinutes: 15,
        dueAt,
        pausedRemainingMs: null,
        revealedSuggestion: "",
      },
      suggestionSource: "custom",
      customSuggestions: [
        { id: "private", text: "Confidential custom suggestion" },
      ],
    },
    [PERSONAL_ENDING_KEY]: { kind: "none", text: "" },
    [PERSONAL_PRESENTATION_KEY]: "private",
    [PRESENTATION_MODE_KEY]: "personal",
  });

  await import(`../src/background.js?closed-view=${Date.now()}`);
  await flushBackground();
  await flushBackground();

  assert.equal(fake.notifications.length, 1);
  assert.equal(fake.notifications[0].options.silent, true);
  assert.equal(
    fake.notifications[0].options.message,
    "Break time is ready. Open CueDone to Show or Skip."
  );
  assert.doesNotMatch(
    JSON.stringify(fake.notifications[0]),
    /Confidential|custom suggestion/i
  );
  assert.equal(fake.store["cuedone.personalBreakNotificationDueAt"], dueAt);
  assert.equal(fake.badgeTexts.at(-1), "!");
  assert.equal(fake.permissionRequests, 0);

  await chrome.storage.local.set({ [PERSONAL_PRESENTATION_KEY]: "public" });
  await flushBackground();
  assert.ok(fake.clearedNotifications.length > 0);
  assert.equal(fake.badgeTexts.at(-1), "");
});

test("service worker schedules after a Top-popup permission grant completes", async () => {
  const dueAt = Date.now() + 60_000;
  const fake = installBackgroundChrome(
    {
      [PERSONAL_BREAK_TIMER_KEY]: {
        version: 1,
        clock: {
          enabled: true,
          intervalMinutes: 1,
          dueAt,
          pausedRemainingMs: null,
          revealedSuggestion: "",
        },
        suggestionSource: "choose-for-me",
        customSuggestions: [],
      },
      [PERSONAL_ENDING_KEY]: { kind: "none", text: "" },
      [PERSONAL_PRESENTATION_KEY]: "private",
      [PRESENTATION_MODE_KEY]: "personal",
    },
    { permissionGranted: false }
  );

  await import(`../src/background.js?popup-permission=${Date.now()}`);
  await flushBackground();

  await chrome.storage.local.set({ [PERSONAL_BREAK_NOTIFICATIONS_KEY]: true });
  fake.grantNotifications();
  await flushBackground();
  await flushBackground();

  assert.equal(fake.store[PERSONAL_BREAK_NOTIFICATIONS_KEY], true);
  assert.ok(
    fake.alarms.some(
      (alarm) => alarm.name === "cuedone.breakNotification" && alarm.when === dueAt
    )
  );
  assert.equal(fake.permissionRequests, 0);
});
