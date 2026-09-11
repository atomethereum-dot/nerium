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
di(/papel-alto\.svg/.test(f.img),
   'el telefono pide el dibujo VERTICAL, no el de escritorio (' +
   (/papel-alto/.test(f.img) ? 'papel-alto.svg' : /papel\.svg/.test(f.img) ? 'papel.svg — el ancho' : '?') + ')');
di(!/cover/.test(f.size),
   'y no lo estira con «cover», que es lo que lo convertia en un borron (' + f.size + ')');
di(/repeat-y/.test(f.rep), 'se repite hacia abajo en vez de estirarse: ' + f.rep);

/* Lo que de verdad importa no es que regla gane, sino el TAMANO al que acaban
   las placas en la pantalla. Una placa de 30 unidades en un dibujo de 420 de
   ancho, servido al ancho del movil, tiene que caer cerca de 28 px. Por debajo
   de 12 deja de leerse como placa y es ruido; por encima de 90 ya no es fondo,
   es una mancha. */
const svg = fs.readFileSync(path.join(RAIZ, 'img', 'papel-alto.svg'), 'utf8');
const vb = (svg.match(/viewBox="0 0 (\d+) (\d+)"/) || []).slice(1).map(Number);
const alto = +(svg.match(/<rect [^>]*height="(\d+)"/) || [])[1];
const enPantalla = alto * (f.ancho / vb[0]);
di(enPantalla > 12 && enPantalla < 90,
   'y cada placa cae a ' + enPantalla.toFixed(1) + ' px en pantalla, que es tamano de placa');
di(vb[1] > vb[0], 'el dibujo del movil es mas alto que ancho, como la pantalla: ' + vb.join('x'));

/* Y que no se quede sin nada: el hueco limpio del movil es la franja de
   ARRIBA —ahi va el titular—, no una esquina, porque en vertical el titular
   ocupa todo el ancho. */
const cajas = [...svg.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)"[^>]*opacity="([\d.]+)"/g)]
  .map(m => ({ y:+m[2], w:+m[3], h:+m[4], a:+m[5] })).filter(c => c.h > 1);
const tinta = f2 => cajas.filter(f2).reduce((s, c) => s + c.w * c.h * c.a, 0);
const corte = vb[1] * .35;
const dArriba = tinta(c => c.y < corte) / (vb[0] * corte);
const dAbajo = tinta(c => c.y >= corte) / (vb[0] * (vb[1] - corte));
di(dArriba < dAbajo * 0.5, 'y la franja de leer, despejada: ' +
   (dArriba / dAbajo).toFixed(2) + ' de tinta arriba por cada 1 abajo');
di(cajas.length > 60, 'con placas de verdad y no cuatro: ' + cajas.length);

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
