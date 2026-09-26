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
/* EL MEDIO NO SE REPITE EN SU PROPIO TITULAR. Esto es al reves de lo que
   defendia la version anterior de esta prueba, y el cambio es a proposito:
   en el video el medio tiene COLUMNA, asi que volver a nombrarlo en el
   titular es decir dos veces lo mismo en la misma fila y comerse el ancho
   que necesita la noticia. Los cuatro titulares de ahora son los del
   video, letra por letra. */
di(fsx.slice(0,3).every(f => !f.tit.toLowerCase().includes(f.fuente.toLowerCase())),
   'ningun titular repite el nombre de su medio: para eso esta la columna');
di(fsx[3].fuente.toLowerCase() === 'announcement', 'y la cuarta la firma la casa');

/* LOS TITULARES NO SE TOCAN. Estan traducidos a doce idiomas con la cadena
   inglesa como clave: cambiar una coma aqui deja doce ficheros mintiendo.
   Esta comprobacion es el unico sitio donde eso salta antes de publicar. */
const dicc = JSON.parse(fs.readFileSync(path.join(RAIZ,'i18n/es.json'),'utf8'));
const huerfanos = fsx.map(f => f.tit).filter(t => !(t in dicc));
di(huerfanos.length === 0,
   'los cuatro titulares siguen siendo claves del traductor' +
   (huerfanos.length ? ' — falta: «' + huerfanos[0].slice(0,46) + '…»' : ''));

// ── la trama de doce columnas ──
const rej = await pg.evaluate(() => {
  const e = document.querySelector('#press .prs-tr');
  if (!e) return { hay:false };
  const c = getComputedStyle(e);
  const m = /rgba\(([^)]+)\)/.exec(c.backgroundImage || '');
  const v = m ? m[1].split(',').map(Number) : null;
  const caja = e.getBoundingClientRect(), sec = document.getElementById('press').getBoundingClientRect();
  return { hay: /repeating-linear-gradient/.test(c.backgroundImage || ''),
           alfa: v && v.length > 3 ? v[3] : 1,
           canal: Math.round(caja.left - sec.left),
           altaEntera: Math.round(caja.height) >= Math.round(sec.height) - 2 };
});
di(rej.hay, 'la seccion lleva su trama de columnas');
di(rej.alfa <= 0.06, 'y es un susurro, no una jaula (alfa ' + rej.alfa + ')');
di(rej.canal === 12, 'con el canal de 12 px del video (' + rej.canal + ')');
/* la trama sube hasta el titular: en el video las columnas cruzan la seccion
   entera, no solo la tabla. Es lo que hace que el titular se lea posado
   sobre un registro y no flotando encima de el. */
di(rej.altaEntera, 'y cruza la seccion entera, tambien por detras del titular');

// ── las medidas de la fila, contra las del video ──
const geo = await pg.evaluate(() => {
  const f = document.querySelectorAll('.prs-f')[0];
  const r = f.getBoundingClientRect();
  const x = e => Math.round(f.querySelector(e).getBoundingClientRect().left - r.left);
  const g = f.querySelector('.prs-go').getBoundingClientRect();
  return { alto: Math.round(r.height), ancho: Math.round(r.width),
           col: +( (x('.prs-t')) / (r.width/12) ).toFixed(2),
           caja: Math.round(g.width),
           margen: Math.round(r.right - g.right) };
});
/* 121 px de alto sobre 1420 de ancho: 8,38 %. Se comprueba la PROPORCION y
   no el pixel, que la pagina se mira en mil anchos distintos. */
di(Math.abs(geo.alto / geo.ancho - 0.0852) < 0.012,
   'la fila guarda la proporcion del video (' + geo.alto + ' sobre ' + geo.ancho + ')');
di(Math.abs(geo.col - 3) < 0.15, 'el titular arranca en la cuarta columna (' + geo.col + ')');
di(geo.caja >= 44, 'la caja de salida no baja de 44 px, que es lo que mide un dedo (' + geo.caja + ')');

/* ── LAS DOS EXCEPCIONES DE ESTA SECCION, ATADAS AQUI ──
   La prensa se sale de dos reglas de la pagina, y las dos a proposito. Si
   solo se quitan de las pruebas que las exigian, manana son un descuido
   que nadie recuerda haber tomado. Asi que se afirman por el lado bueno:

   1. SUELO PLANO. Las demas bandas llevan degradados y grano -lo pide
      «probar_pagina» y lo mide «probar_giro»-. Esta no: con luz encima, la
      trama de columnas al 4 % deja de leerse, y la trama es la seccion.
   2. FUERA DE LA COLUMNA DE LA PAGINA. Las demas viven en «.wrap»
      -min(1360px, 100% - 64px)-. Esta llega al filo menos 12 px, porque una
      rejilla que se para antes del borde no se lee como registro. Es el
      unico sitio de la pagina donde el borde izquierdo no coincide, y por
      eso tuvo que salir de la referencia de «probar_ruta». */
