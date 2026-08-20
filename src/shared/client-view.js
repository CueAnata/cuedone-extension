export function nextUnfinishedTask(tasks) {
  if (!Array.isArray(tasks)) {
    return null;
  }

  return tasks.find((task) => task && task.completed === false) ?? null;
}

export function taskProgress(tasks) {
  const list = Array.isArray(tasks) ? tasks : [];
  const total = list.length;
  const complete = list.filter((task) => task && task.completed === true).length;

  return {
    complete,
    total,
    percent: total === 0 ? 0 : Math.round((complete / total) * 100),
  };
}

export function formatProgressLabel(progress) {
  const complete = Number(progress?.complete) || 0;
  const total = Number(progress?.total) || 0;
  return `${complete} of ${total} complete`;
}

export function nextCompletionStyleAction(requestedStyle) {
  if (requestedStyle !== "simple" && requestedStyle !== "celebrate") {
    return null;
  }

  return requestedStyle;
}

export function completionFeedbackPlan(style, sound) {
  const visual = style === "celebrate" ? "celebrate" : "simple";
  const audio = sound === "on" ? "on" : "off";

  return {
    visual,
    sound: audio,
    playVisualCelebration: false,
    playSound: false,
  };
}
