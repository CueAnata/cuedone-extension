/**
 * Chromium browser adapter for Chrome and Edge.
 *
 * This is the only CueDone source file that may call `chrome.*`.
 * Shared task model and UI import from here instead of using browser APIs
 * directly, so the app is not duplicated per Chromium browser.
 */
export async function getLocal(keys) {
  return chrome.storage.local.get(keys);
}

export async function setLocal(values) {
  return chrome.storage.local.set(values);
}

export function onLocalChanged(listener) {
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}

export async function openSidePanel() {
  const currentWindow = await chrome.windows.getCurrent();
  await chrome.sidePanel.open({ windowId: currentWindow.id });
}