const exc = await pg.evaluate(() => {
  const s = document.getElementById('press'), c = getComputedStyle(s);
  const w = s.querySelector('.prs-w');
  return { img: c.backgroundImage, col: c.backgroundColor,
           canal: Math.round(w.getBoundingClientRect().left - s.getBoundingClientRect().left),
           wraps: s.querySelectorAll('.wrap').length };
});
di(exc.img === 'none' && exc.col === 'rgb(3, 4, 9)',
   'el suelo de la prensa es plano y negro, sin degradados ni grano (' + exc.col + ')');
di(exc.canal === 12 && exc.wraps === 0,
   'y la seccion vive fuera de la columna de la pagina, a 12 px del filo (' + exc.canal + ')');

/* ── LA FILA SE ABRE SOLA AL BAJAR ──
   En un telefono no hay raton que pasar, asi que sin esto las cuatro filas
   se quedan cerradas y el gesto que sostiene la seccion no existe en la
   mitad de las pantallas. Se comprueba colocando cada fila en el centro de
   la pantalla y mirando que se abra ELLA y solo ella: dos filas abiertas a
   la vez es el fallo que se busca, no una menos. */
for (const i of [0, 1, 2, 3]) {
  await pg.evaluate(k => {
    const f = document.querySelectorAll('.prs-f')[k], c = f.getBoundingClientRect();
    scrollTo(0, scrollY + c.top + c.height / 2 - innerHeight / 2);
  }, i);
  await pg.waitForTimeout(420);
  const s = await pg.evaluate(() => [...document.querySelectorAll('.prs-f')]
    .map(f => f.classList.contains('sel')));
  di(s.filter(Boolean).length === 1 && s[i],
     'al bajar, la fila ' + (i + 1) + ' se abre sola al cruzar el centro [' +
     s.map(v => v ? '1' : '0').join('') + ']');
}

// ── al pasar por encima: la fila se DESCUBRE, no se ilumina ──
/* Se mete el raton en la lista ANTES de medir el reposo. Si no, la que se
   abrio sola al bajar sigue abierta y «antes» mide una fila ya encendida:
   la comprobacion pasaria sin comprobar nada, y solo por donde haya caido
   el scroll. Ademas esto mismo afirma la otra mitad de la regla: mientras
   el raton esta dentro, manda el raton y la seleccion automatica se va. */
await pg.mouse.move(40, 40);
await pg.locator('.prs-f').nth(0).hover();
await pg.waitForTimeout(600);
const soloRaton = await pg.evaluate(() => [...document.querySelectorAll('.prs-f')]
  .map(f => f.classList.contains('sel')).filter(Boolean).length);
di(soloRaton === 0, 'con el raton dentro manda el raton: no quedan dos filas abiertas');

const antes = await pg.evaluate(() => {
  const f = document.querySelectorAll('.prs-f')[2];
  return { tinta: getComputedStyle(f.querySelector('.prs-t')).color,
           barrido: getComputedStyle(f, '::before').transform };
});
await pg.locator('.prs-f').nth(2).hover();
await pg.waitForTimeout(700);
const hov = await pg.evaluate(() => {
  const f = document.querySelectorAll('.prs-f')[2];
  const b = getComputedStyle(f, '::before');
  const rgb = s => (s.match(/[\d.]+/g) || []).slice(0,3).map(Number);
  const f8 = v => { v/=255; return v<=.03928 ? v/12.92 : Math.pow((v+.055)/1.055,2.4) };
  const L = c => .2126*f8(c[0]) + .7152*f8(c[1]) + .0722*f8(c[2]);
  const azul = rgb(b.backgroundColor), tinta = rgb(getComputedStyle(f.querySelector('.prs-t')).color);
  const l1 = L(azul), l2 = L(tinta);
  return { barrido: b.transform, azul: b.backgroundColor,
           tinta: getComputedStyle(f.querySelector('.prs-t')).color,
           num: getComputedStyle(f.querySelector('.prs-n')).color,
           medio: getComputedStyle(f.querySelector('.prs-s')).color,
           razon: +((Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05)).toFixed(2),
           giro: getComputedStyle(f.querySelector('.prs-go')).transform };
});
di(/matrix\(1,/.test(hov.barrido) && !/matrix\(1,/.test(antes.barrido),
   'al pasar por encima el relleno recorre la fila entera');
/* El titular NO cambia de color al pasar por encima, y eso si es del video:
   lo que se mueve es el fondo. La diferencia con el video es que ahi la
   tinta es negra -1,07:1, invisible hasta que pasas el raton, y en un
   telefono no hay raton- y aqui es blanca. Asi que se comprueban las dos
   cosas: que no cambie, y que sea blanca. */
di(hov.tinta === antes.tinta,
   'el titular no cambia de color al pasar por encima: lo que se mueve es el fondo');
di(hov.tinta === 'rgb(255, 255, 255)', 'y es blanco, que es lo que se pidio');
di(hov.num === 'rgb(255, 255, 255)' && hov.medio === 'rgb(255, 255, 255)',
   'el numero y el medio si pasan a blanco');
di(hov.razon >= 4.5,
   'y se lee sobre el azul (' + hov.razon + ':1, minimo 4,5)');
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
