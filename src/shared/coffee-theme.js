import { progressStage, visualProgress } from "./progress.js";

export function coffeeStageFromProgress(progress) {
  return progressStage(progress, 5);
}
export function describeCoffeeStage(p){ const s=coffeeStageFromProgress(p); if(s==null) return null; return {stage:s,count:5}; }
export const coffeeLevelsValues=[0,1,2,3,4];
function resolveCoffeeProgress(progress) {
  return visualProgress(progress) ?? { total: 0, complete: 0 };
}

export function coffeeLevels(progress) {
  const { total, complete } = resolveCoffeeProgress(progress);
  // Each completed task transfers the same proportion from the pot to the cup.
  const level = total > 0 ? Math.min(100, complete / total * 100) : 0;
  return { carafe: total > 0 ? 100 - level : 0, mug: level };
}
export const coffeeLevelsLegacy = coffeeLevelsValues;
export function isPouring(progress) {
  const { total, complete } = resolveCoffeeProgress(progress);
  return total > 0 && complete > 0 && complete < total;
}

export function coffeeFeedPath(progress) {
  const { carafe } = coffeeLevels(progress);
  // Local coordinates in the tilted 64x56 pot: liquid surface to spout lip.
  const surfaceY = 16 + 40 * (1 - carafe / 100);
  return `M52 ${surfaceY} L52 16 Q52 7 65 2`;
}

export function coffeePourMarkup() {
  return `<svg class="coffee-feed" viewBox="0 0 70 56" aria-hidden="true" focusable="false">
    <path class="coffee-feed-path" d="${coffeeFeedPath({ total: 0, complete: 0 })}" fill="none" stroke="#6d3b24" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" />
  </svg><svg class="pour-stream" viewBox="0 0 36 42" aria-hidden="true" focusable="false">
    <path class="coffee-stream-core" d="M2 2 C18 3 25 18 25 37" fill="none" stroke="#6d3b24" stroke-width="3.2" stroke-linecap="round" />
    <path class="coffee-stream-shimmer" d="M2 2 C18 3 25 18 25 37" fill="none" stroke="#f3c89e" stroke-width="1.1" stroke-linecap="round" stroke-dasharray="3 7" />
  </svg>`;
}
export function isSteaming(progress) {
  if (typeof progress === 'number') {
    return progress === 1;
  }
  const { total: t, complete: c } = resolveCoffeeProgress(progress);
  return t > 0 && c === t;
}
