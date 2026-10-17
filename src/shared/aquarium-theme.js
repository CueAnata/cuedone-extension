import { isEmptyProgress, normalizeProgress } from "./progress.js";
export function aquariumStageFromProgress(p){ const q=p&&typeof p==="object"?p:normalizeProgress([]); const t=Number(q.total)||0; const c=Number(q.complete)||0; if(t===0) return null; if(c>=t) return 4; return Math.min(4, Math.floor((c/t)*4)); }
export function describeAquariumStage(p){ const s=aquariumStageFromProgress(p); if(s==null) return null; return {stage:s,count:5}; }
