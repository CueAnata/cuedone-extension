import { isTaskList } from "./tasks.js";
import { getLocal, onLocalChanged, setLocal } from "../platform/browser.js";

export const TASKS_STORAGE_KEY = "cuedone.tasks";

export async function loadTasks() {
  const data = await getLocal(TASKS_STORAGE_KEY);
  const tasks = data[TASKS_STORAGE_KEY];
  return isTaskList(tasks) ? tasks : [];
}

export async function saveTasks(tasks) {
  await setLocal({ [TASKS_STORAGE_KEY]: tasks });
}

export function onTasksChanged(callback) {
  return onLocalChanged((changes, areaName) => {
    if (areaName !== "local" || !changes[TASKS_STORAGE_KEY]) {
      return;
    }

    const next = changes[TASKS_STORAGE_KEY].newValue;
    callback(isTaskList(next) ? next : []);
  });
}
