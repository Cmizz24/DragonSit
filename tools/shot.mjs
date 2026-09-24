// Usage: node tools/shot.mjs <url-path> <out.png> [width] [height]
import { extname, join } from 'path';
import { createRequire } from 'module';
import { execSync } from 'child_process';
const globalRoot = execSync('npm root -g').toString().trim();
const { chromium } = createRequire(import.meta.url)(join(globalRoot, 'playwright'));
import { createServer } from 'http';
import { readFile } from 'fs/promises';
const [,, path, out, w = '1200', h = '1600'] = process.argv;
const root = process.cwd();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  const p = decodeURIComponent(req.url.split('?')[0]);
  const file = join(root, p === '/' ? 'index.html' : p);
  try { const data = await readFile(file); res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream' }); res.end(data); }
  catch { res.writeHead(404); res.end('nf'); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1 });
page.on('console', (m) => console.log('[console]', m.type(), m.text()));
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${port}${path}`);
await page.waitForFunction(() => window.__done === true, null, { timeout: 15000 }).catch(() => console.log('no __done flag'));
await page.waitForTimeout(300);
await page.screenshot({ path: out, fullPage: true });
await browser.close();
server.close();
console.log('saved', out);
