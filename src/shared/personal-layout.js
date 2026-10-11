export const PERSONAL_TASK_LAYOUTS = ["full-list", "one-active"];

export function normalizePersonalTaskLayout(value) {
  return value === "one-active" ? "one-active" : "full-list";
}

export function nextPersonalTaskLayoutAction(requested) {
  return PERSONAL_TASK_LAYOUTS.includes(requested) ? requested : null;
}

export function personalOneActiveAllowed(
  presentationMode,
  personalPresentation,
  layout
) {
  return (
    presentationMode === "personal" &&
    personalPresentation === "private" &&
    normalizePersonalTaskLayout(layout) === "one-active"
  );
}

export function personalOneActiveState(tasks, { reviewAll = false } = {}) {
  const list = Array.isArray(tasks) ? tasks : [];
  const activeTask =
    list.find((task) => task && task.completed === false) ?? null;
  const total = list.length;
  const complete = list.filter(
    (task) => task && task.completed === true
  ).length;
  const progress = {
    complete,
    total,
    percent: total === 0 ? 0 : Math.round((complete / total) * 100),
  };
  const unfinished = list.filter(
    (task) => task && task.completed === false
  ).length;

  return {
    activeTask,
    progress,
    waiting: Math.max(0, unfinished - (activeTask ? 1 : 0)),
    visibleTasks: reviewAll ? list : activeTask ? [activeTask] : [],
  };
}

export function formatWaitingTaskCount(count) {
  const waiting = Math.max(0, Number(count) || 0);
  return `${waiting} task${waiting === 1 ? "" : "s"} waiting`;
}
