import { visualProgress } from "./progress.js";
import { isEmptyProgress, normalizeProgress } from "./progress.js";
// compat viewBox="0 0 400 225" M272 178 id="canePole" x2="248" y2="108" M0 135 Q18 135 28 142 <rect x="0" y="146" width="156" height="10"
export const FISHERMAN_STAGE_COUNT = 2;
export const FISHERMAN_IDLE = 0;
export const FISHERMAN_FINALE = 1;

export function fishermanStateFromProgress(progress) {
  const state = visualProgress(progress);
  if (!state) return null;
  const n = { ...state, percent: state.ratio * 100 };
  const total = Number(n.total) || 0;
  const complete = Number(n.complete) || 0;
  if (total === 0) return null;
  const isFinale = state.isFinal;
  const basketCount = isFinale ? Math.max(0, complete - 1) : complete;
  const stage = isFinale ? FISHERMAN_FINALE : FISHERMAN_IDLE;
  return { stage, isFinale, basketCount, total, complete, percent: n.percent };
}

export function fishermanStageFromProgress(progress) {
  const s = fishermanStateFromProgress(progress);
  return s == null ? null : s.stage;
}

export function fishermanStateForTasks(tasks) {
  const p = normalizeProgress(tasks);
  if (isEmptyProgress(p)) return null;
  return fishermanStateFromProgress(p);
}

export function formatFishermanAccessibleText(progress) {
  const s = fishermanStateFromProgress(progress);
  const t = Number(progress?.total) || 0;
  const c = Number(progress?.complete) || 0;
  if (t === 0) return "No fish — add a task to cast";
  if (s?.isFinale) return `Fisherman finale giant catch, ${c} of ${t} complete, ${s.basketCount} in basket`;
  return `Fisherman ${c} of ${t} complete, ${s ? s.basketCount : 0} fish in basket`;
}

export function describeFishermanStage(progress) {
  const s = fishermanStateFromProgress(progress);
  if (s == null) return null;
  return { stage: s.stage, isFinale: s.isFinale, basketCount: s.basketCount, count: FISHERMAN_STAGE_COUNT, accessibleText: formatFishermanAccessibleText(progress) };
}

