import { normalizeClientSequence, reconcileClientSequence } from "./client-sequence.js";
import { themeSelectionForList } from "./random-visual-theme.js";
import {
  PERSONAL_BREAK_TIMER_KEY,
  PERSONAL_RANDOM_THEME_KEY,
  PERSONAL_VISUAL_THEME_KEY,
  PERSONAL_ENDING_KEY,
} from "./preferences.js";
import { normalizeBreakTimerModel } from "./break-clock.js";
import { clearEndingState, normalizeEndingState } from "./personal-messages.js";
import { isTaskList } from "./tasks.js";
import { getLocal, onLocalChanged, setLocal } from "../platform/browser.js";

export const CLIENT_SEQUENCE_KEY = "cuedone.clientSequence.v1";

export const TASKS_STORAGE_KEY = "cuedone.tasks";
export const PUBLIC_TASKS_STORAGE_KEY = "cuedone.publicTasks";

function listFromStorage(value) {
  return isTaskList(value) ? value : [];
}

export async function loadTasks() {
  const data = await getLocal(TASKS_STORAGE_KEY);
  return listFromStorage(data[TASKS_STORAGE_KEY]);
}

export async function saveTasks(
  tasks,
  { clearEnding = false, breakTimer = null, clientSequence = null } = {}
) {
  const values = { [TASKS_STORAGE_KEY]: tasks };
  const ending = clearEnding
    ? clearEndingState()
    : normalizeEndingState((await getLocal(PERSONAL_ENDING_KEY))[PERSONAL_ENDING_KEY]);
  // Ordinary edits leave a deliberate pause untouched, including a concurrent
  // Continue list. Completion messages and explicit resets clear in this write.
  if (clearEnding || ending.kind !== "pause") {
    values[PERSONAL_ENDING_KEY] = clearEndingState();
  }
  if (breakTimer !== null) {
    values[PERSONAL_BREAK_TIMER_KEY] = normalizeBreakTimerModel(breakTimer);
  }
  const storedSequence = clientSequence ?? (await getLocal(CLIENT_SEQUENCE_KEY))[CLIENT_SEQUENCE_KEY];
  if (storedSequence != null) values[CLIENT_SEQUENCE_KEY] = reconcileClientSequence(storedSequence, tasks);
  const preference = (await getLocal(PERSONAL_VISUAL_THEME_KEY))[PERSONAL_VISUAL_THEME_KEY];
  const saved = (await getLocal(PERSONAL_RANDOM_THEME_KEY))[PERSONAL_RANDOM_THEME_KEY];
  if (preference === "random" || (preference == null && saved?.active)) {
    const previous = listFromStorage((await getLocal(TASKS_STORAGE_KEY))[TASKS_STORAGE_KEY]);
    values[PERSONAL_RANDOM_THEME_KEY] = themeSelectionForList(saved, previous, tasks, preference);
  }
  await setLocal(values);
}

export async function loadPublicTasks() {
  const data = await getLocal(PUBLIC_TASKS_STORAGE_KEY);
  return listFromStorage(data[PUBLIC_TASKS_STORAGE_KEY]);
}

export async function savePublicTasks(tasks) {
  await setLocal({ [PUBLIC_TASKS_STORAGE_KEY]: tasks });
}

export function listStorageKey(kind) {
  return kind === "public" ? PUBLIC_TASKS_STORAGE_KEY : TASKS_STORAGE_KEY;
}

export async function loadList(kind) {
  return kind === "public" ? loadPublicTasks() : loadTasks();
}

export async function saveList(kind, tasks, options) {
  return kind === "public" ? savePublicTasks(tasks) : saveTasks(tasks, options);
}

export function onTasksChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[TASKS_STORAGE_KEY]) {
      return;
    }

    callback(listFromStorage(changes[TASKS_STORAGE_KEY].newValue));
  });
}

export function onPublicTasksChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[PUBLIC_TASKS_STORAGE_KEY]) {
      return;
    }

    callback(listFromStorage(changes[PUBLIC_TASKS_STORAGE_KEY].newValue));
  });
}

export function onListChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    if (changes[TASKS_STORAGE_KEY]) {
      callback("private", listFromStorage(changes[TASKS_STORAGE_KEY].newValue));
    }

    if (changes[PUBLIC_TASKS_STORAGE_KEY]) {
      callback("public", listFromStorage(changes[PUBLIC_TASKS_STORAGE_KEY].newValue));
    }
  });
}


export function loadClientSequence() {
  return getLocal(CLIENT_SEQUENCE_KEY).then(data => normalizeClientSequence(data[CLIENT_SEQUENCE_KEY]));
}
export async function saveClientSequence(value) {
  const tasks = await loadTasks();
  const saved = reconcileClientSequence(value, tasks);
  await setLocal({ [CLIENT_SEQUENCE_KEY]: saved });
  return saved;
}
export function onClientSequenceChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName === "local" && changes[CLIENT_SEQUENCE_KEY]) callback(normalizeClientSequence(changes[CLIENT_SEQUENCE_KEY].newValue));
  });
}
