import assert from "node:assert/strict";
import test from "node:test";
import { createTask } from "../src/shared/tasks.js";
import {
  AFFIRMATION_PRESETS,
  COMPLETE_MESSAGE_PRESETS,
  DEFAULT_UNFINISHED_ENDING_TEXT,
  PAUSE_MESSAGE_PRESETS,
  PERSONAL_MESSAGE_MAX_LENGTH,
  bindEndingToTasks,
  canFinishForNow,
  chooseAffirmation,
  clearEndingState,
  createEndingState,
  disableAffirmation,
  enableAffirmation,
  endingVisible,
  endingMatchesTasks,
  finishForNowVisible,
  formatAffirmationText,
  isCompletedList,
  normalizeAffirmation,
  normalizeCompleteMessage,
  normalizeEndingState,
  normalizeMessageText,
  normalizePauseMessage,
  personalPrivateFeaturesAllowed,
  refreshRandomAffirmation,
} from "../src/shared/personal-messages.js";

const unfinished = [
  createTask("One", 1, "a"),
  createTask("Two", 2, "b"),
];
const complete = unfinished.map((task) => ({ ...task, completed: true }));

test("affirmation and ending catalogs include the approved presets", () => {
  assert.ok(AFFIRMATION_PRESETS.length >= 8);
  assert.ok(COMPLETE_MESSAGE_PRESETS.length >= 8);
  assert.ok(PAUSE_MESSAGE_PRESETS.length >= 8);
  assert.deepEqual(
    AFFIRMATION_PRESETS.map((item) => item.id),
    [
      "one-step",
      "small-steps",
      "begin-where-you-are",
      "own-pace",
      "next-step",
      "not-everything",
      "effort-matters",
      "make-room",
    ]
  );
  assert.match(
    AFFIRMATION_PRESETS.map((item) => item.text).join("\n"),
    /Small steps\. Big possibilities/
  );
  assert.match(
    AFFIRMATION_PRESETS.map((item) => item.text).join("\n"),
    /Find your spark/
  );
  assert.match(
    AFFIRMATION_PRESETS.map((item) => item.text).join("\n"),
    /You’ve got this next step/
  );
  assert.match(
    COMPLETE_MESSAGE_PRESETS.map((item) => item.text).join("\n"),
    /That’s a wrap\. Take a bow/
  );
  assert.match(
    COMPLETE_MESSAGE_PRESETS.map((item) => item.text).join("\n"),
    /Cue the happy dance/
  );
  assert.match(
    COMPLETE_MESSAGE_PRESETS.map((item) => item.text).join("\n"),
    /Done and dusted/
  );
  assert.match(
    PAUSE_MESSAGE_PRESETS.map((item) => item.text).join("\n"),
    /Good progress today\./
  );
  assert.match(
    PAUSE_MESSAGE_PRESETS.map((item) => item.text).join("\n"),
    /Progress made\. Permission to pause/
  );
  assert.match(
    PAUSE_MESSAGE_PRESETS.map((item) => item.text).join("\n"),
    /Your next step will be here/
  );
  assert.match(
    PAUSE_MESSAGE_PRESETS.map((item) => item.text).join("\n"),
    /Save your place\. Catch your breath/
  );
});

test("Personal message extras are Private-only", () => {
  assert.equal(personalPrivateFeaturesAllowed("personal", "private"), true);
  assert.equal(personalPrivateFeaturesAllowed("personal", "public"), false);
  assert.equal(personalPrivateFeaturesAllowed("client", "private"), false);
});

test("affirmations default Off and Custom text is plain and capped", () => {
  const next = normalizeAffirmation();
  assert.equal(next.enabled, false);
  assert.equal(next.choice, "one-step");
  assert.equal(formatAffirmationText(next), "");
  assert.equal(normalizeMessageText("  hello  "), "hello");
  assert.equal(normalizeMessageText("x".repeat(200)).length, PERSONAL_MESSAGE_MAX_LENGTH);
  assert.equal(
    formatAffirmationText({
      enabled: true,
      choice: "custom",
      customText: "<b>plain</b>",
    }),
    "<b>plain</b>"
  );
});

