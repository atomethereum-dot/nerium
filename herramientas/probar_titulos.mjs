// Lo acordado es de una linea: todos los titulos de la web a la izquierda,
// menos el de la portada. Esto lo sujeta.
//
// No mide gusto —eso no se mide—, mide tres cosas que se rompen solas:
//
//   1. Que ningun titular vuelva a quedarse centrado. Basta con que alguien
//      anada una regla mas abajo en la hoja para que uno se escape, y un solo
//      titular centrado entre nueve alineados se ve antes que los otros nueve.
//   2. Que el epigrafe, el titular y la entradilla compartan borde con la caja
//      que los envuelve. Alinear el titular y dejar el epigrafe en el centro
//      es peor que no haber alineado nada.
//   3. Que en arabe se vayan a la DERECHA. El sitio se traduce a doce idiomas
//      y uno de ellos escribe al reves: con «text-align:left» los titulos
//      arabes se quedarian al final del renglon. Por eso la regla dice
//      «start», y por eso esto lo comprueba en «direction:rtl» de verdad.
//
// La portada se comprueba al reves: tiene que seguir CENTRADA.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const RAIZ = '/home/user/nerium';
const TIPO = {'.html':'text/html','.svg':'image/svg+xml','.css':'text/css','.woff2':'font/woff2',
  '.png':'image/png','.jpg':'image/jpeg','.js':'text/javascript','.json':'application/json',
  '.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const srv = http.createServer((q, r) => {
  let p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, {'content-type': TIPO[path.extname(p)] || 'application/octet-stream'});
  r.end(fs.readFileSync(p));
}).listen(9147);
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
let ok = 0, mal = 0;
const di = (b, t) => { if (b) { ok++; console.log('  ok  ' + t) } else { mal++; console.log('  MAL ' + t) } };

// Las estaciones que llevan cabecera propia. «#stack» ya esta: era la unica
// que quedaba centrada de las once y se paso al margen, asi que ahora se le
// pide lo mismo que a las demas. «#xfade» sigue fuera: eso no es la cabecera
// de una seccion, es una palabra a pantalla completa entre dos escenas.
const SECCIONES = ['network','press','thesis','solutions','stack','security','presale','token','builds','join'];

// Un recorrido entero para que salte todo lo que aparece al entrar en cuadro;
// medir antes da cajas de ancho cero y una bateria que aprueba sin mirar.
async function recorrer(pg) {
  const alto = await pg.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < alto; y += 450) { await pg.evaluate(v => scrollTo(0, v), y); await pg.waitForTimeout(50); }
  await pg.waitForTimeout(900);
}

// ── 1 · ningun titular centrado, salvo el de la portada ──────────────────────
for (const ruta of ['/', '/whitepaper/', '/explorer/']) {
  const ctx = await nav.newContext({ viewport:{ width:1280, height:900 }, deviceScaleFactor:1 });
  const pg = await ctx.newPage();
  await pg.goto('http://127.0.0.1:9147' + ruta, { waitUntil:'load' });
  await pg.waitForTimeout(900);
  await recorrer(pg);
  const t = await pg.evaluate(() => [...document.querySelectorAll('h1,h2')].map(e => {
    const r = e.getBoundingClientRect(); if (!r.width) return null;
    const sec = e.closest('section'); 
    return { al:getComputedStyle(e).textAlign,
             portada:!!(sec && sec.id === 'top'),
             t:(e.textContent||'').replace(/\s+/g,' ').trim().slice(0,34) };
  }).filter(Boolean));
  const centrados = t.filter(x => !x.portada && (x.al === 'center' || x.al === 'right' || x.al === 'end'));
  di(centrados.length === 0,
     ruta + ' · ' + t.length + ' titulos, ninguno centrado' +
     (centrados.length ? ' — se escaparon: ' + centrados.map(x => '«' + x.t + '» (' + x.al + ')').join(', ') : ''));
  const port = t.filter(x => x.portada);
  if (port.length) di(port.every(x => x.al === 'center'),
     ruta + ' · y el de la portada SIGUE centrado: «' + port[0].t + '» (' + port[0].al + ')');
  await ctx.close();
}

