export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

export function normalizeTaskText(text: unknown): string;
export function createTask(text: string, now?: number, id?: string): Task;
export function addTask(
  tasks: Task[],
  text: string,
  now?: number,
  id?: string,
): Task[];
export function toggleTask(tasks: Task[], id: string): Task[];
export function setTaskCompleted(
  tasks: Task[],
  id: string,
  completed?: boolean,
): Task[];
export function nextUnfinishedTask(tasks: Task[] | null | undefined): Task | null;
export function deleteTask(tasks: Task[], id: string): Task[];
export function canResetList(tasks: unknown): boolean;
export function resetCompletedTasks(tasks: Task[]): Task[];
export function reorderTasks(
  tasks: Task[],
  fromIndex: number,
  toIndex: number,
): Task[];
export function isTaskList(value: unknown): value is Task[];
