// probar_globo: la seccion «Real-world asset chain» empieza como estaba
// -«One chain, four layers.» con «Nereum» detras y las persianas- y de las
// persianas sale un GLOBO con sus
// paises -mar oscuro, tierra gris- y nodos, que al bajar estalla en cubos 3D
// y los cubos se reunen en un cubo grande con el rotulo en medio. El mapa se
// sirve desde el propio sitio (assets/), sin CDN.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ = '/home/user/nerium';
const T = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp'};
const pedidos = [];
const srv = http.createServer((q, r) => { let f = decodeURIComponent(q.url.split('?')[0]); if (f.endsWith('/')) f += 'index.html';
  pedidos.push(f); const p = path.join(RAIZ, f);
  if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end() }
  r.writeHead(200, {'content-type': T[path.extname(p)] || 'application/octet-stream'}); r.end(fs.readFileSync(p)) });
await new Promise(r => srv.listen(9046, r));
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
let ok = 0, mal = 0;
const di = (c, t) => { if (c) { ok++; console.log('  ok  ' + t) } else { mal++; console.log('  MAL ' + t) } };

for (const [W, H, mob] of [[1440, 900, 0], [430, 932, 1]]) {
  const ctx = await nav.newContext({ viewport:{ width:W, height:H }, isMobile:!!mob, hasTouch:!!mob });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://127.0.0.1:9046/', { waitUntil:'load' }); await pg.waitForTimeout(800);
  const lee = (p, espera = 1200) => pg.evaluate(async ({ p, espera }) => {
    const s = document.getElementById('xfade'), top0 = s.getBoundingClientRect().top + scrollY;
    scrollTo(0, Math.round(top0 + p * (s.offsetHeight - innerHeight)));
    await new Promise(r => setTimeout(r, espera));
    const cv = document.getElementById('xfCv'), c = document.createElement('canvas');
    c.width = cv.width >> 2; c.height = cv.height >> 2;
    const g = c.getContext('2d'); g.drawImage(cv, 0, 0, c.width, c.height);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let gris = 0, azul = 0, pintado = 0; const firma = [];
    const marca = new Uint8Array(c.width * c.height);
    for (let i = 0, q = 0; i < d.length; i += 4, q++) {
      const R = d[i], G = d[i+1], B = d[i+2];
      if (R + G + B > 60) { pintado++; marca[q] = 1 }
      if (Math.abs(R - G) < 14 && Math.abs(G - B) < 20 && R > 45 && R < 120) gris++;
      if (B > 150 && B > R * 1.6) azul++;
    }
    for (let k = 0; k < d.length; k += 4 * 97) firma.push(d[k] + d[k+1] + d[k+2]);
    let manchas = 0; const pila = [];
    for (let q = 0; q < marca.length; q++) { if (marca[q] !== 1) continue; manchas++; marca[q] = 2; pila.push(q);
      while (pila.length) { const e = pila.pop(), ex = e % c.width;
        for (const v of [e - 1, e + 1, e - c.width, e + c.width]) {
          if (v < 0 || v >= marca.length || (v === e - 1 && ex === 0) || (v === e + 1 && ex === c.width - 1)) continue;
          if (marca[v] === 1) { marca[v] = 2; pila.push(v) } } } }
    const w = document.querySelector('.xf-word'), wr = w.getBoundingClientRect(), st = document.getElementById('xfStage');
    return { gris: gris / (c.width * c.height), azul, manchas, firma, lit: st.classList.contains('lit'),
             texto: [wr.left + wr.width / 2 - innerWidth / 2, wr.top + wr.height / 2 - innerHeight / 2].map(Math.round),
             color: getComputedStyle(w).color };
  }, { p, espera });
  const dif = (a, b) => a.firma.reduce((s, v, i) => s + (v !== b.firma[i] ? 1 : 0), 0) / a.firma.length;
  const ini = await pg.evaluate(async () => { const s = document.getElementById('xfade');
    scrollTo(0, Math.round(s.getBoundingClientRect().top + scrollY)); await new Promise(r => setTimeout(r, 900));
    return +getComputedStyle(document.getElementById('xfEsq')).opacity });
  di(ini > 0.9, W + 'x' + H + ' · la entrada sigue: «One chain, four layers.» con «Nereum» detras (opacidad ' + ini + ')');
  const g1 = await lee(0.34), g2 = await lee(0.34, 700);
  di(g1.gris > 0.03 && g1.azul > 6 && g1.lit, W + 'x' + H + ' · de las persianas sale el globo, con tierra gris, nodos azules y el rotulo ya encendido (' + Math.round(g1.gris * 100) + ' % gris, ' + g1.azul + ' px azules)');
  di(dif(g1, g2) > 0.01, W + 'x' + H + ' · y gira solo, sin tocar el scroll (' + Math.round(dif(g1, g2) * 100) + ' % cambia)');
  const e = await lee(0.66);
  di(e.manchas >= 40 && e.gris < g1.gris * 0.5, W + 'x' + H + ' · al bajar estalla: muchos cubos sueltos (' + e.manchas + ') y ya no hay globo');
  const f = await lee(0.96);
  di(f.lit && Math.abs(f.texto[0]) <= 4 && Math.abs(f.texto[1]) <= 4,
     W + 'x' + H + ' · al final el rotulo se enciende en el centro, dentro del cubo (' + f.texto.join(', ') + ')');
  di(f.manchas >= 1, W + 'x' + H + ' · y el cubo grande esta dibujado');
  di(errs.length === 0, W + 'x' + H + ' · sin errores de pagina' + (errs.length ? ': ' + errs[0] : ''));
  await ctx.close();
}
di(pedidos.includes('/assets/globo.js') && pedidos.includes('/assets/paises-110m.json'),
   'el mapa se sirve desde el propio sitio (assets/globo.js y assets/paises-110m.json)');
await nav.close(); srv.close();
console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
process.exit(mal ? 1 : 0);
