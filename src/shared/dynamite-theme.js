import { progressStage } from "./progress.js";

export function dynamiteStageFromProgress(progress) {
  return progressStage(progress, 5);
}
export function describeDynamiteStage(p){ const s=dynamiteStageFromProgress(p); if(s==null) return null; return {stage:s,count:5}; }