// ── 2 · epigrafe, titular y entradilla comparten borde ───────────────────────
// Se mide a varios anchos porque el borde lo pone «.wrap», que es elastico, y
// un margen suelto solo se nota en uno de ellos.
for (const [W, H] of [[1440,900],[1280,900],[768,1024],[390,844]]) {
  const ctx = await nav.newContext({ viewport:{ width:W, height:H }, deviceScaleFactor:1,
                                     isMobile:W < 900, hasTouch:W < 900 });
  const pg = await ctx.newPage();
  await pg.goto('http://127.0.0.1:9147/', { waitUntil:'load' });
  await pg.waitForTimeout(900);
  await recorrer(pg);
  for (const s of SECCIONES) {
    // Cada seccion se pone en cuadro y se espera: el paralaje mueve las
    // cabeceras mientras entran, y medirlas en vuelo da numeros falsos. La
    // primera vez me dio 73 px donde habia 40 y estuve a punto de «arreglar»
    // algo que no estaba roto.
    await pg.evaluate(i => { const e = document.getElementById(i); if (e) e.scrollIntoView({ block:'center' }); }, s);
    await pg.waitForTimeout(420);
    const f = await pg.evaluate(i => {
      const sec = document.getElementById(i); if (!sec) return null;
      const caja = sec.querySelector('.wrap') || sec;
      const iz = e => { if (!e) return null; const b = e.getBoundingClientRect(); return b.width ? b.left : null; };
      // La pila no escribe su titular en un «h2» ni su entradilla en un «p»:
      // son tres «b» y tres «s» que se van relevando, y solo el que lleva
      // «.on» esta a la vista. Los demas miden cero y «iz» ya los descarta.
      return { base:iz(caja), ep:iz(sec.querySelector('.sk')),
               ti:iz(sec.querySelector('h2, .stk-t b.on')),
               su:iz(sec.querySelector('.sec-sub,.join-note,.lane-sub,.sale-sub,.sub,.stk-sub s.on')) };
    }, s);
    if (!f || f.base === null) { di(false, W + 'px · ' + s + ': no se pudo medir la caja'); continue; }
    const partes = [['epigrafe',f.ep],['titular',f.ti],['entradilla',f.su]].filter(p => p[1] !== null);
    const fuera = partes.filter(p => Math.abs(p[1] - f.base) > 2);
    // Se compara con la caja, no con un numero fijo: varias secciones llevan
    // un «scale» de 0.95-0.97 que las encoge al entrar, asi que su borde
    // absoluto cambia a cada cuadro. Lo que no puede cambiar es que las tres
    // piezas compartan ese borde, sea cual sea.
    di(fuera.length === 0,
       W + 'px · ' + s.padEnd(10) + ' las ' + partes.length + ' piezas comparten el borde de su caja' +
       (fuera.length ? ' — fuera: ' + fuera.map(p => p[0] + ' a ' + Math.round(p[1] - f.base) + ' px') .join(', ') : ''));
  }
  await ctx.close();
}

// ── 3 · en arabe, a la derecha ───────────────────────────────────────────────
{
  const ctx = await nav.newContext({ viewport:{ width:1280, height:900 }, deviceScaleFactor:1 });
  const pg = await ctx.newPage();
  await pg.goto('http://127.0.0.1:9147/', { waitUntil:'load' });
  await pg.waitForTimeout(900);
  await pg.evaluate(() => { document.body.classList.add('rtl'); document.documentElement.dir = 'rtl'; });
  await pg.waitForTimeout(400);
  await recorrer(pg);
  for (const s of ['press','security','token','builds','join']) {
    await pg.evaluate(i => { const e = document.getElementById(i); if (e) e.scrollIntoView({ block:'center' }); }, s);
    await pg.waitForTimeout(420);
    const d = await pg.evaluate(i => {
      const sec = document.getElementById(i), h2 = sec && sec.querySelector('h2');
      if (!h2) return null;
      const caja = sec.querySelector('.wrap') || sec;
      return caja.getBoundingClientRect().right - h2.getBoundingClientRect().right;
    }, s);
    if (d === null) { di(false, 'rtl · ' + s + ' sin titular'); continue; }
    di(Math.abs(d) <= 2, 'rtl · ' + s.padEnd(10) + ' el titular se pega al borde derecho (' + Math.round(d) + ' px)');
  }
  await ctx.close();
}

console.log('\n' + (ok + mal ? ok + '/' + (ok + mal) + ' correctas' : 'nada medido'));
await nav.close(); srv.close();
process.exit(mal ? 1 : 0);
