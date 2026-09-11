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
/* El paso 17 cambia el tapiz por las placas: es el mismo motivo con otra
   composicion, asi que se comprueba el que la pagina esta usando DE VERDAD.
   Fijar aqui «tapiz.svg» seria medir un archivo que ya nadie pinta. */
const placas = /papel\.svg/.test(papel[0].img);
const tap = placas ? 'papel.svg' : 'tapiz.svg';
di(papel.every(p => p.img.includes(tap)),
   'y el campo de bloques, que es el fondo de verdad (' + tap + ')');
const svg = fs.readFileSync(path.join(RAIZ, 'img', tap), 'utf8');
/* En color, no en gris. Se miran los rellenos de las PLACAS, no todo el
   archivo: las luces llevan un blanco puro que es gris por definicion y no
   dice nada de si el dibujo tiene color. */
const tonos = [...svg.matchAll(/<rect[^>]*fill="rgb\((\d+),(\d+),(\d+)\)"/g)]
  .map(m => [+m[1], +m[2], +m[3]]);
di(tonos.length > 0 && tonos.every(c => Math.max(...c) - Math.min(...c) > 12),
   'dibujado en color, no en un gris cualquiera (' + tonos.length + ' placas)');
di((svg.match(/<rect /g) || []).length > 120,
   'y con bloques de verdad: ' + (svg.match(/<rect /g) || []).length);

/* El hueco limpio se mide donde el contenido esta DE VERDAD, y eso cambio con
   la composicion. El tapiz viejo apartaba los bloques del centro, pensando en
   texto centrado; las placas los apartan de ARRIBA A LA IZQUIERDA, que es el
   rincon del titular en las siete secciones. Se mide por unidad de area, que
   es la unica comparacion honesta cuando las dos zonas no miden igual. */
const W = 1600, H = 1000;
const cajas = [...svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"[^>]*opacity="([\d.]+)"/g)]
  .map(m => ({ x: +m[1], y: +m[2], w: +m[3], h: +m[4], a: +m[5] }))
  .filter(c => c.h > 1);                       // los filetes de 1 px no son bloque
const dentro = placas
  ? c => c.x + c.w / 2 < W * .42 && c.y + c.h / 2 < H * .40
  : c => { const cx = c.x + c.w / 2, cy = c.y + c.h / 2;
           return cx >= W * .32 && cx < W * .68 && cy >= H * .28 && cy < H * .72; };
const areaC = placas ? (W * .42) * (H * .40) : (W * .36) * (H * .44);
const tinta = f => cajas.filter(f).reduce((s, c) => s + c.w * c.h * c.a, 0);
const dC = tinta(dentro) / areaC, dR = tinta(c => !dentro(c)) / (W * H - areaC);
di(dC < dR * 0.5, 'y el rincon del titular despejado: ' +
   (dC / dR).toFixed(2) + ' de tinta dentro por cada 1 fuera');

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

// ── la escala tipografica ──
const tipo = await pg.evaluate(() => {
  const g = s => { const e = document.querySelector(s); if (!e) return null;
    const c = getComputedStyle(e), r = e.getBoundingClientRect();
    const sec = e.closest('section');
    return { px: Math.round(parseFloat(c.fontSize)),
             lineas: Math.round(r.height / parseFloat(c.lineHeight)),
             ancho: Math.round(r.width),
             seccion: sec ? Math.round(sec.getBoundingClientRect().width) : 0 }; };
  return { h1: g('.hero h1'), sec: g('.sec-h'), press: g('.press-h'),
           sale: g('.sale-h'), join: g('.join-h') };
});
const titulares = ['sec','press','sale','join'].map(k => tipo[k]).filter(Boolean);
di(tipo.h1 && tipo.h1.px >= 90,
   'con 1440 de ancho el titular de portada pide sitio: ' + (tipo.h1 || {}).px + 'px');
di(tipo.h1 && tipo.h1.lineas === 1, 'y cabe en un renglon');
di(titulares.every(t => t.px >= 70),
   'los titulares de seccion tambien: ' + titulares.map(t => t.px).join('/') + 'px');
/* El de «Security» estaba encerrado en una columna de 484 px teniendo 1360 de
   seccion, porque la caja llevaba la medida de LEER —56ch— y ahogaba al
   titular. La medida va en cada pieza, no en la caja. */
di(titulares.every(t => t.ancho > t.seccion * 0.45),
   'y ninguno encerrado en media columna: ' +
   titulares.map(t => Math.round(t.ancho / t.seccion * 100) + '%').join(' '));
di(titulares.every(t => t.lineas <= 3), 'ninguno se parte en mas de tres renglones');

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
