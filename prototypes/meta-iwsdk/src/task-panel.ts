import {
  createSystem,
  UIKit,
  UIKitMLAsset,
  VisibilityState,
} from '@iwsdk/core';
import { Settings } from '@pmndrs/uikit-lucide/dist/Settings.js';
import { publishSpatialProgress } from './spatial-presentation.js';
import { LocalTaskStore, TASK_STORE_KEY } from './task-store.js';
import { watchLocalStorage } from './local-sync.js';
import { isForwardCompletion } from './garden-progress.js';
import { PersonalTaskSession } from './task-session.js';

type TaskInput = UIKit.Input & { input: UIKit.Input };

interface BrowserPanelElements {
  root: HTMLElement;
  taskText: HTMLElement;
  progressText: HTMLElement;
  waitingText: HTMLElement;
  form: HTMLFormElement;
  input: HTMLInputElement;
  addButton: HTMLButtonElement;
  completeButton: HTMLButtonElement;
  statusText: HTMLElement;
  newListButton: HTMLButtonElement;
  review: HTMLElement;
  reviewCopy: HTMLElement;
  carryButton: HTMLButtonElement;
  emptyButton: HTMLButtonElement;
  cancelButton: HTMLButtonElement;
  retryButton: HTMLButtonElement;
  xrButton: HTMLButtonElement;
}

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing required browser control: ${selector}`);
  return element;
}

function browserPanelElements(): BrowserPanelElements {
  return {
    root: required<HTMLElement>('#browser-panel'),
    taskText: required<HTMLElement>('#browser-task-text'),
    progressText: required<HTMLElement>('#browser-progress-text'),
    waitingText: required<HTMLElement>('#browser-waiting-text'),
    form: required<HTMLFormElement>('#browser-task-form'),
    input: required<HTMLInputElement>('#browser-task-input'),
    addButton: required<HTMLButtonElement>('#browser-add-button'),
    completeButton: required<HTMLButtonElement>('#browser-complete-button'),
    statusText: required<HTMLElement>('#browser-status-text'),
    newListButton: required<HTMLButtonElement>('#browser-new-list-button'),
    review: required<HTMLElement>('#browser-new-list-review'),
    reviewCopy: required<HTMLElement>('#browser-new-list-copy'),
    carryButton: required<HTMLButtonElement>('#browser-carry-button'),
    emptyButton: required<HTMLButtonElement>('#browser-empty-button'),
    cancelButton: required<HTMLButtonElement>('#browser-cancel-new-list'),
    retryButton: required<HTMLButtonElement>('#browser-retry-button'),
    xrButton: required<HTMLButtonElement>('#browser-xr-button'),
  };
}

export class TaskPanelSystem extends createSystem({}) {
  private readonly session = new PersonalTaskSession(new LocalTaskStore());
  private readonly browser = browserPanelElements();
  private settingsOpen = false;
  private entryOpen = false;
  private reviewingClear = false;
  private rowSignature = '';
  private readonly rows: Array<{row: UIKit.Container; pollen: UIKit.Container; bee: UIKit.Container; id: string; elapsed: number}> = [];
  private emptyRow?: UIKit.Text;
  private previousTasks = new Map<string, boolean>();
  private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  private motionEnabled = true;
  private draft = '';
  private reviewingNewList = false;
  private remotePending = false;
  private remoteFeedback = false;
  private allowRemoteFeedback = false;
  private syncQueued = false;

  init(): void {
    const panel = this.world.requireSceneObject<UIKitMLAsset>('task-panel');
    const gear = new Settings({width: 3, height: 3, color: '#332D25'});
    const settingsButton = panel.requireElementById<UIKit.Container>('settings-toggle');
    settingsButton.name = 'Settings';
    settingsButton.setProperties({hover: {backgroundColor: '#FDE68A'}});
    settingsButton.add(gear);
    this.cleanupFuncs.push(() => {gear.removeFromParent(); gear.dispose();});
    const taskInput = panel.requireElementById<TaskInput>('task-input');
    const addButton = panel.requireElementById('add-button');
    const completeButton = panel.requireElementById('complete-button');
    const newListButton = panel.requireElementById('new-list-button');
    const carryButton = panel.requireElementById('carry-button');
    const emptyButton = panel.requireElementById('empty-button');
    const cancelNewListButton = panel.requireElementById('cancel-new-list');
    const retryButton = panel.requireElementById('retry-button');
    const xrButton = panel.requireElementById('xr-button');
    const exitButton = panel.requireElementById('exit-button');

    const bind = (id: string, action: () => void) => {
      const spatial = panel.requireElementById(id);
      const browser = required<HTMLElement>(`#browser-${id}`);
      spatial.addEventListener('click', action);
      browser.addEventListener('click', action);
      this.cleanupFuncs.push(() => {spatial.removeEventListener('click', action); browser.removeEventListener('click', action);});
    };
    bind('settings-toggle', () => {this.settingsOpen = !this.settingsOpen; this.render(panel);});
    bind('show-add-button', () => {this.entryOpen = !this.entryOpen; this.render(panel); if(this.isBrowser() && this.entryOpen)this.browser.input.focus();});
    bind('reset-button', () => {void this.resetList(panel);});
    bind('clear-button', () => {
      this.openNewListReview(panel, taskInput, true);
    });
    bind('done-button', () => {
      this.session.message = 'All done. Your completed list is saved.';
      this.render(panel);
      if(!this.isBrowser())void this.world.exitXR();
    });
    this.cleanupFuncs.push(() => this.disposeRows());

    taskInput.name = 'TaskInput';
    addButton.name = 'AddTask';
    completeButton.name = 'CompleteTask';
    newListButton.name = 'NewList';
    carryButton.name = 'CarryUnfinishedTasks';
    emptyButton.name = 'StartEmptyList';
    cancelNewListButton.name = 'CancelNewList';
    retryButton.name = 'RetryLoad';
    xrButton.name = 'EnterXR';
    exitButton.name = 'ExitXR';

    taskInput.setProperties({
      onValueChange: (value: string) => {
        this.draft = value;
        addButton.setProperties({
          disabled:
            this.session.phase !== 'ready' ||
            this.reviewingNewList ||
            value.trim().length === 0,
        });
      },
    });

    const onAdd = () => void this.addTask(panel, taskInput);
    const onComplete = () => void this.completeTask(panel);
    const onNewList = () => this.openNewListReview(panel, taskInput);
    const onCarry = () => void this.createNewList(panel, taskInput, true);
    const onEmpty = () => void this.createNewList(panel, taskInput, false);
    const onCancelNewList = () => this.cancelNewListReview(panel);
    const onRetry = () => void this.load(panel);
    const onEnterXR = () => void this.world.launchXR();
    const onExitXR = () => void this.world.exitXR();
    const onBrowserInput = () => {
      this.draft = this.browser.input.value;
      this.render(panel);
    };
    const onBrowserSubmit = (event: SubmitEvent) => {
      event.preventDefault();
      void this.addTask(panel, taskInput);
    };
    const onBrowserComplete = () => void this.completeTask(panel);
    const onBrowserNewList = () => this.openNewListReview(panel, taskInput);
    const onBrowserCarry = () =>
      void this.createNewList(panel, taskInput, true);
    const onBrowserEmpty = () =>
      void this.createNewList(panel, taskInput, false);
    const onBrowserCancel = () => this.cancelNewListReview(panel);

    addButton.addEventListener('click', onAdd);
    completeButton.addEventListener('click', onComplete);
    newListButton.addEventListener('click', onNewList);
    carryButton.addEventListener('click', onCarry);
    emptyButton.addEventListener('click', onEmpty);
    cancelNewListButton.addEventListener('click', onCancelNewList);
    retryButton.addEventListener('click', onRetry);
    xrButton.addEventListener('click', onEnterXR);
    exitButton.addEventListener('click', onExitXR);
    this.browser.input.addEventListener('input', onBrowserInput);
    this.browser.form.addEventListener('submit', onBrowserSubmit);
    this.browser.completeButton.addEventListener('click', onBrowserComplete);
    this.browser.newListButton.addEventListener('click', onBrowserNewList);
    this.browser.carryButton.addEventListener('click', onBrowserCarry);
    this.browser.emptyButton.addEventListener('click', onBrowserEmpty);
    this.browser.cancelButton.addEventListener('click', onBrowserCancel);
    this.browser.retryButton.addEventListener('click', onRetry);
    this.browser.xrButton.addEventListener('click', onEnterXR);

    this.cleanupFuncs.push(
      () => addButton.removeEventListener('click', onAdd),
      () => completeButton.removeEventListener('click', onComplete),
      () => newListButton.removeEventListener('click', onNewList),
      () => carryButton.removeEventListener('click', onCarry),
      () => emptyButton.removeEventListener('click', onEmpty),
      () => cancelNewListButton.removeEventListener('click', onCancelNewList),
      () => retryButton.removeEventListener('click', onRetry),
      () => xrButton.removeEventListener('click', onEnterXR),
      () => exitButton.removeEventListener('click', onExitXR),
      () => this.browser.input.removeEventListener('input', onBrowserInput),
      () => this.browser.form.removeEventListener('submit', onBrowserSubmit),
      () =>
        this.browser.completeButton.removeEventListener(
          'click',
          onBrowserComplete,
        ),
      () =>
        this.browser.newListButton.removeEventListener(
          'click',
          onBrowserNewList,
        ),
      () =>
        this.browser.carryButton.removeEventListener('click', onBrowserCarry),
      () =>
        this.browser.emptyButton.removeEventListener('click', onBrowserEmpty),
      () =>
        this.browser.cancelButton.removeEventListener('click', onBrowserCancel),
      () => this.browser.retryButton.removeEventListener('click', onRetry),
      () => this.browser.xrButton.removeEventListener('click', onEnterXR),
      this.world.visibilityState.subscribe(() =>
        this.syncPresentation(panel, taskInput),
      ),
    );

    this.cleanupFuncs.push(watchLocalStorage(window,[TASK_STORE_KEY],source=>{
      this.remotePending = true;
      this.allowRemoteFeedback = source==='storage';
      this.queueRemoteRefresh(panel);
    }));
    this.syncPresentation(panel, taskInput);
    this.render(panel);
    void this.load(panel);
  }

  private queueRemoteRefresh(panel: UIKitMLAsset): void {
    if(!this.remotePending || this.syncQueued || this.session.phase==='loading' || this.session.phase==='saving')return;
    this.syncQueued=true;
    queueMicrotask(()=>{
      this.syncQueued=false;
      if(this.session.phase==='saving' || this.session.phase==='loading')return;
      this.remotePending=false;
      const allowFeedback=this.allowRemoteFeedback;
      this.allowRemoteFeedback=false;
      void this.load(panel,true,allowFeedback);
    });
  }

  private async load(panel: UIKitMLAsset, fromCompanion = false, allowFeedback = false): Promise<void> {
    const previous = this.session.tasks;
    const pending = this.session.load();
    this.render(panel);
    const loaded = await pending;
    if(fromCompanion && loaded) {
      this.reviewingNewList=false;
      this.remoteFeedback=allowFeedback && isForwardCompletion(previous,this.session.tasks);
    }
    this.render(panel);
    this.remoteFeedback=false;
  }

  private async addTask(
    panel: UIKitMLAsset,
    input: TaskInput,
  ): Promise<void> {
    if (this.session.phase !== 'ready' || this.reviewingNewList) return;
    const submitted = this.draft;
    const pending = this.session.add(submitted);
    this.render(panel);
    if (await pending) {
      if (this.draft === submitted) {
        this.draft = '';
        // Keep typing uncontrolled so the system keyboard retains its caret.
        // Clear the Horizon wrapper's real input only after persistence succeeds.
        input.input.uncontrolledSignal.value = '';
        this.browser.input.value = '';
      }
    }
    this.render(panel);
  }

  private async completeTask(panel: UIKitMLAsset, id?: string): Promise<void> {
    const pending = this.session.completeTask(id ?? this.session.activeTask?.id);
    this.render(panel);
    await pending;
    this.render(panel);
  }

  private openNewListReview(panel: UIKitMLAsset, input: TaskInput, clear = false): void {
    if (this.session.phase !== 'ready') return;
    this.reviewingNewList = true;
    this.reviewingClear = clear;
    input.input.blur();
    this.browser.input.blur();
    this.render(panel);
    if (this.isBrowser()) this.browser.cancelButton.focus();
  }

  private cancelNewListReview(panel: UIKitMLAsset): void {
    if (this.session.phase === 'saving') return;
    this.reviewingNewList = false;
    this.render(panel);
    if (this.isBrowser()) this.browser.newListButton.focus();
  }

  private async createNewList(
    panel: UIKitMLAsset,
    input: TaskInput,
    carryUnfinished: boolean,
  ): Promise<void> {
    if (this.session.phase !== 'ready' && this.session.phase !== 'saving') return;
    const submittedDraft = this.draft;
    const pending = this.session.startNewList(carryUnfinished);
    this.render(panel);
    if (await pending) {
      this.reviewingNewList = false;
      this.entryOpen = true;
      this.reviewingClear = false;
      if (this.draft === submittedDraft) {
        this.draft = '';
        input.input.uncontrolledSignal.value = '';
        this.browser.input.value = '';
      }
    }
    this.render(panel);
    if (!this.reviewingNewList && this.isBrowser()) this.browser.input.focus();
  }

  private async resetList(panel: UIKitMLAsset): Promise<void> {
    const pending = this.session.reset();
    this.render(panel);
    await pending;
    this.reviewingClear = false;
    this.render(panel);
  }

  private disposeRows(): void {
    this.emptyRow?.removeFromParent();
    this.emptyRow?.dispose();
    this.emptyRow = undefined;
    for(const {row} of this.rows) {
      const components: Array<{dispose(): void}> = [];
      row.traverse(object => {if(object instanceof UIKit.Container || object instanceof UIKit.Text)components.push(object);});
      row.removeFromParent();
      components.reverse().forEach(component => component.dispose());
    }
    this.rows.length = 0;
  }

  private renderRows(panel: UIKitMLAsset, disabled: boolean): void {
    const signature = JSON.stringify([this.session.tasks, disabled]);
    if(signature === this.rowSignature)return;
    this.rowSignature = signature;
    const animate = this.session.message === 'Task complete.' || this.remoteFeedback;
    this.disposeRows();
    const list = panel.requireElementById<UIKit.Container>('task-list');
    const browserList = required<HTMLElement>('#browser-task-list');
    browserList.replaceChildren();
    for(const task of this.session.tasks) {
      const fresh = animate && this.previousTasks.get(task.id) === false && task.completed;
      const row = new UIKit.Container({width: '100%', minHeight: 7, flexShrink: 0, padding: 1.5, positionType: 'relative', backgroundColor: task.completed ? '#F3EBDD' : '#FFF0D5', borderRadius: 1, flexDirection: 'column'});
      row.name = `Task-${task.id}`;
      const text = new UIKit.Text({text: `${task.completed ? '[x]' : '[ ]'} ${task.text}`, fontSize: 2.8, color: '#332D25', width: '100%'});
      row.add(text);
      const pollen = new UIKit.Container({positionType: 'absolute', positionLeft: '7%', positionTop: '50%', height: 0.35, width: task.completed && !fresh ? '86%' : '0%', backgroundColor: '#ECAF18', opacity: 0.9, pointerEvents: 'none'});
      pollen.add(new UIKit.Container({positionType: 'absolute', positionLeft: 0, positionTop: -0.4, width: '100%', height: 1.1, backgroundColor: '#FFD651', opacity: 0.25, pointerEvents: 'none'}));
      const bee = new UIKit.Container({positionType: 'absolute', positionTop: '35%', positionLeft: '7%', width: 4, height: 2.5, borderRadius: 2, backgroundColor: '#FFC83D', display: 'none', pointerEvents: 'none'});
      for(const x of [1,2.3])bee.add(new UIKit.Container({positionType: 'absolute', positionLeft: x, width: 0.5, height: 2.5, backgroundColor: '#332D25'}));
      for(const x of [0.3,2])bee.add(new UIKit.Container({positionType: 'absolute', positionLeft: x, positionTop: -1, width: 1.7, height: 1.3, borderRadius: 1, backgroundColor: '#FFFFFF', opacity: 0.85}));
      row.add(pollen, bee);
      row.setProperties({onClick: () => {if(!disabled && !task.completed)void this.completeTask(panel, task.id);}});
      list.add(row);
      this.rows.push({row, pollen, bee, id: task.id, elapsed: fresh ? 0 : -1});
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'browser-task-row';
      button.setAttribute('aria-label', `${task.completed ? 'Completed' : 'Complete'}: ${task.text}`);
      button.disabled = disabled || task.completed;
      button.dataset.completed = String(task.completed);
      const label = document.createElement('span'); label.textContent = `${task.completed ? '✓' : '○'} ${task.text}`;
      const line = document.createElement('span'); line.className = 'pollen-line'; line.setAttribute('aria-hidden', 'true');
      const beeIcon = document.createElement('span'); beeIcon.className = 'task-bee'; beeIcon.textContent = '🐝'; beeIcon.setAttribute('aria-hidden', 'true');
      button.append(label, line, beeIcon);
      if(fresh && this.motionEnabled && !this.reducedMotion.matches)button.classList.add('pollinating');
      button.addEventListener('click', () => {void this.completeTask(panel, task.id);});
      const item = document.createElement('div'); item.setAttribute('role', 'listitem'); item.append(button);
      browserList.append(item);
    }
    if(!this.session.tasks.length) {
      const message = this.session.phase === 'loading' ? 'Loading…' : 'Add a task when you are ready.';
      this.emptyRow = new UIKit.Text({text: message, fontSize: 2.8, color: '#5C5143'});
      list.add(this.emptyRow);
      browserList.textContent = message;
    }
    this.previousTasks = new Map(this.session.tasks.map(task => [task.id, task.completed]));
  }

  update(delta: number): void {
    const panel = this.world.requireSceneObject<UIKitMLAsset>('task-panel');
    this.motionEnabled = panel.requireElementById('spatial-motion').properties.value.text === 'Ambient motion: On';
    const motion = this.motionEnabled && !this.reducedMotion.matches;
    this.browser.root.classList.toggle('motion-off', !motion);
    for(const entry of this.rows) {
      if(entry.elapsed < 0)continue;
      const visible = this.world.visibilityState.value === VisibilityState.Visible;
      entry.elapsed = motion && visible ? Math.min(1, entry.elapsed + Math.max(0, Math.min(delta, 1/30))/1.1) : 1;
      entry.pollen.setProperties({width: `${entry.elapsed*86}%`});
      entry.bee.setProperties({display: entry.elapsed < 1 ? 'flex' : 'none', positionLeft: `${7+entry.elapsed*86}%`, positionTop: `${35+Math.sin(entry.elapsed*40)*8}%`});
      if(entry.elapsed === 1)entry.elapsed = -1;
    }
  }

  private isBrowser(): boolean {
    return this.world.visibilityState.value === VisibilityState.NonImmersive;
  }

  private syncPresentation(panel: UIKitMLAsset, input: TaskInput): void {
    const isBrowser = this.isBrowser();
    panel.visible = !isBrowser;
    this.browser.root.hidden = !isBrowser;

    if (isBrowser) {
      input.input.blur();
      this.browser.input.value = this.draft;
    } else {
      this.browser.input.blur();
      input.input.uncontrolledSignal.value = this.draft;
    }

    this.render(panel);
  }

  private render(panel: UIKitMLAsset): void {
    publishSpatialProgress(this.session.tasks,
      this.session.message === 'Task complete.' || this.remoteFeedback);
    const active = this.session.activeTask;
    const isLoading = this.session.phase === 'loading';
    const isSaving = this.session.phase === 'saving';
    const loadFailed = this.session.phase === 'load-error';
    const isBrowser = this.isBrowser();

    panel.requireElementById<UIKit.Text>('task-text').setProperties({
      text: isLoading
        ? 'Loading...'
        : loadFailed
          ? 'Your saved list is still on this device.'
          : active?.text ?? 'No active task. Add one when you are ready.',
    });
    panel.requireElementById<UIKit.Text>('progress-text').setProperties({
      text: `${this.session.completedCount} of ${this.session.tasks.length} complete`,
    });
    const waitingCount = this.session.waitingTaskCount;
    panel.requireElementById<UIKit.Text>('waiting-text').setProperties({
      text: `${waitingCount} ${waitingCount === 1 ? 'task' : 'tasks'} waiting`,
    });
    const unfinishedCount = this.session.unfinishedTaskCount;
    panel.requireElementById<UIKit.Text>('new-list-copy').setProperties({
      text:
        unfinishedCount === 0
          ? 'No unfinished tasks remain. Start empty to remove completed tasks.'
          : `${unfinishedCount} unfinished ${unfinishedCount === 1 ? 'task' : 'tasks'}. Carry forward only unfinished tasks, or start empty. Completed tasks will be removed.`,
    });
    if(this.reviewingClear)panel.requireElementById('new-list-copy').setProperties({text: 'Delete every task? This clears the saved list. Cancel keeps all tasks.'});
    const statusMessage = this.session.message;
    const statusIsError =
      loadFailed ||
      statusMessage.includes('could not') ||
      statusMessage.includes('failed');
    const statusConfirmsAdd = statusMessage.startsWith('Saved:');
    panel.requireElementById<UIKit.Text>('status-text').setProperties({
      text: statusMessage,
      color: statusIsError
        ? '#8F2430'
        : statusConfirmsAdd
          ? '#713F08'
          : '#5C5143',
      backgroundColor: statusIsError
        ? '#F9DFE2'
        : statusConfirmsAdd
          ? '#FFE5B4'
          : '#F3EBDD',
    });
    panel.requireElementById('task-input').setProperties({
      disabled: isLoading || isSaving || loadFailed || this.reviewingNewList,
    });
    panel.requireElementById('add-button').setProperties({
      disabled:
        isLoading ||
        isSaving ||
        loadFailed ||
        this.reviewingNewList ||
        this.draft.trim().length === 0,
    });
    panel.requireElementById('complete-button').setProperties({
      disabled:
        isLoading ||
        isSaving ||
        loadFailed ||
        this.reviewingNewList ||
        active == null,
    });
    panel.requireElementById('task-controls').setProperties({
      display: this.reviewingNewList || !this.entryOpen ? 'none' : 'flex',
    });
    panel.requireElementById('new-list-button').setProperties({
      display: this.reviewingNewList ? 'none' : 'flex',
      disabled: isLoading || isSaving || loadFailed,
    });
    panel.requireElementById('new-list-review').setProperties({
      display: this.reviewingNewList ? 'flex' : 'none',
    });
    panel.requireElementById('carry-button').setProperties({
      display: unfinishedCount > 0 && !this.reviewingClear ? 'flex' : 'none',
      disabled: isSaving,
    });
    panel.requireElementById('empty-button').setProperties({
      text: this.reviewingClear ? 'Clear All' : 'Start empty',
      disabled: isSaving,
    });
    panel.requireElementById('cancel-new-list').setProperties({
      disabled: isSaving,
    });
    panel.requireElementById('retry-button').setProperties({
      display: loadFailed ? 'flex' : 'none',
    });
    panel.requireElementById('xr-button').setProperties({
      display: this.world.xrEnabled && isBrowser ? 'flex' : 'none',
    });
    panel.requireElementById('exit-button').setProperties({
      display: this.world.xrEnabled && !isBrowser ? 'flex' : 'none',
    });

    const disabled = isLoading || isSaving || loadFailed || this.reviewingNewList;
    const done = !disabled && this.session.tasks.length > 0 && this.session.unfinishedTaskCount === 0;
    panel.requireElementById('settings-panel').setProperties({display: this.settingsOpen ? 'flex' : 'none'});
    required<HTMLElement>('#browser-settings-panel').hidden = !this.settingsOpen;
    required<HTMLElement>('#browser-settings-toggle').setAttribute('aria-expanded', String(this.settingsOpen));
    for(const id of ['reset-button', 'clear-button', 'show-add-button']) {
      const unavailable = disabled || (id === 'reset-button' ? !this.session.completedCount : id === 'clear-button' ? !this.session.tasks.length : false);
      panel.requireElementById(id).setProperties({disabled: unavailable});
      required<HTMLButtonElement>(`#browser-${id}`).disabled = unavailable;
    }
    const reviewTitle = this.reviewingClear ? 'Clear all tasks?' : 'Start a new list?';
    panel.requireElementById('new-list-title').setProperties({text: reviewTitle});
    required<HTMLElement>('#browser-new-list-title').textContent = reviewTitle;
    panel.requireElementById('done-button').setProperties({display: done ? 'flex' : 'none'});
    required<HTMLElement>('#browser-done-button').hidden = !done;
    this.renderRows(panel, disabled);
    this.renderBrowser(isLoading, isSaving, loadFailed);
    this.queueRemoteRefresh(panel);
  }

  private renderBrowser(
    isLoading: boolean,
    isSaving: boolean,
    loadFailed: boolean,
  ): void {
    const active = this.session.activeTask;
    const waitingCount = this.session.waitingTaskCount;
    const unfinishedCount = this.session.unfinishedTaskCount;
    const busy = isLoading || isSaving;

    this.browser.root.setAttribute('aria-busy', String(busy));
    this.browser.taskText.textContent = isLoading
      ? 'Loading...'
      : loadFailed
        ? 'Your saved list is still on this device.'
        : active?.text ?? 'No active task. Add one when you are ready.';
    this.browser.progressText.textContent = `${this.session.completedCount} of ${this.session.tasks.length} complete`;
    this.browser.waitingText.textContent = `${waitingCount} ${waitingCount === 1 ? 'task' : 'tasks'} waiting`;
    this.browser.statusText.textContent = this.session.message;
    this.browser.statusText.dataset.kind =
      loadFailed || /could not|failed/iu.test(this.session.message)
        ? 'error'
        : this.session.message.startsWith('Saved:')
          ? 'success'
          : 'neutral';

    this.browser.form.hidden = this.reviewingNewList || !this.entryOpen;
    this.browser.input.disabled = busy || loadFailed || this.reviewingNewList;
    this.browser.addButton.disabled =
      busy ||
      loadFailed ||
      this.reviewingNewList ||
      this.draft.trim().length === 0;
    this.browser.completeButton.disabled =
      busy || loadFailed || this.reviewingNewList || active == null;
    this.browser.newListButton.hidden = this.reviewingNewList;
    this.browser.newListButton.disabled = busy || loadFailed;
    this.browser.review.hidden = !this.reviewingNewList;
    this.browser.reviewCopy.textContent =
      unfinishedCount === 0
        ? 'No unfinished tasks remain. Start empty to remove completed tasks, or Cancel to keep this list.'
        : `${unfinishedCount} unfinished ${unfinishedCount === 1 ? 'task' : 'tasks'} can carry forward in the same order. Completed tasks will be removed. Start empty removes every task. Cancel changes nothing.`;
    this.browser.carryButton.hidden = unfinishedCount === 0 || this.reviewingClear;
    this.browser.carryButton.disabled = isSaving;
    this.browser.emptyButton.textContent = this.reviewingClear ? 'Clear All' : 'Start empty';
    if(this.reviewingClear)this.browser.reviewCopy.textContent = 'Delete every task? This clears the saved list. Cancel keeps all tasks.';
    this.browser.emptyButton.disabled = isSaving;
    this.browser.cancelButton.disabled = isSaving;
    this.browser.retryButton.hidden = !loadFailed;
    this.browser.retryButton.disabled = isLoading;
    this.browser.xrButton.hidden = !this.world.xrEnabled;
  }
}
