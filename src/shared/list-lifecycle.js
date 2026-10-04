export function unfinishedTasks(tasks) {
  return Array.isArray(tasks)
    ? tasks.filter((task) => task && task.completed !== true)
    : [];
}

export function refreshCarryoverReview(tasks, previous = null) {
  const unfinished = unfinishedTasks(tasks);
  const previousSelected = new Set(previous?.selectedIds || []);
  const previousKnown = new Set(previous?.knownIds || []);
  const selectedIds = [];

  for (const task of unfinished) {
    if (!previous || !previousKnown.has(task.id) || previousSelected.has(task.id)) {
      selectedIds.push(task.id);
    }
  }

  return {
    unfinished,
    selectedIds,
    knownIds: unfinished.map((task) => task.id),
  };
}

export function newListFromCarryover(tasks, selectedIds) {
  const selected = new Set(selectedIds || []);
  return unfinishedTasks(tasks)
    .filter((task) => selected.has(task.id))
    .map((task) => ({ ...task, completed: false }));
}

export function taskListsMatch(first, second) {
  if (!Array.isArray(first) || !Array.isArray(second) || first.length !== second.length) {
    return false;
  }

  return first.every((task, index) => {
    const other = second[index];
    return (
      task?.id === other?.id &&
      task?.text === other?.text &&
      task?.completed === other?.completed &&
      task?.createdAt === other?.createdAt
    );
  });
}

export async function saveNewListFromReview({
  reviewedTasks,
  selectedIds,
  loadTasks,
  saveTasks,
}) {
  let latest;
  try {
    latest = await loadTasks();
  } catch (error) {
    return { status: "failure", tasks: reviewedTasks, error };
  }

  if (!taskListsMatch(latest, reviewedTasks)) {
    return { status: "stale", tasks: latest };
  }

  const next = newListFromCarryover(latest, selectedIds);
  try {
    await saveTasks(next);
  } catch (error) {
    return { status: "failure", tasks: reviewedTasks, error };
  }

  return { status: "saved", tasks: next };
}
