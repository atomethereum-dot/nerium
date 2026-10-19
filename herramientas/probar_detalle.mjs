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

// ── 7 · antes de la compra, sin tunel ni cubos: el paso de negro a azul ──
//
// The Stack era un campo de cubos que llevaba a la compra como un tunel. Se
// pidio quitarlo y dejar un cambio de color de cine, como los de Monad: es la
// PANTALLA entera la que pasa de negro a azul, no dos fondos que se tocan. Y
// despues, que Seguridad -la auditoria- se quede quieta en su negro y sea la
// pantalla del rotulo de la ronda la que cambie. Para que nunca se vea el
// borde entre las dos, el azul llega con Seguridad ya fuera de la pantalla y,
// subiendo, se va antes de que vuelva. Se comprueba lo que se VE.
const ctx3 = await nav.newContext({ viewport:{width:1523,height:772} });
const w = await ctx3.newPage();
await w.goto('http://127.0.0.1:9017/', { waitUntil:'load' }); await w.waitForTimeout(2000);
const mira = (id, f) => w.evaluate(async ([id, f]) => {
  const el = document.getElementById(id);
  /* lleva el punto f de la pieza al centro de la pantalla */
  scrollTo(0, Math.round(el.getBoundingClientRect().top + scrollY + el.offsetHeight * f - innerHeight / 2));
  await new Promise(s => setTimeout(s, 2300));
  const fondo = x => getComputedStyle(document.getElementById(x)).backgroundColor;
  const azul = c => { const m = c.match(/\d+/g).map(Number); return m[2] > 150 && m[2] > m[0] * 2 };
  const r = document.getElementById('stkRonda').getBoundingClientRect();
  return { azul: document.documentElement.classList.contains('tono-azul'),
           fondos: ['security', 'alba', 'seed-round', 'token'].map(fondo),
           pantalla: azul(fondo(id)),
           at: document.getElementById('alba').getBoundingClientRect().top / innerHeight,
           ronda: r.width > 0 && r.top > 0 && r.bottom < innerHeight,
           cifra: (document.getElementById('albaCifra') || {}).textContent,
           texto: document.getElementById('stkRonda').textContent.replace(/\s+/g,' ').trim(),
           vivas: document.getAnimations().filter(x => x.playState === 'running' && x.effect && x.effect.target && x.effect.target.classList && x.effect.target.classList.contains('alba-aurora')).length };
}, [id, f]);
const NEGRO = 'rgb(3, 4, 9)';
const sinTunel = await w.evaluate(() => ({ stack: getComputedStyle(document.getElementById('stack')).display,
  cubosCompra: [...document.querySelectorAll('#seed-round .sale-tunel, #seed-round .sale-field')].every(e => getComputedStyle(e).display === 'none') }));
di(sinTunel.stack === 'none' && sinTunel.cubosCompra, 'sin tunel de cubos ni cubos de fondo en la compra');
const e1 = await mira('security', 0.3);
di(!e1.azul && e1.fondos[0] === NEGRO, 'en Seguridad la pantalla es negra (' + e1.fondos[0] + ')');
const e1b = await mira('alba', 0.2);
di(!e1b.azul && e1b.fondos[0] === NEGRO && e1b.fondos[1] === NEGRO,
   'con Seguridad aun asomando arriba, todo sigue negro: no hay borde azul contra la auditoria (rotulo en y=' + (e1b.at * 100).toFixed(0) + ' %)');
