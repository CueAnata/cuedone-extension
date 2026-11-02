import {
  createSystem,
  UIKit,
  UIKitMLAsset,
  VisibilityState,
} from '@iwsdk/core';
import { ChevronDown } from '@pmndrs/uikit-lucide/dist/ChevronDown.js';
import { ChevronUp } from '@pmndrs/uikit-lucide/dist/ChevronUp.js';
import { Settings } from '@pmndrs/uikit-lucide/dist/Settings.js';
import { launchAR, finalTaskAR } from './ar-session.js';
import { publishSpatialProgress } from './spatial-presentation.js';
import { LocalTaskStore, TASK_STORE_KEY } from './task-store.js';
import { watchLocalStorage } from './local-sync.js';
import { isFinalCompletion, isForwardCompletion } from './garden-progress.js';
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
  private finaleStyle: '2d' | '3d' = '2d';
  private progression: 'smooth' | 'instant' = 'smooth';
  private collapsed = false;
  private collapseUp?: InstanceType<typeof ChevronUp>;
  private collapseDown?: InstanceType<typeof ChevronDown>;
  private entryOpen = false;
  private browserEntryFinished = false;
  private addingTask = false;
  private finishingEntry = false;
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
  private audioContext: AudioContext | null = null;

  init(): void {
    const panel = this.world.requireSceneObject<UIKitMLAsset>('task-panel');
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
    addChoice('Finale', [['2d', '2D — stay in browser'], ['3d', '3D — immersive AR']], value => {
      this.finaleStyle = value === '3d' ? '3d' : '2d';
    });
    addChoice('Animation progression', [['smooth', 'Smooth'], ['instant', 'Instant']], value => {
      this.progression = value === 'instant' ? 'instant' : 'smooth';
    });
    // Keep entry into AR available from both the list and Settings.
    this.browser.root.append(this.browser.xrButton);
    required('#browser-garden').removeAttribute('role');
    required<HTMLElement>('#browser-task-view > .browser-entry-help').textContent =
      'Garden progress follows each completed task. Choose a 2D or immersive 3D finale in Settings.';
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
    bind('show-add-button', () => {
      if(this.isBrowser()) this.browser.form.requestSubmit();
      else this.openTaskEntry(panel, taskInput);
    });
    bind('entry-done-button', () => {void this.finishTaskEntry(panel, taskInput);});
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
    let returnHandled = false;
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
    this.browserEntryFinished = false;
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
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.28);
        osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch {} };
      }
    } catch {}
  }

  private async completeTask(panel: UIKitMLAsset, id?: string): Promise<void> {
    const taskId = id ?? this.session.activeTask?.id;
    if(finalTaskAR.busy || this.session.phase !== 'ready')return;
    const final = this.isBrowser() && this.session.unfinishedTaskCount === 1 &&
      this.session.tasks.some(task => task.id === taskId && !task.completed);
    if(!final) {
      const pending = this.session.completeTask(taskId);
      this.render(panel); await pending; this.render(panel);
      return;
    }
    const before = this.session.tasks.map(({id,completed}) => ({id,completed}));
    const arRun = this.finaleStyle === '3d' ? finalTaskAR.begin(before) : undefined;
    if(arRun) {
      void launchAR(this.world, required<HTMLElement>('#xr-overlay'), navigator.xr,
        session => finalTaskAR.attach(arRun, session)).then(started => {
        if(!started) finalTaskAR.cancel(arRun);
      }).catch(() => {
        finalTaskAR.cancel(arRun);
        this.session.message = 'Immersive AR is unavailable. Your task remains saved.';
        this.render(panel);
      });
    }
    const pending = this.session.completeTask(taskId);
    this.render(panel);
    const saved = await pending;
    this.render(panel);
    const isFinal = saved && isFinalCompletion(before, this.session.tasks);
    if(arRun) {
      if(isFinal) finalTaskAR.saved(arRun, this.session.tasks);
      else finalTaskAR.cancel(arRun);
    }
    const trellis = document.querySelector('.trellis-frame') as HTMLElement | null;
    if(isFinal && trellis && !arRun) {
      trellis.classList.add('is-ar-finale');
      // Bird chirp in 2D finale — resume AudioContext on checkbox click gesture for Quest Browser
      this.playBirdChirp();
      // Only task contents scroll; the garden viewport stays in place.
      const list = document.querySelector('#browser-task-list') as HTMLElement | null;
      if (list) list.scrollTo({top: 0, behavior: 'smooth'});
      setTimeout(() => {
        trellis.classList.remove('is-ar-finale');
      }, 6500);
    }
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
    const listScrollTop = browserList.scrollTop;
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
      const pollen = new UIKit.Container({positionType: 'absolute', positionLeft: 0, positionTop: '50%', height: 0.35, width: task.completed && !fresh ? '100%' : '0%', backgroundColor: '#ECAF18', opacity: 0.9, pointerEvents: 'none'});
      pollen.add(new UIKit.Container({positionType: 'absolute', positionLeft: 0, positionTop: -0.4, width: '100%', height: 1.1, backgroundColor: '#FFD651', opacity: 0.25, pointerEvents: 'none'}));
      const bee = new UIKit.Container({positionType: 'absolute', positionTop: '30%', positionLeft: 0, width: 4, height: 2.5, borderRadius: 2, backgroundColor: '#FFC83D', display: 'none', pointerEvents: 'none'});
      for(const x of [1,2.3])bee.add(new UIKit.Container({positionType: 'absolute', positionLeft: x, width: 0.5, height: 2.5, backgroundColor: '#332D25'}));
      for(const x of [0.3,2])bee.add(new UIKit.Container({positionType: 'absolute', positionLeft: x, positionTop: -1, width: 1.7, height: 1.3, borderRadius: 1, backgroundColor: '#FFFFFF', opacity: 0.85}));
      label.add(pollen, bee);
      row.setProperties({onClick: () => {if(!disabled && !task.completed)void this.completeTask(panel, task.id);}});
      list.add(row);
      this.rows.push({row, pollen, bee, id: task.id, elapsed: fresh ? 0 : -1});
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
    browserList.scrollTop = listScrollTop;
    this.previousTasks = new Map(this.session.tasks.map(task => [task.id, task.completed]));
  }

  update(delta: number): void {
    const panel = this.world.requireSceneObject<UIKitMLAsset>('task-panel');
    // CSS owns the browser lattice; retain the surrounding 3D vines and flowers.
    // Restore the wooden mesh in immersive mode, where the CSS frame is absent.
    const wood = this.world.scene.getObjectByName('Rectangular wooden lattice');
    if(wood) wood.visible = !this.isBrowser();
    if(finalTaskAR.error && this.session.message !== finalTaskAR.error) {this.session.message = finalTaskAR.error; this.render(panel);}
    this.motionEnabled = panel.requireElementById('spatial-motion').properties.value.text === 'Ambient motion: On';
    const motion = this.motionEnabled && !this.reducedMotion.matches && this.progression === 'smooth';
    this.browser.root.classList.toggle('motion-off', !motion);
    for(const entry of this.rows) {
      if(entry.elapsed < 0)continue;
      const visible = this.world.visibilityState.value === VisibilityState.Visible;
      entry.elapsed = motion && visible ? Math.min(1, entry.elapsed + Math.max(0, Math.min(delta, 1/30))/2.4) : 1;
      entry.pollen.setProperties({width: `${entry.elapsed*100}%`});
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
    collapsedText.textContent = `${this.session.completedCount}/${this.session.tasks.length} Complete [ Garden 🌿 ]`;
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
      required<HTMLButtonElement>(`#browser-${id}`).disabled = unavailable;
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
