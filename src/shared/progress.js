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
