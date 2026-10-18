import { progressStage, visualProgress } from "./progress.js";
import { isEmptyProgress, normalizeProgress } from "./progress.js";
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
export function isSteaming(progress) {
  if (typeof progress === 'number') {
    return progress === 1;
  }
  const { total: t, complete: c } = resolveCoffeeProgress(progress);
  return t > 0 && c === t;
}
