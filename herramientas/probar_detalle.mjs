// Como aparece cada cosa, y que no se quede nada sin aparecer.
//
// La comprobacion que importa es la tercera. Todo lo que se revela en esta
// pagina depende de que un IntersectionObserver vea al elemento CRUZAR el
// borde de la pantalla; si se llega de golpe —enlace directo, salto con la
// barra, cuadros perdidos— la clase no llega y la pieza se queda invisible
// para siempre. Antes de la red de seguridad, saltando a la seccion de
// seguridad quedaban 28 de 32 piezas sin aparecer.
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
}).listen(9017);
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
let ok = 0, mal = 0;
const di = (b, t) => { if (b) { ok++; console.log('  ok  ' + t); } else { mal++; console.log('  MAL ' + t); } };

const ctx = await nav.newContext({ viewport:{width:1440,height:900} });
const pg = await ctx.newPage();
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('http://127.0.0.1:9017/', { waitUntil:'load' });
await pg.waitForTimeout(2600);

// ── 1 · los titulares llevan mascara ──
const t = await pg.evaluate(() => {
  const hs = [...document.querySelectorAll('[data-tit]')];
  const oculto = hs.find(h => !h.classList.contains('vis'));
  return { n: hs.length, hero: !!document.querySelector('.hero [data-tit]'),
           tapado: oculto ? getComputedStyle(oculto).clipPath : null };
});
di(t.n >= 8, 'los titulares de seccion llevan su mascara (' + t.n + ')');
di(!t.hero, 'y el de la portada se queda fuera: ya tiene su propia entrada');
di(!t.tapado || /1\d\d%|108/.test(t.tapado) || /inset/.test(t.tapado),
   'de partida estan tapados: ' + (t.tapado || 'todos ya visibles'));

// ── 2 · la mascara se abre al llegar ──
await pg.evaluate(() => document.getElementById('security').scrollIntoView());
await pg.waitForTimeout(1700);
const abre = await pg.evaluate(() => {
  /* El de SEGURIDAD, no el primero que haya: desde que Garantias tiene su
     titular, «.sec-h» a secas devuelve el de la seccion anterior, que a esta
     altura de la pagina sigue —con razon— tapado. */
  const h = document.querySelector('#security .sec-h');
  return { vis: h.classList.contains('vis'), clip: getComputedStyle(h).clipPath };
});
di(abre.vis, 'al llegar a la seccion, el titular se descubre');
di(!/10[0-9]%/.test(abre.clip), 'y la mascara queda abierta: ' + abre.clip);

// ── 3 · la red de seguridad: nada se queda invisible ──
const alto = await pg.evaluate(() => document.body.scrollHeight);
let peor = 0, donde = 0;
for (let y = 0; y < alto - 900; y += 900) {
  await pg.evaluate(v => scrollTo(0, v), y);
  await pg.waitForTimeout(650);
  const n = await pg.evaluate(() => {
    const h = innerHeight;
    return [...document.querySelectorAll('.rv:not(.in), [data-tit]:not(.vis)')]
      .filter(e => { const r = e.getBoundingClientRect();
        return r.top < h * 0.8 && r.bottom > 40 && r.height > 4 }).length;
  });
  if (n > peor) { peor = n; donde = y; }
}
di(peor === 0, 'bajando de golpe la pagina entera, no queda ni una pieza ' +
   'invisible a la vista' + (peor ? ' (' + peor + ' en y=' + donde + ')' : ''));

// ── 4 · el paralaje se mueve, y no toca la maquetacion ──
await pg.evaluate(() => document.getElementById('press').scrollIntoView());
await pg.waitForTimeout(700);
const par = await pg.evaluate(async () => {
  /* el que este EN PANTALLA: el bucle solo toca lo que se ve, asi que
     preguntarle a uno que quedo tres secciones mas arriba no prueba nada */
  const e = [...document.querySelectorAll('[data-par]')].find(x => {
    const r = x.getBoundingClientRect();
    return r.top < innerHeight - 60 && r.bottom > 60;
  });
  if (!e) return null;
  const a = getComputedStyle(e).transform;
  const altoAntes = document.body.scrollHeight;
  scrollBy(0, 240);
  await new Promise(r => setTimeout(r, 500));
  return { a, b: getComputedStyle(e).transform, mismoAlto: document.body.scrollHeight === altoAntes };
});
di(par && par.a !== par.b, 'las cabeceras flotan con el desplazamiento');
di(par && par.mismoAlto, 'y la pagina no cambia de alto por ello: es transform, no maquetacion');

