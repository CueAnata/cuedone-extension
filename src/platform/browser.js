/**
 * Chromium browser adapter for Chrome and Edge.
 *
 * This is the only CueDone source file that may call `chrome.*`.
 * Shared task model and UI import from here instead of using browser APIs
 * directly, so the app is not duplicated per Chromium browser.
 *
 * This file is part of the service-worker module graph, so it must not use
 * `await` (top-level or otherwise). Return promises instead.
 */
export const POPUP_PATH = "src/popup/popup.html";
globalThis.browser = globalThis.browser;
globalThis.chrome = globalThis.chrome;
const extensionAPI = typeof browser !== 'undefined' ? browser : chrome;
const CLOSE_SIDE_VIEW = "cuedone.closeSideView";
export const BREAK_NOTIFICATION_ALARM = "cuedone.breakNotification";
export const BREAK_NOTIFICATION_ID = "cuedone.breakReady";
const BREAK_CLOCK_VIEW_PORT = "cuedone.breakClockView";

function isExtensionStorageAvailable() {
  return typeof globalThis.chrome !== "undefined" && !!globalThis.chrome.storage?.local;
}

function webGetLocal(keys) {
  const result = {};
  const wantKeys = Array.isArray(keys) ? keys : typeof keys === "string" ? [keys] : keys ? Object.keys(keys) : [];
  // If keys is an object with defaults, use defaults for missing values
  const defaults = keys && !Array.isArray(keys) && typeof keys === "object" ? keys : null;
  for (const key of wantKeys) {
    try {
      const raw = globalThis.localStorage?.getItem(key);
      if (raw != null) result[key] = JSON.parse(raw);
      else if (defaults && key in defaults) result[key] = defaults[key];
    } catch {
      if (defaults && key in defaults) result[key] = defaults[key];
    }
  }
  // Also support string key
  if (typeof keys === "string") {
    if (!(keys in result) && defaults && keys in defaults) result[keys] = defaults[keys];
  }
  return Promise.resolve(result);
}

function webSetLocal(values) {
  for (const [key, value] of Object.entries(values)) {
    try {
      globalThis.localStorage?.setItem(key, JSON.stringify(value));
    } catch {}
  }
  // Notify web listeners
  webNotifyChanged(values);
  return Promise.resolve();
}

const webListeners = new Set();
function webNotifyChanged(values) {
  const changes = {};
  for (const [key, value] of Object.entries(values)) changes[key] = { newValue: value };
  for (const listener of webListeners) {
    try { listener(changes, "local"); } catch {}
  }
}

export function getLocal(keys) {
  if (isExtensionStorageAvailable()) return globalThis.chrome.storage.local.get(keys);
  return webGetLocal(keys);
}

export function setLocal(values) {
  if (isExtensionStorageAvailable()) return globalThis.chrome.storage.local.set(values);
  return webSetLocal(values);
}

export function onLocalChanged(listener) {
  if (isExtensionStorageAvailable()) {
    globalThis.chrome.storage.onChanged.addListener(listener);
    return () => globalThis.chrome.storage.onChanged.removeListener(listener);
  }
  webListeners.add(listener);
  return () => webListeners.delete(listener);
}

export function scheduleBrowserAlarm(delayMs, handler) {
  const delay = Number.isFinite(delayMs)
    ? Math.min(2_147_000_000, Math.max(0, delayMs))
    : 0;
  const timer = globalThis.setTimeout(handler, delay);
  return () => globalThis.clearTimeout(timer);
}

export function onBrowserViewResumed(handler) {
  const documentRef = globalThis.document;
  const onFocus = () => handler();
  const onVisibilityChange = () => {
    if (documentRef?.visibilityState === "visible") {
      handler();
    }
  };

  globalThis.addEventListener?.("focus", onFocus);
  documentRef?.addEventListener?.("visibilitychange", onVisibilityChange);

  return () => {
    globalThis.removeEventListener?.("focus", onFocus);
    documentRef?.removeEventListener?.("visibilitychange", onVisibilityChange);
  };
}

