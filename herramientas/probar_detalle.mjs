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
// pidio quitarlo y dejar solo un cambio de color, de cine: la pantalla se
// queda quieta, el rotulo de la ronda en el centro, y el azul sube desde
// abajo hasta ser el de la compra. Se comprueba lo que se VE: negro al
// entrar, azul al salir, el rotulo a la vista y la luz moviendose sola.
const ctx3 = await nav.newContext({ viewport:{width:1523,height:772} });
const w = await ctx3.newPage();
await w.goto('http://127.0.0.1:9017/', { waitUntil:'load' }); await w.waitForTimeout(2000);
const mira = (p) => w.evaluate(async (p) => {
  const sec = document.getElementById('alba'), st = sec.querySelector('.alba-stage');
  /* el recorrido del amanecer empieza cuando la seccion asoma por abajo */
  const top = sec.getBoundingClientRect().top + scrollY - innerHeight;
  scrollTo(0, Math.round(top + p * (sec.offsetHeight - st.offsetHeight + innerHeight)));
  await new Promise(s => setTimeout(s, 700));
  const a = +getComputedStyle(st).getPropertyValue('--a') || 0;
  const r = document.getElementById('stkRonda').getBoundingClientRect();
  return { a, ronda: r.width > 0 && r.top > 0 && r.bottom < innerHeight,
           texto: document.getElementById('stkRonda').textContent.replace(/\s+/g,' ').trim(),
           vivas: document.getAnimations().filter(x => x.playState === 'running' && x.effect && x.effect.target && x.effect.target.classList && x.effect.target.classList.contains('alba-aurora')).length };
}, p);
const sinTunel = await w.evaluate(() => ({ stack: getComputedStyle(document.getElementById('stack')).display,
  cubosCompra: [...document.querySelectorAll('#seed-round .sale-tunel, #seed-round .sale-field')].every(e => getComputedStyle(e).display === 'none') }));
di(sinTunel.stack === 'none' && sinTunel.cubosCompra, 'sin tunel de cubos ni cubos de fondo en la compra');
const e1 = await mira(0.30), e2 = await mira(0.97);
di(e1.a < 0.15, 'al entrar la pantalla es aun negra (' + e1.a.toFixed(2) + ' de azul)');
di(e2.a > 0.98, 'y al salir es el azul de la compra (' + e2.a.toFixed(2) + ')');
di(/Join the Seed Round/i.test(e2.texto) && /\d+%/.test(e2.texto), 'con el rotulo de la ronda: «' + e2.texto.slice(0, 60) + '»');
const e3 = await mira(0.48);
di(e3.ronda && e2.ronda, 'y el rotulo se ve entero en la pantalla mientras el azul sube y al final');
di(e3.a > 0.15 && e3.a < 0.95 && e3.vivas >= 2, 'a medio camino el azul va subiendo y la luz se mueve sola (' + e3.a.toFixed(2) + ', ' + e3.vivas + ' capas vivas)');
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
