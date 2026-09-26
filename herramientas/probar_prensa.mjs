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

const ctx = await nav.newContext({ viewport:{width:1440,height:950}, deviceScaleFactor:1 });
const pg = await ctx.newPage();
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('http://127.0.0.1:8993/', { waitUntil:'load' });
await pg.waitForTimeout(2600);
await pg.evaluate(() => document.getElementById('press').scrollIntoView());
await pg.waitForTimeout(1400);
/* ══ LA PRENSA, EN TABLA ══════════════════════════════════════════════════
   Esta prueba defendia un carril de tarjetas con logotipos: cuantas habia,
   que el logo no se deshiciera, que las flechas movieran una tarjeta justa.
   Esa seccion ya no existe —ahora es una lista— asi que las comprobaciones
   viejas no se «arreglan»: se tiran y se escriben las del sitio nuevo. */

const fsx = await pg.evaluate(() => [...document.querySelectorAll('.prs-f')].map(f => {
  const n = f.querySelector('.prs-n'), s = f.querySelector('.prs-s'),
        t = f.querySelector('.prs-t'), g = f.querySelector('.prs-go');
  const c = getComputedStyle(f);
  return { href: f.getAttribute('href') || '', tag: f.tagName,
           num: n ? n.textContent.trim() : '', fuente: s ? s.textContent.trim() : '',
           tit: t ? t.textContent.replace(/\s+/g,' ').trim() : '',
           flecha: !!(g && g.querySelector('svg')),
           orden: [...f.children].map(e => e.className).join('>'),
           fondo: c.backgroundColor };
}));
di(fsx.length === 4, 'las cuatro noticias siguen ahi (' + fsx.length + ')');
di(fsx.every(f => f.tag === 'A' && /^https?:/.test(f.href)),
   'cada fila es un enlace de verdad, no un div que escucha clics');
di(fsx.map(f => f.num).join(' ') === 'P-01 P-02 P-03 P-04',
   'numeradas y en orden (' + fsx.map(f => f.num).join(' ') + ')');
di(fsx.every(f => f.fuente && f.tit && f.flecha),
   'cada una con su medio, su titular y su salida');
di(fsx.every(f => f.orden === 'prs-n>prs-s>prs-t>prs-go'),
   'y en ese orden: numero, medio, titular, salida');

/* EL MEDIO SALE DEL TITULAR, no de una etiqueta suelta: si algun dia se
   cambia un titular y se olvida la columna, quedan diciendo cosas distintas
   y nadie se entera. «Announcement» es el unico que no nombra a nadie,
   porque lo firma la casa. */
di(fsx.slice(0,3).every(f => f.tit.toLowerCase().includes(f.fuente.toLowerCase())),
   'el medio de cada fila es el que nombra su titular');
di(fsx[3].fuente.toLowerCase() === 'announcement', 'y la cuarta la firma la casa');

/* LOS TITULARES NO SE TOCAN. Estan traducidos a doce idiomas con la cadena
   inglesa como clave: cambiar una coma aqui deja doce ficheros mintiendo.
   Esta comprobacion es el unico sitio donde eso salta antes de publicar. */
const dicc = JSON.parse(fs.readFileSync(path.join(RAIZ,'i18n/es.json'),'utf8'));
const huerfanos = fsx.map(f => f.tit).filter(t => !(t in dicc));
di(huerfanos.length === 0,
   'los cuatro titulares siguen siendo claves del traductor' +
   (huerfanos.length ? ' — falta: «' + huerfanos[0].slice(0,46) + '…»' : ''));

// ── la rejilla: se ve al mirarla, no antes ──
const rej = await pg.evaluate(() => {
  const c = getComputedStyle(document.querySelector('.prs'), '::before');
  const m = /rgba\(([^)]+)\)/.exec(c.backgroundImage || '');
  const v = m ? m[1].split(',').map(Number) : null;
  return { hay: /repeating-linear-gradient/.test(c.backgroundImage || ''),
           alfa: v && v.length > 3 ? v[3] : 1 };
});
di(rej.hay, 'la tabla lleva su rejilla de columnas');
di(rej.alfa <= 0.08, 'y es un susurro, no una jaula (alfa ' + rej.alfa + ')');

