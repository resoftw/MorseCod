// Drive the tap-key board: long, long, short, long  =>  T, M, G, Q then commit Q.
import { chromium } from 'playwright-core';

const browser = await chromium.launch({
	channel: 'msedge',
	headless: true,
	args: ['--autoplay-policy=no-user-gesture-required']
});
const page = await browser.newPage({ viewport: { width: 480, height: 1100 } });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.screenshot({ path: 'shot-tap-idle.png' });

const pad = page.locator('.pad');
const press = async (ms) => {
	await pad.dispatchEvent('pointerdown', { pointerId: 1 });
	await page.waitForTimeout(ms);
	await pad.dispatchEvent('pointerup', { pointerId: 1 });
};
const curLetter = async () => {
	return page.evaluate(() => document.querySelector('svg[data-current]')?.getAttribute('data-current') || null);
};

await press(400); // dah
await page.waitForTimeout(120);
console.log('after dah:', await curLetter()); // T
await press(400); // dah dah
await page.waitForTimeout(120);
console.log('after dah dah:', await curLetter()); // M
await press(60); // dah dah dit
await page.waitForTimeout(120);
console.log('after dah dah dit:', await curLetter()); // G
await press(400); // dah dah dit dah
await page.waitForTimeout(120);
console.log('after dah dah dit dah:', await curLetter()); // Q
await page.screenshot({ path: 'shot-tap-q.png' });
await page.waitForTimeout(900); // commit window passes
console.log('rx after commit:', JSON.stringify(await page.locator('.rx-text').innerText()));
await page.screenshot({ path: 'shot-tap-committed.png' });

// invalid: 5 dits has no letter -> resets, nothing committed
for (let i = 0; i < 5; i++) {
	await press(60);
	await page.waitForTimeout(90);
}
await page.waitForTimeout(900);
console.log('rx after junk (unchanged?):', JSON.stringify(await page.locator('.rx-text').innerText()));
await browser.close();
