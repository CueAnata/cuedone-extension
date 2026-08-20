import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

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
