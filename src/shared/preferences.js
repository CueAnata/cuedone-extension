import { getLocal, onLocalChanged, setLocal } from "../platform/browser.js";
import { normalizePersonalPresentation } from "./personal-lists.js";
import { normalizePersonalTaskLayout } from "./personal-layout.js";
import {
  normalizeAffirmation,
  normalizeCompleteMessage,
  normalizeEndingState,
  normalizePauseMessage,
} from "./personal-messages.js";
import { normalizeReward } from "./reward.js";
import { normalizeBreakTimerModel } from "./break-clock.js";
import { normalizePlantTheme, normalizeVisualTheme } from "./plant-theme.js";

export const PREFERRED_VIEW_KEY = "cuedone.preferredView";
export const TASK_ENTRY_OPEN_KEY = "cuedone.taskEntryOpen";
export const PRESENTATION_MODE_KEY = "cuedone.presentationMode";
export const PERSONAL_PRESENTATION_KEY = "cuedone.personalPresentation";
export const PERSONAL_TASK_LAYOUT_KEY = "cuedone.personalTaskLayout";
export const END_MOTIVATOR_KEY = "cuedone.endMotivator";
export const REWARD_KEY = "cuedone.reward";
export const COMPLETION_STYLE_KEY = "cuedone.completionStyle";
export const COMPLETION_SOUND_KEY = "cuedone.completionSound";
export const FINAL_CELEBRATION_KEY = "cuedone.finalCelebration";
export const FINAL_SOUND_KEY = "cuedone.finalSound";
export const TASK_SOUND_KEY = "cuedone.taskSound";
export const PERSONAL_COMPLETION_SOUND_KEY = "cuedone.personalCompletionSound";
export const PERSONAL_FINAL_SOUND_KEY = "cuedone.personalFinalSound";
export const PERSONAL_TASK_SOUND_KEY = "cuedone.personalTaskSound";
export const PERSONAL_AFFIRMATION_KEY = "cuedone.personalAffirmation";
export const PERSONAL_COMPLETE_MESSAGE_KEY = "cuedone.personalCompleteMessage";
export const PERSONAL_PAUSE_MESSAGE_KEY = "cuedone.personalPauseMessage";
export const PERSONAL_ENDING_KEY = "cuedone.personalEnding";
export const PERSONAL_BREAK_TIMER_KEY = "cuedone.personalBreakTimer.v1";
export const PERSONAL_BREAK_NOTIFICATIONS_KEY =
  "cuedone.personalBreakNotifications";
export const PERSONAL_BREAK_NOTIFIED_DUE_AT_KEY =
  "cuedone.personalBreakNotificationDueAt";
export const PERSONAL_PLANT_THEME_KEY = "cuedone.personalPlantTheme";
export const PERSONAL_VISUAL_THEME_KEY = "cuedone.personalVisualTheme";
const MOTIVATOR_MAX_LENGTH = 120;
const FINAL_CELEBRATION_VALUES = [
  "random",
  "balloons",
  "stars",
  "cars",
  "butterflies",
];
const FINAL_SOUND_VALUES = [
  "random",
  "party-horn",
  "whip-crack",
  "cash-register",
  "chiptune-blip",
  "rimshot",
  "jackpot-coins",
  "gong",

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

export { normalizePersonalPresentation };

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
  return FINAL_SOUND_VALUES.includes(value) ? value : "random";
}

