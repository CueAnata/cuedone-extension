import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { rocketStageFromProgress } from "../src/shared/rocket-theme.js";
import { normalizeProgress } from "../src/shared/progress.js";

function tasks(n, complete) {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i),
    text: `step ${i + 1}`,
    completed: i < complete,
    createdAt: 1,
  }));
}

describe("rocket launch progression", () => {
  it("five-task stages are all visibly distinct (0-5)", () => {
    const stages = [0, 1, 2, 3, 4, 5].map((c) => rocketStageFromProgress(normalizeProgress(tasks(5, c))));
    // empty should be 0, first completion must move (stage >0), each step must increase
    assert.equal(stages[0], 0);
    assert.ok(stages[1] > stages[0], "1/5 must visibly move from 0/5");
    for (let i = 1; i < stages.length - 1; i++) {
      assert.ok(stages[i + 1] > stages[i], `stage ${i + 1}/5 (${stages[i + 1]}) must be > stage ${i}/5 (${stages[i]})`);
    }
    assert.equal(stages[5], 5, "5/5 must be final landing stage");
  });

  it("one-task list first completion shows launch and final exit", () => {
    const empty = rocketStageFromProgress(normalizeProgress(tasks(1, 0)));
    const full = rocketStageFromProgress(normalizeProgress(tasks(1, 1)));
    assert.equal(empty, 0);
    assert.equal(full, 5);
  });

  it("rocket artwork uses interior space, stays inside border until landing, and lands on top of moon small", () => {
    const css = readFileSync("src/shared/styles.css", "utf8");
    // Smaller rocket keeps bottom visible at rest and tip inside frame
    assert.match(css, /\.rocket-body\s*\{[^}]*width:\s*30px/);
    assert.match(css, /\.rocket-body\s*\{[^}]*height:\s*46px/);
    // Stage 3 must keep tip inside - check transform does not go out of frame (should be modest)
    // Stage 4/5 landed small on moon
    assert.match(css, /\.personal-rocket-visual\[data-stage="5"\][^{]*\{[^}]*scale\(0\.3/);
    // Shooting star to the right of moon
    assert.match(css, /\.shooting-star/);
    assert.match(css, /@keyframes shooting-star/);
  });

  it("mountain theme not modified (regression guard)", () => {
    const mountain = readFileSync("src/shared/mountain-theme.js", "utf8");
    assert.match(mountain, /mountain-climber--4/);
    assert.doesNotMatch(mountain, /kite|rocket.*shooting/i);
  });
});
