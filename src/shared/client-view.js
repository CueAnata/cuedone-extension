import { canResetList } from "./tasks.js";
import { formatProgress as formatProgressShared, normalizeProgress } from "./progress.js";

export function nextUnfinishedTask(tasks) {
  if (!Array.isArray(tasks)) {
    return null;
  }

  return tasks.find((task) => task && task.completed === false) ?? null;
}

export function taskProgress(tasks) {
  return normalizeProgress(tasks);
}

export function formatProgressLabel(progress) {
  return formatProgressShared(progress);
}

export function resetListVisible({
  tasks,
  presentation = "personal",
  style = "simple",
  finalCelebrationActive = false,
} = {}) {
  if (!canResetList(tasks, { allowPartial: presentation === "personal" })) {
    return false;
  }

  return !(
    presentation === "client" &&
    style === "celebrate" &&
    finalCelebrationActive === true
  );
}

export function nextCompletionStyleAction(requestedStyle) {
  if (requestedStyle !== "simple" && requestedStyle !== "celebrate") {
    return null;
  }

  return requestedStyle;
}

export function nextSoundAction(requestedSound) {
  if (requestedSound !== "on" && requestedSound !== "off") {
    return null;
  }

  return requestedSound;
}

export function nextFinalCelebrationAction(requestedTrail) {
  if (!FINAL_CELEBRATION_PREFS.includes(requestedTrail)) {
    return null;
  }

  return requestedTrail;
}

export function pickFinalTrail(
  preference = "random",
  lastPick = null,
  random = Math.random
) {
  if (FINAL_TRAILS.includes(preference)) {
    return preference;
  }

  return pickFromPool(FINAL_TRAILS, lastPick, random);
}

export const MICRO_CELEBRATIONS = [
  "clap",
  "stars",
  "thumbs",
  "confetti",
  "yay",
  "buddy",
];
export const FINAL_CELEBRATIONS = ["fireworks", "confetti-big", "stars-big"];
export const FINAL_TRAILS = ["balloons", "stars", "cars", "butterflies"];
export const FINAL_CELEBRATION_PREFS = ["random", ...FINAL_TRAILS];

function incompleteCount(tasks) {
  return (Array.isArray(tasks) ? tasks : []).filter(
    (task) => task && task.completed === false
  ).length;
}

export function snapshotTasks(tasks) {
  if (!Array.isArray(tasks)) {
    return [];
  }

  return tasks.map((task) => ({ ...task }));
}

export function unfinishedCount(tasks) {
  return incompleteCount(tasks);
}

export function applyTaskCompletion(tasks, id, completed) {
  return snapshotTasks(tasks).map((task) =>
    task.id === id ? { ...task, completed: Boolean(completed) } : task
  );
}

export function isFinalCompletionTransition(previousTasks, nextTasks) {
  return unfinishedCount(previousTasks) > 0 && unfinishedCount(nextTasks) === 0;
}

export function completionEvent(previousTasks, nextTasks, id) {
  const before = previousTasks?.find((task) => task.id === id);
  const after = nextTasks?.find((task) => task.id === id);
  if (!before || !after || before.completed || !after.completed) {
    return null;
  }

  const previousIncomplete = unfinishedCount(previousTasks);
  const remainingIncomplete = unfinishedCount(nextTasks);

  return {
    previousIncomplete,
    remainingIncomplete,
    isFinal: isFinalCompletionTransition(previousTasks, nextTasks),
  };
}

export function tasksBeforeCheckboxChange({
  snapshot,
  liveTasks,
  id,
  checked,
} = {}) {
  if (snapshot) {
    return snapshotTasks(snapshot);
  }

  const live = snapshotTasks(liveTasks);
  const current = live.find((task) => task.id === id);
  if (!current) {
    return live;
  }

  if (Boolean(current.completed) !== Boolean(checked)) {
    return live;
  }

  return live.map((task) =>
    task.id === id ? { ...task, completed: !checked } : task
  );
}

export function planFromCheckboxCompletion({
  snapshot,
  liveTasks,
  previousTasks,
  id,
  completed,
  presentation,
  style,
  sound,
} = {}) {
  const before = tasksBeforeCheckboxChange({
    snapshot: snapshot ?? previousTasks,
    liveTasks,
    id,
    checked: completed,
  });
  const nextTasks = applyTaskCompletion(before, id, completed);
  const event = completionEvent(before, nextTasks, id);
  const unfinishedBefore = unfinishedCount(before);
  const unfinishedAfter = unfinishedCount(nextTasks);
  const completing = completed === true && Boolean(event);
  const isFinal = completing && unfinishedBefore > 0 && unfinishedAfter === 0;

  return {
    nextTasks,
    unfinishedBefore,
    unfinishedAfter,
    isFinal,
    plan: completionFeedbackPlan({
      presentation,
      style,
      sound,
      completing,
      remainingIncomplete: unfinishedAfter,
      isFinal,
    }),
  };
}

export function completionFeedbackPlan({
  presentation = "personal",
  style = "simple",
  sound = "off",
  completing = false,
  remainingIncomplete = 1,
  isFinal = remainingIncomplete === 0,
} = {}) {
  const celebrate = style === "celebrate";
  const soundOn = sound === "on";
  const allowed =
    presentation === "client" && celebrate && completing === true;
  const kind = allowed ? (isFinal ? "final" : "micro") : null;

  return {
    visual: celebrate ? "celebrate" : "simple",
    sound: soundOn ? "on" : "off",
    playVisualCelebration: allowed,
    playSound: allowed && soundOn,
    playTrail: allowed && isFinal === true,
    kind,
  };
}

export function pickFromPool(pool, lastPick, random = Math.random) {
  const options =
    Array.isArray(pool) && pool.length > 1
      ? pool.filter((item) => item !== lastPick)
      : pool;
  if (!Array.isArray(options) || options.length === 0) {
    return null;
  }

  return options[Math.floor(random() * options.length)];
}

export function pickCelebration(kind, reducedMotion = false, lastPick = null, random = Math.random) {
  if (kind === "final") {
    return reducedMotion
      ? "you-did-it"
      : pickFromPool(FINAL_CELEBRATIONS, lastPick, random);
  }

  if (kind === "micro") {
    return reducedMotion ? "yay" : pickFromPool(MICRO_CELEBRATIONS, lastPick, random);
  }

  return null;
}
