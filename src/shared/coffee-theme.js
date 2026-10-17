import { isEmptyProgress, normalizeProgress } from "./progress.js";
export function coffeeStageFromProgress(p){ const q=p&&typeof p==="object"?p:normalizeProgress([]); const t=Number(q.total)||0; const c=Number(q.complete)||0; if(t===0) return null; const fraction = t > 0 ? Math.min(Math.max(c / t, 0), 1) : 0; if(fraction >= 1) return 4; if(fraction <= 0) return 0; const stage = Math.floor(fraction * 4); if(!Number.isFinite(stage)) return 0; return Math.min(4, Math.max(0, stage)); }
export function describeCoffeeStage(p){ const s=coffeeStageFromProgress(p); if(s==null) return null; return {stage:s,count:5}; }
export const coffeeLevelsValues=[0,1,2,3,4];
export function coffeeLevels(progress){
  const q = progress && typeof progress === "object" ? progress : { total: 0, complete: 0 };
  const t = Number(q.total)||0;
  const c = Number(q.complete)||0;
  const fraction = t > 0 ? Math.min(Math.max(c / t, 0), 1) : 0;
  if (!Number.isFinite(fraction)) return { carafe: 100, mug: 0 };
  return { carafe: Math.max(0, 100 - fraction * 100), mug: Math.min(100, fraction * 100) };
}
export const coffeeLevelsLegacy = coffeeLevelsValues;
export function isPouring(){return false;}
export function isSteaming(progress) {
  if (typeof progress === 'number') {
    return progress >= 1;
  }
  const t = Number(progress?.total) || 0;
  const c = Number(progress?.complete) || 0;
  return t > 0 && c >= t;
}
