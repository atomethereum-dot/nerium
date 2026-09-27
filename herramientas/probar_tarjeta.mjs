// La tarjeta de seguridad, en el escenario fijo.
//
// «#security» se rehizo sobre un video de referencia: una columna fija y UNA
// tarjeta que cambia con el scroll -en escritorio y en telefono, para que la
// pagina no se alargue-. Eso tiene un riesgo que esta prueba vigila: en una
// pantalla fija la tarjeta tiene el alto que tiene, y si su contenido no cabe
// se corta sin avisar -el boton o la fuente desaparecen por abajo-.
// Y lo que vigilaba la version anterior sigue valiendo: que no quede un hueco
// entre el ultimo dato y el boton, y que el rotulo y el dato de cada fila
// compartan linea base.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const RAIZ = '/home/user/nerium';
const TIPO = {'.html':'text/html','.svg':'image/svg+xml','.css':'text/css','.woff2':'font/woff2','.json':'application/json',
              '.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.js':'text/javascript'};
http.createServer((q, r) => {
  let f = decodeURIComponent(q.url.split('?')[0]); if (f.endsWith('/')) f += 'index.html';
  const p = path.join(RAIZ, f);
  if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'content-type': TIPO[path.extname(p)] || 'application/octet-stream' });
  r.end(fs.readFileSync(p));
}).listen(9159);
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
let ok = 0, mal = 0;
const di = (b, t) => { if (b) { ok++; console.log('  ok  ' + t) } else { mal++; console.log('  MAL ' + t) } };

for (const [W, H, movil] of [[440,956,1],[430,932,1],[414,896,1],[390,844,1],[375,667,1],[1378,788,0],[1440,900,0],[1920,1080,0]]) {
  const ctx = await nav.newContext({ viewport:{ width:W, height:H }, isMobile:!!movil, hasTouch:!!movil });
  await ctx.addInitScript(() => { window.fetch = async () => new Response('{}', { status:200 }) });
  const pg = await ctx.newPage();
  await pg.goto('http://127.0.0.1:9159/', { waitUntil:'load' });
  await pg.waitForTimeout(900);
  const g = await pg.evaluate(() => { const h = document.querySelector('#security .sx-hold');
    let y = 0, n = h; while (n) { y += n.offsetTop; n = n.offsetParent } return { y, alto:h.offsetHeight } });
  const fallos = [];
  for (const [k, f] of [[0, .05], [1, .5], [2, .95]]) {
    await pg.evaluate(v => scrollTo(0, v), Math.round(g.y + (g.alto - H) * f));
    await pg.waitForTimeout(1300);
    const r = await pg.evaluate(() => {
      const c = document.querySelector('#security .sx-card.on'); if (!c) return null;
      const rc = c.getBoundingClientRect(), area = document.querySelector('#security .sx-cards').getBoundingClientRect();
      const go = c.querySelector('.sx-go').getBoundingClientRect();
      /* lo que el boton tiene encima: los datos, o en telefono el registro */
      const encima = Math.max(...['.sx-kv', '.sx-log'].map(q => c.querySelector(q).getBoundingClientRect())
        .filter(b => b.bottom <= go.top + 1).map(b => b.bottom));
      const pie = c.querySelector('.sx-foot').getBoundingClientRect();
      const linea = e => { const s = document.createElement('span');
        s.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
        e.appendChild(s); const y = s.getBoundingClientRect().bottom; s.remove(); return y; };
      const bases = [...c.querySelectorAll('.sx-kv>div')].map(d => Math.abs(linea(d.querySelector('dt')) - linea(d.querySelector('.sx-v'))));
      /* se mide contra el PIE y no con «scrollHeight»: la franja de luz que
         verifica pasa por debajo del borde y contaria como contenido */
      return { i:c.dataset.i, t:c.querySelector('.sx-t').textContent.trim(),
               corta: pie.bottom > rc.bottom - 4 || go.bottom > rc.bottom - 4,
               sale: rc.bottom > area.bottom + 1 || rc.top < area.top - 1 || rc.bottom > innerHeight,
               hueco: Math.round(go.top - encima), base: Math.max(...bases),
               /* en telefono el conjunto ocupa la pantalla entera: las pestañas a
                  24 px de arriba y la tarjeta a 24 px del pie fijo */
               arriba: Math.round(document.querySelector('#security .sx-list').getBoundingClientRect().top),
               abajo: Math.round(document.querySelector('#subir').getBoundingClientRect().top - rc.bottom) };
    });
    if (!r) { fallos.push('paso ' + k + ': sin tarjeta activa'); continue; }
    if (String(r.i) !== String(k)) fallos.push('paso ' + k + ': esta activa la ' + r.i);
    if (r.corta) fallos.push('«' + r.t + '» se corta por dentro');
    if (r.sale) fallos.push('«' + r.t + '» se sale de su hueco o de la pantalla');
    if (movil) {
      /* en telefono el sobrante se reparte entre los bloques a proposito; lo
         que se exige es que el conjunto llene la pantalla, simetrico */
      if (Math.abs(r.arriba - 24) > 4 || Math.abs(r.abajo - 24) > 4)
        fallos.push('«' + r.t + '» no llena la pantalla simetrico (arriba ' + r.arriba + ', abajo ' + r.abajo + ')');
    } else if (r.hueco > 32) fallos.push('«' + r.t + '» deja ' + r.hueco + ' px entre el ultimo dato y el boton');
    if (r.base > 2.5) fallos.push('«' + r.t + '» rotulo y dato fuera de linea (' + r.base.toFixed(1) + ' px)');
  }
  di(fallos.length === 0, W + 'x' + H + (movil ? ' · las tres llenan la pantalla, simetricas, sin cortarse' : ' · las tres tarjetas caben, sin hueco') + ' y con sus filas en linea' +
     (fallos.length ? ' — ' + fallos.join('; ') : ''));
  await ctx.close();
}
await nav.close();
console.log(mal ? `\n${mal} fallo(s)` : `\n${ok}/${ok} correctas`);
process.exit(mal ? 1 : 0);
