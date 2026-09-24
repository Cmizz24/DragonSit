// Renders icons/icon.svg to the PNG sizes iOS and the manifest need.
import { extname, join } from 'path';
import { createRequire } from 'module';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
const globalRoot = execSync('npm root -g').toString().trim();
const { chromium } = createRequire(import.meta.url)(join(globalRoot, 'playwright'));
const svg = readFileSync('icons/icon.svg', 'utf8');
const browser = await chromium.launch();
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(`<html><body style="margin:0;background:#12284a">${svg.replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
  await page.screenshot({ path: `icons/${name}`, omitBackground: false });
  await page.close();
  console.log('wrote', name);
}
await browser.close();
