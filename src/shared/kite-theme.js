import { progressStage, visualProgress } from "./progress.js";
import { isEmptyProgress, normalizeProgress } from "./progress.js";

export const KITE_STAGE_COUNT = 5;
const LABELS = ["grounded", "lifting", "rising", "soaring", "high"];

export function kiteStageFromProgress(progress) {
  const stage = progressStage(progress, KITE_STAGE_COUNT);
  return stage === 0 && visualProgress(progress)?.complete > 0 ? 1 : stage;
}

export function kiteStageForTasks(tasks) {
  const p = normalizeProgress(tasks);
  if (isEmptyProgress(p)) return null;
  return kiteStageFromProgress(p);
}

export function kiteStageLabel(s) {
  return s == null || s < 0 || s >= LABELS.length ? "" : LABELS[s];
}

export function formatKiteAccessibleText(progress) {
  const total = Number(progress?.total) || 0;
  const complete = Number(progress?.complete) || 0;
  if (total === 0) return "No kite — add a task to fly";
  const s = kiteStageFromProgress(progress);
  return `Kite ${kiteStageLabel(s)}, ${complete} of ${total} complete`;
}

export function describeKiteStage(progress) {
  const stage = kiteStageFromProgress(progress);
  if (stage == null) return null;
  return { stage, label: kiteStageLabel(stage), count: KITE_STAGE_COUNT, accessibleText: formatKiteAccessibleText(progress) };
}

function kiteDiamond({ x, y }) {
  // enlarged diamond centred at (x,y), ~26×26 to fill frame, preserves proportions
  // points: top (x,y-12), right (x+12,y), bottom (x,y+12), left (x-12,y)
  return `
    <g class="kite-shape" transform="translate(${x},${y})">
      <polygon points="0,-12 12,0 0,12 -12,0" fill="#fffdf8" stroke="#1a1a1a" stroke-width="1.45" stroke-linejoin="round"/>
      <polygon points="0,-12 12,0 0,0 -12,0" fill="#1e5aa8" stroke="#1a1a1a" stroke-width="1.05" stroke-linejoin="round"/>
      <polygon points="0,0 12,0 0,12 -12,0" fill="#ff8c2f" stroke="#1a1a1a" stroke-width="1.05" stroke-linejoin="round"/>
      <line x1="0" y1="-12" x2="0" y2="12" stroke="#1a1a1a" stroke-width="1.05" stroke-linecap="round"/>
      <line x1="-12" y1="0" x2="12" y2="0" stroke="#1a1a1a" stroke-width="1.05" stroke-linecap="round"/>
      <g class="kite-ribbon" transform="translate(0,12)">
        <path d="M0 0 C3 4 -3 8 2 12 C-2 15 3 18 0 22" fill="none" stroke="#1a1a1a" stroke-width="1.05" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M-4 4 L-7 6.5 L-3 8 Z" fill="#ff8c2f" stroke="#1a1a1a" stroke-width="0.85" stroke-linejoin="round"/>
        <path d="M2 10 L-2 13 L3 15 Z" fill="#1e5aa8" stroke="#1a1a1a" stroke-width="0.85" stroke-linejoin="round"/>
        <path d="M-2 18 L-5 20.5 L-1 22 Z" fill="#ff8c2f" stroke="#1a1a1a" stroke-width="0.85" stroke-linejoin="round"/>
      </g>
    </g>`;
}

