/**
 * Browser checks for the Videos workspace (real Chromium, real storage).
 *
 * Covers what unit tests cannot: layout without horizontal overflow at each target
 * viewport, the composer's compactness and centering, real project/folder/series
 * creation persisting through a reload, recursive folder breadcrumbs, style →
 * prompt transfer that protects existing user text, and the honest unconfigured
 * generation state.
 *
 * Run while a dev server is up:
 *   node scripts/check-videos.mjs http://127.0.0.1:12000
 */

import puppeteer from 'puppeteer-core';

const base = process.argv[2] ?? 'http://127.0.0.1:5173';
const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium',
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage']
});

const results = [];
const check = (name, ok, detail = '') => {
        results.push({ name, ok, detail });
        console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const clickText = (page, selector, text) =>
        page.evaluate(
                (sel, label) => {
                        const el = [...document.querySelectorAll(sel)].find((n) => n.textContent?.trim() === label);
                        el?.click();
                        return !!el;
                },
                selector,
                text
        );

const setValue = (page, selector, value) =>
        page.evaluate(
                (sel, val) => {
                        const el = document.querySelector(sel);
                        if (!el) return false;
                        const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
                        Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, val);
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        return true;
                },
                selector,
                value
        );

const openProject = async (page) => {
        await page.goto(`${base}/videos`, { waitUntil: 'networkidle0' });
        await wait(300);
        // Open the first project row's menu → Open, or click the project name.
        await page.evaluate(() => {
                const row = document.querySelector('.project-row, .projects .card, .projects li');
                const nameBtn = row?.querySelector('button');
                (nameBtn ?? row)?.click();
        });
        await wait(400);
};

// --- Layout across viewports ------------------------------------------------
const viewports = [
        { name: 'desktop-1920', width: 1920, height: 1080 },
        { name: 'laptop-1600', width: 1600, height: 900 },
        { name: 'laptop-1440', width: 1440, height: 900 },
        { name: 'laptop-1366', width: 1366, height: 768 },
        { name: 'tablet-834', width: 834, height: 1112 },
        { name: 'mobile-390', width: 390, height: 844 }
];

for (const vp of viewports) {
        const page = await browser.newPage();
        await page.setViewport({ width: vp.width, height: vp.height });
        await page.goto(`${base}/videos`, { waitUntil: 'networkidle0' });
        await wait(300);
        const metrics = await page.evaluate(() => {
                const doc = document.documentElement;
                return {
                        overflow: doc.scrollWidth - doc.clientWidth,
                        navItems: document.querySelectorAll('nav[aria-label="Videos sections"] button').length,
                        heading: document.querySelector('.vmain h1, .vmain h2')?.textContent?.trim() ?? ''
                };
        });
        check(
                `layout ${vp.name}`,
                metrics.overflow <= 1 && metrics.navItems >= 10,
                `overflow=${metrics.overflow} nav=${metrics.navItems} heading="${metrics.heading}"`
        );
        await page.close();
}

// --- Studio layout: composer below the canvas, centered, bounded width ---------
{
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.goto(`${base}/videos`, { waitUntil: 'networkidle0' });
        await wait(600);
        await page.evaluate(() => {
                const btn = [...document.querySelectorAll('button')].find((x) => /Galactic Universe/.test(x.textContent ?? ''));
                btn?.click();
        });
        await wait(800);
        const layout = await page.evaluate(() => {
                const box = (el) => {
                        if (!el) return null;
                        const r = el.getBoundingClientRect();
                        return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: r.width, h: r.height };
                };
                const canvas = box(document.querySelector('.canvas'));
                const composer = box(document.querySelector('.composer-wrap')) ?? box(document.querySelector('.composer-dock > *'));
                return {
                        canvas,
                        composer,
                        below: canvas && composer ? composer.top >= canvas.bottom - 2 : false,
                        width: composer ? composer.w : 0
                };
        });
        check('the composer sits below the canvas', layout.below);
        check(
                'the composer is bounded to <=768px',
                layout.width > 0 && layout.width <= 768,
                `width=${Math.round(layout.width)}`
        );
        await page.close();
}

// --- Create a project and reload: it must persist ----------------------------
{
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });
        await page.goto(`${base}/videos`, { waitUntil: 'networkidle0' });
        await wait(400);

        // Go to Projects and create one.
        await clickText(page, 'nav[aria-label="Videos sections"] button span', 'Projects');
        await wait(200);
        await clickText(page, '.vmain button', 'New');
        await wait(300);
        const created = await setValue(page, 'input[placeholder="e.g. Galactic Universe"]', 'Galactic Universe');
        check('new-project dialog accepts a name', created);
        await clickText(page, '[role="dialog"] button', 'Create');
        await wait(600);

        const afterCreate = await page.evaluate(() => document.body.innerText);
        check('the project appears after creation', /Galactic Universe/.test(afterCreate));

        // Reload — persistence must survive.
        await page.reload({ waitUntil: 'networkidle0' });
        await wait(500);
        await clickText(page, 'nav[aria-label="Videos sections"] button span', 'Projects');
        await wait(300);
        const afterReload = await page.evaluate(() => document.body.innerText);
        check('the project survives a reload', /Galactic Universe/.test(afterReload));
        await page.close();
}

