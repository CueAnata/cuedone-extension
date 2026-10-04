import assert from "node:assert/strict";
import test from "node:test";
import {
  newListFromCarryover,
  refreshCarryoverReview,
  saveNewListFromReview,
  taskListsMatch,
  unfinishedTasks,
} from "../src/shared/list-lifecycle.js";
import { createTask } from "../src/shared/tasks.js";

function task(text, id, completed = false, createdAt = 1) {
  return { ...createTask(text, createdAt, id), completed };
}

test("carryover review includes unfinished tasks in order and selects them by default", () => {
  const tasks = [
    task("Finished", "a", true, 1),
    task("First carryover", "b", false, 2),
    task("Also finished", "c", true, 3),
    task("Second carryover", "d", false, 4),
  ];

  assert.deepEqual(unfinishedTasks(tasks).map(({ id }) => id), ["b", "d"]);
  const review = refreshCarryoverReview(tasks);
  assert.deepEqual(review.unfinished.map(({ id }) => id), ["b", "d"]);
  assert.deepEqual(review.selectedIds, ["b", "d"]);
  assert.deepEqual(review.knownIds, ["b", "d"]);
});

test("new list keeps only selected unfinished tasks unchecked and ordered", () => {
  const tasks = [
    task("One", "a", false, 1),
    task("Completed", "b", true, 2),
    task("Three", "c", false, 3),
    task("Four", "d", false, 4),
  ];

  const next = newListFromCarryover(tasks, ["d", "a"]);
  assert.deepEqual(next.map(({ id }) => id), ["a", "d"]);
  assert.equal(next.every(({ completed }) => completed === false), true);
  assert.deepEqual(next.map(({ createdAt }) => createdAt), [1, 4]);
});

test("fully completed and fully deselected reviews create an empty list", () => {
  const completed = [task("One", "a", true), task("Two", "b", true)];
  const unfinished = [task("One", "a"), task("Two", "b")];

  assert.deepEqual(newListFromCarryover(completed, ["a", "b"]), []);
  assert.deepEqual(newListFromCarryover(unfinished, []), []);
});

test("review refresh preserves valid choices, selects new tasks, and drops stale ids", () => {
  const initial = [task("One", "a"), task("Two", "b")];
  const opened = refreshCarryoverReview(initial);
  const deselected = { ...opened, selectedIds: ["a"] };
  const synchronized = [
    task("New first", "c", false, 3),
    task("One revised", "a", false, 1),
    task("Two now complete", "b", true, 2),
  ];

  const refreshed = refreshCarryoverReview(synchronized, deselected);
  assert.deepEqual(refreshed.unfinished.map(({ id }) => id), ["c", "a"]);
  assert.deepEqual(refreshed.selectedIds, ["c", "a"]);
  assert.deepEqual(refreshed.knownIds, ["c", "a"]);
});

test("successful creation checks current storage before replacing the list", async () => {
  const current = [task("Carry", "a"), task("Done", "b", true)];
  let saved = null;
  const result = await saveNewListFromReview({
    reviewedTasks: current,
    selectedIds: ["a"],
    loadTasks: async () => current,
    saveTasks: async (next) => {
      saved = next;
    },
  });

  assert.equal(result.status, "saved");
  assert.deepEqual(result.tasks, [task("Carry", "a")]);
  assert.deepEqual(saved, result.tasks);
});

test("stale review refreshes instead of overwriting synchronized task changes", async () => {
  const reviewed = [task("Old", "a")];
  const latest = [task("New", "b", false, 2), task("Old", "a", false, 1)];
  let saveCalls = 0;
  const result = await saveNewListFromReview({
    reviewedTasks: reviewed,
    selectedIds: ["a"],
    loadTasks: async () => latest,
    saveTasks: async () => {
      saveCalls += 1;
    },
  });

  assert.equal(result.status, "stale");
  assert.equal(result.tasks, latest);
  assert.equal(saveCalls, 0);
});

test("storage failure leaves the reviewed list unchanged", async () => {
  const reviewed = [task("Keep me", "a"), task("Done", "b", true)];
  const result = await saveNewListFromReview({
    reviewedTasks: reviewed,
    selectedIds: ["a"],
    loadTasks: async () => reviewed,
    saveTasks: async () => {
      throw new Error("storage unavailable");
    },
  });

  assert.equal(result.status, "failure");
  assert.equal(result.tasks, reviewed);
  assert.match(result.error.message, /storage unavailable/);
});

test("carryover can be used repeatedly without creating list history", () => {
  const first = newListFromCarryover(
    [task("A", "a"), task("B", "b"), task("C", "c", true)],
    ["a", "b"]
  );
  const second = newListFromCarryover(
    [{ ...first[0], completed: true }, first[1]],
    ["b"]
  );

  assert.deepEqual(second, [task("B", "b")]);
  assert.equal(taskListsMatch(first, second), false);
  assert.equal(taskListsMatch(second, [task("B", "b")]), true);
});
