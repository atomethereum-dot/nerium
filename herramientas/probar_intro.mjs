// probar_intro: la intro de la portada (p102), un video de marca renderizado.
// El navegador de las pruebas (navigator.webdriver) no la ve, para que el
// resto de la bateria no tenga que esperarla; aqui se pide con
// «window.__conIntro». Se comprueba lo que se VE en cada tiempo:
//   · en escritorio el video horizontal y en telefono el vertical, y que suena
//     (avanza) con la pagina aun sin estar lista;
//   · a medio camino sigue, y al final la intro se va y la pagina queda lista;
//   · tocar la cierra; si el video no llega, no hay intro y la pagina no espera;
//   · sin pedirla, o con movimiento reducido, no hay intro ni se baja el video.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ = '/home/user/nerium';
const T = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp','.jpg':'image/jpeg','.ico':'image/x-icon','.mp4':'video/mp4','.webm':'video/webm'};
const pedidos = [];
const srv = http.createServer((q, r) => { let f = decodeURIComponent(q.url.split('?')[0]); if (f.endsWith('/')) f += 'index.html';
  if (/intro-/.test(f)) pedidos.push(f);
  const p = path.join(RAIZ, f); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end() }
  r.writeHead(200, {'content-type': T[path.extname(p)] || 'application/octet-stream'}); r.end(fs.readFileSync(p)) });
await new Promise(r => srv.listen(0, r));
const U = 'http://127.0.0.1:' + srv.address().port + '/';
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox','--autoplay-policy=no-user-gesture-required'] });
let ok = 0, mal = 0;
const di = (c, t) => { if (c) { ok++; console.log('  ok  ' + t) } else { mal++; console.log('  MAL ' + t) } };
const estado = pg => pg.evaluate(() => {
  const pre = document.getElementById('pre'), v = document.getElementById('preV');
  if (!pre) return { hay:false, listo: document.body.classList.contains('ready') };
  return { hay:true, listo: document.body.classList.contains('ready'), src: v.currentSrc || v.src, t: v.currentTime,
    on: v.classList.contains('on'), op: +getComputedStyle(v).opacity, fit: getComputedStyle(v).objectFit,
    cubre: (() => { const r = v.getBoundingClientRect(); return r.width >= innerWidth - 1 && r.height >= innerHeight - 1 })() };
});

for (const [w, h, m, tag, cual] of [[1440, 900, false, 'escritorio', 'intro-esc'], [390, 844, true, 'telefono', 'intro-tel']]) {
  const ctx = await nav.newContext({ viewport:{ width:w, height:h }, isMobile:m, hasTouch:m });
  await ctx.addInitScript(() => { window.__conIntro = true });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  /* se mide por el reloj del propio video (window.__introT, en segundos) */
  await pg.goto(U, { waitUntil:'commit' });
  const espera = s => pg.waitForFunction(s => (window.__introT || 0) >= s || !document.getElementById('pre'), s, { timeout:30000 });
  await espera(0.6);
  const a = await estado(pg);
  di(a.hay && a.src.includes(cual) && a.on && a.op > .99 && !a.listo,
     tag + ': arranca el video ' + cual + ', a pantalla completa, y la pagina aun no esta lista (' + (a.src || '').split('/').pop() + (a.hay ? ', ' + [a.on, a.op, a.listo].join('/') : '') + ')');
  di(a.hay && a.fit === 'cover' && a.cubre, tag + ': el video cubre la ventana (object-fit: cover)');
  await espera(4.0);
  const b = await estado(pg);
  di(b.hay && b.t >= 4 && !b.listo, tag + ': a medio camino sigue avanzando (' + (b.t || 0).toFixed(2) + ' s)');
  await pg.waitForFunction(() => !document.getElementById('pre'), null, { timeout:30000 }).catch(() => {});
  const c = await estado(pg);
  di(!c.hay && c.listo, tag + ': al final, la intro se va y la pagina queda lista');
  di(errs.length === 0, tag + ': sin errores de pagina' + (errs.length ? ': ' + errs[0] : ''));
  await ctx.close();
}

{ // tocar la cierra
  const ctx = await nav.newContext({ viewport:{ width:1440, height:900 } });
  await ctx.addInitScript(() => { window.__conIntro = true });
  const pg = await ctx.newPage();
  await pg.goto(U, { waitUntil:'commit' });
  await pg.waitForFunction(() => (window.__introT || 0) > .3 || !document.getElementById('pre'), null, { timeout:20000 });
  await pg.mouse.click(700, 450); await pg.waitForTimeout(800);
  const e = await estado(pg);
  di(!e.hay && e.listo, 'un toque la cierra: en menos de un segundo la pagina esta lista');
  await ctx.close();
}
{ // si el video no llega, no hay intro y la pagina no espera
  const ctx = await nav.newContext({ viewport:{ width:1440, height:900 } });
  await ctx.addInitScript(() => { window.__conIntro = true });
  await ctx.route(/intro-/, r => r.abort());
  const pg = await ctx.newPage(); const t0 = Date.now();
  await pg.goto(U, { waitUntil:'commit' });
  await pg.waitForFunction(() => document.body && document.body.classList.contains('ready'), null, { timeout:15000 }).catch(() => {});
  const s = (Date.now() - t0) / 1000;
  await pg.waitForTimeout(700);
  const e = await estado(pg);
  di(!e.hay && e.listo && s < 3, 'sin video (red caida): la pagina queda lista sola (' + s.toFixed(1) + ' s)');
  await ctx.close();
}
{ // sin pedirla (navegador automatizado) y con movimiento reducido, no hay intro ni se baja el video
  for (const [o, t] of [[{}, 'sin pedirla'], [{ reducedMotion:'reduce' }, 'con movimiento reducido']]) {
    const ctx = await nav.newContext({ viewport:{ width:1440, height:900 }, ...o });
    if (t !== 'sin pedirla') await ctx.addInitScript(() => { window.__conIntro = true });
    pedidos.length = 0;
    const pg = await ctx.newPage(); await pg.goto(U, { waitUntil:'load' }); await pg.waitForTimeout(300);
    const e = await estado(pg);
    di(!e.hay && e.listo && pedidos.length === 0, t + ': no hay intro, no se pide el video y la pagina esta lista desde el principio');
    await ctx.close();
  }
}
await nav.close(); srv.close();
console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
process.exit(mal ? 1 : 0);
