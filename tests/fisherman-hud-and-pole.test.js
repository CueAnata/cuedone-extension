import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const fishermanTheme = readFileSync("src/shared/fisherman-theme.js", "utf8");
const taskListJs = readFileSync("src/shared/task-list.js", "utf8");
const css = readFileSync("src/shared/styles.css", "utf8");

test("HUD counter pill is last element before </svg> with hardcoded coords and forced visibility", () => {
  assert.match(fishermanTheme, /viewBox="0 0 400 225"/);
  assert.match(fishermanTheme, /width="100%".*height="100%".*display:block/);
  const hudIndex = fishermanTheme.lastIndexOf('<g id="fisherman-hud"');
  const svgCloseIndex = fishermanTheme.lastIndexOf("</svg>");
  assert.ok(hudIndex > 0 && hudIndex < svgCloseIndex, "HUD must be before </svg>");
  const afterHud = fishermanTheme.slice(hudIndex, svgCloseIndex);
  assert.doesNotMatch(afterHud, /fisherman-water|fisherman-dock|fisherman-group/);
  assert.match(fishermanTheme, /<g id="fisherman-hud" style="pointer-events:none;">/);
  assert.match(fishermanTheme, /<rect x="88" y="5" width="54" height="20" rx="10" ry="10" fill="rgba\(0, 0, 0, 0.45\)"/);
  assert.match(fishermanTheme, /<path d="M 92 15 C 95\.5 12 100 12 103\.5 15 C 100 18 95\.5 18 92 15 Z M 90 13 L 93\.5 15 L 90 17 Z" fill="#ffca28"/);
  assert.match(fishermanTheme, /<circle cx="99\.5" cy="14\.5" r="0\.8" fill="#212121"/);
  assert.match(fishermanTheme, /<text id="fisherman-counter-text" x="121" y="19" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff"/);
  assert.match(fishermanTheme, /font-family="system-ui/);
  const hudInTaskList = taskListJs.includes('x="88" y="5" width="54"') || taskListJs.includes("fisherman-hud");
  assert.ok(hudInTaskList, "task-list.js should reference HUD");
  assert.match(fishermanTheme, /<path d="M0 135 Q18 135 28 142/);
  assert.match(fishermanTheme, /<rect x="0" y="146" width="156" height="10"/);
  assert.match(fishermanTheme, /fill="#D97D43"/);
  assert.match(fishermanTheme, /fill="#37474F"/);
  assert.match(fishermanTheme, /id="canePole"[^>]*x2="248" y2="108"/);
  assert.match(fishermanTheme, /id="fisherman-hook"[\s\S]*272.*178/);
  assert.match(fishermanTheme, /M272 178/);
  assert.match(fishermanTheme, /id="fisherman-stringer"/);
  assert.match(fishermanTheme, /id="stringer-fish-1"/);
  assert.match(fishermanTheme, /id="stringer-fish-2"/);
  assert.match(fishermanTheme, /id="stringer-fish-3"/);
  assert.doesNotMatch(fishermanTheme, /<rect x="0" y="62"/);
  assert.match(fishermanTheme, /<g id="fisherman-figure"/);
});

test("syncFishermanVisual updates HUD immediately and is called on initial render 0/4", () => {
  assert.match(taskListJs, /const counterEl = document\.getElementById\(['"]fisherman-counter-text['"]\)/);
  assert.match(taskListJs, /counterEl\.textContent = [`'"]\$\{.*?\}.*?\//);
  assert.match(taskListJs, /if \(typeof visualEl === "number" && typeof progress === "number"\)/);
  assert.match(taskListJs, /syncFishermanVisual/);
  assert.match(taskListJs, /const hudLabel = `\${completeCount}\/\${total}`/);
  assert.match(taskListJs, /executeStrike/);
  assert.match(taskListJs, /triggerOverboardFinale/);
  assert.match(taskListJs, /stringer-fish/);
  assert.match(taskListJs, /is-visible/);
});

test("intermediate cane pole yank keyframe and animation are correct and not clobbered", () => {
  assert.match(css, /@keyframes hookSetStrike/);
  assert.match(css, /transform:\s*rotate\(-19deg\)/);
  assert.match(css, /\.cuedone-rig\.striking\s*\{[^}]*animation:\s*hookSetStrike/);
  assert.match(taskListJs, /executeStrike/);
  assert.match(taskListJs, /y2.*55/);
  assert.match(css, /\.stringer-fish/);
  assert.match(taskListJs, /stringer-fish/);
  assert.match(taskListJs, /is-visible/);
  assert.match(css, /@keyframes pole-intermediate-yank/);
  assert.match(taskListJs, /pole-yanking/);
  assert.doesNotMatch(css, /\.fisherman-cane\s*\{[^}]*animation/);
  assert.doesNotMatch(css, /#fisherman-cane\s*\{/);
});

test("finale fish unhook & splash reentry synchronized at 272,178 and overboard", () => {
  assert.match(css, /@keyframes monsterSurface/);
  assert.match(css, /@keyframes monsterBite/);
  assert.match(css, /@keyframes monsterDiveLocked/);
  assert.match(css, /#fisherman-hook\.swallowed/);
  assert.match(css, /anglerPlunge/);
  assert.match(css, /overboardGeyser/);
  assert.match(css, /hatFloat/);
  assert.match(css, /bubbleRise/);
  assert.match(fishermanTheme, /id="monster-fish"/);
  assert.match(fishermanTheme, /M0 -6 L-10 -5/);
  assert.match(fishermanTheme, /id="overboard-splash"/);
  assert.match(fishermanTheme, /id="floating-hat"/);
  assert.match(fishermanTheme, /id="bubble-group"/);
  assert.match(fishermanTheme, /272.*178/);
  const finaleIdx = fishermanTheme.indexOf('id="monster-fish"');
  const hudIdx = fishermanTheme.indexOf('<g id="fisherman-hud"');
  assert.ok(finaleIdx > 0 && finaleIdx < hudIdx, "monster fish must be before HUD");
});
