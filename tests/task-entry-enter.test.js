import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("task input Enter/Return immediately adds task without Done click", () => {
  const js = readFileSync("src/shared/task-list.js", "utf8");
  // Must have keydown handler on task input that handles Enter/Return and triggers submit
  assert.match(js, /input\.addEventListener\("keydown"/);
  assert.match(js, /isEnter.*Enter.*Return.*NumpadEnter/);
  assert.match(js, /form\.requestSubmit|form\.dispatchEvent.*submit/);
  // Should be inside task-list.js form handling, not just VR
  assert.match(js, /Task Input Fix: Enter\/Return adds task immediately/);
});

test("full rectangular lattice encircles task list on all four sides", () => {
  const css = readFileSync("src/shared/styles.css", "utf8");
  // 4-sided: top, left, right, bottom pillars — extended headroom for full vine span
  assert.match(css, /\.lattice-frame[^}]*grid-template-columns:\s*15%\s*1fr\s*15%/);
  assert.match(css, /\.lattice-frame[^}]*grid-template-rows:\s*64px\s*1fr\s*32px/);
  assert.match(css, /\.lattice-pillar--bottom/);
  assert.match(css, /\.lattice-pillar--top[^}]*grid-row:\s*1/);
  assert.match(css, /\.lattice-pillar--left[^}]*grid-row:\s*2/);
  assert.match(css, /\.lattice-pillar--right[^}]*grid-row:\s*2/);
  assert.match(css, /border-radius:\s*10px;/); // 4-sided radius, not 10px 10px 0 0
  // Rich diamond lattice texture — crisp saturated, no muting overlay
  assert.match(css, /background:\s*#c49a6b/);
  assert.match(css, /linear-gradient\(45deg.*#6b3d1a/);
});

test("VR browser panel matches full 4-sided lattice", () => {
  const vrCss = readFileSync("prototypes/meta-iwsdk/src/browser-panel.css", "utf8");
  assert.match(vrCss, /\.trellis-frame[^}]*grid-template-columns:\s*15%\s*1fr\s*15%/);
  assert.match(vrCss, /\.trellis-frame[^}]*grid-template-rows:\s*64px\s*1fr\s*32px/);
  assert.match(vrCss, /\.trellis-pillar--bottom/);
});

test("compact window sizing removes dead space", () => {
  const popup = readFileSync("src/popup/popup.css", "utf8");
  const styles = readFileSync("src/shared/styles.css", "utf8");
  const vrPanel = readFileSync("prototypes/meta-iwsdk/src/browser-panel.css", "utf8");
  // Popup compact: 300x460, header 6px 8px 4px, main 4px 6px 6px
  assert.match(popup, /width:\s*300px/);
  assert.match(popup, /max-height:\s*460px/);
  assert.match(popup, /\.popup-view \.app-header[^}]*padding:\s*6px 8px 4px/);
  assert.match(popup, /\.popup-view \.app-main[^}]*padding:\s*4px 6px 6px/);
  assert.match(styles, /\.app-main[^}]*padding:\s*6px 6px 8px/);
  assert.match(vrPanel, /\.browser-panel[^}]*width:\s*min\(300px/);
  assert.match(vrPanel, /\.browser-panel[^}]*padding:\s*6px;/);
});

test("action buttons remain clean, distinct, properly aligned and header intact", () => {
  const css = readFileSync("src/shared/styles.css", "utf8");
  const vrCss = readFileSync("prototypes/meta-iwsdk/src/browser-panel.css", "utf8");
  // Header gap/padding intact
  assert.match(css, /\.app-header[^}]*gap:\s*10px/);
  // List actions footer: flex, gap, distinct colors
  assert.match(css, /\.list-actions-footer[^}]*display:\s*flex/);
  assert.match(css, /\.list-actions-footer[^}]*gap:\s*8px/);
  assert.match(css, /\.list-actions-footer \.new-list-toggle[^}]*background:\s*var\(--accent\)/);
  assert.match(css, /\.list-actions-footer \.clear-all-button:hover/);
  // VR buttons: outline, secondary, primary distinct
  assert.match(vrCss, /\.browser-outline[^}]*border-color:\s*#b99a74/);
  assert.match(vrCss, /\.browser-secondary[^}]*background:\s*#ffb13f/);
  assert.match(vrCss, /\.browser-primary[^}]*background:\s*#d86f09/);
});

test("vine growth progression is incremental inside 4-sided pillars reaching 100%", () => {
  const css = readFileSync("src/shared/styles.css", "utf8");
  const js = readFileSync("src/shared/task-list.js", "utf8");
  // Side vines use --vine-height, top vine grows outward proportionally — fully opaque vivid
  assert.match(css, /\.lattice-pillar \.lattice-vine--left,\s*\.lattice-pillar \.lattice-vine--right[^}]*height:\s*var\(--vine-height/);
  assert.match(css, /\.lattice-vine--top[^}]*width:\s*calc\(var\(--vine-height/);
  assert.match(css, /\.lattice-vine--top[^}]*opacity:\s*1/);
  assert.match(css, /\.lattice-vine--top[^}]*max-width:\s*calc\(70%/);
  // High-contrast vivid vines/leaves fully opaque
  assert.match(css, /\.lattice-pillar \.lattice-vine--left[^}]*opacity:\s*1/);
  // JS sets --vine-height from checked/total ratio and updates on every render
  assert.match(js, /latticeFrame\.style\.setProperty\("--vine-height"/);
  assert.match(js, /const percent = Math\.round\(ratio \* 100\)/);
  // Interactive: change handler updates tasks then render immediately (no manual refresh)
  assert.match(js, /tasks = nextTasks/);
  assert.match(js, /function render\(\)/);
});

test("standalone widget remains compact and vertically concise", () => {
  const css = readFileSync("src/shared/styles.css", "utf8");
  const vrCss = readFileSync("prototypes/meta-iwsdk/src/browser-panel.css", "utf8");
  // Lattice is exclusive to task list (only ul#task-list inside lattice-content, buttons outside)
  const js = readFileSync("src/shared/task-list.js", "utf8");
  assert.match(js, /<div class="lattice-content">\s*<ul id="task-list"/);
  assert.match(js, /<\/div>\s*<\/div>\s*<section class="client-motivator"/);
  // VR: trellis-content wraps task list only, buttons outside trellis-frame
  const html = readFileSync("prototypes/meta-iwsdk/index.html", "utf8");
  assert.match(html, /<div class="trellis-content">\s*<p id="browser-now-heading"/);
  assert.match(html, /<\/div>\s*<\/div>\s*<div class="browser-list-actions/);
  // No dead space: lattice has tight padding, top/bottom pillars 18px
  assert.match(css, /\.lattice-content[^}]*padding:\s*6px 6px 6px/);
  assert.match(vrCss, /\.trellis-content[^}]*padding:\s*6px 8px 8px/);
});
