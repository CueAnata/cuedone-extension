// Optional isolated UI regression check using an existing Playwright installation.
// Set CUEDONE_PLAYWRIGHT_MODULE to its module path, then run this file with Node.
// Uses fresh browser storage and the real popup/side-panel modules; it never reads
// or writes the user's extension storage.
const { chromium } = require(
  process.env.CUEDONE_PLAYWRIGHT_MODULE || "playwright"
);
const fs = require("fs");
const path = require("path");
const assert = require("assert/strict");

const root = path.resolve(__dirname, "..");
const screenshotDir = process.env.CUEDONE_SCREENSHOT_DIR || "";
let browser;

function task(id, text, completed = false, createdAt = 1) {
  return { id, text, completed, createdAt };
}

async function taskTexts(page) {
  return page.locator(".task-text").allTextContents();
}

async function storedTasks(page) {
  return page.evaluate(() => window.store["cuedone.tasks"]);
}

async function setFailure(page, key) {
  await page.evaluate((value) => {
    window.failKey = value;
    const alert = document.querySelector("[role=alert]");
    alert.hidden = true;
    alert.textContent = "";
  }, key);
}

async function clearFailure(page) {
  await page.evaluate(() => {
    window.failKey = null;
  });
}

async function assertFitsViewport(page, label) {
  const metrics = await page.evaluate(() => ({
    innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    controlsRight: document.querySelector(".header-controls").getBoundingClientRect()
      .right,
    mainRight: document.querySelector(".app-main").getBoundingClientRect().right,
  }));
  assert.ok(
    metrics.scrollWidth <= metrics.innerWidth,
    `${label} has horizontal overflow: ${JSON.stringify(metrics)}`
  );
  assert.ok(metrics.controlsRight <= metrics.innerWidth, `${label} header clips`);
  assert.ok(metrics.mainRight <= metrics.innerWidth, `${label} content clips`);
}

