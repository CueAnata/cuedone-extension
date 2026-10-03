import { getLocal, onLocalChanged, setLocal } from "../platform/browser.js";
import { normalizeReward } from "./reward.js";

export const PREFERRED_VIEW_KEY = "cuedone.preferredView";
export const TASK_ENTRY_OPEN_KEY = "cuedone.taskEntryOpen";
export const PRESENTATION_MODE_KEY = "cuedone.presentationMode";
export const END_MOTIVATOR_KEY = "cuedone.endMotivator";
export const REWARD_KEY = "cuedone.reward";
export const COMPLETION_STYLE_KEY = "cuedone.completionStyle";
export const COMPLETION_SOUND_KEY = "cuedone.completionSound";
export const FINAL_CELEBRATION_KEY = "cuedone.finalCelebration";
export const FINAL_SOUND_KEY = "cuedone.finalSound";
export const TASK_SOUND_KEY = "cuedone.taskSound";
const MOTIVATOR_MAX_LENGTH = 120;
const FINAL_CELEBRATION_VALUES = [
  "random",
  "balloons",
  "stars",
  "cars",
  "butterflies",
];
const FINAL_SOUND_VALUES = [
  "current",
  "yay",
  "applause",
  "trumpet-fanfare",
  "hurrah",
];
const TASK_SOUND_VALUES = [
  "none",
  "bubble-pop",
  "soft-click",
  "wood-tap",
  "random",
];

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

export function normalizeFinalCelebration(value) {
  return FINAL_CELEBRATION_VALUES.includes(value) ? value : "random";
}

export function normalizeFinalSound(value) {
  return FINAL_SOUND_VALUES.includes(value) ? value : "current";
}

export function normalizeTaskSound(value) {
  return TASK_SOUND_VALUES.includes(value) ? value : "bubble-pop";
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
  return loadReward().then((reward) =>
    reward.id === "custom" ? reward.customText : ""
  );
}

export function saveEndMotivator(value) {
  return saveReward({ id: "custom", customText: value });
}

export function loadReward() {
  return getLocal(REWARD_KEY).then((data) => {
    const stored = data[REWARD_KEY];
    if (stored && typeof stored === "object") {
      return normalizeReward(stored);
    }

    return getLocal(END_MOTIVATOR_KEY).then((legacy) =>
      normalizeReward(null, legacy[END_MOTIVATOR_KEY])
    );
  });
}

export function saveReward(reward) {
  return setLocal({ [REWARD_KEY]: normalizeReward(reward) });
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

export function loadFinalCelebration() {
  return getLocal(FINAL_CELEBRATION_KEY).then((data) =>
    normalizeFinalCelebration(data[FINAL_CELEBRATION_KEY])
  );
}

export function saveFinalCelebration(value) {
  return setLocal({
    [FINAL_CELEBRATION_KEY]: normalizeFinalCelebration(value),
  });
}

export function loadFinalSound() {
  return getLocal(FINAL_SOUND_KEY).then((data) =>
    normalizeFinalSound(data[FINAL_SOUND_KEY])
  );
}

export function saveFinalSound(value) {
  return setLocal({
    [FINAL_SOUND_KEY]: normalizeFinalSound(value),
  });
}

export function loadTaskSound() {
  return getLocal(TASK_SOUND_KEY).then((data) =>
    normalizeTaskSound(data[TASK_SOUND_KEY])
  );
}

export function saveTaskSound(value) {
  return setLocal({
    [TASK_SOUND_KEY]: normalizeTaskSound(value),
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
  return onRewardChanged((reward) => {
    callback(reward.id === "custom" ? reward.customText : "");
  });
}

export function onRewardChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[REWARD_KEY]) {
      return;
    }

    callback(normalizeReward(changes[REWARD_KEY].newValue));
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

export function onFinalCelebrationChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[FINAL_CELEBRATION_KEY]) {
      return;
    }

    callback(normalizeFinalCelebration(changes[FINAL_CELEBRATION_KEY].newValue));
  });
}

export function onFinalSoundChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[FINAL_SOUND_KEY]) {
      return;
    }

    callback(normalizeFinalSound(changes[FINAL_SOUND_KEY].newValue));
  });
}

export function onTaskSoundChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[TASK_SOUND_KEY]) {
      return;
    }

    callback(normalizeTaskSound(changes[TASK_SOUND_KEY].newValue));
  });
}
