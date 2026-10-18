import test from "node:test";
import assert from "node:assert/strict";
import { MOUNTAIN_STAGE_COUNT, mountainStageFromProgress, mountainSceneMarkup, describeMountainStage } from "../src/shared/mountain-theme.js";
import { normalizeProgress } from "../src/shared/progress.js";

test("horse race follows task completion forward and backward through every quarter", () => {
  assert.equal(MOUNTAIN_STAGE_COUNT, 5);
  for (const complete of [0, 1, 2, 3, 4, 3, 2, 1, 0]) {
    const tasks = Array.from({ length: 4 }, (_, index) => ({ completed: index < complete }));
    const progress = normalizeProgress(tasks);
    assert.equal(mountainStageFromProgress(progress), complete);
    assert.equal(describeMountainStage(progress).stage, complete);
    assert.match(describeMountainStage(progress).accessibleText, /Horse race/);
  }
  assert.equal(mountainStageFromProgress({ total: 0, complete: 0 }), 0);
  assert.equal(mountainStageFromProgress(undefined), 0);
  assert.equal(mountainStageFromProgress({ total: 3, complete: 2 }), 2);
  assert.equal(mountainStageFromProgress({ total: 3, complete: 3 }), 4);
});

test("horse race keeps five distinct stages and finish decorations inside the winning stage", () => {
  const markup = mountainSceneMarkup();
  assert.equal((markup.match(/class="hr-stage hr-stage--/g) || []).length, 5);
  const final = markup.slice(markup.indexOf('class="hr-stage hr-stage--4'));
  assert.match(final, /translate\(114, 38\)/);
  assert.match(final, /fill="#ffd700"/);
  assert.match(final, /Sparkle 1/);
  assert.match(final, /Sparkle 2/);
  assert.match(final, /class="horse-bob"/);
  assert.doesNotMatch(markup, /<style>/);
});
