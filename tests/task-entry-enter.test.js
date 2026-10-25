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
  // 4-sided: top, left, right, bottom pillars
  assert.match(css, /\.lattice-frame[^}]*grid-template-columns:\s*15%\s*1fr\s*15%/);
  assert.match(css, /\.lattice-frame[^}]*grid-template-rows:\s*22px\s*1fr\s*18px/);
  assert.match(css, /\.lattice-pillar--bottom/);
  assert.match(css, /\.lattice-pillar--top[^}]*grid-row:\s*1/);
  assert.match(css, /\.lattice-pillar--left[^}]*grid-row:\s*2/);
  assert.match(css, /\.lattice-pillar--right[^}]*grid-row:\s*2/);
  assert.match(css, /border-radius:\s*10px;/); // 4-sided radius, not 10px 10px 0 0
  // Rich diamond lattice texture
  assert.match(css, /background-color:\s*#d9b896/);
  assert.match(css, /linear-gradient\(45deg.*#a67c3a/);
});

test("VR browser panel matches full 4-sided lattice", () => {
  const vrCss = readFileSync("prototypes/meta-iwsdk/src/browser-panel.css", "utf8");
  assert.match(vrCss, /\.trellis-frame[^}]*grid-template-columns:\s*15%\s*1fr\s*15%/);
  assert.match(vrCss, /\.trellis-frame[^}]*grid-template-rows:\s*18px\s*1fr\s*16px/);
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