// ── 5 · el cursor de la casa sigue siendo el suyo ──
await pg.mouse.move(700, 400);
await pg.waitForTimeout(400);
const cur = await pg.evaluate(() => ({
  cuantos: document.querySelectorAll('[id="cur"]').length,
  lienzo: (document.getElementById('cur') || {}).tagName,
  on: document.body.classList.contains('cur-on') }));
di(cur.cuantos === 1, 'hay UN cursor, no dos: la pagina ya traia el suyo');
di(cur.lienzo === 'CANVAS' && cur.on, 'y es el de la casa, encendido');
di(errs.length === 0, 'sin errores de pagina' + (errs.length ? ': ' + errs[0] : ''));
await ctx.close();

// ── 6 · con el movimiento reducido, todo quieto y todo visible ──
const ctx2 = await nav.newContext({ viewport:{width:1440,height:900}, reducedMotion:'reduce' });
const q = await ctx2.newPage();
await q.goto('http://127.0.0.1:9017/', { waitUntil:'load' }); await q.waitForTimeout(2200);
const calma = await q.evaluate(() => {
  const e = document.querySelector('.rv');
  const c = getComputedStyle(e);
  return { op: c.opacity, clip: c.clipPath, tits: document.querySelectorAll('[data-tit]').length };
});
di(calma.op === '1', 'con el movimiento reducido nada nace invisible');
di(calma.clip === 'none', 'ni tapado por una mascara');
di(calma.tits === 0, 'y los titulares ni se marcan');
await ctx2.close();

// ── 7 · la marca de «the stack» se arma a tamano legible ──
//
// El tercer paso de la seccion arma las teselas en la marca de Nereum: el
// disco, el escalon de la derecha y los dos cuadros azules. La escena se
// dimensiona con la franja que queda entre la cabecera y el texto, asi que en
// una pantalla ANCHA Y BAJA -donde el texto sube- esa franja se estrecha y la
// marca encoge sola. Medido en 1523x772 salia a 84 px: con 18 teselas por
// lado eso son 4,7 px cada una, y a ese tamano el escalon y los cuadros no
// resuelven. Lo que se veia no era la marca, era un disco mordido. En el
// telefono salia a 210 px y se leia perfecta, que es la prueba de que el
// dibujo estaba bien y el tamano no.
//
// No se comprueba la formula, se comprueba el DIBUJO: se mide la caja de lo
// que el lienzo pinta de verdad. Asi la prueba sigue valiendo si manana la
// escena se dimensiona de otra manera.
//
// La historia del numero: con la copia sacada al margen izquierdo y metida
// en el flujo, la marca salia a 84 px; bajando la copia con un margen, a
// 165; devuelta la seccion a su estado CENTRADO -copia pegada al canto de
// abajo, que es como estaba y como se ha quedado- la franja es ancha y la
// marca sale a 315. El limite sube a 240: por debajo, alguien ha vuelto a
// ahogar la franja, que es justo lo que no puede repetirse.
const ctx3 = await nav.newContext({ viewport:{width:1523,height:772} });
const w = await ctx3.newPage();
await w.goto('http://127.0.0.1:9017/', { waitUntil:'load' }); await w.waitForTimeout(2400);
const marca = await w.evaluate(async () => {
  const sec = document.querySelector('.stack');
  const r = sec.getBoundingClientRect();
  scrollTo(0, Math.round(r.top + scrollY + 0.80 * (r.height - innerHeight)));
  await new Promise(s => setTimeout(s, 900));
  const cv = document.getElementById('stkCv');
  const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
  c.getContext('2d').drawImage(cv, 0, 0);
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let y0 = 1e9, y1 = -1, x0 = 1e9, x1 = -1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const i = (y * c.width + x) * 4;
    // solo tesela, no el halo: el resplandor de fondo es tenue y translucido
    if (d[i+3] < 150) continue;
    const L = (0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2]) / 255;
    if (L < 0.30) continue;
    if (y < y0) y0 = y; if (y > y1) y1 = y;
    if (x < x0) x0 = x; if (x > x1) x1 = x;
  }
  const esc = c.height / cv.getBoundingClientRect().height;
  return { alto: y1 < 0 ? 0 : Math.round((y1 - y0 + 1) / esc),
           ancho: x1 < 0 ? 0 : Math.round((x1 - x0 + 1) / esc) };
});
di(marca.alto >= 240, 'en 1523x772 la marca del tercer paso se arma a tamano legible (' +
   marca.alto + ' px de alto, limite 240)');
di(marca.ancho >= 240, 'y no es un hilo: tambien tiene cuerpo a lo ancho (' +
   marca.ancho + ' px)');
await ctx3.close();

console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
await nav.close(); srv.close();
process.exit(mal ? 1 : 0);
