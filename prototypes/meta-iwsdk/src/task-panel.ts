import {
  createSystem,
  UIKit,
  UIKitMLAsset,
  VisibilityState,
} from '@iwsdk/core';
import { ChevronDown } from '@pmndrs/uikit-lucide/dist/ChevronDown.js';
import { ChevronUp } from '@pmndrs/uikit-lucide/dist/ChevronUp.js';
import { themeAudioOutput, releaseThemeAudioOutput } from './theme-audio-output.js';
import { BrowserPanelLayout } from './browser-panel-layout.js';
import { Settings } from '@pmndrs/uikit-lucide/dist/Settings.js';
import { launchAR, finalTaskAR, traceEnhanced, FINAL_AR_MS } from './ar-session.js';
import { publishSpatialProgress } from './spatial-presentation.js';
import { LocalTaskStore, TASK_STORE_KEY } from './task-store.js';
import { watchLocalStorage } from './local-sync.js';
import { isFinalCompletion, isForwardCompletion } from './garden-progress.js';
import { bindTaskEntry, observeTaskEntry } from './task-entry.js';
import { PersonalTaskSession } from './task-session.js';
import { normalizeTaskText, setTaskCompleted } from '../../../src/shared/tasks.js';

type TaskInput = UIKit.Input & { input: UIKit.Input };
const PANEL_EXPERIENCE_KEY = 'cuedone.vr.panelExperience.v1';

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
  private readonly taskStore = new LocalTaskStore();
  private readonly session = new PersonalTaskSession(this.taskStore);
  private readonly browser = browserPanelElements();
  private settingsOpen = false;
  private finaleStyle: '2d' | '3d' = '2d';
  private progression: 'smooth' | 'instant' = 'smooth';
  private collapsed = false;
  private collapseUp?: InstanceType<typeof ChevronUp>;
  private collapseDown?: InstanceType<typeof ChevronDown>;
  private entryOpen = false;
  private browserEntryFinished = false;
  private browserEntryCollapsed = false;
  private browserXRLayout?: BrowserPanelLayout;
  private addingTask = false;
  private finishingEntry = false;
  private reviewingClear = false;
  private rowSignature = '';
  private rowTheme = '';
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
  private audioContext: AudioContext | null = null;
  // TEMPORARY Quest diagnostics. Local console/screen only; remove before submission.
  private inputLog: (event: string, detail?: Record<string, unknown>) => void = () => {};

  init(): void {
    const panel = this.world.requireSceneObject<UIKitMLAsset>('task-panel');
    this.cleanupFuncs.push(()=>{this.browserXRLayout?.release();this.browserXRLayout?.restore();this.browserXRLayout=undefined;});
    document.getElementById('browser-done-button')?.remove();
    panel.requireElementById('done-button').setProperties({display: 'none'});
    required<HTMLElement>('#browser-reset-button').textContent = 'Reset List';
    panel.requireElementById('reset-button').setProperties({text: 'Reset List'});
    required<HTMLElement>('.browser-header').after(this.browser.form);
    // Reuse the existing form rather than nesting a second form around the input.
    this.browser.input.setAttribute('form', this.browser.form.id);
    this.browser.input.enterKeyHint = 'go';
    this.browser.root.style.setProperty('overflow-anchor', 'none');
    const header = required<HTMLElement>('.browser-header');
    const headerSize = new ResizeObserver(() => {
      this.browser.root.style.setProperty('--browser-header-height', `${header.getBoundingClientRect().height}px`);
    });
    headerSize.observe(header);
    this.cleanupFuncs.push(() => headerSize.disconnect());
    const reopenEntry = document.createElement('button');
    reopenEntry.type = 'button';
    reopenEntry.id = 'browser-reopen-entry';
    reopenEntry.className = 'browser-button browser-outline';
    reopenEntry.textContent = 'Edit tasks';
    reopenEntry.setAttribute('aria-controls', this.browser.form.id);
    header.append(reopenEntry);
    const onReopenEntry = () => this.openTaskEntry(panel,
      panel.requireElementById<TaskInput>('task-input'));
    reopenEntry.addEventListener('click', onReopenEntry);
    this.cleanupFuncs.push(() => {reopenEntry.removeEventListener('click', onReopenEntry); reopenEntry.remove();});
    const settings = required<HTMLElement>('#browser-settings-panel');
    const addChoice = (title: string, choices: [string, string][], change: (value: string) => void) => {
      const label = document.createElement('label');
      label.className = 'browser-setting-choice';
      label.append(document.createTextNode(title));
      const select = document.createElement('select');
      for (const [value, text] of choices) select.add(new Option(text, value));
      const onChange = () => change(select.value);
      select.addEventListener('change', onChange);
      label.append(select);
      settings.insertBefore(label, required('#browser-spatial-scale'));
      this.cleanupFuncs.push(() => {select.removeEventListener('change', onChange); label.remove();});
    };
    const experience = required<HTMLSelectElement>('#browser-panel-experience');
    const experienceStatus = required<HTMLElement>('#browser-panel-experience-status');
    const restoreExperience = () => {
      try {
        this.finaleStyle = window.localStorage.getItem(PANEL_EXPERIENCE_KEY) === '3d' ? '3d' : '2d';
        experienceStatus.textContent = '';
      } catch {
        experienceStatus.textContent = 'Could not restore the panel experience. Your current choice is unchanged.';
      }
      experience.value = this.finaleStyle;
    };
    const saveExperience = () => {
      const next = experience.value === '3d' ? '3d' : '2d';
      try {
        window.localStorage.setItem(PANEL_EXPERIENCE_KEY, next);
        this.finaleStyle = next;
        experienceStatus.textContent = 'Panel experience saved locally.';
      } catch {
        experience.value = this.finaleStyle;
        experienceStatus.textContent = 'Could not save the panel experience. Your previous choice is unchanged.';
      }
    };
    restoreExperience();
    required<HTMLElement>('#browser-panel-experience-help').textContent =
      '2D Alone stays in the browser. 2D Enhanced opens a 5.75-second immersive AR theme finale when the final task is completed, then returns to 2D.';
    experience.addEventListener('change', saveExperience);
    this.cleanupFuncs.push(() => experience.removeEventListener('change', saveExperience));
    this.cleanupFuncs.push(watchLocalStorage(window, [PANEL_EXPERIENCE_KEY], restoreExperience));
    addChoice('Animation progression', [['smooth', 'Smooth'], ['instant', 'Instant']], value => {
      this.progression = value === 'instant' ? 'instant' : 'smooth';
    });
    // Keep entry into AR available from both the list and Settings.
    this.browser.root.append(this.browser.xrButton);
    required('#browser-garden').removeAttribute('role');
    required<HTMLElement>('#browser-task-view > .browser-entry-help').textContent =
      'Theme progress follows each completed task. Choose 2D Alone or 2D Enhanced in Settings.';
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
    const entryToggle = required<HTMLButtonElement>('#browser-entry-toggle');
    const toggleEntry = () => {
      this.browserEntryCollapsed = !this.browserEntryCollapsed;
      if(this.browserEntryCollapsed)this.browser.input.blur();
      this.render(panel);
      if(!this.browserEntryCollapsed)this.focusTaskEntry(taskInput);
    };
    entryToggle.addEventListener('click', toggleEntry);
    this.cleanupFuncs.push(() => entryToggle.removeEventListener('click', toggleEntry));
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
    const showSettings = (open: boolean) => {
      this.settingsOpen = open;
      taskInput.input.blur(); this.browser.input.blur();
      this.render(panel);
      required<HTMLElement>('#browser-panel-body').scrollTop = 0;
      panel.requireElementById<UIKit.Container>('panel-body').scrollPosition.value = [0,0];
      if(this.isBrowser()) required<HTMLButtonElement>(open ? '#browser-settings-done' : '#browser-settings-toggle').focus();
    };
    bind('settings-toggle', () => showSettings(!this.settingsOpen));
    bind('settings-done', () => showSettings(false));
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
    const openEntry = () => this.openTaskEntry(panel, taskInput);
    panel.requireElementById('show-add-button').addEventListener('click', openEntry);
    this.cleanupFuncs.push(() => panel.requireElementById('show-add-button').removeEventListener('click', openEntry));
    const finishEntry = () => {void this.finishTaskEntry(panel, taskInput);};
    panel.requireElementById('entry-done-button').addEventListener('click', finishEntry);
    this.cleanupFuncs.push(() => panel.requireElementById('entry-done-button').removeEventListener('click', finishEntry));
    bind('reset-button', () => {void this.resetList(panel);});
    bind('clear-button', () => {
      this.openNewListReview(panel, taskInput, true);
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

    const onNewList = () => this.openNewListReview(panel, taskInput);
    const onCarry = () => void this.createNewList(panel, taskInput, true);
    const onEmpty = () => void this.createNewList(panel, taskInput, false);
    const onCancelNewList = () => this.cancelNewListReview(panel);
    const onRetry = () => void this.load(panel);
    const overlay = required<HTMLElement>('#xr-overlay');
    const overlayExit = required<HTMLButtonElement>('#overlay-exit-button');
    const onEnterXR = () => {
      if(this.world.session || this.world.sessionRequestPending)return;
      const restoreLayout=this.preserveBrowserLayout(panel,taskInput);
      void launchAR(this.world, overlay,undefined,undefined,restoreLayout).then(started=>{
        if(!started)restoreLayout();
      }).catch(error => {
        this.session.message = `Could not start mixed reality: ${error instanceof Error ? error.message : 'Try again in Quest Browser.'}`;
        this.render(panel);
        restoreLayout();
      });
    };
    const onExitXR = () => {
      if(finalTaskAR.busy)finalTaskAR.end();
      else void this.world.exitXR();
    };
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
    let returnHandled = false;
    const debug = document.createElement('pre');
    debug.id = 'cue-input-debug';
    debug.setAttribute('aria-label', 'Temporary Quest input diagnostics');
    debug.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:9999;width:min(46vw,600px);max-height:36vh;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font:11px/1.3 monospace;background:#fff;color:#111;border:2px solid #111;padding:6px;margin:0;';
    this.browser.root.append(debug);
    const spatialDebug = new UIKit.Text({text: 'CUE-LOG: waiting for input', fontSize: 1.1,
      width: '100%', color: '#111111', backgroundColor: '#FFFFFF'});
    const spatialDebugPanel = new UIKit.Container({height: 30, flexShrink: 0, overflow: 'scroll'});
    spatialDebugPanel.add(spatialDebug);
    panel.requireElementById<UIKit.Container>('panel-body').add(spatialDebugPanel);
    const lines: string[] = [];
    let sequence = 0;
    const describe = (element: Element | null) => element == null ? null :
      `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${element === spatialKeyboard ? '[spatial]' : element === this.browser.input ? '[browser]' : ''}`;
    const snapshot = () => ({
      activeElement: describe(document.activeElement),
      browser: {type: this.browser.input.type, disabled: this.browser.input.disabled, value: this.browser.input.value},
      spatial: {type: spatialKeyboard.type, disabled: spatialKeyboard.disabled, value: spatialKeyboard.value,
        hasFocus: taskInput.input.hasFocus.peek()},
      phase: this.session.phase, entryOpen: this.entryOpen, reviewingNewList: this.reviewingNewList,
      addingTask: this.addingTask, draft: this.draft, returnHandled,
    });
    this.inputLog = (event, detail = {}) => {
      try {
        const record = {n: ++sequence, time: Math.round(performance.now()), event, ...detail, ...snapshot()};
        console.log('CUE-LOG', JSON.stringify(record));
        lines.push(JSON.stringify(record));
        if (lines.length > 20) lines.shift();
        debug.textContent = `CUE-LOG — TEMPORARY INPUT DIAGNOSTICS (last 20)\n${lines.join('\n')}`;
        debug.scrollTop = debug.scrollHeight;
        spatialDebug.setProperties({text: debug.textContent});
      } catch { /* Diagnostics must never interrupt task entry or saving. */ }
    };
    // Native events cannot reveal silent programmatic value replacements. Observe
    // both inputs each frame, without writing to either input or changing focus.
    let lastSnapshot = JSON.stringify(snapshot());
    let debugFrame = 0;
    const observeValues = () => {
      const next = JSON.stringify(snapshot());
      if (next !== lastSnapshot) {
        this.inputLog('input-state-change', {previous: JSON.parse(lastSnapshot)});
        lastSnapshot = next;
      }
      debugFrame = requestAnimationFrame(observeValues);
    };
    debugFrame = requestAnimationFrame(observeValues);
    const observeSubmit = (event: Event) => {
      this.inputLog(`submit:${event.type}`, {target: describe(event.target as Element),
        text: this.isBrowser() ? this.browser.input.value : spatialKeyboard.value});
    };
    const submitSources: Array<[EventTarget, string]> = [
      [this.browser.form, 'submit'], [required('#spatial-task-form'), 'submit'],
      [required('#browser-add-task-button'), 'click'],
    ];
    for (const [target, type] of submitSources) target.addEventListener(type, observeSubmit, {capture: true});
    this.cleanupFuncs.push(
      observeTaskEntry(spatialKeyboard, 'spatial', this.inputLog),
      observeTaskEntry(this.browser.input, 'browser', this.inputLog),
      () => {
        for (const [target, type] of submitSources) target.removeEventListener(type, observeSubmit, {capture: true});
        cancelAnimationFrame(debugFrame); this.inputLog = () => {}; debug.remove();
        spatialDebugPanel.removeFromParent(); spatialDebug.removeFromParent(); spatialDebug.dispose(); spatialDebugPanel.dispose();
      },
    );
    this.inputLog('diagnostics-ready');
    const submitBrowserTask = () => {void this.addTask(panel, taskInput);};
    const onTaskKeydown = (event: KeyboardEvent) => {
      if(event.isComposing || event.keyCode === 229)return;
      if(event.key !== 'Enter' && event.key !== 'Return' && event.code !== 'NumpadEnter' && event.keyCode !== 13)return;
      event.preventDefault();
      if(event.repeat)return;
      if(!returnHandled)this.browser.form.requestSubmit();
    };
    const onTaskBeforeInput = (event: InputEvent) => {
      if(event.isComposing || !['insertLineBreak', 'insertParagraph'].includes(event.inputType))return;
      event.preventDefault();
      if(!returnHandled)this.browser.form.requestSubmit();
    };
    const resetReturn = () => {returnHandled = false;};
    const onTaskSubmit = (event: SubmitEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if(!returnHandled) {returnHandled = true; submitBrowserTask();}
    };
    this.browser.input.addEventListener('keydown', onTaskKeydown);
    this.browser.input.addEventListener('beforeinput', onTaskBeforeInput);
    this.browser.input.addEventListener('input', resetReturn);
    this.browser.input.addEventListener('blur', resetReturn);
    this.browser.form.addEventListener('submit', onTaskSubmit);
    this.cleanupFuncs.push(
      () => {
        this.browser.input.removeEventListener('keydown', onTaskKeydown);
        this.browser.input.removeEventListener('beforeinput', onTaskBeforeInput);
        this.browser.input.removeEventListener('input', resetReturn);
        this.browser.input.removeEventListener('blur', resetReturn);
        this.browser.form.removeEventListener('submit', onTaskSubmit);
      },
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
    this.browserEntryFinished = false;
    this.browserEntryCollapsed = false;
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
      this.browserEntryFinished = true;
      this.session.message = 'Task entry finished. Your list is saved.';
      input.input.blur();
      this.browser.input.blur();
      this.render(panel);
      if(this.isBrowser())required<HTMLButtonElement>('#browser-reopen-entry').focus({preventScroll: true});
    } finally {
      this.finishingEntry = false;
      this.render(panel);
    }
  }

  private async addTask(panel: UIKitMLAsset, input: TaskInput): Promise<boolean> {
    this.inputLog('addTask-received', {source: this.isBrowser() ? 'browser' : 'spatial',
      text: this.isBrowser() ? this.browser.input.value : input.input.element.value});
    if(this.session.phase !== 'ready' || this.reviewingNewList || (!this.entryOpen && !this.isBrowser()) || this.addingTask)return false;
    const wasBrowser = this.isBrowser();
    const keyboard = wasBrowser ? this.browser.input : input.input.element;
    // Read the native value at submission, including the final soft-keyboard edit.
    const submitted = keyboard.value;
    this.draft = submitted;
    const keepFocus = document.activeElement === keyboard;
    const scrollTargets = wasBrowser ? [document.scrollingElement, this.browser.root,
      document.querySelector('#browser-panel-body'), document.querySelector('#browser-task-list')]
      .filter((element): element is Element => element !== null)
      .map(element => ({element, top: element.scrollTop, left: element.scrollLeft})) : [];
    const restoreScroll = () => {
      for(const {element, top, left} of scrollTargets) {
        element.scrollTop = top; element.scrollLeft = left;
      }
    };
    this.addingTask = true;
    try {
      this.inputLog('session.add-received', {text: submitted});
      const pending = this.session.add(submitted);
      this.render(panel);
      restoreScroll();
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
      if(keepFocus && !this.finishingEntry && (this.entryOpen || wasBrowser) && wasBrowser === this.isBrowser() &&
        (document.activeElement === keyboard || document.activeElement === document.body))this.focusTaskEntry(input);
      restoreScroll();
    }
  }

  private playBirdChirp(): void {
    try {
      const ctx = this.audioContext ??= new (window.AudioContext || (window as unknown as {webkitAudioContext: typeof AudioContext}).webkitAudioContext)();
      if (ctx.state === 'suspended') void ctx.resume();
      if (ctx.state !== 'running') return;
      const now = ctx.currentTime;
      // Simple envelope for birds, similar to ZenAudio but 2D
      for (const [index, frequency] of [1200, 1650, 1350, 1950].entries()) {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        const start = now + index * 0.32;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.32, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.28);
        osc.frequency.setValueAtTime(frequency, start);
        osc.frequency.exponentialRampToValueAtTime(frequency * 1.22, start + 0.09);
        osc.frequency.exponentialRampToValueAtTime(frequency * 0.92, start + 0.24);
        osc.connect(gain);
        gain.connect(themeAudioOutput(ctx));
        osc.start(start);
        osc.stop(start + 0.28);
        osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch {} };
      }
    } catch {}
  }

  private async completeTask(panel: UIKitMLAsset, id?: string,
    gestureXR?: Pick<XRSystem, 'requestSession'>): Promise<void> {
    const taskId = id ?? this.session.activeTask?.id;
    if(this.isBrowser() && this.finaleStyle === '3d')traceEnhanced('completion-action', {
      phase: this.session.phase, unfinished: this.session.unfinishedTaskCount,
      finaleBusy: finalTaskAR.busy, xrEnabled: this.world.xrEnabled,
      sessionPresent: !!this.world.session, requestPending: this.world.sessionRequestPending,
    });
    if(finalTaskAR.busy || this.session.phase !== 'ready')return;
    if(taskId && this.session.tasks.some(task => task.id === taskId && task.completed)) {
      const before = this.session.tasks;
      const next = setTaskCompleted(before, taskId, false);
      this.session.phase = 'saving';
      this.session.message = 'Saving...';
      this.render(panel);
      try {
        await this.taskStore.save(next, before);
        this.session.tasks = next;
        this.session.message = 'Saved: task unchecked.';
        // The next render clears this row's bee/strike and publishes lower garden progress.
        required<HTMLElement>('#browser-garden').classList.remove('is-ar-finale');
      } catch(error) {
        this.session.message = error instanceof Error ? error.message : 'CueDone could not uncheck the task.';
        if(error instanceof Error && error.name === 'TaskConflictError') {
          await this.session.load();
          this.session.message = 'The list changed in another window. Review it and try again.';
        }
      } finally {
        if(this.session.phase === 'saving')this.session.phase = 'ready';
        this.render(panel);
      }
      return;
    }
    const final = this.isBrowser() && this.session.unfinishedTaskCount === 1 &&
      this.session.tasks.some(task => task.id === taskId && !task.completed);
    if(!final) {
      const wasFinal = this.session.unfinishedTaskCount === 1 &&
        this.session.tasks.some(task => task.id === taskId && !task.completed);
      const pending = this.session.completeTask(taskId);
      this.render(panel); const saved = await pending; this.render(panel);
      if(saved && wasFinal && !this.isBrowser()) {
        // Bind the last bee sweep to the successful save, even if a storage
        // refresh already rendered the completed row before this continuation.
        const entry=this.rows.find(row => row.id === taskId);
        if(entry) {
          entry.elapsed=0;
          entry.pollen.setProperties({width:'0%'});
          entry.bee.setProperties({display:'flex',positionLeft:0});
        }
      }
      return;
    }
    const before = this.session.tasks.map(({id,completed}) => ({id,completed}));
    const enhanced = this.finaleStyle === '3d';
    const arRun = enhanced ? finalTaskAR.begin(before) : undefined;
    let enhancedError = '';
    if(arRun) {
      // Snapshot before requestSession can resize or blur the browser viewport.
      const restoreLayout=this.preserveBrowserLayout(panel,panel.requireElementById<TaskInput>('task-input'));
      // Start the native request in the final-task click, before awaiting storage.
      // FinalTaskAR counts 5.75 seconds from its first visible saved-list XR frame.
      void launchAR(this.world, required<HTMLElement>('#xr-overlay'), gestureXR,
        session => finalTaskAR.attach(arRun, session), restoreLayout).then(started => {
        traceEnhanced('launcher-finished', {started});
        if(!started) {finalTaskAR.cancel(arRun);restoreLayout();}
      }).catch((error: unknown) => {
        const reason = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
        traceEnhanced('launcher-rejected', {error: reason, stack: error instanceof Error ? error.stack : undefined});
        finalTaskAR.cancel(arRun);
        enhancedError = `Enhanced AR failed: ${reason}`;
        this.session.message = enhancedError;
        this.render(panel);
        restoreLayout();
      });
    }
    const pending = this.session.completeTask(taskId);
    this.render(panel);
    const saved = await pending;
    this.render(panel);
    const isFinal = saved && isFinalCompletion(before, this.session.tasks);
    if(enhancedError)this.session.message = enhancedError;
    if(arRun) {
      if(isFinal)finalTaskAR.saved(arRun, this.session.tasks);
      else finalTaskAR.cancel(arRun);
    }
    const trellis = document.querySelector('.trellis-frame') as HTMLElement | null;
    if(isFinal && trellis && !arRun && !this.isRocketTheme() && !this.isCoralTheme()) {
      trellis.classList.add('is-ar-finale');
      // Bird chirp in 2D finale — resume AudioContext on checkbox click gesture for Quest Browser
      this.playBirdChirp();
      // Only task contents scroll; the garden viewport stays in place.
      const list = document.querySelector('#browser-task-list') as HTMLElement | null;
      if (list) list.scrollTo({top: 0, behavior: 'smooth'});
      setTimeout(() => {
        trellis.classList.remove('is-ar-finale');
      }, enhanced ? FINAL_AR_MS : 7750);
    }
    this.render(panel);
  }

  private openNewListReview(panel: UIKitMLAsset, input: TaskInput, clear = false): void {
    this.inputLog('review-opening', {clear});
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
    const wasBrowser = this.isBrowser();
    const pending = this.session.startNewList(carryUnfinished);
    this.render(panel);
    const saved = await pending;
    if (saved) {
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
    if (saved && !carryUnfinished && wasBrowser && this.isBrowser()) {
      const previousFocus = document.activeElement;
      requestAnimationFrame(() => {
        const active = document.activeElement;
        if (!this.isBrowser() || this.session.phase !== 'ready' || this.reviewingNewList ||
          this.settingsOpen || this.collapsed || !this.entryOpen || this.browser.form.hidden ||
          this.browserEntryCollapsed || this.browser.input.disabled || !this.browser.input.isConnected) return;
        if (active !== previousFocus && active !== document.body) return;
        if (active !== document.body && active !== this.browser.input && active !== this.browser.emptyButton) return;
        this.browser.input.focus();
      });
    } else if (!this.reviewingNewList && this.isBrowser()) this.browser.input.focus();
    this.inputLog('new-list-review-finished', {carryUnfinished});
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
    const rocket=this.isRocketTheme();
    const coral=this.isCoralTheme();
    const theme=this.browser.root.dataset.taskTheme ?? 'zen';
    const signature = JSON.stringify([this.session.tasks, disabled,theme]);
    if(signature === this.rowSignature)return;
    this.rowSignature = signature;
    const themeChanged=this.rowTheme!==theme;
    this.rowTheme=theme;
    const animate = !themeChanged && (this.session.message === 'Task complete.' || this.remoteFeedback);
    const running = new Map(this.rows.filter(entry => !themeChanged && entry.elapsed >= 0)
      .map(entry => [entry.id,entry.elapsed]));
    this.disposeRows();
    const list = panel.requireElementById<UIKit.Container>('task-list');
    const browserList = required<HTMLElement>('#browser-task-list');
    const listScrollTop = browserList.scrollTop;
    browserList.replaceChildren();
    for(const task of this.session.tasks) {
      const fresh = animate && this.previousTasks.get(task.id) === false && task.completed;
      const elapsed = task.completed ? (running.get(task.id) ?? (fresh ? 0 : -1)) : -1;
      const row = new UIKit.Container({width: '100%', minHeight: 10, flexShrink: 0, padding: 2, positionType: 'relative', backgroundColor: task.completed ? '#F3EBDD' : '#FFF0D5', borderRadius: 1, flexDirection: 'row', alignItems: 'center', gap: 2});
      row.name = `Task-${task.id}`;
      const check = new UIKit.Container({width: 8, height: 8, flexShrink: 0, borderWidth: 0.5, borderColor: '#96550C', borderRadius: 1, justifyContent: 'center', alignItems: 'center'});
      check.name = `CompleteTask-${task.id}`;
      check.setProperties({pointerEvents: 'none'});
      check.add(new UIKit.Text({text: task.completed ? 'X' : '', fontSize: 4, color: '#713F08'}));
      const label = new UIKit.Container({flexGrow: 1, flexShrink: 1, minWidth: 0, minHeight: 6, positionType: 'relative', justifyContent: 'center', pointerEvents: 'none'});
      const text = new UIKit.Text({text: task.text, fontSize: 2.8, color: '#332D25', width: '100%', verticalAlign: 'center'});
      label.add(text);
      row.add(check, label);
      const pollen = new UIKit.Container({positionType: 'absolute', positionLeft: 0, positionTop: '50%', height: 0.35, width: elapsed >= 0 ? `${elapsed*100}%` : task.completed ? '100%' : '0%', backgroundColor: '#ECAF18', opacity: 0.9, pointerEvents: 'none'});
      if(!rocket && !coral)pollen.add(new UIKit.Container({positionType: 'absolute', positionLeft: 0, positionTop: -0.4, width: '100%', height: 1.1, backgroundColor: '#FFD651', opacity: 0.25, pointerEvents: 'none'}));
      const bee = new UIKit.Container({positionType: 'absolute', positionTop: '30%', positionLeft: 0, width: 4, height: 2.5, borderRadius: 2, backgroundColor: '#FFC83D', display: 'none', pointerEvents: 'none'});
      if(rocket) {
        bee.setProperties({backgroundColor:'#F4FBFF',width:1.5,height:1.5,borderRadius:1});
        bee.add(new UIKit.Container({positionType:'absolute',positionRight:1.2,positionTop:0.45,width:5,height:0.6,backgroundColor:'#8EDCFF',opacity:0.8}));
        bee.add(new UIKit.Container({positionType:'absolute',positionLeft:0.55,positionTop:-0.4,width:0.4,height:2.3,backgroundColor:'#FFF4B6'}));
        pollen.setProperties({backgroundColor:'#77CFFF'});
      } else if(coral) {
        bee.setProperties({backgroundColor:'#F58D39',width:4,height:2.1,borderRadius:1});
        for(const x of [0.8,2.3])bee.add(new UIKit.Container({positionType:'absolute',positionLeft:x,width:0.45,height:2.1,backgroundColor:'#FFF8E7'}));
        bee.add(new UIKit.Container({positionType:'absolute',positionRight:0.35,positionTop:0.4,width:0.35,height:0.35,borderRadius:0.2,backgroundColor:'#233943'}));
        bee.add(new UIKit.Container({positionType:'absolute',positionLeft:-0.8,positionTop:0.25,width:1,height:1.6,borderRadius:0.3,backgroundColor:'#F58D39'}));
        for(let i=0;i<3;i++)bee.add(new UIKit.Container({positionType:'absolute',positionLeft:-2-i*1.2,positionTop:0.3-i*0.6,width:0.55+i*0.1,height:0.55+i*0.1,borderRadius:1,borderWidth:0.12,borderColor:'#72C8D6',opacity:0.8-i*0.15}));
        pollen.setProperties({backgroundColor:'#64BCCA'});
      } else {
        for(const x of [1,2.3])bee.add(new UIKit.Container({positionType: 'absolute', positionLeft: x, width: 0.5, height: 2.5, backgroundColor: '#332D25'}));
        for(const x of [0.3,2])bee.add(new UIKit.Container({positionType: 'absolute', positionLeft: x, positionTop: -1, width: 1.7, height: 1.3, borderRadius: 1, backgroundColor: '#FFFFFF', opacity: 0.85}));
      }
      label.add(pollen, bee);
      row.setProperties({onClick: () => {
        if(!disabled && this.world.visibilityState.value === VisibilityState.Visible)void this.completeTask(panel, task.id);
      }});
      list.add(row);
      this.rows.push({row, pollen, bee, id: task.id, elapsed});
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'browser-task-row';
      button.setAttribute('aria-label', `${task.completed ? 'Uncheck' : 'Complete'}: ${task.text}`);
      button.setAttribute('aria-pressed', String(task.completed));
      button.disabled = disabled;
      button.dataset.completed = String(task.completed);
      const checkbox = document.createElement('span'); checkbox.className = 'task-checkbox';
      checkbox.textContent = task.completed ? '✓' : ''; checkbox.setAttribute('aria-hidden', 'true');
      const browserLabel = document.createElement('span'); browserLabel.className = 'task-label task-text';
      const labelText = document.createElement('span'); labelText.className = 'task-label-text'; labelText.textContent = task.text;
      browserLabel.append(labelText);
      const line = document.createElement('span'); line.className = 'pollen-line'; line.setAttribute('aria-hidden', 'true');
      const beeIcon = document.createElement('span'); beeIcon.className = rocket?'task-shooting-star':coral?'task-clownfish':'task-bee'; beeIcon.textContent = rocket||coral?'':'🐝'; beeIcon.setAttribute('aria-hidden', 'true');
      if(coral) {const bubbles=document.createElement('span');bubbles.className='fish-bubbles';beeIcon.append(bubbles);}
      browserLabel.append(line, beeIcon);
      button.append(checkbox, browserLabel);
      if(fresh && this.motionEnabled && !this.reducedMotion.matches)button.classList.add('pollinating');
      button.addEventListener('click', () => {
        // Both checking and unchecking work in ordinary 2D without WebXR.
        if(this.finaleStyle === '2d') {
          void this.completeTask(panel, task.id);
          return;
        }
        const xr = navigator.xr;
        const gestureXR: Pick<XRSystem, 'requestSession'> | undefined = xr ? {
          requestSession: (mode, init) => {
            // launchAR invokes this synchronously, before completeTask's first await.
            // A rejected AR request must not trigger a second immersive request
            // after the click's user activation may have been consumed.
            if(mode !== 'immersive-ar')return Promise.reject(new Error('AR session unavailable.'));
            traceEnhanced('requestSession-called', {mode, userActivation: navigator.userActivation?.isActive});
            try {
              return xr.requestSession('immersive-ar', init).then(session => {
                traceEnhanced('requestSession-resolved', {visibility: session.visibilityState});
                return session;
              }, error => {
                traceEnhanced('requestSession-rejected', {error: String(error)});
                throw error;
              });
            } catch(error) {
              traceEnhanced('requestSession-threw', {error: String(error)});
              throw error;
            }
          },
        } : undefined;
        void this.completeTask(panel, task.id, gestureXR);
      });
      const item = document.createElement('div');
      item.className = 'task-item';
      item.setAttribute('role', 'listitem');
      const editBtn = document.createElement('button');
      editBtn.type = 'button'; editBtn.className = 'task-edit-btn';
      editBtn.textContent = '✏️'; editBtn.title = 'Edit task';
      editBtn.setAttribute('aria-label', `Edit task: ${task.text}`);
      editBtn.disabled = disabled;
      editBtn.addEventListener('click', event => {
        event.stopPropagation();
        if(this.session.phase !== 'ready' || document.getElementById('task-edit-modal'))return;
        const dialog = document.createElement('dialog');
        dialog.id = 'task-edit-modal'; dialog.className = 'edit-modal';
        dialog.setAttribute('aria-label', 'Edit task');
        const editor = document.createElement('input');
        editor.type = 'text'; editor.maxLength = 200; editor.id = 'task-edit-input';
        editor.placeholder = 'Edit task name...';
        editor.className = 'inline-task-edit-input'; editor.enterKeyHint = 'done';
        editor.setAttribute('aria-label', 'Edit task text');
        const save = document.createElement('button');
        save.id = 'save-task-btn'; save.type = 'button'; save.textContent = 'Save';
        const remove = document.createElement('button');
        remove.id = 'delete-task-btn'; remove.type = 'button';
        remove.className = 'danger-btn'; remove.textContent = 'Delete Task';
        const dismiss = document.createElement('button');
        dismiss.type = 'button'; dismiss.textContent = 'Cancel';
        const feedback = document.createElement('p'); feedback.setAttribute('role', 'status');
        dialog.append(editor, save, remove, dismiss, feedback);
        this.browser.root.append(dialog);
        let finished = false;
        const cancel = () => {
          finished = true; dialog.close(); dialog.remove();
          if(editBtn.isConnected)editBtn.focus({preventScroll: true});
          else this.browser.input.focus({preventScroll: true});
        };
        const commitEdit = async (deleting = false) => {
          if(finished || this.session.phase !== 'ready')return;
          const text = normalizeTaskText(editor.value);
          if(!deleting && !text) {feedback.textContent = 'Enter a task name.'; editor.focus(); return;}
          if(!deleting && text === task.text) {cancel(); return;}
          const before = this.session.tasks;
          if(!before.some(current => current.id === task.id && current.text === task.text)) {cancel(); return;}
          const next = deleting ? before.filter(current => current.id !== task.id) :
            before.map(current => current.id === task.id ? {...current, text} : current);
          finished = true; editor.readOnly = true; this.session.phase = 'saving';
          save.disabled = remove.disabled = dismiss.disabled = true;
          try {
            await this.taskStore.save(next, before);
            this.session.tasks = next;
            this.session.message = deleting ? 'Saved: task deleted.' : 'Saved: task text updated.';
            dialog.close(); dialog.remove();
            this.rowSignature = '';
          } catch(error) {
            this.session.message = error instanceof Error ? error.message : 'CueDone could not save the task text.';
            finished = false; feedback.textContent = this.session.message;
            if(error instanceof Error && error.name === 'TaskConflictError') {
              await this.session.load();
              this.session.message = 'The list changed in another window. Review it and try again.';
              this.rowSignature = '';
            }
          } finally {
            if(this.session.phase === 'saving')this.session.phase = 'ready';
            editor.readOnly = false;
            save.disabled = remove.disabled = dismiss.disabled = false;
            this.render(panel);
            if(!dialog.isConnected)this.browser.input.focus({preventScroll: true});
          }
        };
        editor.addEventListener('keydown', key => {
          key.stopPropagation();
          if(key.isComposing)return;
          if(key.key === 'Enter') {key.preventDefault(); void commitEdit();}
          else if(key.key === 'Escape') {key.preventDefault(); if(!finished)cancel();}
        });
        save.addEventListener('click', () => {void commitEdit();});
        remove.addEventListener('click', () => {void commitEdit(true);});
        dismiss.addEventListener('click', cancel);
        dialog.addEventListener('cancel', event => {
          event.preventDefault();
          if(!finished)cancel();
        });
        dialog.showModal();
        // Focus the mounted field in the pencil's user gesture so the
        // Quest system keyboard attaches to this editor ready for editing.
        editor.value = task.text;
        editor.focus({preventScroll: true});
        // Retry after the WebXR keyboard handoff without stealing later focus.
        window.setTimeout(() => {
          if(!finished && editor.isConnected && this.session.phase === 'ready' &&
            (document.activeElement === editor || document.activeElement === document.body)) {
            editor.focus({preventScroll: true});
          }
        }, 50);
      });
      item.append(button, editBtn);
      browserList.append(item);
    }
    if(!this.session.tasks.length) {
      const message = this.session.phase === 'loading' ? 'Loading…' : 'Add a task when you are ready.';
      this.emptyRow = new UIKit.Text({text: message, fontSize: 2.8, color: '#5C5143'});
      list.add(this.emptyRow);
      browserList.textContent = message;
    }
    browserList.scrollTop = listScrollTop;
    this.previousTasks = new Map(this.session.tasks.map(task => [task.id, task.completed]));
  }

  update(delta: number): void {
    const panel = this.world.requireSceneObject<UIKitMLAsset>('task-panel');
    // CSS owns the browser lattice; retain the surrounding 3D vines and flowers.
    // Restore the wooden mesh in immersive mode, where the CSS frame is absent.
    const wood = this.world.scene.getObjectByName('Rectangular wooden lattice');
    if(wood) wood.visible = !this.isBrowser() && this.browser.root.dataset.taskTheme==='zen';
    // Theme changes rebuild presentation only, never task state or completion events.
    this.renderRows(panel,this.session.phase!=='ready');
    if((this.isRocketTheme() || this.isCoralTheme()) && this.audioContext) {releaseThemeAudioOutput(this.audioContext);void this.audioContext.close().catch(()=>{});this.audioContext=null;}
    if(finalTaskAR.error && this.session.message !== finalTaskAR.error) {this.session.message = finalTaskAR.error; this.render(panel);}
    this.motionEnabled = panel.requireElementById('spatial-motion').properties.value.text === 'Ambient motion: On';
    const motion = this.motionEnabled && !this.reducedMotion.matches && this.progression === 'smooth';
    this.browser.root.classList.toggle('motion-off', !motion);
    if(this.world.visibilityState.value === VisibilityState.Visible)this.animateRows(delta);
  }

  private animateRows(delta:number):void {
    const motion = this.motionEnabled && !this.reducedMotion.matches && this.progression === 'smooth';
    for(const entry of this.rows) {
      if(entry.elapsed < 0)continue;
      entry.elapsed = motion ? Math.min(1, entry.elapsed + Math.max(0, Math.min(delta, 1/30))/(this.isRocketTheme()?1.2:this.isCoralTheme()?1.5:1.25)) : 1;
      entry.pollen.setProperties({width: `${entry.elapsed*100}%`});
      entry.bee.setProperties({display: entry.elapsed < 1 ? 'flex' : 'none', positionLeft: `${entry.elapsed*100}%`, positionTop: `${this.isRocketTheme()?45:this.isCoralTheme()?45+Math.sin(entry.elapsed*10)*3:30+Math.sin(entry.elapsed*16)*4}%`});
      if(entry.elapsed === 1)entry.elapsed = -1;
    }
  }

  private isCoralTheme():boolean {return this.browser.root.dataset.taskTheme==='coral';}

  private isRocketTheme():boolean {return this.browser.root.dataset.taskTheme==='rocket';}

  private isBrowser(): boolean {
    return this.world.visibilityState.value === VisibilityState.NonImmersive;
  }

  private preserveBrowserLayout(panel:UIKitMLAsset,input:TaskInput):()=>void {
    if(!this.isBrowser() || this.browserXRLayout)return ()=>{};
    const elements=[document.scrollingElement,this.browser.root,
      document.querySelector('#browser-panel-body'),document.querySelector('#browser-task-list')]
      .filter((element):element is Element=>element!==null);
    const layout=new BrowserPanelLayout(this.browser.root,elements);
    this.browserXRLayout=layout;
    let released=false;
    return ()=>{
      if(released)return;
      released=true;layout.release();
      if(this.isBrowser())this.syncPresentation(panel,input);
    };
  }

  private syncPresentation(panel: UIKitMLAsset, input: TaskInput): void {
    const isBrowser = this.isBrowser();
    const pinned=this.browserXRLayout?.pinned ?? false;
    panel.visible = !isBrowser;
    // Retain the DOM footprint so XR entry never collapses the page's layout.
    this.browser.root.hidden = false;
    this.browser.root.dataset.xrSuspended = String(!isBrowser || pinned);
    this.browser.root.inert = !isBrowser || pinned;

    if (isBrowser) {
      input.input.blur();
      this.browser.input.value = this.draft;
    } else {
      this.browser.input.blur();
      input.input.uncontrolledSignal.value = this.draft;
    }

    this.render(panel);
    // Visibility can become NonImmersive before Three finishes session teardown.
    // The saved coordinates must survive until the temporary styles/spacer are gone.
    if(isBrowser && this.browserXRLayout?.restore())this.browserXRLayout=undefined;
  }

  private render(panel: UIKitMLAsset): void {
    publishSpatialProgress(this.session.tasks,
      this.progression === 'smooth' && (this.session.message === 'Task complete.' || this.remoteFeedback));
    panel.requireElementById('grab-handle').setProperties({display: this.collapsed ? 'none' : 'flex'});
    panel.requireElementById('scroll-controls').setProperties({display: this.collapsed ? 'none' : 'flex'});
    panel.requireElementById('task-view').setProperties({display: this.settingsOpen ? 'none' : 'flex'});
    required<HTMLElement>('#browser-task-view').hidden = this.settingsOpen;
    panel.requireElementById('panel-body').setProperties({display: this.collapsed ? 'none' : 'flex'});
    panel.requireElementById('panel-surface').setProperties({height: this.collapsed ? 'auto' : 100});
    panel.requireElementById('settings-toggle').setProperties({display: this.collapsed ? 'none' : 'flex'});
    this.collapseUp?.setProperties({display: this.collapsed ? 'none' : 'flex'});
    this.collapseDown?.setProperties({display: this.collapsed ? 'flex' : 'none'});
    panel.requireElementById('collapse-toggle').name = this.collapsed ? 'Expand CueDone' : 'Collapse CueDone';
    required<HTMLElement>('#browser-panel-body').hidden = this.collapsed;
    required<HTMLElement>('#browser-settings-toggle').hidden = this.collapsed;
    const collapsedBar = required<HTMLElement>('#browser-collapsed-bar');
    const collapsedText = required<HTMLElement>('#browser-collapsed-text');
    collapsedBar.hidden = !this.collapsed;
    collapsedText.textContent = `${this.session.completedCount}/${this.session.tasks.length} Complete [ ${this.isRocketTheme()?'Space Rocket':this.isCoralTheme()?'Kelp Forest':'Garden 🌿'} ]`;
    required<HTMLElement>('#browser-panel').dataset.collapsed = String(this.collapsed);
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
    panel.requireElementById('complete-button').setProperties({
      disabled:
        isLoading ||
        isSaving ||
        loadFailed ||
        this.reviewingNewList ||
        active == null,
    });
    panel.requireElementById('task-controls').setProperties({
      display: this.collapsed || this.settingsOpen || this.reviewingNewList || !this.entryOpen ? 'none' : 'flex',
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
    panel.requireElementById('settings-panel').setProperties({display: this.settingsOpen ? 'flex' : 'none'});
    required<HTMLElement>('#browser-settings-panel').hidden = !this.settingsOpen;
    required<HTMLElement>('#browser-settings-toggle').setAttribute('aria-expanded', String(this.settingsOpen));
    for(const id of ['reset-button', 'clear-button', 'show-add-button']) {
      const unavailable = disabled || (id === 'reset-button' ? !this.session.completedCount : id === 'clear-button' ? !this.session.tasks.length : false);
      panel.requireElementById(id).setProperties({disabled: unavailable});
      if(id !== 'show-add-button')required<HTMLButtonElement>(`#browser-${id}`).disabled = unavailable;
    }
    const reviewTitle = this.reviewingClear ? 'Clear all tasks?' : 'Start a new list?';
    panel.requireElementById('new-list-title').setProperties({text: reviewTitle});
    required<HTMLElement>('#browser-new-list-title').textContent = reviewTitle;
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

    const entryFinished = this.browserEntryFinished && !this.entryOpen;
    this.browser.root.dataset.entryFinished = String(entryFinished);
    required<HTMLElement>('#browser-reopen-entry').hidden = !entryFinished || this.collapsed || this.settingsOpen;
    this.browser.form.hidden = this.collapsed || this.settingsOpen || this.reviewingNewList || entryFinished;
    required<HTMLElement>('#browser-entry-fields').hidden = this.browserEntryCollapsed;
    const entryToggle = required<HTMLButtonElement>('#browser-entry-toggle');
    entryToggle.textContent = this.browserEntryCollapsed ? 'Edit' : 'Done';
    entryToggle.setAttribute('aria-label', this.browserEntryCollapsed ? 'Edit tasks' : 'Done with task entry');
    entryToggle.setAttribute('aria-expanded', String(!this.browserEntryCollapsed));
    this.browser.input.disabled = isLoading || (isSaving && !this.addingTask) || loadFailed || this.reviewingNewList;
    required<HTMLButtonElement>('#browser-add-task-button').disabled = busy || loadFailed || this.reviewingNewList;
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
