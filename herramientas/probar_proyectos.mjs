// probar_proyectos: «06 · What we are building» es oscura como el resto y
// sus tres proyectos flotan sobre un eje; al bajar se elige uno cada vez, y
// el indice lleva a cada uno.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ = '/home/user/nerium';
const T = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp','.jpg':'image/jpeg'};
const srv = http.createServer((q, r) => { let f = decodeURIComponent(q.url.split('?')[0]); if (f.endsWith('/')) f += 'index.html';
  const p = path.join(RAIZ, f); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end() }
  r.writeHead(200, {'content-type': T[path.extname(p)] || 'application/octet-stream'}); r.end(fs.readFileSync(p)) });
await new Promise(r => srv.listen(9055, r));
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
let ok = 0, mal = 0;
const di = (c, t) => { if (c) { ok++; console.log('  ok  ' + t) } else { mal++; console.log('  MAL ' + t) } };
for (const [W, H, mob] of [[1440, 900, 0], [1366, 657, 0], [430, 932, 1], [375, 667, 1]]) {
  const ctx = await nav.newContext({ viewport:{ width:W, height:H }, isMobile:!!mob, hasTouch:!!mob });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://127.0.0.1:9055/', { waitUntil:'load' }); await pg.waitForTimeout(1500);
  const en = p => pg.evaluate(async p => {
    const h = document.getElementById('pzHold'), t0 = h.getBoundingClientRect().top + scrollY;
    scrollTo(0, Math.round(t0 + p * (h.offsetHeight - innerHeight))); await new Promise(r => setTimeout(r, 1100));
    const on = [...document.querySelectorAll('#builds .pz-card')].findIndex(c => c.classList.contains('on'));
    const nodo = [...document.querySelectorAll('#builds .pz-nodo')].findIndex(n => n.getAttribute('aria-current') === 'true');
    const card = document.querySelector('#builds .pz-card.on .pz-flota').getBoundingClientRect();
    const tit = document.querySelector('#builds .builds-h').getBoundingClientRect();
    const ind = document.querySelector('#builds .pz-indice').getBoundingClientRect();
    return { on, nodo, card:[card.top, card.bottom, card.left, card.right].map(Math.round), tit:Math.round(tit.bottom), ind:Math.round(ind.top),
             fondo: getComputedStyle(document.getElementById('builds')).backgroundColor,
             claro: document.getElementById('builds').classList.contains('claro'), vw: innerWidth };
  }, p);
  const a = await en(0.10), b = await en(0.46), c = await en(0.86);
  const tag = W + 'x' + H + ' · ';
  di(!a.claro && /rgb\(0, 0, 0\)/.test(a.fondo), tag + 'la seccion es negra, la del globo de arriba (' + a.fondo + ')');
  di(a.on === 0 && b.on === 1 && c.on === 2, tag + 'al bajar se elige un proyecto cada vez (' + [a.on, b.on, c.on].join(' → ') + ')');
  di(a.nodo === 0 && b.nodo === 1 && c.nodo === 2, tag + 'y el indice marca el mismo');
  const cabe = [a, b, c].every(x => x.card[0] >= x.tit - 6 && x.card[1] <= x.ind + 6 && x.card[2] >= -2 && x.card[3] <= x.vw + 2);
  di(cabe, tag + 'la pieza elegida cabe entre el titulo y el indice, sin salirse (' + JSON.stringify(b.card) + ')');
  if (!mob) {
    await pg.evaluate(() => document.querySelectorAll('#builds .pz-nodo')[2].click()); await pg.waitForTimeout(1600);
    const tras = await pg.evaluate(() => [...document.querySelectorAll('#builds .pz-card')].findIndex(c => c.classList.contains('on')));
    di(tras === 2, tag + 'y pulsar un nodo del indice lleva a su proyecto');
  }
  di(errs.length === 0, tag + 'sin errores de pagina' + (errs.length ? ': ' + errs[0] : ''));
  await ctx.close();
}
await nav.close(); srv.close();
console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
process.exit(mal ? 1 : 0);
