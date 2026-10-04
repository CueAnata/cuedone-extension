import assert from "node:assert/strict";
import test from "node:test";
import { createTask } from "../src/shared/tasks.js";
import {
  activeListKind,
  emptyStateCopy,
  formatActiveListLabel,
  nextPersonalPresentationAction,
  normalizePersonalPresentation,
  visibleTasksForActiveList,
} from "../src/shared/personal-lists.js";

const privateTask = createTask("Private only", 1, "priv-1");
const publicTask = createTask("Public agenda", 2, "pub-1");

test("Personal presentation defaults to Private and rejects unknown values", () => {
  assert.equal(normalizePersonalPresentation(undefined), "private");
  assert.equal(normalizePersonalPresentation("public"), "public");
  assert.equal(normalizePersonalPresentation("private"), "private");
  assert.equal(normalizePersonalPresentation("shared"), "private");
  assert.equal(nextPersonalPresentationAction("public"), "public");
  assert.equal(nextPersonalPresentationAction("private"), "private");
  assert.equal(nextPersonalPresentationAction("client"), null);
});

test("Client always uses the existing Private list", () => {
  assert.equal(activeListKind("client", "public"), "private");
  assert.equal(activeListKind("client", "private"), "private");
  assert.equal(activeListKind("personal", "public"), "public");
  assert.equal(activeListKind("personal", "private"), "private");
  assert.equal(activeListKind("personal", "mystery"), "private");
});

test("Public never receives Private task text during a list mismatch", () => {
  assert.deepEqual(
    visibleTasksForActiveList("public", "private", [privateTask]),
    []
  );
  assert.deepEqual(
    visibleTasksForActiveList("public", "public", [publicTask]),
    [publicTask]
  );
  assert.deepEqual(
    visibleTasksForActiveList("private", "public", [publicTask]),
    []
  );
  assert.equal(
    visibleTasksForActiveList("public", "private", [privateTask]).some((task) =>
      String(task?.text || "").includes("Private")
    ),
    false
  );
});

test("active-list labels distinguish Public from Private", () => {
  assert.equal(formatActiveListLabel("private"), "Using Private list");
  assert.equal(formatActiveListLabel("public"), "Using Public list");
  assert.match(emptyStateCopy("public"), /public agenda/i);
  assert.doesNotMatch(emptyStateCopy("public"), /Private/);
  assert.match(emptyStateCopy("private"), /No tasks yet/);
});
