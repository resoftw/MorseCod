// Manual verification script: drives the built app in system Edge and
// checks hydration, mode switching, TX playback visuals, and the keyer.
import { chromium } from 'playwright-core';

const BASE = 'http://localhost:4173';
const results = [];
const ok = (name, pass, extra = '') =>
	results.push(`${pass ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);

const browser = await chromium.launch({
	channel: 'msedge',
	headless: true,
	args: ['--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage({ viewport: { width: 480, height: 1000 } });
page.on('pageerror', (e) => results.push(`PAGEERROR ${e.message}`));
page.on('console', (m) => {
	if (m.type() === 'error') results.push(`CONSOLE ${m.text()}`);
});

// 1. TX mode loads and hydrates
await page.goto(`${BASE}/trainer?mode=tx`, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
ok('tx tab active', await page.locator('.tab.on .name').innerText() === 'TX');

// 2. TX playback: click Transmit, lamp lights, symbols animate
await page.getByRole('button', { name: /Transmit/i }).click();
let onAir = 0;
for (let i = 0; i < 30 && !onAir; i++) {
	onAir = await page.locator('.lamp.air.lit').count();
	await page.waitForTimeout(50);
}
ok('ON AIR lamp lit during playback', onAir === 1);
await page.waitForTimeout(300);
const litSyms = await page.locator('.sym.lit, .sym.played').count();
ok('symbols animating', litSyms > 0, `${litSyms} lit/played`);
await page.screenshot({ path: 'shot-tx-playing.png' });
await page.getByRole('button', { name: /Stop/i }).click();

// 3. mode param switches panels
for (const [m, marker] of [
	['rx', 'Send word'],
	['key', 'CLR'],
	['code', 'Tap a character']
]) {
	await page.goto(`${BASE}/trainer?mode=${m}`, { waitUntil: 'networkidle' });
	await page.waitForTimeout(500);
	const tab = await page.locator('.tab.on .name').innerText();
	const found = await page.getByText(marker, { exact: false }).count();
	ok(`?mode=${m} shows ${m.toUpperCase()} panel`, tab.toLowerCase() === m && found > 0);
	await page.screenshot({ path: `shot-${m}.png` });
}

// 4. RX challenge flow
await page.goto(`${BASE}/trainer?mode=rx`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Send word/i }).click();
await page.waitForTimeout(600);
ok('rx shows masked chars', (await page.locator('.char', { hasText: '?' }).count()) > 0);
await page.locator('input[type=text]').fill('zzz');
await page.getByRole('button', { name: /^Check$/i }).click();
await page.waitForTimeout(200);
ok('rx wrong answer reveals word', (await page.locator('.result .reveal').count()) === 1);
await page.screenshot({ path: 'shot-rx-answer.png' });

// 5. Keyer: tap key three short presses -> S
await page.goto(`${BASE}/trainer?mode=key`, { waitUntil: 'networkidle' });
const key = page.locator('.key');
for (let i = 0; i < 3; i++) {
	await key.dispatchEvent('pointerdown', { pointerId: 1 });
	await page.waitForTimeout(40);
	await key.dispatchEvent('pointerup', { pointerId: 1 });
	await page.waitForTimeout(60);
}
await page.waitForTimeout(600);
const decoded = await page.locator('.decoded').innerText();
ok('keyer decodes three dits as S', decoded.trim() === 'S', `got "${decoded}"`);
await page.screenshot({ path: 'shot-key.png' });

// 6. service worker registered
await page.goto(BASE, { waitUntil: 'networkidle' });
const swCount = await page.evaluate(async () => {
	const regs = await navigator.serviceWorker.getRegistrations();
	return regs.length;
});
ok('service worker registered', swCount >= 1, `${swCount} registration(s)`);

console.log(results.join('\n'));
await browser.close();

