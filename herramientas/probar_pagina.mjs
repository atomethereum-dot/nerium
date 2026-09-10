// Que la pagina no vuelva a verse blanca y vacia.
//
// Las tres cosas que se arreglaron, medidas y no a ojo:
//  · el papel: ninguna seccion clara puede volver a ser un color plano.
//  · «Compatible with»: era una pantalla de blanco con nombres en gris.
//  · las cuatro garantias: decian QUE hacen y nunca por que importan.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const RAIZ = '/home/user/nerium';
const TIPO = {'.html':'text/html','.svg':'image/svg+xml','.css':'text/css','.woff2':'font/woff2',
  '.png':'image/png','.jpg':'image/jpeg','.js':'text/javascript','.json':'application/json'};
const srv = http.createServer((q, r) => {
  let p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, {'content-type': TIPO[path.extname(p)] || 'application/octet-stream'});
  r.end(fs.readFileSync(p));
}).listen(9007);
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
let ok = 0, mal = 0;
const di = (b, t) => { if (b) { ok++; console.log('  ok  ' + t); } else { mal++; console.log('  MAL ' + t); } };

const ctx = await nav.newContext({ viewport:{width:1440,height:950}, deviceScaleFactor:1 });
const pg = await ctx.newPage();
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('http://127.0.0.1:9007/', { waitUntil:'load' });
await pg.waitForTimeout(2600);

// ── el papel ──
const papel = await pg.evaluate(() => ['.paper', '.paper2', '.secure', '.sale', '.tkp', '.join', '.press']
  .map(s => { const e = document.querySelector(s); if (!e) return null;
    const c = getComputedStyle(e);
    return { sel: s, img: c.backgroundImage, capas: c.backgroundImage.split(/,(?![^()]*\))/).length }; })
  .filter(Boolean));
di(papel.length >= 6, 'estan las secciones claras (' + papel.length + ')');
di(papel.every(p => p.img !== 'none'),
   'ninguna es ya un color plano: todas llevan luz encima');
di(papel.every(p => /feTurbulence/.test(p.img)),
   'y todas llevan el grano, que es lo que quita el blanco de plantilla');
di(papel.every(p => /rgba\(47, ?107, ?255/.test(p.img)),
   'la luz es del azul de la casa, no un gris cualquiera');

// ── «Compatible with» ──
const comp = await pg.evaluate(() => {
  const sub = document.querySelector('.lane-sub');
  const chips = [...document.querySelectorAll('.lane-in span')];
  const puntos = chips.map(c => getComputedStyle(c, '::before').backgroundColor);
  const uno = chips[0] ? getComputedStyle(chips[0]) : null;
  return { sub: sub ? sub.textContent.trim().length : 0, n: chips.length,
           borde: uno && uno.borderTopWidth, radio: uno && parseFloat(uno.borderRadius),
           fondo: uno && uno.backgroundColor, colores: new Set(puntos).size, puntos: puntos.slice(0,7) };
});
di(comp.sub > 40, 'la seccion dice ya para que sirve (' + comp.sub + ' caracteres)');
di(comp.n >= 14, 'siguen las ' + comp.n + ' fichas de la fila');
di(parseFloat(comp.borde) >= 1 && comp.radio >= 8,
   'cada nombre va en su ficha, con filete y esquinas (' + comp.borde + ' / ' + comp.radio + 'px)');
di(comp.colores >= 5, 'y con el color de su marca: ' + comp.colores + ' colores distintos');

// ── las cuatro garantias ──
const filas = await pg.evaluate(() => [...document.querySelectorAll('.rows li')].map(li => ({
  titulo: li.querySelector('b') ? li.querySelector('b').textContent.trim() : '',
  linea: li.querySelector('.rd') ? li.querySelector('.rd').textContent.trim() : '',
  hueco: Math.round(li.getBoundingClientRect().width -
    [...li.children].reduce((s, c) => s + c.getBoundingClientRect().width, 0)) })));
di(filas.length === 4, 'las cuatro garantias siguen ahi');
di(filas.every(f => f.linea.length > 20),
   'y cada una dice por que importa: ' + filas.map(f => '«' + f.linea.slice(0, 26) + '…»').join(' '));

// ── los doce idiomas ──
const dic = await pg.evaluate(() => JSON.parse(document.getElementById('i18n').textContent));
for (const k of filas.map(f => f.linea)) {
  di(Object.values(dic).every(d => d[k]), 'traducida en los doce: «' + k.slice(0, 30) + '…»');
}
const sub = await pg.evaluate(() => document.querySelector('.lane-sub').textContent.trim());
di(Object.values(dic).every(d => d[sub]), 'y la frase de «Compatible with» tambien');

di(errs.length === 0, 'sin errores de pagina' + (errs.length ? ': ' + errs[0] : ''));
await ctx.close();

// ── el telefono ──
const ctx2 = await nav.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
const mo = await ctx2.newPage();
const errs2 = []; mo.on('pageerror', e => errs2.push(e.message));
await mo.goto('http://127.0.0.1:9007/', { waitUntil:'load' }); await mo.waitForTimeout(2500);
di((await mo.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) === 0,
   'en el telefono no se sale nada por el lado');
di(await mo.evaluate(() => {
  const li = document.querySelector('.rows li');
  if (!li) return false;
  const b = li.querySelector('b').getBoundingClientRect();
  const d = li.querySelector('.rd').getBoundingClientRect();
  return d.top >= b.bottom - 2;            // en el telefono, la linea va DEBAJO
}), 'y ahi la explicacion se pone debajo del titulo, no a su lado');
di(errs2.length === 0, 'sin errores en el telefono' + (errs2.length ? ': ' + errs2[0] : ''));
await ctx2.close();

console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
await nav.close(); srv.close();
process.exit(mal ? 1 : 0);
