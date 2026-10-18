import { progressStage, visualProgress } from "./progress.js";
import { isEmptyProgress, normalizeProgress } from "./progress.js";
export const SUBMARINE_STAGE_COUNT = 5;
const STAGE_LABELS = ["sonar ping", "propeller engaged", "cruising deep sea", "approaching seafloor", "treasure found"];
function resolveProgressObject(progress) {
  return visualProgress(progress) ?? { total: 0, complete: 0 };
}
export function submarineStageFromProgress(progress) {
  return progressStage(progress, SUBMARINE_STAGE_COUNT);
}
export function submarineStageForTasks(t) {
  let norm = normalizeProgress(t);
  return isEmptyProgress(norm) ? null : submarineStageFromProgress(norm);
}
export function submarineStageLabel(s) {
  return s == null || s < 0 || s >= STAGE_LABELS.length ? "" : STAGE_LABELS[s];
}
export function formatSubmarineAccessibleText(p) {
  let norm = resolveProgressObject(p);
  if (norm.total === 0) return "No submarine — add a task to dive";
  return `Submarine ${submarineStageLabel(submarineStageFromProgress(norm))}, ${norm.complete} of ${norm.total} complete`;
}
export function describeSubmarineStage(p) {
  let norm = resolveProgressObject(p);
  let stage = submarineStageFromProgress(norm);
  return stage === null ? null : { stage, label: submarineStageLabel(stage), count: SUBMARINE_STAGE_COUNT, accessibleText: formatSubmarineAccessibleText(norm) };
}
export function submarineSceneMarkup() {
  return `<svg class="submarine-scene" viewBox="0 0 148 64" width="100%" height="100%" aria-hidden="true" focusable="false">
    <defs><linearGradient id="sub-sea-grad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0d47a1"/><stop offset="62%" stop-color="#072a60"/><stop offset="100%" stop-color="#041838"/></linearGradient></defs>
    <rect x="0" y="0" width="148" height="64" rx="6" fill="url(#sub-sea-grad)"/>
    <path d="M0,54 Q36,51 74,54 T148,53 L148,64 L0,64 Z" fill="#c29b61"/>
    <g class="sub-stage sub-stage--0"><g transform="translate(10,26)"><rect x="-4" y="5" width="3" height="4" rx="1" fill="#90a4ae"/><rect x="8" y="0" width="9" height="4.5" rx="2" fill="#ffa000"/><rect x="0" y="3" width="28" height="9" rx="4.5" fill="#ffd54f"/><circle cx="8" cy="7.5" r="2" fill="#4dd0e1"/><circle cx="14.5" cy="7.5" r="2" fill="#4dd0e1"/><circle cx="21" cy="7.5" r="2" fill="#4dd0e1"/></g><circle cx="42" cy="33.5" r="5" fill="none" stroke="#4dd0e1" stroke-width="1"/><circle cx="42" cy="33.5" r="10" fill="none" stroke="#4dd0e1" stroke-width="0.8" opacity="0.6"/></g>
    <g class="sub-stage sub-stage--1"><g transform="translate(30,26)"><rect x="0" y="3" width="28" height="9" rx="4.5" fill="#ffd54f"/><circle cx="8" cy="7.5" r="2" fill="#4dd0e1"/><circle cx="14.5" cy="7.5" r="2" fill="#4dd0e1"/><circle cx="21" cy="7.5" r="2" fill="#4dd0e1"/></g><circle cx="20" cy="32" r="2" fill="#e0f7fa" opacity="0.8"/></g>
    <g class="sub-stage sub-stage--2"><g transform="translate(56,28)"><rect x="0" y="3" width="28" height="9" rx="4.5" fill="#ffd54f"/><circle cx="8" cy="7.5" r="2" fill="#4dd0e1"/><circle cx="14.5" cy="7.5" r="2" fill="#4dd0e1"/><circle cx="21" cy="7.5" r="2" fill="#4dd0e1"/></g><circle cx="36" cy="32" r="2" fill="#e0f7fa" opacity="0.7"/><circle cx="46" cy="34" r="2.2" fill="#80deea" opacity="0.8"/></g>
    <g class="sub-stage sub-stage--3"><g transform="translate(80,31)"><rect x="0" y="3" width="28" height="9" rx="4.5" fill="#ffd54f"/><circle cx="8" cy="7.5" r="2" fill="#4dd0e1"/><circle cx="14.5" cy="7.5" r="2" fill="#4dd0e1"/><circle cx="21" cy="7.5" r="2" fill="#4dd0e1"/></g><circle cx="56" cy="35" r="2" fill="#e0f7fa" opacity="0.7"/><circle cx="68" cy="37" r="2.2" fill="#80deea" opacity="0.8"/></g>
    <g class="sub-stage sub-stage--4"><g transform="translate(80,32)"><rect x="0" y="3" width="28" height="9" rx="4.5" fill="#ffd54f"/><circle cx="8" cy="7.5" r="2" fill="#4dd0e1"/><circle cx="14.5" cy="7.5" r="2" fill="#4dd0e1"/><circle cx="21" cy="7.5" r="2" fill="#4dd0e1"/></g><rect x="116" y="45" width="20" height="11" rx="1.5" fill="#6d4c41"/><path d="M115,43 Q126,34 137,43 Z" fill="#795548"/><circle cx="120" cy="45" r="2.2" fill="#ffd700"/><circle cx="127" cy="44" r="2.5" fill="#ffd700"/><circle cx="133" cy="45.2" r="2" fill="#ffd700"/><rect x="4" y="2" width="140" height="12" rx="6" fill="#fff8e1" stroke="#ffb300" stroke-width="1"/><text x="74" y="10.4" text-anchor="middle" font-family="system-ui, sans-serif" font-size="7.2" font-weight="800" fill="#0d47a1">TREASURE FOUND!</text></g>
  </svg>`;
}