export function requestBreakNotificationPermission() {
  if (typeof globalThis.chrome?.permissions?.request !== "function") {
    return Promise.resolve(false);
  }

  return globalThis.chrome.permissions
    .request({ permissions: ["notifications"] })
    .then((granted) => {
      if (!granted || typeof globalThis.chrome.notifications?.getPermissionLevel !== "function") {
        return granted;
      }
      return globalThis.chrome.notifications
        .getPermissionLevel()
        .then((level) => level === "granted");
    })
    .catch(() => false);
}

export function hasBreakNotificationPermission() {
  if (typeof globalThis.chrome?.permissions?.contains !== "function") {
    return Promise.resolve(false);
  }

  return globalThis.chrome.permissions
    .contains({ permissions: ["notifications"] })
    .then((granted) => {
      if (!granted || typeof globalThis.chrome.notifications?.getPermissionLevel !== "function") {
        return granted;
      }
      return globalThis.chrome.notifications
        .getPermissionLevel()
        .then((level) => level === "granted");
    })
    .catch(() => false);
}

export function onBreakNotificationPermissionChanged(handler) {
  const onChanged = (permissions) => {
    if (permissions.permissions?.includes("notifications")) {
      handler();
    }
  };
  globalThis.chrome.permissions?.onAdded?.addListener(onChanged);
  globalThis.chrome.permissions?.onRemoved?.addListener(onChanged);
}

export function scheduleBreakNotificationAlarm(when) {
  if (typeof globalThis.chrome === "undefined" || !globalThis.chrome.alarms?.create) return Promise.resolve(null);
  const result = globalThis.chrome.alarms.create(BREAK_NOTIFICATION_ALARM, { when });
  return Promise.resolve(result)
    .then(() => globalThis.chrome.alarms.get(BREAK_NOTIFICATION_ALARM))
    .then((alarm) => {
      if (!alarm) {
        throw new Error("Chrome did not retain the CueDone break alarm.");
      }
      console.info("CueDone break alarm scheduled", {
        scheduledTime: alarm.scheduledTime,
      });
      return alarm;
    });
}

export function clearBreakNotificationAlarm() {
  if (typeof globalThis.chrome === "undefined" || !globalThis.chrome.alarms?.clear) return Promise.resolve(false);
  return globalThis.chrome.alarms.clear(BREAK_NOTIFICATION_ALARM);
}

export function onBreakNotificationAlarm(handler) {
  if (typeof globalThis.chrome === "undefined" || !globalThis.chrome.alarms?.onAlarm) return () => {};
  globalThis.chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === BREAK_NOTIFICATION_ALARM) {
      handler(alarm);
    }
  });
}

export function showBreakNotification() {
  if (typeof globalThis.chrome === "undefined" || !globalThis.chrome.notifications?.create) return Promise.resolve(null);
  const iconUrl =
    typeof globalThis.chrome.runtime?.getURL === "function"
      ? globalThis.chrome.runtime.getURL("icons/icon128.png")
      : "icons/icon128.png";
  const fallbackIconUrl =
    typeof globalThis.chrome.runtime?.getURL === "function"
      ? globalThis.chrome.runtime.getURL("icons/icon48.png")
      : "icons/icon48.png";
  const createWithIcon = (url) =>
    globalThis.chrome.notifications
      .create(BREAK_NOTIFICATION_ID, {
        type: "basic",
        iconUrl: url,
        title: "CueDone break time",
        message: "Break time is ready. Open CueDone to Show or Skip.",
        silent: true,
        priority: 0,
        requireInteraction: true,
      })
      .then((notificationId) => {
        console.info("CueDone break notification created", { notificationId });
        return notificationId;
      });
  return createWithIcon(iconUrl).catch((error) => {
    const message = String(error?.message || error || "");
    if (
      message.includes("Unable to download") ||
      message.includes("iconUrl") ||
      message.includes("image")
    ) {
      console.warn("CueDone break notification icon failed, retrying with fallback", {
        attemptedIconUrl: iconUrl,
        fallbackIconUrl,
        error: message,
      });
      return createWithIcon(fallbackIconUrl).catch((fallbackError) => {
        console.warn("CueDone break notification fallback also failed; suppressing to protect service worker", {
          fallbackIconUrl,
          error: String(fallbackError?.message || fallbackError || ""),
        });
        return null;
      });
    }
    throw error;
  });
}

