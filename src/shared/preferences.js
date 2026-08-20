import { getLocal, onLocalChanged, setLocal } from "../platform/browser.js";

export const PREFERRED_VIEW_KEY = "cuedone.preferredView";
export const TASK_ENTRY_OPEN_KEY = "cuedone.taskEntryOpen";
export const PRESENTATION_MODE_KEY = "cuedone.presentationMode";
export const END_MOTIVATOR_KEY = "cuedone.endMotivator";
export const COMPLETION_STYLE_KEY = "cuedone.completionStyle";
export const COMPLETION_SOUND_KEY = "cuedone.completionSound";
const MOTIVATOR_MAX_LENGTH = 120;

export function normalizePreferredView(value) {
  return value === "side" ? "side" : "top";
}

export function normalizeTaskEntryOpen(value) {
  return value !== false;
}

export function normalizePresentationMode(value) {
  return value === "client" ? "client" : "personal";
}

export function normalizeEndMotivator(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, MOTIVATOR_MAX_LENGTH);
}

export function normalizeCompletionStyle(value) {
  return value === "celebrate" ? "celebrate" : "simple";
}

export function normalizeCompletionSound(value) {
  return value === "on" ? "on" : "off";
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

export function loadPresentationMode() {
  return getLocal(PRESENTATION_MODE_KEY).then((data) =>
    normalizePresentationMode(data[PRESENTATION_MODE_KEY])
  );
}

export function savePresentationMode(mode) {
  return setLocal({
    [PRESENTATION_MODE_KEY]: normalizePresentationMode(mode),
  });
}

export function loadEndMotivator() {
  return getLocal(END_MOTIVATOR_KEY).then((data) =>
    normalizeEndMotivator(data[END_MOTIVATOR_KEY])
  );
}

export function saveEndMotivator(value) {
  return setLocal({ [END_MOTIVATOR_KEY]: normalizeEndMotivator(value) });
}

export function loadCompletionStyle() {
  return getLocal(COMPLETION_STYLE_KEY).then((data) =>
    normalizeCompletionStyle(data[COMPLETION_STYLE_KEY])
  );
}

export function saveCompletionStyle(style) {
  return setLocal({
    [COMPLETION_STYLE_KEY]: normalizeCompletionStyle(style),
  });
}

export function loadCompletionSound() {
  return getLocal(COMPLETION_SOUND_KEY).then((data) =>
    normalizeCompletionSound(data[COMPLETION_SOUND_KEY])
  );
}

export function saveCompletionSound(value) {
  return setLocal({
    [COMPLETION_SOUND_KEY]: normalizeCompletionSound(value),
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

export function onPresentationModeChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[PRESENTATION_MODE_KEY]) {
      return;
    }

    callback(normalizePresentationMode(changes[PRESENTATION_MODE_KEY].newValue));
  });
}

export function onEndMotivatorChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[END_MOTIVATOR_KEY]) {
      return;
    }

    callback(normalizeEndMotivator(changes[END_MOTIVATOR_KEY].newValue));
  });
}

export function onCompletionStyleChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[COMPLETION_STYLE_KEY]) {
      return;
    }

    callback(normalizeCompletionStyle(changes[COMPLETION_STYLE_KEY].newValue));
  });
}

export function onCompletionSoundChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[COMPLETION_SOUND_KEY]) {
      return;
    }

    callback(normalizeCompletionSound(changes[COMPLETION_SOUND_KEY].newValue));
  });
}
