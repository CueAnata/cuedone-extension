import assert from "node:assert/strict";
import test from "node:test";
import {
  FINAL_CELEBRATIONS,
  FINAL_TRAILS,
  MICRO_CELEBRATIONS,
  applyTaskCompletion,
  completionEvent,
  completionFeedbackPlan,
  formatProgressLabel,
  isFinalCompletionTransition,
  nextCompletionStyleAction,
  nextFinalCelebrationAction,
  nextSoundAction,
  nextUnfinishedTask,
  pickCelebration,
  pickFinalTrail,
  planFromCheckboxCompletion,
  resetListVisible,
  snapshotTasks,
  taskProgress,
  unfinishedCount,
} from "../src/shared/client-view.js";
import { createTask, resetCompletedTasks, toggleTask } from "../src/shared/tasks.js";
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

test("resetting a complete list returns progress to 0 of n", () => {
  const complete = [
    { ...createTask("One", 1, "a"), completed: true },
    { ...createTask("Two", 2, "b"), completed: true },
    { ...createTask("Three", 3, "c"), completed: true },
  ];
  const reset = resetCompletedTasks(complete);
  assert.deepEqual(taskProgress(reset), {
    complete: 0,
    total: 3,
    percent: 0,
  });
  assert.equal(formatProgressLabel(taskProgress(reset)), "0 of 3 complete");
});

test("Reset List stays hidden until the list is complete and any final celebration ends", () => {
  const complete = [
    { ...createTask("One", 1, "a"), completed: true },
    { ...createTask("Two", 2, "b"), completed: true },
  ];
  const unfinished = [createTask("One", 1, "a"), createTask("Two", 2, "b")];

  assert.equal(
    resetListVisible({
      tasks: unfinished,
      presentation: "client",
      style: "celebrate",
    }),
    false
  );
  assert.equal(
    resetListVisible({
      tasks: complete,
      presentation: "client",
      style: "celebrate",
      finalCelebrationActive: true,
    }),
    false
  );
  assert.equal(
    resetListVisible({
      tasks: complete,
      presentation: "client",
      style: "celebrate",
      finalCelebrationActive: false,
    }),
    true
  );
  assert.equal(
    resetListVisible({
      tasks: complete,
      presentation: "client",
      style: "simple",
      finalCelebrationActive: false,
    }),
    true
  );
  assert.equal(
    resetListVisible({
      tasks: complete,
      presentation: "personal",
      style: "celebrate",
      finalCelebrationActive: true,
    }),
    true
  );
});

test("nextModeAction only accepts Personal or Client presentation", () => {
  assert.equal(nextModeAction("client"), "client");
  assert.equal(nextModeAction("personal"), "personal");
  assert.equal(nextModeAction("side"), null);
});

test("reduced motion uses a quiet acknowledgement instead of a moving pool pick", () => {
  assert.equal(pickCelebration("micro", true), "yay");
  assert.equal(pickCelebration("final", true), "you-did-it");
  assert.equal(MICRO_CELEBRATIONS.includes("dog"), false);
  assert.equal(MICRO_CELEBRATIONS.includes("buddy"), true);
  assert.equal(FINAL_CELEBRATIONS.includes("fireworks"), true);
  const first = pickCelebration("micro", false, null, () => 0);
  const second = pickCelebration("micro", false, first, () => 0);
  assert.notEqual(second, first);
});

test("Celebrate is saved separately from sound", () => {
  assert.equal(nextCompletionStyleAction("simple"), "simple");
  assert.equal(nextCompletionStyleAction("celebrate"), "celebrate");
  assert.equal(nextCompletionStyleAction("sound"), null);
  assert.equal(nextSoundAction("on"), "on");
  assert.equal(nextSoundAction("off"), "off");
  assert.equal(nextSoundAction("celebrate"), null);
});

test("Simple mode does not celebrate even in Client View", () => {
  assert.deepEqual(
    completionFeedbackPlan({
      presentation: "client",
      style: "simple",
      sound: "on",
      completing: true,
      remainingIncomplete: 1,
    }),
    {
      visual: "simple",
      sound: "on",
      playVisualCelebration: false,
      playSound: false,
      playTrail: false,
      kind: null,
    }
  );
});

test("Celebrate mode triggers micro-feedback on a non-final Client completion", () => {
  const previous = [
    createTask("One", 1, "a"),
    createTask("Two", 2, "b"),
  ];
  const next = toggleTask(previous, "a");
  const event = completionEvent(previous, next, "a");
  assert.equal(event.isFinal, false);
  assert.deepEqual(
    completionFeedbackPlan({
      presentation: "client",
      style: "celebrate",
      sound: "off",
      completing: true,
      remainingIncomplete: event.remainingIncomplete,
    }),
    {
      visual: "celebrate",
      sound: "off",
      playVisualCelebration: true,
      playSound: false,
      playTrail: false,
      kind: "micro",
    }
  );
});

