// La portada ahora ejecuta la promesa de la cadena: las cuatro patas llegan a
// destiempo, esperan, y cierran LAS CUATRO EN EL MISMO FOTOGRAMA. Esto lo mide.
//
// Y mide los dos defectos que solo se veian en un telefono y que no habia
// mirado nunca: que los botones no partan en dos renglones —«Join the Seed /
// Round» es lo que mas barata una portada— y que tengan tamano de llamada.
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
}).listen(9166);
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
let ok = 0, mal = 0;
const di = (b, t) => { if (b) { ok++; console.log('  ok  ' + t) } else { mal++; console.log('  MAL ' + t) } };

// ── el gesto ──
const ctx = await nav.newContext({ viewport:{width:1440,height:900} });
const pg = await ctx.newPage();
await pg.goto('http://127.0.0.1:9166/', { waitUntil:'load' });
/* Se espera por el RELOJ DE LA ANIMACION, no por reloj de pared: el .ready
   llega cuando llega y medir a los 3 s me dio tres lecturas falsas seguidas
   —la animacion asignada pero sin empezar— antes de darme cuenta. */
await pg.waitForFunction(() => {
  const li = document.querySelector('.lq .hero-pr li');
  return li && li.getAnimations().length > 0;
}, null, { timeout:15000 });

const en = async q => pg.evaluate(p => {
  const d = 7200 * p;
  [...document.querySelectorAll('.lq, .lq *')].forEach(e =>
    e.getAnimations().forEach(a => { a.pause(); a.currentTime = d; }));
  const li = [...document.querySelectorAll('.lq .hero-pr li')];
  const g = e => getComputedStyle(e);
  return {
    op: li.map(e => +(+g(e).opacity).toFixed(2)),
    x: li.map(e => Math.round(new DOMMatrix(g(e).transform).m41)),
    rail: +new DOMMatrix(g(document.querySelector('.lq-rail')).transform).m11.toFixed(2),
  };
}, q);

const antes = await en(0.10), espera = await en(0.34), despues = await en(0.52);
di(antes.x.some(v => v !== 0), 'al empezar las cuatro patas estan fuera de sitio: ' + antes.x.join(' '));
di(espera.x.every(v => v === 0) && espera.op.every(v => v < 0.95),
   'llegan y ESPERAN, a media luz y ya en su sitio: ' + espera.op.join(' '));
di(antes.rail === 0 && espera.rail === 0,
   'y el rail no existe mientras falte alguna: no se liquida a medias');
di(despues.op.every(v => v > 0.95) && despues.rail > 0.95,
   'y cierran todas a la vez, con el rail dibujado: ' + despues.op.join(' ') + ' rail ' + despues.rail);
/* Lo que de verdad hay que garantizar es que el cierre sea SIMULTANEO: si una
   pata se encendiera antes que otra, la portada estaria contando lo contrario
   de lo que dice la cadena. */
di(new Set(despues.op).size === 1,
   'y el cierre es el mismo para las cuatro, que es justo lo que se cuenta');
await ctx.close();

// ── el telefono ──
const ctx2 = await nav.newContext({ ...devices['iPhone 13'], isMobile:true, hasTouch:true });
const pg2 = await ctx2.newPage();
await pg2.goto('http://127.0.0.1:9166/', { waitUntil:'load' });
await pg2.waitForTimeout(2600);
const bot = await pg2.evaluate(() => [...document.querySelectorAll('.hero-act .hb')].map(b => {
  const c = getComputedStyle(b), r = b.getBoundingClientRect();
  /* Cuantos renglones ocupa el TEXTO. La primera version de esto comparaba el
     alto del boton con el de una linea, y fallaba siempre: el boton tiene alto
     fijo por CSS, asi que su altura no dice absolutamente nada de si el texto
     salta. Lo que hay que contar son las cajas de linea reales, y eso lo da un
     Range sobre el contenido: una caja por renglon. */
  const rg = document.createRange(); rg.selectNodeContents(b);
  const renglones = rg.getClientRects().length;
  return { alto:Math.round(r.height), ancho:Math.round(r.width), renglones,
           txt:b.textContent.trim(), cuerpo:Math.round(parseFloat(c.fontSize)) };
}));
di(bot.length === 2, 'el telefono trae los dos botones de la portada');
di(bot.every(b => b.renglones === 1),
   'y ninguno parte en dos renglones: ' +
   bot.map(b => '«' + b.txt + '» ' + b.renglones).join(', '));
di(bot.every(b => b.alto >= 46 && b.cuerpo >= 14),
   'y tienen tamano de llamada, no de nota al pie: ' + bot.map(b => b.alto + 'px/' + b.cuerpo).join(' '));
di(Math.abs(bot[0].ancho - bot[1].ancho) <= 1,
   'los dos miden lo mismo: uno encima del otro y del mismo ancho');
await ctx2.close();

await nav.close(); srv.close();
console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
process.exit(mal ? 1 : 0);
