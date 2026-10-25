import { personalAudioAllowed } from "./personal-lists.js";

export const PERSONAL_MESSAGE_MAX_LENGTH = 120;
export const DEFAULT_UNFINISHED_ENDING_TEXT = "Good progress today.";

export const AFFIRMATION_PRESETS = Object.freeze([
  { id: "one-step", text: "You’ve got this next step." },
  { id: "small-steps", text: "Small steps. Big possibilities." },
  { id: "begin-where-you-are", text: "Find your spark. Take one step." },
  { id: "own-pace", text: "Progress at your own pace." },
  { id: "next-step", text: "One honest step is enough." },
  { id: "not-everything", text: "You don’t have to do everything at once." },
  { id: "effort-matters", text: "Your effort is the whole point." },
  { id: "make-room", text: "Make room for a pause." },
]);

export const COMPLETE_MESSAGE_PRESETS = Object.freeze([
  { id: "all-done", text: "That’s a wrap. Take a bow!" },
  { id: "you-did-it", text: "Cue the happy dance!" },
  { id: "list-complete", text: "Done and dusted!" },
  { id: "small-wins", text: "One list. A lot of small wins." },
  { id: "followed-through", text: "You followed through." },
  { id: "enjoy-progress", text: "Take a beat. You earned this." },
  { id: "recharge", text: "List closed. Time to recharge." },
  { id: "finish", text: "You made it to the finish." },
]);

export const PAUSE_MESSAGE_PRESETS = Object.freeze([
  { id: "good-progress", text: DEFAULT_UNFINISHED_ENDING_TEXT },
  { id: "done-for-now", text: "Progress made. Permission to pause." },
  { id: "every-step", text: "Save your place. Catch your breath." },
  { id: "pick-up", text: "Your next step will be here." },
  { id: "pause-is-part", text: "A pause is part of the process." },
  { id: "return-to-next", text: "You can return to the next step." },
  { id: "can-wait", text: "The rest can wait. You’re good." },
  { id: "rest-then-return", text: "Rest, then return when you’re ready." },
  { id: "you-decide", text: "You decide when to continue." },
]);

const AFFIRMATION_IDS = AFFIRMATION_PRESETS.map((item) => item.id);
const COMPLETE_IDS = COMPLETE_MESSAGE_PRESETS.map((item) => item.id);
const PAUSE_IDS = PAUSE_MESSAGE_PRESETS.map((item) => item.id);

export function personalPrivateFeaturesAllowed(
  presentationMode,
  personalPresentation
) {
  return personalAudioAllowed(presentationMode, personalPresentation);
}

export function normalizeMessageText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, PERSONAL_MESSAGE_MAX_LENGTH);
}

function presetById(presets, id) {
  return presets.find((item) => item.id === id) ?? null;
}

function pickPresetId(presets, lastId = null, random = Math.random) {
  const options =
    presets.length > 1 && lastId
      ? presets.filter((item) => item.id !== lastId)
      : presets;
  if (options.length === 0) {
    return presets[0]?.id ?? null;
  }

  const index = Math.min(
    options.length - 1,
    Math.max(0, Math.floor(random() * options.length))
  );
  return options[index].id;
}

export function normalizeAffirmation(value) {
  const stored = value && typeof value === "object" ? value : {};
  const enabled = stored.enabled === true;
  let choice = stored.choice;
  if (choice !== "custom" && choice !== "random" && !AFFIRMATION_IDS.includes(choice)) {
    choice = "random";
  }

  const resolvedId = AFFIRMATION_IDS.includes(stored.resolvedId)
    ? stored.resolvedId
    : null;

  return {
    enabled,
    choice,
    customText: normalizeMessageText(stored.customText),
    resolvedId,
  };
}

export function normalizeEndingChoice(value, presets, defaultChoice = "none") {
  const stored = value && typeof value === "object" ? value : {};
  const ids = presets.map((item) => item.id);
  let choice = stored.choice;
  if (
    choice !== "none" &&
    choice !== "custom" &&
    choice !== "random" &&
    !ids.includes(choice)
  ) {
    choice = defaultChoice;
  }

  return {
    choice,
    customText: normalizeMessageText(stored.customText),
  };
}

export function normalizeCompleteMessage(value) {
  return normalizeEndingChoice(value, COMPLETE_MESSAGE_PRESETS, "random");
}

export function normalizePauseMessage(value) {
  return normalizeEndingChoice(value, PAUSE_MESSAGE_PRESETS, "random");
}

export function normalizeEndingState(value) {
  const stored = value && typeof value === "object" ? value : {};
  const kind =
    stored.kind === "complete" || stored.kind === "pause" ? stored.kind : "none";
  const text = normalizeMessageText(stored.text);
  if (kind === "none" || !text) {
    return { kind: "none", text: "" };
  }

  const state = { kind, text };
  if (typeof stored.taskSnapshot === "string") {
    state.taskSnapshot = stored.taskSnapshot;
  }
  return state;
}