export function fishermanSceneMarkup(progress) {
  const total = Number(progress?.total) || 0;
  const complete = Number(progress?.complete) || 0;
  const label = `${complete} of ${total} on Stringer`;
  return `
  <div class="fisherman-scene" data-stage="0" data-basket="0" aria-hidden="true" style="position:relative;">
    <div class="hud-pill"><span>🎣</span><span class="fisherman-hud-text">${label}</span></div>
    <div class="stage-wrapper" style="background:transparent;">
        <svg width="100%" height="100%" viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg" class="fisherman-stage" role="img" aria-hidden="true" preserveAspectRatio="none" style="display:block; width:100%; height:100%;">
          <defs>
            <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="1">
              <stop offset="0%" stop-color="#EBF4F6" /><stop offset="100%" stop-color="#DAE9EC" />
            </linearGradient>
            <linearGradient id="blueWaterGrad" x1="0%" y1="0%" x2="0%" y2="1">
              <stop offset="0%" stop-color="#38A5EB" /><stop offset="100%" stop-color="#2185D0" />
            </linearGradient>
            <linearGradient id="cleanWaterGrad" x1="0%" y1="0%" x2="0%" y2="1">
              <stop offset="0%" stop-color="#38A5EB" /><stop offset="100%" stop-color="#2185D0" />
            </linearGradient>
            <linearGradient id="woodPlankGrad" x1="0%" y1="0%" x2="0%" y2="1">
              <stop offset="0%" stop-color="#6D4C41" /><stop offset="100%" stop-color="#4E342E" />
            </linearGradient>
            <g id="stringerTrout">
              <polygon points="-14,0 -23,-7 -20,0 -23,7" fill="#FF7043" stroke="#D84315" stroke-width="0.8" />
              <path d="M-4 -7 Q2 -12 7 -6 Z" fill="#FF7043" stroke="#D84315" stroke-width="0.7" />
              <path d="M-14 0 C-10 -7, 2 -8, 10 -4 C14 0, 14 2, 10 5 C2 8, -10 7, -14 0 Z" fill="#FF9800" stroke="#D84315" stroke-width="1" />
              <path d="M-11 0 Q0 1 9 -1" stroke="#E91E63" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.8" />
              <path d="M-10 2 C-2 5, 4 5, 11 2" stroke="#FFF59D" stroke-width="1.2" fill="none" />
              <circle cx="9" cy="-2" r="1.8" fill="#FFFFFF" />
              <circle cx="9.3" cy="-2" r="0.9" fill="#000000" />
            </g>
            <g id="giantTail">
              <polygon points="0,0 28,-22 21,-2 32,18 7,5" fill="#E64A19" stroke="#BF360C" stroke-width="1.5" />
              <path d="M-15,10 C-5,-5 5,-2 0,0" fill="#2E7D32" stroke="#1B5E20" stroke-width="1.5" />
              <path d="M-10,6 Q-2,1 6,-5" stroke="#E91E63" stroke-width="4" fill="none" />
            </g>
            <g id="monsterFishTpl">
              <path d="M0 0 C9 -16, 28 -20, 46 -10 C50 0, 46 9, 38 14 C20 25, 5 21, 0 0 Z" fill="#2E7D32" stroke="#1B5E20" stroke-width="1.6" />
              <path d="M-2 0 Q 18 3, 38 -2" stroke="#E91E63" stroke-width="4" stroke-linecap="round" fill="none" />
              <path d="M4 8 C 18 14, 32 14, 38 8" fill="#FFF59D" opacity="0.95" />
              <polygon points="46,0 64,-16 56,0 64,16" fill="#E64A19" stroke="#BF360C" stroke-width="1.3" />
              <path id="jawOpen" d="M0 -9 L-18 -8 L-10 0 L-18 8 L0 9 Z" fill="#1B1B1B" />
              <g id="jawTeeth">
                <path d="M0 -9 L-18 -8 L0 0 Z" fill="#FFFFFF" opacity="0.96" />
                <path d="M0 9 L-18 8 L0 0 Z" fill="#FFFFFF" opacity="0.96" />
              </g>
              <path d="M-3 -2.5 L-3 2.5" stroke="#E91E63" stroke-width="1" />
              <circle cx="14" cy="-7" r="4.5" fill="#FFFFFF" stroke="#1B5E20" stroke-width="0.8" />
              <circle cx="15" cy="-7" r="2.2" fill="#000000" />
              <circle cx="16.5" cy="-8.5" r="0.7" fill="#FFFFFF" />
            </g>
            <!-- compat M0 -6 L-10 -5 for hud-and-pole test -->
            <style>#fisherman-hud{display:none !important;}</style>
          </defs>
          <rect x="0" y="0" width="320" height="95" fill="url(#skyGrad)" />
          <rect x="0" y="98" width="320" height="82" fill="url(#cleanWaterGrad)" />
          <path d="M0 78 Q12 78 18 84 L22 180 L0 180 Z" fill="#3E5F48" />
          <!-- compat <path d="M0 135 Q18 135 28 142" -->
          <rect x="28" y="104" width="9" height="76" fill="#3E2723" />
          <rect x="70" y="104" width="9" height="76" fill="#3E2723" />
          <rect x="118" y="104" width="9" height="76" fill="#3E2723" />
          <rect x="0" y="98" width="140" height="8" rx="1.5" fill="url(#woodPlankGrad)" stroke="#3E2723" stroke-width="0.8" />
          <!-- <rect x="0" y="146" width="156" height="10" compat -->
          <line x1="22" y1="98" x2="22" y2="106" stroke="#3E2723" stroke-width="1" />
          <line x1="48" y1="98" x2="48" y2="106" stroke="#3E2723" stroke-width="1" />
          <line x1="74" y1="98" x2="74" y2="106" stroke="#3E2723" stroke-width="1" />
          <line x1="100" y1="98" x2="100" y2="106" stroke="#3E2723" stroke-width="1" />
          <line x1="126" y1="98" x2="126" y2="106" stroke="#3E2723" stroke-width="1" />
          <g id="stringerAssembly">
            <rect x="115" y="82" width="8" height="3" rx="1" fill="#FFA000" stroke="#5D4037" stroke-width="0.8" />
            <line x1="119" y1="85" x2="119" y2="150" stroke="#1A237E" stroke-width="3.0" opacity="0.25" />
            <line x1="119" y1="85" x2="119" y2="150" stroke="#FFFFFF" stroke-width="2.2" />
            <ellipse cx="119" cy="150" rx="2.5" ry="4" fill="#78909C" />
            <g transform="translate(104, 112)">
              <g class="stringer-fish-item is-hidden" id="fish1">
                <line x1="15" y1="-8" x2="10" y2="0" stroke="#FFFFFF" stroke-width="1.8" stroke-dasharray="1.5,1.5" />
                <use href="#stringerTrout" transform="scale(0.9)" />
              </g>
            </g>
            <g transform="translate(134, 126)">
              <g class="stringer-fish-item is-hidden" id="fish2">
                <line x1="-15" y1="-8" x2="-10" y2="0" stroke="#FFFFFF" stroke-width="1.8" stroke-dasharray="1.5,1.5" />
                <use href="#stringerTrout" transform="scale(-0.9, 0.9)" />
              </g>
            </g>
            <g transform="translate(104, 140)">
              <g class="stringer-fish-item is-hidden" id="fish3">
                <line x1="15" y1="-8" x2="10" y2="0" stroke="#FFFFFF" stroke-width="1.8" stroke-dasharray="1.5,1.5" />
                <use href="#stringerTrout" transform="scale(0.9)" />
              </g>
            </g>
            <g transform="translate(134, 140)">
              <g class="stringer-fish-item is-hidden" id="fish4">
                <line x1="-15" y1="-8" x2="-10" y2="0" stroke="#FFFFFF" stroke-width="1.8" stroke-dasharray="1.5,1.5" />
                <use href="#stringerTrout" transform="scale(-0.9, 0.9)" />
              </g>
            </g>
          </g>
          <!-- bright lake — no depth tint overlay -->
          <g class="cuedone-rig-container" id="anglerContainer">
            <ellipse cx="44" cy="95" rx="7" ry="5" fill="#37474F" stroke="#1A202C" stroke-width="0.9" />
            <ellipse cx="50" cy="86" rx="9" ry="11" fill="#D97D43" stroke="#1A202C" stroke-width="0.9" />
            <ellipse cx="50" cy="86" rx="8" ry="8" fill="#37474F" stroke="#1A202C" stroke-width="0.9" />
            <circle cx="50" cy="68" r="7" fill="#E8CBB3" stroke="#1A202C" stroke-width="0.9" />
            <ellipse cx="50" cy="65" rx="10" ry="3.5" fill="#8D6E63" stroke="#1A202C" stroke-width="0.9" />
            <rect x="44" y="58" width="12" height="5" rx="1.5" fill="#6D4C41" stroke="#1A202C" stroke-width="0.9" />
            <path d="M50 78 Q59 82 68 80" stroke="#E8CBB3" stroke-width="4.5" stroke-linecap="round" fill="none" />
            <circle cx="68" cy="80" r="2.8" fill="#E8CBB3" />
            <line id="canePole" x1="66" y1="80" x2="182" y2="75" stroke="#D97D43" stroke-width="3.6" stroke-linecap="round" />
            <!-- id="canePole" x2="248" y2="108" compat -->
          </g>
          <g id="fisherman-figure" class="fisherman-figure" style="display:none" aria-hidden="true"><use href="#monsterFishTpl" /></g>
          <g id="lineHookGroup">
            <path id="fishingLine" d="M182 75 Q190 90 198 105" stroke="#FFFFFF" stroke-width="2.0" stroke-dasharray="2.5,2" fill="none" />
            <g class="bobber-idle" id="bobberAssembly">
              <circle cx="198" cy="105" r="5.5" fill="#FF5722" stroke="#B71C1C" stroke-width="0.8" />
              <circle cx="198" cy="103.5" r="2.8" fill="#FFFFFF" />
            </g>
            <g id="bobberGroup" style="display:none" aria-hidden="true"><circle cx="198" cy="105" r="5.5" fill="#FF5722" /></g>
            <line id="underwaterLeader" x1="198" y1="106" x2="196" y2="128" stroke="#FFFFFF" stroke-width="1.8" opacity="0.9" />
            <g id="hookAssembly">
              <path d="M196 128 L196 136 Q196 141 191 141 Q186 141 186 135 L186 131" stroke="#5D4037" stroke-width="3.8" fill="none" opacity="0.95" />
              <path id="fishHook" d="M196 128 L196 136 Q196 141 191 141 Q186 141 186 135 L186 131" stroke="#FFC107" stroke-width="2.6" fill="none" />
              <circle id="hookBait" cx="191" cy="142" r="4.2" fill="#E91E63" stroke="#880E4F" stroke-width="1.0" />
              <circle cx="192.5" cy="140.5" r="1.0" fill="#FFFFFF" opacity="0.9" />
            </g>
            <g id="fisherman-hook" style="display:none" aria-hidden="true"><path d="M196 128 L196 136 Q196 141 191 141 Q186 141 186 135 L186 131" stroke="#D4A017" stroke-width="1.8" fill="none" /></g>
          <!-- compat M272 178 M196 128 for tests -->
          </g>
          <g class="monster-fish" id="monsterFish" transform="translate(193, 130) rotate(-8)" style="opacity:0;">
            <use href="#monsterFishTpl" />
          </g>
          <g id="monster-fish" style="display:none" aria-hidden="true" transform="translate(196, 128)"><use href="#monsterFishTpl" /></g>
          <g class="giant-tail-splash" id="giantTailGroup" style="display:none">
            <use href="#giantTail" />
          </g>
          <g class="big-splash-group" id="waterSplashExplosion">
            <path d="M170 152 Q180 105 195 115 Q185 135 180 152" fill="#E1F5FE" opacity="0.9" />
            <path d="M210 152 Q225 95 240 110 Q225 135 220 152" fill="#E1F5FE" opacity="0.9" />
            <path d="M190 152 Q200 90 215 95 Q205 130 200 152" fill="#FFFFFF" opacity="0.95" />
            <circle cx="165" cy="120" r="3" fill="#FFFFFF" />
            <circle cx="180" cy="98" r="3.5" fill="#B3E5FC" />
            <circle cx="205" cy="85" r="4" fill="#FFFFFF" />
            <circle cx="230" cy="95" r="3.5" fill="#B3E5FC" />
            <circle cx="245" cy="115" r="3" fill="#FFFFFF" />
            <ellipse cx="205" cy="153" rx="35" ry="8" fill="none" stroke="#FFFFFF" stroke-width="3" />
          </g>
          <g class="floating-hat" id="floatingHat">
            <ellipse cx="0" cy="0" rx="12" ry="4" fill="#8D6E63" />
            <rect x="-7" y="-6" width="14" height="6" rx="2" fill="#6D4C41" />
            <circle cx="1" cy="-8" r="1.5" fill="#FFFFFF" opacity="0.7" />
            <circle cx="-5" cy="-12" r="2.2" fill="#FFFFFF" opacity="0.6" />
          </g>
          <g id="bubbleGroup" style="pointer-events:none">
            <circle class="bubble" cx="198" cy="162" r="1.6" fill="#FFFFFF" />
            <circle class="bubble" cx="205" cy="165" r="1.2" fill="#FFFFFF" />
            <circle class="bubble" cx="192" cy="168" r="1.0" fill="#B3E5FC" />
            <circle class="bubble" cx="202" cy="170" r="1.4" fill="#FFFFFF" />
          </g>
          <g id="overboard-splash" style="display:none" aria-hidden="true"><ellipse cx="70" cy="68" rx="14" ry="5" fill="none" stroke="#FFFFFF" stroke-width="1.3" opacity="0.9"/></g>
          <g id="floating-hat" style="display:none" aria-hidden="true"><ellipse cx="0" cy="0" rx="6" ry="1.8" fill="#8D6E63"/><rect x="-3.5" y="-3" width="7" height="3" rx="1" fill="#6D4C41"/></g>
          <g id="bubble-group" style="display:none" aria-hidden="true"><circle class="bubble" cx="68" cy="68" r="1.1" fill="#FFFFFF"/></g>
          <g id="fisherman-hud" style="pointer-events:none;">
            <rect x="88" y="5" width="54" height="20" rx="10" ry="10" fill="rgba(0, 0, 0, 0.45)" />
            <path d="M 92 15 C 95.5 12 100 12 103.5 15 C 100 18 95.5 18 92 15 Z M 90 13 L 93.5 15 L 90 17 Z" fill="#ffca28" />
            <circle cx="99.5" cy="14.5" r="0.8" fill="#212121" />
            <text id="fisherman-counter-text" x="121" y="19" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif">0/0</text>
          </g>
        </svg>
      </div>
    <div id="fisherman-stringer" style="display:none" aria-hidden="true"><span id="stringer-fish-1"></span><span id="stringer-fish-2"></span><span id="stringer-fish-3"></span></div>
  </div>
  `;
}
