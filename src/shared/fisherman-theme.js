import { isEmptyProgress, normalizeProgress } from "./progress.js";
export const FISHERMAN_STAGE_COUNT = 2;
export const FISHERMAN_IDLE = 0;
export const FISHERMAN_FINALE = 1;

export function fishermanStateFromProgress(progress) {
  const n = progress && typeof progress === "object" ? progress : normalizeProgress([]);
  const total = Number(n.total) || 0;
  const complete = Number(n.complete) || 0;
  if (total === 0) return null;
  const isFinale = complete >= total && total > 0;
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
  const label = `${complete}/${total}`;
  return `
  <div class="fisherman-scene" data-stage="0" data-basket="0" aria-hidden="true">
    <svg width="100%" height="100%" viewBox="0 0 148 112" xmlns="http://www.w3.org/2000/svg" class="fisherman-svg" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid meet" style="display:block">
      <!-- water strip — extended to fill taller 148x112 canvas (horizon ~y65 to bottom y112) -->
      <g class="fisherman-water">
        <rect x="0" y="65" width="148" height="47" rx="0" fill="#3da2ff"/>
        <path d="M 0 67 Q 18 63 36 67 T 72 67 T 108 67 T 148 67" stroke="#ffffff" stroke-width="1.1" fill="none" opacity="0.45" stroke-linecap="round"/>
        <path d="M 0 78 Q 24 74 48 78 T 96 78 T 148 78" stroke="#b3e0ff" stroke-width="0.9" fill="none" opacity="0.35" stroke-linecap="round"/>
      </g>
      <!-- single unified dock under feet — clean pier from left bank to past boots -->
      <g id="fisherman-dock" class="fisherman-dock">
        <rect x="8" y="100" width="5" height="12" fill="#4e342e" />
        <rect x="46" y="100" width="5" height="12" fill="#4e342e" />
        <rect x="0" y="96" width="58" height="6" rx="1.5" fill="#8d6e63" stroke="#5d4037" stroke-width="0.7" />
        <line x1="18" y1="96" x2="18" y2="102" stroke="#4e342e" stroke-width="0.6" />
        <line x1="38" y1="96" x2="38" y2="102" stroke="#4e342e" stroke-width="0.6" />
      </g>
      <!-- bucket fish tails — prominent white borders stroke 1.1 -->
      <g id="fisherman-caught-bucket" transform="translate(6, 80)">
        <g id="bucket-fish-1" class="bucket-fish" style="display: none;">
          <path d="M 4 6 L 5 -5 L 8 -8 L 5 -3 L 5 3 L 4 6 Z" fill="#00c853" stroke="#ffffff" stroke-width="1.1" paint-order="stroke fill" />
        </g>
        <g id="bucket-fish-2" class="bucket-fish" style="display: none;">
          <path d="M 8 6 L 8 -6 L 4 -9 L 8 -4 L 11 -9 L 10 -4 L 10 6 Z" fill="#ffab00" stroke="#ffffff" stroke-width="1.1" paint-order="stroke fill" />
        </g>
        <g id="bucket-fish-3" class="bucket-fish" style="display: none;">
          <path d="M 12 6 L 14 -5 L 19 -8 L 15 -3 L 16 3 L 12 6 Z" fill="#00b0ff" stroke="#ffffff" stroke-width="1.1" paint-order="stroke fill" />
        </g>
        <path d="M 1 6 L 3 16 A 1 1 0 0 0 5 17 L 13 17 A 1 1 0 0 0 15 16 L 17 6 Z" fill="#a1887f" stroke="#5d4037" stroke-width="0.8" />
        <line x1="2" y1="9" x2="16" y2="9" stroke="#37474f" stroke-width="0.8" />
        <line x1="3" y1="14" x2="15" y2="14" stroke="#37474f" stroke-width="0.8" />
      </g>
      <!-- scaled fisherman — clean side profile looking right toward water -->
      <g id="fisherman-figure" transform="translate(0, 24) scale(1.4)">
      <!-- Static Fisherman Body & Legs (Facing Right) -->
      <g id="fisherman-body-profile">
        <!-- Back leg & boot -->
        <rect x="22" y="44" width="5" height="13" fill="#1565c0" rx="1.5" />
        <path d="M 21 54 L 29 54 A 3 3 0 0 1 32 57 L 20 57 Z" fill="#3e2723" />
        <!-- Front leg & boot -->
        <rect x="27" y="44" width="5.5" height="13" fill="#0d47a1" rx="1.5" />
        <path d="M 26 54 L 35 54 A 3 3 0 0 1 38 57 L 25 57 Z" fill="#271c19" />
        <!-- Torso / Blue Overalls & Red Collar facing right -->
        <path d="M 20 28 L 32 28 L 33 46 L 21 46 Z" fill="#1565c0" rx="2" />
        <path d="M 24 26 L 31 26 L 31 29 L 24 29 Z" fill="#d32f2f" />
        <!-- Head in profile facing right -->
        <ellipse cx="27" cy="20" rx="6" ry="6.5" fill="#ffcc80" />
        <!-- Profile nose & eye focused right toward line -->
        <path d="M 32 19 L 34.5 20.5 L 32 22" stroke="#e0a96d" stroke-width="0.8" fill="none" stroke-linecap="round" />
        <circle cx="30" cy="18.5" r="1" fill="#212121" />
        <path d="M 28 23 Q 30 24.5 32 23.5" stroke="#b71c1c" stroke-width="0.8" fill="none" stroke-linecap="round" />
        <!-- Straw hat brim & crown tilted toward water -->
        <path d="M 23 14 L 32 14 L 31 9 L 24 9 Z" fill="#d7ccc8" stroke="#8d6e63" stroke-width="0.7" />
        <ellipse cx="28" cy="14" rx="11" ry="3" fill="#bcaaa4" stroke="#6d4c41" stroke-width="0.8" />
      </g>
      <!-- Unified articulated arm & cane rig — SINGLE rigid group welded at shoulder 24,32 — zero independent sub-transforms -->
      <g id="fisherman-arms-rig" class="fisherman-arms-rig">
        <!-- Arm sleeve starting at shoulder joint (x=24, y=32) extending to wrists -->
        <path class="fisherman-arm-sleeve" d="M 24 32 L 35 36" stroke="#0d47a1" stroke-width="4.5" stroke-linecap="round" fill="none" />
        <!-- Cane pole: runs straight through the clasped hands out over water -->
        <path class="fisherman-cane" d="M 30 38 L 78 12" stroke="#5d4037" stroke-width="2.4" stroke-linecap="round" fill="none" />
        <!-- Clasped hands permanently welded over the pole at x=34-37, y=35-37 -->
        <circle cx="34" cy="36.5" r="2.2" fill="#ffcc80" />
        <circle cx="36.5" cy="35.5" r="2.0" fill="#ffe0b2" />
        <!-- Fishing line running from pole tip (78, 12) down to water -->
        <path class="fisherman-line" d="M 78 12 L 78 54" stroke="#ffffff" stroke-width="0.75" stroke-dasharray="1.2,1.2" opacity="0.85" fill="none" />
      </g>
      <!-- placeholder rig — no duplicate cane/line; kept for legacy querySelector compat -->
      <g id="fisherman-rig" class="fisherman-rig" style="display:none"></g>
      </g>
      <!-- finale fish — enlarged 32px bass, root level directly under HUD -->
      <g id="finale-fish" class="finale-fish" style="opacity: 0; pointer-events: none;">
        <!-- Main Body: Vibrant Royal Blue with bold dark outline -->
        <path d="M 0 0 C 8 -16 28 -18 42 -8 C 42 -2 30 10 20 14 Q 8 16 0 0 Z" fill="#1976d2" stroke="#0d47a1" stroke-width="1.4" />
        <!-- White/Silver Belly -->
        <path d="M 4 2 C 12 -4 24 -4 34 0 C 24 5 14 7 4 2 Z" fill="#ffffff" opacity="0.9" />
        <!-- Tail Fin (Fluke) -->
        <polygon points="40,-8 52,-18 47,-6 53,2 41,-1" fill="#1565c0" stroke="#0d47a1" stroke-width="1.2" />
        <!-- Dorsal Fin -->
        <path d="M 16 -12 Q 24 -18 30 -11 Z" fill="#1565c0" />
        <!-- Big Eye -->
        <circle cx="9" cy="-4" r="2.4" fill="#ffffff" />
        <circle cx="8" cy="-4" r="1.1" fill="#000000" />
      </g>
      <!-- finale splash — water plume erupting at dock edge, root level next to finale fish -->
      <g id="finale-splash" class="finale-splash" style="opacity: 0; pointer-events: none;">
        <!-- Water plume erupting up and left toward dock -->
        <path d="M 0 0 C -8 -20 -18 -26 -28 -18 C -18 -10 -10 -4 0 0" fill="#e1f5fe" stroke="#81d4fa" stroke-width="0.8" opacity="0.95" />
        <!-- Prominent spray droplets -->
        <circle cx="-12" cy="-16" r="2.5" fill="#4fc3f7" stroke="#ffffff" stroke-width="0.5" />
        <circle cx="-20" cy="-12" r="2.0" fill="#29b6f6" stroke="#ffffff" stroke-width="0.5" />
        <circle cx="-26" cy="-6"  r="1.6" fill="#0288d1" stroke="#ffffff" stroke-width="0.5" />
        <circle cx="8"   cy="-12" r="2.0" fill="#81d4fa" stroke="#ffffff" stroke-width="0.5" />
      </g>
      <!-- HUD enlarged — VERY LAST -->
      <g id="fisherman-hud" style="pointer-events:none;">
        <rect x="88" y="5" width="54" height="20" rx="10" ry="10" fill="rgba(0, 0, 0, 0.45)" />
        <path d="M 92 15 C 95.5 12 100 12 103.5 15 C 100 18 95.5 18 92 15 Z M 90 13 L 93.5 15 L 90 17 Z" fill="#ffca28" />
        <circle cx="99.5" cy="14.5" r="0.8" fill="#212121" />
        <text id="fisherman-counter-text" x="121" y="19" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif">${label}</text>
      </g>
    </svg>
  </div>
  `;
}
