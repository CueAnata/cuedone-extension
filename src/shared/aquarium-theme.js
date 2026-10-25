import { progressStage } from "./progress.js";

export function aquariumStageFromProgress(progress) {
  return progressStage(progress, 5);
}
export function describeAquariumStage(p){ const s=aquariumStageFromProgress(p); if(s==null) return null; return {stage:s,count:5}; }
