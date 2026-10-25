import {
  canOpenSideViewFromToolbar,
  clearBreakToolbarBadge,
  clearBreakNotification,
  clearBreakNotificationAlarm,
  getLocal,
  hasBreakNotificationPermission,
  onBreakClockViewVisibilityChanged,
  onBreakNotificationAlarm,
  onBreakNotificationClicked,
  onBreakNotificationPermissionChanged,
  onExtensionStart,
  onLocalChanged,
  onToolbarClick,
  openSideView,
  openTopView,
  scheduleBreakNotificationAlarm,
  setLocal,
  setToolbarPopup,
  showBreakToolbarBadge,
  showBreakNotification,
} from "./platform/browser.js";
import {
  executeBreakNotificationPlan,
  planBreakNotification,
} from "./platform/break-notifications.js";
import {
  PERSONAL_BREAK_NOTIFICATIONS_KEY,
  PERSONAL_BREAK_NOTIFIED_DUE_AT_KEY,
  PERSONAL_BREAK_TIMER_KEY,
  PERSONAL_ENDING_KEY,
  PERSONAL_PRESENTATION_KEY,
  PRESENTATION_MODE_KEY,
  loadPreferredView,
  normalizePersonalBreakNotifications,
  normalizePersonalPresentation,
  normalizePresentationMode,
  onPreferredViewChanged,
  shouldAssignToolbarPopup,
} from "./shared/preferences.js";
import { normalizeEndingState } from "./shared/personal-messages.js";

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

let breakViewVisible = false;

function loadBreakNotificationState() {
  const keys = [
    PERSONAL_BREAK_NOTIFICATIONS_KEY,
    PERSONAL_BREAK_NOTIFIED_DUE_AT_KEY,
    PERSONAL_BREAK_TIMER_KEY,
    PERSONAL_ENDING_KEY,
    PERSONAL_PRESENTATION_KEY,
    PRESENTATION_MODE_KEY,
  ];

  return Promise.all([getLocal(keys), hasBreakNotificationPermission()]).then(
    ([data, permissionGranted]) => ({
      enabled: normalizePersonalBreakNotifications(
        data[PERSONAL_BREAK_NOTIFICATIONS_KEY]
      ),
      permissionGranted,
      presentationMode: normalizePresentationMode(data[PRESENTATION_MODE_KEY]),
      personalPresentation: normalizePersonalPresentation(
        data[PERSONAL_PRESENTATION_KEY]
      ),
      endingKind: normalizeEndingState(data[PERSONAL_ENDING_KEY]).kind,
      timer: data[PERSONAL_BREAK_TIMER_KEY],
      notifiedDueAt: data[PERSONAL_BREAK_NOTIFIED_DUE_AT_KEY],
      viewVisible: breakViewVisible,
    })
  );
}

function reconcileBreakNotification(reason = "state") {
  return loadBreakNotificationState().then((state) => {
    const plan = planBreakNotification(state);
    console.info("CueDone break notification plan", {
      reason,
      action: plan.action,
      dueAt: plan.dueAt,
      permissionGranted: state.permissionGranted,
      viewVisible: state.viewVisible,
    });
    return executeBreakNotificationPlan(plan, {
      scheduleAlarm: scheduleBreakNotificationAlarm,
      clearAlarm: clearBreakNotificationAlarm,
      showNotification: showBreakNotification,
      clearNotification: clearBreakNotification,
      showBadge: showBreakToolbarBadge,
      clearBadge: clearBreakToolbarBadge,
      saveNotifiedDueAt: (dueAt) =>
        setLocal({ [PERSONAL_BREAK_NOTIFIED_DUE_AT_KEY]: dueAt }),
    });
  });
}

function isBreakNotificationChange(changes) {
  return [
    PERSONAL_BREAK_NOTIFICATIONS_KEY,
    PERSONAL_BREAK_NOTIFIED_DUE_AT_KEY,
    PERSONAL_BREAK_TIMER_KEY,
    PERSONAL_ENDING_KEY,
    PERSONAL_PRESENTATION_KEY,
    PRESENTATION_MODE_KEY,
  ].some((key) => changes[key]);
}

function initialize() {
  onExtensionStart(() => {
    loadPreferredView().then(syncToolbarPopup).catch(reportBackgroundError);
    reconcileBreakNotification("extension-start").catch(reportBackgroundError);
  });
  onPreferredViewChanged((preferredView) => {
    syncToolbarPopup(preferredView).catch(reportBackgroundError);
  });
  onToolbarClick((tab) => {
    handleToolbarClick(tab).catch(reportBackgroundError);
  });
  onLocalChanged((changes, areaName) => {
    if (areaName === "local" && isBreakNotificationChange(changes)) {
      reconcileBreakNotification("storage-change").catch(reportBackgroundError);
    }
  });
  onBreakNotificationAlarm((alarm) => {
    console.info("CueDone break alarm fired", {
      scheduledTime: alarm.scheduledTime,
    });
    reconcileBreakNotification("alarm").catch(reportBackgroundError);
  });
  onBreakNotificationPermissionChanged(() => {
    reconcileBreakNotification("permission-change").catch(
      reportBackgroundError
    );
  });
  onBreakClockViewVisibilityChanged((visible) => {
    breakViewVisible = visible;
    reconcileBreakNotification("view-visibility").catch(reportBackgroundError);
  });
  onBreakNotificationClicked(() => {
    clearBreakNotification()
      .then(() => handleToolbarClick())
      .catch(reportBackgroundError);
  });
  return Promise.all([
    loadPreferredView().then(syncToolbarPopup),
    reconcileBreakNotification("service-worker-start"),
  ]);
}

initialize().catch(reportBackgroundError);
