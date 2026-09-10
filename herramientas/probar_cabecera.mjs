// La cabecera nueva: el aviso de la ronda y el menu del centro con fichas.
//
// Lo que vigila de verdad:
//  · que el porcentaje del aviso salga del MISMO sitio que la barra de
//    recaudacion. Escrito aparte se quedaria clavado el dia que la ronda
//    avance, y una portada de venta que se contradice a si misma es peor
//    que no decir nada.
//  · que ninguna entrada del menu lleve a una seccion oculta.
//  · que estando en la portada no haya nada subrayado: el observador solo
//    avisa cuando algo CRUZA la mitad de la pantalla, y la portada no cruza.
import { chromium } from 'playwright';
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
const URL = 'file:///home/user/nerium/index.html';
let ok = 0, mal = 0;
const di = (b, t) => { if (b) { ok++; console.log('  ok  ' + t); } else { mal++; console.log('  MAL ' + t); } };

const ctx = await nav.newContext({ viewport:{width:1440,height:900} });
const pg = await ctx.newPage();
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(URL, { waitUntil:'load' });
await pg.waitForTimeout(2600);

// ── el aviso ──
const av = await pg.evaluate(() => {
  const a = document.querySelector('.ann');
  const f = document.getElementById('annFill');
  return a ? { alto: Math.round(a.getBoundingClientRect().height),
               txt: document.querySelector('.ann-in').innerText.replace(/\s+/g,' ').trim(),
               pct: document.getElementById('annPct').textContent,
               fill: f && f.style.width,
               destino: document.querySelector('.ann-in').getAttribute('href') } : null;
});
di(av && av.alto > 20, 'el aviso se ve arriba del todo');
di(av && /Seed Round/.test(av.txt), 'dice de que ronda habla');
di(av && /8[0-9]%|9[0-9]%|100%/.test(av.pct), 'lleva el porcentaje: ' + (av && av.pct));
di(av && av.destino === '#presale', 'y lleva a la ronda al pulsarlo');

// El aviso y la barra de recaudacion tienen que decir lo mismo.
const par = await pg.evaluate(() => {
  const g = document.querySelector('#saleTip em');
  return { aviso: parseFloat(document.getElementById('annPct').textContent),
           barra: g ? parseFloat(g.textContent) : null };
});
di(par.barra !== null, 'la barra de recaudacion tiene su cifra');
di(par.barra !== null && Math.abs(par.aviso - par.barra) < 1,
   `aviso ${par.aviso}% y barra ${par.barra}%: la misma cifra`);

// la linea de progreso dibuja esa misma cifra
di(av && Math.abs(parseFloat(av.fill) - par.barra) < 1, 'la linea de abajo dibuja la misma cifra');

// ── cerrar y volver ──
await pg.click('#annX');
await pg.waitForTimeout(700);
di(await pg.evaluate(() => document.querySelector('.ann').getBoundingClientRect().height === 0),
   'la X lo cierra');
di(await pg.evaluate(() => Math.round(document.querySelector('.hd').getBoundingClientRect().top)) === 14,
   'y la barra sube a ocupar su sitio');
await pg.reload({ waitUntil:'load' }); await pg.waitForTimeout(2200);
di(await pg.evaluate(() => document.querySelector('.ann').getBoundingClientRect().height === 0),
   'cerrado sigue cerrado al recargar');
await pg.evaluate(() => window.__aviso(86)); await pg.waitForTimeout(700);
di(await pg.evaluate(() => document.querySelector('.ann').getBoundingClientRect().height === 0),
   'un punto mas no lo devuelve: seria pesado');
await pg.evaluate(() => window.__aviso(88)); await pg.waitForTimeout(700);
di(await pg.evaluate(() => document.querySelector('.ann').getBoundingClientRect().height > 20),
   'dos puntos mas si: la ronda avanzo y hay algo que decir');
di(await pg.evaluate(() => document.getElementById('annPct').textContent) === '88%',
   'y trae la cifra nueva');

