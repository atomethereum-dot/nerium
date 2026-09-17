// La costura entre cada banda animada y la seccion que le sigue.
//
// Lo que fallaba: el embudo se pintaba de un color escrito a mano, sacado de
// «data-bg» —de que color EMPIEZA la banda— cuando el embudo vive donde la
// banda ACABA. Dos de las cuatro cambian de claro a oscuro por el camino, asi
// que dos de los cuatro colores estaban invertidos: un embudo casi blanco
// encima de una escena casi negra, y el mismo error al reves.
//
// Un color escrito a mano no se puede comprobar leyendo el CSS: hay que
// MIRAR. Esta bateria apaga el embudo, muestrea el pixel de verdad de la
// escena donde el embudo empezaria, y compara con el color que el embudo dice
// que va a usar. Si uno es claro y el otro oscuro, falla — que es justo lo
// que pasaba y lo que ninguna otra bateria veia.
//
// Y comprueba que no vuelva el recorte: el embudo era un «clip-path» de
// poligono, y un poligono no tiene medio tono. Sus dos diagonales se ven
// cruzando la escena en cuanto el color no coincide exactamente con el fondo,
// y eso es lo que hacia que se leyera como una figura puesta encima en vez de
// como la escena apagandose.
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
}).listen(9155);
const PUERTO = 9155;
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
let ok = 0, mal = 0;
const di = (b, t) => { if (b) { ok++; console.log('  ok  ' + t) } else { mal++; console.log('  MAL ' + t) } };

const BANDAS = ['chroma', 'kin', 'xf', 'xl'];
// Claridad percibida, 0 negro y 1 blanco. Con los coeficientes de siempre,
// que el verde pesa mucho mas que el azul y una media a pelo diria que
// #0000FF y #00FF00 son igual de claros.
const claro = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

const ctx = await nav.newContext({ viewport:{ width:1512, height:900 }, deviceScaleFactor:1 });
const pg = await ctx.newPage();
await pg.goto('http://127.0.0.1:9155/', { waitUntil:'load' });
await pg.waitForTimeout(900);
const alto = await pg.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < alto; y += 450) { await pg.evaluate(v => scrollTo(0, v), y); await pg.waitForTimeout(50); }
await pg.waitForTimeout(800);

// 1 · ni un recorte de poligono
const recortes = await pg.evaluate(() => [...document.querySelectorAll('.emb')]
  .map(e => ({ cl:e.parentElement.className.split(' ')[0], cp:getComputedStyle(e).clipPath })));
di(recortes.length === 4, 'las cuatro bandas tienen costura (' + recortes.length + ')');
for (const r of recortes)
  di(r.cp === 'none',
     r.cl.padEnd(7) + ' · sin recorte de poligono, que no tiene medio tono (clip-path: ' + r.cp + ')');

for (const cl of BANDAS) {
  // Se para al final de la banda, que es donde el embudo vive.
  const y = await pg.evaluate(c => {
    const s = document.querySelector('.' + c);
    return scrollY + s.getBoundingClientRect().bottom - 240;
  }, cl);
  await pg.evaluate(v => scrollTo(0, v), y);
  await pg.waitForTimeout(1500);

  // El color que el embudo DICE que va a usar.
  const dice = await pg.evaluate(c => {
    const e = document.querySelector('.' + c + ' .emb');
    const v = getComputedStyle(e).getPropertyValue('--embc').trim();
    const r = e.getBoundingClientRect();
    return { v, arriba:Math.round(r.top), alto:Math.round(r.height), ancho:Math.round(r.width) };
  }, cl);
  const comp = dice.v.split(/[\s,]+/).map(Number);
  if (comp.length !== 3 || comp.some(isNaN)) { di(false, cl + ': «--embc» no dice un color (' + dice.v + ')'); continue; }
  // Una seccion OCULTA no tiene costura que medir, y pedirle una captura de
  // ancho cero tumba la bateria entera. Se salta y se dice, que no es lo
  // mismo que aprobarla en silencio.
  if (!dice.ancho || !dice.alto) { console.log('  --  ' + cl + ': oculta, no hay costura que medir'); continue; }

  // Y el color que la escena tiene DE VERDAD ahi. Con el embudo apagado: si
  // no, se estaria midiendo a si mismo y aprobaria siempre.
  await pg.addStyleTag({ content:'.emb{visibility:hidden!important}' });
  await pg.waitForTimeout(500);
  const tira = await pg.screenshot({ clip:{ x:0, y:Math.max(0, dice.arriba + 4), width:dice.ancho, height:10 } });
  await pg.evaluate(() => { const s = [...document.querySelectorAll('style')].pop(); if (s) s.remove(); });
  await pg.waitForTimeout(300);

  // La media de la franja, decodificando el PNG a mano no: se vuelve a pedir
  // al navegador, que ya sabe leerlo.
  const medio = await pg.evaluate(async (b64) => {
    const im = new Image();
    await new Promise(r => { im.onload = r; im.src = 'data:image/png;base64,' + b64; });
    const c = document.createElement('canvas');
    c.width = im.width; c.height = im.height;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let R = 0, G = 0, B = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { R += d[i]; G += d[i+1]; B += d[i+2]; n++; }
    return [Math.round(R/n), Math.round(G/n), Math.round(B/n)];
  }, tira.toString('base64'));

  const cEsc = claro(...medio), cEmb = claro(...comp);
  const hex = a => '#' + a.map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('');
  // El umbral no es de gusto: separa «los dos son oscuros» o «los dos son
  // claros» de «uno es lo contrario del otro». Con el fallo vivo la distancia
  // era de 0.8 y 0.85; con el color bueno se queda por debajo de 0.2.
  di(Math.abs(cEsc - cEmb) <= 0.30,
     cl.padEnd(7) + ' · el embudo va del color de la escena: escena ' + hex(medio) +
     ' (' + cEsc.toFixed(2) + ') vs embudo ' + hex(comp) + ' (' + cEmb.toFixed(2) + ')' +
     ', distancia ' + Math.abs(cEsc - cEmb).toFixed(2));
}

