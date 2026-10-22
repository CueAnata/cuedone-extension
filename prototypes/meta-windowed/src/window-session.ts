import {
  addTask,
  deleteTask,
  nextUnfinishedTask,
  normalizeTaskText,
  reorderTasks,
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
  save(tasks: Task[]): Promise<void>;
}

export type SessionPhase = 'loading' | 'ready' | 'saving' | 'load-error';

export class WindowedTaskSession {
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

  get unfinishedTaskCount(): number {
    return unfinishedTasks(this.tasks).length;
  }

  get waitingTaskCount(): number {
    return Math.max(0, this.unfinishedTaskCount - (this.activeTask ? 1 : 0));
  }

  async load(): Promise<boolean> {
    this.phase = 'loading';
    this.message = 'Loading your local list...';
    try {
      this.tasks = await this.store.load();
      this.phase = 'ready';
      this.message = 'Saved locally in this windowed experiment.';
      return true;
    } catch (error) {
      this.phase = 'load-error';
      this.message = messageFrom(error, 'CueDone could not load the windowed list.');
      return false;
    }
  }

  async add(text: string): Promise<boolean> {
    const normalized = normalizeTaskText(text);
    if (!normalized || this.phase !== 'ready') {
      if (!normalized && this.phase === 'ready') {
        this.message = 'Enter a task before choosing Add.';
      }
      return false;
    }

    const queued = this.activeTask != null;
    const next = addTask(this.tasks, normalized, this.now(), this.makeId());
    return this.saveThenApply(
      next,
      queued ? 'Saved: task added to waiting.' : 'Saved: task is NOW.',
    );
  }

  async completeActive(at = this.now()): Promise<boolean> {
    const active = this.activeTask;
    if (!active || this.phase !== 'ready') return false;
    if (at - this.lastCompletionAt < COMPLETE_INPUT_GUARD_MS) return false;

    this.lastCompletionAt = at;
    const next = setTaskCompleted(this.tasks, active.id, true);
    const saved = await this.saveThenApply(next, 'Saved: task complete.');
    if (!saved) this.lastCompletionAt = Number.NEGATIVE_INFINITY;
    return saved;
  }

  async moveTask(id: string, offset: -1 | 1): Promise<boolean> {
    if (this.phase !== 'ready') return false;
    const from = this.tasks.findIndex((task) => task.id === id);
    const to = from + offset;
    const next = reorderTasks(this.tasks, from, to);
    if (next === this.tasks) return false;
    return this.saveThenApply(next, 'Saved: task order updated.');
  }

  async removeTask(id: string): Promise<boolean> {
    if (this.phase !== 'ready' || !this.tasks.some((task) => task.id === id)) {
      return false;
    }
    return this.saveThenApply(deleteTask(this.tasks, id), 'Saved: task removed.');
  }

  async startNewList(carryUnfinished: boolean): Promise<boolean> {
    if (this.phase !== 'ready') return false;
    const selectedIds = carryUnfinished
      ? unfinishedTasks(this.tasks).map((task) => task.id)
      : [];
    const next = newListFromCarryover(this.tasks, selectedIds);
    const label = next.length === 1 ? 'task' : 'tasks';
    const saved = await this.saveThenApply(
      next,
      next.length === 0
        ? 'Saved: new list is empty.'
        : `Saved: new list has ${next.length} carried ${label}.`,
    );
    if (saved) this.lastCompletionAt = Number.NEGATIVE_INFINITY;
    return saved;
  }

  private async saveThenApply(next: Task[], successMessage: string): Promise<boolean> {
    this.phase = 'saving';
    this.message = 'Saving...';
    try {
      await this.store.save(next);
      this.tasks = next;
      this.phase = 'ready';
      this.message = successMessage;
      return true;
    } catch (error) {
      this.phase = 'ready';
      this.message = messageFrom(error, 'CueDone could not save the change.');
      return false;
    }
  }
}

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