test("final unfinished task triggers a larger Client celebration", () => {
  const previous = [
    { ...createTask("One", 1, "a"), completed: true },
    createTask("Two", 2, "b"),
  ];
  const next = toggleTask(previous, "b");
  const event = completionEvent(previous, next, "b");
  assert.equal(event.isFinal, true);
  assert.deepEqual(
    completionFeedbackPlan({
      presentation: "client",
      style: "celebrate",
      sound: "on",
      completing: true,
      remainingIncomplete: event.remainingIncomplete,
    }),
    {
      visual: "celebrate",
      sound: "on",
      playVisualCelebration: true,
      playSound: true,
      playTrail: true,
      kind: "final",
    }
  );
});

test("sound off means no celebration audio while Celebrate can still play visuals", () => {
  const plan = completionFeedbackPlan({
    presentation: "client",
    style: "celebrate",
    sound: "off",
    completing: true,
    remainingIncomplete: 0,
  });
  assert.equal(plan.playVisualCelebration, true);
  assert.equal(plan.playSound, false);
  assert.equal(plan.kind, "final");
});

test("Client-only celebrations do not leak into Personal mode", () => {
  assert.deepEqual(
    completionFeedbackPlan({
      presentation: "personal",
      style: "celebrate",
      sound: "on",
      completing: true,
      remainingIncomplete: 0,
    }),
    {
      visual: "celebrate",
      sound: "on",
      playVisualCelebration: false,
      playSound: false,
      playTrail: false,
      kind: null,
    }
  );
});

test("unchecking a task does not create a celebration event", () => {
  const previous = [{ ...createTask("One", 1, "a"), completed: true }];
  assert.equal(completionEvent(previous, toggleTask(previous, "a"), "a"), null);
});

test("final-task transition to zero incomplete tasks is a final celebration", () => {
  const previous = [
    { ...createTask("One", 1, "a"), completed: true },
    { ...createTask("Two", 2, "b"), completed: true },
    { ...createTask("Three", 3, "c"), completed: true },
    { ...createTask("Four", 4, "d"), completed: true },
    createTask("Five", 5, "e"),
  ];
  const next = toggleTask(previous, "e");
  const event = completionEvent(previous, next, "e");
  assert.equal(event.previousIncomplete, 1);
  assert.equal(event.remainingIncomplete, 0);
  assert.equal(event.isFinal, true);
  assert.equal(
    completionFeedbackPlan({
      presentation: "client",
      style: "celebrate",
      sound: "off",
      completing: true,
      remainingIncomplete: event.remainingIncomplete,
      isFinal: event.isFinal,
    }).kind,
    "final"
  );
});

test("final celebration takes precedence over micro celebration", () => {
  const plan = completionFeedbackPlan({
    presentation: "client",
    style: "celebrate",
    sound: "on",
    completing: true,
    remainingIncomplete: 1,
    isFinal: true,
  });
  assert.equal(plan.kind, "final");
  assert.equal(plan.playVisualCelebration, true);
  assert.equal(plan.playTrail, true);
});

test("sound-on path is invoked in Client + Celebrate", () => {
  const plan = completionFeedbackPlan({
    presentation: "client",
    style: "celebrate",
    sound: "on",
    completing: true,
    remainingIncomplete: 2,
    isFinal: false,
  });
  assert.equal(plan.playSound, true);
  assert.equal(plan.playVisualCelebration, true);
  assert.equal(plan.kind, "micro");
  assert.equal(plan.playTrail, false);
});

test("final-trail fires only when the list transitions to fully complete", () => {
  const previous = [
    { ...createTask("One", 1, "a"), completed: true },
    { ...createTask("Two", 2, "b"), completed: true },
    { ...createTask("Three", 3, "c"), completed: true },
    { ...createTask("Four", 4, "d"), completed: true },
    createTask("Five", 5, "e"),
  ];
  const result = planFromCheckboxCompletion({
    snapshot: previous,
    liveTasks: previous,
    id: "e",
    completed: true,
    presentation: "client",
    style: "celebrate",
    sound: "off",
  });
  assert.equal(result.unfinishedBefore, 1);
  assert.equal(result.unfinishedAfter, 0);
  assert.equal(result.isFinal, true);
  assert.equal(result.plan.kind, "final");
  assert.equal(result.plan.playTrail, true);
  assert.equal(result.plan.playVisualCelebration, true);
  assert.deepEqual(FINAL_TRAILS, ["balloons", "stars", "cars", "butterflies"]);
  assert.equal(pickFinalTrail("balloons"), "balloons");
  assert.equal(pickFinalTrail("stars"), "stars");
  assert.equal(pickFinalTrail("cars"), "cars");
  assert.equal(pickFinalTrail("butterflies"), "butterflies");
  assert.equal(FINAL_TRAILS.includes(pickFinalTrail("random", null, () => 0)), true);
  assert.equal(nextFinalCelebrationAction("random"), "random");
  assert.equal(nextFinalCelebrationAction("balloons"), "balloons");
  assert.equal(nextFinalCelebrationAction("confetti"), null);
});

