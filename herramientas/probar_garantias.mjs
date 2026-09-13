// Las cuatro garantias, que es donde se vieron las dos cosas:
//
//   · «04 Guarantees» caia a CERO pixeles del borde de la lista, y ese borde
//     es una linea de puntos: el rotulo no quedaba cerca de la raya, quedaba
//     encima. Las demas secciones tienen entre 13 y 48 px de aire.
//   · La descripcion de cada fila iba 18 px POR ENCIMA del titulo. No 18 px
//     de caja: 18 px de linea base, que es lo que ve el ojo. La fila alineaba
//     por arriba dos textos de 32 y 16.5 px, y alinear por arriba textos de
//     tamano distinto no los alinea.
//
// Ninguna bateria miraba esto porque ninguna medía huecos ni lineas base.
// Esta las mide, y mide la linea base BIEN, que tiene truco: el fondo del
// renglon —lo que da un «Range»— no es la linea base, y como las dos columnas
// tienen tamanos distintos esa medida miente: me dijo 22 px de desfase donde
// habia 18, y despues 4 donde hay 0. El numero bueno sale con una caja en
// linea de altura cero, que se apoya EXACTA sobre la linea base.
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
}).listen(9151);
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
let ok = 0, mal = 0;
const di = (b, t) => { if (b) { ok++; console.log('  ok  ' + t) } else { mal++; console.log('  MAL ' + t) } };

// La linea base de verdad: una caja en linea de altura cero se apoya EXACTA
// sobre ella, asi que su borde inferior ES la linea base.
const SONDA = `(e)=>{const s=document.createElement('span');
  s.style.cssText='display:inline-block;width:0;height:0;vertical-align:baseline';
  e.insertBefore(s,e.firstChild);
  const y=s.getBoundingClientRect().bottom; s.remove(); return y;}`;

for (const [W, H] of [[1512,900],[1440,900],[1280,900],[900,1000],[390,844]]) {
  const movil = W <= 820;                       // por debajo de 820 la descripcion baja a su renglon
  const ctx = await nav.newContext({ viewport:{ width:W, height:H }, deviceScaleFactor:1,
                                     isMobile:W < 900, hasTouch:W < 900 });
  const pg = await ctx.newPage();
  await pg.goto('http://127.0.0.1:9151/', { waitUntil:'load' });
  await pg.waitForTimeout(900);
  const alto = await pg.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < alto; y += 450) { await pg.evaluate(v => scrollTo(0, v), y); await pg.waitForTimeout(50); }
  await pg.evaluate(() => document.getElementById('solutions').scrollIntoView({ block:'center' }));
  await pg.waitForTimeout(1100);

  const f = await pg.evaluate(([sonda, movil]) => {
    const linea = eval(sonda);
    const sk = document.querySelector('#solutions .sk');
    const ul = document.querySelector('#solutions .rows');
    const filas = [];
    document.querySelectorAll('#solutions .rows li').forEach(li => {
      const b = li.querySelector('b'), d = li.querySelector('.rd');
      if (!b || !d) return;
      const rb = b.getBoundingClientRect(), rd = d.getBoundingClientRect();
      filas.push({ t:b.textContent.trim().slice(0, 22),
                   base:+(linea(d) - linea(b)).toFixed(2),
                   propia:rd.top >= rb.bottom - 1 });   // ¿bajo a su propio renglon?
    });
    return { hueco:+(ul.getBoundingClientRect().top - sk.getBoundingClientRect().bottom).toFixed(1),
             filas };
  }, [SONDA, movil]);

  // 1 · aire entre el epigrafe y la lista. El minimo no es «que no toque»:
  //     el borde de la lista es de puntos y a 5 px sigue leyendose pegado.
  di(f.hueco >= 14,
     W + 'px · «04 Guarantees» despega del borde de la lista: ' + f.hueco + ' px (minimo 14)');

  if (movil) {
    // 2b · en el telefono la descripcion es otro renglon del flex: no hay
    //      linea base que compartir, y la regla esta apagada a proposito.
    di(f.filas.every(x => x.propia),
       W + 'px · la descripcion baja a su propio renglon en las ' + f.filas.length + ' filas');
  } else {
    // 2a · en ancho, titulo y descripcion en la MISMA linea base.
    const fuera = f.filas.filter(x => Math.abs(x.base) > 1);
    di(fuera.length === 0,
       W + 'px · las ' + f.filas.length + ' filas tienen titulo y texto en la misma linea base' +
       (fuera.length ? ' — fuera: ' + fuera.map(x => '«' + x.t + '» ' + x.base + ' px').join(', ') : ''));
  }
  await ctx.close();
}

console.log('\n' + ok + '/' + (ok + mal) + ' correctas');
await nav.close(); srv.close();
process.exit(mal ? 1 : 0);
