import { progressStage } from "./progress.js";
import { isEmptyProgress, normalizeProgress } from "./progress.js";
export const GUMBALL_STAGE_COUNT = 5;
export function gumballStageFromProgress(progress) {
  return progressStage(progress, GUMBALL_STAGE_COUNT);
}
export function gumballStageForTasks(tasks){ const p=normalizeProgress(tasks); if(isEmptyProgress(p)) return null; return gumballStageFromProgress(p); }
export function describeGumballStage(progress){ const s=gumballStageFromProgress(progress); if(s==null) return null; return {stage:s, count:GUMBALL_STAGE_COUNT, accessibleText: formatGumballAccessibleText(progress,s)}; }
export function formatGumballAccessibleText(progress, stage){ const total=Number(progress?.total)||0; const complete=Number(progress?.complete)||0; if(total===0) return "No gumball"; return `${complete} of ${total} complete`; }
