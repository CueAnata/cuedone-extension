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
      <!-- giant fish for finale — synchronized unhook & reentry at x92 y65 -->
      <g class="giant-fish" id="finale-fish" opacity="0">
        <ellipse cx="0" cy="0" rx="13" ry="6.5" fill="#4a7fc0" stroke="#0f2a4a" stroke-width="1.6"/>
        <ellipse cx="0" cy="0" rx="9" ry="3.8" fill="#d0e6ff" opacity="0.55"/>
        <circle cx="-8.5" cy="-1.2" r="1.9" fill="#0b1a2a"/><circle cx="-8.5" cy="-1.2" r="0.7" fill="#fff"/>
        <path d="M 13 0 L 20.5 -7 L 20.5 7 Z" fill="#1e3a5f" stroke="#0f2a4a" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M -4 5.5 Q 0 8 4 5.5" stroke="#0f2a4a" stroke-width="0.9" fill="none" stroke-linecap="round"/>
      </g>
      <!-- splash — aligned to x90 y65, detonates at fish strike (0.85s delay) -->
      <g id="finale-splash" x="90" y="65" class="fisherman-splash" opacity="0">
        <path d="M 90 65 L 86 55 L 88.5 61 L 90 49 L 91.5 61 L 94 55 Z" fill="#b3e0ff" stroke="#4da6ff" stroke-width="0.9" stroke-linejoin="round"/>
        <ellipse cx="90" cy="67.5" rx="14" ry="4.2" fill="none" stroke="#fff" stroke-width="1.1" opacity="0.9"/>
        <ellipse cx="90" cy="69" rx="9" ry="2.6" fill="none" stroke="#fff" stroke-width="0.9" opacity="0.6"/>
      </g>
      <!-- single unified dock under feet — clean pier from left bank to past boots -->
      <g id="fisherman-dock" class="fisherman-dock">
        <rect x="8" y="100" width="5" height="12" fill="#4e342e" />
        <rect x="46" y="100" width="5" height="12" fill="#4e342e" />
        <rect x="0" y="96" width="58" height="6" rx="1.5" fill="#8d6e63" stroke="#5d4037" stroke-width="0.7" />
        <line x1="18" y1="96" x2="18" y2="102" stroke="#4e342e" stroke-width="0.6" />
        <line x1="38" y1="96" x2="38" y2="102" stroke="#4e342e" stroke-width="0.6" />
      </g>
      <!-- enlarged bucket fish tails doubled — vivid, container over tails so only flukes protrude -->
      <g id="fisherman-caught-bucket" transform="translate(6, 80)">
        <g id="bucket-fish-1" class="bucket-fish" style="display: none;">
          <path d="M 3 6 L 1 -3 L -4 -6 L 0 -2 L -1 3 L 3 6 Z" fill="#00e5ff" stroke="#0097a7" stroke-width="0.8" />
        </g>
        <g id="bucket-fish-2" class="bucket-fish" style="display: none;">
          <path d="M 7 6 L 7 -4 L 4 -7 L 7 -3 L 10 -7 L 9 -3 L 9 6 Z" fill="#ffb300" stroke="#ff6f00" stroke-width="0.8" />
        </g>
        <g id="bucket-fish-3" class="bucket-fish" style="display: none;">
          <path d="M 11 6 L 13 -3 L 18 -6 L 14 -2 L 15 3 L 11 6 Z" fill="#1e88e5" stroke="#0d47a1" stroke-width="0.8" />
        </g>
        <path d="M 1 6 L 3 16 A 1 1 0 0 0 5 17 L 13 17 A 1 1 0 0 0 15 16 L 17 6 Z" fill="#a1887f" stroke="#5d4037" stroke-width="0.8" />
        <line x1="2" y1="9" x2="16" y2="9" stroke="#37474f" stroke-width="0.8" />
        <line x1="3" y1="14" x2="15" y2="14" stroke="#37474f" stroke-width="0.8" />
      </g>
      <!-- scaled fisherman + pole — ~1.4x to occupy taller canvas, grounded bottom-left -->
      <g transform="translate(0, 24) scale(1.4)">
      <!-- fisherman group (lean) -->
      <g class="fisherman-group">
        <!-- legs / boots -->
        <path d="M 22 46 L 20 36 L 26 36 L 24 46 Z" fill="#2b5aa0" stroke="#0f2a4a" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M 28 46 L 27 36 L 33 36 L 32 46 Z" fill="#2b5aa0" stroke="#0f2a4a" stroke-width="1.2"/>
        <ellipse cx="21.5" cy="47.2" rx="4" ry="1.8" fill="#3d2816" stroke="#1a140d" stroke-width="0.8"/>
        <ellipse cx="30.5" cy="47.2" rx="4" ry="1.8" fill="#3d2816" stroke="#1a140d" stroke-width="0.8"/>
        <!-- torso overalls -->
        <path d="M 20 36 L 22 22 L 32 22 L 34 36 Z" fill="#2b5aa0" stroke="#0f2a4a" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M 22 22 L 20 14 L 34 14 L 32 22 Z" fill="#e05a3a" stroke="#7a2412" stroke-width="1.2"/>
        <rect x="20" y="14.5" width="14" height="3.2" rx="0.8" fill="#2b5aa0" stroke="#0f2a4a" stroke-width="1"/>
        <!-- arms -->
        <path d="M 22 18 L 32 26 L 36 28" stroke="#f0c9a8" stroke-width="2.4" stroke-linecap="round" fill="none"/>
        <path d="M 32 18 L 34 26" stroke="#f0c9a8" stroke-width="2.4" stroke-linecap="round" fill="none"/>
        <!-- head -->
        <circle cx="27" cy="11.5" r="6.2" fill="#f7d6b8" stroke="#7a4a2a" stroke-width="1.2"/>
        <!-- hat -->
        <ellipse cx="27" cy="6.2" rx="9.5" ry="4.2" fill="#d9b06a" stroke="#6b4a1a" stroke-width="1.1"/>
        <path d="M 20 6.2 Q 27 1.5 34 6.2" fill="#c49a52" stroke="#6b4a1a" stroke-width="1"/>
        <!-- face smile -->
        <circle cx="25.2" cy="11" r="0.9" fill="#1a1a1a"/><circle cx="28.8" cy="11" r="0.9" fill="#1a1a1a"/>
        <path d="M 25 13.5 Q 27 15 29 13.5" stroke="#7a2a1a" stroke-width="0.9" fill="none" stroke-linecap="round"/>
      </g>
      <!-- rig: pole + line + hooked fish grouped to eliminate detachment gap -->
      <g id="fisherman-rig" class="fisherman-rig">
        <path class="fisherman-cane" d="M36 28 C52 24, 68 18, 82 8" stroke="#6d4c41" stroke-width="2.5" stroke-linecap="round" fill="none" />
        <path class="fisherman-line" d="M82 8 L82 65" stroke="#ffffff" stroke-width="0.8" stroke-dasharray="1,1" opacity="0.85" fill="none" />
        <g class="hooked-small-fish" transform="translate(80, 52)">
          <ellipse cx="2" cy="5" rx="4" ry="2.5" fill="#42a5f5" />
          <polygon points="6,5 9,3 9,7" fill="#1e88e5" />
        </g>
        <!-- legacy hooked-fish kept for is-catching hook pop -->
        <g class="hooked-fish" opacity="0">
          <ellipse cx="82" cy="36" rx="4.8" ry="2.2" fill="#6fb7ff" stroke="#1a3a5a" stroke-width="0.9"/>
          <circle cx="79.2" cy="35.6" r="0.85" fill="#0b1a2a"/>
          <path d="M 86.8 36 L 89.6 34.2 L 89.6 37.8 Z" fill="#2a5a9a" stroke="#1a3a5a" stroke-width="0.6"/>
          <ellipse cx="82" cy="32.8" rx="0.7" ry="0.7" fill="#1a1a1a" opacity="0.9"/>
          <path d="M 80 65 Q 82 66.5 84 65" stroke="#4da6ff" stroke-width="0.8" fill="none" opacity="0.6"/>
        </g>
      </g>
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
