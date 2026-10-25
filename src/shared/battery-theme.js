import { progressStage } from "./progress.js";

export function batteryStageFromProgress(progress) {
  return progressStage(progress, 5);
}
export function describeBatteryStage(p){ const s=batteryStageFromProgress(p); if(s==null) return null; return {stage:s,count:5}; }


// The controller wraps this scene in .personal-battery-visual and updates data-stage.
// CSS applies the full-charge pulse to that container in both task layouts.
export function batterySceneMarkup(idSuffix = "") {
  return `<div class="battery-scene" aria-hidden="true"><span class="battery-body"><span class="battery-fill"><span class="battery-charge-shimmer" aria-hidden="true"></span></span></span><span class="battery-tip"></span><span class="battery-bolt battery-bolt--top" aria-hidden="true"><svg viewBox="0 0 36 38" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="boltGradTop${idSuffix}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FFED4A"/><stop offset="45%" stop-color="#FFC400"/><stop offset="100%" stop-color="#FF8F00"/></linearGradient></defs><path d="M3 24 L22 4 L16 13 L33 2 L10 20 L16 16 Z" fill="url(#boltGradTop${idSuffix})" stroke="#B86A00" stroke-width="0.9" stroke-linejoin="round" stroke-linecap="round"/><path d="M3 24 L22 4 L16 13 L33 2" fill="none" stroke="rgba(255,255,255,0.62)" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg></span><span class="battery-bolt battery-bolt--bottom" aria-hidden="true"><svg viewBox="0 0 36 38" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="boltGradBot${idSuffix}" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#FFED4A"/><stop offset="45%" stop-color="#FFC400"/><stop offset="100%" stop-color="#FF8F00"/></linearGradient></defs><path d="M3 14 L22 34 L16 25 L33 36 L10 18 L16 22 Z" fill="url(#boltGradBot${idSuffix})" stroke="#B86A00" stroke-width="0.9" stroke-linejoin="round" stroke-linecap="round"/><path d="M3 14 L22 34 L16 25 L33 36" fill="none" stroke="rgba(255,255,255,0.62)" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg></span></div>`;
}