// ── al pasar por encima: la fila se enciende entera ──
const fondoAntes = fsx[2].fondo;
await pg.locator('.prs-f').nth(2).hover();
await pg.waitForTimeout(600);
const hov = await pg.evaluate(() => {
  const f = document.querySelectorAll('.prs-f')[2];
  const g = f.querySelector('.prs-go');
  const c = getComputedStyle(f), t = getComputedStyle(f.querySelector('.prs-t'));
  const rgb = s => (s.match(/[\d.]+/g) || []).slice(0,3).map(Number);
  const f8 = v => { v/=255; return v<=.03928 ? v/12.92 : Math.pow((v+.055)/1.055,2.4) };
  const L = c3 => .2126*f8(c3[0]) + .7152*f8(c3[1]) + .0722*f8(c3[2]);
  const l1 = L(rgb(c.backgroundColor)), l2 = L(rgb(t.color));
  return { fondo: c.backgroundColor, texto: t.color,
           razon: +((Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)).toFixed(2),
           giro: getComputedStyle(g).transform };
});
di(hov.fondo !== fondoAntes && /^rgb/.test(hov.fondo), 'al pasar por encima se pinta la fila entera');
di(hov.texto === 'rgb(255, 255, 255)', 'y el titular pasa a blanco');
di(hov.razon >= 4.5, 'con contraste de sobra sobre el azul (' + hov.razon + ':1, minimo 4,5)');
/* 45 grados son 0,7071 en la matriz. El cuadro se vuelve rombo, que es la
   marca de la casa: si alguien quita ese giro, la flecha se queda en una caja
   y el gesto deja de decir nada. */
di(/matrix\(0\.707/.test(hov.giro), 'y el cuadro de la flecha se vuelve rombo');

// ── con el teclado se llega igual ──
const foco = await pg.evaluate(() => {
  const f = document.querySelectorAll('.prs-f')[0];
  f.focus();
  const c = getComputedStyle(f);
  return { esEl: document.activeElement === f,
           marca: (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0) ||
                  (c.boxShadow && c.boxShadow !== 'none') ||
                  c.backgroundColor !== 'rgba(0, 0, 0, 0)' };
});
di(foco.esEl && foco.marca, 'con el teclado se llega a las filas y se ve donde estas');

di(errs.length === 0, 'sin errores de pagina' + (errs.length ? ': ' + errs[0] : ''));
// ── el telefono ──
const ctx2 = await nav.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
const mo = await ctx2.newPage();
await mo.goto('http://127.0.0.1:8993/', { waitUntil:'load' }); await mo.waitForTimeout(2400);
di((await mo.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) === 0,
   'en el telefono no se sale nada por el lado');
await ctx2.close();

// ── la misma marca en las tres paginas ──
// La marca va de canto, en rombo (GIRO -45 en herramientas/logo/logo.py).
// Esto comprueba las tres paginas a la vez porque el whitepaper y el
// explorador llevan el logotipo escrito DENTRO, con sus propios ids de
// degradado: no comparten el <symbol> del index, asi que es justo donde se
// queda una atras cuando la marca cambia.
const CUBO = /M136\.00 136\.00 L536\.00 136\.00 L536\.00 536\.00 L136\.00 536\.00 Z/;
const ROMBO = /M53\.16 336\.00 L336\.00 53\.16/;
for (const [f, n] of [['index.html','la portada'], ['whitepaper/index.html','el whitepaper'],
                      ['explorer/index.html','el explorador']]) {
  const s = fs.readFileSync(path.join(RAIZ, f), 'utf8');
  di(ROMBO.test(s) && !CUBO.test(s), n + ' lleva el rombo, no el cubo de pie');
}
console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
await nav.close(); srv.close();
process.exit(mal ? 1 : 0);
