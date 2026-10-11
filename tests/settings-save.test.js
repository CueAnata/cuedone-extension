import assert from "node:assert/strict";
import test from "node:test";
import { createSettingsSaver } from "../src/shared/settings-save.js";

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

test("a setting is applied only after its save succeeds", async () => {
  const gate = deferred();
  let visible = "off";
  let error = "old error";
  const saveSetting = createSettingsSaver((value) => { error = value; });
  const operation = saveSetting({
    save: () => gate.promise,
    load: async () => "off",
    value: "on",
    apply: (value) => { visible = value; },
    restore: () => { visible = "off"; },
  });
  await Promise.resolve();
  assert.equal(visible, "off");
  gate.resolve();
  assert.equal(await operation, true);
  assert.equal(visible, "on");
  assert.equal(error, "");
});

test("a failed rapid edit restores the latest saved value and reports an error", async () => {
  let saved = "off";
  let visible = "off";
  let error = "";
  const writes = [];
  const gate = deferred();
  const saveSetting = createSettingsSaver((value) => { error = value; });
  const options = {
    load: async () => saved,
    apply: (value) => { visible = value; },
    restore: () => { visible = "off"; },
  };
  const first = saveSetting({ ...options, value: "on", save: async (value) => {
    writes.push(value);
    await gate.promise;
    saved = value;
  } });
  const second = saveSetting({ ...options, value: "off", save: async (value) => {
    writes.push(value);
    throw new Error("storage failure");
  } });
  await Promise.resolve();
  assert.deepEqual(writes, ["on"]);
  gate.resolve();
  assert.equal(await first, true);
  assert.equal(await second, false);
  assert.deepEqual(writes, ["on", "off"]);
  assert.equal(saved, "on");
  assert.equal(visible, "on");
  assert.match(error, /could not save.*last saved setting/i);
});

test("failed save and read restore the known setting without an uncaught rejection", async () => {
  let visible = "unsaved";
  let error;
  const saveSetting = createSettingsSaver((value) => { error = value; });
  assert.equal(await saveSetting({
    value: "unsaved",
    save: async () => { throw new Error("write unavailable"); },
    load: async () => { throw new Error("read unavailable"); },
    apply: (value) => { visible = value; },
    restore: () => { visible = "saved"; },
  }), false);
  assert.equal(visible, "saved");
  assert.match(error, /could not save/i);
});


test("a later failure keeps a successful setting even if rereading storage fails", async () => {
  let visible = "off";
  const saveSetting = createSettingsSaver(() => {});
  let fail = false;
  const save = async () => { if (fail) throw new Error("save failed"); };
  const options = {
    save,
    load: async () => { throw new Error("read failed"); },
    apply: (value) => { visible = value; },
    restore: () => { visible = "off"; },
  };
  await saveSetting({ ...options, value: "on" });
  fail = true;
  assert.equal(await saveSetting({ ...options, value: "off" }), false);
  assert.equal(visible, "on");
});
