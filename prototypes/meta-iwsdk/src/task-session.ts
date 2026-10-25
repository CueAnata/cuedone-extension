import {
  addTask,
  nextUnfinishedTask,
  normalizeTaskText,
  setTaskCompleted,
  type Task,
} from '../../../src/shared/tasks.js';
import {
  newListFromCarryover,
  unfinishedTasks,
} from '../../../src/shared/list-lifecycle.js';

export const COMPLETE_INPUT_GUARD_MS = 650;

export interface TaskStore {
  load(): Promise<Task[]>;
  save(tasks: Task[], expected?: Task[]): Promise<void>;
}

export type SessionPhase = 'loading' | 'ready' | 'saving' | 'load-error';

export class PersonalTaskSession {
  tasks: Task[] = [];
  phase: SessionPhase = 'loading';
  message = 'Loading your local list...';
  private lastCompletionAt = Number.NEGATIVE_INFINITY;
  private readonly store: TaskStore;
  private readonly now: () => number;
  private readonly makeId: () => string;

  constructor(
    store: TaskStore,
    now: () => number = Date.now,
    makeId: () => string = () => crypto.randomUUID(),
  ) {
    this.store = store;
    this.now = now;
    this.makeId = makeId;
  }

  get activeTask(): Task | null {
    return nextUnfinishedTask(this.tasks);
  }

  get completedCount(): number {
    return this.tasks.filter((task) => task.completed).length;
  }

  get waitingTaskCount(): number {
    const unfinishedCount = this.tasks.length - this.completedCount;
    return Math.max(0, unfinishedCount - (this.activeTask == null ? 0 : 1));
  }

  get unfinishedTaskCount(): number {
    return unfinishedTasks(this.tasks).length;
  }

  async load(): Promise<boolean> {
    this.phase = 'loading';
    this.message = 'Loading your local list...';
    try {
      this.tasks = await this.store.load();
      this.phase = 'ready';
      this.message = 'Saved locally on this headset.';
      return true;
    } catch (error) {
      this.phase = 'load-error';
      this.message = messageFrom(error, 'CueDone could not load the VR list.');
      return false;
    }
  }

  async add(text: string): Promise<boolean> {
    const normalized = normalizeTaskText(text);
    if (!normalized || this.phase !== 'ready') {
      if (!normalized && this.phase === 'ready') {
        this.message = 'Type a task, then press Enter or choose Done.';
      }
      return false;
    }

    const addedToWaiting = this.activeTask != null;
    const nextTasks = addTask(this.tasks, normalized, this.now(), this.makeId());
    return this.saveThenApply(
      nextTasks,
      addedToWaiting ? 'Saved: added to waiting.' : 'Saved: task is NOW.',
    );
  }

  async completeActive(at = this.now()): Promise<boolean> {
    return this.completeTask(this.activeTask?.id, at);
  }

  async completeTask(id: string | undefined, at = this.now()): Promise<boolean> {
    const active = this.tasks.find(task => task.id === id && !task.completed);
    if (active == null || this.phase !== 'ready') {
      return false;
    }
    if (at - this.lastCompletionAt < COMPLETE_INPUT_GUARD_MS) {
      return false;
    }

    this.lastCompletionAt = at;
    const nextTasks = setTaskCompleted(this.tasks, active.id, true);
    const saved = await this.saveThenApply(nextTasks, 'Task complete.');
    if (!saved) {
      this.lastCompletionAt = Number.NEGATIVE_INFINITY;
    }
    return saved;
  }

  async reset(): Promise<boolean> {
    if (this.phase !== 'ready' || !this.completedCount) return false;
    const saved = await this.saveThenApply(this.tasks.map(task => ({...task, completed: false})), 'List reset.');
    if (saved) this.lastCompletionAt = Number.NEGATIVE_INFINITY;
    return saved;
  }

  async startNewList(carryUnfinished: boolean): Promise<boolean> {
    if (this.phase !== 'ready') return false;

    const selectedIds = carryUnfinished
      ? unfinishedTasks(this.tasks).map((task) => task.id)
      : [];
    const nextTasks = newListFromCarryover(this.tasks, selectedIds);
    const taskLabel = nextTasks.length === 1 ? 'task' : 'tasks';
    const saved = await this.saveThenApply(
      nextTasks,
      nextTasks.length === 0
        ? 'Saved: new list is empty.'
        : `Saved: new list has ${nextTasks.length} carried ${taskLabel}.`,
    );
    if (saved) {
      this.lastCompletionAt = Number.NEGATIVE_INFINITY;
    }
    return saved;
  }

  private async saveThenApply(
    nextTasks: Task[],
    successMessage: string,
  ): Promise<boolean> {
    this.phase = 'saving';
    this.message = 'Saving...';
    try {
      await this.store.save(nextTasks, this.tasks);
      this.tasks = nextTasks;
      this.phase = 'ready';
      this.message = successMessage;
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'TaskConflictError') {
        try { this.tasks = await this.store.load(); }
        catch { this.phase = 'load-error'; this.message = 'CueDone could not restore the updated list.'; return false; }
      }
      this.phase = 'ready';
      this.message = messageFrom(error, 'CueDone could not save the change.');
      return false;
    }
  }
}

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
