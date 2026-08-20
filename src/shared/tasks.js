const MAX_TASK_TEXT_LENGTH = 200;

export function normalizeTaskText(text) {
  if (typeof text !== "string") {
    return "";
  }

  return text.trim().slice(0, MAX_TASK_TEXT_LENGTH);
}

export function createTask(text, now = Date.now(), id = crypto.randomUUID()) {
  const normalized = normalizeTaskText(text);

  if (!normalized) {
    throw new Error("Task text is required.");
  }

  return {
    id,
    text: normalized,
    completed: false,
    createdAt: now,
  };
}

export function addTask(tasks, text, now = Date.now(), id = crypto.randomUUID()) {
  const normalized = normalizeTaskText(text);

  if (!normalized) {
    return tasks;
  }

  return [...tasks, createTask(normalized, now, id)];
}

export function toggleTask(tasks, id) {
  return tasks.map((task) =>
    task.id === id ? { ...task, completed: !task.completed } : task
  );
}

export function deleteTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}

export function reorderTasks(tasks, fromIndex, toIndex) {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= tasks.length ||
    toIndex >= tasks.length
  ) {
    return tasks;
  }

  const next = [...tasks];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function isTaskList(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (task) =>
        task &&
        typeof task === "object" &&
        typeof task.id === "string" &&
        typeof task.text === "string" &&
        typeof task.completed === "boolean" &&
        typeof task.createdAt === "number"
    )
  );
}