test("Random affirmation chooses once when enabled and stays stable afterward", () => {
  const picks = [0.1, 0.8, 0.4];
  let index = 0;
  const random = () => picks[index++] ?? 0.2;
  const enabled = enableAffirmation(
    { enabled: false, choice: "random", customText: "", resolvedId: null },
    random
  );
  assert.equal(enabled.enabled, true);
  assert.equal(enabled.choice, "random");
  assert.ok(enabled.resolvedId);
  const firstText = formatAffirmationText(enabled);
  const again = chooseAffirmation(enabled, "random", () => 0.9);
  assert.equal(again.resolvedId, enabled.resolvedId);
  assert.equal(formatAffirmationText(again), firstText);
  const refreshed = refreshRandomAffirmation(enabled, () => 0.95);
  assert.notEqual(refreshed.resolvedId, enabled.resolvedId);
  assert.equal(formatAffirmationText(disableAffirmation(enabled)), "");
});

test("unfinished endings default to Good progress today while completed endings stay independent", () => {
  assert.equal(normalizeCompleteMessage().choice, "none");
  assert.equal(normalizePauseMessage().choice, "good-progress");
  assert.equal(DEFAULT_UNFINISHED_ENDING_TEXT, "Good progress today.");
  assert.deepEqual(createEndingState("pause"), {
    kind: "pause",
    text: "Good progress today.",
  });
  const complete = createEndingState(
    "complete",
    { choice: "random", customText: "" },
    () => 0.01
  );
  const again = createEndingState(
    "complete",
    { choice: "random", customText: "" },
    () => 0.99
  );
  assert.equal(complete.kind, "complete");
  assert.ok(complete.text);
  assert.notEqual(complete.text, again.text);
  assert.deepEqual(normalizeEndingState(complete), complete);
  const pause = createEndingState("pause", { choice: "done-for-now", customText: "" });
  assert.equal(pause.text, "Progress made. Permission to pause.");
  assert.deepEqual(clearEndingState(), { kind: "none", text: "" });
  assert.deepEqual(
    createEndingState("complete", { choice: "none", customText: "" }),
    { kind: "none", text: "" }
  );
  assert.deepEqual(
    createEndingState("pause", { choice: "none", customText: "" }),
    { kind: "none", text: "" }
  );
});

test("Finish for now and completed-list messages follow list state", () => {
  assert.equal(canFinishForNow(unfinished), true);
  assert.equal(canFinishForNow(complete), false);
  assert.equal(canFinishForNow([]), false);
  assert.equal(isCompletedList(complete), true);
  assert.equal(isCompletedList(unfinished), false);
  assert.equal(
    finishForNowVisible({
      tasks: unfinished,
      presentationMode: "personal",
      personalPresentation: "private",
      ending: clearEndingState(),
    }),
    true
  );
  assert.equal(
    finishForNowVisible({
      tasks: unfinished,
      presentationMode: "personal",
      personalPresentation: "public",
      ending: clearEndingState(),
    }),
    false
  );
  assert.equal(
    endingVisible(
      { kind: "pause", text: "Done for now." },
      "personal",
      "public",
      unfinished
    ),
    false
  );
  assert.equal(
    endingVisible(
      bindEndingToTasks(
        { kind: "complete", text: "You did it!" },
        complete
      ),
      "personal",
      "private",
      complete
    ),
    true
  );
});

test("a deliberate unfinished pause survives reopening-like task changes until Continue", () => {
  const pause = createEndingState("pause");
  assert.equal(endingMatchesTasks(pause, unfinished), true);
  assert.equal(
    endingVisible(pause, "personal", "private", unfinished),
    true
  );

  const edited = [
    { ...unfinished[0], completed: true },
    unfinished[1],
    createTask("Added after pausing", 3, "c"),
  ];
  assert.equal(endingMatchesTasks(pause, edited), true);
  assert.equal(endingVisible(pause, "personal", "private", edited), true);
  assert.equal(endingVisible(pause, "personal", "public", edited), false);
  assert.equal(endingVisible(pause, "client", "private", edited), false);
  assert.equal(endingMatchesTasks(clearEndingState(), edited), false);
});

test("a completed ending restores only for its exact completed list", () => {
  const ending = bindEndingToTasks(
    createEndingState("complete", {
      choice: "all-done",
      customText: "",
    }),
    complete
  );
  assert.equal(endingMatchesTasks(ending, complete), true);
  assert.equal(endingVisible(ending, "personal", "private", complete), true);
  assert.equal(endingMatchesTasks(ending, unfinished), false);
  assert.equal(
    endingMatchesTasks(ending, [...complete, createTask("Different", 3, "c")]),
    false
  );
  assert.equal(
    endingMatchesTasks({ kind: "complete", text: "Legacy ending" }, complete),
    true
  );
});
