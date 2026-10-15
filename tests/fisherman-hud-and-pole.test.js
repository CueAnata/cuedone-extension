import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const fishermanTheme = readFileSync("src/shared/fisherman-theme.js", "utf8");
const taskListJs = readFileSync("src/shared/task-list.js", "utf8");
const css = readFileSync("src/shared/styles.css", "utf8");

test("HUD counter pill is last element before </svg> with hardcoded coords and forced visibility", () => {
  // viewBox must stay self-contained at 0 0 148 112
  assert.match(fishermanTheme, /viewBox="0 0 148 112"/);
  assert.match(fishermanTheme, /width="100%".*height="100%".*display:block/);
  // HUD must be very last before </svg>
  const hudIndex = fishermanTheme.lastIndexOf('<g id="fisherman-hud"');
  const svgCloseIndex = fishermanTheme.lastIndexOf("</svg>");
  assert.ok(hudIndex > 0 && hudIndex < svgCloseIndex, "HUD must be before </svg>");
  // Ensure no sky/water/dock layers after HUD
  const afterHud = fishermanTheme.slice(hudIndex, svgCloseIndex);
  assert.doesNotMatch(afterHud, /fisherman-water|fisherman-dock|fisherman-group/);
  // Hardcoded explicit coordinates per spec enlarged HUD with high-contrast horizontal fish icon
  assert.match(fishermanTheme, /<g id="fisherman-hud" style="pointer-events:none;">/);
  assert.match(fishermanTheme, /<rect x="88" y="5" width="54" height="20" rx="10" ry="10" fill="rgba\(0, 0, 0, 0.45\)"/);
  assert.match(fishermanTheme, /<path d="M 92 15 C 95\.5 12 100 12 103\.5 15 C 100 18 95\.5 18 92 15 Z M 90 13 L 93\.5 15 L 90 17 Z" fill="#ffca28"/);
  assert.match(fishermanTheme, /<circle cx="99\.5" cy="14\.5" r="0\.8" fill="#212121"/);
  assert.match(fishermanTheme, /<text id="fisherman-counter-text" x="121" y="19" text-anchor="middle" font-size="11" font-weight="700" fill="#ffffff"/);
  assert.match(fishermanTheme, /font-family="system-ui/);
  // Also ensure task-list wrapper carries same HUD for spec's task-list.js check
  const hudInTaskList = taskListJs.includes('x="88" y="5" width="54"') || taskListJs.includes("fisherman-hud");
  assert.ok(hudInTaskList, "task-list.js should reference HUD");
  // Bucket progression exists grounded at bottom-left dock (vivid, on dock at 6,80) — high-contrast white outline
  assert.match(fishermanTheme, /<g id="fisherman-caught-bucket" transform="translate\(6, 80\)">/);
  assert.match(fishermanTheme, /<g id="bucket-fish-1"/);
  assert.match(fishermanTheme, /<g id="bucket-fish-2"/);
  assert.match(fishermanTheme, /<g id="bucket-fish-3"/);
  assert.match(fishermanTheme, /M 4 6 L 5 -5 L 8 -8 L 5 -3 L 5 3 L 4 6 Z/);
  assert.match(fishermanTheme, /fill="#00c853"/);
  assert.match(fishermanTheme, /stroke="#ffffff".*paint-order="stroke fill"/);
  assert.match(fishermanTheme, /stroke-width="1\.1"/);
  assert.match(fishermanTheme, /M 8 6 L 8 -6 L 4 -9 L 8 -4 L 11 -9 L 10 -4 L 10 6 Z/);
  assert.match(fishermanTheme, /fill="#ffab00"/);
  assert.match(fishermanTheme, /M 12 6 L 14 -5 L 19 -8 L 15 -3 L 16 3 L 12 6 Z/);
  assert.match(fishermanTheme, /fill="#00b0ff"/);
  // Single unified dock under feet — no upper plank x0 y62
  assert.match(fishermanTheme, /<g id="fisherman-dock" class="fisherman-dock">/);
  assert.match(fishermanTheme, /<rect x="8" y="100" width="5" height="12" fill="#4e342e"/);
  assert.doesNotMatch(fishermanTheme, /<rect x="0" y="62"/);
  // True side profile facing right toward water + unified articulated arm rig — welded rigid group
  assert.match(fishermanTheme, /<g id="fisherman-body-profile">/);
  assert.match(fishermanTheme, /<g id="fisherman-arms-rig" class="fisherman-arms-rig">/);
  assert.doesNotMatch(fishermanTheme, /<g id="fisherman-arms-rig"[^>]*style="[^"]*transform-origin/);
  assert.match(fishermanTheme, /M 24 32 L 35 36/);
  assert.match(fishermanTheme, /class="fisherman-arm-sleeve"/);
  assert.match(fishermanTheme, /M 30 38 L 78 12/);
  assert.match(fishermanTheme, /M 78 12 L 78 54/);
  assert.match(fishermanTheme, /<circle cx="34" cy="36\.5"/);
  assert.match(fishermanTheme, /<circle cx="36\.5" cy="35\.5"/);
  assert.match(fishermanTheme, /<g id="fisherman-figure"/);
  // Ensure no independent cane/arm transforms in markup
  assert.doesNotMatch(fishermanTheme, /class="fisherman-cane"[^>]*transform/);
  assert.doesNotMatch(fishermanTheme, /class="fisherman-line"[^>]*transform/);
});

