import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { normalizeProgress } from "../src/shared/progress.js";
import {
  normalizePlantTheme,
  normalizeVisualTheme,
  PLANT_THEME_VALUES,
  VISUAL_THEME_VALUES,
} from "../src/shared/plant-theme.js";
import {
  describeGumballStage,
  formatGumballAccessibleText,
  gumballStageForTasks,
  gumballStageFromProgress,
  GUMBALL_STAGE_COUNT,
} from "../src/shared/gumball-theme.js";
import {
  constellationStageForTasks,
  constellationStageFromProgress,
  CONSTELLATION_STAGE_COUNT,
  describeConstellationStage,
  formatConstellationAccessibleText,
} from "../src/shared/constellation-theme.js";

function task(id, completed = false) {
  return { id, text: `Task ${id}`, completed, createdAt: 1 };
}

test("visual theme normalize defaults and values", () => {
  assert.equal(normalizePlantTheme("plant"), "plant");
  assert.equal(normalizePlantTheme("off"), "off");
  assert.equal(normalizePlantTheme("gumball"), "off");
  assert.deepEqual(PLANT_THEME_VALUES, ["off", "plant"]);
  assert.equal(normalizeVisualTheme("plant"), "plant");
  assert.equal(normalizeVisualTheme("gumball"), "gumball");
  assert.equal(normalizeVisualTheme("constellation"), "constellation");
  assert.equal(normalizeVisualTheme("mountain"), "mountain");
  assert.equal(normalizeVisualTheme("dynamite"), "dynamite");
  assert.equal(normalizeVisualTheme("coffee"), "coffee");
  assert.equal(normalizeVisualTheme("battery"), "battery");
  assert.equal(normalizeVisualTheme("aquarium"), "aquarium");
  assert.equal(normalizeVisualTheme("kite"), "kite");
  assert.equal(normalizeVisualTheme("animal-puzzle"), "kite");
  assert.equal(normalizeVisualTheme("rocket"), "rocket");
  assert.equal(normalizeVisualTheme("zen-terrarium"), "zen-terrarium");
  assert.equal(normalizeVisualTheme("fisherman"), "fisherman");
  assert.equal(normalizeVisualTheme("unknown"), "plant");
  assert.deepEqual(VISUAL_THEME_VALUES, ["plant", "gumball", "constellation", "mountain", "dynamite", "coffee", "battery", "aquarium", "kite", "rocket", "zen-terrarium", "fisherman"]);
});

test("gumball stage derives from completed/total, empty hidden", () => {
  assert.equal(gumballStageForTasks([]), null);
  assert.equal(gumballStageFromProgress(normalizeProgress([])), null);
  const one = [task("a")];
  assert.equal(gumballStageForTasks(one), 0);
  const oneComplete = [task("a", true)];
  assert.equal(gumballStageForTasks(oneComplete), GUMBALL_STAGE_COUNT - 1);
  const two = [task("a"), task("b")];
  const withOne = [task("a", true), task("b")];
  assert.ok(gumballStageForTasks(withOne) > gumballStageForTasks(two));
  const text = formatGumballAccessibleText(normalizeProgress(withOne), gumballStageForTasks(withOne));
  assert.match(text, /1 of 2 complete/);
  assert.equal(describeGumballStage(normalizeProgress(withOne)).count, GUMBALL_STAGE_COUNT);
});

test("constellation stage derives from completed/total, empty hidden", () => {
  assert.equal(constellationStageForTasks([]), null);
  assert.equal(constellationStageFromProgress(normalizeProgress([])), null);
  const one = [task("a")];
  assert.equal(constellationStageForTasks(one), 0);
  const oneComplete = [task("a", true)];
  assert.equal(constellationStageForTasks(oneComplete), CONSTELLATION_STAGE_COUNT - 1);
  const two = [task("a"), task("b")];
  const withOne = [task("a", true), task("b")];
  assert.ok(constellationStageForTasks(withOne) > constellationStageForTasks(two));
  const text = formatConstellationAccessibleText(normalizeProgress(withOne), constellationStageForTasks(withOne));
  assert.match(text, /1 of 2 complete/);
  assert.equal(describeConstellationStage(normalizeProgress(withOne)).count, CONSTELLATION_STAGE_COUNT);
});

