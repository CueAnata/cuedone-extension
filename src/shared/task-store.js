import { isTaskList } from "./tasks.js";

export const TASKS_STORAGE_KEY = "cuedone.tasks";

export async function loadTasks() {
  const data = await chrome.storage.local.get(TASKS_STORAGE_KEY);
  const tasks = data[TASKS_STORAGE_KEY];
  return isTaskList(tasks) ? tasks : [];
}

export async function saveTasks(tasks) {
  await chrome.storage.local.set({ [TASKS_STORAGE_KEY]: tasks });
}

export function onTasksChanged(callback) {
  const listener = (changes, areaName) => {
    if (areaName !== "local" || !changes[TASKS_STORAGE_KEY]) {
      return;
    }

    const next = changes[TASKS_STORAGE_KEY].newValue;
    callback(isTaskList(next) ? next : []);
  };

  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
