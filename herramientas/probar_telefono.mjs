// Tres rondas de «lo veo igual» y la causa era esta: yo comprobaba todo a
// 1440 px y el sitio se mira en un movil. El fondo de las secciones claras,
// con «cover» sobre una caja de 390x1900, salia agrandado casi ocho veces y
// recortado por el centro: dos manchas azules donde tenia que haber un campo
// de placas. Invisible el trabajo entero, y en algun tramo peor que invisible.
//
// Esto mide el TELEFONO. No comprueba que quede bonito —eso no se mide—: mide
// lo unico que fallaba y que ninguna otra bateria miraba, que es que el fondo
// llegue a la pantalla pequena con su tamano de verdad y no como un borron.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, devices } from 'playwright';
const RAIZ = '/home/user/nerium';
const TIPO = {'.html':'text/html','.svg':'image/svg+xml','.css':'text/css','.woff2':'font/woff2',
  '.png':'image/png','.jpg':'image/jpeg','.js':'text/javascript','.json':'application/json','.ico':'image/x-icon'};
const srv = http.createServer((q, r) => {
  let p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, {'content-type': TIPO[path.extname(p)] || 'application/octet-stream'});
  r.end(fs.readFileSync(p));
}).listen(9133);
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
let ok = 0, mal = 0;
const di = (b, t) => { if (b) { ok++; console.log('  ok  ' + t) } else { mal++; console.log('  MAL ' + t) } };

const ctx = await nav.newContext({ ...devices['iPhone 13'], isMobile:true, hasTouch:true });
const pg = await ctx.newPage();
await pg.goto('http://127.0.0.1:9133/', { waitUntil:'load' });
await pg.waitForTimeout(2600);

const f = await pg.evaluate(() => {
  const s = document.querySelector('.secure'), c = getComputedStyle(s);
  const r = s.getBoundingClientRect();
  return { img:c.backgroundImage, size:c.backgroundSize, rep:c.backgroundRepeat,
           ancho:Math.round(r.width) };
});
/* Se lee el nombre que la banda PIDE, no uno fijado aqui: asi el resto de las
   comprobaciones miden el archivo que de verdad se sirve. Lo que se afirma es
   lo mismo de siempre: que el movil pide el VERTICAL y no el de escritorio. */
const arch = (f.img.match(/img\/([a-z0-9-]+\.(?:svg|webp|png|avif))/) || [, '?'])[1];
di(/^papel-alto/.test(arch),
   'el telefono pide el dibujo VERTICAL, no el de escritorio (' + arch + ')');
di(!/cover/.test(f.size),
   'y no lo estira con «cover», que es lo que lo convertia en un borron (' + f.size + ')');
di(/repeat-y/.test(f.rep), 'se repite hacia abajo en vez de estirarse: ' + f.rep);

/* Lo que de verdad importa no es que regla gane, sino el TAMANO al que acaban
   el dibujo en la pantalla. Esto se medía leyendo el alto del primer <rect>
   del archivo, y con el dibujo en curvas de nivel ya no hay rects: leia el
   rectangulo de la mascara —del alto entero— y daba 1.114 px.

   Se pasa a medir PIXELES, igual que en probar_pagina: se pinta el SVG solo y
   se cuenta TRAZO —pixeles que se separan de su vecino de dos filas mas
   arriba—. Lo que importa no es con que primitiva esta hecho el dibujo, sino
   cuanto dibujo hay y donde. */
/* La forma se le pregunta a la IMAGEN, no al archivo: el relieve se sirve
   rasterizado y ahi no hay «viewBox» que leer. */
const forma = await pg.evaluate(async (url) => {
  const im = new Image();
  await new Promise((ok, no) => { im.onload = ok; im.onerror = no; im.src = url });
  return { w: im.naturalWidth, h: im.naturalHeight };
}, 'http://127.0.0.1:9133/img/' + arch);
di(forma.h > forma.w, 'el dibujo del movil es mas alto que ancho, como la pantalla: ' +
   forma.w + 'x' + forma.h);

/* El hueco limpio del movil es la franja de ARRIBA —ahi va el titular—, no una
   esquina: en vertical el titular ocupa todo el ancho y no deja rincon libre. */
const tinta = await pg.evaluate(async (url) => {
  const im = new Image();
  await new Promise((ok, no) => { im.onload = ok; im.onerror = no; im.src = url });
  const c = document.createElement('canvas'); c.width = 390; c.height = 1114;
  const x = c.getContext('2d');
  x.fillStyle = '#EEF2F8'; x.fillRect(0, 0, c.width, c.height);
  x.drawImage(im, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  const L = i => (0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2]) / 255;
  const corte = c.height * 0.35;
  let arriba = 0, abajo = 0;
  for (let y = 2; y < c.height; y++) {
    for (let px = 0; px < c.width; px++) {
      const i = (y*c.width + px) * 4;
      if (Math.abs(L(i) - L(i - 2*c.width*4)) < 0.018) continue;
      if (y < corte) arriba++; else abajo++;
    }
  }
  return { arriba, abajo,
           dA: arriba/(c.width*corte), dB: abajo/(c.width*(c.height-corte)) };
}, 'http://127.0.0.1:9133/img/' + arch);
di(tinta.dA < tinta.dB * 0.5, 'y la franja de leer, despejada: ' +
   (tinta.dB ? (tinta.dA / tinta.dB).toFixed(2) : '—') + ' de trazo arriba por cada 1 abajo');
di(tinta.arriba + tinta.abajo > 12000,
   'con dibujo de verdad y no cuatro trazos: ' + (tinta.arriba + tinta.abajo) + ' px');

/* Nada se sale por el lado. Ojo con como se mide: la primera version miraba
   elemento por elemento si su borde derecho pasaba del ancho, y delataba el
   carrusel de nombres y el de prensa —que son mas anchos A PROPOSITO y viven
   dentro de una caja con overflow—. Eso no es un defecto, es como funciona un
   carrusel. Lo que hay que mirar es si el DOCUMENTO se puede arrastrar de
   lado, que es el sintoma que ve la persona. */
const lado = await pg.evaluate(() => {
  const d = document.documentElement;
  scrollTo(0, 0);
  const antes = scrollX;
  scrollTo(400, 0);
  const movido = scrollX - antes;
  scrollTo(0, 0);
  return { scrollW: d.scrollWidth, clientW: d.clientWidth, movido };
});
di(lado.scrollW <= lado.clientW + 2 && lado.movido === 0,
   'y la pagina no se arrastra de lado: ' + lado.scrollW + ' de ancho para ' +
   lado.clientW + ' de pantalla');

await ctx.close(); await nav.close(); srv.close();
console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
process.exit(mal ? 1 : 0);
