import { clientActivity } from "./client-activities.js";
// Client-only presentation metadata over the existing local Private/Client tasks.
export const CLIENT_SEQUENCE_LABELS = Object.freeze(["First", "Then", "Next", "Last"]);

export function normalizeClientSequence(value) {
  const partCount = Number.isInteger(value?.partCount) && value.partCount >= 2 && value.partCount <= 4 ? value.partCount : 2;
  const assignments = Object.fromEntries(Object.entries(value?.assignments && typeof value.assignments === "object" ? value.assignments : {})
    .filter(([, part]) => Number.isInteger(part) && part >= 0 && part < 4));
  const activities = Object.fromEntries(Object.entries(value?.activities && typeof value.activities === "object" ? value.activities : {})
    .filter(([part, activity]) => /^[0-3]$/.test(part) && clientActivity(activity)));
  const taskActivities = Object.fromEntries(Object.entries(value?.taskActivities ?? {}).filter(([, activity]) => clientActivity(activity)));
  return { fullListLayout: value?.fullListLayout === "activities" ? "activities" : "custom", taskActivities, version: 1, enabled: value?.enabled === true, partCount, assignments, activities };
}

export function reconcileClientSequence(value, tasks, newTaskPart = 0) {
  const model = normalizeClientSequence(value);
  const fallback = Number.isInteger(newTaskPart) ? Math.max(0, Math.min(model.partCount - 1, newTaskPart)) : 0;
  return { ...model, taskActivities: Object.fromEntries(tasks.filter(task => Object.hasOwn(model.taskActivities, task.id)).map(task => [task.id, model.taskActivities[task.id]])), assignments: Object.fromEntries(tasks.map(task => [task.id,
    Object.hasOwn(model.assignments, task.id) ? model.assignments[task.id] : fallback])) };
}

export function assignClientSequencePart(value, taskId, part) {
  const model = normalizeClientSequence(value);
  if (!Number.isInteger(part) || part < 0 || part >= model.partCount) return model;
  return { ...model, assignments: { ...model.assignments, [taskId]: part } };
}

export function clientSequenceState(value, tasks) {
  const model = normalizeClientSequence(value);
  const groups = CLIENT_SEQUENCE_LABELS.slice(0, model.partCount).map((label, index) => ({index,label,activity:clientActivity(model.activities[index]),tasks:[],complete:false}));
  for (const task of tasks) {
    const assigned = Object.hasOwn(model.assignments, task.id) ? model.assignments[task.id] : 0;
    groups[Math.min(model.partCount - 1, assigned)].tasks.push(task);
  }
  for (const group of groups) group.complete = group.tasks.length > 0 && group.tasks.every(task => task.completed);
  const activeIndex = groups.findIndex(group => group.tasks.some(task => !task.completed));
  return { ...model, groups, activeIndex: activeIndex < 0 ? null : activeIndex,
    complete: tasks.length > 0 && tasks.every(task => task.completed),
    orderedTasks: groups.flatMap(group => group.tasks) };
}


export function assignClientPartActivity(value, part, activity) {
  const model = normalizeClientSequence(value);
  if (!Number.isInteger(part) || part < 0 || part >= model.partCount) return model;
  if (activity !== "" && !clientActivity(activity)) return model;
  const activities = { ...model.activities };
  if (activity === "") delete activities[part];
  else activities[part] = activity;
  return { ...model, activities };
}

export function assignClientTaskActivity(value, taskId, activity) {
  const model = normalizeClientSequence(value);
  if (activity !== "" && !clientActivity(activity)) return model;
  const taskActivities = { ...model.taskActivities };
  if (activity === "") delete taskActivities[taskId];
  else taskActivities[taskId] = activity;
  return { ...model, taskActivities };
}
