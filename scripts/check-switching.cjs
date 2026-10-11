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
    const top = await context.newPage();
    top.on('pageerror', e => errors.push(e.message));
    await top.goto('https://cuedone.test/src/popup/popup.html');
    await top.getByText('PRIVATE SENTINEL', { exact: true }).waitFor();
    await top.locator('.personal-settings-toggle').click();
    for (const reject of [false, true]) {
        await top.evaluate(v => { window.delayPublic = true; window.rejectPublic = v; window.pendingPublic = null; }, reject);
        await top.locator('button[data-personal-presentation=public]').click();
        await top.waitForFunction(() => window.pendingPublic);
        await top.locator('button[data-personal-presentation=private]').click();
        await top.getByText('PRIVATE SENTINEL', { exact: true }).waitFor();
        await top.evaluate(() => window.pendingPublic());
        await top.waitForTimeout(50);
        assert.equal(await top.getByText('PRIVATE SENTINEL', { exact: true }).count(), 1);
        assert.equal(await top.locator('[role=alert]:visible').count(), 0);
    }
    // A -> B -> A plus a synchronized write must defeat the older A snapshot.
    await top.evaluate(() => { window.delayPublic = true; window.rejectPublic = false; window.pendingPublic = null; });
    await top.locator('button[data-personal-presentation=public]').click();
    await top.waitForFunction(() => window.pendingPublic);
    await top.locator('button[data-personal-presentation=private]').click();
    await top.getByText('PRIVATE SENTINEL', { exact: true }).waitFor();
    await top.locator('button[data-personal-presentation=public]').click();
    await top.getByText('PUBLIC SENTINEL', { exact: true }).waitFor();
    await top.evaluate(() => chrome.storage.local.set({ 'cuedone.publicTasks': [
      ...window.store['cuedone.publicTasks'], {id:'fresh', text:'FRESH PUBLIC', completed:false, createdAt:2}
    ] }));
    await top.getByText('FRESH PUBLIC', { exact: true }).waitFor();
    await top.evaluate(() => window.pendingPublic());
    await top.waitForTimeout(50);
    assert.equal(await top.getByText('FRESH PUBLIC', { exact: true }).count(), 1);
    await top.locator('button[data-personal-presentation=private]').click();
    await top.getByText('PRIVATE SENTINEL', { exact: true }).waitFor();
    console.log('PASS stale success/failure and repeated-list loads cannot overwrite newer state');
    async function failed(page, key, action, check) { await page.evaluate(k => { window.failKey = k; const alert = document.querySelector("[role=alert]"); alert.hidden = true; alert.textContent = ""; }, key); await action(); await page.locator('[role=alert]:visible').waitFor(); await check(); await page.evaluate(() => window.failKey = null); }
    await failed(top, 'cuedone.presentationMode', () => top.locator('button[data-mode=client]').click(), async () => assert.equal(await top.evaluate(() => document.body.dataset.presentation), 'personal'));
    await failed(top, 'cuedone.personalPresentation', () => top.locator('button[data-personal-presentation=public]').click(), async () => assert.equal(await top.getByText('PRIVATE SENTINEL', { exact: true }).count(), 1));
    await failed(top, 'cuedone.personalCompletionSound', () => top.locator('button[data-personal-completion-sound=on]').click(), async () => assert.equal(await top.evaluate(() => document.body.dataset.personalCompletionSound), 'off'));
    for (const [key, selector, value, expected] of [['cuedone.personalTaskSound', '#personal-task-sound', 'wood-tap', 'bubble-pop'], ['cuedone.personalFinalSound', '#personal-final-sound', 'yay', 'current']])
        await failed(top, key, () => top.locator(selector).selectOption(value), async () => assert.equal(await top.locator(selector).inputValue(), expected));
    await top.locator('button[data-mode=client]').click();
    await top.waitForFunction(() => document.body.dataset.presentation === 'client');
    await top.locator('.client-settings-toggle').click();
    for (const [key, selector, value, expected] of [['cuedone.finalSound', '#final-sound', 'yay', 'current'], ['cuedone.taskSound', '#task-sound', 'wood-tap', 'bubble-pop'], ['cuedone.finalCelebration', '#final-celebration', 'stars', 'random']])
        await failed(top, key, () => top.locator(selector).selectOption(value), async () => assert.equal(await top.locator(selector).inputValue(), expected));
    await failed(top, 'cuedone.completionSound', () => top.locator('button[data-completion-sound=on]').click(), async () => assert.equal(await top.evaluate(() => document.body.dataset.completionSound), 'off'));
    await failed(top, 'cuedone.completionStyle', () => top.locator('button[data-completion-style=celebrate]').click(), async () => assert.equal(await top.evaluate(() => document.body.dataset.completionStyle), 'simple'));
    await failed(top, 'cuedone.reward', () => top.locator('.reward-select').selectOption('music'), async () => assert.equal(await top.locator('.reward-select').inputValue(), 'none'));
    console.log('PASS failed mode/list/Client and Personal audio/style/trail/reward saves restore saved values with visible errors');
    await top.locator('button[data-mode=personal]').click();
    await top.waitForFunction(() => document.body.dataset.presentation === 'personal');
    const side = await context.newPage();
    side.on('pageerror', e => errors.push(e.message));
    await side.goto('https://cuedone.test/src/sidepanel/sidepanel.html');
    await side.getByText('PRIVATE SENTINEL', { exact: true }).waitFor();
    await top.locator('button[data-personal-presentation=public]').click();
    await top.getByText('PUBLIC SENTINEL', { exact: true }).waitFor();
    await side.getByText('PUBLIC SENTINEL', { exact: true }).waitFor();
    assert.equal(await top.getByText('PRIVATE SENTINEL', { exact: true }).count(), 0);
    assert.equal(await side.getByText('PRIVATE SENTINEL', { exact: true }).count(), 0);
    await top.locator('#new-task').fill('PUBLIC ADDED');
    await top.locator('.add-button').click();
    await side.getByText('PUBLIC ADDED', { exact: true }).waitFor();
    assert.equal(await top.evaluate(() => window.store['cuedone.tasks'].length), 2);
    await top.locator('button[data-personal-presentation=private]').click();
    await side.getByText('PRIVATE SENTINEL', { exact: true }).waitFor();
    assert.equal(await side.getByText('PUBLIC ADDED', { exact: true }).count(), 0);
    console.log('PASS Top/Side sync and separate Public/Private task writes');
    await top.locator('button[data-personal-completion-sound=on]').click();
    await top.waitForFunction(() => document.body.dataset.personalCompletionSound === 'on');
    await top.locator('.personal-task-sound-preview').click();
    assert.equal(await top.evaluate(() => window.audio.length), 1);
    await top.locator('button[data-personal-presentation=public]').click();
    await top.getByText('PUBLIC SENTINEL', { exact: true }).waitFor();
    await top.locator('.task-checkbox').first().check();
    assert.equal(await top.evaluate(() => window.audio.length), 1);
    assert.equal(await top.locator('.personal-audio-settings:visible').count(), 0);
    await top.locator('button[data-mode=client]').click();
    await top.getByText('PRIVATE SENTINEL', { exact: true }).waitFor();
    await top.locator('.task-checkbox').first().check();
    assert.equal(await top.evaluate(() => window.audio.length), 1);
    assert.equal(await top.evaluate(() => document.body.dataset.completionSound), 'off');
    await top.locator('button[data-mode=personal]').click();
    await top.getByText('PUBLIC SENTINEL', { exact: true }).waitFor();
    await top.locator('button[data-personal-presentation=private]').click();
    await top.getByText('PRIVATE SECOND', { exact: true }).waitFor();
    await top.locator('button[data-personal-completion-sound=off]').click();
    await top.waitForFunction(() => document.body.dataset.personalCompletionSound === 'off');
    assert.equal(await top.locator('.personal-task-sound-preview').isDisabled(), true);
    assert.equal(await top.locator('.personal-final-sound-preview').isDisabled(), true);
    // Hold On and then Off saves separately to inspect the intermediate gate.
    await top.evaluate(() => {
      const save = chrome.storage.local.set;
      chrome.storage.local.set = async (values) => {
        if (values['cuedone.personalCompletionSound'] === 'on') {
          await new Promise(resolve => window.releaseOn = resolve);
        } else if (values['cuedone.personalCompletionSound'] === 'off') {
          await new Promise(resolve => window.releaseOff = resolve);
        }
        return save(values);
      };
    });
    await top.locator('button[data-personal-completion-sound=on]').click();
    await top.waitForFunction(() => window.releaseOn);
    await top.locator('button[data-personal-completion-sound=off]').click();
    await top.evaluate(() => window.releaseOn());
    await top.waitForFunction(() => window.releaseOff);
    assert.equal(await top.evaluate(() => document.body.dataset.personalCompletionSound), 'off');
    assert.equal(await top.locator('.personal-task-sound-preview').isDisabled(), true);
    await top.evaluate(() => window.releaseOff());
    await top.waitForFunction(() => window.store['cuedone.personalCompletionSound'] === 'off');
    console.log('PASS Private preview, Public silence, independent Client Off and rapid Off cancellation');
    await failed(top, 'cuedone.preferredView', () => top.locator('button[data-view=side]').click(), async () => assert.equal(await top.evaluate(() => window.calls.some(c => c[0] === 'openSide')), false));
    await top.locator('button[data-view=side]').click();
    await top.waitForFunction(() => window.calls.some(c => c[0] === 'openSide'));
    assert.equal(await top.evaluate(() => window.store['cuedone.preferredView']), 'side');
    await side.locator('button[data-view=top]').click();
    await side.waitForFunction(() => window.calls.some(c => c[0] === 'openTop'));
    assert.equal(await side.evaluate(() => window.store['cuedone.preferredView']), 'top');
    console.log('PASS Top/Side adapter calls and failed view-save feedback');
    assert.deepEqual(errors, []);
    console.log('PASS no uncaught page errors');
    await browser.close();
})().catch(async e => { console.error(e); if (browser) await browser.close(); process.exitCode = 1; });
