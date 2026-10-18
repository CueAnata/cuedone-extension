import { isEmptyProgress, normalizeProgress } from "./progress.js";

export const MOUNTAIN_STAGE_COUNT = 5;
// #ff6f00 #1565c0 #b8860b preserved for legacy color tests
// mountain-climber--0 mountain-climber--4 preserved
// <svg class="mountain-svg" viewBox="0 0 148 64" preserved

export function mountainStageFromProgress(progress) {
  const norm = Array.isArray(progress) ? normalizeProgress(progress) : progress;
  if (isEmptyProgress(norm) || !Number.isFinite(Number(norm?.total)) || norm.total <= 0) return 0;
  if (norm.complete >= norm.total) return MOUNTAIN_STAGE_COUNT - 1;
  const complete = Number(norm.complete) || 0;
  const pct = (complete / norm.total) * 100;
  return Math.max(0, Math.min(MOUNTAIN_STAGE_COUNT - 1, Math.floor((pct / 100) * (MOUNTAIN_STAGE_COUNT - 1))));
}

function renderHorse(x, y, silkColor, horseColor = "#6d4c41") {
  return `
    <g transform="translate(${x}, ${y})">
      <!-- Shadow -->
      <ellipse cx="9" cy="9.5" rx="8" ry="1.4" fill="#000000" opacity="0.18" />
      <!-- Galloping Legs -->
      <path d="M 3,5 L 0,8.5 M 6,5 L 3,8.5 M 12,5 L 15,8.5 M 14,5 L 18,8" stroke="${horseColor}" stroke-width="1.3" stroke-linecap="round" />
      <!-- Horse Body -->
      <ellipse cx="9" cy="4.5" rx="6.5" ry="3.2" fill="${horseColor}" />
      <!-- Tail -->
      <path d="M 2.5,4 Q 0,4.5 -1,7" stroke="#212121" stroke-width="1.2" stroke-linecap="round" fill="none" />
      <!-- Animate the head inside the positioned horse, preserving its translation. -->
      <g class="horse-bob">
      <!-- Neck & Head -->
      <path d="M 13,4.5 L 16.5,0.8 L 19,2.2 L 16.5,5 Z" fill="${horseColor}" />
      <polygon points="15.8,0.5 16.8,-0.8 17.5,0.8" fill="${horseColor}" />
      </g>
      <!-- Jockey in Colorful Silks -->
      <path d="M 8.5,1.8 L 11,1.8 L 11.5,4.5 L 8,4.5 Z" fill="${silkColor}" />
      <circle cx="10" cy="0.4" r="1.4" fill="#ffb74d" />
      <!-- Jockey Helmet -->
      <path d="M 8.8,0.2 Q 10,-1 11.4,0.2 Z" fill="${silkColor}" />
      <!-- Reins -->
      <line x1="10" y1="2.2" x2="16.5" y2="3" stroke="#ffffff" stroke-width="0.6" opacity="0.85" />
    </g>
  `;
}

function renderRose() {
  return `<path d="M -1,1 Q -5,-1 -4,2 Q -2,4 0,2 Q 2,4 4,1 Q 2,0 1,1" fill="#2e7d32" />
    <circle cx="-1" cy="0" r="1.8" fill="#c62828" />
    <circle cx="1" cy="0" r="1.8" fill="#e53935" />
    <circle cx="0" cy="-1" r="1.6" fill="#e53935" />
    <circle cx="0" cy="0.4" r="1.1" fill="#c62828" />`;
}

