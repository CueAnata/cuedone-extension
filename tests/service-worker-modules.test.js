import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";

const WORKER_ENTRY = "src/background.js";

function collectModuleGraph(entry) {
  const seen = [];
  const queued = [entry];

  while (queued.length > 0) {
    const file = queued.pop();
    if (seen.includes(file)) {
      continue;
    }

    seen.push(file);
    const source = readFileSync(file, "utf8");
    const dir = dirname(file);

    for (const match of source.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
      queued.push(join(dir, match[1]));
    }

    assert.equal(
      source.includes("import("),
      false,
      `${file} uses dynamic import(), which is asynchronous in a service worker`
    );
  }

  return seen;
}

function sourceWithoutComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

test("manifest registers src/background.js as a module service worker", () => {
  const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.background.service_worker, WORKER_ENTRY);
  assert.equal(manifest.background.type, "module");
});

test("manifest does not force a default popup that would block Side restore", () => {
  const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
  assert.equal(manifest.action.default_popup, undefined);
});

test("service worker does not call openPopup directly", () => {
  const source = readFileSync(WORKER_ENTRY, "utf8");
  assert.equal(source.includes("openPopup"), false);
});

test("service worker module graph contains no await", () => {
  const files = collectModuleGraph(WORKER_ENTRY).sort();
  assert.deepEqual(files, [
    WORKER_ENTRY,
    "src/platform/break-notifications.js",
    "src/platform/browser.js",
    "src/shared/break-clock.js",
    "src/shared/personal-layout.js",
    "src/shared/personal-lists.js",
    "src/shared/personal-messages.js",
    "src/shared/preferences.js",
    "src/shared/reward.js",
  ]);

  for (const file of files) {
    assert.equal(
      /\bawait\b/.test(sourceWithoutComments(readFileSync(file, "utf8"))),
      false,
      `${file} contains await, which Chrome rejects in the service-worker graph`
    );
  }
});
