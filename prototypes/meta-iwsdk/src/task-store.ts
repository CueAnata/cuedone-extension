import { isTaskList, type Task } from '../../../src/shared/tasks.js';

import { withLocalLock } from './local-sync.ts';

export const TASK_STORE_KEY = 'cuedone.vr.personal.tasks.v1';
export const TASK_STORE_VERSION = 1;

interface StoredTaskList {
  version: typeof TASK_STORE_VERSION;
  tasks: Task[];
}

export interface TaskStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class LocalTaskStore {
  private readonly storage: TaskStorage;

  constructor(storage: TaskStorage = window.localStorage) {
    this.storage = storage;
  }

  async load(): Promise<Task[]> {
    let raw: string | null;
    try {
      raw = this.storage.getItem(TASK_STORE_KEY);
    } catch {
      throw new Error('CueDone could not read local storage.');
    }

    if (raw == null) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as Partial<StoredTaskList>;
      if (parsed.version !== TASK_STORE_VERSION || !isTaskList(parsed.tasks)) {
        throw new Error('Unsupported task data.');
      }
      return parsed.tasks.map((task) => ({ ...task }));
    } catch {
      throw new Error('CueDone could not restore the saved VR list.');
    }
  }

  async save(tasks: Task[], expected?: Task[]): Promise<void> {
    const value: StoredTaskList = {
      version: TASK_STORE_VERSION,
      tasks: tasks.map((task) => ({ ...task })),
    };

    await withLocalLock(TASK_STORE_KEY, async () => {
      if (expected) {
        const current = await this.load();
        if (JSON.stringify(current) !== JSON.stringify(expected)) {
          const error = new Error('The list changed in another window. Review it and try again.');
          error.name = 'TaskConflictError';
          throw error;
        }
      }
      try { this.storage.setItem(TASK_STORE_KEY, JSON.stringify(value)); }
      catch { throw new Error('CueDone could not save the VR list.'); }
    });
  }
}
