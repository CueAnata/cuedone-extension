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
  assert.match(taskListJs, /playCelebrationSound\(plan\.kind\)/);
  assert.match(taskListJs, /id="final-celebration"/);
  assert.match(taskListJs, /option value="balloons"/);
  assert.match(taskListJs, /option value="butterflies"/);
  assert.match(taskListJs, /showFinalTrail/);
  assert.match(taskListJs, /saveFinalCelebration/);
  const changeStart = taskListJs.indexOf('list.addEventListener("change"');
  const clickStart = taskListJs.indexOf('list.addEventListener("click"');
  const completeHandler = taskListJs.slice(changeStart, clickStart);
  assert.match(completeHandler, /playCelebrationSound\(plan\.kind\)/);
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
