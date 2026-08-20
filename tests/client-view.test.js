import assert from "node:assert/strict";
import test from "node:test";
import {
  completionFeedbackPlan,
  formatProgressLabel,
  nextCompletionStyleAction,
  nextUnfinishedTask,
  taskProgress,
} from "../src/shared/client-view.js";
import { createTask } from "../src/shared/tasks.js";
import { nextModeAction } from "../src/shared/mode-switch.js";

const tasks = [
  { ...createTask("One", 1, "a"), completed: true },
  createTask("Two", 2, "b"),
  createTask("Three", 3, "c"),
];

test("nextUnfinishedTask selects the first incomplete task in list order", () => {
  assert.equal(nextUnfinishedTask(tasks)?.id, "b");
  assert.equal(nextUnfinishedTask([]), null);
  assert.equal(
    nextUnfinishedTask(tasks.map((task) => ({ ...task, completed: true }))),
    null
  );
  assert.equal(nextUnfinishedTask(null), null);
});

test("taskProgress counts completed tasks against the shared list", () => {
  assert.deepEqual(taskProgress(tasks), {
    complete: 1,
    total: 3,
    percent: 33,
  });
  assert.deepEqual(taskProgress([]), {
    complete: 0,
    total: 0,
    percent: 0,
  });
  assert.deepEqual(
    taskProgress(tasks.map((task) => ({ ...task, completed: true }))),
    { complete: 3, total: 3, percent: 100 }
  );
});

test("formatProgressLabel uses a simple complete count", () => {
  assert.equal(formatProgressLabel({ complete: 2, total: 5 }), "2 of 5 complete");
  assert.equal(formatProgressLabel(taskProgress([])), "0 of 0 complete");
});

test("nextModeAction only accepts Personal or Client presentation", () => {
  assert.equal(nextModeAction("client"), "client");
  assert.equal(nextModeAction("personal"), "personal");
  assert.equal(nextModeAction("side"), null);
});

test("Celebrate is saved separately from sound and does not play feedback yet", () => {
  assert.equal(nextCompletionStyleAction("simple"), "simple");
  assert.equal(nextCompletionStyleAction("celebrate"), "celebrate");
  assert.equal(nextCompletionStyleAction("sound"), null);
  assert.deepEqual(completionFeedbackPlan("celebrate", "on"), {
    visual: "celebrate",
    sound: "on",
    playVisualCelebration: false,
    playSound: false,
  });
  assert.deepEqual(completionFeedbackPlan("simple", "off"), {
    visual: "simple",
    sound: "off",
    playVisualCelebration: false,
    playSound: false,
  });
});
