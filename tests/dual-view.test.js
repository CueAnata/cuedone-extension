import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const popupHtml = readFileSync("src/popup/popup.html", "utf8");
const sideHtml = readFileSync("src/sidepanel/sidepanel.html", "utf8");
const popupJs = readFileSync("src/popup/popup.js", "utf8");
const sideJs = readFileSync("src/sidepanel/sidepanel.js", "utf8");
const taskListJs = readFileSync("src/shared/task-list.js", "utf8");

test("Top and Side are equal working views with the compact header control", () => {
  for (const html of [popupHtml, sideHtml]) {
    assert.match(html, /data-view="top"/);
    assert.match(html, /data-view="side"/);
    assert.equal(html.includes("Open side panel"), false);
  }

  assert.match(popupJs, /mountTaskList/);
  assert.match(sideJs, /mountTaskList/);
  assert.match(popupJs, /wireViewSwitch/);
  assert.match(sideJs, /wireViewSwitch/);
  assert.match(popupJs, /savePreferredView\("top"\)/);
  assert.match(popupJs, /savePreferredView\("side"\)/);
  assert.match(sideJs, /savePreferredView\("top"\)/);
  assert.match(sideJs, /savePreferredView\("side"\)/);
});

test("shared task entry supports setup and work mode in both views", () => {
  assert.match(taskListJs, /Done/);
  assert.match(taskListJs, /\+ Add task/);
  assert.match(taskListJs, /save: saveTaskEntryOpen, load: loadTaskEntryOpen/);
  assert.match(taskListJs, /value: false, apply: applyEntryMode/);
  assert.match(taskListJs, /saveTaskEntryOpen\(true\)/);
});

test("Personal and Client share a presentation switch and the existing Private list", () => {
  for (const html of [popupHtml, sideHtml]) {
    assert.match(html, /data-mode="personal"/);
    assert.match(html, /data-mode="client"/);
  }

  assert.match(popupJs, /startPresentationMode/);
  assert.match(sideJs, /startPresentationMode/);
  assert.match(taskListJs, /from "\.\/task-store\.js"/);
  assert.equal(taskListJs.includes("cuedone.tasks"), false);
  assert.equal(taskListJs.includes("cuedone.publicTasks"), false);
  assert.match(taskListJs, /loadList/);
  assert.match(taskListJs, /saveList/);
  assert.match(taskListJs, /activeListKind/);
});

