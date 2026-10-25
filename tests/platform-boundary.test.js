import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { scheduleBrowserAlarm } from "../src/platform/browser.js";

const PLATFORM_ADAPTER = "src/platform/browser.js";

function listSourceFiles(dir) {
  const files = [];

  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      files.push(...listSourceFiles(path));
    } else if (path.endsWith(".js")) {
      files.push(path);
    }
  }

  return files;
}

test("only the Chromium platform adapter calls chrome APIs", () => {
  const leaks = listSourceFiles("src").filter((file) => {
    if (file === PLATFORM_ADAPTER) {
      return false;
    }

    return readFileSync(file, "utf8").includes("chrome.");
  });

  assert.deepEqual(leaks, []);
});

test("Chromium adapter owns break-clock scheduling for popup and side views", () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const scheduled = [];
  const cleared = [];
  globalThis.setTimeout = (handler, delay) => {
    scheduled.push({ handler, delay });
    return 42;
  };
  globalThis.clearTimeout = (timer) => cleared.push(timer);

  try {
    const cancel = scheduleBrowserAlarm(750, () => {});
    assert.equal(scheduled.length, 1);
    assert.equal(scheduled[0].delay, 750);
    cancel();
    assert.deepEqual(cleared, [42]);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }

  const controller = readFileSync("src/shared/task-list.js", "utf8");
  assert.match(controller, /scheduleBrowserAlarm/);
  assert.match(controller, /onBrowserViewResumed/);
  assert.doesNotMatch(controller, /globalThis\.setTimeout|visibilitychange/);
});
