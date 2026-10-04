import {
  applyTaskCompletion,
  completionEvent,
  tasksBeforeCheckboxChange,
  unfinishedCount,
} from "./client-view.js";
import { personalAudioAllowed } from "./personal-lists.js";

export function planPersonalPrivateAudio({
  snapshot,
  liveTasks,
  previousTasks,
  id,
  completed,
  presentationMode,
  personalPresentation,
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
  const completing = completed === true && Boolean(event);
  const isFinal =
    completing &&
    unfinishedCount(before) > 0 &&
    unfinishedCount(nextTasks) === 0;
  const allowed = personalAudioAllowed(presentationMode, personalPresentation);
  const soundOn = sound === "on";

  return {
    nextTasks,
    unfinishedBefore: unfinishedCount(before),
    unfinishedAfter: unfinishedCount(nextTasks),
    isFinal,
    playSound: allowed && completing && soundOn,
    kind: isFinal ? "final" : "task",
  };
}
