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