const e2 = await mira('alba', 0.55);
di(e2.azul && e2.pantalla, 'con el rotulo llenando la pantalla, se vuelve azul (' + e2.fondos[1] + ')');
di(e2.fondos[0] === NEGRO, 'y Seguridad se queda quieta en su negro (' + e2.fondos[0] + ')');
di(new Set(e2.fondos.slice(1)).size === 1, 'la ronda, la compra y el token comparten el mismo azul: sin costura (' + [...new Set(e2.fondos.slice(1))].join(' / ') + ')');
di(/Join the Seed Round/i.test(e2.texto) && /complete/.test(e2.texto) && e2.ronda, 'con el rotulo de la ronda entero a la vista: «' + e2.texto.slice(0, 60) + '»');
di(e2.cifra === (await w.evaluate(() => document.getElementById('stkPct').textContent)), 'y la cifra grande se cuenta hasta la de la ronda (' + e2.cifra + ')');
di(e2.vivas >= 2, 'y la luz se mueve sola (' + e2.vivas + ' capas vivas)');
const e3 = await mira('seed-round', 0.4);
di(e3.azul && e3.pantalla, 'la compra sigue en el mismo azul');
/* p98 · LA JUNTA. Entre el rotulo y la compra va una cinta con los datos de la
   ronda que corre sola, montada sobre el borde -mitad en cada lado-, con una
   luz que se abre a los dos lados. Se mira que este encima del borde, que se
   mueva sola, y que a los dos lados de la cinta el azul sea el mismo: que no
   se vea costura. */
{
  const bt = await w.evaluate(async () => { const c = document.getElementById('seed-round');
    scrollTo(0, Math.round(c.getBoundingClientRect().top + scrollY - innerHeight / 2));
    await new Promise(s => setTimeout(s, 1800));
    return Math.round(c.getBoundingClientRect().top) });
  const j = await w.evaluate(async () => {
    const ci = document.querySelector('#junta .junta-cinta'), pi = document.querySelector('#junta .junta-pista');
    if (!ci || !pi) return null;
    const r = ci.getBoundingClientRect(), b = document.getElementById('seed-round').getBoundingClientRect().top;
    const x0 = new DOMMatrix(getComputedStyle(pi).transform).m41;
    await new Promise(s => setTimeout(s, 900));
    const x1 = new DOMMatrix(getComputedStyle(pi).transform).m41;
    return { encima: r.top < b - 12 && r.bottom > b + 12, ancho: r.width >= innerWidth - 2, corre: x1 < x0 - 4,
             texto: ci.textContent.replace(/\s+/g, ' ').trim().slice(0, 90) };
  });
  di(!!j && j.encima && j.ancho, 'entre el rotulo y la compra, la cinta va montada sobre el borde, de lado a lado');
  di(!!j && j.corre, 'y corre sola: «' + (j ? j.texto : '') + '…»');
  /* la costura se mira DEBAJO de la cinta: se esconde un momento y se
     comparan las filas justo encima y justo debajo del borde. Con las luces
     del rotulo cortadas en seco el salto era de 1,2 */
  await w.evaluate(() => { document.getElementById('junta').style.visibility = 'hidden' });
  await w.waitForTimeout(200);
  const png = (await w.screenshot({ clip:{ x:0, y:bt - 4, width:1523, height:8 } })).toString('base64');
  await w.evaluate(() => { document.getElementById('junta').style.visibility = '' });
  const lados = await w.evaluate(async (b64) => {
    const im = new Image(); await new Promise(r => { im.onload = r; im.src = 'data:image/png;base64,' + b64 });
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    /* por tramos de un octavo de ancho: un salto en un lado no se diluye en la media */
    const tramos = y => { const d = g.getImageData(0, y, c.width, 1).data, t = [];
      for (let k = 0; k < 8; k++) { let m = 0, n = 0;
        for (let x = Math.floor(c.width * k / 8); x < Math.floor(c.width * (k + 1) / 8); x++) { const i = x * 4; m += 0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2]; n++ }
        t.push(m / n) } return t };
    const ar = tramos(1), ab = tramos(6);
    return { peor: Math.max(...ar.map((v, k) => Math.max(v, ab[k]) / Math.min(v, ab[k]))), ar: ar.map(Math.round), ab: ab.map(Math.round) };
  }, png);
  const funde = await w.evaluate(() => { const l = document.querySelector('#alba .alba-luz');
    const m = l ? (getComputedStyle(l).maskImage || getComputedStyle(l).webkitMaskImage || '') : '';
    return /(transparent|rgba\(0, 0, 0, 0\))\)$/.test(m.trim()) });
  di(funde && lados.peor < 1.04, 'y debajo de la cinta el rotulo y la compra se juntan sin costura: las luces del rotulo se apagan antes del borde (peor salto ' + lados.peor.toFixed(3) + ')');
}
const e4 = await mira('token', 0.4);
di(!e4.azul && !e4.pantalla, 'y al llegar al token la pantalla vuelve a negro (' + e4.fondos[3] + ')');
const e5 = await mira('seed-round', 0.4);
di(e5.azul, 'subiendo, la compra vuelve a ser azul');
const e6 = await mira('alba', 1);
di(e6.azul && e6.cifra === e2.cifra, 'y el rotulo tambien, con la cifra contada otra vez (' + e6.cifra + ')');
const e7 = await mira('alba', 0.72);
di(!e7.azul && e7.fondos[1] === NEGRO && e7.at < 0,
   'y antes de que vuelva a asomar Seguridad, el azul ya se ha ido (rotulo en y=' + (e7.at * 100).toFixed(0) + ' %)');
await ctx3.close();

// con movimiento reducido la luz no deriva
const ctx4 = await nav.newContext({ viewport:{width:1523,height:772}, reducedMotion:'reduce' });
{
  const w2 = await ctx4.newPage();
  await w2.goto('http://127.0.0.1:9017/', { waitUntil:'load' }); await w2.waitForTimeout(1600);
  const n = await w2.evaluate(() => [...document.querySelectorAll('.alba-aurora')].filter(e => getComputedStyle(e).animationName !== 'none').length);
  di(n === 0, 'y con movimiento reducido, la luz quieta');
}
await ctx4.close();

console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
await nav.close(); srv.close();
process.exit(mal ? 1 : 0);
