import test from "node:test";
import assert from "node:assert/strict";
import { coffeeLevels, coffeeStageFromProgress, isPouring, isSteaming } from "../src/shared/coffee-theme.js";

test("Coffee transfers from a full pot to an empty cup, finishing with steam only", () => {
  for (const complete of [0, 1, 2, 3, 4, 3, 2, 1, 0]) {
    const progress = { total: 4, complete };
    const tasks = Array.from({ length: 4 }, (_, index) => ({ completed: index < complete }));
    assert.equal(coffeeStageFromProgress(progress), complete);
    assert.deepEqual(coffeeLevels(progress), { carafe: 100 - complete * 25, mug: complete * 25 });
    assert.deepEqual(coffeeLevels(tasks), coffeeLevels(progress));
    assert.equal(isPouring(progress), complete > 0 && complete < 4);
    assert.equal(isSteaming(progress), complete === 4);
  }
});

test("Coffee empty and invalid progress never fills or pours", () => {
  for (const progress of [undefined, [], { total: 0, complete: 1 }, { total: Infinity, complete: 1 }]) {
    assert.deepEqual(coffeeLevels(progress), { carafe: 0, mug: 0 });
    assert.equal(isPouring(progress), false);
    assert.equal(isSteaming(progress), false);
  }
});


test("Coffee reserves the finale for an exact nonempty completion match", () => {
  assert.equal(isSteaming({ total: 4, complete: 5 }), false);
  assert.notEqual(coffeeStageFromProgress({ total: 4, complete: 5 }), 4);
  assert.equal(isSteaming({ total: 0, complete: 0 }), false);
  for (const complete of [0, 1, 2, 3, 4, 5, 6, 7]) {
    const progress = { total: 7, complete };
    assert.equal(coffeeLevels(progress).carafe, 100 - complete / 7 * 100);
    assert.equal(isSteaming(progress), complete === 7);
  }
});


test("Coffee conserves liquid for arbitrary list lengths and leaves no final pour", () => {
  for (const total of [1, 3, 8, 17]) {
    for (let complete = 0; complete <= total; complete++) {
      const progress = { total, complete };
      const levels = coffeeLevels(progress);
      assert.equal(levels.carafe + levels.mug, 100);
      assert.equal(isPouring(progress), complete > 0 && complete < total);
      assert.equal(isSteaming(progress), complete === total);
    }
    assert.deepEqual(coffeeLevels({ total, complete: total }), { carafe: 0, mug: 100 });
  }
});
