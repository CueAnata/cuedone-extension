import { isEmptyProgress, normalizeProgress } from "./progress.js";
export const CONSTELLATION_STAGE_COUNT = 5;
export function constellationStageFromProgress(progress){
  const p=progress&&typeof progress==="object"?progress:normalizeProgress([]); const total=Number(p.total)||0; const complete=Number(p.complete)||0;
  if(total===0) return null; if(complete>=total) return CONSTELLATION_STAGE_COUNT-1; if(complete<=0) return 0;
  const percent=p.percent!=null?Number(p.percent):Math.round((complete/total)*100);
  return Math.max(0,Math.min(CONSTELLATION_STAGE_COUNT-1, Math.floor((percent/100)*(CONSTELLATION_STAGE_COUNT-1))));
}
export function constellationStageForTasks(tasks){ const p=normalizeProgress(tasks); if(isEmptyProgress(p)) return null; return constellationStageFromProgress(p); }
export function describeConstellationStage(progress){ const s=constellationStageFromProgress(progress); if(s==null) return null; return {stage:s,count:CONSTELLATION_STAGE_COUNT, accessibleText:formatConstellationAccessibleText(progress,s)}; }
export function formatConstellationAccessibleText(progress,stage){ const total=Number(progress?.total)||0; const complete=Number(progress?.complete)||0; if(total===0) return "No constellation"; return `${complete} of ${total} complete`; }
// 7-Star Big Dipper (Ursa Major) — 3-star handle + 4-star bowl, closed loop (legacy defect fix — scaled to 280x130 with 10px padding)
export const BIG_DIPPER_STARS = [
  { id: "Alkaid", x: 35, y: 75 },
  { id: "Mizar", x: 72, y: 62 },
  { id: "Alioth", x: 110, y: 68 },
  { id: "Megrez", x: 148, y: 70 },
  { id: "Phecda", x: 142, y: 104 },
  { id: "Merak", x: 198, y: 108 },
  { id: "Dubhe", x: 206, y: 64 },
];
export const BIG_DIPPER_HANDLE = [["Alkaid","Mizar"],["Mizar","Alioth"],["Alioth","Megrez"]];
export const BIG_DIPPER_BOWL = [["Megrez","Phecda"],["Phecda","Merak"],["Merak","Dubhe"],["Dubhe","Megrez"]];
export function constellationSceneMarkup(progress) {
  const stage = constellationStageFromProgress(progress);
  // Progressive reveal: stage 0 faint sky, 1 handle, 2 bottom bowl, 3 full glow
  const handle = BIG_DIPPER_HANDLE.map(([a,b])=>{ const s=BIG_DIPPER_STARS.find(s=>s.id===a), t=BIG_DIPPER_STARS.find(s=>s.id===b); return `<line x1="${s.x}" y1="${s.y}" x2="${t.x}" y2="${t.y}" class="constellation-line handle" />`; }).join("");
  const bowl = BIG_DIPPER_BOWL.map(([a,b])=>{ const s=BIG_DIPPER_STARS.find(s=>s.id===a), t=BIG_DIPPER_STARS.find(s=>s.id===b); return `<line x1="${s.x}" y1="${s.y}" x2="${t.x}" y2="${t.y}" class="constellation-line bowl" />`; }).join("");
  const stars = BIG_DIPPER_STARS.map(s=>`<span class="constellation-star star--${s.id.toLowerCase()}" style="left:${s.x}px;top:${s.y}px" data-star="${s.id}"></span>`).join("");
  // stage-based opacity handled via CSS data-stage; markup always contains full geometry for center-to-center lines
  return `<div class="constellation-sky" data-stage="${stage==null?0:stage}" aria-hidden="true"><svg class="constellation-lines" viewBox="0 0 260 140" preserveAspectRatio="xMidYMid meet" aria-hidden="true">${stage==null||stage===0? handle+bowl : stage===1?handle : stage===2?handle+'<line x1="148" y1="70" x2="142" y2="104" class="constellation-line bowl" /><line x1="142" y1="104" x2="198" y2="108" class="constellation-line bowl" />' : handle+bowl}</svg>${stars}</div>`;
}
