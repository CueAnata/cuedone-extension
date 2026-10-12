import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  BREAK_TIMER_MODEL_VERSION,
  breakClockAlarmDelay,
  deserializeBreakTimerModel,
  enableBreakClock,
  normalizeBreakTimerModel,
  pauseBreakClock,
  serializeBreakTimerModel,
  withBreakClock,
  withBreakSuggestionSource,
  withBreakSuggestions,
} from "../src/shared/break-clock.js";

test("portable break timer model is versioned, normalized, and JSON serializable", () => {
  const enabled = enableBreakClock(
    { enabled: false, intervalMinutes: 18 },
    10_000
  );
  const model = withBreakSuggestionSource(
    withBreakSuggestions(
      withBreakClock(normalizeBreakTimerModel(), enabled),
      [{ id: "walk", text: "Walk to the window." }]
    ),
    "custom"
  );

  assert.equal(model.version, BREAK_TIMER_MODEL_VERSION);
  assert.equal(model.suggestionSource, "custom");
  assert.deepEqual(deserializeBreakTimerModel(serializeBreakTimerModel(model)), model);
  assert.deepEqual(JSON.parse(JSON.stringify(model)), model);
});

test("unsupported or malformed stored models safely return version-one defaults", () => {
  const expected = normalizeBreakTimerModel();
  assert.equal(expected.suggestionSource, "choose-for-me");
  assert.deepEqual(normalizeBreakTimerModel({ version: 999, clock: {} }), expected);
  assert.deepEqual(deserializeBreakTimerModel("not json"), expected);
  assert.deepEqual(deserializeBreakTimerModel(null), expected);
});

test("portable timing rules expose scheduling delay without scheduling alarms", () => {
  const running = enableBreakClock(
    { enabled: false, intervalMinutes: 10 },
    1_000
  );
  assert.equal(breakClockAlarmDelay(running, 61_000), 9 * 60_000);
  assert.equal(breakClockAlarmDelay(running, running.dueAt), 0);
  assert.equal(breakClockAlarmDelay(pauseBreakClock(running, 61_000), 999_000), null);
  assert.equal(breakClockAlarmDelay({ enabled: false }, 999_000), null);
});

test("portable break timer module has no platform, DOM, XR, or scheduler dependency", () => {
  const source = readFileSync("src/shared/break-clock.js", "utf8");
  assert.doesNotMatch(source, /^\s*import\s/m);
  assert.doesNotMatch(
    source,
    /\b(?:chrome|document|window|navigator|XRSession|setTimeout|setInterval)\b/
  );
});
