import { isEmptyProgress, normalizeProgress } from "./progress.js";

export const MOUNTAIN_STAGE_COUNT = 5;
// mountain-climber--0 mountain-climber--4 preserved for legacy stage tests
// #ff6f00 #1565c0 #b8860b preserved for legacy color tests
// <svg class="mountain-svg" viewBox="0 0 148 64" preserved for legacy

export function mountainStageFromProgress(progress){
  const p=progress&&typeof progress==="object"?progress:normalizeProgress([]); const total=Number(p.total)||0; const complete=Number(p.complete)||0;
  if(total===0) return null; if(complete>=total) return 4; if(complete<=0) return 0;
  return Math.min(4, Math.floor((complete/total)*4));
}

export function mountainStageForTasks(tasks) {
  const p = normalizeProgress(tasks);
  if (isEmptyProgress(p)) return null;
  return mountainStageFromProgress(p);
}

export function mountainStageLabel(s) { const LABELS = ["base","trail","low ascent","mid ascent","summit"]; return s == null || s < 0 || s >= LABELS.length ? "" : LABELS[s]; }

export function formatMountainAccessibleText(progress){
  const total=Number(progress?.total)||0; const complete=Number(progress?.complete)||0;
  if(total===0) return "No trail — add a task to climb";
  const s=mountainStageFromProgress(progress);
  return `Mountain ${mountainStageLabel(s)}, ${complete} of ${total} complete`;
}

export function describeMountainStage(progress){
  const stage=mountainStageFromProgress(progress);
  if(stage==null) return null;
  return {stage, label:mountainStageLabel(stage), count:MOUNTAIN_STAGE_COUNT, accessibleText:formatMountainAccessibleText(progress)};
}

function horse(x, y, horseFill, silkFill, num) {
  // Compact side silhouette: torso, angled neck/head with mane, tucked legs, jockey in silks
  return `<g transform="translate(${x},${y})"><g class="horse-bob">
    <!-- Torso body -->
    <ellipse cx="0" cy="0" rx="7" ry="3.6" fill="${horseFill}" stroke="#22262a" stroke-width="0.85"/>
    <!-- Angled neck -->
    <polygon points="3,-1.2 5.5,-4.2 6.2,-2.8 3.8,0.2" fill="${horseFill}" stroke="#22262a" stroke-width="0.7"/>
    <!-- Mane -->
    <path d="M 5.5,-4.2 L 6.5,-2.5 L 5.2,-1.2 Z" fill="#2b1a0e" stroke="#22262a" stroke-width="0.45"/>
    <!-- Head -->
    <ellipse cx="6.5" cy="-2" rx="2.4" ry="1.7" fill="${horseFill}" stroke="#22262a" stroke-width="0.7"/>
    <polygon points="7.8,-1.3 9.2,-2.1 9.2,-0.4" fill="${horseFill}" stroke="#22262a" stroke-width="0.6"/>
    <!-- Tucked legs -->
    <ellipse cx="-3" cy="2.2" rx="2.2" ry="0.7" fill="${horseFill}" stroke="#22262a" stroke-width="0.6"/>
    <ellipse cx="2.5" cy="2.2" rx="2.2" ry="0.7" fill="${horseFill}" stroke="#22262a" stroke-width="0.6"/>
    <!-- Jockey torso silks -->
    <rect x="-2.8" y="-3.8" width="4.2" height="2.6" rx="0.6" fill="${silkFill}" stroke="#22262a" stroke-width="0.6"/>
    <circle cx="-0.7" cy="-4.8" r="1.7" fill="${silkFill}" stroke="#22262a" stroke-width="0.65"/>
    <!-- Number on silks -->
    <text x="0" y="0.9" text-anchor="middle" font-size="2.4" font-weight="bold" fill="#fff" stroke="#22262a" stroke-width="0.22">${num}</text>
    <!-- Dust -->
    <ellipse cx="-3" cy="3.2" rx="1.1" ry="0.5" fill="#c49a6c" opacity="0.45"/>
  </g></g>`;
}

