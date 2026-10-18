import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeVisualTheme, VISUAL_THEME_VALUES } from "../src/shared/plant-theme.js";
import { createVisualThemeSelection, RANDOM_VISUAL_THEME_VALUES } from "../src/shared/random-visual-theme.js";
import { loadPersonalVisualTheme, savePersonalVisualTheme, PERSONAL_VISUAL_THEME_KEY } from "../src/shared/preferences.js";

test("unsaved animation defaults to Random while every explicitly saved choice survives", async () => {
  const previousChrome = globalThis.chrome;
  const store = {};
  globalThis.chrome = { storage: { local: {
    async get(key) { return { [key]: store[key] }; },
    async set(values) { Object.assign(store, values); },
  } } };
  try {
    assert.equal(normalizeVisualTheme(), "random");
    assert.equal(normalizeVisualTheme(null), "random");
    assert.equal(await loadPersonalVisualTheme(), "random");
    assert.equal(Object.hasOwn(store, PERSONAL_VISUAL_THEME_KEY), false);
    for (const theme of VISUAL_THEME_VALUES) {
      await savePersonalVisualTheme(theme);
      assert.equal(await loadPersonalVisualTheme(), theme);
    }
    assert.equal(normalizeVisualTheme("animal-puzzle"), "kite");
    assert.equal(normalizeVisualTheme("unknown"), "plant");
  } finally { globalThis.chrome = previousChrome; }
});

test("Random consumes every available theme before repeats, including at shuffle boundaries", () => {
  assert.deepEqual(RANDOM_VISUAL_THEME_VALUES, VISUAL_THEME_VALUES.filter(theme => theme !== "random" && theme !== "zen-terrarium"));
  let seed = 31;
  const seeded = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (const random of [() => 0, () => 0.999999, seeded]) {
    const selection = createVisualThemeSelection(random);

    let last;
    for (let cycle = 0; cycle < 100; cycle++) {
      const seen = [];
      for (let turn = 0; turn < RANDOM_VISUAL_THEME_VALUES.length; turn++) {
        const theme = selection.next("random");
        assert.notEqual(theme, last, `Immediate repeat at cycle ${cycle}, turn ${turn}`);
        seen.push(theme);
        for (let i = 0; i < 3; i++) assert.equal(selection.resolve("random"), theme);
        last = theme;
      }
      assert.deepEqual([...seen].sort(), [...RANDOM_VISUAL_THEME_VALUES].sort());
    }
  }
});

test("explicit theme selection does not consume Random's bag or overwrite the preference", () => {
  const selection = createVisualThemeSelection(() => 0);
  const control = createVisualThemeSelection(() => 0);
  assert.equal(selection.next("random"), control.next("random"));
  for (const theme of RANDOM_VISUAL_THEME_VALUES) {
    assert.equal(selection.next(theme), theme);
    assert.equal(selection.resolve(theme), theme);
  }
  assert.equal(selection.next("random"), control.next("random"));
});

test("Random is first in the theme dropdown and concrete themes remain renderable", () => {
  const ui = readFileSync("src/shared/task-list.js", "utf8");
  const select = ui.match(/<select id="personal-visual-theme"[\s\S]*?<\/select>/)[0];
  assert.equal([...select.matchAll(/<option value="([^"]+)"/g)][0][1], "random");
  for (const theme of RANDOM_VISUAL_THEME_VALUES) {
    assert.ok(ui.includes(`data-stage`) && ui.includes(`"${theme}"`));
  }
});

test("one Random theme stays with the entire list, including reopen and unchecking", async () => {
  const { themeSelectionForList } = await import("../src/shared/random-visual-theme.js");
  const tasks = Array.from({length:3}, (_, i) => ({id:String(i),completed:false}));
  let state = themeSelectionForList(undefined, [], tasks, "random", () => 0);
  const active = state.active;
  let previous = tasks;
  for (let complete = 1; complete <= 3; complete++) {
    const next = tasks.map((task, index) => ({...task, completed:index < complete}));
    const updated = themeSelectionForList(state, previous, next, "random", () => 0);
    assert.deepEqual(updated, state);
    assert.equal(createVisualThemeSelection(() => 0, updated).resolve("random"), active);
    previous = next;
    state = updated;
  }
  // Reset/uncheck on the same task IDs does not select another theme.
  assert.deepEqual(themeSelectionForList(state, previous, tasks, "random", () => 0), state);
  // Creating an empty new list retains the finale until the next task is added.
  const pending = themeSelectionForList(state, previous, [], "random", () => 0);
  assert.equal(pending.active, active);
  assert.equal(pending.pendingNextList, true);
  const nextList = themeSelectionForList(pending, [], [{id:"new",completed:false}], "random", () => 0);
  assert.notEqual(nextList.active, active);
  assert.equal(nextList.pendingNextList, false);
  assert.equal(nextList.bag.length, state.bag.length - 1);
  // Adding directly after full completion also starts the next list's turn.
  assert.notEqual(themeSelectionForList(state, previous, [...previous,{id:"extra",completed:false}], "random", () => 0).active, active);
  assert.deepEqual(themeSelectionForList(state, tasks, [], "random", () => 0), state);
  assert.deepEqual(themeSelectionForList(state, previous, [], "coffee", () => 0), state);
});
