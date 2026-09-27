// probar_proyectos: «06 · What we are building» es negra, como el globo de
// arriba, y sus tres proyectos son un acordeon: al bajar se abre uno cada
// vez, lo abierto cabe entero en su panel, y pulsar una tira lleva a ese
// proyecto.
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
    const h = document.getElementById('acHold'), t0 = h.getBoundingClientRect().top + scrollY;
    scrollTo(0, Math.round(t0 + p * (h.offsetHeight - innerHeight))); await new Promise(r => setTimeout(r, 1400));
    const pns = [...document.querySelectorAll('#builds .ac-pn')];
    const on = pns.findIndex(c => c.classList.contains('on'));
    const pn = pns[on], caja = pn.getBoundingClientRect(), bajo = pn.querySelector('.ac-bajo').getBoundingClientRect();
    const cuerpo = pn.querySelector('.ac-cuerpo');
    const tit = document.querySelector('#builds .builds-h').getBoundingClientRect();
    const r4 = b => [b.top, b.bottom, b.left, b.right].map(Math.round);
    return { on, cuenta: document.getElementById('acCuenta').textContent.trim(),
             caja: r4(caja), bajo: r4(bajo), tit: Math.round(tit.bottom), vh: innerHeight, vw: innerWidth,
             visible: parseFloat(getComputedStyle(cuerpo).opacity),
             fondo: getComputedStyle(document.getElementById('builds')).backgroundColor,
             escala: getComputedStyle(document.getElementById('builds')).transform };
  }, p);
  const a = await en(0.10), b = await en(0.50), c = await en(0.86);
  const tag = W + 'x' + H + ' · ';
  di(/rgb\(0, 0, 0\)/.test(a.fondo), tag + 'la seccion es negra, la del globo de arriba (' + a.fondo + ')');
  di(b.escala === 'none', tag + 'no se hunde ni se vela mientras se elige (' + b.escala + ')');
  di(a.on === 0 && b.on === 1 && c.on === 2, tag + 'al bajar se abre un proyecto cada vez (' + [a.on, b.on, c.on].join(' → ') + ')');
  di(a.cuenta === '01 / 03' && b.cuenta === '02 / 03' && c.cuenta === '03 / 03', tag + 'y la cuenta dice el mismo');
  di([a, b, c].every(x => x.visible > .95), tag + 'lo abierto se ve entero, sin fundido a medias');
  const cabe = [a, b, c].every(x => x.caja[0] >= x.tit - 2 && x.caja[1] <= x.vh - 40 && x.caja[2] >= 0 && x.caja[3] <= x.vw &&
    x.bajo[0] >= x.caja[0] && x.bajo[1] <= x.caja[1] + 1 && x.bajo[2] >= x.caja[2] && x.bajo[3] <= x.caja[3] + 1);
  di(cabe, tag + 'el panel cabe bajo el titulo y su texto dentro del panel (' + JSON.stringify([b.caja, b.bajo]) + ')');
  if (!mob) {
    await pg.evaluate(() => document.querySelectorAll('#builds .ac-tira')[2].click()); await pg.waitForTimeout(1800);
    const tras = await pg.evaluate(() => [...document.querySelectorAll('#builds .ac-pn')].findIndex(c => c.classList.contains('on')));
    di(tras === 2, tag + 'y pulsar una tira lleva a su proyecto');
  }
  di(errs.length === 0, tag + 'sin errores de pagina' + (errs.length ? ': ' + errs[0] : ''));
  await ctx.close();
}
await nav.close(); srv.close();
console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
process.exit(mal ? 1 : 0);
