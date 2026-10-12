import type { Task } from './tasks.js';

export function unfinishedTasks(tasks: Task[] | null | undefined): Task[];
export function newListFromCarryover(
  tasks: Task[],
  selectedIds?: string[],
): Task[];
