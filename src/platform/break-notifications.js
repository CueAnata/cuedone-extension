import { breakClockStatus, normalizeBreakTimerModel } from "../shared/break-clock.js";

export function normalizeNotifiedDueAt(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : null;
}

/**
 * Start both operations from the same user-gesture turn. Chrome may close a
 * toolbar popup while showing its optional-permission prompt, so waiting for
 * the prompt before dispatching the storage write can lose the opt-in.
 */
export function beginBreakNotificationOptIn({
  saveEnabled,
  requestPermission,
}) {
  const savePromise = saveEnabled(true);
  const permissionPromise = requestPermission();

  return Promise.all([savePromise, permissionPromise]).then(
    ([saved, granted]) => ({ saved, granted })
  );
}

export function planBreakNotification({
  enabled,
  permissionGranted,
  presentationMode,
  personalPresentation,
  endingKind,
  timer,
  notifiedDueAt,
  viewVisible,
  now = Date.now(),
}) {
  const model = normalizeBreakTimerModel(timer);
  const status = breakClockStatus(model.clock, now);
  const privateActive =
    presentationMode === "personal" && personalPresentation === "private";

  if (
    enabled !== true ||
    permissionGranted !== true ||
    !privateActive ||
    endingKind === "pause" ||
    status.phase === "off" ||
    status.phase === "paused" ||
    model.clock.dueAt === null
  ) {
    return { action: "inactive", dueAt: null };
  }

  if (status.phase === "running") {
    return { action: "schedule", dueAt: model.clock.dueAt };
  }

  if (viewVisible) {
    return { action: "visible", dueAt: model.clock.dueAt };
  }

  if (normalizeNotifiedDueAt(notifiedDueAt) === model.clock.dueAt) {
    return { action: "notified", dueAt: model.clock.dueAt };
  }

  return { action: "notify", dueAt: model.clock.dueAt };
}

export function executeBreakNotificationPlan(plan, actions) {
  if (plan.action === "schedule") {
    return Promise.all([
      actions.scheduleAlarm(plan.dueAt),
      actions.clearNotification(),
      actions.clearBadge(),
    ]);
  }

  if (plan.action === "notify") {
    return actions
      .clearAlarm()
      .then(() =>
        Promise.all([actions.showNotification(), actions.showBadge()])
      )
      .then(() => actions.saveNotifiedDueAt(plan.dueAt));
  }

  if (plan.action === "notified") {
    return Promise.all([actions.clearAlarm(), actions.showBadge()]);
  }

  if (plan.action === "visible") {
    return Promise.all([
      actions.clearAlarm(),
      actions.clearNotification(),
      actions.showBadge(),
      actions.saveNotifiedDueAt(plan.dueAt),
    ]);
  }

  return Promise.all([
    actions.clearAlarm(),
    actions.clearNotification(),
    actions.clearBadge(),
  ]);
}
