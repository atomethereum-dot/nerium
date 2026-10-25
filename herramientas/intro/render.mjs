// La intro de la portada (p102) se renderiza aqui, cuadro a cuadro, en un
// Chromium sin pantalla: escena.js es la escena 3D (three.js) y window.frame(t)
// devuelve el cuadro del segundo t. Despues, codifica.sh hace los videos de img/.
//   npm install --no-save three@0.170.0     (una vez, en la raiz del repo)
//   node render.mjs --w 1920 --h 1080 --out fin-h     (horizontal, ~40 min)
//   node render.mjs --w 1080 --h 1920 --out fin-v     (vertical)
//   ./codifica.sh
// Para probar sin esperar: --t 0.5,3.3,6.4 (solo esos tiempos), --n 2 (menos
// submuestras de desenfoque) y un tamano pequeno (--w 960 --h 540).
import { chromium } from '/home/user/nerium/node_modules/playwright/index.mjs';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const A = Object.fromEntries(process.argv.slice(2).join(' ').split('--').filter(Boolean).map(s => { const [k, ...v] = s.trim().split(' '); return [k, v.join(' ')] }));
const W = +A.w || 1920, H = +A.h || 1080, FPS = +A.fps || 60, OUT = A.out || 'out', N = +A.n || 8;
const RAIZ = path.dirname(new URL(import.meta.url).pathname);
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.woff2': 'font/woff2' };
const REPO = path.join(RAIZ, '..', '..');
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  const p = /^\/(assets|node_modules)\//.test(u) ? path.join(REPO, u) : path.join(RAIZ, u);
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end() }
  r.writeHead(200, { 'content-type': TIPOS[path.extname(p)] || 'application/octet-stream' }); r.end(fs.readFileSync(p)) });
await new Promise(r => srv.listen(0, r));
const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await nav.newPage({ viewport: { width: W, height: H } });
pg.on('console', m => console.log('[pag]', m.text())); pg.on('pageerror', e => console.log('[ERROR]', e.message));
await pg.goto(`http://127.0.0.1:${srv.address().port}/index.html?w=${W}&h=${H}&fps=${FPS}&n=${N}`);
await pg.waitForFunction(() => window.listo === true, null, { timeout: 120000 });
fs.mkdirSync(OUT, { recursive: true });
let tiempos;
if (A.t) tiempos = A.t.split(',').map(Number);
else { const d = +(A.desde || 0), h = +(A.hasta || await pg.evaluate(() => window.T.fin)); tiempos = []; for (let f = Math.round(d * FPS); f / FPS < h - 1e-9; f++) tiempos.push(f / FPS) }
const t0 = Date.now();
for (let i = 0; i < tiempos.length; i++) {
  const t = tiempos[i];
  const url = await pg.evaluate(t => window.frame(t), t);
  const nombre = A.t ? `t${t.toFixed(2)}.png` : `f${String(Math.round(t * FPS)).padStart(4, '0')}.png`;
  fs.writeFileSync(path.join(OUT, nombre), Buffer.from(url.split(',')[1], 'base64'));
  if (i % 20 === 0 || A.t) console.log(`${i + 1}/${tiempos.length} t=${t.toFixed(3)} ${((Date.now() - t0) / (i + 1) / 1000).toFixed(2)}s/cuadro`);
}
await nav.close(); srv.close();