test("micro-celebrations do not trigger the final trail", () => {
  const previous = [createTask("One", 1, "a"), createTask("Two", 2, "b")];
  const result = planFromCheckboxCompletion({
    snapshot: previous,
    liveTasks: previous,
    id: "a",
    completed: true,
    presentation: "client",
    style: "celebrate",
    sound: "on",
  });
  assert.equal(result.isFinal, false);
  assert.equal(result.plan.kind, "micro");
  assert.equal(result.plan.playTrail, false);
  assert.equal(
    completionFeedbackPlan({
      presentation: "personal",
      style: "celebrate",
      completing: true,
      isFinal: true,
    }).playTrail,
    false
  );
  assert.equal(
    completionFeedbackPlan({
      presentation: "client",
      style: "simple",
      completing: true,
      isFinal: true,
    }).playTrail,
    false
  );
});

test("no sound in Simple or Personal", () => {
  assert.equal(
    completionFeedbackPlan({
      presentation: "client",
      style: "simple",
      sound: "on",
      completing: true,
      remainingIncomplete: 0,
      isFinal: true,
    }).playSound,
    false
  );
  assert.equal(
    completionFeedbackPlan({
      presentation: "personal",
      style: "celebrate",
      sound: "on",
      completing: true,
      remainingIncomplete: 0,
      isFinal: true,
    }).playSound,
    false
  );
});

test("runtime last-task click uses unfinished before/after even if live state already mutated", () => {
  const beforeClick = [
    { ...createTask("One", 1, "a"), completed: true },
    { ...createTask("Two", 2, "b"), completed: true },
    { ...createTask("Three", 3, "c"), completed: true },
    { ...createTask("Four", 4, "d"), completed: true },
    createTask("Five", 5, "e"),
  ];
  const alreadyMutated = applyTaskCompletion(beforeClick, "e", true);

  assert.equal(unfinishedCount(beforeClick), 1);
  assert.equal(unfinishedCount(alreadyMutated), 0);
  assert.equal(isFinalCompletionTransition(beforeClick, alreadyMutated), true);
  assert.equal(isFinalCompletionTransition(alreadyMutated, alreadyMutated), false);

  const missedByToggle = toggleTask(alreadyMutated, "e");
  assert.equal(unfinishedCount(missedByToggle), 1);
  assert.equal(completionEvent(alreadyMutated, missedByToggle, "e"), null);

  const fromSnapshot = planFromCheckboxCompletion({
    snapshot: snapshotTasks(beforeClick),
    liveTasks: alreadyMutated,
    id: "e",
    completed: true,
    presentation: "client",
    style: "celebrate",
    sound: "off",
  });
  assert.equal(fromSnapshot.unfinishedBefore, 1);
  assert.equal(fromSnapshot.unfinishedAfter, 0);
  assert.equal(fromSnapshot.isFinal, true);
  assert.equal(fromSnapshot.plan.kind, "final");

  const fromMutatedLive = planFromCheckboxCompletion({
    liveTasks: alreadyMutated,
    id: "e",
    completed: true,
    presentation: "client",
    style: "celebrate",
    sound: "off",
  });
  assert.equal(fromMutatedLive.unfinishedBefore, 1);
  assert.equal(fromMutatedLive.unfinishedAfter, 0);
  assert.equal(fromMutatedLive.isFinal, true);
  assert.equal(fromMutatedLive.plan.kind, "final");
});

test("runtime non-final checkbox stays a micro celebration", () => {
  const previous = [createTask("One", 1, "a"), createTask("Two", 2, "b")];
  const result = planFromCheckboxCompletion({
    snapshot: previous,
    liveTasks: previous,
    id: "a",
    completed: true,
    presentation: "client",
    style: "celebrate",
    sound: "off",
  });
  assert.equal(result.unfinishedBefore, 2);
  assert.equal(result.unfinishedAfter, 1);
  assert.equal(result.isFinal, false);
  assert.equal(result.plan.kind, "micro");
});

test("Personal allows resetting partial completion while Client keeps its completed-list gate", () => {
  const tasks=[{...createTask("One",1,"a"),completed:true},createTask("Two",2,"b")];
  assert.equal(resetListVisible({tasks,presentation:"personal"}),true);
  assert.equal(resetListVisible({tasks,presentation:"client"}),false);
});
