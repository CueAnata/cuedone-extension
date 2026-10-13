import { isEmptyProgress, normalizeProgress } from "./progress.js";
export const ROCKET_STAGE_COUNT = 6;
const LABELS = ["on stand", "fueling", "engines warm", "ignition", "approach", "landed"];
export function rocketStageFromProgress(p){
  const n=p&&typeof p==="object"?p:normalizeProgress([]); const t=Number(n.total)||0; const c=Number(n.complete)||0;
  if(t===0) return null; if(c>=t) return ROCKET_STAGE_COUNT-1; if(c<=0) return 0;
  const pct=n.percent!=null?Number(n.percent):Math.round((c/t)*100);
  let stage = Math.max(0,Math.min(ROCKET_STAGE_COUNT-1,Math.floor((pct/100)*(ROCKET_STAGE_COUNT-1))));
  if (stage === 0 && c > 0) stage = 1;
  return stage;
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
