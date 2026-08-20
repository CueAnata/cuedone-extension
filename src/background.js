import {
  canOpenSideViewFromToolbar,
  onExtensionStart,
  onToolbarClick,
  openSideView,
  openTopView,
  setToolbarPopup,
} from "./platform/browser.js";
import {
  loadPreferredView,
  onPreferredViewChanged,
  shouldAssignToolbarPopup,
} from "./shared/preferences.js";

function reportBackgroundError(error) {
  console.error("CueDone service worker failed", error);
}

function syncToolbarPopup(preferredView) {
  return setToolbarPopup(
    shouldAssignToolbarPopup(preferredView, canOpenSideViewFromToolbar())
  );
}

function handleToolbarClick(tab) {
  return loadPreferredView().then((preferredView) => {
    if (shouldAssignToolbarPopup(preferredView, canOpenSideViewFromToolbar())) {
      return openTopView();
    }

    return setToolbarPopup(false).then(() =>
      openSideView(tab?.windowId).catch(() => undefined)
    );
  });
}

function initialize() {
  onExtensionStart(() => {
    loadPreferredView().then(syncToolbarPopup).catch(reportBackgroundError);
  });
  onPreferredViewChanged((preferredView) => {
    syncToolbarPopup(preferredView).catch(reportBackgroundError);
  });
  onToolbarClick((tab) => {
    handleToolbarClick(tab).catch(reportBackgroundError);
  });
  return loadPreferredView().then(syncToolbarPopup);
}

initialize().catch(reportBackgroundError);
