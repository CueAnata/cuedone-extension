import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { submarineStageFromProgress, describeSubmarineStage, submarineSceneMarkup } from "../src/shared/submarine-theme.js";
import { normalizeVisualTheme } from "../src/shared/plant-theme.js";

test("Submarine advances and reverses through five stages without an empty-list finale", () => {
  assert.equal(normalizeVisualTheme("submarine"), "submarine");
  for (const complete of [0, 1, 2, 3, 4, 3, 2, 1, 0]) {
    const progress = { total: 4, complete };
    assert.equal(submarineStageFromProgress(progress), complete);
    assert.equal(describeSubmarineStage(progress).stage, complete);
    assert.match(describeSubmarineStage(progress).accessibleText, new RegExp(`${complete} of 4 complete`));
  }
  assert.equal(submarineStageFromProgress({ total: 0, complete: 0 }), null);
  assert.equal(describeSubmarineStage([]), null);
});

test("Submarine follows Random and the existing options with both layouts and five exclusive CSS stages", () => {
  const ui = readFileSync("src/shared/task-list.js", "utf8");
  const select = ui.match(/<select id="personal-visual-theme"[\s\S]*?<\/select>/)[0];
  const options = [...select.matchAll(/<option value="([^"]+)"/g)].map(match => match[1]);
  assert.equal(options.length, 13);
  assert.equal(options[0], "random");
  assert.equal(options[12], "submarine");
  assert.equal((ui.match(/\$\{submarineSceneMarkup\(\)\}/g) || []).length, 2);
  const css = readFileSync("src/shared/styles.css", "utf8");
  assert.match(css, /\.personal-submarine-visual \.sub-stage \{ display: none; \}/);
  const markup = submarineSceneMarkup();
  for (let stage = 0; stage < 5; stage++) {
    assert.ok(css.includes(`.personal-submarine-visual[data-stage="${stage}"] .sub-stage--${stage}`));
    assert.ok(markup.includes(`class="sub-stage sub-stage--${stage}"`));
  }
  assert.match(markup, /TREASURE FOUND!/);
  assert.doesNotMatch(markup, /fil"/);
});
