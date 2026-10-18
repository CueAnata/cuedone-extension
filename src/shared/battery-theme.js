import { progressStage, visualProgress } from "./progress.js";
import { isEmptyProgress, normalizeProgress } from "./progress.js";
export function batteryStageFromProgress(progress) {
  return progressStage(progress, 5);
}
export function describeBatteryStage(p){ const s=batteryStageFromProgress(p); if(s==null) return null; return {stage:s,count:5}; }
