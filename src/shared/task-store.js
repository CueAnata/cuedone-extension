import { PERSONAL_ENDING_KEY } from "./preferences.js";
import { clearEndingState, normalizeEndingState } from "./personal-messages.js";
import { isTaskList } from "./tasks.js";
import { getLocal, onLocalChanged, setLocal } from "../platform/browser.js";

export const TASKS_STORAGE_KEY = "cuedone.tasks";
export const PUBLIC_TASKS_STORAGE_KEY = "cuedone.publicTasks";

function listFromStorage(value) {
  return isTaskList(value) ? value : [];
}

export async function loadTasks() {
  const data = await getLocal(TASKS_STORAGE_KEY);
  return listFromStorage(data[TASKS_STORAGE_KEY]);
}

export async function saveTasks(tasks, { clearEnding = false } = {}) {
  const values = { [TASKS_STORAGE_KEY]: tasks };
  const saved = await getLocal(PERSONAL_ENDING_KEY);
  const ending = normalizeEndingState(saved[PERSONAL_ENDING_KEY]);

  // Ordinary edits leave a deliberate pause untouched. Completion feedback
  // is cleared with the same write as the changed list, while explicit Reset
  // and New List actions also clear a pause.
  if (clearEnding || ending.kind !== "pause") {
    values[PERSONAL_ENDING_KEY] = clearEndingState();
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
