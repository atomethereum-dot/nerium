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
  const h = document.querySelector('#security h2');
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

// ── 7 · «the stack» es un campo de cubos vivo, como el video ──
//
// La seccion era un muro de cubos que se juntaba en el rombo de la marca y
// lo hacia girar. Se pidio como el video de referencia: un campo DISPERSO de
// cubos sueltos, cada uno girando sobre su eje, con la camara avanzando
// entre ellos, y con nuestros colores. Se comprueba el DIBUJO, no la formula:
// se lee lo que el lienzo pinta de verdad.
const ctx3 = await nav.newContext({ viewport:{width:1523,height:772} });
const w = await ctx3.newPage();
await w.goto('http://127.0.0.1:9017/', { waitUntil:'load' }); await w.waitForTimeout(2400);
const lee = (p, espera) => w.evaluate(async ({p, espera}) => {
  const sec = document.querySelector('.stack');
  const r = sec.getBoundingClientRect();
  scrollTo(0, Math.round(r.top + scrollY + p * (r.height - innerHeight)));
  await new Promise(s => setTimeout(s, espera));
  const cv = document.getElementById('stkCv');
  // se lee a un cuarto de resolucion: sobra para contar manchas y colores
  const c = document.createElement('canvas'); c.width = cv.width >> 2; c.height = cv.height >> 2;
  const g = c.getContext('2d'); g.drawImage(cv, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  // solo la franja de arriba: la de abajo la oscurece a proposito el texto
  const alto = Math.round(c.height * 0.6);
  let pintado = 0, azul = 0, claro = 0; const firma = [];
  const marca = new Uint8Array(c.width * alto);
  for (let y = 0; y < alto; y++) for (let x = 0; x < c.width; x++) {
    const i = (y * c.width + x) * 4, a = d[i+3];
    /* el lienzo pinta su propio fondo -#0A0D14-: cuenta lo que se aparta de el */
    if (a < 60 || Math.abs(d[i] - 10) + Math.abs(d[i+1] - 13) + Math.abs(d[i+2] - 20) < 30) continue;
    pintado++; marca[y * c.width + x] = 1;
    const R = d[i], G = d[i+1], B = d[i+2];
    if (B > 150 && B > R * 1.6 && B > G * 1.2) azul++;
    if (R > 150 && G > 150 && B > 150) claro++;
  }
  for (let k = 0; k < d.length; k += 4 * 97) firma.push(d[k] + d[k+1] + d[k+2] + d[k+3]);
  // cuantas manchas separadas: relleno por inundacion sobre la mascara
  let manchas = 0; const pila = [];
  for (let q = 0; q < marca.length; q++) {
    if (marca[q] !== 1) continue;
    manchas++; marca[q] = 2; pila.push(q);
    while (pila.length) { const e = pila.pop(), ex = e % c.width;
      for (const v of [e - 1, e + 1, e - c.width, e + c.width]) {
        if (v < 0 || v >= marca.length) continue;
        if ((v === e - 1 && ex === 0) || (v === e + 1 && ex === c.width - 1)) continue;
        if (marca[v] === 1) { marca[v] = 2; pila.push(v) } } }
  }
  return { cubre: pintado / (c.width * alto), azul, claro, manchas, firma };
}, {p, espera});
const dif = (a, b) => a.firma.reduce((s, v, i) => s + (v !== b.firma[i] ? 1 : 0), 0) / a.firma.length;

const f1 = await lee(0.30, 900);
di(f1.manchas >= 25, 'el campo son muchos cubos sueltos (' + f1.manchas + ' manchas)');
di(f1.cubre < 0.45, 'y disperso, no un muro: cubre el ' + Math.round(f1.cubre * 100) + ' % (tope 45)');
di(f1.azul > 40 && f1.claro > 20, 'con nuestros azules y la plata (' + f1.azul + ' px azules, ' + f1.claro + ' claros)');
const f2 = await lee(0.30, 700);
di(dif(f1, f2) > 0.02, 'y esta VIVO: sin tocar el scroll, los cubos giran y la camara avanza (' +
   Math.round(dif(f1, f2) * 100) + ' % cambia)');
const f3 = await lee(0.70, 900);
di(dif(f2, f3) > 0.05, 'y al bajar, la camara entra en el campo (' + Math.round(dif(f2, f3) * 100) + ' % cambia)');
await ctx3.close();

// con movimiento reducido el campo se queda quieto si nadie baja
const ctx4 = await nav.newContext({ viewport:{width:1523,height:772}, reducedMotion:'reduce' });
{
  const w2 = await ctx4.newPage();
  await w2.goto('http://127.0.0.1:9017/', { waitUntil:'load' }); await w2.waitForTimeout(1600);
  const foto = () => w2.evaluate(async () => {
    const sec = document.querySelector('.stack'); const r = sec.getBoundingClientRect();
    scrollTo(0, Math.round(r.top + scrollY + 0.4 * (r.height - innerHeight)));
    await new Promise(s => setTimeout(s, 800));
    return document.getElementById('stkCv').toDataURL().length + ':' + document.getElementById('stkCv').toDataURL().slice(-400);
  });
  const q1 = await foto(), q2 = await foto();
  di(q1 === q2, 'y con movimiento reducido, quieto mientras nadie baja');
}
await ctx4.close();

console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
await nav.close(); srv.close();
process.exit(mal ? 1 : 0);