function personFigure() {
  // Simple person on ground holding string, grounded at y≈52
  // Base at y=52 ground, person feet at 51, head at ~33
  return `
    <g class="kite-person" transform="translate(0,0)">
      <!-- shadow -->
      <ellipse cx="28" cy="51.5" rx="7" ry="1.2" fill="rgba(0,0,0,0.12)"/>
      <!-- legs - blue pants as in reference -->
      <path d="M24 42 L20 51 L22.5 51 L25 43 L29 43 L31.5 51 L34 51 L30 42 Z" fill="#2a5fb8" stroke="#1a1a1a" stroke-width="1.1" stroke-linejoin="round"/>
      <rect x="19.8" y="50.5" width="4.2" height="1.6" rx="0.7" fill="#ff8c2f" stroke="#1a1a1a" stroke-width="0.8"/>
      <rect x="30" y="50.5" width="4.2" height="1.6" rx="0.7" fill="#ff8c2f" stroke="#1a1a1a" stroke-width="0.8"/>
      <!-- torso - yellow top -->
      <path d="M22 32 H34 L33 42 H23 Z" fill="#ffbe2e" stroke="#1a1a1a" stroke-width="1.1" stroke-linejoin="round"/>
      <!-- arm holding string -->
      <path d="M33 35 C37 33 39 30 41 28" fill="none" stroke="#1a1a1a" stroke-width="1.35" stroke-linecap="round"/>
      <path d="M33 35 C36.5 34 38.5 31.5 40.5 29" fill="none" stroke="#ffbe2e" stroke-width="3.2" stroke-linecap="round"/>
      <circle cx="41" cy="28" r="1.6" fill="#e8b08a" stroke="#1a1a1a" stroke-width="0.9"/>
      <!-- head -->
      <circle cx="28" cy="26.5" r="5.2" fill="#e8b08a" stroke="#1a1a1a" stroke-width="1.1"/>
      <path d="M24.5 23.5 C24 20 28.5 18.2 32.2 20.2 C32 22 31.5 24.5 32.8 26.2 C30.5 26.8 26 26.5 24.5 23.5 Z" fill="#6b3a1f" stroke="#1a1a1a" stroke-width="0.9" stroke-linejoin="round"/>
      <circle cx="26.2" cy="27.1" r="0.5" fill="#1a1a1a"/><circle cx="29.8" cy="27.1" r="0.5" fill="#1a1a1a"/>
    </g>`;
}

export function kiteSceneMarkup() {
  // 148x64 scene - same footprint as other small visuals, tall enough for kite rise
  return `<div class="kite-scene" aria-hidden="true">
<svg class="kite-svg" viewBox="0 0 148 64" width="148" height="64" focusable="false">
  <rect width="148" height="64" rx="10" fill="#a8d8f0"/>
  <rect x="1" y="1" width="146" height="62" rx="9" fill="none" stroke="#7fb8d8" stroke-width="1.1"/>
  <!-- sky gradient -->
  <rect width="148" height="52" rx="10" fill="url(#kiteSky)"/>
  <defs>
    <linearGradient id="kiteSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#87c8f0"/>
      <stop offset="100%" stop-color="#cfe9f7"/>
    </linearGradient>
  </defs>
  <!-- ground -->
  <rect x="0" y="52" width="148" height="12" fill="#e8d5a8"/>
  <line x1="0" y1="52" x2="148" y2="52" stroke="#1a1a1a" stroke-width="1.4" stroke-linecap="round"/>
  ${personFigure()}
  <!-- strings per stage - only one visible via CSS -->
  <path class="kite-string kite-string--0" d="M41 28 C43 32 45 36 48 40" fill="none" stroke="#1a1a1a" stroke-width="1.25" stroke-linecap="round"/>
  <path class="kite-string kite-string--1" d="M41 28 C48 30 53 32 58 34" fill="none" stroke="#1a1a1a" stroke-width="1.25" stroke-linecap="round"/>
  <path class="kite-string kite-string--2" d="M41 28 C56 28 70 24 80 20" fill="none" stroke="#1a1a1a" stroke-width="1.25" stroke-linecap="round"/>
  <path class="kite-string kite-string--3" d="M41 28 C60 26 82 18 94 14" fill="none" stroke="#1a1a1a" stroke-width="1.25" stroke-linecap="round"/>
  <path class="kite-string kite-string--4" d="M41 28 C62 24 90 16 108 13" fill="none" stroke="#1a1a1a" stroke-width="1.25" stroke-linecap="round"/>
  <!-- kites per stage - enlarged to fill interior, kept fully inside border -->
  <g class="kite kite--0">${kiteDiamond({ x: 48, y: 40 })}</g>
  <g class="kite kite--1">${kiteDiamond({ x: 58, y: 34 })}</g>
  <g class="kite kite--2">${kiteDiamond({ x: 80, y: 20 })}</g>
  <g class="kite kite--3">${kiteDiamond({ x: 94, y: 14 })}</g>
  <g class="kite kite--4">${kiteDiamond({ x: 108, y: 13 })}</g>
</svg>
</div>`;
}
