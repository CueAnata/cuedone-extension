import assert from "node:assert/strict";
import test from "node:test";
import {
  REWARD_OPTIONS,
  formatRewardCard,
  formatRewardReveal,
  initialRewardEditing,
  nextRewardEditing,
  normalizeReward,
  rewardCardVisible,
  rewardEditVisible,
  rewardEditorVisible,
  rewardShowsCustomInput,
} from "../src/shared/reward.js";

test("reward presets include None through Custom", () => {
  assert.deepEqual(
    REWARD_OPTIONS.map((option) => option.label),
    [
      "None",
      "Your Choice",
      "Game Time",
      "Music",
      "Drawing",
      "Reading",
      "Surprise",
      "Custom",
    ]
  );
});

test("reward editor collapses after a preset is chosen", () => {
  assert.equal(initialRewardEditing({ id: "none" }), true);
  assert.equal(initialRewardEditing({ id: "game-time" }), false);
  assert.equal(initialRewardEditing({ id: "custom", customText: "" }), true);
  assert.equal(initialRewardEditing({ id: "custom", customText: "pizza" }), false);
  assert.equal(rewardEditorVisible({ id: "game-time" }, false), false);
  assert.equal(rewardCardVisible({ id: "game-time" }), true);
  assert.equal(rewardCardVisible({ id: "none" }), false);
  assert.equal(rewardEditVisible({ id: "none" }, false), true);
  assert.equal(nextRewardEditing({ id: "music" }, "select"), false);
  assert.equal(nextRewardEditing({ id: "none" }, "select"), false);
  assert.equal(nextRewardEditing({ id: "custom", customText: "" }, "select"), true);
  assert.equal(
    nextRewardEditing({ id: "custom", customText: "pizza" }, "custom-commit"),
    false
  );
  assert.equal(nextRewardEditing({ id: "music" }, "edit"), true);
});

test("Custom is the only reward that reveals a text input", () => {
  assert.equal(rewardShowsCustomInput({ id: "none" }), false);
  assert.equal(rewardShowsCustomInput({ id: "game-time" }), false);
  assert.equal(rewardShowsCustomInput({ id: "custom" }), true);
});

test("reward card shows the chosen preset and hides None", () => {
  assert.equal(formatRewardCard({ id: "none" }), "");
  assert.equal(formatRewardCard({ id: "game-time" }), "Game Time");
  assert.equal(
    formatRewardCard({ id: "custom", customText: "  ice cream  " }),
    "ice cream"
  );
  assert.equal(formatRewardCard({ id: "custom", customText: "" }), "");
});

test("final celebration reveal uses a prominent REWARD line", () => {
  assert.equal(formatRewardReveal({ id: "none" }), "");
  assert.equal(
    formatRewardReveal({ id: "game-time" }),
    "REWARD: GAME TIME!"
  );
  assert.equal(
    formatRewardReveal({ id: "custom", customText: "your pick" }),
    "REWARD: YOUR PICK!"
  );
});

test("invalid reward ids fall back to None without dropping custom text storage shape", () => {
  assert.deepEqual(normalizeReward({ id: "tokens", customText: "x" }), {
    id: "none",
    customText: "x",
  });
  assert.deepEqual(normalizeReward(undefined), {
    id: "none",
    customText: "",
  });
});
