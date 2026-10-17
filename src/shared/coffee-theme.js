import { isEmptyProgress, normalizeProgress } from "./progress.js";
export function coffeeStageFromProgress(p){ const q=p&&typeof p==="object"?p:normalizeProgress([]); const t=Number(q.total)||0; const c=Number(q.complete)||0; if(t===0) return null; if(c>=t) return 4; if(c<=0) return 0; return Math.min(4, Math.floor((c/t)*4)); }
export function describeCoffeeStage(p){ const s=coffeeStageFromProgress(p); if(s==null) return null; return {stage:s,count:5}; }
export const coffeeLevels=[0,1,2,3,4];
export function isPouring(){return false;}
export function isSteaming(){return false;}
