/**
 * Layout regression check for the Chats workspace.
 *
 * Drives the real dev server with headless Chromium and asserts, at each target
 * viewport, that the page does not overflow horizontally and that the core
 * composer controls remain visible. Run while a dev server is up:
 *
 *   node scripts/check-layout.mjs http://127.0.0.1:5173
 */

import puppeteer from 'puppeteer-core';

const base = process.argv[2] ?? 'http://127.0.0.1:5173';
const viewports = [
	{ name: 'desktop-1920', width: 1920, height: 1080 },
	{ name: 'laptop-1600', width: 1600, height: 900 },
	{ name: 'laptop-1440', width: 1440, height: 900 },
	{ name: 'laptop-1366', width: 1366, height: 768 },
	{ name: 'tablet-834', width: 834, height: 1112 },
	{ name: 'mobile-390', width: 390, height: 844 }
];

const browser = await puppeteer.launch({
	executablePath: '/usr/bin/chromium',
	headless: true,
	args: ['--no-sandbox', '--disable-dev-shm-usage']
});

let failed = false;

for (const vp of viewports) {
	const page = await browser.newPage();
	await page.setViewport({ width: vp.width, height: vp.height });
	await page.goto(`${base}/chats`, { waitUntil: 'networkidle0' });

	const metrics = await page.evaluate(() => {
		const doc = document.documentElement;
		const composer = document.querySelector('textarea[placeholder="Ask ARTI anything..."]');
		const rect = composer?.getBoundingClientRect();
		return {
			overflow: doc.scrollWidth - doc.clientWidth,
			composerVisible: !!rect && rect.width > 40 && rect.top < window.innerHeight
		};
	});

	const ok = metrics.overflow <= 1 && metrics.composerVisible;
	if (!ok) failed = true;
	console.log(
		`${ok ? 'PASS' : 'FAIL'} ${vp.name.padEnd(14)} overflow=${metrics.overflow}px composer=${metrics.composerVisible}`
	);
	await page.close();
}

await browser.close();
process.exit(failed ? 1 : 0);
