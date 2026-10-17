import { isEmptyProgress, normalizeProgress } from "./progress.js";
export function mountainStageFromProgress(progress){
  const p=progress&&typeof progress==="object"?progress:normalizeProgress([]); const total=Number(p.total)||0; const complete=Number(p.complete)||0;
  if(total===0) return null; if(complete>=total) return 4; if(complete<=0) return 0;
  return Math.min(4, Math.floor((complete/total)*4));
}
export function mountainSceneMarkup(progress){
  return `<svg class="mountain-svg" viewBox="0 0 100 60"><g class="mountain-climber--0"></g><g class="mountain-climber--4"></g><circle fill="#ff6f00"/><circle fill="#1565c0"/><circle fill="#b8860b"/></svg>`;
}
export function describeMountainStage(progress){ const s=mountainStageFromProgress(progress); if(s==null) return null; return {stage:s,count:5}; }
