import {
  createSystem,
  UIKit,
  UIKitMLAsset,
  VisibilityState,
} from '@iwsdk/core';
import { ChevronDown } from '@pmndrs/uikit-lucide/dist/ChevronDown.js';
import { ChevronUp } from '@pmndrs/uikit-lucide/dist/ChevronUp.js';
import { Settings } from '@pmndrs/uikit-lucide/dist/Settings.js';
import { launchAR } from './ar-session.js';
import { publishSpatialProgress } from './spatial-presentation.js';
import { LocalTaskStore, TASK_STORE_KEY } from './task-store.js';
import { watchLocalStorage } from './local-sync.js';
import { isForwardCompletion } from './garden-progress.js';
import { bindTaskEntry } from './task-entry.js';
import { PersonalTaskSession } from './task-session.js';

type TaskInput = UIKit.Input & { input: UIKit.Input };

interface BrowserPanelElements {
  root: HTMLElement;
  taskText: HTMLElement;
  progressText: HTMLElement;
  waitingText: HTMLElement;
  form: HTMLFormElement;
  input: HTMLInputElement;
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
  private collapsed = false;
  private collapseUp?: InstanceType<typeof ChevronUp>;
  private collapseDown?: InstanceType<typeof ChevronDown>;
  private entryOpen = false;
  private addingTask = false;
  private finishingEntry = false;
  private reviewingClear = false;
  private rowSignature = '';
  private readonly rows: Array<{row: UIKit.Container; pollen: UIKit.Container; vineSegments: UIKit.Container[]; bee: UIKit.Container; id: string; elapsed: number}> = [];
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
    this.collapseUp = new ChevronUp({width: 4, height: 4, color: '#332D25'});
    this.collapseDown = new ChevronDown({width: 4, height: 4, color: '#332D25'});
    panel.requireElementById<UIKit.Container>('collapse-toggle').add(this.collapseUp, this.collapseDown);
    this.cleanupFuncs.push(() => {
      for(const icon of [this.collapseUp, this.collapseDown]) {icon?.removeFromParent(); icon?.dispose();}
    });
    const taskInput = panel.requireElementById<TaskInput>('task-input');
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
    bind('collapse-toggle', () => {
      this.collapsed = !this.collapsed;
      if(this.collapsed) {
        // Preserve unfinished text while releasing the native keyboard.
        taskInput.input.blur();
        this.browser.input.blur();
      }
      this.render(panel);
    });
    bind('settings-toggle', () => {this.settingsOpen = !this.settingsOpen; this.render(panel);});
    const body = panel.requireElementById<UIKit.Container>('panel-body');
    for(const [id, direction] of [['scroll-up', -1], ['scroll-down', 1]] as const) {
      const button = panel.requireElementById(id);
      const scroll = () => {
        const list = panel.requireElementById<UIKit.Container>('task-list');
        const target = !this.settingsOpen && !this.reviewingNewList && (list.maxScrollPosition.value[1] ?? 0) > 0 ? list : body;
        const [x,y] = target.scrollPosition.value;
        target.scrollPosition.value = [x,Math.max(0,Math.min(target.maxScrollPosition.value[1] ?? 0,y+direction*24))];
      };
      button.addEventListener('click',scroll);
      this.cleanupFuncs.push(() => button.removeEventListener('click',scroll));
    }
    bind('show-add-button', () => this.openTaskEntry(panel, taskInput));
    bind('entry-done-button', () => {void this.finishTaskEntry(panel, taskInput);});
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
    panel.requireElementById('show-add-button').name = 'OpenTaskEntry';
    panel.requireElementById('entry-done-button').name = 'FinishTaskEntry';
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
      },
    });

    const onComplete = () => void this.completeTask(panel);
    const onNewList = () => this.openNewListReview(panel, taskInput);
    const onCarry = () => void this.createNewList(panel, taskInput, true);
    const onEmpty = () => void this.createNewList(panel, taskInput, false);
    const onCancelNewList = () => this.cancelNewListReview(panel);
    const onRetry = () => void this.load(panel);
    const overlay = required<HTMLElement>('#xr-overlay');
    const overlayExit = required<HTMLButtonElement>('#overlay-exit-button');
    const onEnterXR = () => {
      void launchAR(this.world, overlay).catch(error => {
        this.session.message = `Could not start mixed reality: ${error instanceof Error ? error.message : 'Try again in Quest Browser.'}`;
        this.render(panel);
      });
    };
    const onExitXR = () => void this.world.exitXR();
    const onBrowserInput = () => {
      this.draft = this.browser.input.value;
      this.render(panel);
    };
    const onBrowserComplete = () => void this.completeTask(panel);
    const onBrowserNewList = () => this.openNewListReview(panel, taskInput);
    const onBrowserCarry = () =>
      void this.createNewList(panel, taskInput, true);
    const onBrowserEmpty = () =>
      void this.createNewList(panel, taskInput, false);
    const onBrowserCancel = () => this.cancelNewListReview(panel);

    completeButton.addEventListener('click', onComplete);
    newListButton.addEventListener('click', onNewList);
    carryButton.addEventListener('click', onCarry);
    emptyButton.addEventListener('click', onEmpty);
    cancelNewListButton.addEventListener('click', onCancelNewList);
    retryButton.addEventListener('click', onRetry);
    xrButton.addEventListener('click', onEnterXR);
    exitButton.addEventListener('click', onExitXR);
    overlayExit.addEventListener('click', onExitXR);
    const preventXRSelect = (event: Event) => event.preventDefault();
    overlayExit.addEventListener('beforexrselect', preventXRSelect);
    this.cleanupFuncs.push(() => {
      overlayExit.removeEventListener('click', onExitXR);
      overlayExit.removeEventListener('beforexrselect', preventXRSelect);
    });
    this.browser.input.addEventListener('input', onBrowserInput);
    const spatialKeyboard = taskInput.input.element;
    spatialKeyboard.enterKeyHint = 'enter';
    spatialKeyboard.setAttribute('form', 'spatial-task-form');
    spatialKeyboard.maxLength = 200;
    spatialKeyboard.autocomplete = 'off';
    this.cleanupFuncs.push(
      bindTaskEntry(this.browser.input, () => {void this.addTask(panel, taskInput);}, this.browser.form),
      bindTaskEntry(spatialKeyboard, () => {void this.addTask(panel, taskInput);}, required<HTMLFormElement>('#spatial-task-form')),
    );
    this.browser.completeButton.addEventListener('click', onBrowserComplete);
    this.browser.newListButton.addEventListener('click', onBrowserNewList);
    this.browser.carryButton.addEventListener('click', onBrowserCarry);
    this.browser.emptyButton.addEventListener('click', onBrowserEmpty);
    this.browser.cancelButton.addEventListener('click', onBrowserCancel);
    this.browser.retryButton.addEventListener('click', onRetry);
    this.browser.xrButton.addEventListener('click', onEnterXR);

    this.cleanupFuncs.push(
      () => completeButton.removeEventListener('click', onComplete),
      () => newListButton.removeEventListener('click', onNewList),
      () => carryButton.removeEventListener('click', onCarry),
      () => emptyButton.removeEventListener('click', onEmpty),
      () => cancelNewListButton.removeEventListener('click', onCancelNewList),
      () => retryButton.removeEventListener('click', onRetry),
      () => xrButton.removeEventListener('click', onEnterXR),
      () => exitButton.removeEventListener('click', onExitXR),
      () => this.browser.input.removeEventListener('input', onBrowserInput),
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

  private focusTaskEntry(input: TaskInput): void {
    if(this.isBrowser())this.browser.input.focus({preventScroll: true});
    else input.input.focus();
  }

  private openTaskEntry(panel: UIKitMLAsset, input: TaskInput): void {
    if(this.session.phase !== 'ready' || this.reviewingNewList)return;
    this.collapsed = false;
    this.entryOpen = true;
    this.render(panel);
    this.focusTaskEntry(input);
  }

  private async finishTaskEntry(panel: UIKitMLAsset, input: TaskInput): Promise<void> {
    if(this.finishingEntry || this.session.phase !== 'ready' || this.reviewingNewList)return;
    this.finishingEntry = true;
    try {
      this.draft = this.isBrowser() ? this.browser.input.value : input.input.element.value;
      if(this.draft.trim() && !await this.addTask(panel, input))return;
      // Never hide new text typed while the final draft was being saved.
      if(this.draft.trim()) {this.focusTaskEntry(input); return;}
      this.draft = '';
      input.input.uncontrolledSignal.value = '';
      this.browser.input.value = '';
      this.entryOpen = false;
      this.session.message = 'Task entry finished. Your list is saved.';
      input.input.blur();
      this.browser.input.blur();
      this.render(panel);
      if(this.isBrowser())required<HTMLButtonElement>('#browser-show-add-button').focus();
    } finally {
      this.finishingEntry = false;
      this.render(panel);
    }
  }

  private async addTask(panel: UIKitMLAsset, input: TaskInput): Promise<boolean> {
    if(this.session.phase !== 'ready' || this.reviewingNewList || !this.entryOpen || this.addingTask)return false;
    const wasBrowser = this.isBrowser();
    const keyboard = wasBrowser ? this.browser.input : input.input.element;
    // Read the native value at submission, including the final soft-keyboard edit.
    const submitted = keyboard.value;
    this.draft = submitted;
    const keepFocus = document.activeElement === keyboard;
    this.addingTask = true;
    try {
      const pending = this.session.add(submitted);
      this.render(panel);
      const saved = await pending;
      if(saved && this.draft === submitted) {
        this.draft = '';
        input.input.uncontrolledSignal.value = '';
        this.browser.input.value = '';
      }
      return saved;
    } finally {
      this.addingTask = false;
      this.render(panel);
      if(keepFocus && !this.finishingEntry && this.entryOpen && wasBrowser === this.isBrowser() &&
        (document.activeElement === keyboard || document.activeElement === document.body))this.focusTaskEntry(input);
    }
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
      this.collapsed = false;
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
      const row = new UIKit.Container({width: '100%', minHeight: 10, flexShrink: 0, padding: 2, positionType: 'relative', backgroundColor: task.completed ? '#F3EBDD' : '#FFF0D5', borderRadius: 1, flexDirection: 'row', alignItems: 'center', gap: 2});
      row.name = `Task-${task.id}`;
      const check = new UIKit.Container({width: 8, height: 8, flexShrink: 0, borderWidth: 0.5, borderColor: '#96550C', borderRadius: 1, justifyContent: 'center', alignItems: 'center', pointerEvents: 'none'});
      check.add(new UIKit.Text({text: task.completed ? 'X' : '', fontSize: 4, color: '#713F08'}));
      const label = new UIKit.Container({flexGrow: 1, flexShrink: 1, minWidth: 0, minHeight: 6, positionType: 'relative', justifyContent: 'center', pointerEvents: 'none'});
      const text = new UIKit.Text({text: task.text, fontSize: 2.8, color: '#332D25', width: '100%', verticalAlign: 'center'});
      label.add(text);
      row.add(check, label);
      const pollen = new UIKit.Container({positionType: 'absolute', positionLeft: 0, positionTop: '50%', marginTop: -1, height: 2, width: '100%', pointerEvents: 'none'});
      const vineSegments: UIKit.Container[] = [];
      for(let segment=0; segment<32; segment++) {
        const vine = new UIKit.Container({positionType: 'absolute', positionLeft: `${segment*100/32}%`, positionTop: 0.85+Math.sin(segment*Math.PI/4)*0.55, width: '4%', height: 0.3, borderRadius: 0.2, backgroundColor: '#548438', pointerEvents: 'none', display: task.completed && !fresh ? 'flex' : 'none'});
        pollen.add(vine); vineSegments.push(vine);
      }
      const bee = new UIKit.Container({positionType: 'absolute', positionTop: '30%', positionLeft: 0, width: 4, height: 2.5, borderRadius: 2, backgroundColor: '#FFC83D', display: 'none', pointerEvents: 'none'});
      for(const x of [1,2.3])bee.add(new UIKit.Container({positionType: 'absolute', positionLeft: x, width: 0.5, height: 2.5, backgroundColor: '#332D25'}));
      for(const x of [0.3,2])bee.add(new UIKit.Container({positionType: 'absolute', positionLeft: x, positionTop: -1, width: 1.7, height: 1.3, borderRadius: 1, backgroundColor: '#FFFFFF', opacity: 0.85}));
      label.add(pollen, bee);
      row.setProperties({onClick: () => {if(!disabled && !task.completed)void this.completeTask(panel, task.id);}});
      list.add(row);
      this.rows.push({row, pollen, vineSegments, bee, id: task.id, elapsed: fresh ? 0 : -1});
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'browser-task-row';
      button.setAttribute('aria-label', `${task.completed ? 'Completed' : 'Complete'}: ${task.text}`);
      button.disabled = disabled || task.completed;
      button.dataset.completed = String(task.completed);
      const checkbox = document.createElement('span'); checkbox.className = 'task-checkbox';
      checkbox.textContent = task.completed ? '✓' : ''; checkbox.setAttribute('aria-hidden', 'true');
      const browserLabel = document.createElement('span'); browserLabel.className = 'task-label';
      const labelText = document.createElement('span'); labelText.className = 'task-label-text'; labelText.textContent = task.text;
      browserLabel.append(labelText);
      const line = document.createElement('span'); line.className = 'pollen-line'; line.setAttribute('aria-hidden', 'true');
      const beeIcon = document.createElement('span'); beeIcon.className = 'task-bee'; beeIcon.textContent = '🐝'; beeIcon.setAttribute('aria-hidden', 'true');
      browserLabel.append(line, beeIcon);
      button.append(checkbox, browserLabel);
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
      entry.elapsed = motion && visible ? Math.min(1, entry.elapsed + Math.max(0, Math.min(delta, 1/30))/2.4) : 1;
      entry.vineSegments.forEach((segment,i) => segment.setProperties({display: i/entry.vineSegments.length < entry.elapsed ? 'flex' : 'none'}));
      entry.bee.setProperties({display: entry.elapsed < 1 ? 'flex' : 'none', positionLeft: `${entry.elapsed*100}%`, positionTop: `${30+Math.sin(entry.elapsed*16)*4}%`});
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
    panel.requireElementById('grab-handle').setProperties({display: this.collapsed ? 'none' : 'flex'});
    panel.requireElementById('scroll-controls').setProperties({display: this.collapsed ? 'none' : 'flex'});
    panel.requireElementById('panel-body').setProperties({display: this.collapsed ? 'none' : 'flex'});
    panel.requireElementById('panel-surface').setProperties({height: this.collapsed ? 'auto' : 100});
    panel.requireElementById('settings-toggle').setProperties({display: this.collapsed ? 'none' : 'flex'});
    this.collapseUp?.setProperties({display: this.collapsed ? 'none' : 'flex'});
    this.collapseDown?.setProperties({display: this.collapsed ? 'flex' : 'none'});
    panel.requireElementById('collapse-toggle').name = this.collapsed ? 'Expand CueDone' : 'Collapse CueDone';
    required<HTMLElement>('#browser-panel-body').hidden = this.collapsed;
    required<HTMLElement>('#browser-settings-toggle').hidden = this.collapsed;
    const collapse = required<HTMLButtonElement>('#browser-collapse-toggle');
    collapse.textContent = this.collapsed ? '⌄' : '⌃';
    collapse.setAttribute('aria-expanded', String(!this.collapsed));
    collapse.setAttribute('aria-label', this.collapsed ? 'Expand CueDone' : 'Collapse CueDone');
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
      disabled: isLoading || (isSaving && !this.addingTask) || loadFailed || this.reviewingNewList,
    });
    panel.requireElementById('entry-done-button').setProperties({
      disabled: isLoading || isSaving || loadFailed || this.reviewingNewList || this.finishingEntry,
    });
    required<HTMLButtonElement>('#browser-entry-done-button').disabled =
      isLoading || isSaving || loadFailed || this.reviewingNewList || this.finishingEntry;
    panel.requireElementById('complete-button').setProperties({
      disabled:
        isLoading ||
        isSaving ||
        loadFailed ||
        this.reviewingNewList ||
        active == null,
    });
    panel.requireElementById('task-controls').setProperties({
      display: this.collapsed || this.reviewingNewList || !this.entryOpen ? 'none' : 'flex',
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
    panel.requireElementById('done-button').setProperties({display: done && !this.collapsed ? 'flex' : 'none'});
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

    this.browser.form.hidden = this.collapsed || this.reviewingNewList || !this.entryOpen;
    this.browser.input.disabled = isLoading || (isSaving && !this.addingTask) || loadFailed || this.reviewingNewList;
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
