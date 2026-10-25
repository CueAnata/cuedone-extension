import assert from "node:assert/strict";
import test from "node:test";
import { createTask } from "../src/shared/tasks.js";
import { planPersonalPrivateAudio } from "../src/shared/personal-audio.js";

const openList = [
  createTask("First", 1, "a"),
  createTask("Second", 2, "b"),
];
const lastOpen = [
  { ...createTask("First", 1, "a"), completed: true },
  createTask("Second", 2, "b"),
];

test("Private Sound On plays a task cue for a non-final completion", () => {
  const plan = planPersonalPrivateAudio({
    liveTasks: openList,
    id: "a",
    completed: true,
    presentationMode: "personal",
    personalPresentation: "private",
    sound: "on",
  });
  assert.equal(plan.playSound, true);
  assert.equal(plan.kind, "task");
  assert.equal(plan.isFinal, false);
});

test("Private final completion is a final-sound event", () => {
  const plan = planPersonalPrivateAudio({
    liveTasks: lastOpen,
    id: "b",
    completed: true,
    presentationMode: "personal",
    personalPresentation: "private",
    sound: "on",
  });
  assert.equal(plan.playSound, true);
  assert.equal(plan.kind, "final");
  assert.equal(plan.isFinal, true);
});

test("Task sound None still reports a final sound event", () => {
  const plan = planPersonalPrivateAudio({
    liveTasks: lastOpen,
    id: "b",
    completed: true,
    presentationMode: "personal",
    personalPresentation: "private",
    sound: "on",
  });
  assert.equal(plan.playSound, true);
  assert.equal(plan.kind, "final");
});

test("Sound Off, Public, Client, uncheck, and load-like states stay silent", () => {
  assert.equal(
    planPersonalPrivateAudio({
      liveTasks: openList,
      id: "a",
      completed: true,
      presentationMode: "personal",
      personalPresentation: "private",
      sound: "off",
    }).playSound,
    false
  );
  assert.equal(
    planPersonalPrivateAudio({
      liveTasks: openList,
      id: "a",
      completed: true,
      presentationMode: "personal",
      personalPresentation: "public",
      sound: "on",
    }).playSound,
    false
  );
  assert.equal(
    planPersonalPrivateAudio({
      liveTasks: openList,
      id: "a",
      completed: true,
      presentationMode: "client",
      personalPresentation: "private",
      sound: "on",
    }).playSound,
    false
  );
  assert.equal(
    planPersonalPrivateAudio({
      liveTasks: [{ ...openList[0], completed: true }, openList[1]],
      id: "a",
      completed: false,
      presentationMode: "personal",
      personalPresentation: "private",
      sound: "on",
    }).playSound,
    false
  );
  assert.equal(
    planPersonalPrivateAudio({
      liveTasks: lastOpen,
      id: "b",
      completed: true,
      presentationMode: "personal",
      personalPresentation: "private",
      sound: "on",
    }).unfinishedBefore,
    1
  );
});
