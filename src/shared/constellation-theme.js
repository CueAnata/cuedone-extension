import { isEmptyProgress, normalizeProgress } from "./progress.js";
export const CONSTELLATION_STAGE_COUNT = 5;
export function constellationStageFromProgress(progress){
  const p=progress&&typeof progress==="object"?progress:normalizeProgress([]); const total=Number(p.total)||0; const complete=Number(p.complete)||0;
  if(total===0) return null; if(complete>=total) return CONSTELLATION_STAGE_COUNT-1; if(complete<=0) return 0;
  const percent=p.percent!=null?Number(p.percent):Math.round((complete/total)*100);
  return Math.max(0,Math.min(CONSTELLATION_STAGE_COUNT-1, Math.floor((percent/100)*(CONSTELLATION_STAGE_COUNT-1))));
}
export function constellationStageForTasks(tasks){ const p=normalizeProgress(tasks); if(isEmptyProgress(p)) return null; return constellationStageFromProgress(p); }
export function describeConstellationStage(progress){ const s=constellationStageFromProgress(progress); if(s==null) return null; return {stage:s,count:CONSTELLATION_STAGE_COUNT, accessibleText:formatConstellationAccessibleText(progress,s)}; }
export function formatConstellationAccessibleText(progress,stage){ const total=Number(progress?.total)||0; const complete=Number(progress?.complete)||0; if(total===0) return "No constellation"; return `${complete} of ${total} complete`; }
