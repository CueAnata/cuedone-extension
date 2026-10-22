import { isTaskList, type Task } from '../../../src/shared/tasks.js';

export const TASK_STORE_KEY = 'cuedone.vr.windowed.tasks.v1';
export const TASK_STORE_VERSION = 1;

interface StoredTaskList {
  version: typeof TASK_STORE_VERSION;
  tasks: Task[];
}

export interface TaskStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class WindowedTaskStore {
  private readonly storage: TaskStorage;

  constructor(storage: TaskStorage = window.localStorage) {
    this.storage = storage;
  }

  async load(): Promise<Task[]> {
    let raw: string | null;
    try {
      raw = this.storage.getItem(TASK_STORE_KEY);
    } catch {
      throw new Error('CueDone could not read windowed local storage.');
    }

    if (raw == null) return [];

    try {
      const parsed = JSON.parse(raw) as Partial<StoredTaskList>;
      if (parsed.version !== TASK_STORE_VERSION || !isTaskList(parsed.tasks)) {
        throw new Error('Unsupported task data.');
      }
      return parsed.tasks.map((task) => ({ ...task }));
    } catch {
      throw new Error('CueDone could not restore the saved windowed list.');
    }
  }

  async save(tasks: Task[]): Promise<void> {
    const value: StoredTaskList = {
      version: TASK_STORE_VERSION,
      tasks: tasks.map((task) => ({ ...task })),
    };

    try {
      this.storage.setItem(TASK_STORE_KEY, JSON.stringify(value));
    } catch {
      throw new Error('CueDone could not save the windowed list.');
    }
  }
}
