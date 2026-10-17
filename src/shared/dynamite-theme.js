import { isEmptyProgress, normalizeProgress } from "./progress.js";
export function dynamiteStageFromProgress(progress){ const p=progress&&typeof progress==="object"?progress:normalizeProgress([]); const t=Number(p.total)||0; const c=Number(p.complete)||0; if(t===0) return null; if(c>=t) return 4; if(c<=0) return 0; return Math.min(4, Math.floor((c/t)*4)); }
export function describeDynamiteStage(p){ const s=dynamiteStageFromProgress(p); if(s==null) return null; return {stage:s,count:5}; }
