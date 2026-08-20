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

test("Client View includes Simple and Celebrate completion controls without playing them", () => {
  assert.match(taskListJs, /data-completion-style="simple"/);
  assert.match(taskListJs, /data-completion-style="celebrate"/);
  assert.match(taskListJs, /saveCompletionStyle/);
  assert.equal(taskListJs.includes("confetti"), false);
  assert.equal(taskListJs.includes("Audio"), false);
  assert.equal(taskListJs.includes("playSound"), false);
});
