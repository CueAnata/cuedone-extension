export function normalizeProgress(tasks) {
  const list = Array.isArray(tasks) ? tasks : [];
  const total = list.length;
  const complete = list.filter((task) => task && task.completed === true).length;
  return {
    complete,
    total,
    percent: total === 0 ? 0 : Math.round((complete / total) * 100),
  };
}

export function formatProgress(progress) {
  const complete = Number(progress?.complete) || 0;
  const total = Number(progress?.total) || 0;
  return `${complete} of ${total} complete`;
}

export function isEmptyProgress(progress) {
  const total = Number(progress?.total) || 0;
  return total === 0;
}

export function incompleteCount(progress) {
  const total = Number(progress?.total) || 0;
  const complete = Number(progress?.complete) || 0;
  return Math.max(0, total - complete);
}

export function isPrivateProgressAllowed(presentationMode, personalPresentation) {
  return presentationMode === "personal" && personalPresentation === "private";
}

// Rounded percent is a display label only. Visuals and finales use exact counts.
export function visualProgress(progress) {
  const source = Array.isArray(progress) ? normalizeProgress(progress) : progress;
  const total = Number(source?.total);
  const complete = Number(source?.complete);
  if (!Number.isInteger(total) || total <= 0 || !Number.isInteger(complete) || complete < 0 || complete > total) return null;
  return { total, complete, ratio: complete / total, isFinal: complete === total };
}

export function progressStage(progress, stageCount = 5) {
  const state = visualProgress(progress);
  if (!state || !Number.isInteger(stageCount) || stageCount < 2) return null;
  if (state.isFinal) return stageCount - 1;
  return Math.min(stageCount - 2, Math.floor(state.ratio * (stageCount - 1)));
}
