// Las tres tarjetas de seguridad, en el movil.
//
// «#security» es un escenario anclado: ocupa la pantalla y las tarjetas se
// pasan una a una. El area se reparte lo que sobra y cada tarjeta va
// «inset:0», asi que se estira. El contenido no. Y como el enlace del pie
// llevaba «margin-top:auto», se iba al canto de abajo y dejaba TODO el
// sobrante en un hueco entre el ultimo dato y el:
//
//     390 x 844   hueco   22 px
//     430 x 932   hueco  124 px
//
// Cuanto mas alto el telefono, mayor el agujero: crece el area, no lo que hay
// dentro. Esto lo sujeta a cinco tamaños.
//
// Y sujeta lo que costo conservar al arreglarlo: las filas pasaron de «flex» a
// «grid» para poder crecer con el texto centrado, y en ese cambio lo facil es
// perder la linea base entre el rotulo pequeño y el dato grande. Se mide con
// una caja en linea de altura cero metida DENTRO de cada uno —ahi si queda en
// el flujo del texto—, que medir el fondo del renglon con un «Range» da la
// caja de linea y entre dos tamaños distintos eso no es la linea base.
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
}).listen(9159);
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
let ok = 0, mal = 0;
const di = (b, t) => { if (b) { ok++; console.log('  ok  ' + t) } else { mal++; console.log('  MAL ' + t) } };

async function mirar(pg) {
  await pg.waitForTimeout(900);
  const alto = await pg.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < alto; y += 450) { await pg.evaluate(v => scrollTo(0, v), y); await pg.waitForTimeout(50); }
  await pg.evaluate(() => document.getElementById('security').scrollIntoView({ block:'start' }));
  await pg.waitForTimeout(1000);
}

// ── el movil: ni hueco dentro ni aire alrededor ──────────────────────────────
for (const [W, H] of [[440,956],[430,932],[414,896],[390,844],[375,667]]) {
  const ctx = await nav.newContext({ viewport:{ width:W, height:H }, isMobile:true, hasTouch:true });
  const pg = await ctx.newPage();
  await pg.goto('http://127.0.0.1:9159/', { waitUntil:'load' });
  await mirar(pg);
  const r = await pg.evaluate(() => {
    const g = document.querySelector('.sec-grid'), rg = g.getBoundingClientRect();
    const O = [];
    document.querySelectorAll('.sec-card').forEach((c, i) => {
      const rc = c.getBoundingClientRect();
      const dl = c.querySelector('.sec-fields'), go = c.querySelector('.sec-go');
      O.push({ i, t:c.querySelector('.sec-t').textContent.trim().slice(0, 18),
               hueco:Math.round(go.getBoundingClientRect().top - dl.getBoundingClientRect().bottom),
               aire:Math.round(rg.height - rc.height) });
    });
    return O;
  });
  const conHueco = r.filter(x => x.hueco > 4);
  di(conHueco.length === 0,
     W + 'x' + H + ' · ninguna tarjeta deja hueco entre el ultimo dato y el enlace' +
     (conHueco.length ? ' — ' + conHueco.map(x => '«' + x.t + '» ' + x.hueco + ' px').join(', ') : ''));
  const conAire = r.filter(x => Math.abs(x.aire) > 2);
  di(conAire.length === 0,
     W + 'x' + H + ' · y llenan su area, sin aire alrededor' +
     (conAire.length ? ' — ' + conAire.map(x => '«' + x.t + '» ' + x.aire + ' px').join(', ') : ''));

  // la linea base del rotulo y el dato de cada fila
  const base = await pg.evaluate(() => {
    const linea = e => { const s = document.createElement('span');
      s.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
      e.appendChild(s); const y = s.getBoundingClientRect().bottom; s.remove(); return y; };
    const fuera = [];
    document.querySelectorAll('.sec-card.on .sec-fields>div, .sec-card:first-child .sec-fields>div')
      .forEach(d => {
        const dt = d.querySelector('dt'), dd = d.querySelector('dd');
        if (!dt || !dd) return;
        const s = linea(dd) - linea(dt);
        if (Math.abs(s) > 1) fuera.push(dt.textContent.trim() + ' ' + s.toFixed(2) + ' px');
      });
    return fuera;
  });
  di(base.length === 0,
     W + 'x' + H + ' · el rotulo y el dato comparten linea base' +
     (base.length ? ' — fuera: ' + base.join(', ') : ''));
  await ctx.close();
}

// ── el escritorio no se toca ─────────────────────────────────────────────────
{
  const ctx = await nav.newContext({ viewport:{ width:1440, height:900 } });
  const pg = await ctx.newPage();
  await pg.goto('http://127.0.0.1:9159/', { waitUntil:'load' });
  await mirar(pg);
  const r = await pg.evaluate(() => {
    const c = [...document.querySelectorAll('.sec-card')].map(e => Math.round(e.getBoundingClientRect().height));
    const fila = getComputedStyle(document.querySelector('.sec-grid')).gridTemplateColumns.split(' ').length;
    return { c, fila };
  });
  di(r.fila === 3, '1440px · las tres tarjetas siguen en fila (' + r.fila + ' columnas)');
  di(new Set(r.c).size === 1, '1440px · y siguen midiendo lo mismo: ' + r.c.join(' · '));
  await ctx.close();
}

console.log('\n' + ok + '/' + (ok + mal) + ' correctas');
await nav.close(); srv.close();
process.exit(mal ? 1 : 0);
