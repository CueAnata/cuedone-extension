export const REWARD_OPTIONS = [
  { id: "none", label: "None" },
  { id: "your-choice", label: "Your Choice" },
  { id: "game-time", label: "Game Time" },
  { id: "music", label: "Music" },
  { id: "drawing", label: "Drawing" },
  { id: "reading", label: "Reading" },
  { id: "surprise", label: "Surprise" },
  { id: "custom", label: "Custom" },
];

const REWARD_IDS = REWARD_OPTIONS.map((option) => option.id);
const REWARD_LABELS = Object.fromEntries(
  REWARD_OPTIONS.map((option) => [option.id, option.label])
);
const REWARD_CUSTOM_MAX_LENGTH = 120;

export function normalizeRewardCustomText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, REWARD_CUSTOM_MAX_LENGTH);
}

export function normalizeReward(value, legacyText = "") {
  if (value && typeof value === "object") {
    const id = REWARD_IDS.includes(value.id) ? value.id : "none";
    return {
      id,
      customText: normalizeRewardCustomText(value.customText),
    };
  }

  const customText = normalizeRewardCustomText(
    typeof value === "string" ? value : legacyText
  );
  if (customText) {
    return { id: "custom", customText };
  }

  return { id: "none", customText: "" };
}

export function rewardShowsCustomInput(reward) {
  return normalizeReward(reward).id === "custom";
}

export function formatRewardCard(reward) {
  const next = normalizeReward(reward);
  if (next.id === "none") {
    return "";
  }

  if (next.id === "custom") {
    return next.customText;
  }

  return REWARD_LABELS[next.id] || "";
}

export function formatRewardReveal(reward) {
  const label = formatRewardCard(reward);
  if (!label) {
    return "";
  }

  return `REWARD: ${label.toUpperCase()}!`;
}

export function initialRewardEditing(reward) {
  const next = normalizeReward(reward);
  if (next.id === "custom") {
    return !next.customText;
  }

  return next.id === "none";
}

export function rewardEditorVisible(reward, editing) {
  if (editing) {
    return true;
  }

  const next = normalizeReward(reward);
  return next.id === "custom" && !next.customText;
}

export function rewardCardVisible(reward) {
  return Boolean(formatRewardCard(reward));
}

export function rewardEditVisible(reward, editing) {
  return !rewardEditorVisible(reward, editing);
}

export function nextRewardEditing(reward, action) {
  const next = normalizeReward(reward);
  if (action === "edit") {
    return true;
  }

  if (action === "select" || action === "custom-commit") {
    return next.id === "custom" && !next.customText;
  }

  return false;
}
