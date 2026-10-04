export function normalizePersonalPresentation(value) {
  return value === "public" ? "public" : "private";
}

export function nextPersonalPresentationAction(requested) {
  if (requested !== "private" && requested !== "public") {
    return null;
  }

  return requested;
}

export function activeListKind(presentationMode, personalPresentation) {
  if (presentationMode === "client") {
    return "private";
  }

  return normalizePersonalPresentation(personalPresentation);
}

export function visibleTasksForActiveList(activeKind, tasksKind, tasks) {
  if (activeKind === "public" && tasksKind !== "public") {
    return [];
  }

  if (activeKind !== tasksKind) {
    return [];
  }

  return Array.isArray(tasks) ? tasks : [];
}

export function formatActiveListLabel(kind) {
  return kind === "public" ? "Using Public list" : "Using Private list";
}

export function emptyStateCopy(kind) {
  return kind === "public"
    ? "No public agenda yet. Add a step to get started."
    : "No tasks yet. Add one to get started.";
}

export function taskListAriaLabel(kind) {
  return kind === "public" ? "Public agenda" : "Tasks";
}

export function applyPersonalPresentation(value, root = document.body) {
  root.dataset.personalPresentation = normalizePersonalPresentation(value);
}
