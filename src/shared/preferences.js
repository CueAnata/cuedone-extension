import { getLocal, onLocalChanged, setLocal } from "../platform/browser.js";

export const PREFERRED_VIEW_KEY = "cuedone.preferredView";
export const TASK_ENTRY_OPEN_KEY = "cuedone.taskEntryOpen";

export function normalizePreferredView(value) {
  return value === "side" ? "side" : "top";
}

export function normalizeTaskEntryOpen(value) {
  return value !== false;
}

export function taskEntryVisibility(isOpen) {
  const entryOpen = normalizeTaskEntryOpen(isOpen);
  return {
    showEntryForm: entryOpen,
    showAddTaskToggle: !entryOpen,
  };
}

export function shouldAssignToolbarPopup(
  preferredView,
  canOpenSideFromToolbar = true
) {
  if (normalizePreferredView(preferredView) !== "side") {
    return true;
  }

  return !canOpenSideFromToolbar;
}

export function shouldRestoreSideFromPopup(preferredView) {
  return normalizePreferredView(preferredView) === "side";
}

export function loadPreferredView() {
  return getLocal(PREFERRED_VIEW_KEY).then((data) =>
    normalizePreferredView(data[PREFERRED_VIEW_KEY])
  );
}

export function savePreferredView(view) {
  return setLocal({ [PREFERRED_VIEW_KEY]: normalizePreferredView(view) });
}

export function loadTaskEntryOpen() {
  return getLocal(TASK_ENTRY_OPEN_KEY).then((data) =>
    normalizeTaskEntryOpen(data[TASK_ENTRY_OPEN_KEY])
  );
}

export function saveTaskEntryOpen(isOpen) {
  return setLocal({ [TASK_ENTRY_OPEN_KEY]: normalizeTaskEntryOpen(isOpen) });
}

export function onPreferredViewChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[PREFERRED_VIEW_KEY]) {
      return;
    }

    callback(normalizePreferredView(changes[PREFERRED_VIEW_KEY].newValue));
  });
}

export function onTaskEntryOpenChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[TASK_ENTRY_OPEN_KEY]) {
      return;
    }

    callback(normalizeTaskEntryOpen(changes[TASK_ENTRY_OPEN_KEY].newValue));
  });
}
