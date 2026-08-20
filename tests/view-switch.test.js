import assert from "node:assert/strict";
import test from "node:test";
import { nextViewAction } from "../src/shared/view-switch.js";

test("nextViewAction activates the requested view even if it is current", () => {
  assert.equal(nextViewAction("top", "side"), "side");
  assert.equal(nextViewAction("side", "top"), "top");
  assert.equal(nextViewAction("top", "top"), "top");
  assert.equal(nextViewAction("side", "side"), "side");
});

test("nextViewAction ignores invalid views", () => {
  assert.equal(nextViewAction("top", "client"), null);
});