export function affirmationShowsCustom(affirmation) {
  return normalizeAffirmation(affirmation).choice === "custom";
}

export function endingShowsCustom(pref) {
  return pref?.choice === "custom";
}

export function enableAffirmation(affirmation, random = Math.random) {
  const next = normalizeAffirmation({
    ...normalizeAffirmation(affirmation),
    enabled: true,
  });
  if (next.choice === "random") {
    next.resolvedId = pickPresetId(
      AFFIRMATION_PRESETS,
      affirmation?.resolvedId,
      random
    );
  }
  return next;
}

export function disableAffirmation(affirmation) {
  return normalizeAffirmation({
    ...normalizeAffirmation(affirmation),
    enabled: false,
  });
}

export function chooseAffirmation(affirmation, choice, random = Math.random) {
  const current = normalizeAffirmation(affirmation);
  const next = normalizeAffirmation({
    ...current,
    choice,
  });
  if (next.choice === "random") {
    if (current.choice !== "random" || !next.resolvedId) {
      next.resolvedId = pickPresetId(
        AFFIRMATION_PRESETS,
        current.resolvedId,
        random
      );
    }
  }
  return next;
}

export function refreshRandomAffirmation(affirmation, random = Math.random) {
  const current = normalizeAffirmation(affirmation);
  if (!current.enabled || current.choice !== "random") {
    return current;
  }

  return normalizeAffirmation({
    ...current,
    resolvedId: pickPresetId(AFFIRMATION_PRESETS, current.resolvedId, random),
  });
}

export function formatAffirmationText(affirmation) {
  const next = normalizeAffirmation(affirmation);
  if (!next.enabled) {
    return "";
  }

  if (next.choice === "custom") {
    return next.customText;
  }

  if (next.choice === "random") {
    return presetById(AFFIRMATION_PRESETS, next.resolvedId)?.text || "";
  }

  return presetById(AFFIRMATION_PRESETS, next.choice)?.text || "";
}

export function resolveEndingText(pref, presets, random = Math.random) {
  const next = normalizeEndingChoice(pref, presets);
  if (next.choice === "none") {
    return "";
  }

  if (next.choice === "custom") {
    return next.customText;
  }

  if (next.choice === "random") {
    const id = pickPresetId(presets, null, random);
    return presetById(presets, id)?.text || "";
  }

  return presetById(presets, next.choice)?.text || "";
}

export function createEndingState(kind, pref, random = Math.random) {
  const presets =
    kind === "complete" ? COMPLETE_MESSAGE_PRESETS : PAUSE_MESSAGE_PRESETS;
  const normalizedPref =
    kind === "complete" ? normalizeCompleteMessage(pref) : normalizePauseMessage(pref);
  const text = resolveEndingText(normalizedPref, presets, random);
  return normalizeEndingState({ kind, text });
}

export function clearEndingState() {
  return { kind: "none", text: "" };
}

export function canFinishForNow(tasks) {
  return (
    Array.isArray(tasks) &&
    tasks.length > 0 &&
    tasks.some((task) => task && task.completed === false)
  );
}

export function isCompletedList(tasks) {
  return (
    Array.isArray(tasks) &&
    tasks.length > 0 &&
    tasks.every((task) => task && task.completed === true)
  );
}

// Completed-list endings belong to the exact completed list that produced
// them. A deliberate pause stays active until Continue list, Reset List, or
// Start a New List clears it, even if ordinary task edits happen meanwhile.
export function bindEndingToTasks(ending, tasks) {
  const state = normalizeEndingState(ending);
  if (state.kind !== "complete") {
    return state;
  }

  return { ...state, taskSnapshot: JSON.stringify(tasks) };
}

export function endingMatchesTasks(ending, tasks) {
  const state = normalizeEndingState(ending);
  if (!Array.isArray(tasks)) {
    return false;
  }
  if (state.kind === "pause") {
    return true;
  }
  if (
    state.kind !== "complete" ||
    !state.taskSnapshot ||
    !isCompletedList(tasks)
  ) {
    return false;
  }

  return state.taskSnapshot === JSON.stringify(tasks);
}

export function endingVisible(
  ending,
  presentationMode,
  personalPresentation,
  tasks
) {
  return (
    personalPrivateFeaturesAllowed(presentationMode, personalPresentation) &&
    endingMatchesTasks(ending, tasks)
  );
}

export function finishForNowVisible({
  tasks,
  presentationMode,
  personalPresentation,
  ending,
} = {}) {
  return (
    personalPrivateFeaturesAllowed(presentationMode, personalPresentation) &&
    canFinishForNow(tasks) &&
    !endingMatchesTasks(ending, tasks)
  );
}
