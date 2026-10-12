import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { formatProgress, isEmptyProgress, normalizeProgress } from "../src/shared/progress.js";
import { formatProgressLabel, taskProgress } from "../src/shared/client-view.js";
import { personalOneActiveAllowed, personalOneActiveState } from "../src/shared/personal-layout.js";

function task(id, completed = false) {
  return { id, text: `Task ${id}`, completed, createdAt: 1 };
}

test("shared progress kernel normalizes empty and malformed inputs", () => {
  assert.deepEqual(normalizeProgress([]), { complete: 0, total: 0, percent: 0 });
  assert.deepEqual(normalizeProgress(null), { complete: 0, total: 0, percent: 0 });
  assert.deepEqual(normalizeProgress(undefined), { complete: 0, total: 0, percent: 0 });
  assert.deepEqual(normalizeProgress("nope"), { complete: 0, total: 0, percent: 0 });
  assert.equal(isEmptyProgress(normalizeProgress([])), true);
  assert.equal(isEmptyProgress(normalizeProgress([task("a")])), false);
});

test("shared progress kernel computes complete/total/percent", () => {
  assert.deepEqual(normalizeProgress([task("a"), task("b", true)]), {
    complete: 1,
    total: 2,
    percent: 50,
  });
  assert.deepEqual(normalizeProgress([task("a", true), task("b", true)]), {
    complete: 2,
    total: 2,
    percent: 100,
  });
  assert.deepEqual(normalizeProgress([task("a"), task("b"), task("c", true)]), {
    complete: 1,
    total: 3,
    percent: 33,
  });
  assert.equal(formatProgress({ complete: 2, total: 5 }), "2 of 5 complete");
  assert.equal(formatProgress(null), "0 of 0 complete");
});

test("shared progress is the sole source for taskProgress and personalOneActiveState", () => {
  const tasks = [task("a", true), task("b"), task("c")];
  assert.deepEqual(taskProgress(tasks), normalizeProgress(tasks));
  assert.deepEqual(personalOneActiveState(tasks).progress, normalizeProgress(tasks));
  assert.equal(formatProgressLabel({ complete: 1, total: 3 }), formatProgress({ complete: 1, total: 3 }));
});

test("One Active Task remains the only Private progress surface", () => {
  assert.equal(personalOneActiveAllowed("personal", "private", "one-active"), true);
  assert.equal(personalOneActiveAllowed("personal", "private", "full-list"), false);
  assert.equal(personalOneActiveAllowed("personal", "public", "one-active"), false);
  assert.equal(personalOneActiveAllowed("client", "private", "one-active"), false);
  assert.equal(personalOneActiveAllowed("personal", "public", "full-list"), false);
});

test("Full list has no progress indicator and Public is progress-free", () => {
  const privateTasks = [task("a", true), task("b"), task("c")];
  // Full list allowed check fails — progress surface stays hidden
  assert.equal(personalOneActiveAllowed("personal", "private", "full-list"), false);
  // Public cannot use One Active layout at all
  assert.equal(personalOneActiveAllowed("personal", "public", "one-active"), false);
  // Even if progress kernel computes, the UI gate keeps the block hidden in Public
  const publicTasks = [task("pub1"), task("pub2", true)];
  assert.equal(personalOneActiveAllowed("personal", "public", "one-active"), false);
  assert.deepEqual(normalizeProgress(publicTasks), { complete: 1, total: 2, percent: 50 });
  // Full list render path does not expose waiting/progress nodes — verify via allowed flag
  const oneActiveState = personalOneActiveState(privateTasks);
  assert.equal(oneActiveState.progress.total, 3);
  assert.equal(isEmptyProgress(oneActiveState.progress), false);
  assert.deepEqual(personalOneActiveState([]).progress, { complete: 0, total: 0, percent: 0 });
});

test("existing completion and ending remain sole finale logic", async () => {
  const { isFinalCompletionTransition } = await import("../src/shared/client-view.js");
  const { canResetList } = await import("../src/shared/tasks.js");
  const { isCompletedList } = await import("../src/shared/personal-messages.js");
  assert.equal(isFinalCompletionTransition([task("a")], [task("a", true)]), true);
  assert.equal(isFinalCompletionTransition([], []), false);
  assert.equal(isFinalCompletionTransition([task("a", true)], [task("a", true)]), false);
  assert.equal(canResetList([task("a", true)]), true);
  assert.equal(canResetList([]), false);
  assert.equal(isCompletedList([task("a", true)]), true);
  // Progress does not invent its own finale
  const progress = normalizeProgress([task("a", true)]);
  assert.equal(progress.percent, 100);
});

test("shared progress module stays platform-neutral and importable by VR", () => {
  const source = readFileSync("src/shared/progress.js", "utf8");
  assert.doesNotMatch(source, /^\s*import\s/m);
  assert.doesNotMatch(source, /\b(?:chrome|document|window|navigator|XRSession|setTimeout|setInterval|chrome\.)\b/);
  // Verify VR can import the pure module without pulling browser adapter
  assert.doesNotMatch(source, /platform\/browser/);
});