export function normalizeTaskSound(value) {
  return TASK_SOUND_VALUES.includes(value) ? value : "random";
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

export function loadPersonalPresentation() {
  return getLocal(PERSONAL_PRESENTATION_KEY).then((data) =>
    normalizePersonalPresentation(data[PERSONAL_PRESENTATION_KEY])
  );
}

export function savePersonalPresentation(value) {
  return setLocal({
    [PERSONAL_PRESENTATION_KEY]: normalizePersonalPresentation(value),
  });
}

export function loadPersonalTaskLayout() {
  return getLocal(PERSONAL_TASK_LAYOUT_KEY).then((data) =>
    normalizePersonalTaskLayout(data[PERSONAL_TASK_LAYOUT_KEY])
  );
}

export function savePersonalTaskLayout(value) {
  return setLocal({
    [PERSONAL_TASK_LAYOUT_KEY]: normalizePersonalTaskLayout(value),
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

export function loadPersonalCompletionSound() {
  return getLocal(PERSONAL_COMPLETION_SOUND_KEY).then((data) =>
    normalizeCompletionSound(data[PERSONAL_COMPLETION_SOUND_KEY])
  );
}

export function savePersonalCompletionSound(value) {
  return setLocal({
    [PERSONAL_COMPLETION_SOUND_KEY]: normalizeCompletionSound(value),
  });
}

export function loadPersonalFinalSound() {
  return getLocal(PERSONAL_FINAL_SOUND_KEY).then((data) =>
    normalizeFinalSound(data[PERSONAL_FINAL_SOUND_KEY])
  );
}

export function savePersonalFinalSound(value) {
  return setLocal({
    [PERSONAL_FINAL_SOUND_KEY]: normalizeFinalSound(value),
  });
}

export function loadPersonalTaskSound() {
  return getLocal(PERSONAL_TASK_SOUND_KEY).then((data) =>
    normalizeTaskSound(data[PERSONAL_TASK_SOUND_KEY])
  );
}

export function savePersonalTaskSound(value) {
  return setLocal({
    [PERSONAL_TASK_SOUND_KEY]: normalizeTaskSound(value),
  });
}

export function loadPersonalAffirmation() {
  return getLocal(PERSONAL_AFFIRMATION_KEY).then((data) =>
    normalizeAffirmation(data[PERSONAL_AFFIRMATION_KEY])
  );
}

export function savePersonalAffirmation(value) {
  return setLocal({
    [PERSONAL_AFFIRMATION_KEY]: normalizeAffirmation(value),
  });
}

export function loadPersonalCompleteMessage() {
  return getLocal(PERSONAL_COMPLETE_MESSAGE_KEY).then((data) =>
    normalizeCompleteMessage(data[PERSONAL_COMPLETE_MESSAGE_KEY])
  );
}

export function savePersonalCompleteMessage(value) {
  return setLocal({
    [PERSONAL_COMPLETE_MESSAGE_KEY]: normalizeCompleteMessage(value),
  });
}

export function loadPersonalPauseMessage() {
  return getLocal(PERSONAL_PAUSE_MESSAGE_KEY).then((data) =>
    normalizePauseMessage(data[PERSONAL_PAUSE_MESSAGE_KEY])
  );
}

export function savePersonalPauseMessage(value) {
  return setLocal({
    [PERSONAL_PAUSE_MESSAGE_KEY]: normalizePauseMessage(value),
  });
}

export function loadPersonalEnding() {
  return getLocal(PERSONAL_ENDING_KEY).then((data) =>
    normalizeEndingState(data[PERSONAL_ENDING_KEY])
  );
}

export function savePersonalEnding(value) {
  return setLocal({
    [PERSONAL_ENDING_KEY]: normalizeEndingState(value),
  });
}

export function loadPersonalBreakTimer() {
  return getLocal(PERSONAL_BREAK_TIMER_KEY).then((data) =>
    normalizeBreakTimerModel(data[PERSONAL_BREAK_TIMER_KEY])
  );
}

export function savePersonalBreakTimer(value) {
  return setLocal({
    [PERSONAL_BREAK_TIMER_KEY]: normalizeBreakTimerModel(value),
  });
}

export function normalizePersonalBreakNotifications(value) {
  return value === true;
}

export function loadPersonalBreakNotifications() {
  return getLocal(PERSONAL_BREAK_NOTIFICATIONS_KEY).then((data) =>
    normalizePersonalBreakNotifications(
      data[PERSONAL_BREAK_NOTIFICATIONS_KEY]
    )
  );
}

export function savePersonalBreakNotifications(value) {
  return setLocal({
    [PERSONAL_BREAK_NOTIFICATIONS_KEY]:
      normalizePersonalBreakNotifications(value),
  });
}

export function savePersonalSessionState(ending, breakTimer) {
  return setLocal({
    [PERSONAL_ENDING_KEY]: normalizeEndingState(ending),
    [PERSONAL_BREAK_TIMER_KEY]: normalizeBreakTimerModel(breakTimer),
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

export function onPersonalPresentationChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[PERSONAL_PRESENTATION_KEY]) {
      return;
    }

    callback(
      normalizePersonalPresentation(changes[PERSONAL_PRESENTATION_KEY].newValue)
    );
  });
}

export function onPersonalTaskLayoutChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[PERSONAL_TASK_LAYOUT_KEY]) {
      return;
    }

    callback(
      normalizePersonalTaskLayout(changes[PERSONAL_TASK_LAYOUT_KEY].newValue)
    );
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

export function onPersonalCompletionSoundChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[PERSONAL_COMPLETION_SOUND_KEY]) {
      return;
    }

    callback(
      normalizeCompletionSound(changes[PERSONAL_COMPLETION_SOUND_KEY].newValue)
    );
  });
}

export function onPersonalFinalSoundChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[PERSONAL_FINAL_SOUND_KEY]) {
      return;
    }

    callback(normalizeFinalSound(changes[PERSONAL_FINAL_SOUND_KEY].newValue));
  });
}

export function onPersonalTaskSoundChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[PERSONAL_TASK_SOUND_KEY]) {
      return;
    }

    callback(normalizeTaskSound(changes[PERSONAL_TASK_SOUND_KEY].newValue));
  });
}

export function onPersonalAffirmationChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[PERSONAL_AFFIRMATION_KEY]) {
      return;
    }

    callback(normalizeAffirmation(changes[PERSONAL_AFFIRMATION_KEY].newValue));
  });
}

export function onPersonalCompleteMessageChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[PERSONAL_COMPLETE_MESSAGE_KEY]) {
      return;
    }

    callback(
      normalizeCompleteMessage(changes[PERSONAL_COMPLETE_MESSAGE_KEY].newValue)
    );
  });
}

export function onPersonalPauseMessageChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[PERSONAL_PAUSE_MESSAGE_KEY]) {
      return;
    }

    callback(normalizePauseMessage(changes[PERSONAL_PAUSE_MESSAGE_KEY].newValue));
  });
}

export function onPersonalEndingChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[PERSONAL_ENDING_KEY]) {
      return;
    }

    callback(normalizeEndingState(changes[PERSONAL_ENDING_KEY].newValue));
  });
}

export function onPersonalBreakTimerChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[PERSONAL_BREAK_TIMER_KEY]) {
      return;
    }

    callback(
      normalizeBreakTimerModel(changes[PERSONAL_BREAK_TIMER_KEY].newValue)
    );
  });
}

export function onPersonalBreakNotificationsChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[PERSONAL_BREAK_NOTIFICATIONS_KEY]) {
      return;
    }

    callback(
      normalizePersonalBreakNotifications(
        changes[PERSONAL_BREAK_NOTIFICATIONS_KEY].newValue
      )
    );
  });
}

export function loadPersonalPlantTheme() {
  return getLocal(PERSONAL_PLANT_THEME_KEY).then((data) =>
    normalizePlantTheme(data[PERSONAL_PLANT_THEME_KEY])
  );
}

export function savePersonalPlantTheme(value) {
  return setLocal({
    [PERSONAL_PLANT_THEME_KEY]: normalizePlantTheme(value),
  });
}

export function onPersonalPlantThemeChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[PERSONAL_PLANT_THEME_KEY]) {
      return;
    }

    callback(normalizePlantTheme(changes[PERSONAL_PLANT_THEME_KEY].newValue));
  });
}

export function loadPersonalVisualTheme() {
  return getLocal(PERSONAL_VISUAL_THEME_KEY).then((data) =>
    normalizeVisualTheme(data[PERSONAL_VISUAL_THEME_KEY])
  );
}

export function savePersonalVisualTheme(value, randomState = null) {
  return setLocal({
    [PERSONAL_VISUAL_THEME_KEY]: normalizeVisualTheme(value),
    ...(randomState === null ? {} : { [PERSONAL_RANDOM_THEME_KEY]: randomState }),
  });
}

export function onPersonalVisualThemeChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[PERSONAL_VISUAL_THEME_KEY]) {
      return;
    }

    callback(normalizeVisualTheme(changes[PERSONAL_VISUAL_THEME_KEY].newValue));
  });
}


export const PERSONAL_RANDOM_THEME_KEY = "cuedone.personalRandomTheme.v1";
export function loadPersonalRandomTheme() {
  return getLocal(PERSONAL_RANDOM_THEME_KEY).then(data => data[PERSONAL_RANDOM_THEME_KEY] ?? {});
}
export function savePersonalRandomTheme(value) {
  return setLocal({ [PERSONAL_RANDOM_THEME_KEY]: value });
}
export function onPersonalRandomThemeChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName === "local" && changes[PERSONAL_RANDOM_THEME_KEY]) callback(changes[PERSONAL_RANDOM_THEME_KEY].newValue ?? {});
  });
}


// Save the full selected Personal settings, including explicit disabled values.
export function savePersonalSettingsSnapshot(settings) {
  const values = { [PERSONAL_PRESENTATION_KEY]: normalizePersonalPresentation(settings.presentation) };
  if (settings.presentation === "private") {
    Object.assign(values, {
      [PERSONAL_TASK_LAYOUT_KEY]: normalizePersonalTaskLayout(settings.layout),
      [PERSONAL_PLANT_THEME_KEY]: normalizePlantTheme(settings.progress),
      [PERSONAL_VISUAL_THEME_KEY]: normalizeVisualTheme(settings.theme),
      [PERSONAL_COMPLETION_SOUND_KEY]: normalizeCompletionSound(settings.sound),
      [PERSONAL_TASK_SOUND_KEY]: normalizeTaskSound(settings.taskSound),
      [PERSONAL_FINAL_SOUND_KEY]: normalizeFinalSound(settings.finalSound),
      [PERSONAL_AFFIRMATION_KEY]: normalizeAffirmation(settings.affirmation),
      [PERSONAL_COMPLETE_MESSAGE_KEY]: normalizeCompleteMessage(settings.completeMessage),
      [PERSONAL_PAUSE_MESSAGE_KEY]: normalizePauseMessage(settings.pauseMessage),
      [PERSONAL_BREAK_TIMER_KEY]: normalizeBreakTimerModel(settings.breakTimer),
      [PERSONAL_BREAK_NOTIFICATIONS_KEY]: normalizePersonalBreakNotifications(settings.notifications),
    });
    if (settings.theme === "random") values[PERSONAL_RANDOM_THEME_KEY] = settings.randomTheme;
  }
  return setLocal(values);
}
