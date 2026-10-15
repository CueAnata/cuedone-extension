import { isEmptyProgress, normalizeProgress } from "./progress.js";

export const PLANT_THEME_VALUES = ["off", "plant"];

export function normalizePlantTheme(value) {
  return value === "plant" ? "plant" : "off";
}

export const VISUAL_THEME_VALUES = [
  "plant",
  "gumball",
  "constellation",
  "mountain",
  "dynamite",
  "coffee",
  "battery",
  "aquarium",
  "kite",
  "rocket",
  "zen-terrarium",
  "fisherman",
];

export function normalizeVisualTheme(value) {
  if (VISUAL_THEME_VALUES.includes(value)) return value;
  if (value === "animal-puzzle") return "kite";
  return "plant";
}

export const PLANT_STAGE_COUNT = 5;

const PLANT_STAGE_LABELS = [
  "seed",
  "sprout",
  "growing",
  "budding",
  "bloom",
];

export function plantStageFromProgress(progress) {
  const normalized = progress && typeof progress === "object" ? progress : normalizeProgress([]);
  const total = Number(normalized.total) || 0;
  const complete = Number(normalized.complete) || 0;
  if (total === 0) return null;
  if (complete >= total) return PLANT_STAGE_COUNT - 1;
  if (complete <= 0) return 0;
  const percent = normalized.percent != null ? Number(normalized.percent) : Math.round((complete / total) * 100);
  const stage = Math.floor((percent / 100) * (PLANT_STAGE_COUNT - 1));
  return Math.max(0, Math.min(PLANT_STAGE_COUNT - 1, stage));
}

export function plantStageForTasks(tasks) {
  const progress = normalizeProgress(tasks);
  if (isEmptyProgress(progress)) return null;
  return plantStageFromProgress(progress);
}

export function plantStageLabel(stage) {
  if (stage == null || stage < 0 || stage >= PLANT_STAGE_LABELS.length) return "";
  return PLANT_STAGE_LABELS[stage];
}

export function plantThemeAllowed(presentationMode, personalPresentation, layout, theme) {
  const isPrivate = presentationMode === "personal" && personalPresentation === "private";
  const isLayout = layout === "one-active" || layout === "one_active" || layout === "full-list" || layout === "full_list";
  return isPrivate && isLayout && normalizePlantTheme(theme) === "plant";
}

export function isPlantVisible({ tasks, presentationMode, personalPresentation, layout, theme } = {}) {
  if (!plantThemeAllowed(presentationMode, personalPresentation, layout, theme)) return false;
  const progress = normalizeProgress(tasks);
  return !isEmptyProgress(progress);
}

export function formatPlantAccessibleText(progress, stage) {
  const total = Number(progress?.total) || 0;
  const complete = Number(progress?.complete) || 0;
  if (total === 0) return "No plant — add a task to grow";
  const s = plantStageFromProgress(progress);
  const label = plantStageLabel(s != null ? s : stage);
  const count = `${complete} of ${total} complete`;
  if (!label) return count;
  return `Plant ${label}, ${count}`;
}

export function describePlantStage(progress) {
  const stage = plantStageFromProgress(progress);
  if (stage == null) return null;
  return {
    stage,
    label: plantStageLabel(stage),
    count: PLANT_STAGE_COUNT,
    accessibleText: formatPlantAccessibleText(progress, stage),
  };
}