export function clearBreakNotification() {
  if (typeof globalThis.chrome?.permissions?.contains !== "function") {
    return Promise.resolve(false);
  }
  return globalThis.chrome.permissions
    .contains({ permissions: ["notifications"] })
    .then((granted) =>
      granted ? globalThis.chrome.notifications.clear(BREAK_NOTIFICATION_ID) : false
    )
    .catch(() => false);
}

export function showBreakToolbarBadge() {
  if (typeof globalThis.chrome === "undefined" || !globalThis.chrome.action?.setBadgeBackgroundColor) return Promise.resolve();
  return Promise.all([
    globalThis.chrome.action.setBadgeBackgroundColor({ color: "#f4a340" }),
    globalThis.chrome.action.setBadgeTextColor?.({ color: "#111111" }) ??
      Promise.resolve(),
    globalThis.chrome.action.setBadgeText({ text: "!" }),
  ]);
}

export function clearBreakToolbarBadge() {
  if (typeof globalThis.chrome === "undefined" || !globalThis.chrome.action?.setBadgeText) return Promise.resolve();
  return globalThis.chrome.action.setBadgeText({ text: "" });
}

export function onBreakNotificationClicked(handler) {
  if (typeof globalThis.chrome === "undefined" || !globalThis.chrome.notifications?.onClicked) return () => {};
  globalThis.chrome.notifications?.onClicked?.addListener((notificationId) => {
    if (notificationId === BREAK_NOTIFICATION_ID) {
      handler();
    }
  });
}

export function browserViewIsActive(documentRef = globalThis.document) {
  if (!documentRef || documentRef.visibilityState === "hidden") {
    return false;
  }

  return typeof documentRef.hasFocus === "function"
    ? documentRef.hasFocus()
    : true;
}

export function connectBreakClockView() {
  if (typeof globalThis.chrome?.runtime?.connect !== "function") {
    return () => {};
  }

  const port = globalThis.chrome.runtime.connect({ name: BREAK_CLOCK_VIEW_PORT });
  const documentRef = globalThis.document;
  const reportVisibility = () => {
    try {
      port.postMessage({
        visible: browserViewIsActive(documentRef),
      });
    } catch {
      // The service worker or view closed between visibility updates.
    }
  };
  const reportClosed = () => {
    try {
      port.postMessage({ visible: false });
    } catch {
      // The service worker or view closed before the page lifecycle event.
    }
  };

  documentRef?.addEventListener?.("visibilitychange", reportVisibility);
  globalThis.addEventListener?.("focus", reportVisibility);
  globalThis.addEventListener?.("blur", reportVisibility);
  globalThis.addEventListener?.("pagehide", reportClosed);
  globalThis.addEventListener?.("beforeunload", reportClosed);
  reportVisibility();

  return () => {
    documentRef?.removeEventListener?.("visibilitychange", reportVisibility);
    globalThis.removeEventListener?.("focus", reportVisibility);
    globalThis.removeEventListener?.("blur", reportVisibility);
    globalThis.removeEventListener?.("pagehide", reportClosed);
    globalThis.removeEventListener?.("beforeunload", reportClosed);
    try {
      port.disconnect();
    } catch {
      // The page lifecycle already disconnected this view.
    }
  };
}