// ── el menu ──
await pg.evaluate(() => { try{ localStorage.removeItem('nrm:aviso') }catch(e){} });
await pg.reload({ waitUntil:'load' }); await pg.waitForTimeout(2400);
const menu = await pg.evaluate(() => [...document.querySelectorAll('.nav>a')].map(a => {
  const d = document.querySelector(a.getAttribute('href'));
  return { href: a.getAttribute('href'),
           txt: a.textContent.trim().replace(/^(.+?)\1$/,'$1'),
           ficha: !!a.querySelector('.chip svg path, .chip svg circle'),
           destino: !!d, visible: d ? getComputedStyle(d).display !== 'none' : false };
}));
di(menu.length === 10, 'las diez secciones de la pagina en el centro (' + menu.length + ')');
di(menu.every(m => m.ficha), 'cada una con su ficha');
di(menu.every(m => m.destino), 'todas apuntan a una seccion que existe');
di(menu.every(m => m.visible), 'y ninguna a una seccion oculta');
const orden = await pg.evaluate(() => [...document.querySelectorAll('.nav>a')].map(a => {
  const e = document.querySelector(a.getAttribute('href'));
  let y = 0, n = e; while (n) { y += n.offsetTop; n = n.offsetParent } return y;
}));
di(orden.every((y, i) => i === 0 || y > orden[i-1]),
   'y van en el orden en que se bajan, sin saltos');
di(await pg.evaluate(() => getComputedStyle(document.querySelector('.nav')).display) === 'flex',
   'el menu se ve en escritorio');

// ── el subrayado ──
di((await pg.evaluate(() => document.querySelectorAll('.nav>a.on').length)) === 0,
   'en la portada no hay nada subrayado');
for (const id of ['network','press','thesis','solutions','stack','security','presale','token','builds','join']) {
  await pg.evaluate(i => { const e = document.getElementById(i); let y=0,n=e;
    while(n){y+=n.offsetTop;n=n.offsetParent} scrollTo(0, y + e.offsetHeight/2 - innerHeight/2); }, id);
  await pg.waitForTimeout(800);
  const on = await pg.evaluate(() => [...document.querySelectorAll('.nav>a.on')].map(a=>a.getAttribute('href')));
  di(on.length === 1 && on[0] === '#' + id, 'en #' + id + ' se subraya ' + id + (on.length?' ('+on.join(',')+')':''));
}

// ── los doce idiomas ──
const dic = await pg.evaluate(() => JSON.parse(document.getElementById('i18n').textContent));
di(Object.keys(dic).length === 12, 'siguen los doce idiomas');
for (const k of ['Build','complete','Press','Thesis','Stack','Solutions','Network','Security','Token','Seed Round','In the open']) {
  di(Object.values(dic).every(d => d[k]), `«${k}» traducido en los doce`);
}
const es = await (async () => {
  await pg.evaluate(() => scrollTo(0,0)); await pg.waitForTimeout(400);
  await pg.click('.hud .lang'); await pg.waitForTimeout(400);
  await pg.evaluate(() => document.querySelector('.lang-menu button[data-l="es"]').click());
  await pg.waitForTimeout(1600);
  return pg.evaluate(() => ({
    nav: [...document.querySelectorAll('.nav>a')].map(a=>a.textContent.trim().replace(/^(.+?)\1$/,'$1')),
    ann: document.querySelector('.ann-in').innerText.replace(/\s+/g,' ') }));
})();
di(es.nav.includes('Construir') && es.nav.includes('Pila'), 'el menu se traduce: ' + es.nav.join(' '));
di(/completado/.test(es.ann), 'y el aviso tambien: ' + es.ann.trim());
await ctx.close();

// ── el telefono ──
const ctx2 = await nav.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
const mo = await ctx2.newPage();
mo.on('pageerror', e => errs.push('movil: ' + e.message));
await mo.goto(URL, { waitUntil:'load' }); await mo.waitForTimeout(2400);
di(await mo.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) === 0,
   'en el telefono no se sale nada por el lado');
di(await mo.evaluate(() => document.querySelector('.ann').getBoundingClientRect().height > 20),
   'el aviso tambien se ve en el telefono');
await mo.click('#burger'); await mo.waitForTimeout(600);
const hoja = await mo.evaluate(() => {
  const s = document.getElementById('sheet');
  return { top: Math.round(s.getBoundingClientRect().top),
           n: s.querySelectorAll('a').length, fichas: s.querySelectorAll('.chip').length,
           cta: !!s.querySelector('.sheet-cta') };
});
di(hoja.n === 11 && hoja.fichas === 10, 'el menu del telefono trae las mismas diez y la llamada');
di(hoja.cta, 'con el boton de entrar en la ronda al final');
di(hoja.top >= 80, 'y arranca por debajo del aviso y de la barra');
await ctx2.close();

di(errs.length === 0, 'sin errores de pagina' + (errs.length ? ': ' + errs[0] : ''));
console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
await nav.close();
process.exit(mal ? 1 : 0);