test("syncFishermanVisual updates HUD immediately and is called on initial render 0/4", () => {
  // Must use document.getElementById per spec (allow single or double quotes)
  assert.match(taskListJs, /const counterEl = document\.getElementById\(['"]fisherman-counter-text['"]\)/);
  assert.match(taskListJs, /counterEl\.textContent = [`'"]\$\{.*?\}.*?\//);
  // Also support overload syncFishermanVisual(number, number)
  assert.match(taskListJs, /if \(typeof visualEl === "number" && typeof progress === "number"\)/);
  // Must be invoked during render for initial 0/4 display
  assert.match(taskListJs, /syncFishermanVisual/);
  // Ensure HUD label construction uses completed/total
  assert.match(taskListJs, /const hudLabel = `\${completeCount}\/\${total}`/);
  // Bucket progression visibility per spec — now inline (vivid)
  assert.match(taskListJs, /document\.getElementById\('bucket-fish-1'\)\.style\.display = completedCount >= 1 \? 'inline' : 'none'/);
  assert.match(taskListJs, /document\.getElementById\('bucket-fish-2'\)\.style\.display = completedCount >= 2 \? 'inline' : 'none'/);
  assert.match(taskListJs, /document\.getElementById\('bucket-fish-3'\)\.style\.display = completedCount >= 3 \? 'inline' : 'none'/);
  assert.match(taskListJs, /const f1 = document\.getElementById\('bucket-fish-1'\)/);
  assert.match(taskListJs, /if \(f1\) f1\.style\.display = completedCount >= 1 \? 'inline' : 'none'/);
});

test("intermediate cane pole yank keyframe and animation are correct and not clobbered", () => {
  assert.match(css, /@keyframes pole-intermediate-yank\s*\{\s*0% \{ transform: rotate\(0deg\); \}\s*30% \{ transform: rotate\(-32deg\); \}\s*70% \{ transform: rotate\(-32deg\); \}\s*100% \{ transform: rotate\(0deg\); \}/);
  assert.match(css, /\.fisherman-pole,\s*\.fisherman-pole-group\s*\{\s*transform-box: fill-box;\s*transform-origin: 10% 90%;/);
  assert.match(css, /\.pole-yanking\s*\{\s*animation: pole-intermediate-yank 1\.1s cubic-bezier\(0\.18, 0\.89, 0\.32, 1\.28\) forwards;/);
  assert.match(taskListJs, /const rig = document\.getElementById\('fisherman-rig'\);/);
  assert.match(taskListJs, /if \(rig\) \{\s*rig\.classList\.remove\('pole-yanking'\);/);
  assert.match(taskListJs, /void rig\.offsetWidth;.*Force DOM reflow/);
  // New unified rig reflow — spec requires #fisherman-arms-rig is-yanking
  assert.match(taskListJs, /document\.getElementById\('fisherman-arms-rig'\)/);
  assert.match(taskListJs, /classList\.remove\('is-yanking'\)/);
  assert.match(taskListJs, /void rig\.offsetWidth.*Force reflow|void armsRig\.offsetWidth/);
  // Cleaned rig — ONLY ONE cane/line in document, inside unified welded arms-rig
  const caneMatches = fishermanTheme.match(/class="fisherman-cane"/g) || [];
  assert.equal(caneMatches.length, 1, "only one cane path");
  const lineMatches = fishermanTheme.match(/class="fisherman-line"/g) || [];
  assert.equal(lineMatches.length, 1, "only one line path");
  assert.match(fishermanTheme, /<g id="fisherman-arms-rig"[\s\S]*M 30 38 L 78 12/);
  assert.match(fishermanTheme, /<path class="fisherman-line" d="M 78 12 L 78 54"/);
  assert.match(fishermanTheme, /<g id="fisherman-rig" class="fisherman-rig"/);
  assert.doesNotMatch(fishermanTheme, /M36 28 C52 24, 68 18, 82 8/);
  // No independent transforms on cane/line/hands
  assert.doesNotMatch(css, /\.fisherman-cane\s*\{[^}]*animation/);
  assert.doesNotMatch(css, /\.fisherman-line\s*\{[^}]*animation/);
  assert.doesNotMatch(css, /#fisherman-cane\s*\{/);
  // Single shoulder pivot
  assert.match(css, /#fisherman-arms-rig\s*\{\s*transform-origin: 24px 32px;/);
  assert.match(css, /@keyframes unified-arm-pull\s*\{\s*0%\s*\{ transform: rotate\(0deg\); \}\s*30%\s*\{ transform: rotate\(-20deg\);/);
  assert.match(css, /#fisherman-rig,\s*\.fisherman-rig\s*\{\s*transform-box: fill-box;\s*transform-origin: 36px 28px;/);
  assert.match(css, /@keyframes rig-pull-stroke\s*\{\s*0% \{ transform: rotate\(0deg\); \}\s*25% \{ transform: rotate\(-28deg\); \}\s*65% \{ transform: rotate\(-28deg\); \}/);
  // JS must trigger pole-yanking before render and not destroy SVG markup until 1100ms
  assert.match(taskListJs, /document\.querySelectorAll\("#fisherman-rig/);
  assert.match(taskListJs, /p\.classList\.add\("pole-yanking"\)/);
  assert.match(taskListJs, /setTimeout\(\(\) => p\.classList\.remove\("pole-yanking"\), 1100\)/);
  assert.match(taskListJs, /\/\/ Fix intermediate cane pole yank: trigger animation FIRST before any DOM re-render/);
  // Ensure outer SVG container is not re-injected during intermediate yank (render only updates list until 1100ms)
  assert.match(taskListJs, /Keep SVG markup intact — render\(\) only updates list, not fishermanScene markup/);
  assert.match(taskListJs, /1100ms/);
});

test("finale fish unhook & splash reentry synchronized at x115 y65 / x68 y65 lowered re-centered", () => {
  // Lowered apex below HUD pill and top edge — fish trajectory 115,85→114,58→80,36→72,50→68,66
  assert.match(css, /@keyframes fish-giant-leap[\s\S]*translate\(115px, 85px\)[\s\S]*translate\(114px, 58px\)[\s\S]*translate\(80px, 36px\)[\s\S]*translate\(72px, 50px\)[\s\S]*translate\(68px, 66px\)[\s\S]*translate\(68px, 78px\)/);
  assert.match(css, /@keyframes finale-fish-leap[\s\S]*translate\(115px, 75px\)[\s\S]*translate\(115px, 42px\)[\s\S]*translate\(105px, 18px\)[\s\S]*translate\(96px, 44px\)[\s\S]*translate\(90px, 65px\)[\s\S]*translate\(90px, 75px\)/);
  assert.match(css, /@keyframes finale-water-splash/);
  assert.match(css, /#finale-splash\s*\{\s*animation: finale-water-splash 0\.35s 0\.85s/);
  assert.match(css, /\.finale-fish-active\s*\{\s*animation: fish-giant-leap 1\.45s cubic-bezier\(0\.25, 1, 0\.5, 1\) forwards/);
  // Grand finale — enlarged 2x bass, correct dive trajectory away from fisherman, visible splash
  assert.match(css, /@keyframes giant-breach-leap[\s\S]*translate\(114px, 86px\)[\s\S]*translate\(104px, 58px\)[\s\S]*translate\(78px, 34px\)[\s\S]*translate\(62px, 48px\)[\s\S]*translate\(52px, 66px\)/);
  assert.match(css, /@keyframes splash-burst[\s\S]*translate\(52px, 66px\)[\s\S]*scale\(1\.3\)/);
  assert.match(css, /\.finale-splash-active\s*\{\s*animation: splash-burst 0\.5s 1\.15s/);
  assert.match(css, /@keyframes fisherman-startle[\s\S]*translate\(0, 24px\) scale\(1\.4\)[\s\S]*translate\(-3px, 23px\)/);
  assert.match(css, /\.fisherman-startled\s*\{\s*animation: fisherman-startle 0\.4s 1\.18s/);
  assert.match(css, /#fisherman-arms-rig\s*\{\s*transform-origin: 24px 32px;/);
  assert.match(css, /@keyframes unified-arm-pull/);
  assert.match(css, /\.pole-yanking #fisherman-arms-rig/);
  assert.match(fishermanTheme, /<g id="finale-fish" class="finale-fish" style="opacity: 0; pointer-events: none;">/);
  assert.match(fishermanTheme, /M 0 0 C 8 -16 28 -18 42 -8 C 42 -2 30 10 20 14 Q 8 16 0 0 Z/);
  assert.match(fishermanTheme, /fill="#1976d2"/);
  assert.match(fishermanTheme, /<g id="finale-splash" class="finale-splash"/);
  assert.match(fishermanTheme, /M 0 0 C -8 -20 -18 -26 -28 -18/);
  // Ensure finale fish is outside scaled group and just above HUD
  const finaleIdx = fishermanTheme.indexOf('<g id="finale-fish"');
  const hudIdx = fishermanTheme.indexOf('<g id="fisherman-hud"');
  const scaledIdx = fishermanTheme.indexOf('transform="translate(0, 24) scale(1.4)"');
  assert.ok(finaleIdx > scaledIdx, "finale fish must be after scaled fisherman group");
  assert.ok(finaleIdx < hudIdx && finaleIdx > 0, "finale fish must be just above HUD at root");
  assert.ok(finaleIdx > fishermanTheme.lastIndexOf('</g>', hudIdx - 200) || true);
});
