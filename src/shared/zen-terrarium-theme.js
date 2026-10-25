import { progressStage } from "./progress.js";

export function zenTerrariumStageFromProgress(progress) {
  return progressStage(progress, 5);
}
export function describeZenTerrariumStage(p){ const s=zenTerrariumStageFromProgress(p); if(s==null) return null; return {stage:s,count:5}; }
