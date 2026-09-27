// probar_proyectos: «06 · What we are building» es negra, como el globo de
// arriba, y sus tres proyectos se escriben en particulas: al bajar se forma un
// nombre cada vez, su ficha se ve entera sobre la barra de abajo, y el indice
// lleva a cada uno.
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
    const h = document.getElementById('ptHold'), t0 = h.getBoundingClientRect().top + scrollY;
    scrollTo(0, Math.round(t0 + p * (h.offsetHeight - innerHeight))); await new Promise(r => setTimeout(r, 1600));
    const idx = s => [...document.querySelectorAll(s)].findIndex(c => c.classList.contains('on'));
    const info = document.querySelector('#builds .pt-info.on'), r = info.getBoundingClientRect();
    const tit = document.querySelector('#builds .builds-h').getBoundingClientRect();
    return { boton: idx('#builds .pt-idx button'), ficha: idx('#builds .pt-info'), nombre: idx('#builds .pt-nom'),
             caja: [r.top, r.bottom, r.left, r.right].map(Math.round), tit: Math.round(tit.bottom), vh: innerHeight, vw: innerWidth,
             visible: parseFloat(getComputedStyle(info).opacity),
             fondo: getComputedStyle(document.getElementById('builds')).backgroundColor,
             escala: getComputedStyle(document.getElementById('builds')).transform };
  }, p);
  const a = await en(0.10), b = await en(0.50), c = await en(0.90);
  const tag = W + 'x' + H + ' · ';
  di(/rgb\(0, 0, 0\)/.test(a.fondo), tag + 'la seccion es negra, la del globo de arriba (' + a.fondo + ')');
  di(b.escala === 'none', tag + 'no se hunde ni se vela mientras se elige (' + b.escala + ')');
  di(a.boton === 0 && b.boton === 1 && c.boton === 2, tag + 'al bajar se forma un proyecto cada vez (' + [a.boton, b.boton, c.boton].join(' → ') + ')');
  di([a, b, c].every((x, i) => x.ficha === i && x.nombre === i), tag + 'y su ficha y su nombre son los del mismo');
  di([a, b, c].every(x => x.visible > .95), tag + 'la ficha se ve entera, sin fundido a medias');
  const cabe = [a, b, c].every(x => x.caja[0] > x.tit && x.caja[1] <= x.vh - 60 && x.caja[2] >= 0 && x.caja[3] <= x.vw);
  di(cabe, tag + 'la ficha cabe bajo el titulo y sobre la barra de abajo (' + JSON.stringify(b.caja) + ')');
  if (!mob) {
    await pg.evaluate(() => document.querySelectorAll('#builds .pt-idx button')[2].click()); await pg.waitForTimeout(1800);
    const tras = await pg.evaluate(() => [...document.querySelectorAll('#builds .pt-idx button')].findIndex(c => c.classList.contains('on')));
    di(tras === 2, tag + 'y pulsar el indice lleva a su proyecto');
  }
  di(errs.length === 0, tag + 'sin errores de pagina' + (errs.length ? ': ' + errs[0] : ''));
  await ctx.close();
}
await nav.close(); srv.close();
console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
process.exit(mal ? 1 : 0);
