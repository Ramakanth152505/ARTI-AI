/**
 * Interaction smoke check for the Chats workspace (real browser, real storage).
 *
 * Covers the behaviours that are hard to assert from unit tests: search empty
 * state, pin persistence, and the context-panel toggle. Run while a dev server
 * is up:  node scripts/check-interactions.mjs http://127.0.0.1:5173
 */

import puppeteer from 'puppeteer-core';

const base = process.argv[2] ?? 'http://127.0.0.1:5173';
const browser = await puppeteer.launch({
	executablePath: '/usr/bin/chromium',
	headless: true,
	args: ['--no-sandbox', '--disable-dev-shm-usage']
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const results = [];
const check = (name, ok, detail = '') => {
	results.push({ name, ok, detail });
	console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const text = () => page.evaluate(() => document.body.innerText);
const clickByText = async (selector, label) => {
	const handle = await page.evaluateHandle(
		(sel, lbl) => [...document.querySelectorAll(sel)].find((el) => el.textContent?.trim() === lbl),
		selector,
		label
	);
	const el = handle.asElement();
	if (!el) throw new Error(`no ${selector} with text "${label}"`);
	await el.click();
	return true;
};

await page.goto(`${base}/chats`, { waitUntil: 'networkidle0' });
// Seed a conversation through the UI so search/pin have real data.
await page.type('textarea[placeholder="Ask ARTI anything..."]', 'Layout reference notes');
await page.keyboard.press('Enter');
await new Promise((r) => setTimeout(r, 400));

// --- Search: matching query narrows the list, non-matching shows an empty state
await page.type('input[placeholder="Search conversations"]', 'reference');
await new Promise((r) => setTimeout(r, 250));
check('search matches a conversation', (await text()).includes('Layout reference notes'));

await page.evaluate(() => {
	const input = document.querySelector('input[placeholder="Search conversations"]');
	const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
	setter.call(input, 'zzzznomatch');
	input.dispatchEvent(new Event('input', { bubbles: true }));
});
await new Promise((r) => setTimeout(r, 250));
const emptySearch = await text();
check(
	'search shows an empty-results state',
	/no conversations match/i.test(emptySearch),
	emptySearch.match(/No conversations match[^\n]*/)?.[0]?.trim() ?? 'no empty-state text'
);

// Clear the query again.
await page.evaluate(() => {
	const input = document.querySelector('input[placeholder="Search conversations"]');
	const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
	setter.call(input, '');
	input.dispatchEvent(new Event('input', { bubbles: true }));
});
await new Promise((r) => setTimeout(r, 200));

// --- Context panel toggle (exact aria-labels used by ChatHeader)
const panelWasOpen = await page.evaluate(() =>
	!!document.querySelector('.context') && !document.querySelector('.context')?.classList.contains('hidden')
);
await page.evaluate(() => document.querySelector('button[aria-label="Open context panel"]')?.click());
await new Promise((r) => setTimeout(r, 300));
const panelNowOpen = await page.evaluate(() => ({
	closeBtn: !!document.querySelector('button[aria-label="Close context panel"]'),
	visible: !!document.querySelector('.context') && !document.querySelector('.context')?.classList.contains('hidden')
}));
check(
	'context panel opens',
	panelNowOpen.closeBtn && panelNowOpen.visible,
	`before=${panelWasOpen} closeBtn=${panelNowOpen.closeBtn}`
);
const panelBody = await page.evaluate(() => document.querySelector('.context')?.innerText ?? '');
check(
	'context panel shows conversation sections',
	/Conversation/i.test(panelBody) && /Files/i.test(panelBody) && /Sources/i.test(panelBody)
);

// --- Pin via the conversation overflow menu, then confirm it persisted
await page.evaluate(() => document.querySelector('button[aria-label="Conversation options"]')?.click());
await new Promise((r) => setTimeout(r, 250));
const pinClicked = await clickByText('button', 'Pin to top').catch(() => false);
await new Promise((r) => setTimeout(r, 300));
await page.reload({ waitUntil: 'networkidle0' });
// Local storage is read after hydration, so wait for the sidebar to render the
// pinned conversation rather than sampling the DOM immediately.
await page
	.waitForFunction(() => document.body.innerText.includes('Layout reference notes'), { timeout: 5000 })
	.catch(() => {});
const afterReload = await text();
check('pin action is available in the overflow menu', pinClicked);
check(
	'pinned section survives reload',
	/Pinned/i.test(afterReload),
	afterReload.match(/(Pinned|Recent|Nothing unfiled)[^\n]*/gi)?.join(' | ') ?? 'no group headings after reload'
);

await browser.close();
const failed = results.filter((r) => !r.ok);
process.exit(failed.length ? 1 : 0);