test("gumball and constellation modules stay pure", () => {
  for (const file of ["src/shared/gumball-theme.js", "src/shared/constellation-theme.js", "src/shared/mountain-theme.js", "src/shared/dynamite-theme.js", "src/shared/coffee-theme.js", "src/shared/battery-theme.js", "src/shared/aquarium-theme.js", "src/shared/kite-theme.js", "src/shared/animal-puzzle-theme.js", "src/shared/rocket-theme.js", "src/shared/zen-terrarium-theme.js", "src/shared/fisherman-theme.js"]) {
    const src = readFileSync(file, "utf8");
    assert.doesNotMatch(src, /chrome\.|document\./);
    assert.doesNotMatch(src, /platform\/browser/);
    assert.match(src, /from\s+["']\.\/progress\.js["']/);
  }
});

test("task-list wires Off/Plant toggle and visual theme dropdown", () => {
  const ui = readFileSync("src/shared/task-list.js", "utf8");
  assert.match(ui, /personal-plant-theme-settings/);
  assert.match(ui, /personal-visual-theme-row/);
  assert.match(ui, /personal-visual-theme-select/);
  assert.match(ui, /loadPersonalVisualTheme/);
  assert.match(ui, /savePersonalVisualTheme/);
  assert.match(ui, /onPersonalVisualThemeChanged/);
  assert.match(ui, /normalizeVisualTheme/);
  assert.match(ui, /gumballStageFromProgress/);
  assert.match(ui, /constellationStageFromProgress/);
  assert.match(ui, /mountainStageFromProgress/);
  assert.match(ui, /dynamiteStageFromProgress/);
  assert.match(ui, /coffeeStageFromProgress/);
  assert.match(ui, /batteryStageFromProgress/);
  assert.match(ui, /aquariumStageFromProgress/);
  assert.match(ui, /kiteStageFromProgress/);
  assert.match(ui, /rocketStageFromProgress/);
  assert.match(ui, /zenTerrariumStageFromProgress/);
  assert.match(ui, /fishermanStateFromProgress/);
});

test("gumball and constellation CSS exists, no external assets, reduced-motion", () => {
  const css = readFileSync("src/shared/styles.css", "utf8");
  assert.match(css, /\.gumball-machine/);
  assert.match(css, /\.gumball-globe/);
  assert.match(css, /\.gumball-base/);
  assert.match(css, /\.gumball-flap/);
  assert.match(css, /\.gumball-ball/);
  assert.match(css, /\.gumball-rolling/);
  assert.match(css, /@keyframes gumball-bounce/);
  assert.match(css, /@keyframes gumball-roll-out/);
  assert.doesNotMatch(css, /\.gumball-jar/);
  assert.doesNotMatch(css, /\.gumball-mouth/);
  assert.doesNotMatch(css, /\.gumball--1/);
  assert.match(css, /\.constellation-sky/);
  assert.match(css, /\.constellation-star/);
  assert.match(css, /\.mountain-scene/);
  assert.match(css, /\.mountain-climber--4/);
  assert.match(css, /\.dynamite-scene/);
  assert.match(css, /\.coffee-scene/);
  assert.match(css, /\.battery-scene/);
  assert.match(css, /\.aquarium-scene/);
  assert.match(css, /\.kite-scene/);
  assert.doesNotMatch(css, /\.animal-puzzle-scene/);
  assert.doesNotMatch(css, /\.puzzle-piece/);
  assert.doesNotMatch(css, /\.puzzle-full/);
  assert.match(css, /\.rocket-scene/);
  assert.match(css, /\.zen-scene/);
  assert.match(css, /\.fisherman-scene/);
  assert.match(css, /\.fisherman-svg/);
  assert.doesNotMatch(css, /url\(.*\.(png|jpg|gif|mp4)\)/);
  assert.doesNotMatch(css, /\.mountain-range|\.mountain-flag/);
  assert.match(css, /@media\s*\(prefers-reduced-motion/);
});

test("Mountain Climb uses inline SVG climber poses without external assets", () => {
  const mountain = readFileSync("src/shared/mountain-theme.js", "utf8");
  const ui = readFileSync("src/shared/task-list.js", "utf8");
  assert.match(mountain, /export function mountainSceneMarkup/);
  assert.match(mountain, /<svg class="mountain-svg"/);
  assert.match(mountain, /mountain-climber--0/);
  assert.match(mountain, /mountain-climber--4/);
  assert.match(mountain, /#ff6f00/);
  assert.match(mountain, /#1565c0/);
  assert.match(mountain, /#b8860b/);
  assert.doesNotMatch(mountain, /\.png|\.jpg|chrome\.|document\./);
  assert.match(ui, /mountainSceneMarkup\(\)/);
  assert.doesNotMatch(ui, /mountain-range|mountain-flag/);
});
