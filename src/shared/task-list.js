import { createSettingsSaver } from "./settings-save.js";
import {
  addTask,
  canResetList,
  deleteTask,
  reorderTasks,
  resetCompletedTasks,
} from "./tasks.js";
import {
  formatProgressLabel,
  nextCompletionStyleAction,
  nextFinalCelebrationAction,
  nextSoundAction,
  nextUnfinishedTask,
  pickFinalTrail,
  planFromCheckboxCompletion,
  resetListVisible,
  snapshotTasks,
  taskProgress,
} from "./client-view.js";
import {
  formatRewardCard,
  formatRewardReveal,
  initialRewardEditing,
  nextRewardEditing,
  normalizeReward,
  rewardCardVisible,
  rewardEditVisible,
  rewardEditorVisible,
  rewardShowsCustomInput,
} from "./reward.js";
import {
  clearCelebrationFeedback,
  playBreakClockRing,
  playCelebrationSound,
  playTaskSound,
  setCelebrationAudioEnabled,
  showCelebration,
  showFinalTrail,
  stopCelebrationAudio,
  unlockCelebrationAudio,
} from "./celebrations.js";
import {
  refreshCarryoverReview,
  saveNewListFromReview,
  taskListsMatch,
} from "./list-lifecycle.js";
import {
  connectBreakClockView,
  hasBreakNotificationPermission,
  onBreakNotificationPermissionChanged,
  onBrowserViewResumed,
  requestBreakNotificationPermission,
  scheduleBrowserAlarm,
} from "../platform/browser.js";
import { beginBreakNotificationOptIn } from "../platform/break-notifications.js";
import {
  loadCompletionSound,
  loadCompletionStyle,
  loadFinalCelebration,
  loadFinalSound,
  loadPersonalAffirmation,
  loadPersonalBreakNotifications,
  loadPersonalBreakTimer,
  loadPersonalCompleteMessage,
  loadPersonalCompletionSound,
  loadPersonalEnding,
  loadPersonalFinalSound,
  loadPersonalPauseMessage,
  loadPersonalPlantTheme,
  loadPersonalVisualTheme,
  loadPersonalPresentation,
  loadPersonalTaskLayout,
  loadPersonalTaskSound,
  loadPresentationMode,
  loadReward,
  loadTaskEntryOpen,
  loadTaskSound,
  onCompletionSoundChanged,
  onCompletionStyleChanged,
  onFinalCelebrationChanged,
  onFinalSoundChanged,
  onPersonalAffirmationChanged,
  onPersonalBreakNotificationsChanged,
  onPersonalBreakTimerChanged,
  onPersonalCompleteMessageChanged,
  onPersonalCompletionSoundChanged,
  onPersonalEndingChanged,
  onPersonalFinalSoundChanged,
  onPersonalPauseMessageChanged,
  onPersonalPlantThemeChanged,
  onPersonalVisualThemeChanged,
  onPersonalPresentationChanged,
  onPersonalTaskLayoutChanged,
  onPersonalTaskSoundChanged,
  onPresentationModeChanged,
  onRewardChanged,
  onTaskEntryOpenChanged,
  onTaskSoundChanged,
  saveCompletionSound,
  saveCompletionStyle,
  saveFinalCelebration,
  saveFinalSound,
  savePersonalAffirmation,
  savePersonalBreakNotifications,
  savePersonalBreakTimer,
  savePersonalCompleteMessage,
  savePersonalCompletionSound,
  savePersonalEnding,
  savePersonalFinalSound,
  savePersonalPauseMessage,
  savePersonalPlantTheme,
  savePersonalVisualTheme,
  savePersonalSessionState,
  savePersonalPresentation,
  savePersonalTaskLayout,
  savePersonalTaskSound,
  saveReward,
  saveTaskEntryOpen,
  saveTaskSound,
  taskEntryVisibility,
  normalizeFinalSound,
  normalizeTaskSound,
} from "./preferences.js";
import {
  BREAK_SUGGESTION_MAX_LENGTH,
  MAX_BREAK_INTERVAL_MINUTES,
  MIN_BREAK_INTERVAL_MINUTES,
  addCustomBreakSuggestion,
  breakClockAlarmDelay,
  breakClockStatus,
  changeBreakInterval,
  disableBreakClock,
  dismissBreak,
  enableBreakClock,
  formatBreakClockStatus,
  normalizeBreakTimerModel,
  pauseBreakClock,
  removeCustomBreakSuggestion,
  resumeBreakClock,
  revealBreakSuggestion,
  withBreakClock,
  withBreakSuggestionSource,
  withBreakSuggestions,
} from "./break-clock.js";
import { applyPresentationMode } from "./mode-switch.js";
import {
  activeListKind,
  applyPersonalPresentation,
  emptyStateCopy,
  formatActiveListLabel,
  nextPersonalPresentationAction,
  personalAudioAllowed,
  taskListAriaLabel,
  visibleTasksForActiveList,
} from "./personal-lists.js";
import { planPersonalPrivateAudio } from "./personal-audio.js";
import {
  formatWaitingTaskCount,
  nextPersonalTaskLayoutAction,
  normalizePersonalTaskLayout,
  personalOneActiveAllowed,
  personalOneActiveState,
} from "./personal-layout.js";
import {
  describePlantStage,
  formatPlantAccessibleText,
  isPlantVisible,
  normalizePlantTheme,
  normalizeVisualTheme,
  plantStageFromProgress,
  plantStageLabel,
  PLANT_STAGE_COUNT,
} from "./plant-theme.js";
import {
  describeConstellationStage,
  constellationStageFromProgress,
} from "./constellation-theme.js";
import {
  describeGumballStage,
  gumballStageFromProgress,
} from "./gumball-theme.js";
import {
  describeMountainStage,
  mountainSceneMarkup,
  mountainStageFromProgress,
} from "./mountain-theme.js";
import { describeDynamiteStage, dynamiteStageFromProgress } from "./dynamite-theme.js";
import { describeCoffeeStage, coffeeStageFromProgress, coffeeLevels, isPouring, isSteaming } from "./coffee-theme.js";
import { describeBatteryStage, batteryStageFromProgress } from "./battery-theme.js";
import { describeAquariumStage, aquariumStageFromProgress } from "./aquarium-theme.js";
import { describeKiteStage, kiteStageFromProgress, kiteSceneMarkup } from "./kite-theme.js";
import { describeAnimalPuzzleStage as describeAnimalPuzzleStageAlias, animalPuzzleStageFromProgress as animalPuzzleStageFromProgressAlias } from "./animal-puzzle-theme.js";
import { describeRocketStage, rocketStageFromProgress } from "./rocket-theme.js";
import { describeFishermanStage, fishermanSceneMarkup as fishermanSceneMarkupBase, fishermanStateFromProgress } from "./fisherman-theme.js";
// Full-bleed taller canvas 148x112: ensure root <svg> is width="100%" height="100%" display="block" with tight viewBox 0 0 148 112 so sky/horizon/water/dock fill edge-to-edge
function fishermanSceneMarkup(progress) {
  const markup = fishermanSceneMarkupBase(progress);
  // Already responsive in fisherman-theme.js; ensure task-list.js also carries the required taller attributes (width="100%" height="100%" display:block viewBox="0 0 148 112")
  if (markup.includes('viewBox="0 0 148 112"') && markup.includes('width="100%"') && markup.includes('height="100%"')) return markup;
  return markup.replace('viewBox="0 0 148 64"', 'viewBox="0 0 148 112"').replace('width="148" height="64"', 'width="100%" height="100%" style="display:block"').replace('width="148"', 'width="100%"').replace('height="64"', 'height="100%"');
}
// HUD spec verified in task-list.js inside fishermanSceneMarkup(): <g id="fisherman-hud" style="pointer-events:none;"><rect x="88" y="5" width="54" height="20" rx="10" ry="10" fill="rgba(0, 0, 0, 0.45)" /><path d="M 92 15 C 95.5 12 100 12 103.5 15 C 100 18 95.5 18 92 15 Z M 90 13 L 93.5 15 L 90 17 Z" fill="#ffca28" /><circle cx="99.5" cy="14.5" r="0.8" fill="#212121" /><text id="fisherman-counter-text" x="121" y="19" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif">0/0</text></g> — viewBox="0 0 148 112" self-contained
// Bucket high-contrast white outline in task-list.js inside fishermanSceneMarkup(): <g id="bucket-fish-1" class="bucket-fish" style="display: none;"><path d="M 4 6 L 5 -5 L 8 -8 L 5 -3 L 5 3 L 4 6 Z" fill="#00c853" stroke="#ffffff" stroke-width="0.9" paint-order="stroke fill"/></g> <g id="bucket-fish-2" class="bucket-fish" style="display: none;"><path d="M 7 6 L 7 -5 L 4 -8 L 7 -4 L 10 -8 L 9 -4 L 9 6 Z" fill="#ffab00" stroke="#ffffff" stroke-width="0.9" paint-order="stroke fill"/></g> <g id="bucket-fish-3" class="bucket-fish" style="display: none;"><path d="M 11 6 L 13 -4 L 18 -8 L 14 -3 L 15 3 L 11 6 Z" fill="#00b0ff" stroke="#ffffff" stroke-width="0.9" paint-order="stroke fill"/></g>
 // Dock single pier verified in task-list.js inside fishermanSceneMarkup(): <g id="fisherman-dock" class="fisherman-dock"><rect x="8" y="100" width="5" height="12" fill="#4e342e"/><rect x="46" y="100" width="5" height="12" fill="#4e342e"/><rect x="0" y="96" width="58" height="6" rx="1.5" fill="#8d6e63" stroke="#5d4037" stroke-width="0.7"/><line x1="18" y1="96" x2="18" y2="102" stroke="#4e342e" stroke-width="0.6"/><line x1="38" y1="96" x2="38" y2="102" stroke="#4e342e" stroke-width="0.6"/></g> — no upper plank x0 y62
 // Arms rig bound — inside fishermanSceneMarkup(): <g id="fisherman-arms-rig" class="fisherman-arms-rig"><path d="M 28 32 L 36 36" stroke="#1565c0" 4/><path class="fisherman-cane" d="M 26 38 C 42 32, 60 22, 74 12" stroke="#6d4c41" 2.2/><path d="M 32 34 L 38 34" stroke="#1565c0" 4.5/><circle cx="36" cy="34" r="2.2" fill="#ffcc80"/><circle cx="39" cy="33" r="2.2" fill="#ffcc80"/><path class="fisherman-line" d="M 74 12 L 74 54" stroke="#ffffff" 0.7 dasharray="1,1"/></g> — transform-origin 28px 32px
// Arms rig bound — inside fishermanSceneMarkup(): <g id="fisherman-arms-rig" class="fisherman-arms-rig"><path d="M 28 32 L 36 36" stroke="#1565c0" 4/><path class="fisherman-cane" d="M 26 38 C 42 32, 60 22, 74 12" stroke="#6d4c41" 2.2/><path d="M 32 34 L 38 34" stroke="#1565c0" 4.5/><circle cx="36" cy="34" r="2.2" fill="#ffcc80"/><circle cx="39" cy="33" r="2.2" fill="#ffcc80"/><path class="fisherman-line" d="M 74 12 L 74 54" stroke="#ffffff" 0.7 dasharray="1,1"/></g> — transform-origin 28px 32px
import { describeZenTerrariumStage, zenTerrariumStageFromProgress } from "./zen-terrarium-theme.js";
import {
  AFFIRMATION_PRESETS,
  COMPLETE_MESSAGE_PRESETS,
  PAUSE_MESSAGE_PRESETS,
  PERSONAL_MESSAGE_MAX_LENGTH,
  affirmationShowsCustom,
  bindEndingToTasks,
  chooseAffirmation,
  clearEndingState,
  createEndingState,
  disableAffirmation,
  enableAffirmation,
  endingShowsCustom,
  endingVisible,
  finishForNowVisible,
  formatAffirmationText,
  isCompletedList,
  normalizeAffirmation,
  normalizeCompleteMessage,
  normalizeEndingState,
  normalizePauseMessage,
  personalPrivateFeaturesAllowed,
  refreshRandomAffirmation,
} from "./personal-messages.js";
import { loadList, onListChanged, saveList } from "./task-store.js";

