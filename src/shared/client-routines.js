import { createTask } from "./tasks.js";
import { normalizeClientSequence, reconcileClientSequence } from "./client-sequence.js";

export function captureClientRoutine(name, tasks, sequence, id = crypto.randomUUID()) {
  const title = typeof name === "string" ? name.trim().slice(0,80) : "";
  if (!title) throw new Error("Name the routine first.");
  const model = reconcileClientSequence(sequence,tasks);
  return {id,name:title,version:1,sequence:{enabled:model.enabled,partCount:model.partCount,fullListLayout:model.fullListLayout,activities:model.activities},
    tasks:tasks.map(task=>({text:task.text,part:model.assignments[task.id],activity:model.taskActivities[task.id] ?? ""}))};
}
export function instantiateClientRoutine(routine) {
  const tasks = routine.tasks.map(task=>createTask(task.text));
  const sequence = normalizeClientSequence({...routine.sequence,
    assignments:Object.fromEntries(tasks.map((task,i)=>[task.id,routine.tasks[i].part])),
    taskActivities:Object.fromEntries(tasks.map((task,i)=>[task.id,routine.tasks[i].activity]))});
  return {tasks,sequence:reconcileClientSequence(sequence,tasks)};
}
export function normalizeClientRoutines(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(r=>r && typeof r.id === "string" && typeof r.name === "string" && r.name.trim() && Array.isArray(r.tasks) && r.tasks.every(t=>t && typeof t.text === "string" && t.text.trim())).map(r=>{
    const restored=instantiateClientRoutine(r);
    return captureClientRoutine(r.name,restored.tasks,restored.sequence,r.id);
  });
}
