import { progressStage, visualProgress } from "./progress.js";
import { isEmptyProgress, normalizeProgress } from "./progress.js";
export const ROCKET_STAGE_COUNT = 6;
const LABELS = ["on stand", "fueling", "engines warm", "ignition", "approach", "landed"];
export function rocketStageFromProgress(progress) {
  const stage = progressStage(progress, ROCKET_STAGE_COUNT);
  return stage === 0 && visualProgress(progress)?.complete > 0 ? 1 : stage;
}
export function rocketStageForTasks(tasks){ const p=normalizeProgress(tasks); if(isEmptyProgress(p)) return null; return rocketStageFromProgress(p); }
export function rocketStageLabel(s){ return s==null||s<0||s>=LABELS.length?"":LABELS[s]; }
export function formatRocketAccessibleText(progress){
  const t=Number(progress?.total)||0; const c=Number(progress?.complete)||0;
  if(t===0) return "No rocket — add a task to build";
  return `Rocket ${rocketStageLabel(rocketStageFromProgress(progress))}, ${c} of ${t} complete`;
}
export function describeRocketStage(progress){
  const s=rocketStageFromProgress(progress); if(s==null) return null;
  return { stage:s, label:rocketStageLabel(s), count:ROCKET_STAGE_COUNT, accessibleText:formatRocketAccessibleText(progress) };
}