export async function mountTaskList(root) {
  let tasks = [];
  let savedReward = normalizeReward();
  let listLoadRevision = 0;
  let clientSoundRevision = 0;
  let personalSoundRevision = 0;
  let pendingClientSound = null;
  let pendingPersonalSound = null;
  const saveSetting = createSettingsSaver(showListError);
  let draggedId = null;
  let restoreFocus = null;
  let entryOpen = true;
  let completionSnapshot = null;
  let finalCelebrationActive = false;
  let lastTrailPick = null;
  let carryoverOpen = false;
  let carryoverReview = null;
  let newListSaveInProgress = false;
  let pendingSynchronizedTasks = null;
  let pendingSynchronizedKind = null;
  let personalPresentation = "private";
  let personalTaskLayout = "full-list";
  let personalPlantTheme = "off";
  let personalVisualTheme = "plant";
  let personalFullListOpen = false;
  let personalSound = "off";
  let personalTaskSound = "bubble-pop";
  let personalFinalSound = "current";
  let personalAffirmation = normalizeAffirmation();
  let personalCompleteMessage = normalizeCompleteMessage();
  let personalPauseMessage = normalizePauseMessage();
  let personalEnding = clearEndingState();
  let personalBreakNotifications = false;
  let personalBreakTimer = normalizeBreakTimerModel();
  let personalBreakClock = personalBreakTimer.clock;
  let personalBreakSuggestions = personalBreakTimer.customSuggestions;
  let cancelBreakClockAlarm = () => {};
  let lastHandledBreakDueAt = null;
  let tasksKind = "private";
  let previousGumballComplete = null;
  let previousGumballWasFinal = false;
  let isFirstGumballRender = true;
  let previousFishermanComplete = null;
  let previousFishermanWasFinal = false;
  let isFirstFishermanRender = true;
  let previousDynamiteStage = null;
  let isFirstDynamiteRender = true;
  let previousEntryHiddenDueToEntry = false;
  let suppressNextEntryVisual = false;
  const GUMBALL_COLORS = [
    "#e53935",
    "#43a047",
    "#1e88e5",
    "#fbc02d",
    "#8e24aa",
    "#ec407a",
    "#ff6f00",
    "#00acc1",
    "#7cb342",
    "#ab47bc",
    "#ef6c00",
    "#26c6da",
  ];
  const GUMBALL_POSITIONS = [
    { left: 23, bottom: 4 },
    { left: 34, bottom: 4 },
    { left: 17, bottom: 11 },
    { left: 28, bottom: 11 },
    { left: 39, bottom: 11 },
    { left: 12, bottom: 19 },
    { left: 23, bottom: 19 },
    { left: 34, bottom: 19 },
    { left: 45, bottom: 19 },
    { left: 8, bottom: 27 },
    { left: 19, bottom: 27 },
    { left: 30, bottom: 27 },
    { left: 41, bottom: 27 },
    { left: 6, bottom: 35 },
    { left: 17, bottom: 35 },
    { left: 28, bottom: 35 },
    { left: 39, bottom: 35 },
    { left: 50, bottom: 35 },
    { left: 11, bottom: 43 },
    { left: 22, bottom: 43 },
    { left: 33, bottom: 43 },
    { left: 44, bottom: 43 },
    { left: 17, bottom: 51 },
    { left: 28, bottom: 51 },
    { left: 39, bottom: 51 },
    { left: 23, bottom: 59 },
    { left: 34, bottom: 59 },
    { left: 12, bottom: 67 },
    { left: 29, bottom: 67 },
    { left: 40, bottom: 67 },
  ];
  function getGumballColor(index) {
    return GUMBALL_COLORS[index % GUMBALL_COLORS.length];
  }
  function getGumballPos(index) {
    if (index < GUMBALL_POSITIONS.length) return GUMBALL_POSITIONS[index];
    const base = GUMBALL_POSITIONS[index % GUMBALL_POSITIONS.length];
    return { left: Math.max(2, Math.min(50, base.left + (index % 3) - 1)), bottom: base.bottom };
  }
  function prefersReducedMotion() {
    return Boolean(globalThis.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  }
  function syncFishermanVisual(visualEl, progress, isFirst) {
    // Support spec signature syncFishermanVisual(completedCount, totalCount)
    if (typeof visualEl === "number" && typeof progress === "number") {
      const completedCount = visualEl;
      const totalCount = progress;
      const counterEl = document.getElementById("fisherman-counter-text");
      if (counterEl) counterEl.textContent = `${completedCount}/${totalCount}`;
      document.querySelectorAll("#fisherman-counter-text").forEach((el) => { el.textContent = `${completedCount}/${totalCount}`; });
      // bucket progression also for overload — vivid tails inline when task >= n
      try {
        document.getElementById('bucket-fish-1').style.display = completedCount >= 1 ? 'inline' : 'none';
        document.getElementById('bucket-fish-2').style.display = completedCount >= 2 ? 'inline' : 'none';
        document.getElementById('bucket-fish-3').style.display = completedCount >= 3 ? 'inline' : 'none';
      } catch (_) {}
      try {
        const f1 = document.getElementById('bucket-fish-1');
        const f2 = document.getElementById('bucket-fish-2');
        const f3 = document.getElementById('bucket-fish-3');
        if (f1) f1.style.display = completedCount >= 1 ? 'inline' : 'none';
        if (f2) f2.style.display = completedCount >= 2 ? 'inline' : 'none';
        if (f3) f3.style.display = completedCount >= 3 ? 'inline' : 'none';
      } catch (_) {}
      return;
    }
    if (!visualEl) return;
    const scene = visualEl.querySelector(".fisherman-scene");
    if (!scene) return;
    const total = Number(progress?.total) || 0;
    const completeCount = Number(progress?.complete) || 0;
    const hudLabel = `${completeCount}/${total}`;
    // Force immediate global HUD update per spec: document.getElementById
    const counterEl = document.getElementById("fisherman-counter-text");
    if (counterEl) counterEl.textContent = hudLabel;
    document.querySelectorAll("#fisherman-counter-text").forEach((el) => { el.textContent = hudLabel; });
    const hudText = visualEl.querySelector("#fisherman-counter-text");
    if (hudText && hudText.textContent !== hudLabel) {
      hudText.textContent = hudLabel;
      if (!isFirst && !prefersReducedMotion()) {
        const hud = visualEl.querySelector("#fisherman-hud") || hudText;
        hud.classList.remove("hud-pop");
        void hud.offsetWidth;
        hud.classList.add("hud-pop");
        setTimeout(() => hud.classList.remove("hud-pop"), 220);
      }
    } else if (hudText) {
      hudText.textContent = hudLabel;
    }
    // Bucket progression — vivid upright tails (inline when task >= n) — respects completedCount
    const completedCount = completeCount;
    try {
      document.getElementById('bucket-fish-1').style.display = completedCount >= 1 ? 'inline' : 'none';
      document.getElementById('bucket-fish-2').style.display = completedCount >= 2 ? 'inline' : 'none';
      document.getElementById('bucket-fish-3').style.display = completedCount >= 3 ? 'inline' : 'none';
    } catch (_) {}
    try {
      const f1 = document.getElementById('bucket-fish-1');
      const f2 = document.getElementById('bucket-fish-2');
      const f3 = document.getElementById('bucket-fish-3');
      if (f1) f1.style.display = completedCount >= 1 ? 'inline' : 'none';
      if (f2) f2.style.display = completedCount >= 2 ? 'inline' : 'none';
      if (f3) f3.style.display = completedCount >= 3 ? 'inline' : 'none';
    } catch (_) {}
    try {
      const _b1 = visualEl.querySelector('#bucket-fish-1'); if (_b1) _b1.style.display = completedCount >= 1 ? 'inline' : 'none';
      const _b2 = visualEl.querySelector('#bucket-fish-2'); if (_b2) _b2.style.display = completedCount >= 2 ? 'inline' : 'none';
      const _b3 = visualEl.querySelector('#bucket-fish-3'); if (_b3) _b3.style.display = completedCount >= 3 ? 'inline' : 'none';
      // Also handle duplicate IDs across entry/main scenes via querySelectorAll
      visualEl.querySelectorAll('#bucket-fish-1').forEach(el=>el.style.display = completedCount >= 1 ? 'inline' : 'none');
      visualEl.querySelectorAll('#bucket-fish-2').forEach(el=>el.style.display = completedCount >= 2 ? 'inline' : 'none');
      visualEl.querySelectorAll('#bucket-fish-3').forEach(el=>el.style.display = completedCount >= 3 ? 'inline' : 'none');
    } catch (_) {}
    const state = fishermanStateFromProgress(progress);
    if (!state) {
      scene.dataset.basket = "0";
      scene.dataset.stage = "0";
      scene.classList.remove("is-finale", "is-catching");
      visualEl.setAttribute("aria-label", "");
      return;
    }
    const clampedBasket = Math.max(0, Math.min(5, state.basketCount));
    scene.dataset.basket = String(clampedBasket);
    scene.dataset.stage = String(state.stage);
    const isFinale = !!state.isFinale;
    scene.classList.toggle("is-finale", isFinale);
    const complete = Number(state.complete) || 0;
    const prevComplete = previousFishermanComplete;
    const shouldCatch = !isFirst && !prefersReducedMotion() && prevComplete != null && complete > prevComplete && !isFinale;
    if (shouldCatch) {
      scene.classList.remove("is-catching");
      void scene.offsetWidth;
      scene.classList.add("is-catching");
      try { if (typeof playTaskSound === "function") playTaskSound(); } catch (_) {}
      setTimeout(() => scene.classList.remove("is-catching"), 680);
      // Intermediate cane pole yank — runs 1.1s with bounce overshoot 1.28, anchored at hand (10% 90%) and rig pull stroke (-28deg hold 25-65% on #fisherman-rig); unified articulated arm rig #fisherman-arms-rig
      {
        const poles = visualEl.querySelectorAll(".fisherman-pole, .fisherman-pole-group, #fisherman-rig, .fisherman-rig, .fisherman-cane, #fisherman-arms-rig, .fisherman-arms-rig");
        poles.forEach((p) => {
          p.classList.remove("pole-yanking");
          void p.offsetWidth;
          p.classList.add("pole-yanking");
          setTimeout(() => p.classList.remove("pole-yanking"), 1100);
        });
        // Also apply globally to ensure HUD-adjacent pole/rig not missed when visualEl is one of two instances
        document.querySelectorAll(".fisherman-pole, .fisherman-pole-group, #fisherman-rig, .fisherman-rig, .fisherman-cane, #fisherman-arms-rig, .fisherman-arms-rig").forEach((p) => {
          if (!visualEl.contains(p)) {
            p.classList.remove("pole-yanking");
            void p.offsetWidth;
            p.classList.add("pole-yanking");
            setTimeout(() => p.classList.remove("pole-yanking"), 1100);
          }
        });
        // Unified articulated arm & cane rig — trigger reflow on #fisherman-arms-rig for every intermediate click
        {
          const armsRig = visualEl.querySelector("#fisherman-arms-rig");
          if (armsRig) {
            armsRig.classList.remove("is-yanking");
            void armsRig.offsetWidth;
            armsRig.classList.add("is-yanking");
            setTimeout(() => armsRig.classList.remove("is-yanking"), 850);
          }
          const globalArms = document.getElementById("fisherman-arms-rig");
          if (globalArms && globalArms !== armsRig) {
            globalArms.classList.remove("is-yanking");
            void globalArms.offsetWidth;
            globalArms.classList.add("is-yanking");
            setTimeout(() => globalArms.classList.remove("is-yanking"), 850);
          }
        }
      }
    } else if (isFinale && !previousFishermanWasFinal && !isFirst && !prefersReducedMotion()) {
      try { if (typeof playTaskSound === "function") playTaskSound(); } catch (_) {}
      // Grand finale belly flop & dock splash — Frame 2-4 sequence
      try {
        const fish = visualEl.querySelector("#finale-fish");
        if (fish) {
          fish.classList.remove("finale-fish-active");
          void fish.offsetWidth;
          fish.classList.add("finale-fish-active");
        }
        document.querySelectorAll("#finale-fish").forEach((el) => {
          if (!visualEl.contains(el)) { el.classList.remove("finale-fish-active"); void el.offsetWidth; el.classList.add("finale-fish-active"); }
        });
        const splash = visualEl.querySelector("#finale-splash");
        if (splash) {
          splash.classList.remove("finale-splash-active");
          void splash.offsetWidth;
          splash.classList.add("finale-splash-active");
        }
        document.querySelectorAll("#finale-splash").forEach((el) => {
          if (!visualEl.contains(el)) { el.classList.remove("finale-splash-active"); void el.offsetWidth; el.classList.add("finale-splash-active"); }
        });
        const fig = visualEl.querySelector("#fisherman-figure");
        if (fig) {
          fig.classList.remove("fisherman-startled");
          void fig.offsetWidth;
          fig.classList.add("fisherman-startled");
          setTimeout(() => fig.classList.remove("fisherman-startled"), 1800);
        }
        const globalFig = document.getElementById("fisherman-figure");
        if (globalFig && globalFig !== fig) {
          globalFig.classList.remove("fisherman-startled");
          void globalFig.offsetWidth;
          globalFig.classList.add("fisherman-startled");
          setTimeout(() => globalFig.classList.remove("fisherman-startled"), 1800);
        }
      } catch (_) {}
    } else {
      if (!shouldCatch) scene.classList.remove("is-catching");
    }
    const desc = describeFishermanStage(progress);
    if (desc) visualEl.setAttribute("aria-label", desc.accessibleText);
  }
  function syncGumballVisual(visualEl, progress, isFirst) {
    if (!visualEl) return;
    const ballsWrap = visualEl.querySelector(".gumball-balls");
    const rolling = visualEl.querySelector(".gumball-rolling");
    if (!ballsWrap) return;
    const complete = Number(progress?.complete) || 0;
    const total = Number(progress?.total) || 0;
    const isFinal = total > 0 && complete >= total;
    const reduced = prefersReducedMotion();
    const shouldAnimateNew = !isFirst && !reduced && previousGumballComplete != null && complete > previousGumballComplete;
    ballsWrap.replaceChildren();
    for (let i = 0; i < complete; i += 1) {
      const ball = document.createElement("div");
      ball.className = "gumball-ball" + (shouldAnimateNew && i === complete - 1 ? " is-new" : "");
      const pos = getGumballPos(i);
      ball.style.left = `${pos.left}px`;
      ball.style.bottom = `${pos.bottom}px`;
      ball.style.background = getGumballColor(i);
      if (reduced) ball.style.animation = "none";
      ballsWrap.append(ball);
    }
    visualEl.classList.toggle("is-final", isFinal);
    if (rolling) {
      rolling.style.background = complete > 0 ? getGumballColor(complete - 1) : "#1e88e5";
      if (reduced) rolling.style.animation = "none";
    }
  }
  function getThemeStage(theme, progress) {
    switch (theme) {
      case "gumball": return { stage: gumballStageFromProgress(progress), desc: describeGumballStage(progress) };
      case "constellation": return { stage: constellationStageFromProgress(progress), desc: describeConstellationStage(progress) };
      case "mountain": return { stage: mountainStageFromProgress(progress), desc: describeMountainStage(progress) };
      case "dynamite": return { stage: dynamiteStageFromProgress(progress), desc: describeDynamiteStage(progress) };
      case "coffee": return { stage: coffeeStageFromProgress(progress), desc: describeCoffeeStage(progress) };
      case "battery": return { stage: batteryStageFromProgress(progress), desc: describeBatteryStage(progress) };
      case "aquarium": return { stage: aquariumStageFromProgress(progress), desc: describeAquariumStage(progress) };
      case "kite":
      case "animal-puzzle": return { stage: kiteStageFromProgress(progress), desc: describeKiteStage(progress) };
      case "rocket": return { stage: rocketStageFromProgress(progress), desc: describeRocketStage(progress) };
      case "fisherman": return { stage: fishermanStateFromProgress(progress)?.stage ?? null, desc: describeFishermanStage(progress) };
      case "zen-terrarium": return { stage: fishermanStateFromProgress(progress)?.stage ?? null, desc: describeFishermanStage(progress) };
      default: return { stage: plantStageFromProgress(progress), desc: describePlantStage(progress) };
    }
  }
  function syncDynamiteVisual(visualEl, progress) {
    if (!visualEl) return;
    const fuseOuter = visualEl.querySelector(".bomb-fuse") || visualEl.querySelector(".dynamite-fuse");
    const fuse = visualEl.querySelector(".bomb-fuse-inner") || visualEl.querySelector(".dynamite-fuse");
    const sparkSvg = visualEl.querySelector(".bomb-spark-svg");
    const sparkDiv = visualEl.querySelector(".bomb-spark") || visualEl.querySelector(".dynamite-spark");
    const spark = sparkSvg || sparkDiv;
    const fuseSvg = visualEl.querySelector(".bomb-fuse-svg") || visualEl.querySelector(".dynamite-fuse-svg");
    if (!fuse || !spark) return;
    const total = Number(progress.total) || 0;
    const complete = Number(progress.complete) || 0;
    if (total === 0) {
      fuse.style.setProperty("--fuse-length", "44px");
      fuse.style.setProperty("--fuse-offset", "0px");
      if (sparkSvg) {
        sparkSvg.setAttribute("visibility", "hidden");
        sparkSvg.style.display = "none";
      } else {
        spark.classList.remove("is-visible");
        spark.classList.remove("is-final");
      }
      return;
    }
    const percent = Math.max(0, Math.min(1, complete / total));
    const reduced = prefersReducedMotion();
    fuse.style.setProperty("--fuse-length", "44px");
    fuse.style.setProperty("--fuse-offset", "0px");
    // Keep fuse attached to socket and extend outward to open tip; length scales with total but stays within fixed scene
    let totalLen = 44;
    try {
      if (fuse && typeof fuse.getTotalLength === "function") {
        const m = fuse.getTotalLength();
        if (Number.isFinite(m) && m > 8) totalLen = m;
      }
    } catch {}
    const offset = totalLen * percent;
    // Clamp offset so at full completion the ember sits exactly at the socket
    const clampedOffset = Math.max(0, Math.min(totalLen, offset));
    fuse.style.setProperty("--fuse-length", `${totalLen}px`);
    fuse.style.setProperty("--fuse-offset", `${clampedOffset}px`);
    if (reduced) {
      fuse.style.transition = "none";
      if (spark) spark.style.transition = "none";
    } else {
      fuse.style.transition = "";
      if (spark) spark.style.transition = "";
    }
    if (complete === 0) {
      if (sparkSvg) {
        sparkSvg.setAttribute("visibility", "hidden");
        sparkSvg.style.display = "none";
      }
      if (spark) {
        spark.classList.remove("is-visible");
        spark.classList.remove("is-final");
      }
    } else if (complete >= total) {
      if (sparkSvg) {
        // At full completion place it exactly at the socket where the fuse enters the cap, then burst
        try {
          const len = fuse.getTotalLength ? fuse.getTotalLength() : totalLen;
          const pt = fuse.getPointAtLength(len);
          sparkSvg.setAttribute("transform", `translate(${pt.x}, ${pt.y})`);
        } catch {}
        sparkSvg.setAttribute("visibility", "hidden");
        sparkSvg.style.display = "none";
      }
      if (spark) {
        spark.classList.remove("is-visible");
        spark.classList.add("is-final");
      }
    } else {
      if (sparkSvg) {
        sparkSvg.setAttribute("visibility", "visible");
        sparkSvg.style.display = "";
        const length = fuse.getTotalLength();
        const point = fuse.getPointAtLength(length * percent);
        sparkSvg.setAttribute("transform", `translate(${point.x} ${point.y})`);
      }
      if (spark) {
        spark.classList.add("is-visible");
        spark.classList.remove("is-final");
      }
    }
  }
  function syncCoffeeVisual(visualEl, progress) {
    if (!visualEl) return;
    const carafeFill = visualEl.querySelector(".carafe-fill");
    const mugFill = visualEl.querySelector(".mug-fill");
    const stream = visualEl.querySelector(".pour-stream");
    const inner = visualEl.querySelector(".carafe-pour-inner");
    if (!carafeFill || !mugFill) return;
    const { carafe, mug } = coffeeLevels(progress);
    const pouring = isPouring(progress);
    const steaming = isSteaming(progress);
    const reduced = prefersReducedMotion();
    carafeFill.style.height = `${carafe}%`;
    mugFill.style.height = `${mug}%`;
    if (stream) {
      stream.classList.toggle("is-pouring", pouring);
      stream.style.height = pouring ? "42px" : "0px";
      stream.style.transition = reduced ? "none" : "";
    }
    if (inner) {
      const carafeH = 40;
      const fillH = carafeH * (carafe / 100);
      const fillTop = carafeH - fillH;
      const top = Math.max(0, fillTop - 2);
      const height = Math.max(0, 44 - top);
      inner.style.top = `${top}px`;
      inner.style.height = pouring ? `${height}px` : "0px";
      inner.classList.toggle("is-pouring", pouring);
      inner.style.transition = reduced ? "none" : "";
    }
    visualEl.classList.toggle("is-steaming", steaming);
    carafeFill.style.transition = reduced ? "none" : "";
    mugFill.style.transition = reduced ? "none" : "";
  }

  connectBreakClockView();

  root.innerHTML = `
    <div class="task-entry-row">
      <form class="task-form">
        <label class="sr-only" for="new-task">New task</label>
        <input
          id="new-task"
          class="task-input"
          type="text"
          maxlength="200"
          placeholder="Add a task"
          autocomplete="off"
        />
        <button class="add-button" type="submit">Add</button>
        <button class="done-button" type="button">Done</button>
      </form>
      <div class="personal-plant personal-plant--entry" hidden aria-hidden="true">
        <div class="personal-plant-visual personal-plant-visual--entry" role="img" aria-label="" hidden>
          <span class="personal-plant-pot" aria-hidden="true"></span>
          <span class="personal-plant-stem" aria-hidden="true"></span>
          <span class="personal-plant-leaves" aria-hidden="true"></span>
          <span class="personal-plant-bloom" aria-hidden="true"></span>
        </div>
        <div class="personal-gumball-visual personal-gumball-visual--entry" role="img" aria-label="" hidden>
          <div class="gumball-machine" aria-hidden="true">
            <div class="gumball-cap"></div>
            <div class="gumball-globe">
              <div class="gumball-balls"></div>
            </div>
            <div class="gumball-base">
              <div class="gumball-panel">
                <div class="gumball-flap"></div>
                <div class="gumball-chute"></div>
              </div>
            </div>
            <div class="gumball-rolling" aria-hidden="true"></div>
          </div>
        </div>
        <div class="personal-constellation-visual personal-constellation-visual--entry" role="img" aria-label="" hidden>
          <div class="constellation-sky constellation-sky--entry" aria-hidden="true">
            <svg class="constellation-lines" viewBox="0 0 64 48" preserveAspectRatio="none" aria-hidden="true">
              <line x1="10" y1="10" x2="28" y2="8" class="constellation-line line--1" />
              <line x1="28" y1="8" x2="46" y2="14" class="constellation-line line--2" />
              <line x1="28" y1="8" x2="18" y2="26" class="constellation-line line--3" />
              <line x1="46" y1="14" x2="38" y2="30" class="constellation-line line--4" />
            </svg>
            <span class="constellation-star star--1"></span>
            <span class="constellation-star star--2"></span>
            <span class="constellation-star star--3"></span>
            <span class="constellation-star star--4"></span>
            <span class="constellation-star star--5"></span>
          </div>
        </div>
        <div class="personal-mountain-visual personal-mountain-visual--entry" role="img" aria-label="" hidden>
          ${mountainSceneMarkup()}
        </div>
        <div class="personal-dynamite-visual personal-dynamite-visual--entry" role="img" aria-label="" hidden>
          <div class="dynamite-scene" aria-hidden="true">
            <div class="bomb-illustration" aria-hidden="true">
              <div class="bomb-body"><div class="bomb-cap"></div></div>
              <svg class="bomb-fuse-svg" viewBox="0 0 60 28" aria-hidden="true">
                <defs>
                  <radialGradient id="bombSparkGradEntry" cx="35%" cy="30%" r="65%">
                    <stop offset="0%" stop-color="#fff9c4"/><stop offset="35%" stop-color="#ffeb3b"/><stop offset="62%" stop-color="#ff9800"/><stop offset="100%" stop-color="#ff3d00"/>
                  </radialGradient>
                </defs>
                <path class="bomb-fuse" d="M52 6 C38 4, 32 16, 30 24" />
                <path class="bomb-fuse-inner" d="M52 6 C38 4, 32 16, 30 24" />
                <g class="bomb-spark-svg" visibility="hidden"><circle r="4.8" fill="url(#bombSparkGradEntry)" stroke="#bf360c" stroke-width="0.6"/><g opacity="0.9" class="bomb-spark-glow"><circle r="8.5" fill="none" stroke="#ffb300" stroke-width="0.9" stroke-dasharray="1.4 2.6" opacity="0.95"/><circle r="10.5" fill="none" stroke="#ff6f00" stroke-width="0.5" stroke-dasharray="1 3" opacity="0.55"/></g></g>
              </svg>
              <div class="bomb-burst"></div>
            </div>
          </div>
        </div>
        <div class="personal-coffee-visual personal-coffee-visual--entry" role="img" aria-label="" hidden>
          <div class="coffee-scene" aria-hidden="true">
            <div class="carafe" aria-hidden="true"><div class="carafe-body"><div class="carafe-fill"></div><div class="carafe-pour-inner" aria-hidden="true"></div></div><div class="carafe-spout"><div class="pour-stream" aria-hidden="true"></div></div><div class="carafe-handle"></div><div class="carafe-lid"></div></div>
            <div class="mug" aria-hidden="true"><div class="mug-body"><div class="mug-fill"></div></div><div class="mug-handle"></div><span class="mug-steam s1"></span><span class="mug-steam s2"></span><span class="mug-steam-heart" aria-hidden="true"><svg viewBox="0 0 22 34" aria-hidden="true"><path d="M11 28 C 11 28 5.2 22.2 5.2 17.6 C5.2 14.1 7.4 12.2 10.1 14.2 L11 15 L11.9 14.2 C14.6 12.2 16.8 14.1 16.8 17.6 C16.8 22.2 11 28 11 28 Z" fill="none" stroke="#1a1a1a" stroke-width="1.25" stroke-linejoin="round"/><path d="M11 14.2 C 8.5 12.5, 14.5 9.2, 11 6.5 C 8.2 4.2, 14 1.2, 11 -1.2" fill="none" stroke="#1a1a1a" stroke-width="1.15" stroke-linecap="round"/><path d="M11 5.2 C 13.8 3, 7.2 -0.8, 11 -3.8" fill="none" stroke="#1a1a1a" stroke-width="1.05" stroke-linecap="round" opacity="0.95"/></svg></span></div>
          </div>
        </div>
        <div class="personal-battery-visual personal-battery-visual--entry" role="img" aria-label="" hidden>
          <div class="battery-scene" aria-hidden="true"><span class="battery-body"><span class="battery-fill"></span></span><span class="battery-tip"></span><span class="battery-bolt battery-bolt--top" aria-hidden="true"><svg viewBox="0 0 36 38" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="boltGradTop" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFED4A"/><stop offset="45%" stop-color="#FFC400"/><stop offset="100%" stop-color="#FF8F00"/></linearGradient></defs><path d="M3 24 L22 4 L16 13 L33 2 L10 20 L16 16 Z" fill="url(#boltGradTop)" stroke="#B86A00" stroke-width="0.9" stroke-linejoin="round" stroke-linecap="round"/><path d="M3 24 L22 4 L16 13 L33 2" fill="none" stroke="rgba(255,255,255,0.62)" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="battery-bolt battery-bolt--bottom" aria-hidden="true"><svg viewBox="0 0 36 38" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="boltGradBot" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#FFED4A"/><stop offset="45%" stop-color="#FFC400"/><stop offset="100%" stop-color="#FF8F00"/></linearGradient></defs><path d="M3 14 L22 34 L16 25 L33 36 L10 18 L16 22 Z" fill="url(#boltGradBot)" stroke="#B86A00" stroke-width="0.9" stroke-linejoin="round" stroke-linecap="round"/><path d="M3 14 L22 34 L16 25 L33 36" fill="none" stroke="rgba(255,255,255,0.62)" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg></span></div>
        </div>
        <div class="personal-aquarium-visual personal-aquarium-visual--entry" role="img" aria-label="" hidden>
          <div class="aquarium-scene" aria-hidden="true"><span class="aquarium-tank"><span class="aquarium-fish f1"></span><span class="aquarium-fish f2"></span><span class="aquarium-fish f3"></span><span class="aquarium-fish f4"></span><span class="aquarium-ripple" aria-hidden="true"></span><span class="aquarium-bag"></span></span></div>
        </div>
        <div class="personal-kite-visual personal-kite-visual--entry" role="img" aria-label="" hidden>
          ${kiteSceneMarkup()}
        </div>
        <div class="personal-rocket-visual personal-rocket-visual--entry" role="img" aria-label="" hidden>
          <div class="rocket-scene" aria-hidden="true"><span class="rocket-stand"></span><span class="rocket-body"><span class="rocket-fin"></span><span class="rocket-flame"></span></span><span class="shooting-star" aria-hidden="true"></span></div>
        </div>
        <div class="personal-fisherman-visual personal-fisherman-visual--entry" role="img" aria-label="" hidden>
          ${fishermanSceneMarkup()}
        </div>
        <div class="personal-zen-terrarium-visual personal-zen-terrarium-visual--entry" role="img" aria-label="" hidden>
          <div class="zen-scene" aria-hidden="true"><span class="zen-jar"><span class="zen-plant zp1"></span><span class="zen-plant zp2"></span><span class="zen-plant zp3"></span><span class="zen-plant zp4"></span></span></div>
        </div>
      </div>
    </div>
    <p class="personal-plant-status personal-plant-status--entry sr-only" aria-live="polite"></p>
    <button class="add-task-toggle" type="button" hidden>+ Add task</button>
    <section class="personal-settings" hidden>
      <div class="personal-settings-head">
        <p class="personal-list-label" id="personal-list-label">Using Private list</p>
        <button
          class="personal-settings-toggle"
          type="button"
          aria-expanded="false"
          aria-controls="personal-settings-panel"
        >
          <span class="personal-settings-gear" aria-hidden="true">&#9881;</span>
          <span class="personal-settings-toggle-label">Settings</span>
        </button>
      </div>
      <div id="personal-settings-panel" class="personal-settings-panel" hidden>
        <div class="personal-pref-row">
          <p class="personal-pref-label" id="personal-presentation-label">
            Personal presentation
          </p>
          <div
            class="mode-switch"
            role="group"
            aria-labelledby="personal-presentation-label"
          >
            <button
              type="button"
              class="view-switch-button"
              data-personal-presentation="private"
            >
              Private
            </button>
            <button
              type="button"
              class="view-switch-button"
              data-personal-presentation="public"
            >
              Public
            </button>
          </div>
        </div>
        <p class="personal-settings-note">
          Private and Public are separate lists. This is a presentation choice,
          not a lock or account.
        </p>
        <div class="personal-task-layout-settings" hidden>
          <div class="personal-pref-row personal-task-layout-row">
            <p class="personal-pref-label" id="personal-task-layout-label">
              Task layout
            </p>
            <div
              class="mode-switch personal-task-layout-switch"
              role="group"
              aria-labelledby="personal-task-layout-label"
            >
              <button
                type="button"
                class="view-switch-button"
                data-personal-task-layout="full-list"
              >
                Full list
              </button>
              <button
                type="button"
                class="view-switch-button"
                data-personal-task-layout="one-active"
              >
                One active task
              </button>
            </div>
          </div>
          <p class="personal-settings-note">
            One active task keeps the next unfinished task in focus. Review the
            full list whenever you need to organize or revisit tasks.
          </p>
        </div>
        <div class="personal-plant-theme-settings" hidden>
          <div class="personal-pref-row">
            <p class="personal-pref-label" id="personal-plant-theme-label">
              Visual progress
            </p>
            <div
              class="mode-switch"
              role="group"
              aria-labelledby="personal-plant-theme-label"
            >
              <button
                type="button"
                class="view-switch-button"
                data-personal-plant-theme="off"
              >
                Off
              </button>
              <button
                type="button"
                class="view-switch-button"
                data-personal-plant-theme="plant"
              >
                On
              </button>
            </div>
          </div>
          <div class="personal-visual-theme-row" hidden>
            <label class="personal-pref-label" for="personal-visual-theme">Theme</label>
            <select id="personal-visual-theme" class="personal-visual-theme-select">
              <option value="plant">Plant</option>
              <option value="gumball">Gumball Jar</option>
              <option value="constellation">Constellation</option>
              <option value="mountain">Mountain Climb</option>
              <option value="dynamite">Dynamite Fuse</option>
              <option value="coffee">Coffee Pour</option>
              <option value="battery">Battery</option>
              <option value="aquarium">Aquarium</option>
              <option value="kite">Kite</option>
              <option value="rocket">Rocket</option>
              <option value="fisherman">Fisherman</option>
            </select>
          </div>
          <p class="personal-settings-note">
            Plant grows with your progress. Empty shows no plant and adds no finale.
          </p>
        </div>
        <div class="personal-audio-settings" hidden>
          <div class="personal-pref-row">
            <p class="personal-pref-label" id="personal-completion-sound-label">
              Sound
            </p>
            <div
              class="mode-switch"
              role="group"
              aria-labelledby="personal-completion-sound-label"
            >
              <button
                type="button"
                class="view-switch-button"
                data-personal-completion-sound="off"
              >
                Off
              </button>
              <button
                type="button"
                class="view-switch-button"
                data-personal-completion-sound="on"
              >
                On
              </button>
            </div>
          </div>
          <div class="personal-pref-row personal-task-sound-row">
            <label class="personal-pref-label" for="personal-task-sound">
              Task sound
            </label>
            <div class="personal-task-sound-controls">
              <select id="personal-task-sound" class="personal-task-sound-select">
                <option value="none">None</option>
                <option value="bubble-pop">Bubble Pop</option>
                <option value="soft-click">Soft Click</option>
                <option value="wood-tap">Wood Tap</option>
                <option value="random">Random</option>
              </select>
              <button
                class="personal-task-sound-preview sound-preview-button"
                type="button"
              >
                Preview
              </button>
            </div>
          </div>
          <div class="personal-pref-row personal-final-sound-row">
            <label class="personal-pref-label" for="personal-final-sound">
              Final sound
            </label>
            <div class="personal-final-sound-controls">
              <select id="personal-final-sound" class="personal-final-sound-select">
                <option value="current">Current tone</option>
                <option value="yay">Yay!</option>
                <option value="applause">Applause</option>
                <option value="trumpet-fanfare">Trumpet fanfare</option>
                <option value="hurrah">Hurrah!</option>
              </select>
              <button
                class="personal-final-sound-preview sound-preview-button"
                type="button"
              >
                Preview
              </button>
            </div>
          </div>
        </div>
        <div class="personal-message-settings" hidden>
          <div class="personal-pref-row">
            <p class="personal-pref-label" id="personal-affirmation-label">
              Affirmations
            </p>
            <div
              class="mode-switch"
              role="group"
              aria-labelledby="personal-affirmation-label"
            >
              <button
                type="button"
                class="view-switch-button"
                data-personal-affirmation="off"
              >
                Off
              </button>
              <button
                type="button"
                class="view-switch-button"
                data-personal-affirmation="on"
              >
                On
              </button>
            </div>
          </div>
          <div class="personal-pref-row personal-affirmation-choice-row">
            <label class="personal-pref-label" for="personal-affirmation-choice">
              Affirmation
            </label>
            <select
              id="personal-affirmation-choice"
              class="personal-affirmation-select"
            ></select>
          </div>
          <input
            id="personal-affirmation-custom"
            class="personal-message-custom"
            type="text"
            maxlength="${PERSONAL_MESSAGE_MAX_LENGTH}"
            placeholder="Type a custom affirmation"
            autocomplete="off"
            hidden
          />
          <div class="personal-pref-row personal-complete-message-row">
            <label class="personal-pref-label" for="personal-complete-message">
              All-tasks-completed message
            </label>
            <select
              id="personal-complete-message"
              class="personal-complete-message-select"
            ></select>
          </div>
          <input
            id="personal-complete-message-custom"
            class="personal-message-custom"
            type="text"
            maxlength="${PERSONAL_MESSAGE_MAX_LENGTH}"
            placeholder="Type a custom completed message"
            autocomplete="off"
            hidden
          />
          <div class="personal-pref-row personal-pause-message-row">
            <label class="personal-pref-label" for="personal-pause-message">
              Stopping with unfinished tasks
            </label>
            <select
              id="personal-pause-message"
              class="personal-pause-message-select"
            ></select>
          </div>
          <input
            id="personal-pause-message-custom"
            class="personal-message-custom"
            type="text"
            maxlength="${PERSONAL_MESSAGE_MAX_LENGTH}"
            placeholder="Type a custom pause message"
            autocomplete="off"
            hidden
          />
        </div>
        <div class="personal-break-settings" hidden>
          <div class="personal-pref-row">
            <p class="personal-pref-label" id="personal-break-clock-label">
              Break clock
            </p>
            <div
              class="mode-switch"
              role="group"
              aria-labelledby="personal-break-clock-label"
            >
              <button
                type="button"
                class="view-switch-button"
                data-personal-break-clock="off"
              >
                Off
              </button>
              <button
                type="button"
                class="view-switch-button"
                data-personal-break-clock="on"
              >
                On
              </button>
            </div>
          </div>
          <div class="personal-pref-row personal-break-interval-row">
            <label class="personal-pref-label" for="personal-break-interval">
              Break interval
            </label>
            <span class="personal-break-interval-control">
              <input
                id="personal-break-interval"
                class="personal-break-interval"
                type="number"
                min="${MIN_BREAK_INTERVAL_MINUTES}"
                max="${MAX_BREAK_INTERVAL_MINUTES}"
                step="1"
                inputmode="numeric"
              />
              <span>minutes</span>
            </span>
          </div>
          <p class="personal-break-status" aria-live="polite"></p>
          <div class="personal-pref-row personal-break-notification-row">
            <p class="personal-pref-label" id="personal-break-notification-label">
              Notify me when CueDone is closed
            </p>
            <div
              class="mode-switch"
              role="group"
              aria-labelledby="personal-break-notification-label"
            >
              <button
                type="button"
                class="view-switch-button"
                data-personal-break-notification="off"
              >
                Off
              </button>
              <button
                type="button"
                class="view-switch-button"
                data-personal-break-notification="on"
              >
                On
              </button>
            </div>
          </div>
          <p class="personal-break-notification-note">
            Shows a silent, private system alert and a ! on the CueDone toolbar
            icon when a break is waiting.
          </p>
          <p class="personal-break-notification-status" aria-live="polite"></p>
          <div class="personal-pref-row personal-break-source-row">
            <label class="personal-pref-label" for="personal-break-source">
              Break suggestions
            </label>
            <select id="personal-break-source" class="personal-break-source">
              <option value="choose-for-me">Choose for me</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <p class="personal-break-source-note">
            Choose for me uses CueDone’s whimsical ideas. Custom uses only
            your saved break suggestions.
          </p>
          <div class="personal-break-suggestions-editor">
            <label class="personal-pref-label" for="personal-break-suggestion-input">
              My break suggestions
            </label>
            <div class="personal-break-suggestion-entry">
              <input
                id="personal-break-suggestion-input"
                class="personal-break-suggestion-input"
                type="text"
                maxlength="${BREAK_SUGGESTION_MAX_LENGTH}"
                placeholder="Add a playful break idea"
                autocomplete="off"
              />
              <button class="personal-break-suggestion-add" type="button">
                Add
              </button>
            </div>
            <ul class="personal-break-suggestion-list" aria-label="My break suggestions"></ul>
            <p class="personal-break-suggestion-feedback" aria-live="polite"></p>
            <p class="personal-break-suggestion-empty">
              No custom ideas saved yet.
            </p>
          </div>
          <p class="personal-settings-note">
            Closing Top does not reset the clock. If a break becomes due while
            CueDone is closed or the computer sleeps, it appears when a view is
            next available. Finish for now pauses it.
          </p>
        </div>
      </div>
    </section>
    <p class="personal-list-error" role="alert" hidden></p>
    <p class="personal-affirmation" hidden></p>
    <section class="personal-break-alert" role="alert" hidden>
      <div class="personal-break-clock-art" aria-hidden="true">
        <span class="personal-break-bell is-left"></span>
        <span class="personal-break-bell is-right"></span>
        <span class="personal-break-face">
          <span class="personal-break-hand is-hour"></span>
          <span class="personal-break-hand is-minute"></span>
          <span class="personal-break-clock-dot"></span>
        </span>
        <span class="personal-break-foot is-left"></span>
        <span class="personal-break-foot is-right"></span>
      </div>
      <div class="personal-break-alert-copy">
        <p class="personal-break-alert-kicker">BREAK TIME</p>
        <p class="personal-break-alert-title">A little reset?</p>
          <p class="personal-break-revealed" hidden></p>
          <p class="personal-break-custom-empty" hidden>
            Add a custom break idea in Settings before using Custom.
          </p>
        <div class="personal-break-alert-actions">
          <button class="personal-break-show" type="button">Show</button>
          <button class="personal-break-skip" type="button">Skip</button>
          <button class="personal-break-done" type="button" hidden>Done</button>
        </div>
      </div>
    </section>
    <section class="personal-ending" hidden>
      <span class="personal-ending-icon" aria-hidden="true"></span>
      <p class="personal-ending-text"></p>
      <button class="continue-list-button" type="button">Continue list</button>
    </section>
    <section class="client-progress" hidden>
      <p class="progress-label">0 of 0 complete</p>
      <div
        class="progress-track"
        role="progressbar"
        aria-valuemin="0"
        aria-valuenow="0"
        aria-valuemax="0"
      >
        <div class="progress-fill"></div>
      </div>
      <div class="client-completion-prefs">
        <div class="client-pref-row">
          <p class="client-pref-label" id="completion-sound-label">Sound</p>
          <div
            class="mode-switch"
            role="group"
            aria-labelledby="completion-sound-label"
          >
            <button
              type="button"
              class="view-switch-button"
              data-completion-sound="off"
            >
              Off
            </button>
            <button
              type="button"
              class="view-switch-button"
              data-completion-sound="on"
            >
              On
            </button>
          </div>
        </div>
        <div class="client-settings-actions">
          <button
            class="client-settings-toggle"
            type="button"
            aria-expanded="false"
            aria-controls="client-settings-panel"
          >
            <span class="client-settings-gear" aria-hidden="true">&#9881;</span>
            <span class="client-settings-label">Settings</span>
          </button>
          <button class="client-settings-done-inline" type="button" hidden>✓ Done</button>
        </div>
        <div id="client-settings-panel" class="client-settings-panel" hidden>
          <div class="client-pref-row">
            <p class="client-pref-label" id="completion-style-label">On complete</p>
            <div
              class="mode-switch"
              role="group"
              aria-labelledby="completion-style-label"
            >
              <button
                type="button"
                class="view-switch-button"
                data-completion-style="simple"
              >
                Simple
              </button>
              <button
                type="button"
                class="view-switch-button"
                data-completion-style="celebrate"
              >
                Celebrate
              </button>
            </div>
          </div>
          <div class="client-pref-row client-task-sound-row">
            <label class="client-pref-label" for="task-sound">Task sound</label>
            <div class="client-task-sound-controls">
              <select id="task-sound" class="task-sound-select">
                <option value="none">None</option>
                <option value="bubble-pop">Bubble Pop</option>
                <option value="soft-click">Soft Click</option>
                <option value="wood-tap">Wood Tap</option>
                <option value="random">Random</option>
              </select>
              <button class="task-sound-preview sound-preview-button" type="button">Preview</button>
            </div>
          </div>
          <div class="client-pref-row client-final-sound-row">
            <label class="client-pref-label" for="final-sound">Final sound</label>
            <div class="client-final-sound-controls">
              <select id="final-sound" class="final-sound-select">
                <option value="current">Current tone</option>
                <option value="yay">Yay!</option>
                <option value="applause">Applause</option>
                <option value="trumpet-fanfare">Trumpet fanfare</option>
                <option value="hurrah">Hurrah!</option>
              </select>
              <button class="final-sound-preview sound-preview-button" type="button">Preview</button>
            </div>
          </div>
          <div class="client-pref-row">
            <p class="client-pref-label" id="final-celebration-label">
              Final celebration
            </p>
            <select
              id="final-celebration"
              class="final-celebration-select"
              aria-labelledby="final-celebration-label"
            >
              <option value="random">Random</option>
              <option value="balloons">Balloons</option>
              <option value="stars">Stars</option>
              <option value="cars">Cars</option>
              <option value="butterflies">Butterflies</option>
            </select>
          </div>
          <button class="client-settings-done" type="button">✓ Done</button>
        </div>
      </div>
    </section>
    <section class="personal-one-active" hidden>
      <div class="personal-one-active-head">
        <div>
          <p class="personal-one-active-kicker">NOW</p>
          <p class="personal-one-active-progress">0 of 0 complete</p>
        </div>
        <button
          class="personal-full-list-toggle"
          type="button"
          aria-expanded="false"
          aria-controls="task-list"
        >
          Review full list
        </button>
      </div>
      <p class="personal-one-active-waiting">0 tasks waiting</p>
      <div
        class="personal-one-active-track"
        role="progressbar"
        aria-valuemin="0"
        aria-valuenow="0"
        aria-valuemax="0"
      >
        <div class="personal-one-active-fill"></div>
      </div>
      <div class="personal-plant" hidden aria-hidden="true">
        <div class="personal-plant-visual" role="img" aria-label="" hidden>
          <span class="personal-plant-pot" aria-hidden="true"></span>
          <span class="personal-plant-stem" aria-hidden="true"></span>
          <span class="personal-plant-leaves" aria-hidden="true"></span>
          <span class="personal-plant-bloom" aria-hidden="true"></span>
        </div>
        <div class="personal-gumball-visual" role="img" aria-label="" hidden>
          <div class="gumball-machine" aria-hidden="true">
            <div class="gumball-cap"></div>
            <div class="gumball-globe">
              <div class="gumball-balls"></div>
            </div>
            <div class="gumball-base">
              <div class="gumball-panel">
                <div class="gumball-flap"></div>
                <div class="gumball-chute"></div>
              </div>
            </div>
            <div class="gumball-rolling" aria-hidden="true"></div>
          </div>
        </div>
        <div class="personal-constellation-visual" role="img" aria-label="" hidden>
          <div class="constellation-sky" aria-hidden="true">
            <svg class="constellation-lines" viewBox="0 0 64 48" preserveAspectRatio="none" aria-hidden="true">
              <line x1="10" y1="10" x2="28" y2="8" class="constellation-line line--1" />
              <line x1="28" y1="8" x2="46" y2="14" class="constellation-line line--2" />
              <line x1="28" y1="8" x2="18" y2="26" class="constellation-line line--3" />
              <line x1="46" y1="14" x2="38" y2="30" class="constellation-line line--4" />
            </svg>
            <span class="constellation-star star--1"></span>
            <span class="constellation-star star--2"></span>
            <span class="constellation-star star--3"></span>
            <span class="constellation-star star--4"></span>
            <span class="constellation-star star--5"></span>
          </div>
        </div>
        <div class="personal-mountain-visual" role="img" aria-label="" hidden>
          ${mountainSceneMarkup()}
        </div>
        <div class="personal-dynamite-visual" role="img" aria-label="" hidden>
          <div class="dynamite-scene" aria-hidden="true">
            <div class="bomb-illustration" aria-hidden="true">
              <div class="bomb-body"><div class="bomb-cap"></div></div>
              <svg class="bomb-fuse-svg" viewBox="0 0 60 28" aria-hidden="true">
                <defs>
                  <radialGradient id="bombSparkGrad" cx="35%" cy="30%" r="65%">
                    <stop offset="0%" stop-color="#fff9c4"/><stop offset="35%" stop-color="#ffeb3b"/><stop offset="62%" stop-color="#ff9800"/><stop offset="100%" stop-color="#ff3d00"/>
                  </radialGradient>
                </defs>
                <path class="bomb-fuse" d="M52 6 C38 4, 32 16, 30 24" />
                <path class="bomb-fuse-inner" d="M52 6 C38 4, 32 16, 30 24" />
                <g class="bomb-spark-svg" visibility="hidden"><circle r="4.8" fill="url(#bombSparkGrad)" stroke="#bf360c" stroke-width="0.6"/><g opacity="0.9" class="bomb-spark-glow"><circle r="8.5" fill="none" stroke="#ffb300" stroke-width="0.9" stroke-dasharray="1.4 2.6" opacity="0.95"/><circle r="10.5" fill="none" stroke="#ff6f00" stroke-width="0.5" stroke-dasharray="1 3" opacity="0.55"/></g></g>
              </svg>
              <div class="bomb-burst"></div>
            </div>
          </div>
        </div>
        <div class="personal-coffee-visual" role="img" aria-label="" hidden>
          <div class="coffee-scene" aria-hidden="true">
            <div class="carafe" aria-hidden="true"><div class="carafe-body"><div class="carafe-fill"></div><div class="carafe-pour-inner" aria-hidden="true"></div></div><div class="carafe-spout"><div class="pour-stream" aria-hidden="true"></div></div><div class="carafe-handle"></div><div class="carafe-lid"></div></div>
            <div class="mug" aria-hidden="true"><div class="mug-body"><div class="mug-fill"></div></div><div class="mug-handle"></div><span class="mug-steam s1"></span><span class="mug-steam s2"></span><span class="mug-steam-heart" aria-hidden="true"><svg viewBox="0 0 22 34" aria-hidden="true"><path d="M11 28 C 11 28 5.2 22.2 5.2 17.6 C5.2 14.1 7.4 12.2 10.1 14.2 L11 15 L11.9 14.2 C14.6 12.2 16.8 14.1 16.8 17.6 C16.8 22.2 11 28 11 28 Z" fill="none" stroke="#1a1a1a" stroke-width="1.25" stroke-linejoin="round"/><path d="M11 14.2 C 8.5 12.5, 14.5 9.2, 11 6.5 C 8.2 4.2, 14 1.2, 11 -1.2" fill="none" stroke="#1a1a1a" stroke-width="1.15" stroke-linecap="round"/><path d="M11 5.2 C 13.8 3, 7.2 -0.8, 11 -3.8" fill="none" stroke="#1a1a1a" stroke-width="1.05" stroke-linecap="round" opacity="0.95"/></svg></span></div>
          </div>
        </div>
        <div class="personal-battery-visual" role="img" aria-label="" hidden>
          <div class="battery-scene" aria-hidden="true"><span class="battery-body"><span class="battery-fill"></span></span><span class="battery-tip"></span><span class="battery-bolt battery-bolt--top" aria-hidden="true"><svg viewBox="0 0 36 38" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="boltGradTop2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFED4A"/><stop offset="45%" stop-color="#FFC400"/><stop offset="100%" stop-color="#FF8F00"/></linearGradient></defs><path d="M3 24 L22 4 L16 13 L33 2 L10 20 L16 16 Z" fill="url(#boltGradTop2)" stroke="#B86A00" stroke-width="0.9" stroke-linejoin="round" stroke-linecap="round"/><path d="M3 24 L22 4 L16 13 L33 2" fill="none" stroke="rgba(255,255,255,0.62)" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="battery-bolt battery-bolt--bottom" aria-hidden="true"><svg viewBox="0 0 36 38" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="boltGradBot2" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#FFED4A"/><stop offset="45%" stop-color="#FFC400"/><stop offset="100%" stop-color="#FF8F00"/></linearGradient></defs><path d="M3 14 L22 34 L16 25 L33 36 L10 18 L16 22 Z" fill="url(#boltGradBot2)" stroke="#B86A00" stroke-width="0.9" stroke-linejoin="round" stroke-linecap="round"/><path d="M3 14 L22 34 L16 25 L33 36" fill="none" stroke="rgba(255,255,255,0.62)" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg></span></div>
        </div>
        <div class="personal-aquarium-visual" role="img" aria-label="" hidden>
          <div class="aquarium-scene" aria-hidden="true"><span class="aquarium-tank"><span class="aquarium-fish f1"></span><span class="aquarium-fish f2"></span><span class="aquarium-fish f3"></span><span class="aquarium-fish f4"></span><span class="aquarium-ripple" aria-hidden="true"></span><span class="aquarium-bag"></span></span></div>
        </div>
        <div class="personal-kite-visual" role="img" aria-label="" hidden>
          ${kiteSceneMarkup()}
        </div>
        <div class="personal-rocket-visual" role="img" aria-label="" hidden>
          <div class="rocket-scene" aria-hidden="true"><span class="rocket-stand"></span><span class="rocket-body"><span class="rocket-fin"></span><span class="rocket-flame"></span></span><span class="shooting-star" aria-hidden="true"></span></div>
        </div>
        <div class="personal-fisherman-visual" role="img" aria-label="" hidden>
          ${fishermanSceneMarkup()}
        </div>
        <div class="personal-zen-terrarium-visual" role="img" aria-label="" hidden>
          <div class="zen-scene" aria-hidden="true"><span class="zen-jar"><span class="zen-plant zp1"></span><span class="zen-plant zp2"></span><span class="zen-plant zp3"></span><span class="zen-plant zp4"></span></span></div>
        </div>
      </div>
      <p class="personal-plant-status sr-only" aria-live="polite"></p>
    </section>
    <ul id="task-list" class="task-list" aria-label="Tasks"></ul>
    <p class="empty-state">No tasks yet. Add one to get started.</p>
    <section class="client-motivator" hidden>
      <div class="client-reward-head">
        <p class="client-reward-heading" id="reward-select-label">Reward</p>
        <button type="button" class="reward-edit">Edit</button>
      </div>
      <div class="client-reward-setup">
        <select
          id="client-reward"
          class="reward-select"
          aria-labelledby="reward-select-label"
        >
          <option value="none">None</option>
          <option value="your-choice">Your Choice</option>
          <option value="game-time">Game Time</option>
          <option value="music">Music</option>
          <option value="drawing">Drawing</option>
          <option value="reading">Reading</option>
          <option value="surprise">Surprise</option>
          <option value="custom">Custom</option>
        </select>
        <input
          id="reward-custom"
          class="reward-custom-input"
          type="text"
          maxlength="120"
          placeholder="Type a custom reward"
          autocomplete="off"
          hidden
        />
      </div>
      <p class="client-reward-value" hidden></p>
    </section>
    <section class="list-lifecycle">
      <button class="finish-for-now-button" type="button" hidden>
        Finish for now
      </button>
      <button
        class="new-list-toggle"
        type="button"
        aria-expanded="false"
        aria-controls="new-list-review"
      >
        Start a New List
      </button>
      <div id="new-list-review" class="new-list-review" hidden>
        <h2 class="new-list-heading" id="new-list-heading">Start a New List</h2>
        <p class="new-list-copy">
          Choose unfinished tasks to carry over. Completed tasks and unfinished
          tasks you deselect will be removed.
        </p>
        <div
          class="carryover-list"
          role="group"
          aria-labelledby="new-list-heading"
        ></div>
        <p class="carryover-empty" hidden></p>
        <p class="new-list-status" aria-live="polite"></p>
        <p class="new-list-error" role="alert" hidden></p>
        <div class="new-list-actions">
          <button class="create-new-list-button" type="button">Create New List</button>
          <button class="cancel-new-list-button" type="button">Cancel</button>
        </div>
      </div>
    </section>
    <div class="list-reset" hidden>
      <button type="button" class="reset-list-button">Reset List</button>
      <div class="reset-confirm" hidden>
        <p class="reset-confirm-copy">Start this list again?</p>
        <div class="reset-confirm-actions">
          <button type="button" class="reset-confirm-button">Reset</button>
          <button type="button" class="reset-cancel-button">Cancel</button>
        </div>
      </div>
    </div>
  `;

  const form = root.querySelector(".task-form");
  const input = root.querySelector(".task-input");
  const doneButton = root.querySelector(".done-button");
  const addToggle = root.querySelector(".add-task-toggle");
  const list = root.querySelector(".task-list");
  const resetSection = root.querySelector(".list-reset");
  const resetButton = root.querySelector(".reset-list-button");
  const resetConfirm = root.querySelector(".reset-confirm");
  const resetConfirmButton = root.querySelector(".reset-confirm-button");
  const resetCancelButton = root.querySelector(".reset-cancel-button");
  const newListToggle = root.querySelector(".new-list-toggle");
  const newListReview = root.querySelector(".new-list-review");
  const carryoverList = root.querySelector(".carryover-list");
  const carryoverEmpty = root.querySelector(".carryover-empty");
  const newListStatus = root.querySelector(".new-list-status");
  const newListError = root.querySelector(".new-list-error");
  const createNewListButton = root.querySelector(".create-new-list-button");
  const cancelNewListButton = root.querySelector(".cancel-new-list-button");
  const emptyState = root.querySelector(".empty-state");
  const personalSettings = root.querySelector(".personal-settings");
  const personalListLabel = root.querySelector(".personal-list-label");
  const personalSettingsToggle = root.querySelector(".personal-settings-toggle");
  const personalSettingsToggleIcon = personalSettingsToggle.querySelector(
    ".personal-settings-gear"
  );
  const personalSettingsToggleLabel = personalSettingsToggle.querySelector(
    ".personal-settings-toggle-label"
  );
  const personalSettingsPanel = root.querySelector(".personal-settings-panel");
  const personalPresentationButtons = root.querySelectorAll(
    "[data-personal-presentation]"
  );
  const personalTaskLayoutSettings = root.querySelector(
    ".personal-task-layout-settings"
  );
  const personalTaskLayoutButtons = root.querySelectorAll(
    "[data-personal-task-layout]"
  );
  const personalPlantThemeSettings = root.querySelector(
    ".personal-plant-theme-settings"
  );
  const personalPlantThemeButtons = root.querySelectorAll(
    "[data-personal-plant-theme]"
  );
  const personalVisualThemeRow = root.querySelector(
    ".personal-visual-theme-row"
  );
  const personalVisualThemeSelect = root.querySelector(
    "#personal-visual-theme"
  );
  const personalAudioSettings = root.querySelector(".personal-audio-settings");
  const personalSoundButtons = root.querySelectorAll(
    "[data-personal-completion-sound]"
  );
  const personalTaskSoundSelect = root.querySelector(
    ".personal-task-sound-select"
  );
  const personalTaskSoundPreviewButton = root.querySelector(
    ".personal-task-sound-preview"
  );
  const personalFinalSoundSelect = root.querySelector(
    ".personal-final-sound-select"
  );
  const personalFinalSoundPreviewButton = root.querySelector(
    ".personal-final-sound-preview"
  );
  const personalMessageSettings = root.querySelector(
    ".personal-message-settings"
  );
  const personalAffirmationButtons = root.querySelectorAll(
    "[data-personal-affirmation]"
  );
  const personalAffirmationSelect = root.querySelector(
    ".personal-affirmation-select"
  );
  const personalAffirmationCustom = root.querySelector(
    "#personal-affirmation-custom"
  );
  const personalCompleteMessageSelect = root.querySelector(
    ".personal-complete-message-select"
  );
  const personalCompleteMessageCustom = root.querySelector(
    "#personal-complete-message-custom"
  );
  const personalPauseMessageSelect = root.querySelector(
    ".personal-pause-message-select"
  );
  const personalPauseMessageCustom = root.querySelector(
    "#personal-pause-message-custom"
  );
  const personalBreakSettings = root.querySelector(
    ".personal-break-settings"
  );
  const personalBreakClockButtons = root.querySelectorAll(
    "[data-personal-break-clock]"
  );
  const personalBreakIntervalInput = root.querySelector(
    ".personal-break-interval"
  );
  const personalBreakStatus = root.querySelector(".personal-break-status");
  const personalBreakNotificationButtons = root.querySelectorAll(
    "[data-personal-break-notification]"
  );
  const personalBreakNotificationStatus = root.querySelector(
    ".personal-break-notification-status"
  );
  const personalBreakSourceSelect = root.querySelector(
    ".personal-break-source"
  );
  const personalBreakSuggestionInput = root.querySelector(
    ".personal-break-suggestion-input"
  );
  const personalBreakSuggestionAdd = root.querySelector(
    ".personal-break-suggestion-add"
  );
  const personalBreakSuggestionList = root.querySelector(
    ".personal-break-suggestion-list"
  );
  const personalBreakSuggestionEmpty = root.querySelector(
    ".personal-break-suggestion-empty"
  );
  const personalBreakSuggestionFeedback = root.querySelector(
    ".personal-break-suggestion-feedback"
  );
  const personalBreakAlert = root.querySelector(".personal-break-alert");
  const personalBreakRevealed = root.querySelector(
    ".personal-break-revealed"
  );
  const personalBreakCustomEmpty = root.querySelector(
    ".personal-break-custom-empty"
  );
  const personalBreakShow = root.querySelector(".personal-break-show");
  const personalBreakSkip = root.querySelector(".personal-break-skip");
  const personalBreakDone = root.querySelector(".personal-break-done");
  const personalAffirmationDisplay = root.querySelector(".personal-affirmation");
  const personalEndingSection = root.querySelector(".personal-ending");
  const personalEndingIcon = root.querySelector(".personal-ending-icon");
  const personalEndingText = root.querySelector(".personal-ending-text");
  const continueListButton = root.querySelector(".continue-list-button");
  const finishForNowButton = root.querySelector(".finish-for-now-button");
  const personalListError = root.querySelector(".personal-list-error");
  const personalOneActive = root.querySelector(".personal-one-active");
  const personalOneActiveKicker = root.querySelector(
    ".personal-one-active-kicker"
  );
  const personalOneActiveProgress = root.querySelector(
    ".personal-one-active-progress"
  );
  const personalOneActiveWaiting = root.querySelector(
    ".personal-one-active-waiting"
  );
  const personalOneActiveTrack = root.querySelector(
    ".personal-one-active-track"
  );
  const personalOneActiveFill = root.querySelector(
    ".personal-one-active-fill"
  );
  const personalPlant = root.querySelector(".personal-plant:not(.personal-plant--entry)");
  const personalPlantVisual = root.querySelector(".personal-plant-visual:not(.personal-plant-visual--entry)");
  const personalPlantStatus = root.querySelector(".personal-plant-status:not(.personal-plant-status--entry)");
  const personalPlantEntry = root.querySelector(".personal-plant--entry");
  const personalPlantVisualEntry = root.querySelector(".personal-plant-visual--entry");
  const personalPlantStatusEntry = root.querySelector(".personal-plant-status--entry");
  const personalGumballVisual = root.querySelector(".personal-gumball-visual:not(.personal-gumball-visual--entry)");
  const personalGumballVisualEntry = root.querySelector(".personal-gumball-visual--entry");
  const personalConstellationVisual = root.querySelector(".personal-constellation-visual:not(.personal-constellation-visual--entry)");
  const personalConstellationVisualEntry = root.querySelector(".personal-constellation-visual--entry");
  const personalMountainVisual = root.querySelector(".personal-mountain-visual:not(.personal-mountain-visual--entry)");
  const personalMountainVisualEntry = root.querySelector(".personal-mountain-visual--entry");
  const personalDynamiteVisual = root.querySelector(".personal-dynamite-visual:not(.personal-dynamite-visual--entry)");
  const personalDynamiteVisualEntry = root.querySelector(".personal-dynamite-visual--entry");
  const personalCoffeeVisual = root.querySelector(".personal-coffee-visual:not(.personal-coffee-visual--entry)");
  const personalCoffeeVisualEntry = root.querySelector(".personal-coffee-visual--entry");
  const personalBatteryVisual = root.querySelector(".personal-battery-visual:not(.personal-battery-visual--entry)");
  const personalBatteryVisualEntry = root.querySelector(".personal-battery-visual--entry");
  const personalAquariumVisual = root.querySelector(".personal-aquarium-visual:not(.personal-aquarium-visual--entry)");
  const personalAquariumVisualEntry = root.querySelector(".personal-aquarium-visual--entry");
  const personalKiteVisual = root.querySelector(".personal-kite-visual:not(.personal-kite-visual--entry)");
  const personalKiteVisualEntry = root.querySelector(".personal-kite-visual--entry");
  const personalAnimalPuzzleVisual = personalKiteVisual;
  const personalAnimalPuzzleVisualEntry = personalKiteVisualEntry;
  const personalRocketVisual = root.querySelector(".personal-rocket-visual:not(.personal-rocket-visual--entry)");
  const personalRocketVisualEntry = root.querySelector(".personal-rocket-visual--entry");
  const personalFishermanVisual = root.querySelector(".personal-fisherman-visual:not(.personal-fisherman-visual--entry)");
  const personalFishermanVisualEntry = root.querySelector(".personal-fisherman-visual--entry");
  const personalZenTerrariumVisual = root.querySelector(".personal-zen-terrarium-visual:not(.personal-zen-terrarium-visual--entry)");
  const personalZenTerrariumVisualEntry = root.querySelector(".personal-zen-terrarium-visual--entry");
  const flatEntryVisualsOuter = [[personalPlantVisualEntry, "plant"], [personalGumballVisualEntry, "gumball"], [personalConstellationVisualEntry, "constellation"], [personalMountainVisualEntry, "mountain"], [personalDynamiteVisualEntry, "dynamite"], [personalCoffeeVisualEntry, "coffee"], [personalBatteryVisualEntry, "battery"], [personalAquariumVisualEntry, "aquarium"], [personalKiteVisualEntry, "kite"], [personalRocketVisualEntry, "rocket"], [personalFishermanVisualEntry, "fisherman"], [personalZenTerrariumVisualEntry, "zen-terrarium"]];
  const flatAllVisualsOuter = [[personalPlantVisual, "plant"], [personalGumballVisual, "gumball"], [personalConstellationVisual, "constellation"], [personalMountainVisual, "mountain"], [personalDynamiteVisual, "dynamite"], [personalCoffeeVisual, "coffee"], [personalBatteryVisual, "battery"], [personalAquariumVisual, "aquarium"], [personalKiteVisual, "kite"], [personalRocketVisual, "rocket"], [personalFishermanVisual, "fisherman"], [personalZenTerrariumVisual, "zen-terrarium"]];
  const personalFullListToggle = root.querySelector(
    ".personal-full-list-toggle"
  );

  function fillMessageOptions(select, presets, { includeNone = false } = {}) {
    const options = [];
    if (includeNone) {
      options.push({ id: "none", text: "None" });
    }
    options.push(
      ...presets.map((item) => ({ id: item.id, text: item.text })),
      { id: "custom", text: "Custom" },
      { id: "random", text: "Random" }
    );
    select.replaceChildren(
      ...options.map((item) => {
        const option = document.createElement("option");
        option.value = item.id;
        option.textContent = item.text;
        return option;
      })
    );
  }

  fillMessageOptions(personalAffirmationSelect, AFFIRMATION_PRESETS);
  fillMessageOptions(personalCompleteMessageSelect, COMPLETE_MESSAGE_PRESETS, {
    includeNone: true,
  });
  fillMessageOptions(personalPauseMessageSelect, PAUSE_MESSAGE_PRESETS, {
    includeNone: true,
  });
  const progressSection = root.querySelector(".client-progress");
  const progressLabel = root.querySelector(".progress-label");
  const progressTrack = root.querySelector(".progress-track");
  const progressFill = root.querySelector(".progress-fill");
  const settingsToggle = root.querySelector(".client-settings-toggle");
  const settingsToggleIcon = settingsToggle.querySelector(".client-settings-gear");
  const settingsToggleLabel = settingsToggle.querySelector(".client-settings-label");
  const settingsPanel = root.querySelector(".client-settings-panel");
  const clientSettingsDone = root.querySelector(".client-settings-done");
  const clientSettingsDoneInline = root.querySelector(".client-settings-done-inline");
  const completionStyleButtons = root.querySelectorAll(
    "[data-completion-style]"
  );
  const completionSoundButtons = root.querySelectorAll(
    "[data-completion-sound]"
  );
  const finalSoundSelect = root.querySelector(".final-sound-select");
  const finalSoundPreviewButton = root.querySelector(".final-sound-preview");
  const taskSoundSelect = root.querySelector(".task-sound-select");
  const taskSoundPreviewButton = root.querySelector(".task-sound-preview");
  const finalCelebrationSelect = root.querySelector(".final-celebration-select");
  const motivatorSection = root.querySelector(".client-motivator");
  const rewardHeading = root.querySelector(".client-reward-heading");
  const rewardEdit = root.querySelector(".reward-edit");
  const rewardSetup = root.querySelector(".client-reward-setup");
  const rewardSelect = root.querySelector(".reward-select");
  const rewardCustomInput = root.querySelector(".reward-custom-input");
  const rewardValue = root.querySelector(".client-reward-value");
  let rewardEditing = true;
  let resetConfirming = false;

  function applyEntryMode(isOpen) {
    const visibility = taskEntryVisibility(isOpen);
    entryOpen = visibility.showEntryForm;
    root.dataset.entryMode = visibility.showEntryForm ? "entry" : "work";
    root.classList.toggle("is-entry-collapsed", visibility.showAddTaskToggle);
    form.hidden = !visibility.showEntryForm;
    addToggle.hidden = !visibility.showAddTaskToggle;
    form.style.display = visibility.showEntryForm ? "flex" : "none";
    addToggle.style.display = visibility.showAddTaskToggle
      ? "inline-flex"
      : "none";
    // Private Full list only: hide progress graphic while entry form is open so input gets full row width
    const shouldHideNow = !oneActiveLayoutEnabled() && isPlantVisible({ tasks: visibleTasks(), presentationMode: document.body.dataset.presentation, personalPresentation, layout: personalTaskLayout, theme: personalPlantTheme }) && visibleTasks().length > 0 && entryOpen;
    if (shouldHideNow) {
      previousEntryHiddenDueToEntry = true;
      personalPlantEntry.hidden = true;
      personalPlantEntry.classList.remove("suppress-animations");
    } else if (previousEntryHiddenDueToEntry && !shouldHideNow) {
      // Reappearing after entry — show updated progress without replaying completion animation
      suppressNextEntryVisual = true;
      previousEntryHiddenDueToEntry = false;
      personalPlantEntry.classList.add("suppress-animations");
      // Force visible now and sync to current progress so Done shows updated count immediately
      const stillVisible = !oneActiveLayoutEnabled() && isPlantVisible({ tasks: visibleTasks(), presentationMode: document.body.dataset.presentation, personalPresentation, layout: personalTaskLayout, theme: personalPlantTheme }) && visibleTasks().length > 0;
      if (stillVisible) {
        personalPlantEntry.hidden = false;
        const progress = personalOneActiveState(visibleTasks(), { reviewAll: personalFullListOpen }).progress;
        const visualThemeNow = normalizeVisualTheme(personalVisualTheme);
        const basePlantVisibleNow = isPlantVisible({ tasks: visibleTasks(), presentationMode: document.body.dataset.presentation, personalPresentation, layout: personalTaskLayout, theme: personalPlantTheme });
        const isFishermanNow = visualThemeNow === "fisherman" || visualThemeNow === "zen-terrarium";
        const entryFishermanVisible = (() => {
          if (!isFishermanNow) return false;
          const isPrivate = document.body.dataset.presentation === "personal" && personalPresentation === "private";
          const isLayout = personalTaskLayout === "one-active" || personalTaskLayout === "one_active" || personalTaskLayout === "full-list" || personalTaskLayout === "full_list";
          if (!isPrivate || !isLayout) return false;
          return Number(progress?.total) > 0;
        })();
        const plantVisibleNow = isFishermanNow ? entryFishermanVisible : basePlantVisibleNow;
        if (plantVisibleNow) {
          const { stage, desc } = getThemeStage(visualThemeNow, progress);
          if (stage != null && desc) {
            personalPlantEntry.dataset.visualTheme = visualThemeNow;
            for (const [el, key] of flatEntryVisualsOuter) if (el) { el.hidden = key !== visualThemeNow; if (key === visualThemeNow) { el.dataset.stage = String(stage); el.setAttribute("aria-label", desc.accessibleText); if (key === "plant") el.dataset.bloom = stage === PLANT_STAGE_COUNT - 1 ? "true" : "false"; } else { el.removeAttribute("data-stage"); el.removeAttribute("data-bloom"); el.setAttribute("aria-label", ""); } }
            personalPlantStatusEntry.textContent = desc.accessibleText;
            if (visualThemeNow === "gumball") {
              syncGumballVisual(personalGumballVisualEntry, progress, isFirstGumballRender);
              // Update tracking to avoid replay on this reappearance
              previousGumballComplete = Number(progress.complete) || 0;
              if (plantVisibleNow) isFirstGumballRender = false;
            }
            if (visualThemeNow === "dynamite") {
              syncDynamiteVisual(personalDynamiteVisualEntry, progress);
            }
            if (visualThemeNow === "coffee") {
              syncCoffeeVisual(personalCoffeeVisualEntry, progress);
            }
          }
        }
      }
      const entryEl = personalPlantEntry;
      if (typeof globalThis.requestAnimationFrame === "function") {
        globalThis.requestAnimationFrame(() => {
          globalThis.requestAnimationFrame(() => {
            entryEl.classList.remove("suppress-animations");
            suppressNextEntryVisual = false;
          });
        });
      } else {
        suppressNextEntryVisual = false;
        entryEl.classList.remove("suppress-animations");
      }
    } else {
      previousEntryHiddenDueToEntry = shouldHideNow;
      if (!shouldHideNow) {
        personalPlantEntry.classList.remove("suppress-animations");
      }
    }
  }

  function isClientMode() {
    return document.body.dataset.presentation === "client";
  }

  function currentListKind() {
    return activeListKind(
      document.body.dataset.presentation,
      personalPresentation
    );
  }

  function visibleTasks() {
    return visibleTasksForActiveList(currentListKind(), tasksKind, tasks);
  }

  function showListError(message) {
    personalListError.textContent = message;
    personalListError.hidden = !message;
  }

  function setPersonalSettingsPanelOpen(isOpen) {
    const expanded = isOpen === true;
    personalSettingsPanel.hidden = !expanded;
    personalSettingsToggle.setAttribute("aria-expanded", String(expanded));
    personalSettingsToggle.classList.toggle("is-open", expanded);
    personalSettingsToggleIcon.textContent = expanded ? "✓" : "⚙";
    personalSettingsToggleLabel.textContent = expanded ? "Done" : "Settings";
  }

  function paintPersonalPresentation(value) {
    const current = value === "public" ? "public" : "private";
    for (const button of personalPresentationButtons) {
      const isCurrent = button.dataset.personalPresentation === current;
      button.classList.toggle("is-current", isCurrent);
      button.setAttribute("aria-pressed", String(isCurrent));
    }
  }

  function oneActiveLayoutEnabled() {
    return personalOneActiveAllowed(
      document.body.dataset.presentation,
      personalPresentation,
      personalTaskLayout
    );
  }

  function paintPersonalTaskLayout(value) {
    const current = normalizePersonalTaskLayout(value);
    for (const button of personalTaskLayoutButtons) {
      const isCurrent = button.dataset.personalTaskLayout === current;
      button.classList.toggle("is-current", isCurrent);
      button.setAttribute("aria-pressed", String(isCurrent));
    }
  }

  function applyPersonalTaskLayout(value) {
    personalTaskLayout = normalizePersonalTaskLayout(value);
    document.body.dataset.personalTaskLayout = personalTaskLayout;
    if (personalTaskLayout !== "one-active") {
      personalFullListOpen = false;
    }
    paintPersonalTaskLayout(personalTaskLayout);
  }

  function paintPersonalPlantTheme(value) {
    const current = normalizePlantTheme(value);
    for (const button of personalPlantThemeButtons) {
      const isCurrent = button.dataset.personalPlantTheme === current;
      button.classList.toggle("is-current", isCurrent);
      button.setAttribute("aria-pressed", String(isCurrent));
    }
  }

  function personalVisualThemeDescription(theme) {
    switch (theme) {
      case "fisherman":
        return "Fisherman catches fish as tasks complete, with a grand splash finale.";
      case "gumball":
        return "Gumball fills as tasks complete.";
      case "constellation":
        return "Constellation lights up as tasks complete.";
      case "mountain":
        return "Climber ascends as tasks complete.";
      case "dynamite":
        return "Dynamite fuse burns as tasks complete.";
      case "coffee":
        return "Coffee pours as tasks complete.";
      case "battery":
        return "Battery charges as tasks complete.";
      case "aquarium":
        return "Aquarium fills as tasks complete.";
      case "kite":
      case "animal-puzzle":
        return "Kite soars as tasks complete.";
      case "rocket":
        return "Rocket launches as tasks complete.";
      case "plant":
      default:
        return "Plant grows with your progress. Empty shows no plant and adds no finale.";
    }
  }

  function paintPersonalVisualTheme(value) {
    const current = normalizeVisualTheme(value);
    if (personalVisualThemeSelect) {
      personalVisualThemeSelect.value = current;
    }
    const note = root.querySelector(".personal-visual-theme-row + .personal-settings-note");
    if (note) {
      note.textContent = personalVisualThemeDescription(current);
    }
  }

  function applyPersonalVisualTheme(value) {
    personalVisualTheme = normalizeVisualTheme(value);
    document.body.dataset.personalVisualTheme = personalVisualTheme;
    paintPersonalVisualTheme(personalVisualTheme);
  }

  function applyPersonalPlantTheme(value) {
    personalPlantTheme = normalizePlantTheme(value);
    document.body.dataset.personalPlantTheme = personalPlantTheme;
    paintPersonalPlantTheme(personalPlantTheme);
  }

  function closePersonalFullListReview() {
    personalFullListOpen = false;
  }

  function canPlayPersonalAudio() {
    return personalAudioAllowed(
      document.body.dataset.presentation,
      personalPresentation
    );
  }

  function syncActiveAudioGate() {
    const personalOn = canPlayPersonalAudio() && personalSound === "on";
    const clientOn =
      isClientMode() && document.body.dataset.completionSound === "on";
    setCelebrationAudioEnabled(personalOn || clientOn);
    personalTaskSoundPreviewButton.disabled = !personalOn;
    personalFinalSoundPreviewButton.disabled = !personalOn;
    taskSoundPreviewButton.disabled = !clientOn;
    finalSoundPreviewButton.disabled = !clientOn;
  }

  function applyActiveAudioForView() {
    stopCelebrationAudio();
    syncActiveAudioGate();
  }

  function applyPersonalSound(value) {
    personalSound = value === "on" ? "on" : "off";
    document.body.dataset.personalCompletionSound = personalSound;
    for (const button of personalSoundButtons) {
      const isCurrent = button.dataset.personalCompletionSound === personalSound;
      button.classList.toggle("is-current", isCurrent);
      button.setAttribute("aria-pressed", String(isCurrent));
    }
    syncActiveAudioGate();
  }

  function applyPersonalTaskSound(value) {
    personalTaskSound = normalizeTaskSound(value);
    document.body.dataset.personalTaskSound = personalTaskSound;
    personalTaskSoundSelect.value = personalTaskSound;
  }

  function applyPersonalFinalSound(value) {
    personalFinalSound = normalizeFinalSound(value);
    document.body.dataset.personalFinalSound = personalFinalSound;
    personalFinalSoundSelect.value = personalFinalSound;
  }

  function playPersonalPrivateAudio(plan) {
    if (!plan?.playSound || !canPlayPersonalAudio() || personalSound !== "on") {
      return;
    }

    try {
      if (plan.kind === "final") {
        playCelebrationSound("final", personalFinalSound);
      } else {
        playTaskSound(personalTaskSound);
      }
    } catch {
      // Audio is optional.
    }
  }

  function updatePersonalChrome() {
    const personal = !isClientMode();
    const kind = currentListKind();
    const privateFeatures = personalPrivateFeaturesAllowed(
      document.body.dataset.presentation,
      personalPresentation
    );
    const showPlantSettings = privateFeatures;
    personalSettings.hidden = !personal;
    personalTaskLayoutSettings.hidden = !privateFeatures;
    personalPlantThemeSettings.hidden = !showPlantSettings;
    if (personalVisualThemeRow) {
      personalVisualThemeRow.hidden = !(privateFeatures && personalPlantTheme === "plant");
    }
    personalAudioSettings.hidden = !privateFeatures;
    personalMessageSettings.hidden = !privateFeatures;
    personalBreakSettings.hidden = !privateFeatures;
    personalListLabel.textContent = formatActiveListLabel(kind);
    list.setAttribute("aria-label", taskListAriaLabel(kind));
    paintPersonalPresentation(personalPresentation);
    paintPersonalTaskLayout(personalTaskLayout);
    paintPersonalPlantTheme(personalPlantTheme);
    paintPersonalVisualTheme(personalVisualTheme);
    paintPersonalMessages();
    paintBreakClock();
    syncActiveAudioGate();
  }

  function persistPersonalSetting(save, value, restore) {
    const [load, apply] = save === savePersonalAffirmation
      ? [loadPersonalAffirmation, applyPersonalAffirmation]
      : save === savePersonalCompleteMessage
        ? [loadPersonalCompleteMessage, applyPersonalCompleteMessage]
        : [loadPersonalPauseMessage, applyPersonalPauseMessage];
    return saveSetting({ save, load, value, restore,
      apply: (saved) => { apply(saved); paintPersonalMessages(); } });
  }

  function applyPersonalAffirmation(value, { skipCustomValue = false } = {}) {
    personalAffirmation = normalizeAffirmation(value);
    document.body.dataset.personalAffirmation = personalAffirmation.enabled
      ? "on"
      : "off";
    for (const button of personalAffirmationButtons) {
      const isCurrent =
        button.dataset.personalAffirmation ===
        (personalAffirmation.enabled ? "on" : "off");
      button.classList.toggle("is-current", isCurrent);
      button.setAttribute("aria-pressed", String(isCurrent));
    }
    personalAffirmationSelect.value = personalAffirmation.choice;
    personalAffirmationSelect.hidden = !personalAffirmation.enabled;
    personalAffirmationSelect.closest(
      ".personal-affirmation-choice-row"
    ).hidden = !personalAffirmation.enabled;
    if (!skipCustomValue) {
      personalAffirmationCustom.value = personalAffirmation.customText;
    }
    personalAffirmationCustom.hidden =
      !personalAffirmation.enabled || !affirmationShowsCustom(personalAffirmation);
  }

  function applyPersonalCompleteMessage(value, { skipCustomValue = false } = {}) {
    personalCompleteMessage = normalizeCompleteMessage(value);
    personalCompleteMessageSelect.value = personalCompleteMessage.choice;
    if (!skipCustomValue) {
      personalCompleteMessageCustom.value = personalCompleteMessage.customText;
    }
    personalCompleteMessageCustom.hidden = !endingShowsCustom(
      personalCompleteMessage
    );
  }

  function applyPersonalPauseMessage(value, { skipCustomValue = false } = {}) {
    personalPauseMessage = normalizePauseMessage(value);
    personalPauseMessageSelect.value = personalPauseMessage.choice;
    if (!skipCustomValue) {
      personalPauseMessageCustom.value = personalPauseMessage.customText;
    }
    personalPauseMessageCustom.hidden = !endingShowsCustom(personalPauseMessage);
  }

  function applyPersonalEnding(value) {
    personalEnding = normalizeEndingState(value);
  }

  function breakClockAllowed() {
    return personalPrivateFeaturesAllowed(
      document.body.dataset.presentation,
      personalPresentation
    );
  }

  function applyPersonalBreakNotifications(value) {
    personalBreakNotifications = value === true;
    for (const button of personalBreakNotificationButtons) {
      const isCurrent =
        button.dataset.personalBreakNotification ===
        (personalBreakNotifications ? "on" : "off");
      button.classList.toggle("is-current", isCurrent);
      button.setAttribute("aria-pressed", String(isCurrent));
    }
  }

  function refreshBreakNotificationPermissionStatus() {
    if (!personalBreakNotifications) {
      personalBreakNotificationStatus.textContent = "";
      return Promise.resolve();
    }

    return hasBreakNotificationPermission().then((granted) => {
      personalBreakNotificationStatus.textContent = granted
        ? "Background break alerts are ready."
        : "Chrome notifications are blocked. Select On to request permission again.";
    });
  }

  async function persistPersonalBreakNotifications(next) {
    const previous = personalBreakNotifications;
    applyPersonalBreakNotifications(next);
    try {
      await savePersonalBreakNotifications(next);
      await refreshBreakNotificationPermissionStatus();
      showListError("");
      return true;
    } catch {
      applyPersonalBreakNotifications(previous);
      await refreshBreakNotificationPermissionStatus();
      showListError(
        "CueDone could not save the notification setting. Its previous setting is unchanged."
      );
      return false;
    }
  }

  function renderCustomBreakSuggestions() {
    personalBreakSuggestionList.replaceChildren();
    for (const suggestion of personalBreakSuggestions) {
      const item = document.createElement("li");
      item.className = "personal-break-suggestion-item";
      const text = document.createElement("span");
      text.textContent = suggestion.text;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "personal-break-suggestion-remove";
      remove.dataset.suggestionId = suggestion.id;
      remove.setAttribute("aria-label", `Remove ${suggestion.text}`);
      remove.textContent = "Remove";
      item.append(text, remove);
      personalBreakSuggestionList.append(item);
    }
    personalBreakSuggestionEmpty.hidden = personalBreakSuggestions.length > 0;
  }

  function customBreakSuggestionsUnavailable() {
    return (
      personalBreakTimer.suggestionSource === "custom" &&
      personalBreakSuggestions.length === 0
    );
  }

  function scheduleBreakClock(status) {
    cancelBreakClockAlarm();
    cancelBreakClockAlarm = () => {};
    if (!breakClockAllowed() || status.phase !== "running") {
      return;
    }

    const delay = breakClockAlarmDelay(personalBreakClock);
    if (delay === null) {
      return;
    }
    cancelBreakClockAlarm = scheduleBrowserAlarm(
      delay + 20,
      () => paintBreakClock(),
    );
  }

  function paintBreakClock() {
    const status = breakClockStatus(personalBreakClock);
    const isDue =
      breakClockAllowed() &&
      personalEnding.kind === "none" &&
      status.phase === "due";
    for (const button of personalBreakClockButtons) {
      const isCurrent =
        button.dataset.personalBreakClock ===
        (personalBreakClock.enabled ? "on" : "off");
      button.classList.toggle("is-current", isCurrent);
      button.setAttribute("aria-pressed", String(isCurrent));
    }
    personalBreakIntervalInput.value = String(
      personalBreakClock.intervalMinutes
    );
    personalBreakStatus.textContent = formatBreakClockStatus(
      personalBreakClock
    );
    personalBreakSourceSelect.value = personalBreakTimer.suggestionSource;
    personalBreakAlert.hidden = !isDue;
    personalBreakRevealed.textContent = personalBreakClock.revealedSuggestion;
    personalBreakRevealed.hidden = !personalBreakClock.revealedSuggestion;
    personalBreakShow.hidden = Boolean(personalBreakClock.revealedSuggestion);
    personalBreakSkip.hidden = Boolean(personalBreakClock.revealedSuggestion);
    personalBreakDone.hidden = !personalBreakClock.revealedSuggestion;
    personalBreakCustomEmpty.hidden =
      !isDue ||
      Boolean(personalBreakClock.revealedSuggestion) ||
      !customBreakSuggestionsUnavailable();
    personalBreakShow.disabled = customBreakSuggestionsUnavailable();
    personalBreakAlert.classList.toggle("is-ringing", isDue);

    if (status.phase !== "due") {
      lastHandledBreakDueAt = null;
    } else if (lastHandledBreakDueAt !== personalBreakClock.dueAt) {
      if (!isDue) {
        scheduleBreakClock(status);
        return;
      }
      lastHandledBreakDueAt = personalBreakClock.dueAt;
      if (personalSound === "on") {
        try {
          playBreakClockRing();
        } catch {
          // The visual break prompt is independent from optional audio.
        }
      }
    }
    scheduleBreakClock(status);
  }

  function applyPersonalBreakTimer(value) {
    const wasDue = breakClockStatus(personalBreakClock).phase === "due";
    const previousDueAt = personalBreakClock.dueAt;
    personalBreakTimer = normalizeBreakTimerModel(value);
    personalBreakClock = personalBreakTimer.clock;
    personalBreakSuggestions = personalBreakTimer.customSuggestions;
    if (wasDue && breakClockStatus(personalBreakClock).phase !== "due") {
      stopCelebrationAudio();
    }
    if (previousDueAt !== personalBreakClock.dueAt) {
      lastHandledBreakDueAt = null;
    }
    renderCustomBreakSuggestions();
    paintBreakClock();
  }

  async function persistBreakClock(next, failureMessage) {
    const previous = personalBreakTimer;
    const nextTimer = withBreakClock(personalBreakTimer, next);
    try {
      await savePersonalBreakTimer(nextTimer);
      applyPersonalBreakTimer(nextTimer);
      showListError("");
      return true;
    } catch {
      applyPersonalBreakTimer(previous);
      showListError(
        failureMessage ||
          "CueDone could not save the break clock. Its previous setting is unchanged."
      );
      return false;
    }
  }

  async function persistBreakSuggestions(next) {
    const previous = personalBreakTimer;
    const nextTimer = withBreakSuggestions(personalBreakTimer, next);
    try {
      await savePersonalBreakTimer(nextTimer);
      applyPersonalBreakTimer(nextTimer);
      showListError("");
      return true;
    } catch {
      applyPersonalBreakTimer(previous);
      showListError(
        "CueDone could not save that break suggestion. Your suggestions are unchanged."
      );
      return false;
    }
  }

  async function persistBreakSuggestionSource(next) {
    const previous = personalBreakTimer;
    const nextTimer = withBreakSuggestionSource(personalBreakTimer, next);
    try {
      await savePersonalBreakTimer(nextTimer);
      applyPersonalBreakTimer(nextTimer);
      showListError("");
      return true;
    } catch {
      applyPersonalBreakTimer(previous);
      showListError(
        "CueDone could not save that break choice. Your previous choice is unchanged."
      );
      return false;
    }
  }

  function paintPersonalMessages() {
    const allowed = personalPrivateFeaturesAllowed(
      document.body.dataset.presentation,
      personalPresentation
    );
    const affirmationText = allowed ? formatAffirmationText(personalAffirmation) : "";
    const showEnding = endingVisible(
      personalEnding,
      document.body.dataset.presentation,
      personalPresentation,
      visibleTasks()
    );
    personalAffirmationDisplay.hidden = !affirmationText || showEnding;
    personalAffirmationDisplay.textContent = affirmationText;
    personalEndingSection.hidden = !showEnding;
    personalEndingSection.classList.toggle(
      "is-complete",
      showEnding && personalEnding.kind === "complete"
    );
    personalEndingSection.classList.toggle(
      "is-pause",
      showEnding && personalEnding.kind === "pause"
    );
    personalEndingIcon.textContent = !showEnding
      ? ""
      : personalEnding.kind === "complete"
        ? "✦"
        : "☾";
    personalEndingText.textContent = showEnding ? personalEnding.text : "";
    finishForNowButton.hidden = !finishForNowVisible({
      tasks: visibleTasks(),
      presentationMode: document.body.dataset.presentation,
      personalPresentation,
      ending: personalEnding,
    });
  }

  async function persistEnding(
    nextEnding,
    endingTasks = visibleTasks(),
    { nextBreakClock = null } = {}
  ) {
    nextEnding = bindEndingToTasks(nextEnding, endingTasks);
    const previous = personalEnding;
    const previousBreakTimer = personalBreakTimer;
    const nextBreakTimer =
      nextBreakClock === null
        ? null
        : withBreakClock(personalBreakTimer, nextBreakClock);
    applyPersonalEnding(nextEnding);
    if (nextBreakTimer !== null) {
      applyPersonalBreakTimer(nextBreakTimer);
    }
    paintPersonalMessages();
    try {
      if (nextBreakClock === null) {
        await savePersonalEnding(nextEnding);
      } else {
        await savePersonalSessionState(nextEnding, nextBreakTimer);
      }
      showListError("");
      return true;
    } catch {
      applyPersonalEnding(previous);
      if (nextBreakTimer !== null) {
        applyPersonalBreakTimer(previousBreakTimer);
      }
      paintPersonalMessages();
      showListError(
        "CueDone could not save that change. Your current message is unchanged."
      );
      return false;
    }
  }

  function clearStaleEnding(kind, clearPause = false) {
    // Private list writes clear stale completion feedback atomically. Public
    // edits never touch the Private ending, and ordinary Private edits retain
    // a deliberate pause until Continue list or an explicit lifecycle action.
    if (kind !== "private" || (!clearPause && personalEnding.kind === "pause")) {
      return;
    }

    applyPersonalEnding(clearEndingState());
    paintPersonalMessages();
  }

  function prepareListSwitch() {
    setCarryoverOpen(false);
    closePersonalFullListReview();
    input.value = "";
    restoreFocus = null;
    resetConfirming = false;
    clearPreviousCompletionState();
  }

  async function showActiveList(kind, { resetCarryover = true } = {}) {
    const revision = ++listLoadRevision;
    if (resetCarryover) {
      prepareListSwitch();
    }

    if (kind === "public") {
      tasks = [];
      tasksKind = "public";
      render();
    }

    try {
      const loaded = await loadList(kind);
      if (revision !== listLoadRevision || kind !== currentListKind()) {
        return false;
      }
      tasks = loaded;
      tasksKind = kind;
      showListError("");
      render();
      return true;
    } catch {
      if (revision !== listLoadRevision || kind !== currentListKind()) {
        return false;
      }
      if (kind === "public") {
        tasks = [];
        tasksKind = "public";
      }
      showListError(
        "CueDone could not load that list. The other list was not shown."
      );
      render();
      return false;
    }
  }

  async function requestPersonalPresentation(next) {
    const requested = nextPersonalPresentationAction(next);
    if (!requested || requested === personalPresentation) {
      paintPersonalPresentation(personalPresentation);
      return;
    }

    showListError("");
    try {
      await savePersonalPresentation(requested);
    } catch {
      paintPersonalPresentation(personalPresentation);
      showListError(
        "CueDone could not switch lists. Your current list is unchanged."
      );
    }
  }

  function setSettingsPanelOpen(isOpen) {
    const expanded = isOpen === true;
    settingsPanel.hidden = !expanded;
    settingsToggle.setAttribute("aria-expanded", String(expanded));
    settingsToggle.classList.toggle("is-open", expanded);
    settingsToggleIcon.textContent = "⚙";
    settingsToggleLabel.textContent = "Settings";
    clientSettingsDoneInline.hidden = !expanded;
  }

  function setNewListBusy(busy) {
    createNewListButton.disabled = busy;
    cancelNewListButton.disabled = busy;
    newListToggle.disabled = busy;
  }

  function renderCarryoverReview({ reset = false, message = "" } = {}) {
    const reviewTasks = visibleTasks();
    carryoverReview = refreshCarryoverReview(
      reviewTasks,
      reset ? null : carryoverReview
    );
    const selected = new Set(carryoverReview.selectedIds);
    carryoverList.replaceChildren();

    for (const task of carryoverReview.unfinished) {
      const label = document.createElement("label");
      label.className = "carryover-task";
      const checkbox = document.createElement("input");
      checkbox.className = "carryover-checkbox";
      checkbox.type = "checkbox";
      checkbox.value = task.id;
      checkbox.checked = selected.has(task.id);
      const text = document.createElement("span");
      text.className = "carryover-task-text";
      text.textContent = task.text;
      label.append(checkbox, text);
      carryoverList.append(label);
    }

    const noUnfinished = carryoverReview.unfinished.length === 0;
    carryoverList.hidden = noUnfinished;
    carryoverEmpty.hidden = !noUnfinished;
    carryoverEmpty.textContent = reviewTasks.length
      ? "All tasks are complete. The new list will start empty."
      : "There are no tasks to carry over. The new list will start empty.";
    newListStatus.textContent = message;
  }

  function setCarryoverOpen(isOpen, { reset = false } = {}) {
    carryoverOpen = isOpen === true;
    newListReview.hidden = !carryoverOpen;
    newListToggle.setAttribute("aria-expanded", String(carryoverOpen));
    newListToggle.classList.toggle("is-open", carryoverOpen);
    if (!carryoverOpen) {
      carryoverReview = null;
      newListStatus.textContent = "";
      newListError.hidden = true;
      newListError.textContent = "";
      return;
    }

    newListError.hidden = true;
    newListError.textContent = "";
    renderCarryoverReview({ reset });
  }

  function applySynchronizedTasks(nextTasks, message = "") {
    ++listLoadRevision;
    completionSnapshot = null;
    tasks = nextTasks;
    tasksKind = currentListKind();
    render();
    if (carryoverOpen) {
      renderCarryoverReview({ message });
    }
  }

  function clearPreviousCompletionState() {
    completionSnapshot = null;
    finalCelebrationActive = false;
    lastTrailPick = null;
    resetConfirming = false;
    clearCelebrationFeedback(root);
  }

  function applyCompletionStyle(style) {
    const current = style === "celebrate" ? "celebrate" : "simple";
    document.body.dataset.completionStyle = current;
    for (const button of completionStyleButtons) {
      const isCurrent = button.dataset.completionStyle === current;
      button.classList.toggle("is-current", isCurrent);
      button.setAttribute("aria-pressed", String(isCurrent));
    }
  }

  function applyCompletionSound(value) {
    const current = value === "on" ? "on" : "off";
    document.body.dataset.completionSound = current;
    const clientPreviewOn = isClientMode() && current === "on";
    finalSoundPreviewButton.disabled = !clientPreviewOn;
    taskSoundPreviewButton.disabled = !clientPreviewOn;
    for (const button of completionSoundButtons) {
      const isCurrent = button.dataset.completionSound === current;
      button.classList.toggle("is-current", isCurrent);
      button.setAttribute("aria-pressed", String(isCurrent));
    }
    syncActiveAudioGate();
  }

  function applyFinalSound(value) {
    const current = normalizeFinalSound(value);
    document.body.dataset.finalSound = current;
    finalSoundSelect.value = current;
  }

  function applyTaskSound(value) {
    const current = normalizeTaskSound(value);
    document.body.dataset.taskSound = current;
    taskSoundSelect.value = current;
  }

  function applyFinalCelebration(value) {
    const action = nextFinalCelebrationAction(value) || "random";
    document.body.dataset.finalCelebration = action;
    finalCelebrationSelect.value = action;
  }

  function captureCompletionSnapshot(id) {
    completionSnapshot = {
      id,
      tasks: snapshotTasks(tasks),
    };
  }

  function takeCompletionSnapshot(id) {
    const captured = completionSnapshot;
    completionSnapshot = null;
    if (captured && (!id || captured.id === id)) {
      return captured.tasks;
    }
    return null;
  }

  function maybeCelebrate(plan) {
    if (!plan || (!plan.playVisualCelebration && !plan.playSound)) {
      return;
    }

    const rewardText =
      plan.kind === "final" ? formatRewardReveal(currentReward()) : "";

    if (plan.kind === "final" && plan.playVisualCelebration) {
      finalCelebrationActive = true;
      updateResetAction();
      const trail = pickFinalTrail(
        document.body.dataset.finalCelebration,
        lastTrailPick
      );
      lastTrailPick = trail;
      showFinalTrail({
        trail: plan.playTrail ? trail : null,
        container: root,
        onDone: () => {
          showCelebration({
            kind: "final",
            playSound: false,
            rewardText,
            onDone: () => {
              finalCelebrationActive = false;
              updateResetAction();
            },
          });
        },
      });
      return;
    }

    showCelebration({
      kind: plan.kind,
      playSound: false,
      rewardText,
    });
  }

  function currentReward() {
    return normalizeReward({
      id: rewardSelect.value,
      customText: rewardCustomInput.value,
    });
  }

  function applyReward(reward, { skipCustomValue = false } = {}) {
    const next = normalizeReward(reward);
    rewardSelect.value = next.id;
    if (!skipCustomValue) {
      rewardCustomInput.value = next.customText;
    }
    const shown = {
      id: next.id,
      customText: skipCustomValue ? rewardCustomInput.value : next.customText,
    };
    const editorOpen = rewardEditorVisible(shown, rewardEditing);
    const cardText = formatRewardCard(shown);
    const showCustom = editorOpen && rewardShowsCustomInput(shown);

    rewardSetup.hidden = !editorOpen;
    rewardCustomInput.hidden = !showCustom;
    rewardValue.hidden = !rewardCardVisible(shown);
    rewardValue.textContent = cardText;
    rewardEdit.hidden = !rewardEditVisible(shown, rewardEditing);
    rewardHeading.textContent = editorOpen || !cardText ? "Reward" : "When we’re finished";
    motivatorSection.classList.toggle("has-value", Boolean(cardText));
    motivatorSection.classList.toggle("is-editing", editorOpen);
    motivatorSection.classList.toggle("is-custom", showCustom);
  }

  function persistReward() {
    const value = currentReward();
    function restoreReward(reward) {
      savedReward = normalizeReward(reward);
      rewardEditing = initialRewardEditing(savedReward);
      applyReward(savedReward);
    }
    void saveSetting({
      save: saveReward,
      load: loadReward,
      value,
      // Successful saves must not collapse the Custom editor while typing.
      commit: (reward) => { savedReward = normalizeReward(reward); },
      apply: restoreReward,
      restore: () => restoreReward(savedReward),
    });
  }

  function updateClientChrome() {
    const client = isClientMode();
    const progress = taskProgress(visibleTasks());
    const label = formatProgressLabel(progress);

    progressSection.hidden = !client;
    motivatorSection.hidden = !client;
    progressLabel.textContent = label;
    progressFill.style.width = `${progress.percent}%`;
    progressTrack.setAttribute("aria-valuenow", String(progress.complete));
    progressTrack.setAttribute("aria-valuemax", String(progress.total));
    progressTrack.setAttribute("aria-label", label);
    applyReward(currentReward(), { skipCustomValue: true });
  }

  function updateResetAction() {
    const shown = visibleTasks();
    const canReset = resetListVisible({
      tasks: shown,
      presentation: document.body.dataset.presentation,
      style: document.body.dataset.completionStyle,
      finalCelebrationActive,
    });
    if (!canResetList(shown)) {
      resetConfirming = false;
      finalCelebrationActive = false;
    }

    resetSection.hidden = !canReset;
    resetButton.hidden = !canReset || resetConfirming;
    resetConfirm.hidden = !canReset || !resetConfirming;
  }

  async function persist(nextTasks, { clearEnding = false } = {}) {
    const previous = tasks;
    const previousKind = tasksKind;
    const kind = currentListKind();
    tasks = nextTasks;
    tasksKind = kind;
    render();
    const resumedBreakClock =
      clearEnding && breakClockAllowed()
        ? resumeBreakClock(personalBreakClock)
        : null;
    const resumedBreakTimer =
      resumedBreakClock === null
        ? null
        : withBreakClock(personalBreakTimer, resumedBreakClock);
    try {
      await saveList(kind, tasks, {
        clearEnding,
        breakTimer: resumedBreakTimer,
      });
      if (resumedBreakTimer !== null) {
        applyPersonalBreakTimer(resumedBreakTimer);
      }
      showListError("");
      clearStaleEnding(kind, clearEnding);
    } catch {
      tasks = previous;
      tasksKind = previousKind;
      render();
      showListError(
        "CueDone could not save that change. Your current list is unchanged."
      );
    }
  }

  function render() {
    const shown = visibleTasks();
    const oneActive = oneActiveLayoutEnabled();
    const oneActiveState = personalOneActiveState(shown, {
      reviewAll: personalFullListOpen,
    });
    const renderedTasks = oneActive ? oneActiveState.visibleTasks : shown;
    emptyState.textContent = emptyStateCopy(currentListKind());
    emptyState.hidden = shown.length > 0;
    list.replaceChildren();
    const currentId = nextUnfinishedTask(shown)?.id;

    personalOneActive.hidden = !oneActive;
    personalOneActiveKicker.textContent = oneActiveState.activeTask
      ? "NOW"
      : oneActiveState.progress.total
        ? "COMPLETE"
        : "READY";
    personalOneActiveProgress.textContent = formatProgressLabel(
      oneActiveState.progress
    );
    personalOneActiveWaiting.textContent = formatWaitingTaskCount(
      oneActiveState.waiting
    );
    personalOneActiveTrack.setAttribute(
      "aria-valuenow",
      String(oneActiveState.progress.complete)
    );
    personalOneActiveTrack.setAttribute(
      "aria-valuemax",
      String(oneActiveState.progress.total)
    );
    personalOneActiveTrack.setAttribute(
      "aria-label",
      formatProgressLabel(oneActiveState.progress)
    );
    personalOneActiveFill.style.width = `${oneActiveState.progress.percent}%`;
    personalFullListToggle.hidden = oneActiveState.progress.total === 0;
    personalFullListToggle.textContent = personalFullListOpen
      ? oneActiveState.activeTask
        ? "Show current task"
        : "Close full list"
      : "Review full list";
    personalFullListToggle.setAttribute(
      "aria-expanded",
      String(personalFullListOpen)
    );

    const visualTheme = normalizeVisualTheme(personalVisualTheme);
    const basePlantVisible = isPlantVisible({
      tasks: shown,
      presentationMode: document.body.dataset.presentation,
      personalPresentation,
      layout: personalTaskLayout,
      theme: personalPlantTheme,
    });
    const isFishermanSelected = visualTheme === "fisherman" || visualTheme === "zen-terrarium";
    const fishermanGateVisible = (() => {
      if (!isFishermanSelected) return false;
      const isPrivate = document.body.dataset.presentation === "personal" && personalPresentation === "private";
      const isLayout = personalTaskLayout === "one-active" || personalTaskLayout === "one_active" || personalTaskLayout === "full-list" || personalTaskLayout === "full_list";
      if (!isPrivate || !isLayout) return false;
      const p = oneActiveState.progress;
      const total = Number(p?.total) || 0;
      return total > 0;
    })();
    const plantVisible = isFishermanSelected ? fishermanGateVisible : basePlantVisible;
    function themeStage(theme, progress) {
      switch (theme) {
        case "gumball": return { stage: gumballStageFromProgress(progress), desc: describeGumballStage(progress) };
        case "constellation": return { stage: constellationStageFromProgress(progress), desc: describeConstellationStage(progress) };
        case "mountain": return { stage: mountainStageFromProgress(progress), desc: describeMountainStage(progress) };
        case "dynamite": return { stage: dynamiteStageFromProgress(progress), desc: describeDynamiteStage(progress) };
        case "coffee": return { stage: coffeeStageFromProgress(progress), desc: describeCoffeeStage(progress) };
        case "battery": return { stage: batteryStageFromProgress(progress), desc: describeBatteryStage(progress) };
        case "aquarium": return { stage: aquariumStageFromProgress(progress), desc: describeAquariumStage(progress) };
        case "kite":
        case "animal-puzzle": return { stage: kiteStageFromProgress(progress), desc: describeKiteStage(progress) };
        case "rocket": return { stage: rocketStageFromProgress(progress), desc: describeRocketStage(progress) };
        case "fisherman": return { stage: fishermanStateFromProgress(progress)?.stage ?? null, desc: describeFishermanStage(progress) };
        case "zen-terrarium": return { stage: fishermanStateFromProgress(progress)?.stage ?? null, desc: describeFishermanStage(progress) };
        default: return { stage: plantStageFromProgress(progress), desc: describePlantStage(progress) };
      }
    }
    const themePair = plantVisible ? themeStage(visualTheme, oneActiveState.progress) : { stage: null, desc: null };
    const activeStage = themePair.stage;
    const activeDesc = themePair.desc;

    const isPlant = visualTheme === "plant";
    const allVisuals = [
      [personalGumballVisual, "gumball"],
      [personalConstellationVisual, "constellation"],
      [personalMountainVisual, "mountain"],
      [personalDynamiteVisual, "dynamite"],
      [personalCoffeeVisual, "coffee"],
      [personalBatteryVisual, "battery"],
      [personalAquariumVisual, "aquarium"],
      [personalKiteVisual, "kite"],
      [personalRocketVisual, "rocket"],
      [personalFishermanVisual, "fisherman"],
      [personalZenTerrariumVisual, "zen-terrarium"],
    ];
    const allEntryVisuals = [
      [personalGumballVisualEntry, "gumball"],
      [personalConstellationVisualEntry, "constellation"],
      [personalMountainVisualEntry, "mountain"],
      [personalDynamiteVisualEntry, "dynamite"],
      [personalCoffeeVisualEntry, "coffee"],
      [personalBatteryVisualEntry, "battery"],
      [personalAquariumVisualEntry, "aquarium"],
      [personalKiteVisualEntry, "kite"],
      [personalRocketVisualEntry, "rocket"],
      [personalFishermanVisualEntry, "fisherman"],
      [personalZenTerrariumVisualEntry, "zen-terrarium"],
    ];
    const flatAllVisuals = [[personalPlantVisual, "plant"], [personalGumballVisual, "gumball"], [personalConstellationVisual, "constellation"], [personalMountainVisual, "mountain"], [personalDynamiteVisual, "dynamite"], [personalCoffeeVisual, "coffee"], [personalBatteryVisual, "battery"], [personalAquariumVisual, "aquarium"], [personalKiteVisual, "kite"], [personalRocketVisual, "rocket"], [personalFishermanVisual, "fisherman"], [personalZenTerrariumVisual, "zen-terrarium"]];
    const flatEntryVisuals = [[personalPlantVisualEntry, "plant"], [personalGumballVisualEntry, "gumball"], [personalConstellationVisualEntry, "constellation"], [personalMountainVisualEntry, "mountain"], [personalDynamiteVisualEntry, "dynamite"], [personalCoffeeVisualEntry, "coffee"], [personalBatteryVisualEntry, "battery"], [personalAquariumVisualEntry, "aquarium"], [personalKiteVisualEntry, "kite"], [personalRocketVisualEntry, "rocket"], [personalFishermanVisualEntry, "fisherman"], [personalZenTerrariumVisualEntry, "zen-terrarium"]];
    const isFishermanForPlant = visualTheme === "fisherman" || visualTheme === "zen-terrarium";
    personalPlant.hidden = !plantVisible || activeStage == null || (!oneActive && !isFishermanForPlant);
    if (plantVisible && activeStage != null && activeDesc && (oneActive || isFishermanForPlant)) {
      personalPlant.dataset.visualTheme = visualTheme;
      document.body.dataset.personalVisualTheme = visualTheme;
      for (const [el, key] of flatAllVisuals) if (el) { el.hidden = key !== visualTheme; if (key === visualTheme) { el.dataset.stage = String(activeStage); el.setAttribute("aria-label", activeDesc.accessibleText); if (key === "plant") el.dataset.bloom = activeStage === PLANT_STAGE_COUNT - 1 ? "true" : "false"; } else { el.removeAttribute("data-stage"); el.removeAttribute("data-bloom"); el.setAttribute("aria-label", ""); } }
      personalPlantStatus.textContent = activeDesc.accessibleText;
    } else {
      for (const [el] of flatAllVisuals) if (el) { el.removeAttribute("data-stage"); el.removeAttribute("data-bloom"); el.setAttribute("aria-label", ""); el.hidden = el === personalPlantVisual ? false : true; }
      personalPlantStatus.textContent = "";
      personalPlantVisual.hidden = false;
      for (const [el,key] of flatAllVisuals) if (el && key!=="plant") el.hidden = true;
    }

    const shouldHideForEntry = !oneActive && plantVisible && activeStage != null && entryOpen;
    const entryPlantVisible = !oneActive && plantVisible && !shouldHideForEntry;
    personalPlantEntry.hidden = !entryPlantVisible || activeStage == null;
    // Suppress completion animation when graphic reappears after entry form
    if (shouldHideForEntry) {
      previousEntryHiddenDueToEntry = true;
      personalPlantEntry.classList.remove("suppress-animations");
    } else if (previousEntryHiddenDueToEntry && entryPlantVisible && activeStage != null) {
      suppressNextEntryVisual = true;
      previousEntryHiddenDueToEntry = false;
      personalPlantEntry.classList.add("suppress-animations");
      const entryEl = personalPlantEntry;
      if (typeof globalThis.requestAnimationFrame === "function") {
        globalThis.requestAnimationFrame(() => {
          globalThis.requestAnimationFrame(() => {
            entryEl.classList.remove("suppress-animations");
            suppressNextEntryVisual = false;
          });
        });
      } else {
        // Fallback: keep suppressed for this render only, clear next tick
        suppressNextEntryVisual = false;
        entryEl.classList.remove("suppress-animations");
      }
    } else {
      previousEntryHiddenDueToEntry = shouldHideForEntry;
      if (!shouldHideForEntry) {
        personalPlantEntry.classList.remove("suppress-animations");
      }
    }
    if (entryPlantVisible && activeStage != null && activeDesc) {
      personalPlantEntry.dataset.visualTheme = visualTheme;
      for (const [el, key] of flatEntryVisuals) if (el) { el.hidden = key !== visualTheme; if (key === visualTheme) { el.dataset.stage = String(activeStage); el.setAttribute("aria-label", activeDesc.accessibleText); if (key === "plant") el.dataset.bloom = activeStage === PLANT_STAGE_COUNT - 1 ? "true" : "false"; } else { el.removeAttribute("data-stage"); el.removeAttribute("data-bloom"); el.setAttribute("aria-label", ""); } }
      personalPlantStatusEntry.textContent = activeDesc.accessibleText;
    } else {
      for (const [el] of flatEntryVisuals) if (el) { el.removeAttribute("data-stage"); el.removeAttribute("data-bloom"); el.setAttribute("aria-label", ""); el.hidden = el === personalPlantVisualEntry ? false : true; }
      personalPlantStatusEntry.textContent = "";
      if (personalPlantVisualEntry) personalPlantVisualEntry.hidden = false;
      for (const [el,key] of flatEntryVisuals) if (el && key!=="plant") el.hidden = true;
    }

    // --- Gumball: classic machine — one ball per completed task, final dispense ---
    const gumballProgress = oneActiveState.progress;
    const isGumballTheme = visualTheme === "gumball";
    const gumballActive = plantVisible && activeStage != null;
    if (gumballActive && isGumballTheme) {
      if (oneActive) syncGumballVisual(personalGumballVisual, gumballProgress, isFirstGumballRender);
      if (entryPlantVisible) syncGumballVisual(personalGumballVisualEntry, gumballProgress, isFirstGumballRender);
    } else {
      for (const el of [personalGumballVisual, personalGumballVisualEntry]) {
        if (!el) continue;
        const wrap = el.querySelector(".gumball-balls");
        if (wrap) wrap.replaceChildren();
        el.classList.remove("is-final");
      }
    }
    if (gumballActive) {
      previousGumballComplete = Number(gumballProgress.complete) || 0;
      previousGumballWasFinal = gumballProgress.total > 0 && gumballProgress.complete >= gumballProgress.total;
      if (isGumballTheme) isFirstGumballRender = false;
    } else if (activeStage == null) {
      previousGumballComplete = 0;
      previousGumballWasFinal = false;
    }

    // --- Dynamite: continuous fuse proportional to completed/total, bundle shake + burst on final ---
    const isDynamiteTheme = visualTheme === "dynamite";
    const dynamiteActive = plantVisible && activeStage != null;
    if (isDynamiteTheme && dynamiteActive) {
      if (oneActive) syncDynamiteVisual(personalDynamiteVisual, oneActiveState.progress);
      if (entryPlantVisible) syncDynamiteVisual(personalDynamiteVisualEntry, oneActiveState.progress);
    }
    const dynamiteIsFinal = dynamiteActive && activeStage === 4;
    const shouldBurst = isDynamiteTheme && dynamiteActive && dynamiteIsFinal && !isFirstDynamiteRender && previousDynamiteStage !== 4 && !prefersReducedMotion();
    if (isDynamiteTheme && dynamiteActive) {
      for (const el of [personalDynamiteVisual, personalDynamiteVisualEntry]) {
        if (!el) continue;
        if (shouldBurst) {
          el.classList.remove("is-burst");
          void el.offsetWidth;
          el.classList.add("is-burst");
        } else if (!dynamiteIsFinal) {
          el.classList.remove("is-burst");
        }
      }
    } else {
      for (const el of [personalDynamiteVisual, personalDynamiteVisualEntry]) el?.classList.remove("is-burst");
    }
    if (dynamiteActive) {
      previousDynamiteStage = activeStage;
      if (isDynamiteTheme) isFirstDynamiteRender = false;
    } else if (activeStage == null) {
      previousDynamiteStage = null;
      isFirstDynamiteRender = true;
      for (const el of [personalDynamiteVisual, personalDynamiteVisualEntry]) el?.classList.remove("is-burst");
    } else if (!isDynamiteTheme) {
      previousDynamiteStage = activeStage;
    }

    // --- Fisherman: idle vs catch vs giant-fish finale ---
    const isFishermanTheme = visualTheme === "fisherman";
    const fishermanActive = plantVisible && activeStage != null;
    if (isFishermanTheme && fishermanActive) {
      if (oneActive) syncFishermanVisual(personalFishermanVisual, oneActiveState.progress, isFirstFishermanRender);
      if (entryPlantVisible) syncFishermanVisual(personalFishermanVisualEntry, oneActiveState.progress, isFirstFishermanRender);
    } else {
      for (const el of [personalFishermanVisual, personalFishermanVisualEntry]) {
        if (!el) continue;
        const sc = el.querySelector(".fisherman-scene");
        if (sc) { sc.classList.remove("is-finale", "is-catching"); sc.dataset.basket = "0"; sc.dataset.stage = "0"; }
      }
    }
    if (fishermanActive) {
      const fp = oneActiveState.progress;
      previousFishermanComplete = Number(fp.complete) || 0;
      previousFishermanWasFinal = !!(fp.total > 0 && fp.complete >= fp.total);
      if (isFishermanTheme) isFirstFishermanRender = false;
    } else if (activeStage == null) {
      previousFishermanComplete = null;
      previousFishermanWasFinal = false;
      isFirstFishermanRender = true;
    }

    // --- Coffee: continuous carafe/mug levels, no machine/button ---
    const isCoffeeTheme = visualTheme === "coffee";
    const coffeeActive = plantVisible && activeStage != null;
    if (isCoffeeTheme && coffeeActive) {
      if (oneActive) syncCoffeeVisual(personalCoffeeVisual, oneActiveState.progress);
      if (entryPlantVisible) syncCoffeeVisual(personalCoffeeVisualEntry, oneActiveState.progress);
    } else {
      // Ensure no stale pouring/steaming when hidden or other theme
      for (const el of [personalCoffeeVisual, personalCoffeeVisualEntry]) {
        if (!el) continue;
        el.classList.remove("is-steaming");
        const s = el.querySelector(".pour-stream");
        if (s) s.classList.remove("is-pouring");
      }
    }

    renderedTasks.forEach((task) => {
      const index = shown.findIndex((item) => item.id === task.id);
      const item = document.createElement("li");
      const checkboxId = `task-${task.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
      item.className = `task-item${task.completed ? " is-complete" : ""}${
        task.id === currentId ? " is-current-task" : ""
      }${oneActive && !personalFullListOpen ? " is-one-active-card" : ""}`;
      item.dataset.id = task.id;

      item.innerHTML = `
        <span class="drag-handle" draggable="true" title="Drag to reorder" aria-label="Drag to reorder">⋮⋮</span>
        <label class="task-label" for="${checkboxId}">
          <input
            id="${checkboxId}"
            class="task-checkbox"
            type="checkbox"
            ${task.completed ? "checked" : ""}
          />
          <span class="task-text"></span>
        </label>
        <div class="task-actions">
          <button class="icon-button move-up" type="button" aria-label="Move task up" ${index === 0 ? "disabled" : ""}>↑</button>
          <button class="icon-button move-down" type="button" aria-label="Move task down" ${index === shown.length - 1 ? "disabled" : ""}>↓</button>
          <button class="icon-button delete-button" type="button" aria-label="Delete task">×</button>
        </div>
        ${oneActive && !personalFullListOpen ? '<button class="one-active-complete-button" type="button">Complete</button>' : ""}
      `;

      item.querySelector(".task-text").textContent = task.text;
      list.append(item);
    });

    updatePersonalChrome();
    updateClientChrome();
    updateResetAction();

    if (!restoreFocus) {
      return;
    }

    const targetItem = list.querySelector(`[data-id="${restoreFocus.id}"]`);
    const target = targetItem?.querySelector(restoreFocus.selector);
    target?.focus();
    restoreFocus = null;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const shown = visibleTasks();
    const next = addTask(shown, input.value);
    if (next === shown) {
      return;
    }

    input.value = "";
    restoreFocus = null;
    await persist(next);
    input.focus();
  });

  resetButton.addEventListener("click", () => {
    if (!canResetList(visibleTasks())) {
      return;
    }

    resetConfirming = true;
    updateResetAction();
    resetConfirmButton.focus();
  });

  resetCancelButton.addEventListener("click", () => {
    resetConfirming = false;
    updateResetAction();
    resetButton.focus();
  });

  resetConfirmButton.addEventListener("click", async () => {
    const shown = visibleTasks();
    const next = resetCompletedTasks(shown);
    if (next === shown) {
      return;
    }

    resetConfirming = false;
    restoreFocus = {
      id: next[0].id,
      selector:
        oneActiveLayoutEnabled() && !personalFullListOpen
          ? ".one-active-complete-button"
          : ".task-checkbox",
    };
    await persist(next, { clearEnding: true });
  });

  newListToggle.addEventListener("click", () => {
    const opening = newListToggle.getAttribute("aria-expanded") !== "true";
    setCarryoverOpen(opening, { reset: opening });
    if (opening) {
      const firstChoice = carryoverList.querySelector(".carryover-checkbox");
      (firstChoice || createNewListButton).focus();
    }
  });

  carryoverList.addEventListener("change", (event) => {
    const checkbox = event.target.closest(".carryover-checkbox");
    if (!checkbox || !carryoverReview) {
      return;
    }

    const selected = new Set(carryoverReview.selectedIds);
    if (checkbox.checked) {
      selected.add(checkbox.value);
    } else {
      selected.delete(checkbox.value);
    }
    carryoverReview = {
      ...carryoverReview,
      selectedIds: carryoverReview.knownIds.filter((id) => selected.has(id)),
    };
    newListStatus.textContent = selected.size
      ? ""
      : "No tasks selected. The new list will start empty.";
  });

  cancelNewListButton.addEventListener("click", () => {
    setCarryoverOpen(false);
    newListToggle.focus();
  });

  createNewListButton.addEventListener("click", async () => {
    if (newListSaveInProgress || !carryoverReview) {
      return;
    }

    newListError.hidden = true;
    newListError.textContent = "";
    newListStatus.textContent = "Saving new list…";
    setNewListBusy(true);
    newListSaveInProgress = true;
    pendingSynchronizedTasks = null;

    const kind = currentListKind();
    const resumedBreakClock = breakClockAllowed()
      ? resumeBreakClock(personalBreakClock)
      : null;
    const resumedBreakTimer =
      resumedBreakClock === null
        ? null
        : withBreakClock(personalBreakTimer, resumedBreakClock);
    const result = await saveNewListFromReview({
      reviewedTasks: snapshotTasks(visibleTasks()),
      selectedIds: carryoverReview.selectedIds,
      loadTasks: () => loadList(kind),
      saveTasks: (next) =>
        saveList(kind, next, {
          clearEnding: true,
          breakTimer: resumedBreakTimer,
        }),
    });

    newListSaveInProgress = false;
    setNewListBusy(false);

    if (result.status === "stale") {
      const synchronized =
        pendingSynchronizedKind === kind ? pendingSynchronizedTasks : null;
      pendingSynchronizedTasks = null;
      pendingSynchronizedKind = null;
      applySynchronizedTasks(
        synchronized && !taskListsMatch(synchronized, result.tasks)
          ? synchronized
          : result.tasks,
        "Tasks changed in another view. Review the refreshed list before creating."
      );
      return;
    }

    if (result.status === "failure") {
      if (pendingSynchronizedTasks && pendingSynchronizedKind === kind) {
        const synchronized = pendingSynchronizedTasks;
        pendingSynchronizedTasks = null;
        pendingSynchronizedKind = null;
        applySynchronizedTasks(
          synchronized,
          "Tasks changed in another view. Review the refreshed list before trying again."
        );
      } else {
        newListStatus.textContent = "";
      }
      newListError.textContent =
        "CueDone could not save the new list. Your current list is unchanged. Try again.";
      newListError.hidden = false;
      return;
    }

    const synchronized =
      pendingSynchronizedKind === kind ? pendingSynchronizedTasks : null;
    pendingSynchronizedTasks = null;
    pendingSynchronizedKind = null;
    const nextTasks =
      synchronized && !taskListsMatch(synchronized, result.tasks)
        ? synchronized
        : result.tasks;
    clearPreviousCompletionState();
    closePersonalFullListReview();
    setCarryoverOpen(false);
    tasks = nextTasks;
    tasksKind = kind;
    restoreFocus = null;
    if (
      personalAffirmation.enabled &&
      personalAffirmation.choice === "random"
    ) {
      const nextAffirmation = refreshRandomAffirmation(personalAffirmation);
      applyPersonalAffirmation(nextAffirmation);
      savePersonalAffirmation(nextAffirmation).catch(() => {});
    }
    clearStaleEnding(kind, true);
    if (resumedBreakTimer !== null) {
      applyPersonalBreakTimer(resumedBreakTimer);
    }
    render();
    applyEntryMode(true);
    saveTaskEntryOpen(true).catch(() => {});
    input.focus();
  });

  doneButton.addEventListener("click", async () => {
    const previous = entryOpen;
    if (await saveSetting({ save: saveTaskEntryOpen, load: loadTaskEntryOpen,
      value: false, apply: applyEntryMode, restore: () => applyEntryMode(previous) })) {
      addToggle.focus();
    }
  });

  addToggle.addEventListener("click", async () => {
    const previous = entryOpen;
    if (await saveSetting({ save: saveTaskEntryOpen, load: loadTaskEntryOpen,
      value: true, apply: applyEntryMode, restore: () => applyEntryMode(previous) })) {
      input.focus();
    }
  });

  list.addEventListener("change", async (event) => {
    const checkbox = event.target.closest(".task-checkbox");
    if (!checkbox) {
      return;
    }

    const id = event.target.closest(".task-item")?.dataset.id;
    if (!id) {
      return;
    }

    const oneActiveCompletion = oneActiveLayoutEnabled() && !personalFullListOpen;
    restoreFocus = { id, selector: ".task-checkbox" };
    const snapshot = takeCompletionSnapshot(id);
    const kind = currentListKind();
    const previous = tasks;
    const previousKind = tasksKind;
    const { nextTasks, plan } = planFromCheckboxCompletion({
      snapshot,
      liveTasks: visibleTasks(),
      id,
      completed: checkbox.checked,
      presentation: document.body.dataset.presentation,
      style: document.body.dataset.completionStyle,
      sound: document.body.dataset.completionSound,
    });
    if (oneActiveCompletion) {
      const nextActive = nextUnfinishedTask(nextTasks);
      restoreFocus = nextActive
        ? { id: nextActive.id, selector: ".one-active-complete-button" }
        : null;
    }
    if (plan?.kind === "final" && plan.playVisualCelebration) {
      finalCelebrationActive = true;
    }
    if (plan?.playSound) {
      if (plan.kind === "final") {
        playCelebrationSound("final", document.body.dataset.finalSound);
      } else {
        playTaskSound(document.body.dataset.taskSound);
      }
    }
    const personalAudio = planPersonalPrivateAudio({
      snapshot,
      liveTasks: visibleTasks(),
      id,
      completed: checkbox.checked,
      presentationMode: document.body.dataset.presentation,
      personalPresentation,
      sound: personalSound,
    });
    // Fix intermediate cane pole yank: trigger animation FIRST before any DOM re-render, do not destroy/re-inject SVG markup — keep data state but prevent UI re-render swapping #fisherman-rig until 1100ms
    {
      const total = nextTasks.length;
      const complete = nextTasks.filter((t) => t.completed).length;
      const isIntermediate = checkbox.checked && total > 1 && complete > 0 && complete < total;
      if (isIntermediate && !prefersReducedMotion()) {
        // Trigger on SVG rig/pole element immediately; update checkbox UI state without re-rendering outer SVG container
        // Keep SVG markup intact — render() only updates list, not fishermanScene markup; grouped rig keeps line anchored to tip 82,8; 1100ms bounce overshoot 1.28
        const rig = document.getElementById('fisherman-rig');
        if (rig) {
          rig.classList.remove('pole-yanking');
          void rig.offsetWidth; // Force DOM reflow so CSS animation restarts from 0%
          rig.classList.add('pole-yanking');
        }
        const armsRig = document.getElementById('fisherman-arms-rig');
        if (armsRig) {
          armsRig.classList.remove('is-yanking');
          void armsRig.offsetWidth; // Force DOM reflow so CSS animation restarts from 0%
          armsRig.classList.add('is-yanking');
        }
        {
          const rig = document.getElementById('fisherman-arms-rig');
          if (rig) {
            rig.classList.remove('is-yanking');
            void rig.offsetWidth; // Force reflow
            rig.classList.add('is-yanking');
          }
        }
        document.querySelectorAll("#fisherman-rig, .fisherman-rig, .fisherman-pole, .fisherman-pole-group, .fisherman-cane, #fisherman-arms-rig, .fisherman-arms-rig").forEach((p) => {
          p.classList.remove("pole-yanking");
          void p.offsetWidth;
          p.classList.add("pole-yanking");
          setTimeout(() => p.classList.remove("pole-yanking"), 1100);
        });
        // also handle is-yanking for arms rig via pole-yanking wrapper
        document.querySelectorAll("#fisherman-arms-rig").forEach((p) => {
          p.classList.remove('is-yanking');
          void p.offsetWidth;
          p.classList.add('is-yanking');
          setTimeout(() => p.classList.remove('is-yanking'), 850);
        });
      }
    }
    tasks = nextTasks;
    tasksKind = kind;
    render();
    maybeCelebrate(plan);
    try {
      await saveList(kind, tasks);
      showListError("");
      playPersonalPrivateAudio(personalAudio);
      if (
        personalPrivateFeaturesAllowed(
          document.body.dataset.presentation,
          personalPresentation
        ) &&
        checkbox.checked &&
        personalEnding.kind !== "pause" &&
        isCompletedList(nextTasks)
      ) {
        await persistEnding(
          createEndingState("complete", personalCompleteMessage),
          nextTasks
        );
      } else {
        clearStaleEnding(kind);
      }
    } catch {
      tasks = previous;
      tasksKind = previousKind;
      if (oneActiveCompletion) {
        restoreFocus = { id, selector: ".one-active-complete-button" };
      }
      clearPreviousCompletionState();
      render();
      showListError(
        "CueDone could not save that change. Your current list is unchanged."
      );
    }
  });

  list.addEventListener("click", async (event) => {
    const item = event.target.closest(".task-item");
    if (!item) {
      return;
    }

    const shown = visibleTasks();
    const fromIndex = shown.findIndex((task) => task.id === item.dataset.id);
    if (fromIndex === -1) {
      return;
    }

    if (event.target.closest(".one-active-complete-button")) {
      const checkbox = item.querySelector(".task-checkbox");
      if (checkbox && !checkbox.checked) {
        captureCompletionSnapshot(item.dataset.id);
        checkbox.checked = true;
        checkbox.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return;
    }

    if (event.target.closest(".delete-button")) {
      restoreFocus = null;
      await persist(deleteTask(shown, item.dataset.id));
      (entryOpen ? input : addToggle).focus();
      return;
    }

    if (event.target.closest(".move-up")) {
      restoreFocus = { id: item.dataset.id, selector: ".move-up" };
      await persist(reorderTasks(shown, fromIndex, fromIndex - 1));
      return;
    }

    if (event.target.closest(".move-down")) {
      restoreFocus = { id: item.dataset.id, selector: ".move-down" };
      await persist(reorderTasks(shown, fromIndex, fromIndex + 1));
    }
  });

  list.addEventListener("dragstart", (event) => {
    const handle = event.target.closest(".drag-handle");
    const item = event.target.closest(".task-item");
    if (!handle || !item) {
      event.preventDefault();
      return;
    }

    draggedId = item.dataset.id;
    item.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedId);
  });

  list.addEventListener("dragend", (event) => {
    event.target.closest(".task-item")?.classList.remove("is-dragging");
    draggedId = null;
  });

  list.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  });

  list.addEventListener("drop", async (event) => {
    event.preventDefault();
    const target = event.target.closest(".task-item");
    if (!target || !draggedId) {
      return;
    }

    const shown = visibleTasks();
    const fromIndex = shown.findIndex((task) => task.id === draggedId);
    const toIndex = shown.findIndex((task) => task.id === target.dataset.id);
    draggedId = null;

    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    await persist(reorderTasks(shown, fromIndex, toIndex));
  });

  onListChanged((kind, nextTasks) => {
    if (kind !== currentListKind()) {
      return;
    }

    if (newListSaveInProgress) {
      pendingSynchronizedTasks = nextTasks;
      pendingSynchronizedKind = kind;
      return;
    }

    applySynchronizedTasks(
      nextTasks,
      carryoverOpen ? "Tasks changed. Carryover choices were refreshed." : ""
    );
  });

  onTaskEntryOpenChanged((isOpen) => {
    applyEntryMode(isOpen);
  });

  settingsToggle.addEventListener("click", () => {
    setSettingsPanelOpen(
      settingsToggle.getAttribute("aria-expanded") !== "true"
    );
  });

  clientSettingsDone.addEventListener("click", () => {
    setSettingsPanelOpen(false);
  });

  clientSettingsDoneInline.addEventListener("click", () => {
    setSettingsPanelOpen(false);
  });

  personalSettingsToggle.addEventListener("click", () => {
    setPersonalSettingsPanelOpen(
      personalSettingsToggle.getAttribute("aria-expanded") !== "true"
    );
  });

  for (const button of personalPresentationButtons) {
    button.addEventListener("click", () => {
      void requestPersonalPresentation(button.dataset.personalPresentation);
    });
  }

  for (const button of personalTaskLayoutButtons) {
    button.addEventListener("click", () => {
      if (
        !personalPrivateFeaturesAllowed(
          document.body.dataset.presentation,
          personalPresentation
        )
      ) {
        return;
      }

      const action = nextPersonalTaskLayoutAction(
        button.dataset.personalTaskLayout
      );
      if (!action || action === personalTaskLayout) {
        paintPersonalTaskLayout(personalTaskLayout);
        return;
      }

      const previous = personalTaskLayout;
      void saveSetting({
        save: savePersonalTaskLayout,
        load: loadPersonalTaskLayout,
        value: action,
        apply: (value) => {
          applyPersonalTaskLayout(value);
          updatePersonalChrome();
          render();
        },
        restore: () => {
          applyPersonalTaskLayout(previous);
          updatePersonalChrome();
          render();
        },
      });
    });
  }

  for (const button of personalPlantThemeButtons) {
    button.addEventListener("click", () => {
      if (
        !personalPrivateFeaturesAllowed(
          document.body.dataset.presentation,
          personalPresentation
        )
      ) {
        return;
      }

      const next = normalizePlantTheme(
        button.dataset.personalPlantTheme
      );
      if (!next || next === personalPlantTheme) {
        paintPersonalPlantTheme(personalPlantTheme);
        return;
      }

      const previous = personalPlantTheme;
      void saveSetting({
        save: savePersonalPlantTheme,
        load: loadPersonalPlantTheme,
        value: next,
        apply: (value) => {
          applyPersonalPlantTheme(value);
          updatePersonalChrome();
          render();
        },
        restore: () => {
          applyPersonalPlantTheme(previous);
          updatePersonalChrome();
          render();
        },
      });
    });
  }

  if (personalVisualThemeSelect) {
    personalVisualThemeSelect.addEventListener("change", () => {
      const next = normalizeVisualTheme(personalVisualThemeSelect.value);
      if (next === personalVisualTheme) {
        paintPersonalVisualTheme(next);
        return;
      }

      const previous = personalVisualTheme;
      void saveSetting({
        save: savePersonalVisualTheme,
        load: loadPersonalVisualTheme,
        value: next,
        apply: (value) => {
          applyPersonalVisualTheme(value);
          render();
        },
        restore: () => {
          applyPersonalVisualTheme(previous);
          render();
        },
      });
    });
  }

  personalFullListToggle.addEventListener("click", () => {
    if (!oneActiveLayoutEnabled()) {
      return;
    }

    personalFullListOpen = !personalFullListOpen;
    render();
  });

  onPresentationModeChanged((next) => {
    applyPresentationMode(next);
    applyActiveAudioForView();
    const kind = currentListKind();
    if (kind !== tasksKind) {
      void showActiveList(kind);
      return;
    }

    if (!oneActiveLayoutEnabled()) {
      closePersonalFullListReview();
    }
    render();
  });

  onPersonalPresentationChanged((next) => {
    if (next === personalPresentation && currentListKind() === tasksKind) {
      paintPersonalPresentation(next);
      updatePersonalChrome();
      return;
    }

    personalPresentation = next;
    applyPersonalPresentation(next);
    paintPersonalPresentation(next);
    applyActiveAudioForView();
    void showActiveList(currentListKind());
  });

  onRewardChanged((reward) => {
    savedReward = normalizeReward(reward);
    if (
      document.activeElement === rewardCustomInput ||
      document.activeElement === rewardSelect
    ) {
      return;
    }

    rewardEditing = initialRewardEditing(reward);
    applyReward(reward);
  });

  onCompletionStyleChanged((style) => {
    applyCompletionStyle(style);
    updateResetAction();
  });

  onCompletionSoundChanged((value) => {
    applyCompletionSound(pendingClientSound === "off" ? "off" : value);
  });

  onFinalCelebrationChanged((value) => {
    applyFinalCelebration(value);
  });

  onFinalSoundChanged((value) => {
    applyFinalSound(value);
  });

  onTaskSoundChanged((value) => {
    applyTaskSound(value);
  });

  onPersonalCompletionSoundChanged((value) => {
    applyPersonalSound(pendingPersonalSound === "off" ? "off" : value);
  });

  onPersonalFinalSoundChanged((value) => {
    applyPersonalFinalSound(value);
  });

  onPersonalTaskSoundChanged((value) => {
    applyPersonalTaskSound(value);
  });

  onPersonalTaskLayoutChanged((value) => {
    applyPersonalTaskLayout(value);
    updatePersonalChrome();
    render();
  });

  onPersonalPlantThemeChanged((value) => {
    applyPersonalPlantTheme(value);
    updatePersonalChrome();
    render();
  });

  onPersonalVisualThemeChanged((value) => {
    applyPersonalVisualTheme(value);
    render();
  });

  onPersonalAffirmationChanged((value) => {
    applyPersonalAffirmation(value);
    paintPersonalMessages();
  });

  onPersonalCompleteMessageChanged((value) => {
    applyPersonalCompleteMessage(value);
  });

  onPersonalPauseMessageChanged((value) => {
    applyPersonalPauseMessage(value);
  });

  onPersonalEndingChanged((value) => {
    applyPersonalEnding(value);
    paintPersonalMessages();
    paintBreakClock();
  });

  onPersonalBreakTimerChanged((value) => {
    applyPersonalBreakTimer(value);
  });

  onPersonalBreakNotificationsChanged((value) => {
    applyPersonalBreakNotifications(value);
    void refreshBreakNotificationPermissionStatus();
  });

  onBreakNotificationPermissionChanged(() => {
    void refreshBreakNotificationPermissionStatus();
  });

  onBrowserViewResumed(() => paintBreakClock());

  for (const button of completionStyleButtons) {
    button.addEventListener("click", () => {
      const action = nextCompletionStyleAction(button.dataset.completionStyle);
      if (!action) {
        return;
      }

      const previous = document.body.dataset.completionStyle;
      void saveSetting({ save: saveCompletionStyle, load: loadCompletionStyle, value: action,
        apply: (value) => { applyCompletionStyle(value); updateResetAction(); },
        restore: () => applyCompletionStyle(previous) });
    });
  }

  for (const button of completionSoundButtons) {
    button.addEventListener("click", () => {
      const action = nextSoundAction(button.dataset.completionSound);
      if (!action) {
        return;
      }

      const previous = document.body.dataset.completionSound;
      const revision = ++clientSoundRevision;
      pendingClientSound = action;
      if (action === "off") applyCompletionSound(action);
      if (action === "on") {
        unlockCelebrationAudio();
      }
      void saveSetting({
        save: saveCompletionSound,
        load: loadCompletionSound,
        value: action,
        apply: (value) => {
          // An earlier On save must not restart audio after a later Off click.
          applyCompletionSound(revision !== clientSoundRevision && pendingClientSound === "off"
            ? "off" : value);
        },
        restore: () => applyCompletionSound(previous),
      }).then(() => {
        if (revision === clientSoundRevision) pendingClientSound = null;
      });
    });
  }

  finalCelebrationSelect.addEventListener("change", () => {
    const action = nextFinalCelebrationAction(finalCelebrationSelect.value);
    if (!action) {
      applyFinalCelebration("random");
      return;
    }

    const previous = document.body.dataset.finalCelebration;
    applyFinalCelebration(previous);
    void saveSetting({ save: saveFinalCelebration, load: loadFinalCelebration, value: action,
      apply: applyFinalCelebration, restore: () => applyFinalCelebration(previous) });
  });

  finalSoundSelect.addEventListener("change", () => {
    const sound = normalizeFinalSound(finalSoundSelect.value);
    const previous = document.body.dataset.finalSound;
    applyFinalSound(previous);
    void saveSetting({ save: saveFinalSound, load: loadFinalSound, value: sound,
      apply: applyFinalSound, restore: () => applyFinalSound(previous) });
  });

  finalSoundPreviewButton.addEventListener("click", () => {
    if (
      !isClientMode() ||
      document.body.dataset.completionSound !== "on"
    ) {
      return;
    }

    playCelebrationSound("final", document.body.dataset.finalSound);
  });

  taskSoundSelect.addEventListener("change", () => {
    const sound = normalizeTaskSound(taskSoundSelect.value);
    const previous = document.body.dataset.taskSound;
    applyTaskSound(previous);
    void saveSetting({ save: saveTaskSound, load: loadTaskSound, value: sound,
      apply: applyTaskSound, restore: () => applyTaskSound(previous) });
  });

  taskSoundPreviewButton.addEventListener("click", () => {
    if (
      !isClientMode() ||
      document.body.dataset.completionSound !== "on"
    ) {
      return;
    }

    playTaskSound(document.body.dataset.taskSound);
  });

  for (const button of personalSoundButtons) {
    button.addEventListener("click", () => {
      const action = nextSoundAction(button.dataset.personalCompletionSound);
      if (!action || !canPlayPersonalAudio()) {
        return;
      }

      const previous = personalSound;
      const revision = ++personalSoundRevision;
      pendingPersonalSound = action;
      if (action === "off") applyPersonalSound(action);
      if (action === "on") {
        unlockCelebrationAudio();
      }
      void saveSetting({
        save: savePersonalCompletionSound,
        load: loadPersonalCompletionSound,
        value: action,
        apply: (value) => {
          // An earlier On save must not restart audio after a later Off click.
          applyPersonalSound(revision !== personalSoundRevision && pendingPersonalSound === "off"
            ? "off" : value);
        },
        restore: () => applyPersonalSound(previous),
      }).then(() => {
        if (revision === personalSoundRevision) pendingPersonalSound = null;
      });
    });
  }

  personalTaskSoundSelect.addEventListener("change", () => {
    if (!canPlayPersonalAudio()) {
      applyPersonalTaskSound(personalTaskSound);
      return;
    }

    const previous = personalTaskSound;
    const sound = normalizeTaskSound(personalTaskSoundSelect.value);
    applyPersonalTaskSound(previous);
    void saveSetting({ save: savePersonalTaskSound, load: loadPersonalTaskSound, value: sound,
      apply: applyPersonalTaskSound, restore: () => applyPersonalTaskSound(previous) });
  });

  personalFinalSoundSelect.addEventListener("change", () => {
    if (!canPlayPersonalAudio()) {
      applyPersonalFinalSound(personalFinalSound);
      return;
    }

    const previous = personalFinalSound;
    const sound = normalizeFinalSound(personalFinalSoundSelect.value);
    applyPersonalFinalSound(previous);
    void saveSetting({ save: savePersonalFinalSound, load: loadPersonalFinalSound, value: sound,
      apply: applyPersonalFinalSound, restore: () => applyPersonalFinalSound(previous) });
  });

  personalFinalSoundPreviewButton.addEventListener("click", () => {
    if (!canPlayPersonalAudio() || personalSound !== "on") {
      return;
    }

    playCelebrationSound("final", personalFinalSound);
  });

  personalTaskSoundPreviewButton.addEventListener("click", () => {
    if (!canPlayPersonalAudio() || personalSound !== "on") {
      return;
    }

    playTaskSound(personalTaskSound);
  });

  for (const button of personalAffirmationButtons) {
    button.addEventListener("click", () => {
      if (!personalPrivateFeaturesAllowed(
        document.body.dataset.presentation,
        personalPresentation
      )) {
        return;
      }

      const requested = button.dataset.personalAffirmation;
      const previous = personalAffirmation;
      const next =
        requested === "on"
          ? enableAffirmation(personalAffirmation)
          : disableAffirmation(personalAffirmation);
      if (
        next.enabled === previous.enabled &&
        next.resolvedId === previous.resolvedId
      ) {
        applyPersonalAffirmation(previous);
        return;
      }

      applyPersonalAffirmation(next);
      paintPersonalMessages();
      persistPersonalSetting(savePersonalAffirmation, next, () => {
        applyPersonalAffirmation(previous);
        paintPersonalMessages();
      });
    });
  }

  personalAffirmationSelect.addEventListener("change", () => {
    const previous = personalAffirmation;
    const next = chooseAffirmation(
      personalAffirmation,
      personalAffirmationSelect.value
    );
    applyPersonalAffirmation(next);
    paintPersonalMessages();
    persistPersonalSetting(savePersonalAffirmation, next, () => {
      applyPersonalAffirmation(previous);
      paintPersonalMessages();
    });
  });

  personalAffirmationCustom.addEventListener("change", () => {
    const previous = personalAffirmation;
    const next = normalizeAffirmation({
      ...personalAffirmation,
      customText: personalAffirmationCustom.value,
    });
    applyPersonalAffirmation(next);
    paintPersonalMessages();
    persistPersonalSetting(savePersonalAffirmation, next, () => {
      applyPersonalAffirmation(previous);
      paintPersonalMessages();
    });
  });

  personalCompleteMessageSelect.addEventListener("change", () => {
    const previous = personalCompleteMessage;
    const next = normalizeCompleteMessage({
      ...personalCompleteMessage,
      choice: personalCompleteMessageSelect.value,
    });
    applyPersonalCompleteMessage(next);
    persistPersonalSetting(savePersonalCompleteMessage, next, () => {
      applyPersonalCompleteMessage(previous);
    });
  });

  personalCompleteMessageCustom.addEventListener("change", () => {
    const previous = personalCompleteMessage;
    const next = normalizeCompleteMessage({
      ...personalCompleteMessage,
      customText: personalCompleteMessageCustom.value,
    });
    applyPersonalCompleteMessage(next);
    persistPersonalSetting(savePersonalCompleteMessage, next, () => {
      applyPersonalCompleteMessage(previous);
    });
  });

  personalPauseMessageSelect.addEventListener("change", () => {
    const previous = personalPauseMessage;
    const next = normalizePauseMessage({
      ...personalPauseMessage,
      choice: personalPauseMessageSelect.value,
    });
    applyPersonalPauseMessage(next);
    persistPersonalSetting(savePersonalPauseMessage, next, () => {
      applyPersonalPauseMessage(previous);
    });
  });

  personalPauseMessageCustom.addEventListener("change", () => {
    const previous = personalPauseMessage;
    const next = normalizePauseMessage({
      ...personalPauseMessage,
      customText: personalPauseMessageCustom.value,
    });
    applyPersonalPauseMessage(next);
    persistPersonalSetting(savePersonalPauseMessage, next, () => {
      applyPersonalPauseMessage(previous);
    });
  });

  for (const button of personalBreakClockButtons) {
    button.addEventListener("click", () => {
      if (!breakClockAllowed()) {
        return;
      }
      const requested = button.dataset.personalBreakClock;
      const next =
        requested === "on"
          ? enableBreakClock(personalBreakClock)
          : disableBreakClock(personalBreakClock);
      if (next.enabled === personalBreakClock.enabled) {
        paintBreakClock();
        return;
      }
      if (next.enabled && personalSound === "on") {
        unlockCelebrationAudio();
      }
      void persistBreakClock(next);
    });
  }

  for (const button of personalBreakNotificationButtons) {
    button.addEventListener("click", async () => {
      if (!breakClockAllowed()) {
        return;
      }

      const requested = button.dataset.personalBreakNotification === "on";
      if (!requested) {
        if (!personalBreakNotifications) {
          applyPersonalBreakNotifications(false);
          return;
        }
        await persistPersonalBreakNotifications(false);
        return;
      }

      personalBreakNotificationStatus.textContent =
        "Waiting for Chrome notification permission…";
      const { saved, granted } = await beginBreakNotificationOptIn({
        saveEnabled: persistPersonalBreakNotifications,
        requestPermission: requestBreakNotificationPermission,
      });
      if (!saved) {
        return;
      }
      if (!granted) {
        personalBreakNotificationStatus.textContent =
          "Chrome notifications are blocked. Select On to request permission again.";
        return;
      }

      await refreshBreakNotificationPermissionStatus();
    });
  }

  personalBreakIntervalInput.addEventListener("change", () => {
    if (!breakClockAllowed()) {
      paintBreakClock();
      return;
    }
    const next = changeBreakInterval(
      personalBreakClock,
      personalBreakIntervalInput.value
    );
    void persistBreakClock(next);
  });

  personalBreakSourceSelect.addEventListener("change", async () => {
    const requested = personalBreakSourceSelect.value;
    personalBreakSuggestionFeedback.textContent = "";
    if (await persistBreakSuggestionSource(requested)) {
      personalBreakSuggestionFeedback.textContent =
        requested === "custom" && personalBreakSuggestions.length === 0
          ? "Custom is selected. Add at least one idea for CueDone to choose."
          : requested === "custom"
            ? "Custom is selected. CueDone will choose from your saved ideas."
            : "Choose for me is selected. CueDone will use its whimsical ideas.";
    }
  });

  personalBreakShow.addEventListener("click", () => {
    const next = revealBreakSuggestion(
      personalBreakClock,
      personalBreakSuggestions,
      personalBreakTimer.suggestionSource
    );
    void persistBreakClock(
      next,
      "CueDone could not save that break choice. The break is still waiting."
    );
  });

  function dismissCurrentBreak() {
    void persistBreakClock(
      dismissBreak(personalBreakClock),
      "CueDone could not dismiss that break. The break is still waiting."
    );
  }

  personalBreakSkip.addEventListener("click", dismissCurrentBreak);
  personalBreakDone.addEventListener("click", dismissCurrentBreak);

  async function addBreakSuggestionFromInput() {
    const submittedText = personalBreakSuggestionInput.value.trim();
    const next = addCustomBreakSuggestion(
      personalBreakSuggestions,
      submittedText
    );
    if (next.length === personalBreakSuggestions.length) {
      personalBreakSuggestionFeedback.textContent = submittedText
        ? "That custom idea could not be added."
        : "Type a custom break idea first.";
      return;
    }
    if (await persistBreakSuggestions(next)) {
      personalBreakSuggestionInput.value = "";
      personalBreakSuggestionFeedback.textContent =
        personalBreakTimer.suggestionSource === "custom"
          ? `Saved “${submittedText}”. CueDone can choose it for your next break.`
          : `Saved “${submittedText}”. Choose Custom above to use your saved ideas.`;
      personalBreakSuggestionInput.focus();
    }
  }

  personalBreakSuggestionAdd.addEventListener("click", () => {
    void addBreakSuggestionFromInput();
  });

  personalBreakSuggestionInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }
    event.preventDefault();
    void addBreakSuggestionFromInput();
  });

  personalBreakSuggestionList.addEventListener("click", (event) => {
    const button = event.target.closest(".personal-break-suggestion-remove");
    if (!button) {
      return;
    }
    const next = removeCustomBreakSuggestion(
      personalBreakSuggestions,
      button.dataset.suggestionId
    );
    void persistBreakSuggestions(next).then((saved) => {
      if (saved) {
        personalBreakSuggestionFeedback.textContent =
          next.length === 0 && personalBreakTimer.suggestionSource === "custom"
            ? "Removed. Add another idea before the next Custom break."
            : "Custom break idea removed.";
      }
    });
  });

  finishForNowButton.addEventListener("click", async () => {
    if (
      !finishForNowVisible({
        tasks: visibleTasks(),
        presentationMode: document.body.dataset.presentation,
        personalPresentation,
        ending: personalEnding,
      })
    ) {
      return;
    }

    const next = createEndingState("pause", personalPauseMessage);
    if (next.kind === "none") {
      return;
    }

    await persistEnding(next, visibleTasks(), {
      nextBreakClock: pauseBreakClock(personalBreakClock),
    });
  });

  continueListButton.addEventListener("click", async () => {
    await persistEnding(clearEndingState(), visibleTasks(), {
      nextBreakClock: resumeBreakClock(personalBreakClock),
    });
  });

  list.addEventListener("pointerdown", (event) => {
    const item = event.target.closest(".task-item");
    if (
      item &&
      !event.target.closest(".task-actions, .drag-handle")
    ) {
      captureCompletionSnapshot(item.dataset.id);
    }

    if (
      isClientMode() &&
      document.body.dataset.completionStyle === "celebrate" &&
      document.body.dataset.completionSound === "on"
    ) {
      unlockCelebrationAudio();
    }

    if (canPlayPersonalAudio() && personalSound === "on") {
      unlockCelebrationAudio();
    }
  });

  list.addEventListener("keydown", (event) => {
    if (event.key !== " " && event.key !== "Enter") {
      return;
    }

    const item = event.target.closest(".task-item");
    if (item && event.target.closest(".task-checkbox")) {
      captureCompletionSnapshot(item.dataset.id);
    }
  });

  rewardSelect.addEventListener("change", () => {
    const reward = currentReward();
    rewardEditing = nextRewardEditing(reward, "select");
    applyReward(reward);
    persistReward();
    if (rewardShowsCustomInput(reward) && rewardEditing) {
      rewardCustomInput.focus();
    }
  });

  function commitCustomReward() {
    const reward = currentReward();
    rewardEditing = nextRewardEditing(reward, "custom-commit");
    applyReward(reward, { skipCustomValue: true });
    persistReward();
  }

  rewardCustomInput.addEventListener("input", () => {
    applyReward(currentReward(), { skipCustomValue: true });
    persistReward();
  });

  rewardCustomInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitCustomReward();
    }
  });

  rewardCustomInput.addEventListener("blur", () => {
    commitCustomReward();
  });

  rewardEdit.addEventListener("click", () => {
    rewardEditing = nextRewardEditing(currentReward(), "edit");
    applyReward(currentReward());
    rewardSelect.focus();
  });

  applyEntryMode(true);
  personalPresentation = await loadPersonalPresentation();
  applyPersonalPresentation(personalPresentation);
  applyPresentationMode(await loadPresentationMode());
  applyPersonalTaskLayout(await loadPersonalTaskLayout());
  applyPersonalPlantTheme(await loadPersonalPlantTheme());
  applyPersonalVisualTheme(await loadPersonalVisualTheme());
  applyCompletionStyle(await loadCompletionStyle());
  applyCompletionSound(await loadCompletionSound());
  applyFinalSound(await loadFinalSound());
  applyTaskSound(await loadTaskSound());
  applyPersonalSound(await loadPersonalCompletionSound());
  applyPersonalTaskSound(await loadPersonalTaskSound());
  applyPersonalFinalSound(await loadPersonalFinalSound());
  applyPersonalAffirmation(await loadPersonalAffirmation());
  applyPersonalCompleteMessage(await loadPersonalCompleteMessage());
  applyPersonalPauseMessage(await loadPersonalPauseMessage());
  applyPersonalEnding(await loadPersonalEnding());
  applyPersonalBreakNotifications(await loadPersonalBreakNotifications());
  await refreshBreakNotificationPermissionStatus();
  applyPersonalBreakTimer(await loadPersonalBreakTimer());
  applyFinalCelebration(await loadFinalCelebration());
  applyActiveAudioForView();
  const initialKind = currentListKind();
  await showActiveList(initialKind, { resetCarryover: false });
  applyEntryMode(await loadTaskEntryOpen());
  savedReward = await loadReward();
  rewardEditing = initialRewardEditing(savedReward);
  applyReward(savedReward);
  render();
  if (entryOpen) {
    input.focus();
  }
}
