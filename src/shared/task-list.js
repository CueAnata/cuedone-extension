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
  loadCompletionSound,
  loadCompletionStyle,
  loadFinalCelebration,
  loadFinalSound,
  loadPersonalAffirmation,
  loadPersonalCompleteMessage,
  loadPersonalCompletionSound,
  loadPersonalEnding,
  loadPersonalFinalSound,
  loadPersonalPauseMessage,
  loadPersonalPresentation,
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
  onPersonalCompleteMessageChanged,
  onPersonalCompletionSoundChanged,
  onPersonalEndingChanged,
  onPersonalFinalSoundChanged,
  onPersonalPauseMessageChanged,
  onPersonalPresentationChanged,
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
  savePersonalCompleteMessage,
  savePersonalCompletionSound,
  savePersonalEnding,
  savePersonalFinalSound,
  savePersonalPauseMessage,
  savePersonalPresentation,
  savePersonalTaskSound,
  saveReward,
  saveTaskEntryOpen,
  saveTaskSound,
  taskEntryVisibility,
  normalizeFinalSound,
  normalizeTaskSound,
} from "./preferences.js";
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
  let personalSound = "off";
  let personalTaskSound = "bubble-pop";
  let personalFinalSound = "current";
  let personalAffirmation = normalizeAffirmation();
  let personalCompleteMessage = normalizeCompleteMessage();
  let personalPauseMessage = normalizePauseMessage();
  let personalEnding = clearEndingState();
  let tasksKind = "private";

  root.innerHTML = `
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
          <span>Settings</span>
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
      </div>
    </section>
    <p class="personal-list-error" role="alert" hidden></p>
    <p class="personal-affirmation" hidden></p>
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
        <button
          class="client-settings-toggle"
          type="button"
          aria-expanded="false"
          aria-controls="client-settings-panel"
        >
          <span class="client-settings-gear" aria-hidden="true">&#9881;</span>
          <span>Settings</span>
        </button>
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
        </div>
      </div>
    </section>
    <ul class="task-list" aria-label="Tasks"></ul>
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
  const personalSettingsPanel = root.querySelector(".personal-settings-panel");
  const personalPresentationButtons = root.querySelectorAll(
    "[data-personal-presentation]"
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
  const personalAffirmationDisplay = root.querySelector(".personal-affirmation");
  const personalEndingSection = root.querySelector(".personal-ending");
  const personalEndingIcon = root.querySelector(".personal-ending-icon");
  const personalEndingText = root.querySelector(".personal-ending-text");
  const continueListButton = root.querySelector(".continue-list-button");
  const finishForNowButton = root.querySelector(".finish-for-now-button");
  const personalListError = root.querySelector(".personal-list-error");

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
  const settingsPanel = root.querySelector(".client-settings-panel");
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
  }

  function paintPersonalPresentation(value) {
    const current = value === "public" ? "public" : "private";
    for (const button of personalPresentationButtons) {
      const isCurrent = button.dataset.personalPresentation === current;
      button.classList.toggle("is-current", isCurrent);
      button.setAttribute("aria-pressed", String(isCurrent));
    }
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
    personalSettings.hidden = !personal;
    personalAudioSettings.hidden = !privateFeatures;
    personalMessageSettings.hidden = !privateFeatures;
    personalListLabel.textContent = formatActiveListLabel(kind);
    list.setAttribute("aria-label", taskListAriaLabel(kind));
    paintPersonalPresentation(personalPresentation);
    paintPersonalMessages();
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

  async function persistEnding(nextEnding, endingTasks = visibleTasks()) {
    nextEnding = bindEndingToTasks(nextEnding, endingTasks);
    const previous = personalEnding;
    applyPersonalEnding(nextEnding);
    paintPersonalMessages();
    try {
      await savePersonalEnding(nextEnding);
      showListError("");
      return true;
    } catch {
      applyPersonalEnding(previous);
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
    try {
      await saveList(kind, tasks, { clearEnding });
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
    emptyState.textContent = emptyStateCopy(currentListKind());
    emptyState.hidden = shown.length > 0;
    list.replaceChildren();
    const currentId = nextUnfinishedTask(shown)?.id;

    shown.forEach((task, index) => {
      const item = document.createElement("li");
      const checkboxId = `task-${task.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;
      item.className = `task-item${task.completed ? " is-complete" : ""}${
        task.id === currentId ? " is-current-task" : ""
      }`;
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
    restoreFocus = { id: next[0].id, selector: ".task-checkbox" };
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
    const result = await saveNewListFromReview({
      reviewedTasks: snapshotTasks(visibleTasks()),
      selectedIds: carryoverReview.selectedIds,
      loadTasks: () => loadList(kind),
      saveTasks: (next) => saveList(kind, next, { clearEnding: true }),
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

  onPresentationModeChanged((next) => {
    applyPresentationMode(next);
    applyActiveAudioForView();
    const kind = currentListKind();
    if (kind !== tasksKind) {
      void showActiveList(kind);
      return;
    }

    updatePersonalChrome();
    updateClientChrome();
    updateResetAction();
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
  });

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

    await persistEnding(next);
  });

  continueListButton.addEventListener("click", async () => {
    await persistEnding(clearEndingState());
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
