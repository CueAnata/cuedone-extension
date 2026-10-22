import type { Task } from '../../../src/shared/tasks.js';
import { WindowedTaskStore } from './companion-store.js';
import { WindowedTaskSession } from './window-session.js';

type ViewMode = 'compact' | 'expanded' | 'planning';

function required<T extends Element>(selector: string): T {
  const value = document.querySelector<T>(selector);
  if (!value) throw new Error(`Missing required element: ${selector}`);
  return value;
}

export class CompanionApp {
  private readonly session = new WindowedTaskSession(new WindowedTaskStore());
  private view: ViewMode = 'compact';
  private reviewingNewList = false;

  private readonly root = required<HTMLElement>('#app');
  private readonly taskText = required<HTMLElement>('#task-text');
  private readonly progressText = required<HTMLElement>('#progress-text');
  private readonly waitingText = required<HTMLElement>('#waiting-text');
  private readonly progressBar = required<HTMLElement>('#progress-bar');
  private readonly statusText = required<HTMLElement>('#status-text');
  private readonly input = required<HTMLInputElement>('#task-input');
  private readonly addButton = required<HTMLButtonElement>('#add-button');
  private readonly completeButton = required<HTMLButtonElement>('#complete-button');
  private readonly planningList = required<HTMLOListElement>('#planning-list');
  private readonly newListButton = required<HTMLButtonElement>('#new-list-button');
  private readonly retryButton = required<HTMLButtonElement>('#retry-button');
  private readonly review = required<HTMLElement>('#new-list-review');
  private readonly reviewCopy = required<HTMLElement>('#new-list-copy');
  private readonly carryButton = required<HTMLButtonElement>('#carry-button');
  private readonly emptyButton = required<HTMLButtonElement>('#empty-button');
  private readonly cancelButton = required<HTMLButtonElement>('#cancel-new-list');