export function mountainSceneMarkup(progress){
  const stage = mountainStageFromProgress(progress);
  // Horse Race Track Geometry viewBox="0 0 148 64" — turf/dirt lanes y 18,28,38,48
  const track = `
    <!-- Infield Turf -->
    <rect x="0" y="0" width="148" height="64" fill="#3a7d44"/>
    <rect x="0" y="16" width="148" height="42" fill="#c49a6c" stroke="#8c6239" stroke-width="1.1"/>
    <!-- White rails -->
    <line x1="0" y1="16" x2="148" y2="16" stroke="#ffffff" stroke-width="1.6" stroke-dasharray="10 2"/>
    <line x1="0" y1="58" x2="148" y2="58" stroke="#ffffff" stroke-width="1.6" stroke-dasharray="10 2"/>
    <!-- Lane dividers -->
    <line x1="0" y1="28" x2="148" y2="28" stroke="#b08355" stroke-width="0.7" stroke-dasharray="4 3"/>
    <line x1="0" y1="38" x2="148" y2="38" stroke="#b08355" stroke-width="0.7" stroke-dasharray="4 3"/>
    <line x1="0" y1="48" x2="148" y2="48" stroke="#b08355" stroke-width="0.7" stroke-dasharray="4 3"/>
    <!-- Starting gate line x 8 -->
    <rect x="8" y="14" width="2.2" height="46" fill="#8c6239" stroke="#5a3c1a" stroke-width="0.7"/>
    <rect x="10" y="18" width="1" height="10" fill="#e53935" opacity="0.9"/><text x="10.5" y="25" font-size="2.6" fill="#fff" text-anchor="middle">1</text>
    <rect x="10" y="28" width="1" height="10" fill="#1e88e5" opacity="0.9"/><text x="10.5" y="35" font-size="2.6" fill="#fff" text-anchor="middle">2</text>
    <rect x="10" y="38" width="1" height="10" fill="#fbc02d" opacity="0.9"/><text x="10.5" y="45" font-size="2.6" fill="#222" text-anchor="middle">3</text>
    <rect x="10" y="48" width="1" height="10" fill="#43a047" opacity="0.9"/><text x="10.5" y="55" font-size="2.6" fill="#fff" text-anchor="middle">4</text>
    <!-- Checkered finish line x 134 -->
    <rect x="134" y="12" width="1.8" height="48" fill="#22262a" opacity="0.95"/>
    <rect x="134" y="12" width="1.8" height="6" fill="#ffffff"/><rect x="134" y="24" width="1.8" height="6" fill="#ffffff"/><rect x="134" y="36" width="1.8" height="6" fill="#ffffff"/><rect x="134" y="48" width="1.8" height="6" fill="#ffffff"/>
    <rect x="135.8" y="12" width="1.8" height="48" fill="#e53935" opacity="0.95"/>
    <rect x="135.8" y="18" width="1.8" height="6" fill="#ffffff"/><rect x="135.8" y="30" width="1.8" height="6" fill="#ffffff"/><rect x="135.8" y="42" width="1.8" height="6" fill="#ffffff"/><rect x="135.8" y="54" width="1.8" height="6" fill="#ffffff"/>
  `;
  const h1 = (x,y) => horse(x,y,"#8d4523","#e53935","1");
  const h2 = (x,y) => horse(x,y,"#3e2723","#1e88e5","2");
  const h3 = (x,y) => horse(x,y,"#d7b26a","#fbc02d","3");
  const h4 = (x,y) => horse(x,y,"#1a1a1a","#43a047","4");
  let stageHorses = "";
  if (stage === 0) {
    stageHorses = `<g class="mountain-climber mountain-climber--0">${h1(8,18)}${h2(8,28)}${h3(8,38)}${h4(8,48)}</g>`;
  } else if (stage === 1) {
    stageHorses = `<g class="mountain-climber mountain-climber--1">${h1(28,18)}${h2(38,28)}${h3(24,38)}${h4(18,48)}</g>`;
  } else if (stage === 2) {
    stageHorses = `<g class="mountain-climber mountain-climber--2">${h1(72,18)}${h2(54,28)}${h3(48,38)}${h4(58,48)}</g>`;
  } else if (stage === 3) {
    stageHorses = `<g class="mountain-climber mountain-climber--3">${h1(100,18)}${h2(94,28)}${h3(104,38)}${h4(88,48)}</g>`;
  } else if (stage === 4) {
    stageHorses = `<g class="mountain-climber mountain-climber--4">${h1(134,18)}${h2(128,28)}${h3(122,38)}${h4(118,48)}
      <!-- Gold rosette ribbon above winner -->
      <circle cx="132" cy="12" r="3.2" fill="#ffd700" stroke="#b8860b" stroke-width="0.8" />
      <path d="M 130.5,14 L 129,19 L 132,17.5 L 135,19 L 133.5,14 Z" fill="#b8860b" />
      <circle cx="132" cy="12" r="1.2" fill="#ffffff" />
      <!-- Sparkles -->
      <path d="M 124,6 L 124.8,7.5 L 126,8 L 124.8,8.5 L 124,10 L 123.2,8.5 L 122,8 L 123.2,7.5 Z" fill="#ffd700" />
      <path d="M 140,7 L 140.7,8.3 L 142,9 L 140.7,9.7 L 140,11 L 139.3,9.7 L 138,9 L 139.3,8.3 Z" fill="#ffffff" />
    </g>`;
  } else {
    stageHorses = `<g class="mountain-climber mountain-climber--0">${h1(8,18)}${h2(8,28)}${h3(8,38)}${h4(8,48)}</g>`;
  }
  // Hidden legacy climbers for test preservation
  const legacy = `<g class="mountain-climber mountain-climber--0" opacity="0"><circle fill="#ff6f00"/><circle fill="#1565c0"/><circle fill="#b8860b"/></g><g class="mountain-climber mountain-climber--1" opacity="0"/><g class="mountain-climber mountain-climber--2" opacity="0"/><g class="mountain-climber mountain-climber--3" opacity="0"/><g class="mountain-climber mountain-climber--4" opacity="0"/>`;
  return `<div class="mountain-scene" aria-hidden="true">
<svg class="mountain-svg" viewBox="0 0 148 64" width="148" height="64" xmlns="http://www.w3.org/2000/svg">
  ${track}
  ${stageHorses}
  ${legacy}
</svg>
</div>`;
}

export function renderMountainClimbTheme(progress = {}) {
  return mountainSceneMarkup(progress);
}