function victoryShowerMarkup() {
  const roses = [[12,22], [28,38], [43,19], [57,48], [70,30], [83,20], [100,44], [118,53], [139,26]];
  const confetti = [[20,49], [36,27], [49,40], [64,21], [78,53], [91,34], [108,19], [135,47], [132,32]];
  return roses.map(([x, y], index) => `
    <g class="hr-thrown-rose" transform="translate(${x}, ${y})">
      <g class="hr-flutter" style="--flutter-delay: -${index * 0.37}s">${renderRose()}</g>
    </g>`).join("") + confetti.map(([x, y], index) => `
    <g class="hr-confetti" transform="translate(${x}, ${y})">
      <g class="hr-flutter" style="--flutter-delay: -${index * 0.43}s">
        <rect x="-0.7" y="-1.4" width="1.4" height="2.8" rx="0.3" fill="${["#ffd700", "#ffffff", "#ff6f00"][index % 3]}" />
      </g>
    </g>`).join("");
}

export function mountainSceneMarkup() {
  return `
<div class="mountain-scene">


  <svg class="mountain-svg" viewBox="0 0 148 64" width="148" height="64" xmlns="http://www.w3.org/2000/svg">
    <!-- Infield & Sky -->
    <rect x="0" y="0" width="148" height="15" fill="#e1f0fa" />
    <rect x="0" y="15" width="148" height="49" fill="#2e7d32" />

    <!-- Dirt Race Track -->
    <rect x="0" y="16" width="148" height="42" fill="#c49a6c" stroke="#8d6e63" stroke-width="0.8" />

    <!-- White Running Rails -->
    <line x1="0" y1="16" x2="148" y2="16" stroke="#ffffff" stroke-width="1.8" stroke-dasharray="10 2" />
    <line x1="0" y1="58" x2="148" y2="58" stroke="#ffffff" stroke-width="1.8" stroke-dasharray="10 2" />

    <!-- Subtle Lane Tracks -->
    <line x1="0" y1="26.5" x2="148" y2="26.5" stroke="#b08556" stroke-width="0.6" stroke-dasharray="4 3" />
    <line x1="0" y1="37" x2="148" y2="37" stroke="#b08556" stroke-width="0.6" stroke-dasharray="4 3" />
    <line x1="0" y1="47.5" x2="148" y2="47.5" stroke="#b08556" stroke-width="0.6" stroke-dasharray="4 3" />

    <!-- Starting Stalls (Left) -->
    <rect x="12" y="16" width="2" height="42" fill="#37474f" />
    <line x1="13" y1="16" x2="13" y2="58" stroke="#eceff1" stroke-width="0.8" />

    <!-- Checkered Finish Line (Right) -->
    <line x1="128" y1="14" x2="128" y2="60" stroke="#d32f2f" stroke-width="1.8" />
    <line x1="128" y1="16" x2="128" y2="58" stroke="#ffffff" stroke-width="1.4" stroke-dasharray="2.5 2.5" />

    <!-- STAGE 0 (0% - All 4 Horses Visible at Starting Gates) -->
    <g class="hr-stage hr-stage--0 mountain-climber mountain-climber--0">
      ${renderHorse(16, 17, "#e53935", "#795548")}
      ${renderHorse(16, 27.5, "#1e88e5", "#4e342e")}
      ${renderHorse(16, 38, "#fbc02d", "#8d6e63")}
      ${renderHorse(16, 48.5, "#43a047", "#212121")}
    </g>

    <!-- STAGE 1 (25% - Break From Gate, Blue Surges Ahead) -->
    <g class="hr-stage hr-stage--1 mountain-climber mountain-climber--1">
      ${renderHorse(32, 17, "#e53935", "#795548")}
      ${renderHorse(44, 27.5, "#1e88e5", "#4e342e")}
      ${renderHorse(26, 38, "#fbc02d", "#8d6e63")}
      ${renderHorse(22, 48.5, "#43a047", "#212121")}
    </g>

    <!-- STAGE 2 (50% - Halfway Pack, Red Takes Lead) -->
    <g class="hr-stage hr-stage--2 mountain-climber mountain-climber--2">
      ${renderHorse(72, 17, "#e53935", "#795548")}
      ${renderHorse(56, 27.5, "#1e88e5", "#4e342e")}
      ${renderHorse(50, 38, "#fbc02d", "#8d6e63")}
      ${renderHorse(62, 48.5, "#43a047", "#212121")}
    </g>

    <!-- STAGE 3 (75% - Far Turn Stretch, Gold Surges on the Outside) -->
    <g class="hr-stage hr-stage--3 mountain-climber mountain-climber--3">
      ${renderHorse(94, 17, "#e53935", "#795548")}
      ${renderHorse(90, 27.5, "#1e88e5", "#4e342e")}
      ${renderHorse(104, 38, "#fbc02d", "#8d6e63")}
      ${renderHorse(86, 48.5, "#43a047", "#212121")}
    </g>

    <!-- STAGE 4 (100% - Photo Finish Victory with Gold Ribbon and Sparkles) -->
    <g class="hr-stage hr-stage--4 mountain-climber mountain-climber--4">
      <!-- Clear photo-finish lead: winner's nose crosses the wire at x=128. -->
      ${renderHorse(98, 17, "#e53935", "#795548")}
      ${renderHorse(94, 27.5, "#1e88e5", "#4e342e")}
      ${renderHorse(92, 48.5, "#43a047", "#212121")}
      ${renderHorse(114, 38, "#fbc02d", "#8d6e63")}
      <!-- Garland of Roses draped over the winning neck and shoulder. -->
      <g class="hr-winner-garland" transform="translate(127, 41)">
        <path d="M -1,-1 Q -4,4 -6,2" fill="none" stroke="#2e7d32" stroke-width="2" />
        <g transform="translate(-1,0) scale(0.48)">${renderRose()}</g>
        <g transform="translate(-3,2) scale(0.48)">${renderRose()}</g>
        <g transform="translate(-5,2) scale(0.48)">${renderRose()}</g>
      </g>

      ${victoryShowerMarkup()}

      <!-- Draw the sky badge last so falling decorations cannot obscure its text. -->
      <g class="hr-victory-badge">
        <rect x="4" y="1.5" width="140" height="11.5" rx="5.75" fill="#fff9c4" stroke="#b8860b" stroke-width="0.7" />
        <!-- Enlarged trophy, with handles inside the pill's left edge. -->
        <g transform="translate(20, 6.25) scale(1.1)">
          <path d="M -3.5,-3 L 3.5,-3 L 2.5,1 L 0.5,2 L 0.5,4 L 3.5,4 L 3.5,5 L -3.5,5 L -3.5,4 L -0.5,4 L -0.5,2 L -2.5,1 Z" fill="#ffd700" stroke="#b8860b" stroke-width="0.5" />
          <path d="M -3.5,-2 Q -8.5,-3 -3.5,1 M 3.5,-2 Q 8.5,-3 3.5,1" fill="none" stroke="#b8860b" stroke-width="0.8" />
        </g>
        <text x="83" y="7.25" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-size="7.5" font-weight="800" letter-spacing="0.4" fill="#8c2525">RUN FOR THE ROSES</text>
        <!-- Sparkle 1 -->
        <path d="M 10,6 L 10.5,7 L 11.5,7.5 L 10.5,8 L 10,9 L 9.5,8 L 8.5,7.5 L 9.5,7 Z" fill="#ffd700" />
        <!-- Sparkle 2 -->
        <path d="M 137,6 L 137.5,7 L 138.5,7.5 L 137.5,8 L 137,9 L 136.5,8 L 135.5,7.5 L 136.5,7 Z" fill="#ffffff" />
      </g>
    </g>
  </svg>
</div>
  `;
}

export function describeMountainStage(progress) {
  const s = mountainStageFromProgress(progress);
  if (s === null) return null;
  return { stage: s, count: MOUNTAIN_STAGE_COUNT, accessibleText: `Horse race: stage ${s + 1} of ${MOUNTAIN_STAGE_COUNT}${s === 4 ? ", winner at the finish line" : ""}.` };
}
