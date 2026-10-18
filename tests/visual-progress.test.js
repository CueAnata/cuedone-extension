import test from "node:test";
import assert from "node:assert/strict";
import { normalizeProgress, visualProgress, progressStage } from "../src/shared/progress.js";
import { coffeeLevels, isPouring, isSteaming } from "../src/shared/coffee-theme.js";

const themes = await Promise.all([
  ["plant", "plant", 5], ["gumball", "gumball", 5], ["constellation", "constellation", 5],
  ["mountain", "mountain", 5], ["dynamite", "dynamite", 5], ["coffee", "coffee", 5],
  ["battery", "battery", 5], ["aquarium", "aquarium", 5], ["kite", "kite", 5],
  ["rocket", "rocket", 6], ["zen-terrarium", "zenTerrarium", 5],
  ["fisherman", "fisherman", 2],
].map(async ([file, prefix, count]) => ({
  name: file, count, stage: (await import(`../src/shared/${file}-theme.js`))[`${prefix}StageFromProgress`],
})));

test("every theme scales with exact counts and reserves its finale for completion", () => {
  for (const { name, count, stage } of themes) {
    for (const total of [1, 2, 3, 5, 9, 201]) {
      let previous = -1;
      for (let complete = 0; complete <= total; complete++) {
        const progress = { total, complete, percent: 100 }; // A stale label cannot grant a finale.
        const actual = stage(progress);
        assert.ok(Number.isInteger(actual) && actual >= previous, `${name}: monotonic ${complete}/${total}`);
        assert.equal(actual === count - 1, complete === total, `${name}: finale ${complete}/${total}`);
        previous = actual;
      }
      assert.ok(stage({ total, complete: total - 1 }) < count - 1, `${name}: uncheck leaves finale`);
    }
    assert.equal(stage({ total: 0, complete: 0, percent: 100 }), null, `${name}: empty`);
    assert.equal(stage([]), null, `${name}: empty array`);
    assert.equal(stage({ total: 3, complete: 4 }), null, `${name}: malformed counts`);
  }
});

test("central mapper ignores rounded labels and maps existing unfinished drawings proportionally", () => {
  for (const total of [3, 5, 9]) {
    for (let complete = 0; complete < total; complete++) {
      const progress = { total, complete };
      assert.equal(visualProgress(progress).ratio, complete / total);
      assert.equal(progressStage(progress), Math.floor(complete / total * 4));
    }
  }
  const tasks = Array.from({ length: 201 }, (_, i) => ({ completed: i < 200 }));
  const rounded = normalizeProgress(tasks);
  assert.equal(rounded.percent, 100);
  assert.equal(visualProgress(tasks).isFinal, false);
  assert.equal(progressStage(rounded), 3);
  assert.equal(progressStage({ total: 201, complete: 201 }), 4);
  for (const invalid of [null, [], {total:0,complete:0}, {total:Infinity,complete:1}, {total:3,complete:-1}, {total:3,complete:4}]) {
    assert.equal(visualProgress(invalid), null);
    assert.equal(progressStage(invalid), null);
  }
});

test("continuous coffee levels change at every completion and stop pouring at the exact finale", () => {
  for (const total of [3, 5, 9, 201]) {
    let previousCup = -1;
    for (let complete = 0; complete <= total; complete++) {
      const progress = { total, complete, percent: 100 };
      const levels = coffeeLevels(progress);
      assert.ok(levels.mug > previousCup);
      assert.equal(levels.mug, complete / total * 100);
      assert.equal(levels.carafe, 100 - levels.mug);
      assert.equal(isSteaming(progress), complete === total);
      assert.equal(isPouring(progress), complete > 0 && complete < total);
      previousCup = levels.mug;
    }
  }
});
