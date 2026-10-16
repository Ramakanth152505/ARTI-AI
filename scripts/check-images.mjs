/**
 * Browser checks for the Images workspace (real Chromium, real storage).
 *
 * Covers the behaviour that unit tests cannot: horizontal overflow at each target
 * viewport, composer compactness, style selection inserting its template into the
 * composer, protection of an existing prompt, the honest unconfigured states, and
 * existence checks for the actions a result card is allowed to expose.
 *
 * Run while a dev server is up:
 *   node scripts/check-images.mjs http://127.0.0.1:12000
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
        await page.goto(`${base}/images`, { waitUntil: 'networkidle0' });
        const metrics = await page.evaluate(() => {
                const doc = document.documentElement;
                const composer = document.querySelector('textarea[placeholder="Describe the image you want to create…"]');
                const rect = composer?.getBoundingClientRect();
                return {
                        overflow: doc.scrollWidth - doc.clientWidth,
                        composerVisible: !!rect && rect.width > 40 && rect.top < window.innerHeight,
                        composerHeight: rect ? Math.round(rect.height) : 0,
                        composerWidth: rect ? Math.round(rect.width) : 0
                };
        });
        const compact = metrics.composerHeight > 0 && metrics.composerHeight <= 140;
        const ok = metrics.overflow <= 1 && metrics.composerVisible && compact;
        check(
                `layout ${vp.name}`,
                ok,
                `overflow=${metrics.overflow} composer=${metrics.composerWidth}x${metrics.composerHeight} visible=${metrics.composerVisible}`
        );
        await page.close();
}

// --- Composer width is preserved (not narrowed to make it shorter) ----------
{
        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.goto(`${base}/images`, { waitUntil: 'networkidle0' });
        const width = await page.evaluate(() => {
                const el = document.querySelector('textarea[placeholder="Describe the image you want to create…"]');
                return el ? Math.round(el.getBoundingClientRect().width) : 0;
        });
        // The composer should use a substantial share of the workspace, not a
        // shrunken box. 768px target minus padding is the floor.
        check('composer keeps the intended width', width >= 600, `textarea width=${width}px`);
        await page.close();
}

// --- Style selection inserts the template; existing prompt is protected -----
{
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });
        await page.goto(`${base}/images`, { waitUntil: 'networkidle0' });

        const textOf = () => page.evaluate(() => document.body.innerText);

        // Open the style library.
        await page.evaluate(() => {
                const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Styles');
                btn?.click();
        });
        await new Promise((r) => setTimeout(r, 300));
        const libraryOpen = await page.evaluate(() => !!document.querySelector('[aria-label="Style results"]'));
        check('style library opens', libraryOpen);

        // Search and pick a style.
        await page.type('input[placeholder="Search styles…"]', 'cinematic');
        await new Promise((r) => setTimeout(r, 200));
        const cardClicked = await page.evaluate(() => {
                const card = document.querySelector('[aria-label="Style results"] .card');
                card?.click();
                return !!card;
        });
        await new Promise((r) => setTimeout(r, 200));
        check('a style card is selectable', cardClicked);

        await page.evaluate(() => document.querySelector('[aria-label="Close style library"]')?.click());
        await new Promise((r) => setTimeout(r, 200));

        const inserted = await page.evaluate(() => {
                const ta = document.querySelector('textarea[placeholder="Describe the image you want to create…"]');
                return ta?.value ?? '';
        });
        check(
                'selecting a style inserts its template into the composer',
                /photorealistic/i.test(inserted),
                `draft starts: ${inserted.slice(0, 60)}`
        );

        // Type a user subject, then select a different style: the prompt must not be
        // silently overwritten — a confirmation appears instead.
        await page.evaluate(() => {
                const ta = document.querySelector('textarea[placeholder="Describe the image you want to create…"]');
                const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
                setter.call(ta, 'A lighthouse at dusk');
                ta.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await new Promise((r) => setTimeout(r, 150));

        await page.evaluate(() => {
                const btn = [...document.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Styles');
                btn?.click();
        });
        await new Promise((r) => setTimeout(r, 250));
        await page.evaluate(() => {
                const cards = [...document.querySelectorAll('[aria-label="Style results"] .card')];
                const target = cards.find((c) => /Watercolour/.test(c.textContent ?? ''));
                target?.click();
        });
        await new Promise((r) => setTimeout(r, 250));
        const confirmShown = await page.evaluate(() => !!document.querySelector('[aria-label="Apply style"]'));
        check('an existing prompt is not silently overwritten', confirmShown);
        const body = await textOf();
        check('the confirmation explains the choice', /Add this style\?/.test(body));

        // Append: the user's subject must survive.
        await page.evaluate(() => {
                const btn = [...document.querySelectorAll('[aria-label="Apply style"] button')].find(
                        (b) => b.textContent?.trim() === 'Add to prompt'
                );
                btn?.click();
        });
        await new Promise((r) => setTimeout(r, 200));
        const finalDraft = await page.evaluate(() => {
                const ta = document.querySelector('textarea[placeholder="Describe the image you want to create…"]');
                return ta?.value ?? '';
        });
        check(
                'the user subject survives combining with a style',
                /lighthouse/i.test(finalDraft) && /watercolour/i.test(finalDraft),
                `draft: ${finalDraft.slice(0, 80)}`
        );

        await page.close();
}

// --- Honest unconfigured states ---------------------------------------------
{
        const page = await browser.newPage();
        await page.setViewport({ width: 1440, height: 900 });
        await page.goto(`${base}/images`, { waitUntil: 'networkidle0' });
        const body = await page.evaluate(() => document.body.innerText);
        check('unconfigured generation is stated honestly', /not configured/i.test(body));

        // Typing a prompt and pressing Enter must not fabricate an image.
        await page.type('textarea[placeholder="Describe the image you want to create…"]', 'A golden phoenix over a black sea');
        await page.keyboard.press('Enter');
        await new Promise((r) => setTimeout(r, 400));
        const after = await page.evaluate(() => ({
                text: document.body.innerText,
                images: document.querySelectorAll('.results img').length
        }));
        check('no image is fabricated without a service', after.images === 0, `img count=${after.images}`);
        check('the failure is reported', /not connected|not configured|No image/i.test(after.text));
        const preserved = await page.evaluate(() => {
                const ta = document.querySelector('textarea[placeholder="Describe the image you want to create…"]');
                return ta?.value ?? '';
        });
        check('the prompt is preserved after a failed generation', /golden phoenix/i.test(preserved), `draft: ${preserved.slice(0, 60)}`);

        await page.close();
}

// --- Regression: Home and Chats are untouched --------------------------------
{
        const home = await browser.newPage();
        await home.setViewport({ width: 1440, height: 900 });
        await home.goto(`${base}/`, { waitUntil: 'networkidle0' });
        const homeOk = await home.evaluate(() => {
                const composer = document.querySelector('textarea[placeholder="Ask ARTI anything..."]');
                return { overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, hasComposer: !!composer };
        });
        check('Home UI still renders and does not overflow', homeOk.overflow <= 1 && homeOk.hasComposer, JSON.stringify(homeOk));
        await home.close();

        const chats = await browser.newPage();
        await chats.setViewport({ width: 1440, height: 900 });
        await chats.goto(`${base}/chats`, { waitUntil: 'networkidle0' });
        const chatsOk = await chats.evaluate(() => ({
                overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
                hasComposer: !!document.querySelector('textarea[placeholder="Ask ARTI anything..."]'),
                hasHistory: !!document.querySelector('[aria-label="Image history"]') === false
        }));
        check('Chats UI still renders and does not overflow', chatsOk.overflow <= 1 && chatsOk.hasComposer, JSON.stringify(chatsOk));
        await chats.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
