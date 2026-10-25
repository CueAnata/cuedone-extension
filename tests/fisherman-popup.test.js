import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("fisherman theme exports are CSP-safe and render without blank body", async () => {
  const theme = await import("../src/shared/fisherman-theme.js");
  assert.equal(typeof theme.fishermanSceneMarkup, "function");
  assert.equal(typeof theme.formatFishermanAccessibleText, "function");
  const markup = theme.fishermanSceneMarkup({ total: 4, complete: 2 });
  // New approved artwork: shoreline at x=0, dock planks, orange shirt, low pole 248,108, hook 272,178, 3-fish stringer
  assert.match(markup, /M0 135 Q18 135/);
  assert.match(markup, /<rect x="0" y="146" width="156"/);
  assert.match(markup, /fill="#D97D43"/);
  assert.match(markup, /fill="#37474F"/);
  assert.match(markup, /id="canePole"[^>]*248.*108/);
  assert.match(markup, /M272 178/);
  assert.match(markup, /id="fisherman-stringer"/);
  assert.match(markup, /id="stringer-fish-1"/);
  assert.doesNotMatch(markup, /eval\s*\(/);
  assert.doesNotMatch(markup, /<script/);
});

test("task-list binds executeStrike and triggerOverboardFinale without breaking initial render", () => {
  const taskList = readFileSync("src/shared/task-list.js", "utf8");
  assert.match(taskList, /function executeStrike/);
  assert.match(taskList, /function triggerOverboardFinale/);
  assert.match(taskList, /y2.*55/);
  assert.match(taskList, /stringer-fish/);
  assert.match(taskList, /swallowed/);
  assert.doesNotMatch(taskList, /eval\s*\(/);
  assert.doesNotMatch(taskList, /new Function/);
  assert.doesNotMatch(taskList, /<script/);
});