test("Client View includes Simple, Celebrate, and an independent Sound control", () => {
  assert.match(taskListJs, /data-completion-style="simple"/);
  assert.match(taskListJs, /data-completion-style="celebrate"/);
  assert.match(taskListJs, /data-completion-sound="off"/);
  assert.match(taskListJs, /data-completion-sound="on"/);
  assert.match(taskListJs, /class="client-settings-toggle"/);
  assert.match(taskListJs, /aria-expanded="false"/);
  assert.match(taskListJs, /aria-controls="client-settings-panel"/);
  assert.match(taskListJs, /id="client-settings-panel" class="client-settings-panel" hidden/);
  assert.match(taskListJs, /id="final-sound"/);
  assert.match(taskListJs, /option value="current">Current tone/);
  assert.match(taskListJs, /option value="yay">Yay!/);
  assert.match(taskListJs, /option value="applause">Applause/);
  assert.match(taskListJs, /option value="trumpet-fanfare">Trumpet fanfare/);
  assert.match(taskListJs, /option value="hurrah">Hurrah!/);
  assert.match(taskListJs, /id="task-sound"/);
  assert.match(taskListJs, /option value="none">None/);
  assert.match(taskListJs, /option value="bubble-pop">Bubble Pop/);
  assert.match(taskListJs, /option value="soft-click">Soft Click/);
  assert.match(taskListJs, /option value="wood-tap">Wood Tap/);
  assert.match(taskListJs, /option value="random">Random/);
  assert.match(taskListJs, /class="final-sound-preview sound-preview-button"/);
  assert.match(taskListJs, /class="task-sound-preview sound-preview-button"/);
  assert.match(taskListJs, /saveCompletionStyle/);
  assert.match(taskListJs, /saveCompletionSound/);
  assert.match(taskListJs, /from "\.\/celebrations\.js"/);
  assert.equal(taskListJs.includes("AudioContext"), false);
  assert.equal(taskListJs.includes("chrome."), false);
  assert.match(taskListJs, /unlockCelebrationAudio/);
  assert.match(taskListJs, /id="client-reward"/);
  assert.match(taskListJs, /option value="game-time"/);
  assert.match(taskListJs, /option value="custom"/);
  assert.match(taskListJs, /class="reward-edit"/);
  assert.match(taskListJs, /formatRewardReveal/);
  assert.match(taskListJs, /planFromCheckboxCompletion/);
  assert.match(taskListJs, /captureCompletionSnapshot/);
  assert.match(taskListJs, /checkbox\.checked/);
  assert.match(taskListJs, /playCelebrationSound\("final"/);
  assert.match(taskListJs, /playTaskSound\(document\.body\.dataset\.taskSound\)/);
  assert.match(taskListJs, /id="final-celebration"/);
  assert.match(taskListJs, /option value="balloons"/);
  assert.match(taskListJs, /option value="butterflies"/);
  assert.match(taskListJs, /showFinalTrail/);
  assert.match(taskListJs, /saveFinalCelebration/);
  const changeStart = taskListJs.indexOf('list.addEventListener("change"');
  const clickStart = taskListJs.indexOf('list.addEventListener("click"');
  const completeHandler = taskListJs.slice(changeStart, clickStart);
  assert.match(completeHandler, /if \(plan\.kind === "final"\)/);
  assert.match(completeHandler, /playCelebrationSound\("final"/);
  assert.match(completeHandler, /else \{\s*playTaskSound/);
  assert.equal(
    completeHandler.match(/playCelebrationSound/g)?.length,
    1,
    "completion handler must request audio only once"
  );
  assert.equal(
    completeHandler.match(/playTaskSound/g)?.length,
    1,
    "completion handler must request one task sound only on the non-final branch"
  );
  assert.match(completeHandler, /takeCompletionSnapshot\(id\)/);
  assert.match(completeHandler, /completed: checkbox\.checked/);
  assert.match(completeHandler, /maybeCelebrate\(plan\)/);
  assert.match(completeHandler, /await saveList\(kind, tasks\)/);
  assert.doesNotMatch(completeHandler, /toggleTask/);
  assert.ok(
    completeHandler.indexOf("playCelebrationSound") <
      completeHandler.indexOf("maybeCelebrate(plan)")
  );
  assert.ok(
    completeHandler.indexOf("render()") <
      completeHandler.indexOf("maybeCelebrate(plan)")
  );
  assert.ok(
    completeHandler.indexOf("maybeCelebrate(plan)") <
      completeHandler.indexOf("await saveList(kind, tasks)")
  );
  assert.doesNotMatch(
    taskListJs.slice(taskListJs.indexOf("onListChanged((kind, nextTasks)")),
    /maybeCelebrate/
  );
  assert.match(taskListJs, /onFinalSoundChanged/);
  assert.match(taskListJs, /saveFinalSound/);
  assert.match(taskListJs, /onTaskSoundChanged/);
  assert.match(taskListJs, /saveTaskSound/);
  assert.match(taskListJs, /setCelebrationAudioEnabled/);
  const previewStart = taskListJs.indexOf(
    'finalSoundPreviewButton.addEventListener("click"'
  );
  const previewHandler = taskListJs.slice(
    previewStart,
    taskListJs.indexOf('list.addEventListener("pointerdown"')
  );
  assert.match(previewHandler, /dataset\.completionSound !== "on"/);
  assert.match(previewHandler, /playCelebrationSound\("final"/);
  assert.match(previewHandler, /taskSoundPreviewButton\.addEventListener/);
  assert.match(previewHandler, /playTaskSound\(document\.body\.dataset\.taskSound\)/);

  const initialization = taskListJs.slice(
    taskListJs.lastIndexOf("\n  applyEntryMode(true);")
  );
  assert.doesNotMatch(initialization, /playCelebrationSound/);
  assert.doesNotMatch(initialization, /playTaskSound/);
  assert.doesNotMatch(initialization, /maybeCelebrate/);
});

test("Client Settings is a collapsed, accessible presentation-only panel", () => {
  const panelStart = taskListJs.indexOf(
    'id="client-settings-panel" class="client-settings-panel" hidden'
  );
  const panelEnd = taskListJs.indexOf("</section>", panelStart);
  const panelMarkup = taskListJs.slice(panelStart, panelEnd);
  const soundStart = taskListJs.indexOf('id="completion-sound-label"');

  assert.ok(soundStart > -1 && soundStart < panelStart);
  assert.match(panelMarkup, /data-completion-style="simple"/);
  assert.match(panelMarkup, /data-completion-style="celebrate"/);
  assert.match(panelMarkup, /id="task-sound"/);
  assert.match(panelMarkup, /class="task-sound-preview sound-preview-button"/);
  assert.match(panelMarkup, /id="final-sound"/);
  assert.match(panelMarkup, /class="final-sound-preview sound-preview-button"/);
  assert.match(panelMarkup, /id="final-celebration"/);

  const setterStart = taskListJs.indexOf("function setSettingsPanelOpen");
  const setterEnd = taskListJs.indexOf("function setNewListBusy", setterStart);
  const setter = taskListJs.slice(setterStart, setterEnd);
  assert.match(setter, /settingsPanel\.hidden = !expanded/);
  assert.match(setter, /setAttribute\("aria-expanded", String\(expanded\)\)/);
  assert.doesNotMatch(setter, /save|play|task|Celebrate/);

  const toggleStart = taskListJs.indexOf(
    'settingsToggle.addEventListener("click"'
  );
  const toggleEnd = taskListJs.indexOf(
    "onPresentationModeChanged",
    toggleStart
  );
  const toggleHandler = taskListJs.slice(toggleStart, toggleEnd);
  assert.match(toggleHandler, /setSettingsPanelOpen/);
  assert.match(toggleHandler, /aria-expanded/);
  assert.doesNotMatch(toggleHandler, /save|play|task|Celebrate/);

  assert.ok(
    taskListJs.indexOf('class="client-motivator"') > panelEnd,
    "reward controls must remain outside Settings"
  );
});

test("Start a New List is shared, explicit, synchronized, and separate from Reset List", () => {
  assert.match(taskListJs, /Start a New List/);
  assert.match(taskListJs, /Choose unfinished tasks to carry over/);
  assert.match(taskListJs, /Completed tasks and unfinished\s+tasks you deselect will be removed/);
  assert.match(taskListJs, /class="create-new-list-button"/);
  assert.match(taskListJs, /class="cancel-new-list-button"/);
  assert.match(taskListJs, /aria-controls="new-list-review"/);
  assert.match(taskListJs, /refreshCarryoverReview/);
  assert.match(taskListJs, /saveNewListFromReview/);
  assert.match(taskListJs, /clearCelebrationFeedback/);
  assert.match(taskListJs, /saveTaskEntryOpen\(true\)/);

  const createStart = taskListJs.indexOf(
    'createNewListButton.addEventListener("click"'
  );
  const createEnd = taskListJs.indexOf(
    'doneButton.addEventListener("click"',
    createStart
  );
  const createHandler = taskListJs.slice(createStart, createEnd);
  assert.match(createHandler, /await saveNewListFromReview/);
  assert.ok(
    createHandler.indexOf("await saveNewListFromReview") <
      createHandler.indexOf("tasks = nextTasks")
  );
  assert.match(createHandler, /result\.status === "stale"/);
  assert.match(createHandler, /result\.status === "failure"/);
  assert.match(createHandler, /Your current list is unchanged/);
  assert.match(createHandler, /clearPreviousCompletionState\(\)/);
  assert.doesNotMatch(createHandler, /playCelebrationSound|playTaskSound|maybeCelebrate/);
  assert.doesNotMatch(
    createHandler,
    /saveReward|saveCompletionStyle|saveCompletionSound|saveFinalSound|saveTaskSound|saveFinalCelebration/
  );

  const cancelStart = taskListJs.indexOf(
    'cancelNewListButton.addEventListener("click"'
  );
  const cancelEnd = taskListJs.indexOf(
    'createNewListButton.addEventListener("click"',
    cancelStart
  );
  const cancelHandler = taskListJs.slice(cancelStart, cancelEnd);
  assert.match(cancelHandler, /setCarryoverOpen\(false\)/);
  assert.doesNotMatch(cancelHandler, /save|tasks\s*=|clearCelebration|render\(/);

  const syncStart = taskListJs.indexOf("onListChanged((kind, nextTasks)");
  const syncEnd = taskListJs.indexOf("onTaskEntryOpenChanged", syncStart);
  const syncHandler = taskListJs.slice(syncStart, syncEnd);
  assert.match(syncHandler, /kind !== currentListKind/);
  assert.match(syncHandler, /pendingSynchronizedTasks/);
  assert.match(syncHandler, /applySynchronizedTasks/);
  assert.match(syncHandler, /Carryover choices were refreshed/);

  assert.ok(
    taskListJs.indexOf('class="list-lifecycle"') <
      taskListJs.indexOf('class="list-reset"')
  );
});

test("Final and task sound controls adapt at narrow Client widths without changing Personal task rules", () => {
  const css = readFileSync("src/shared/styles.css", "utf8");
  assert.match(
    css,
    /\.client-final-sound-controls,\s*\.client-task-sound-controls\s*\{[\s\S]*?display:\s*flex/
  );
  assert.match(
    css,
    /\.final-sound-select,\s*\.task-sound-select\s*\{[\s\S]*?flex:\s*1/
  );
  const compact = css.match(/@media \(max-width: 420px\) \{[\s\S]*?\n\}/)?.[0];
  assert.ok(compact);
  assert.match(
    compact,
    /\.client-final-sound-controls,\s*\.client-task-sound-controls[\s\S]*?flex-wrap:\s*wrap/
  );
  assert.match(
    compact,
    /\.final-sound-select,\s*\.task-sound-select[\s\S]*?flex-basis:\s*100%/
  );
  assert.match(
    css,
    /\.popup-view\[data-presentation="client"\] \.task-item\s*\{[\s\S]*?grid-template-columns:\s*var\(--control\) minmax\(0, 1fr\)/
  );
  assert.doesNotMatch(
    css,
    /body\[data-presentation="personal"\](?!\[data-personal-presentation="public"\]) \.task-item/
  );
});

test("Personal Settings is a collapsed Private/Public selector that isolates lists", () => {
  assert.match(taskListJs, /class="personal-settings-toggle"/);
  assert.match(taskListJs, /aria-controls="personal-settings-panel"/);
  assert.match(taskListJs, /id="personal-settings-panel" class="personal-settings-panel" hidden/);
  assert.match(taskListJs, /data-personal-presentation="private"/);
  assert.match(taskListJs, /data-personal-presentation="public"/);
  assert.match(taskListJs, /Using Private list/);
  assert.match(taskListJs, /formatActiveListLabel/);
  assert.match(taskListJs, /not a lock or account/);
  assert.match(taskListJs, /savePersonalPresentation/);
  assert.match(taskListJs, /visibleTasksForActiveList/);
  assert.match(taskListJs, /prepareListSwitch/);
  assert.match(taskListJs, /showActiveList/);

  const switchStart = taskListJs.indexOf("async function requestPersonalPresentation");
  const switchEnd = taskListJs.indexOf("function setSettingsPanelOpen", switchStart);
  const switchFn = taskListJs.slice(switchStart, switchEnd);
  assert.match(switchFn, /await savePersonalPresentation\(requested\)/);
  assert.match(switchFn, /Your current list is unchanged/);
  assert.doesNotMatch(switchFn, /playCelebrationSound|playTaskSound|maybeCelebrate/);

  const prepareStart = taskListJs.indexOf("function prepareListSwitch");
  const prepare = taskListJs.slice(
    prepareStart,
    taskListJs.indexOf("async function showActiveList", prepareStart)
  );
  assert.match(prepare, /setCarryoverOpen\(false\)/);
  assert.match(prepare, /input\.value = ""/);
  assert.match(prepare, /clearPreviousCompletionState/);
  assert.doesNotMatch(prepare, /playCelebrationSound|playTaskSound|maybeCelebrate/);

  const css = readFileSync("src/shared/styles.css", "utf8");
  assert.match(
    css,
    /body\[data-presentation="personal"\]\[data-personal-presentation="public"\] \.task-text/
  );
  assert.match(
    css,
    /\.popup-view\[data-presentation="personal"\]\[data-personal-presentation="public"\] \.task-item/
  );
  const compact = css.match(
    /@media \(max-width: 420px\) \{\s*\n\s*\.sidepanel-view\[data-presentation="personal"\]\[data-personal-presentation="public"\][\s\S]*?\n\}/
  )?.[0];
  assert.ok(compact);
  assert.match(
    compact,
    /\.sidepanel-view\[data-presentation="personal"\]\[data-personal-presentation="public"\] \.task-label/
  );
});

test("Personal Private audio is isolated, saved after completion, and silent in Public", () => {
  assert.match(taskListJs, /class="personal-audio-settings" hidden/);
  assert.match(taskListJs, /data-personal-completion-sound="off"/);
  assert.match(taskListJs, /data-personal-completion-sound="on"/);
  assert.match(taskListJs, /id="personal-task-sound"/);
  assert.match(taskListJs, /id="personal-final-sound"/);
  assert.match(taskListJs, /option value="bubble-pop">Bubble Pop/);
  assert.match(taskListJs, /option value="current">Current tone/);
  assert.match(taskListJs, /class="personal-task-sound-preview sound-preview-button"/);
  assert.match(taskListJs, /class="personal-final-sound-preview sound-preview-button"/);
  assert.match(taskListJs, /savePersonalCompletionSound/);
  assert.match(taskListJs, /savePersonalTaskSound/);
  assert.match(taskListJs, /savePersonalFinalSound/);
  assert.match(taskListJs, /onPersonalCompletionSoundChanged/);
  assert.match(taskListJs, /planPersonalPrivateAudio/);
  assert.match(taskListJs, /playPersonalPrivateAudio/);
  assert.match(taskListJs, /applyActiveAudioForView/);
  assert.match(taskListJs, /stopCelebrationAudio/);

  const completeHandler = taskListJs.slice(
    taskListJs.indexOf('list.addEventListener("change"'),
    taskListJs.indexOf('list.addEventListener("click"')
  );
  assert.ok(
    completeHandler.indexOf("await saveList(kind, tasks)") <
      completeHandler.indexOf("playPersonalPrivateAudio(personalAudio)")
  );
  assert.match(completeHandler, /playPersonalPrivateAudio\(personalAudio\)/);
  const failStart = completeHandler.indexOf("} catch {");
  assert.doesNotMatch(
    completeHandler.slice(failStart),
    /playPersonalPrivateAudio|playCelebrationSound|playTaskSound/
  );

  const personalPreview = taskListJs.slice(
    taskListJs.indexOf(
      'personalFinalSoundPreviewButton.addEventListener("click"'
    ),
    taskListJs.indexOf('list.addEventListener("pointerdown"')
  );
  assert.match(personalPreview, /canPlayPersonalAudio\(\)/);
  assert.match(personalPreview, /personalSound !== "on"/);
  assert.doesNotMatch(personalPreview, /dataset\.completionSound/);

  const switchFn = taskListJs.slice(
    taskListJs.indexOf("onPresentationModeChanged((next) => {"),
    taskListJs.indexOf("onRewardChanged((reward) => {")
  );
  assert.match(switchFn, /applyActiveAudioForView\(\)/);

  const css = readFileSync("src/shared/styles.css", "utf8");
  assert.match(
    css,
    /body\[data-presentation="personal"\]\[data-personal-presentation="private"\]\s*\n\s*\.personal-audio-settings:not\(\[hidden\]\)/
  );
  assert.match(css, /\.personal-task-sound-row/);
  assert.match(
    css,
    /@media \(max-width: 420px\) \{[\s\S]*?\.personal-final-sound-select/
  );
});

test("Personal Private affirmations and session endings stay isolated and silent", () => {
  assert.match(taskListJs, /class="personal-message-settings" hidden/);
  assert.match(taskListJs, /data-personal-affirmation="off"/);
  assert.match(taskListJs, /Finish for now/);
  assert.match(taskListJs, /Continue list/);
  assert.match(taskListJs, /All-tasks-completed message/);
  assert.match(taskListJs, /Stopping with unfinished tasks/);
  assert.match(taskListJs, /savePersonalAffirmation/);
  assert.match(taskListJs, /savePersonalCompleteMessage/);
  assert.match(taskListJs, /savePersonalPauseMessage/);
  assert.match(taskListJs, /savePersonalEnding/);
  assert.match(taskListJs, /refreshRandomAffirmation/);
  assert.match(taskListJs, /createEndingState\("complete"/);
  assert.match(taskListJs, /createEndingState\("pause"/);
  assert.match(taskListJs, /clearStaleEnding/);
  assert.match(taskListJs, /textContent = affirmationText/);
  assert.match(taskListJs, /personalEndingText\.textContent/);

  const completeHandler = taskListJs.slice(
    taskListJs.indexOf('list.addEventListener("change"'),
    taskListJs.indexOf('list.addEventListener("click"')
  );
  assert.ok(
    completeHandler.indexOf("await saveList(kind, tasks)") <
      completeHandler.indexOf('createEndingState("complete"')
  );
  assert.match(completeHandler, /playPersonalPrivateAudio\(personalAudio\)/);

  const finishHandler = taskListJs.slice(
    taskListJs.indexOf('finishForNowButton.addEventListener("click"'),
    taskListJs.indexOf('continueListButton.addEventListener("click"')
  );
  assert.doesNotMatch(finishHandler, /playCelebrationSound|playTaskSound|maybeCelebrate/);
  assert.doesNotMatch(finishHandler, /saveList|resetCompletedTasks|setCarryoverOpen/);

  const continueHandler = taskListJs.slice(
    taskListJs.indexOf('continueListButton.addEventListener("click"'),
    taskListJs.indexOf('list.addEventListener("pointerdown"')
  );
  assert.match(continueHandler, /clearEndingState/);
  assert.doesNotMatch(continueHandler, /playCelebrationSound|playTaskSound|maybeCelebrate/);

  const persistFn = taskListJs.slice(
    taskListJs.indexOf("async function persist(nextTasks,"),
    taskListJs.indexOf("function render()")
  );
  assert.match(persistFn, /clearStaleEnding\(kind, clearEnding\)/);

  const css = readFileSync("src/shared/styles.css", "utf8");
  assert.match(css, /\.personal-affirmation \{/);
  assert.match(css, /\.personal-ending \{/);
  assert.match(css, /\.personal-ending-icon/);
  assert.match(css, /\.personal-ending\.is-complete/);
  assert.match(css, /\.personal-ending\.is-pause/);
  assert.match(taskListJs, /personal-ending-icon/);
  assert.match(taskListJs, /is-complete/);
  assert.match(taskListJs, /is-pause/);
  assert.match(
    css,
    /body\[data-presentation="personal"\]\[data-personal-presentation="private"\]\s*\n\s*\.personal-message-settings:not\(\[hidden\]\)/
  );
});

test("Reset List appears only when every task is complete and confirms before unchecking", () => {
  assert.match(taskListJs, /Reset List/);
  assert.match(taskListJs, /Start this list again\?/);
  assert.match(taskListJs, /canResetList/);
  assert.match(taskListJs, /resetListVisible/);
  assert.match(taskListJs, /resetCompletedTasks/);
  assert.match(taskListJs, /class="reset-list-button"/);
  assert.match(taskListJs, /class="reset-confirm-button"/);
  assert.match(taskListJs, /class="reset-cancel-button"/);
  assert.match(taskListJs, /delete-button/);
  assert.match(taskListJs, /aria-label="Delete task"/);
  assert.match(taskListJs, /onDone/);
  assert.ok(
    taskListJs.indexOf('class="client-motivator"') <
      taskListJs.indexOf('class="list-reset"')
  );
  const completeHandler = taskListJs.slice(
    taskListJs.indexOf('list.addEventListener("change"'),
    taskListJs.indexOf('list.addEventListener("click"')
  );
  assert.ok(
    completeHandler.indexOf("finalCelebrationActive = true") <
      completeHandler.indexOf("render()")
  );

  const confirmStart = taskListJs.indexOf(
    'resetConfirmButton.addEventListener("click"'
  );
  const confirmHandler = taskListJs.slice(
    confirmStart,
    taskListJs.indexOf("doneButton.addEventListener")
  );
  assert.match(confirmHandler, /resetCompletedTasks\(shown\)/);
  assert.match(confirmHandler, /await persist\(next, \{ clearEnding: true \}\)/);
  assert.doesNotMatch(confirmHandler, /deleteTask/);
  assert.doesNotMatch(confirmHandler, /saveReward/);
  assert.doesNotMatch(confirmHandler, /saveCompletionStyle/);
  assert.doesNotMatch(confirmHandler, /saveFinalCelebration/);
  assert.doesNotMatch(confirmHandler, /maybeCelebrate/);

  const maybeStart = taskListJs.indexOf("function maybeCelebrate");
  const maybeCelebrate = taskListJs.slice(
    maybeStart,
    taskListJs.indexOf("function currentReward")
  );
  assert.match(maybeCelebrate, /showFinalTrail/);
  assert.match(maybeCelebrate, /plan\.playTrail/);
  assert.ok(
    maybeCelebrate.indexOf("showFinalTrail") <
      maybeCelebrate.indexOf('kind: "final"')
  );
});
