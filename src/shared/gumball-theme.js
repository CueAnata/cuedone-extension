import { isEmptyProgress, normalizeProgress } from "./progress.js";
export const GUMBALL_STAGE_COUNT = 5;
export function gumballStageFromProgress(progress){
  const p = progress && typeof progress==="object" ? progress : normalizeProgress([]);
  const total=Number(p.total)||0; const complete=Number(p.complete)||0;
  if(total===0) return null;
  if(complete>=total) return GUMBALL_STAGE_COUNT-1;
  if(complete<=0) return 0;
  const percent = p.percent!=null ? Number(p.percent) : Math.round((complete/total)*100);
  return Math.max(0, Math.min(GUMBALL_STAGE_COUNT-1, Math.floor((percent/100)*(GUMBALL_STAGE_COUNT-1))));
}
export function gumballStageForTasks(tasks){ const p=normalizeProgress(tasks); if(isEmptyProgress(p)) return null; return gumballStageFromProgress(p); }
export function describeGumballStage(progress){ const s=gumballStageFromProgress(progress); if(s==null) return null; return {stage:s, count:GUMBALL_STAGE_COUNT, accessibleText: formatGumballAccessibleText(progress,s)}; }
export function formatGumballAccessibleText(progress, stage){ const total=Number(progress?.total)||0; const complete=Number(progress?.complete)||0; if(total===0) return "No gumball"; return `${complete} of ${total} complete`; }
