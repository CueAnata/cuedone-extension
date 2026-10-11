// Optional isolated UI regression check using an existing Playwright installation.
// Set CUEDONE_PLAYWRIGHT_MODULE to its module path, then run this file with Node.
// Uses a fresh headless Chrome profile and synthetic storage; no saved extension data.
const { chromium } = require(process.env.CUEDONE_PLAYWRIGHT_MODULE || 'playwright');
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const root = path.resolve(__dirname, '..');
let browser;
(async () => {
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
    const context = await browser.newContext();
    let errors = [];
    await context.route('https://cuedone.test/**', async (route) => { const p = path.join(root, new URL(route.request().url()).pathname); try {
        await route.fulfill({ body: fs.readFileSync(p), contentType: p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : p.endsWith('.png') ? 'image/png' : 'text/html' });
    }
    catch {
        await route.fulfill({ status: 404, body: '' });
    } });
    await context.addInitScript(() => {
        const task = (id, text) => ({ id, text, completed: false, createdAt: 1 });
        if (!localStorage.getItem('seeded')) {
            for (const [k, v] of Object.entries({ 'cuedone.tasks': [task('priv', 'PRIVATE SENTINEL'), task('priv2', 'PRIVATE SECOND')], 'cuedone.publicTasks': [task('pub', 'PUBLIC SENTINEL')] }))
                localStorage.setItem(k, JSON.stringify(v));
            localStorage.setItem('seeded', '1');
        }
        const read = k => JSON.parse(localStorage.getItem(k) || 'null');
        window.store = new Proxy({}, { get: (_, k) => read(k) });
        window.failKey = null;
        window.delayPublic = false;
        window.rejectPublic = false;
        window.audio = [];
        window.calls = [];
        const listeners = [];
        const runtimeListeners = [];
        HTMLMediaElement.prototype.play = function () { window.audio.push(this.src); return Promise.resolve(); };
        HTMLMediaElement.prototype.pause = function () { };
        window.addEventListener('storage', e => { if (e.key?.startsWith('cuedone.'))
            for (const f of listeners)
                f({ [e.key]: { newValue: JSON.parse(e.newValue || 'null') } }, 'local'); });
        window.chrome = { storage: { local: { get: async (keys) => { const data = Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(k => [k, read(k)])); if (window.delayPublic && keys === 'cuedone.publicTasks') {
                        window.delayPublic = false;
                        await new Promise(r => window.pendingPublic = r);
                        if (window.rejectPublic)
                            throw Error('old load failure');
                    } return data; }, set: async (values) => { if (window.failKey && window.failKey in values)
                        throw Error('injected storage failure'); const changes = {}; for (const [k, v] of Object.entries(values)) {
                        changes[k] = { oldValue: read(k), newValue: v };
                        localStorage.setItem(k, JSON.stringify(v));
                    } for (const f of listeners)
                        f(changes, 'local'); } }, onChanged: { addListener: f => listeners.push(f), removeListener: () => { } } }, action: { setPopup: async (v) => window.calls.push(['popup', v]), openPopup: async () => window.calls.push(['openTop']) }, sidePanel: { setPanelBehavior: async () => { }, open: async () => window.calls.push(['openSide']), close: async () => window.calls.push(['closeSide']) }, runtime: { onMessage: { addListener: f => runtimeListeners.push(f) }, sendMessage: async () => { } }, windows: { getCurrent: async () => ({ id: 1 }) } };
        window.close = () => window.calls.push(['closeWindow']);
    });
    let top = await context.newPage();
    top.on('pageerror', e => errors.push(e.message));
    await top.goto('https://cuedone.test/src/popup/popup.html');
    await top.getByText('PRIVATE SENTINEL', { exact: true }).waitFor();
    await top.locator('.personal-settings-toggle').click();

    await top.locator('#personal-pause-message').selectOption('done-for-now');
    await top.locator('#personal-complete-message').selectOption('all-done');
    await top.locator('.task-checkbox').first().check();
    await top.waitForFunction(() => window.store['cuedone.tasks'][0].completed);
    await top.locator('.finish-for-now-button').click();
    await top.locator('.personal-ending:visible').waitFor();
    const pause = await top.evaluate(() => window.store['cuedone.personalEnding']);
    const side = await context.newPage();
    side.on('pageerror', error => errors.push(error.message));
    await side.goto('https://cuedone.test/src/sidepanel/sidepanel.html');
    await side.locator('.personal-ending:visible').waitFor();
    await top.locator('#new-task').fill('ADDED WHILE PAUSED');
    await top.locator('.add-button').click();
    await side.getByText('ADDED WHILE PAUSED', { exact: true }).waitFor();
    assert.deepEqual(await top.evaluate(() => window.store['cuedone.personalEnding']), pause);
    assert.equal(await top.locator('.personal-ending:visible').count(), 1);
    await top.close();
    const newTab = await context.newPage();
    await newTab.goto('about:blank');
    top = await context.newPage();
    top.on('pageerror', error => errors.push(error.message));
    await top.goto('https://cuedone.test/src/popup/popup.html');
    await top.getByText('ADDED WHILE PAUSED', { exact: true }).waitFor();
    await top.locator('.personal-ending:visible').waitFor();
    assert.equal(await top.locator('.task-checkbox').first().isChecked(), true);
    assert.equal(await side.locator('.personal-ending:visible').count(), 1);
    console.log('PASS partial completion -> pause -> add -> close/new tab/reopen preserves pause and checks in Top/Side');
    const tasksBeforeContinue = await top.evaluate(() => window.store['cuedone.tasks']);
    await top.locator('.continue-list-button').click();
    await top.waitForFunction(() => window.store['cuedone.personalEnding'].kind === 'none');
    assert.deepEqual(await top.evaluate(() => window.store['cuedone.tasks']), tasksBeforeContinue);
    await top.reload();
    await top.getByText('ADDED WHILE PAUSED', { exact: true }).waitFor();
    assert.equal(await top.locator('.personal-ending:visible').count(), 0);
    console.log('PASS Continue dismisses only the pause and stays dismissed on reopen');
    for (let index = 0; index < 3; index++) {
      await top.locator('.task-checkbox').nth(index).check();
      await top.waitForFunction(i => window.store['cuedone.tasks'][i].completed, index);
    }
    await top.locator('.personal-ending.is-complete:visible').waitFor();
    const completion = await top.evaluate(() => window.store['cuedone.personalEnding']);
    await top.evaluate(() => window.failKey = 'cuedone.personalEnding');
    await top.locator('#new-task').fill('REJECTED TASK');
    await top.locator('.add-button').click();
    await top.locator('[role=alert]:visible').waitFor();
    assert.equal(await top.evaluate(() => window.store['cuedone.tasks'].length), 3);
    assert.equal(await top.locator('.personal-ending.is-complete:visible').count(), 1);
    await top.evaluate(() => window.failKey = null);
    await top.locator('#new-task').fill('NEW UNFINISHED');
    await top.locator('.add-button').click();
    await side.getByText('NEW UNFINISHED', { exact: true }).waitFor();
    assert.equal(await top.evaluate(() => window.store['cuedone.personalEnding'].kind), 'none');
    assert.equal(await top.locator('.personal-ending:visible').count(), 0);
    // A delayed old completion message must remain hidden for the changed list.
    await top.evaluate(ending => chrome.storage.local.set({ 'cuedone.personalEnding': ending }), completion);
    await top.reload();
    await top.getByText('NEW UNFINISHED', { exact: true }).waitFor();
    assert.equal(await top.locator('.personal-ending:visible').count(), 0);
    console.log('PASS failed completion/task write preserves data; adding unfinished work clears completion and blocks stale restores');
    await top.locator('.finish-for-now-button').click();
    await top.locator('.personal-ending:visible').waitFor();
    await top.locator('.task-checkbox').last().check();
    await top.waitForFunction(() => window.store['cuedone.tasks'].every(task => task.completed));
    assert.equal(await top.evaluate(() => window.store['cuedone.personalEnding'].kind), 'pause');
    await top.locator('.reset-list-button').click();
    await top.locator('.reset-confirm-button').click();
    await top.waitForFunction(() => window.store['cuedone.tasks'].every(task => !task.completed));
    assert.equal(await top.evaluate(() => window.store['cuedone.personalEnding'].kind), 'none');
    console.log('PASS completing while paused preserves pause; explicit Reset clears it');
    await top.locator('.finish-for-now-button').click();
    await top.locator('.personal-ending:visible').waitFor();
    await top.locator('.new-list-toggle').click();
    await top.locator('.create-new-list-button').click();
    await top.waitForFunction(() => window.store['cuedone.personalEnding'].kind === 'none');
    assert.equal(await top.evaluate(() => window.store['cuedone.tasks'].length), 4);
    assert.equal(await top.locator('.personal-ending:visible').count(), 0);
    console.log('PASS New List clears pause even with identical carried tasks');
    await top.locator('.finish-for-now-button').click();
    await top.locator('.personal-ending:visible').waitFor();
    const privateState = await top.evaluate(() => ({ tasks: window.store['cuedone.tasks'], ending: window.store['cuedone.personalEnding'] }));
    await top.locator('.personal-settings-toggle').click();
    await top.locator('button[data-personal-presentation=public]').click();
    await top.getByText('PUBLIC SENTINEL', { exact: true }).waitFor();
    assert.equal(await top.locator('.personal-ending:visible').count(), 0);
    assert.equal(await top.locator('.task-list').getByText('ADDED WHILE PAUSED', { exact: true }).count(), 0);
    await top.locator('#new-task').fill('PUBLIC ADDED');
    await top.locator('.add-button').click();
    await top.getByText('PUBLIC ADDED', { exact: true }).waitFor();
    assert.deepEqual(await top.evaluate(() => ({ tasks: window.store['cuedone.tasks'], ending: window.store['cuedone.personalEnding'] })), privateState);
    await top.locator('button[data-personal-presentation=private]').click();
    await top.locator('.personal-ending:visible').waitFor();
    assert.equal(await top.evaluate(() => window.audio.length), 0);
    console.log('PASS Public/Private separation, Private pause restore, and no audio replay');
    assert.deepEqual(errors, []);
    await browser.close();
})().catch(async error => {
    console.error(error);
    if (browser) await browser.close();
    process.exitCode = 1;
});