(async () => {
  browser = await chromium.launch({ headless: true, channel: "chrome" });
  const context = await browser.newContext();
  const errors = [];

  await context.route("https://cuedone.test/**", async (route) => {
    const requestPath = path.join(
      root,
      new URL(route.request().url()).pathname
    );
    try {
      const contentType = requestPath.endsWith(".js")
        ? "text/javascript"
        : requestPath.endsWith(".css")
          ? "text/css"
          : requestPath.endsWith(".png")
            ? "image/png"
            : "text/html";
      await route.fulfill({
        body: fs.readFileSync(requestPath),
        contentType,
      });
    } catch {
      await route.fulfill({ status: 404, body: "" });
    }
  });

  await context.addInitScript(
    ({ privateTasks, publicTasks }) => {
      if (!localStorage.getItem("seeded-one-active")) {
        localStorage.setItem("cuedone.tasks", JSON.stringify(privateTasks));
        localStorage.setItem(
          "cuedone.publicTasks",
          JSON.stringify(publicTasks)
        );
        localStorage.setItem(
          "cuedone.personalCompletionSound",
          JSON.stringify("on")
        );
        localStorage.setItem(
          "cuedone.personalCompleteMessage",
          JSON.stringify({ choice: "none", customText: "" })
        );
        localStorage.setItem("seeded-one-active", "1");
      }

      const read = (key) => JSON.parse(localStorage.getItem(key) || "null");
      window.store = new Proxy(
        {},
        { get: (_, key) => read(String(key)) }
      );
      window.failKey = null;
      window.audio = [];
      window.calls = [];
      const listeners = [];
      const runtimeListeners = [];

      window.addEventListener("storage", (event) => {
        if (!event.key?.startsWith("cuedone.")) {
          return;
        }
        for (const listener of listeners) {
          listener(
            {
              [event.key]: {
                oldValue: JSON.parse(event.oldValue || "null"),
                newValue: JSON.parse(event.newValue || "null"),
              },
            },
            "local"
          );
        }
      });

      HTMLMediaElement.prototype.play = function () {
        window.audio.push(this.src);
        return Promise.resolve();
      };
      HTMLMediaElement.prototype.pause = function () {};

      window.chrome = {
        storage: {
          local: {
            get: async (keys) =>
              Object.fromEntries(
                (Array.isArray(keys) ? keys : [keys]).map((key) => [
                  key,
                  read(key),
                ])
              ),
            set: async (values) => {
              if (window.failKey && window.failKey in values) {
                throw new Error("injected storage failure");
              }
              const changes = {};
              for (const [key, value] of Object.entries(values)) {
                changes[key] = { oldValue: read(key), newValue: value };
                localStorage.setItem(key, JSON.stringify(value));
              }
              for (const listener of listeners) {
                listener(changes, "local");
              }
            },
          },
          onChanged: {
            addListener: (listener) => listeners.push(listener),
            removeListener: () => {},
          },
        },
        action: {
          setPopup: async (value) => window.calls.push(["popup", value]),
          openPopup: async () => window.calls.push(["openTop"]),
        },
        sidePanel: {
          setPanelBehavior: async () => {},
          open: async () => window.calls.push(["openSide"]),
          close: async () => window.calls.push(["closeSide"]),
        },
        runtime: {
          onMessage: {
            addListener: (listener) => runtimeListeners.push(listener),
          },
          sendMessage: async () => {},
        },
        windows: { getCurrent: async () => ({ id: 1 }) },
      };
      window.close = () => window.calls.push(["closeWindow"]);
    },
    {
      privateTasks: [
        task("done", "COMPLETED SAMPLE", true),
        task("now", "ACTIVE SAMPLE", false, 2),
        task("later", "WAITING SAMPLE", false, 3),
      ],
      publicTasks: [task("public", "PUBLIC SAMPLE", false)],
    }
  );

  const top = await context.newPage();
  top.on("pageerror", (error) => errors.push(error.message));
  await top.setViewportSize({ width: 360, height: 900 });
  await top.goto("https://cuedone.test/src/popup/popup.html");
  await top.getByText("ACTIVE SAMPLE", { exact: true }).waitFor();

  const side = await context.newPage();
  side.on("pageerror", (error) => errors.push(error.message));
  await side.setViewportSize({ width: 390, height: 900 });
  await side.goto("https://cuedone.test/src/sidepanel/sidepanel.html");
  await side.getByText("ACTIVE SAMPLE", { exact: true }).waitFor();

  assert.equal(
    await top.evaluate(() => document.body.dataset.personalTaskLayout),
    "full-list"
  );
  assert.equal(await top.locator(".task-item").count(), 3);
  assert.equal(await side.locator(".task-item").count(), 3);
  assert.equal(await top.locator(".personal-one-active:visible").count(), 0);
  console.log("PASS Full list remains the default in Top and Side");

  await top.locator(".personal-settings-toggle").click();
  await side.locator(".personal-settings-toggle").click();
  const tasksBeforeLayout = await storedTasks(top);
  const audioBeforeLayout = await top.evaluate(() => window.audio.length);

  await setFailure(top, "cuedone.personalTaskLayout");
  await top.locator('button[data-personal-task-layout="one-active"]').click();
  await top.locator("[role=alert]:visible").waitFor();
  assert.equal(
    await top.evaluate(() => document.body.dataset.personalTaskLayout),
    "full-list"
  );
  assert.deepEqual(await storedTasks(top), tasksBeforeLayout);
  await clearFailure(top);

  await top.locator('button[data-personal-task-layout="one-active"]').click();
  await top.waitForFunction(
    () => window.store["cuedone.personalTaskLayout"] === "one-active"
  );
  await side.waitForFunction(
    () => document.body.dataset.personalTaskLayout === "one-active"
  );
  for (const page of [top, side]) {
    assert.deepEqual(await taskTexts(page), ["ACTIVE SAMPLE"]);
    assert.equal(
      await page.locator(".personal-one-active-progress").innerText(),
      "1 of 3 complete"
    );
    assert.equal(
      await page.locator(".personal-one-active-waiting").innerText(),
      "1 task waiting"
    );
    assert.equal(await page.locator(".one-active-complete-button").count(), 1);
  }
  assert.deepEqual(await storedTasks(top), tasksBeforeLayout);
  assert.equal(await top.evaluate(() => window.audio.length), audioBeforeLayout);
  assert.equal(await top.locator(".celebration-layer.is-visible").count(), 0);
  assert.equal(await top.locator(".personal-ending:visible").count(), 0);
  console.log("PASS One Active Task persists, synchronizes, and is presentation-only");

  const review = top.locator(".personal-full-list-toggle");
  assert.equal(await review.getAttribute("aria-controls"), "task-list");
  await review.focus();
  await review.press("Enter");
  assert.equal(await review.getAttribute("aria-expanded"), "true");
  assert.deepEqual(await taskTexts(top), [
    "COMPLETED SAMPLE",
    "ACTIVE SAMPLE",
    "WAITING SAMPLE",
  ]);
  assert.equal(await top.locator(".task-checkbox").count(), 3);
  assert.equal(await top.locator(".move-up").count(), 3);
  assert.equal(await top.locator(".move-down").count(), 3);
  assert.equal(await top.locator(".delete-button").count(), 3);
  await review.press("Enter");
  assert.equal(await review.getAttribute("aria-expanded"), "false");
  assert.deepEqual(await taskTexts(top), ["ACTIVE SAMPLE"]);
  console.log("PASS keyboard review exposes every task and returns to focus view");

  await setFailure(top, "cuedone.tasks");
  await top.locator(".one-active-complete-button").click();
  await top.locator("[role=alert]:visible").waitFor();
  assert.equal((await storedTasks(top))[1].completed, false);
  assert.deepEqual(await taskTexts(top), ["ACTIVE SAMPLE"]);
  assert.equal(
    await top.locator(".personal-one-active-progress").innerText(),
    "1 of 3 complete"
  );
  await clearFailure(top);

  await top.locator(".one-active-complete-button").click();
  await top.waitForFunction(() => window.store["cuedone.tasks"][1].completed);
  await side.getByText("WAITING SAMPLE", { exact: true }).waitFor();
  assert.equal(
    await top.locator(".personal-one-active-progress").innerText(),
    "2 of 3 complete"
  );
  assert.equal(
    await top.locator(".personal-one-active-waiting").innerText(),
    "0 tasks waiting"
  );
  assert.equal(await top.evaluate(() => window.audio.length), audioBeforeLayout + 1);
  console.log("PASS Complete saves before advancing and a failed save restores focus state");

  await review.click();
  const audioBeforeUncheck = await top.evaluate(() => window.audio.length);
  await top
    .locator('.task-item[data-id="done"] .task-checkbox')
    .uncheck();
  await top.waitForFunction(() => !window.store["cuedone.tasks"][0].completed);
  assert.equal(await top.evaluate(() => window.audio.length), audioBeforeUncheck);
  await top.locator('.task-item[data-id="done"] .move-down').click();
  await top.waitForFunction(() => window.store["cuedone.tasks"][1].id === "done");
  await top.locator('.task-item[data-id="now"] .delete-button').click();
  await top.waitForFunction(
    () => !window.store["cuedone.tasks"].some((item) => item.id === "now")
  );
  assert.deepEqual(
    (await storedTasks(top)).map((item) => item.id),
    ["done", "later"]
  );
  await review.click();
  assert.deepEqual(await taskTexts(top), ["COMPLETED SAMPLE"]);

  await top.locator("#new-task").fill("ADDED SAMPLE");
  await top.locator(".add-button").click();
  await top.waitForFunction(() => window.store["cuedone.tasks"].length === 3);
  assert.equal(
    await top.locator(".personal-one-active-waiting").innerText(),
    "2 tasks waiting"
  );
  console.log("PASS uncheck, reorder, delete, and add keep the ordered shared list working");

  const privateBeforeModes = await storedTasks(top);
  const audioBeforeModes = await top.evaluate(() => window.audio.length);
  await top.locator('button[data-personal-presentation="public"]').click();
  await top.getByText("PUBLIC SAMPLE", { exact: true }).waitFor();
  assert.equal(await top.locator(".personal-one-active:visible").count(), 0);
  assert.equal(await top.locator(".personal-task-layout-settings:visible").count(), 0);
  await top.locator('button[data-mode="client"]').click();
  await top.getByText("COMPLETED SAMPLE", { exact: true }).waitFor();
  assert.equal(await top.locator(".personal-one-active:visible").count(), 0);
  assert.equal(await top.locator(".task-item").count(), 3);
  await top.locator('button[data-mode="personal"]').click();
  await top.getByText("PUBLIC SAMPLE", { exact: true }).waitFor();
  await top.locator('button[data-personal-presentation="private"]').click();
  await top.getByText("COMPLETED SAMPLE", { exact: true }).waitFor();
  assert.deepEqual(await storedTasks(top), privateBeforeModes);
  assert.equal(await top.evaluate(() => window.audio.length), audioBeforeModes);
  console.log("PASS Public and Client stay full-list and isolated from Private layout");

  await side.locator('button[data-personal-task-layout="full-list"]').click();
  await top.waitForFunction(
    () => document.body.dataset.personalTaskLayout === "full-list"
  );
  assert.deepEqual(await storedTasks(top), privateBeforeModes);
  await side.locator('button[data-personal-task-layout="one-active"]').click();
  await top.waitForFunction(
    () => document.body.dataset.personalTaskLayout === "one-active"
  );
  assert.deepEqual(await storedTasks(top), privateBeforeModes);

  const reopened = await context.newPage();
  reopened.on("pageerror", (error) => errors.push(error.message));
  await reopened.setViewportSize({ width: 360, height: 900 });
  await reopened.goto("https://cuedone.test/src/popup/popup.html");
  await reopened.getByText("COMPLETED SAMPLE", { exact: true }).waitFor();
  assert.equal(
    await reopened.evaluate(() => document.body.dataset.personalTaskLayout),
    "one-active"
  );
  assert.deepEqual(await taskTexts(reopened), ["COMPLETED SAMPLE"]);
  console.log("PASS layout and active task restore after reopening");

  for (let remaining = 3; remaining > 0; remaining -= 1) {
    await top.locator(".one-active-complete-button").click();
    await top.waitForFunction(
      (expected) =>
        window.store["cuedone.tasks"].filter((item) => !item.completed).length ===
        expected,
      remaining - 1
    );
  }
  assert.equal(
    await top.locator(".personal-one-active-kicker").innerText(),
    "COMPLETE"
  );
  assert.equal(await top.locator(".task-item").count(), 0);
  await top.locator(".reset-list-button").click();
  await top.locator(".reset-confirm-button").click();
  await top.waitForFunction(() =>
    window.store["cuedone.tasks"].every((item) => !item.completed)
  );
  assert.deepEqual(await taskTexts(top), ["COMPLETED SAMPLE"]);
  assert.equal(
    await top.locator(".personal-one-active-progress").innerText(),
    "0 of 3 complete"
  );
  console.log("PASS all-complete and Reset List retain the One Active layout");

  await top.locator(".one-active-complete-button").click();
  await top.waitForFunction(() => window.store["cuedone.tasks"][0].completed);
  await top.locator(".new-list-toggle").click();
  assert.equal(await top.locator(".carryover-checkbox").count(), 2);
  await top.locator(".carryover-checkbox").last().uncheck();
  const beforeFailedNewList = await storedTasks(top);
  await setFailure(top, "cuedone.tasks");
  await top.locator(".create-new-list-button").click();
  await top.locator(".new-list-error:visible").waitFor();
  assert.deepEqual(await storedTasks(top), beforeFailedNewList);
  await clearFailure(top);
  await top.locator(".create-new-list-button").click();
  await top.waitForFunction(() => window.store["cuedone.tasks"].length === 1);
  assert.equal((await storedTasks(top))[0].completed, false);
  assert.equal(await top.locator("#new-task").isVisible(), true);
  assert.deepEqual(await taskTexts(top), ["WAITING SAMPLE"]);
  console.log("PASS New List carryover saves before replacing and preserves data on failure");

  await top.locator(".finish-for-now-button").click();
  await top.locator(".personal-ending:visible").waitFor();
  const pausedTasks = await storedTasks(top);
  const pauseReopen = await context.newPage();
  pauseReopen.on("pageerror", (error) => errors.push(error.message));
  await pauseReopen.goto("https://cuedone.test/src/popup/popup.html");
  await pauseReopen.locator(".personal-ending:visible").waitFor();
  assert.deepEqual(await storedTasks(pauseReopen), pausedTasks);
  await pauseReopen.locator(".continue-list-button").click();
  await pauseReopen.waitForFunction(
    () => window.store["cuedone.personalEnding"].kind === "none"
  );
  assert.deepEqual(await storedTasks(pauseReopen), pausedTasks);
  console.log("PASS pause/continue and reopen preserve the saved list and layout");

  await pauseReopen.locator(".new-list-toggle").click();
  await pauseReopen.locator(".carryover-checkbox").uncheck();
  await pauseReopen.locator(".create-new-list-button").click();
  await pauseReopen.waitForFunction(
    () => window.store["cuedone.tasks"].length === 0
  );
  assert.equal(await pauseReopen.locator(".empty-state:visible").count(), 1);
  assert.equal(
    await pauseReopen.locator(".personal-one-active-kicker").innerText(),
    "READY"
  );
  assert.equal(
    await pauseReopen.locator(".personal-full-list-toggle:visible").count(),
    0
  );
  console.log("PASS empty new list has a stable ready state without feedback");

  await top.evaluate(() =>
    chrome.storage.local.set({
      "cuedone.tasks": [
        { id: "shot-done", text: "Plan the project update", completed: true, createdAt: 1 },
        { id: "shot-now", text: "Write the project update for Monday", completed: false, createdAt: 2 },
        { id: "shot-later", text: "Send the finished update", completed: false, createdAt: 3 },
      ],
      "cuedone.personalPresentation": "private",
      "cuedone.personalTaskLayout": "one-active",
      "cuedone.personalEnding": { kind: "none", text: "" },
    })
  );
  await top.getByText("Write the project update for Monday", { exact: true }).waitFor();
  await side.getByText("Write the project update for Monday", { exact: true }).waitFor();

  await top.setViewportSize({ width: 360, height: 900 });
  await assertFitsViewport(top, "Top");
  await side.setViewportSize({ width: 390, height: 900 });
  await side.locator(".personal-full-list-toggle").click();
  await assertFitsViewport(side, "narrow Side");
  await side.setViewportSize({ width: 900, height: 800 });
  await side.locator(".personal-full-list-toggle").click();
  await assertFitsViewport(side, "wide Side");

  if (screenshotDir) {
    fs.mkdirSync(screenshotDir, { recursive: true });
    await top.screenshot({
      path: path.join(screenshotDir, "top-private-one-active-extension.png"),
      fullPage: true,
    });
    await side.setViewportSize({ width: 390, height: 900 });
    await side.locator(".personal-full-list-toggle").click();
    await side.screenshot({
      path: path.join(screenshotDir, "side-narrow-private-review-extension.png"),
      fullPage: true,
    });
  }
  console.log("PASS Top and narrow/wide Side fit without horizontal overflow");

  assert.deepEqual(errors, []);
  console.log("PASS no uncaught page errors; isolated saved data only");
  await browser.close();
  browser = null;
})().catch(async (error) => {
  console.error(error);
  if (browser) {
    await browser.close();
  }
  process.exitCode = 1;
});
