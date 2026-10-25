// probar_intro: la intro de la portada (p102), como animacion de marca.
// El navegador de las pruebas (navigator.webdriver) no la ve, para que el
// resto de la bateria no tenga que esperarla; aqui se pide con
// «window.__conIntro». Se comprueba lo que se VE en cada tiempo:
//   · al empezar, la piramide de color en el centro y sola;
//   · a medio camino, la piramide en linea, la linea -la barra- avanzando y
//     contando entre 1 y 99, y las letras trazandose;
//   · al final, la intro fuera y la pagina lista;
//   · tocar la lleva al final; sin pedirla, o con movimiento reducido, no hay intro.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ = '/home/user/nerium';
const T = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp','.jpg':'image/jpeg','.ico':'image/x-icon'};
const srv = http.createServer((q, r) => { let f = decodeURIComponent(q.url.split('?')[0]); if (f.endsWith('/')) f += 'index.html';
  const p = path.join(RAIZ, f); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end() }
  r.writeHead(200, {'content-type': T[path.extname(p)] || 'application/octet-stream'}); r.end(fs.readFileSync(p)) });
await new Promise(r => srv.listen(0, r));
const U = 'http://127.0.0.1:' + srv.address().port + '/';
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
let ok = 0, mal = 0;
const di = (c, t) => { if (c) { ok++; console.log('  ok  ' + t) } else { mal++; console.log('  MAL ' + t) } };
const estado = pg => pg.evaluate(() => {
  const pre = document.getElementById('pre');
  if (!pre) return { hay:false, listo: document.body.classList.contains('ready') };
  const op = e => +getComputedStyle(e).opacity * +(e.getAttribute('opacity') ?? 1);
  const letras = [...document.querySelectorAll('#preTrazo .pre-c')].map(c => parseFloat(getComputedStyle(c).strokeDashoffset));
  const r = document.getElementById('preSvg').getBoundingClientRect();
  return { hay:true, listo: document.body.classList.contains('ready'),
    logo: op(document.getElementById('preLogo')), linea: op(document.getElementById('preLinea')),
    n: document.getElementById('preN').textContent, dibujadas: letras.filter(d => d < 0.02).length, letras: letras.length,
    centro: [r.left + r.width / 2, innerWidth / 2] };
});

for (const [w, h, m, tag] of [[1440, 900, false, 'escritorio'], [390, 844, true, 'telefono']]) {
  const ctx = await nav.newContext({ viewport:{ width:w, height:h }, isMobile:m, hasTouch:m });
  await ctx.addInitScript(() => { window.__conIntro = true });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  /* se mide por el reloj de la propia intro (window.__introT, en segundos),
     no por el de la carga: la intro arranca antes de que termine de cargar */
  await pg.goto(U, { waitUntil:'commit' });
  const espera = s => pg.waitForFunction(s => (window.__introT || 0) >= s || !document.getElementById('pre'), s, { timeout:20000 });
  await espera(0.42);
  const a = await estado(pg);
  di(a.hay && a.logo > 0.5 && !a.listo, tag + ': al empezar, la piramide de color, y la pagina aun no esta lista (' + (a.logo || 0).toFixed(2) + ')');
  await espera(1.65);
  const b = await estado(pg);
  const n = parseInt(b.n, 10);
  di(b.hay && b.logo < 0.05 && b.linea > 0.5 && n > 0 && n < 100,
     tag + ': a medio camino, la piramide en linea y la barra avanzando y contando (' + b.n + ')');
  di(b.dibujadas > 0 && b.dibujadas < b.letras, tag + ': y las letras se van trazando (' + b.dibujadas + ' de ' + b.letras + ' trazos)');
  await espera(3.5); await pg.waitForTimeout(900);
  const c = await estado(pg);
  di(!c.hay && c.listo, tag + ': al final, la intro se va y la pagina queda lista');
  di(errs.length === 0, tag + ': sin errores de pagina' + (errs.length ? ': ' + errs[0] : ''));
  await ctx.close();
}

{ // tocar la lleva al zoom del final
  const ctx = await nav.newContext({ viewport:{ width:1440, height:900 } });
  await ctx.addInitScript(() => { window.__conIntro = true });
  const pg = await ctx.newPage();
  await pg.goto(U, { waitUntil:'load' }); await pg.waitForTimeout(700);
  await pg.mouse.click(700, 450); await pg.waitForTimeout(1300);
  const e = await estado(pg);
  di(!e.hay && e.listo, 'un toque la lleva al final: en poco mas de un segundo la pagina esta lista');
  await ctx.close();
}
{ // sin pedirla (navegador automatizado) y con movimiento reducido, no hay intro
  for (const [o, t] of [[{}, 'sin pedirla'], [{ reducedMotion:'reduce' }, 'con movimiento reducido']]) {
    const ctx = await nav.newContext({ viewport:{ width:1440, height:900 }, ...o });
    if (t !== 'sin pedirla') await ctx.addInitScript(() => { window.__conIntro = true });
    const pg = await ctx.newPage(); await pg.goto(U, { waitUntil:'load' }); await pg.waitForTimeout(300);
    const e = await estado(pg);
    di(!e.hay && e.listo, t + ': no hay intro y la pagina esta lista desde el principio');
    await ctx.close();
  }
}
await nav.close(); srv.close();
console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
process.exit(mal ? 1 : 0);
