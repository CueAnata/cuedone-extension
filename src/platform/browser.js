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
const CLOSE_SIDE_VIEW = "cuedone.closeSideView";
export const BREAK_NOTIFICATION_ALARM = "cuedone.breakNotification";
export const BREAK_NOTIFICATION_ID = "cuedone.breakReady";
const BREAK_CLOCK_VIEW_PORT = "cuedone.breakClockView";

export function getLocal(keys) {
  return chrome.storage.local.get(keys);
}

export function setLocal(values) {
  return chrome.storage.local.set(values);
}

export function onLocalChanged(listener) {
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
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
  if (typeof chrome.permissions?.request !== "function") {
    return Promise.resolve(false);
  }

  return chrome.permissions
    .request({ permissions: ["notifications"] })
    .then((granted) => {
      if (!granted || typeof chrome.notifications?.getPermissionLevel !== "function") {
        return granted;
      }
      return chrome.notifications
        .getPermissionLevel()
        .then((level) => level === "granted");
    })
    .catch(() => false);
}

export function hasBreakNotificationPermission() {
  if (typeof chrome.permissions?.contains !== "function") {
    return Promise.resolve(false);
  }

  return chrome.permissions
    .contains({ permissions: ["notifications"] })
    .then((granted) => {
      if (!granted || typeof chrome.notifications?.getPermissionLevel !== "function") {
        return granted;
      }
      return chrome.notifications
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
  chrome.permissions?.onAdded?.addListener(onChanged);
  chrome.permissions?.onRemoved?.addListener(onChanged);
}

export function scheduleBreakNotificationAlarm(when) {
  const result = chrome.alarms.create(BREAK_NOTIFICATION_ALARM, { when });
  return Promise.resolve(result)
    .then(() => chrome.alarms.get(BREAK_NOTIFICATION_ALARM))
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
  return chrome.alarms.clear(BREAK_NOTIFICATION_ALARM);
}

export function onBreakNotificationAlarm(handler) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === BREAK_NOTIFICATION_ALARM) {
      handler(alarm);
    }
  });
}

export function showBreakNotification() {
  return chrome.notifications
    .create(BREAK_NOTIFICATION_ID, {
      type: "basic",
      iconUrl: "icons/icon128.png",
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
}

export function clearBreakNotification() {
  if (typeof chrome.permissions?.contains !== "function") {
    return Promise.resolve(false);
  }
  return chrome.permissions
    .contains({ permissions: ["notifications"] })
    .then((granted) =>
      granted ? chrome.notifications.clear(BREAK_NOTIFICATION_ID) : false
    )
    .catch(() => false);
}

export function showBreakToolbarBadge() {
  return Promise.all([
    chrome.action.setBadgeBackgroundColor({ color: "#f4a340" }),
    chrome.action.setBadgeTextColor?.({ color: "#111111" }) ??
      Promise.resolve(),
    chrome.action.setBadgeText({ text: "!" }),
  ]);
}

export function clearBreakToolbarBadge() {
  return chrome.action.setBadgeText({ text: "" });
}

export function onBreakNotificationClicked(handler) {
  chrome.notifications?.onClicked?.addListener((notificationId) => {
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
  if (typeof chrome.runtime?.connect !== "function") {
    return () => {};
  }

  const port = chrome.runtime.connect({ name: BREAK_CLOCK_VIEW_PORT });
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

  chrome.runtime.onConnect.addListener((port) => {
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

  chrome.sidePanel?.onOpened?.addListener(() => {
    sidePanelState = "open";
    report();
  });
  chrome.sidePanel?.onClosed?.addListener(() => {
    sidePanelState = "closed";
    report();
  });
}

export function canOpenTopViewFromToolbar() {
  return typeof chrome.action?.openPopup === "function";
}

export function canOpenSideViewFromToolbar() {
  return typeof chrome.sidePanel?.open === "function";
}

export function setToolbarPopup(enabled) {
  const popupReady = chrome.action.setPopup({
    popup: enabled ? POPUP_PATH : "",
  });
  const behaviorReady =
    typeof chrome.sidePanel?.setPanelBehavior === "function"
      ? chrome.sidePanel.setPanelBehavior({
          openPanelOnActionClick: !enabled,
        })
      : Promise.resolve();

  return Promise.all([popupReady, behaviorReady]);
}

export function onToolbarClick(handler) {
  chrome.action.onClicked.addListener(handler);
}

export function onExtensionStart(handler) {
  chrome.runtime.onInstalled.addListener(handler);
  chrome.runtime.onStartup.addListener(handler);
}

export function onCloseSideViewRequest(handler) {
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type === CLOSE_SIDE_VIEW) {
      handler();
    }
  });
}

export function openTopView() {
  return setToolbarPopup(true).then(() => {
    if (!canOpenTopViewFromToolbar()) {
      return;
    }

    return chrome.action.openPopup().catch(() => undefined);
  });
}

function windowIdFrom(windowId) {
  if (windowId != null) {
    return Promise.resolve(windowId);
  }

  return chrome.windows.getCurrent().then((currentWindow) => currentWindow.id);
}

export function openSideView(windowId) {
  return windowIdFrom(windowId).then((id) =>
    chrome.sidePanel.open({ windowId: id })
  );
}

export function closeSideView(windowId) {
  const notifySidePage = () =>
    chrome.runtime.sendMessage({ type: CLOSE_SIDE_VIEW }).catch(() => {
      // No side panel page is open to receive the message.
    });

  if (typeof chrome.sidePanel?.close !== "function") {
    return notifySidePage();
  }

  return windowIdFrom(windowId)
    .then((id) => chrome.sidePanel.close({ windowId: id }))
    .catch(notifySidePage);
}