  start(): void {
    document.querySelectorAll<HTMLButtonElement>('[data-view-button]').forEach((button) => {
      button.addEventListener('click', () => {
        this.setView(button.dataset.viewButton as ViewMode);
      });
    });
    this.input.addEventListener('input', () => this.renderControls());
    this.input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' && !event.isComposing) void this.addTask();
    });
    this.addButton.addEventListener('click', () => void this.addTask());
    this.completeButton.addEventListener('click', () => void this.completeTask());
    this.newListButton.addEventListener('click', () => this.openNewList());
    this.retryButton.addEventListener('click', () => void this.load());
    this.carryButton.addEventListener('click', () => void this.createNewList(true));
    this.emptyButton.addEventListener('click', () => void this.createNewList(false));
    this.cancelButton.addEventListener('click', () => this.cancelNewList());

    this.render();
    void this.load();
  }

  private async load(): Promise<void> {
    const pending = this.session.load();
    this.render();
    await pending;
    this.render();
  }

  private setView(view: ViewMode): void {
    this.view = view;
    this.render();
    if (view !== 'compact' && this.session.phase === 'ready') this.input.focus();
  }

  private async addTask(): Promise<void> {
    const draft = this.input.value;
    const pending = this.session.add(draft);
    this.render();
    if (await pending) this.input.value = '';
    this.render();
    if (this.view !== 'compact') this.input.focus();
  }

  private async completeTask(): Promise<void> {
    const pending = this.session.completeActive();
    this.render();
    await pending;
    this.render();
  }

  private openNewList(): void {
    if (this.session.phase !== 'ready') return;
    this.reviewingNewList = true;
    this.render();
    this.cancelButton.focus();
  }

  private cancelNewList(): void {
    if (this.session.phase === 'saving') return;
    this.reviewingNewList = false;
    this.render();
    this.newListButton.focus();
  }

  private async createNewList(carryUnfinished: boolean): Promise<void> {
    const pending = this.session.startNewList(carryUnfinished);
    this.render();
    if (await pending) {
      this.reviewingNewList = false;
      this.view = 'expanded';
      this.input.value = '';
    }
    this.render();
    if (!this.reviewingNewList) this.input.focus();
  }

  private async moveTask(task: Task, offset: -1 | 1): Promise<void> {
    const pending = this.session.moveTask(task.id, offset);
    this.render();
    await pending;
    this.render();
  }

  private async removeTask(task: Task): Promise<void> {
    const pending = this.session.removeTask(task.id);
    this.render();
    await pending;
    this.render();
  }

  private render(): void {
    const active = this.session.activeTask;
    const isLoading = this.session.phase === 'loading';
    const isSaving = this.session.phase === 'saving';
    const loadFailed = this.session.phase === 'load-error';
    const busy = isLoading || isSaving;
    const total = this.session.tasks.length;
    const completed = this.session.completedCount;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    this.root.dataset.view = this.view;
    this.root.setAttribute('aria-busy', String(busy));
    document.querySelectorAll<HTMLButtonElement>('[data-view-button]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.viewButton === this.view));
    });

    this.taskText.textContent = isLoading
      ? 'Loading your local list...'
      : loadFailed
        ? 'Your windowed list could not be loaded.'
        : active?.text ?? 'No active task. Add one when you are ready.';
    this.progressText.textContent = `${completed} of ${total} complete`;
    this.waitingText.textContent = `${this.session.waitingTaskCount} ${this.session.waitingTaskCount === 1 ? 'task' : 'tasks'} waiting`;
    this.progressBar.style.width = `${percent}%`;
    this.statusText.textContent = this.session.message;
    this.statusText.dataset.kind = loadFailed || /could not|failed/i.test(this.session.message)
      ? 'error'
      : this.session.message.startsWith('Saved:')
        ? 'success'
        : 'neutral';

    this.input.disabled = busy || loadFailed || this.reviewingNewList;
    this.completeButton.disabled = busy || loadFailed || this.reviewingNewList || !active;
    this.newListButton.disabled = busy || loadFailed || this.reviewingNewList;
    this.retryButton.hidden = !loadFailed;
    this.retryButton.disabled = isLoading;
    this.review.hidden = !this.reviewingNewList;
    this.carryButton.hidden = this.session.unfinishedTaskCount === 0;
    this.carryButton.disabled = isSaving;
    this.emptyButton.disabled = isSaving;
    this.cancelButton.disabled = isSaving;

    const unfinished = this.session.unfinishedTaskCount;
    this.reviewCopy.textContent = unfinished === 0
      ? 'No unfinished tasks remain. Start empty to remove completed tasks, or Cancel to keep this list.'
      : `${unfinished} unfinished ${unfinished === 1 ? 'task' : 'tasks'} can carry forward in the same order. Completed tasks will be removed. Start empty removes every task. Cancel changes nothing.`;

    this.renderPlanningList();
    this.renderControls();
  }

  private renderControls(): void {
    const unavailable =
      this.session.phase !== 'ready' ||
      this.reviewingNewList ||
      this.input.value.trim().length === 0;
    this.addButton.disabled = unavailable;
  }

  private renderPlanningList(): void {
    const disabled = this.session.phase !== 'ready' || this.reviewingNewList;
    this.planningList.replaceChildren();

    if (this.session.tasks.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'empty-list';
      empty.textContent = 'No tasks yet. Add the first task above.';
      this.planningList.append(empty);
      return;
    }

    this.session.tasks.forEach((task, index) => {
      const item = document.createElement('li');
      item.className = 'planning-item';
      item.dataset.completed = String(task.completed);

      const copy = document.createElement('div');
      copy.className = 'planning-copy';
      const position = document.createElement('span');
      position.className = 'task-position';
      position.textContent = task.completed ? 'Done' : task.id === this.session.activeTask?.id ? 'Now' : 'Waiting';
      const text = document.createElement('span');
      text.className = 'planning-task-text';
      text.textContent = task.text;
      copy.append(position, text);

      const actions = document.createElement('div');
      actions.className = 'planning-actions';
      actions.append(
        this.taskButton('Move up', '↑', disabled || index === 0, () => void this.moveTask(task, -1)),
        this.taskButton('Move down', '↓', disabled || index === this.session.tasks.length - 1, () => void this.moveTask(task, 1)),
        this.taskButton('Delete task', 'Delete', disabled, () => void this.removeTask(task)),
      );

      item.append(copy, actions);
      this.planningList.append(item);
    });
  }

  private taskButton(
    label: string,
    text: string,
    disabled: boolean,
    action: () => void,
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'task-button';
    button.textContent = text;
    button.setAttribute('aria-label', label);
    button.disabled = disabled;
    button.addEventListener('click', action);
    return button;
  }
}