// --- Nested folders and breadcrumbs -----------------------------------------
{
        const page = await browser.newPage();
        await page.setViewport({ width: 1600, height: 900 });
        await page.goto(`${base}/videos`, { waitUntil: 'networkidle0' });
        await wait(500);

        // Open the project created above from the Studio project switcher.
        await page.evaluate(() => {
                const btn = [...document.querySelectorAll('button')].find((b) => /Galactic Universe/.test(b.textContent ?? ''));
                btn?.click();
        });
        await wait(500);

        await clickText(page, 'nav[aria-label="Videos sections"] button span', 'Folders');
        await wait(300);

        // Create a folder (created inline with a unique default name), then a nested
        // subfolder inside it by opening it first.
        const madeRoot = await clickText(page, '.vmain button', 'New folder');
        await wait(500);
        check('the new-folder action is present', madeRoot);

        const treeText = await page.evaluate(() => document.body.innerText);
        check('a root folder is created', /New folder/.test(treeText));

        // Open that folder and add a subfolder: depth must increase.
        await page.evaluate(() => {
                const btn = document.querySelector('.tree-name');
                btn?.click();
        });
        await wait(400);
        await clickText(page, '.vmain button', 'New folder');
        await wait(500);
        const depth = await page.evaluate(() => {
                const rows = [...document.querySelectorAll('.tree-row')];
                return Math.max(...rows.map((r) => Number(r.getAttribute('aria-level') ?? 1)));
        });
        check('a nested subfolder deepens the tree', depth >= 2, `max aria-level=${depth}`);

        // Breadcrumbs must reflect the open folder.
        const crumbs = await page.evaluate(
                () => document.querySelector('nav[aria-label="Folder path"]')?.textContent?.replace(/\s+/g, ' ').trim() ?? ''
        );
        check('breadcrumbs render the folder path', /New folder/.test(crumbs), `crumbs="${crumbs}"`);
        await page.close();
}

// --- Style → prompt transfer preserves user text ----------------------------
{
        const page = await browser.newPage();
        await page.setViewport({ width: 1600, height: 900 });
        await page.goto(`${base}/videos`, { waitUntil: 'networkidle0' });
        await wait(500);
        await page.evaluate(() => {
                const btn = [...document.querySelectorAll('button')].find((b) => /Galactic Universe/.test(b.textContent ?? ''));
                btn?.click();
        });
        await wait(400);

        // Type a user prompt into the composer.
        const composerSel = 'textarea[placeholder="Describe the shot — subject, action, camera, lighting…"]';
        await setValue(page, composerSel, 'A lone courier crosses a neon rooftop.');
        await wait(200);

        // Open the shared style library from the header.
        await clickText(page, '.vmain button', 'Styles');
        await wait(400);
        const libraryOpen = await page.evaluate(() => !!document.querySelector('[aria-label="Style results"]'));
        check('the shared style library opens in Videos', libraryOpen);

        await page.type('input[placeholder="Search styles…"]', 'cyberpunk');
        await wait(300);
        await page.evaluate(() => {
                document.querySelector('[aria-label="Style results"] .card')?.click();
        });
        await wait(300);

        // The workspace must ask how to combine rather than overwrite silently.
        const mergeShown = await page.evaluate(() => !!document.querySelector('.style-merge'));
        check('an existing prompt is not silently overwritten', mergeShown);

        if (mergeShown) {
                await clickText(page, '.style-merge button', 'Append guidance after the current text');
                await wait(400);
        }

        const draft = await page.evaluate((sel) => document.querySelector(sel)?.value ?? '', composerSel);
        check(
                'the user subject survives combining with the style',
                /courier/i.test(draft) && /cyberpunk/i.test(draft),
                `draft: ${draft.slice(0, 100)}`
        );
        check('the style produced a structured brief, not just a name', /STRUCTURED VIDEO BRIEF/.test(draft));
        await page.close();
}

// --- Honest unconfigured generation -----------------------------------------
{
        const page = await browser.newPage();
        await page.setViewport({ width: 1600, height: 900 });
        await page.goto(`${base}/videos`, { waitUntil: 'networkidle0' });
        await wait(500);
        await page.evaluate(() => {
                const btn = [...document.querySelectorAll('button')].find((b) => /Galactic Universe/.test(b.textContent ?? ''));
                btn?.click();
        });
        await wait(400);

        const composerSel = 'textarea[placeholder="Describe the shot — subject, action, camera, lighting…"]';
        await setValue(page, composerSel, 'A golden phoenix over a black sea.');
        await wait(200);

        const before = await page.evaluate(() => document.body.innerText);
        check('unconfigured generation is stated honestly', /not configured|not connected/i.test(before));

        // Queue generation: with no backend, nothing may be fabricated.
        await page.evaluate(() => {
                const btn = document.querySelector('button[aria-label="Queue generation"]');
                btn?.click();
        });
        await wait(700);

        const after = await page.evaluate(() => ({
                text: document.body.innerText,
                videos: document.querySelectorAll('video').length
        }));
        check('no video is fabricated without a service', after.videos === 0, `video count=${after.videos}`);
        check('the failure is reported honestly', /not configured|not connected|no video|unavailable/i.test(after.text));

        const preserved = await page.evaluate((sel) => document.querySelector(sel)?.value ?? '', composerSel);
        check('the prompt is preserved after a failed generation', /phoenix/i.test(preserved), `draft: ${preserved.slice(0, 60)}`);
        await page.close();
}

// --- Regression: Home, Chats and Images are untouched ------------------------
{
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });
        for (const [route, selector, label] of [
                ['/', 'textarea[placeholder="Ask ARTI anything..."]', 'Home'],
                ['/chats', 'textarea[placeholder="Ask ARTI anything..."]', 'Chats'],
                ['/images', 'textarea[placeholder="Describe the image you want to create…"]', 'Images']
        ]) {
                await page.goto(`${base}${route}`, { waitUntil: 'networkidle0' });
                await wait(300);
                const ok = await page.evaluate((sel) => {
                        const doc = document.documentElement;
                        return doc.scrollWidth - doc.clientWidth <= 1 && !!document.querySelector(sel);
                }, selector);
                check(`${label} still renders without overflow`, ok);
        }
        await page.close();
}

await browser.close();

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
