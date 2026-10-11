import assert from "node:assert/strict";
import test from "node:test";
import {
  formatWaitingTaskCount,
  nextPersonalTaskLayoutAction,
  normalizePersonalTaskLayout,
  personalOneActiveAllowed,
  personalOneActiveState,
} from "../src/shared/personal-layout.js";

function task(id, completed = false) {
  return { id, text: `Task ${id}`, completed, createdAt: 1 };
}

test("Personal task layout defaults to the existing full list", () => {
  assert.equal(normalizePersonalTaskLayout(undefined), "full-list");
  assert.equal(normalizePersonalTaskLayout("full-list"), "full-list");
  assert.equal(normalizePersonalTaskLayout("one-active"), "one-active");
  assert.equal(normalizePersonalTaskLayout("first-then"), "full-list");
  assert.equal(nextPersonalTaskLayoutAction("one-active"), "one-active");
  assert.equal(nextPersonalTaskLayoutAction("first-then"), null);
});

test("One Active Task is restricted to Personal Private", () => {
  assert.equal(
    personalOneActiveAllowed("personal", "private", "one-active"),
    true
  );
  assert.equal(
    personalOneActiveAllowed("personal", "public", "one-active"),
    false
  );
  assert.equal(
    personalOneActiveAllowed("client", "private", "one-active"),
    false
  );
  assert.equal(
    personalOneActiveAllowed("personal", "private", "full-list"),
    false
  );
});

test("collapsed One Active Task shows only the next unfinished task", () => {
  const tasks = [task("done", true), task("now"), task("later"), task("last")];
  const state = personalOneActiveState(tasks);

  assert.equal(state.activeTask.id, "now");
  assert.deepEqual(state.visibleTasks.map((item) => item.id), ["now"]);
  assert.deepEqual(state.progress, { complete: 1, total: 4, percent: 25 });
  assert.equal(state.waiting, 2);
});

test("full-list review preserves every task and its current order", () => {
  const tasks = [task("done", true), task("now"), task("later")];
  const state = personalOneActiveState(tasks, { reviewAll: true });

  assert.equal(state.visibleTasks, tasks);
  assert.deepEqual(state.visibleTasks.map((item) => item.id), [
    "done",
    "now",
    "later",
  ]);
});

test("completed and empty lists never invent an active task", () => {
  const completed = personalOneActiveState([task("a", true), task("b", true)]);
  assert.equal(completed.activeTask, null);
  assert.deepEqual(completed.visibleTasks, []);
  assert.deepEqual(completed.progress, { complete: 2, total: 2, percent: 100 });
  assert.equal(completed.waiting, 0);

  const empty = personalOneActiveState([]);
  assert.equal(empty.activeTask, null);
  assert.deepEqual(empty.visibleTasks, []);
  assert.deepEqual(empty.progress, { complete: 0, total: 0, percent: 0 });
});

test("waiting-task copy handles singular and plural counts", () => {
  assert.equal(formatWaitingTaskCount(0), "0 tasks waiting");
  assert.equal(formatWaitingTaskCount(1), "1 task waiting");
  assert.equal(formatWaitingTaskCount(3), "3 tasks waiting");
});