/* ── y el suelo, uno solo ────────────────────────────────────────────────────
   Una seccion no pinta sola sobre el vacio: detras hay un lienzo fijo —el
   «#wash»— que se tine del «data-bg» de la banda. Y la pagina ENCOGE cada
   seccion al entrar, un 5 % con el scroll, asi que encogida deja de tapar su
   caja y se ve el lienzo por los cuatro lados.

   Mientras los dos colores coincidan no se nota nada. En cuanto se separan
   —paso a cambiar «--suelo» y dejar los «data-bg» viejos— aparece una franja
   mas clara entre secciones, que es lo que se veia. Asi que se comprueba lo
   unico que hace falta: que cada banda que pinta un fondo opaco lo pinte del
   MISMO color que anuncia en su «data-bg». */
{
  const ctx2 = await nav.newContext({ viewport:{ width:1440, height:900 } });
  const pg2 = await ctx2.newPage();
  await pg2.goto('http://127.0.0.1:' + PUERTO + '/', { waitUntil:'load' });
  await pg2.waitForTimeout(1200);
  const bandas = await pg2.evaluate(() => {
    const lee = t => { const m = String(t).match(/\d+/g); return m ? m.slice(0,3).map(Number) : null };
    const lienzo = getComputedStyle(document.getElementById('wash')).backgroundColor;
    return [...document.querySelectorAll('[data-bg]')].map(e => {
      if (!e.offsetHeight && !e.offsetParent) return null;      // las ocultas no pintan
      const cs = getComputedStyle(e);
      if (/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor)) return null;  // deja ver el lienzo
      /* Y las que pintan «var(--wash)» —la portada, la pila, el pie— tampoco:
         esas van SIEMPRE del color del lienzo por construccion, asi que
         medirlas es medir el lienzo, y el lienzo tarda en llegar a su color. */
      if (cs.backgroundColor === lienzo) return null;
      return { id:e.id || e.className.split(' ')[0] || e.tagName.toLowerCase(),
               dice:e.dataset.bg, pinta:cs.backgroundColor,
               d:(() => { const a = lee(cs.backgroundColor);
                          const h = e.dataset.bg.replace('#','');
                          const b = [0,2,4].map(i => parseInt(h.slice(i,i+2),16));
                          return a ? Math.max(...a.map((v,i) => Math.abs(v-b[i]))) : -1 })() };
    }).filter(Boolean);
  });
  const fuera = bandas.filter(b => b.d > 2);
  di(fuera.length === 0,
     'las ' + bandas.length + ' bandas que pintan fondo lo pintan del color que anuncian' +
     (fuera.length ? ' — fuera: ' + fuera.map(b => b.id + ' dice ' + b.dice +
        ' y pinta ' + b.pinta + ' (' + b.d + ')').join(', ') : ''));
  await ctx2.close();
}

console.log('\n' + ok + '/' + (ok + mal) + ' correctas');
await nav.close(); srv.close();
process.exit(mal ? 1 : 0);