export function onBreakClockViewVisibilityChanged(handler) {
  if (typeof globalThis.chrome === "undefined" || !globalThis.chrome.runtime?.onConnect) return () => {};
  const viewVisibility = new Map();
  let sidePanelState = "unknown";
  const report = () =>
    handler(
      [...viewVisibility.values()].some(
        (view) =>
          view.visible &&
          (view.kind !== "side" || sidePanelState !== "closed")
      )
    );

  globalThis.chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== BREAK_CLOCK_VIEW_PORT) {
      return;
    }

    const kind = port.sender?.url?.includes("/sidepanel/") ? "side" : "top";
    if (kind === "side") {
      sidePanelState = "open";
    }
    viewVisibility.set(port, { kind, visible: false });
    port.onMessage.addListener((message) => {
      viewVisibility.set(port, { kind, visible: message?.visible === true });
      report();
    });
    port.onDisconnect.addListener(() => {
      viewVisibility.delete(port);
      report();
    });
  });

  globalThis.chrome.sidePanel?.onOpened?.addListener(() => {
    sidePanelState = "open";
    report();
  });
  globalThis.chrome.sidePanel?.onClosed?.addListener(() => {
    sidePanelState = "closed";
    report();
  });
}

export function canOpenTopViewFromToolbar() {
  if (typeof globalThis.chrome === "undefined") return false;
  return typeof globalThis.chrome.action?.openPopup === "function";
}

export function canOpenSideViewFromToolbar() {
  if (typeof globalThis.chrome === "undefined") return false;
  return typeof globalThis.chrome.sidePanel?.open === "function";
}

export function setToolbarPopup(enabled) {
  if (typeof globalThis.chrome === "undefined" || !globalThis.chrome.action?.setPopup) return Promise.resolve();
  const popupReady = globalThis.chrome.action.setPopup({
    popup: enabled ? POPUP_PATH : "",
  });
  const behaviorReady =
    typeof globalThis.chrome.sidePanel?.setPanelBehavior === "function"
      ? globalThis.chrome.sidePanel.setPanelBehavior({
          openPanelOnActionClick: !enabled,
        })
      : Promise.resolve();

  return Promise.all([popupReady, behaviorReady]);
}

export function onToolbarClick(handler) {
  if (typeof globalThis.chrome === "undefined" || !globalThis.chrome.action?.onClicked) return () => {};
  globalThis.chrome.action.onClicked.addListener(handler);
}

export function onExtensionStart(handler) {
  if (typeof globalThis.chrome === "undefined" || !globalThis.chrome.runtime?.onInstalled) return () => {};
  globalThis.chrome.runtime.onInstalled.addListener(handler);
  globalThis.chrome.runtime.onStartup.addListener(handler);
}

export function onCloseSideViewRequest(handler) {
  if (typeof globalThis.chrome === "undefined" || !globalThis.chrome.runtime?.onMessage) return () => {};
  globalThis.chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === CLOSE_SIDE_VIEW) {
      handler();
    }
  });
}

export function openTopView() {
  if (typeof globalThis.chrome === "undefined") return Promise.resolve();
  return setToolbarPopup(true).then(() => {
    if (!canOpenTopViewFromToolbar()) {
      return;
    }

    return globalThis.chrome.action.openPopup().catch(() => undefined);
  });
}

function windowIdFrom(windowId) {
  if (typeof globalThis.chrome === "undefined" || !globalThis.chrome.windows?.getCurrent) return Promise.resolve(undefined);
  if (windowId != null) {
    return Promise.resolve(windowId);
  }

  return globalThis.chrome.windows.getCurrent().then((currentWindow) => currentWindow.id);
}

export function openSideView(windowId) {
  if (typeof globalThis.chrome === "undefined" || !globalThis.chrome.sidePanel?.open) return Promise.resolve();
  return windowIdFrom(windowId).then((id) =>
    globalThis.chrome.sidePanel.open({ windowId: id })
  );
}

export function closeSideView(windowId) {
  if (typeof globalThis.chrome === "undefined") return Promise.resolve();
  const notifySidePage = () =>
    globalThis.chrome.runtime.sendMessage({ type: CLOSE_SIDE_VIEW }).catch(() => {
      // No side panel page is open to receive the message.
    });

  if (typeof globalThis.chrome.sidePanel?.close !== "function") {
    return notifySidePage();
  }

  return windowIdFrom(windowId)
    .then((id) => globalThis.chrome.sidePanel.close({ windowId: id }))
    .catch(notifySidePage);
}
