// Las tarjetas de prensa y la marca en las tres paginas.
//
// La segunda parte esta aqui por un fallo real: al pasar el cubo de rombo a
// cuadrado, /whitepaper y /explorer se quedaron con el viejo, porque llevan el
// logotipo escrito dentro con sus propios ids de degradado y no usan el
// <symbol> del index. La marca era distinta en la home que en las otras dos y
// en pantalla no chirriaba, porque nunca se ven a la vez.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const RAIZ = '/home/user/nerium';
const TIPO = {'.html':'text/html','.svg':'image/svg+xml','.css':'text/css','.woff2':'font/woff2',
  '.png':'image/png','.jpg':'image/jpeg','.js':'text/javascript','.json':'application/json'};
const srv = http.createServer((q, r) => {
  let f = decodeURIComponent(q.url.split('?')[0]);
  let p = path.join(RAIZ, f);
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, {'content-type': TIPO[path.extname(p)] || 'application/octet-stream'});
  r.end(fs.readFileSync(p));
}).listen(8993);
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
let ok = 0, mal = 0;
const di = (b, t) => { if (b) { ok++; console.log('  ok  ' + t); } else { mal++; console.log('  MAL ' + t); } };

const ctx = await nav.newContext({ viewport:{width:1440,height:950} });
const pg = await ctx.newPage();
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('http://127.0.0.1:8993/', { waitUntil:'load' });
await pg.waitForTimeout(2600);
await pg.evaluate(() => document.getElementById('press').scrollIntoView());
await pg.waitForTimeout(1400);

const t = await pg.evaluate(() => [...document.querySelectorAll('.pcd')].map(c => {
  const s = getComputedStyle(c);
  const art = c.querySelector('.pcd-art'), body = c.querySelector('.pcd-body');
  const esq = [...c.querySelectorAll('.cn')].map(e => getComputedStyle(e).backgroundColor);
  return { borde: s.borderTopWidth, radio: parseFloat(s.borderRadius), fondo: s.backgroundColor,
           art: !!art, body: !!body,
           tag: !!(body && body.querySelector('.pcd-tag')),
           tit: !!(body && body.querySelector('.pcd-t')),
           orden: body ? [...body.children].map(x => x.className.split(' ')[0]).join('>') : '',
           tile: c.querySelectorAll('.cb-tile img.cb-logo').length,
           img: c.querySelectorAll('img.cb-logo').length,
           esqMacizas: esq.filter(v => v !== 'rgba(0, 0, 0, 0)' && v !== 'transparent').length };
}));
di(t.length === 4, 'las cuatro tarjetas siguen ahi (' + t.length + ')');
di(t.every(c => parseFloat(c.borde) >= 1), 'cada una es un panel con su filete');
di(t.every(c => c.radio >= 8), 'con las esquinas redondeadas (' + t[0].radio + 'px)');
di(t.every(c => c.art && c.body), 'con su figura arriba y su texto abajo');
di(t.every(c => c.tag && c.tit), 'el epigrafe y el titular, dentro del texto');
di(t.every(c => c.orden === 'pcd-tag>pcd-t'), 'y en ese orden: primero el rotulo');
di(t.every(c => c.esqMacizas === 0),
   'las esquinas ya no son cuadros azules macizos, son escuadras de 1 px');
di(t.every(c => c.img === c.tile), 'cada logotipo del medio, en su baldosa (' +
   t.map(c => c.img + '/' + c.tile).join(' ') + ')');

// el hueco entre la figura y el texto: la tarjeta tiene que tener un dentro
const sep = await pg.evaluate(() => {
  const c = document.querySelector('.pcd');
  return { linea: getComputedStyle(c.querySelector('.pcd-art')).borderBottomWidth,
           aire: parseFloat(getComputedStyle(c.querySelector('.pcd-body')).paddingLeft) };
});
di(parseFloat(sep.linea) >= 1, 'una linea separa la figura del texto');
di(sep.aire >= 14, 'y el texto respira dentro de la tarjeta (' + sep.aire + 'px)');
di(errs.length === 0, 'sin errores de pagina' + (errs.length ? ': ' + errs[0] : ''));
await ctx.close();

// ── el telefono ──
const ctx2 = await nav.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
const mo = await ctx2.newPage();
await mo.goto('http://127.0.0.1:8993/', { waitUntil:'load' }); await mo.waitForTimeout(2400);
di((await mo.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) === 0,
   'en el telefono no se sale nada por el lado');
await ctx2.close();

// ── la misma marca en las tres paginas ──
const CUBO = /M136\.00 136\.00 L536\.00 136\.00 L536\.00 536\.00 L136\.00 536\.00 Z/;
const ROMBO = /M53\.16 336\.00 L336\.00 53\.16/;
for (const [f, n] of [['index.html','la portada'], ['whitepaper/index.html','el whitepaper'],
                      ['explorer/index.html','el explorador']]) {
  const s = fs.readFileSync(path.join(RAIZ, f), 'utf8');
  di(CUBO.test(s) && !ROMBO.test(s), n + ' lleva el cubo de pie, no el rombo');
}
console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
await nav.close(); srv.close();
process.exit(mal ? 1 : 0);
