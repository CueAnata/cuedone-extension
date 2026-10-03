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
  assert.match(taskListJs, /saveTaskEntryOpen\(false\)/);
  assert.match(taskListJs, /saveTaskEntryOpen\(true\)/);
});

test("Personal and Client share the same task list presentation switch", () => {
  for (const html of [popupHtml, sideHtml]) {
    assert.match(html, /data-mode="personal"/);
    assert.match(html, /data-mode="client"/);
  }

  assert.match(popupJs, /startPresentationMode/);
  assert.match(sideJs, /startPresentationMode/);
  assert.match(taskListJs, /from "\.\/task-store\.js"/);
  assert.equal(taskListJs.includes("cuedone.tasks"), false);
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
  assert.match(completeHandler, /await saveTasks\(tasks\)/);
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
      completeHandler.indexOf("await saveTasks(tasks)")
  );
  assert.doesNotMatch(
    taskListJs.slice(taskListJs.indexOf("onTasksChanged((nextTasks)")),
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
  const setterEnd = taskListJs.indexOf("function applyCompletionStyle", setterStart);
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
  assert.doesNotMatch(css, /body\[data-presentation="personal"\]/);
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
  assert.match(confirmHandler, /resetCompletedTasks\(tasks\)/);
  assert.match(confirmHandler, /await persist\(next\)/);
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
