// El giro: el relieve de las bandas y el umbral de la ronda.
//
// Dos cosas que antes no se podian comprobar porque no existian:
//
//   · que las nueve bandas claras hayan dejado de ser UNA losa. No vale mirar
//     el CSS: hay que medir el pixel. Dos medidas —cuanto relieve tiene cada
//     banda por dentro, y cuanto se distinguen dos bandas claras seguidas—;
//   · que el umbral sea de verdad un mando de scroll y no un adorno: que la
//     escena CAMBIE al avanzar, que empiece oscura y acabe en el suelo de la
//     ronda, y que la cifra sea la misma que dicen los otros tres sitios.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const RAIZ = '/home/user/nerium';
const TIPO = {'.html':'text/html','.svg':'image/svg+xml','.css':'text/css','.woff2':'font/woff2',
  '.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.js':'text/javascript','.json':'application/json'};
const srv = http.createServer((q, r) => {
  let p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end() }
  r.writeHead(200, {'content-type': TIPO[path.extname(p)] || 'application/octet-stream'});
  r.end(fs.readFileSync(p));
}).listen(8987);
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
let ok = 0, mal = 0;
const di = (b, t) => { if (b) { ok++; console.log('  ok  ' + t) } else { mal++; console.log('  MAL ' + t) } };
const luz = (r, g, b) => (0.2126*r + 0.7152*g + 0.0722*b) / 255;
// media y desviacion de la claridad de un recorte, leyendo el PNG en la pagina
async function franja(pg, caja) {
  const b64 = (await pg.screenshot({ clip: caja })).toString('base64');
  return pg.evaluate(async (s) => {
    const im = new Image();
    await new Promise(r => { im.onload = r; im.src = 'data:image/png;base64,' + s });
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let su = 0, n = 0; const v = [];
    for (let i = 0; i < d.length; i += 4) {
      const L = (0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2]) / 255;
      v.push(L); su += L; n++;
    }
    const m = su / n;
    let s2 = 0, oscuro = 0, claro = 0;
    for (const L of v) { s2 += (L - m) * (L - m); if (L < 0.15) oscuro++; if (L > 0.60) claro++ }
    return { medio: m, desv: Math.sqrt(s2 / n), oscuro: oscuro / n, claro: claro / n };
  }, b64);
}

const pg = await (await nav.newContext({ viewport:{width:1440, height:900}, deviceScaleFactor:1 })).newPage();
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('http://127.0.0.1:8987/', { waitUntil:'load' });
await pg.waitForTimeout(1600);

/* ── 1 · el relieve: las bandas claras ya no son una losa ─────────────────── */
// Se mide una franja de fondo LIMPIA de cada banda —el aire de debajo del
// titular—, no la banda entera: con tarjetas dentro se estaria midiendo las
// tarjetas.
const CLARAS = ['network', 'press', 'thesis', 'solutions'];
const medidas = {};
for (const id of CLARAS) {
  await pg.evaluate(k => {
    const s = document.getElementById(k) || document.querySelector('.' + k);
    s.scrollIntoView();
  }, id);
  await pg.waitForTimeout(700);
  /* Se esconde el CONTENIDO de la banda y se deja su fondo. Sin esto no se
     mide el fondo: se mide lo que hay encima. La primera version muestreaba
     dos recortes «de margen» y en tres de las cuatro bandas caian sobre
     tarjetas y titulares, asi que la comprobacion daba numeros grandes y
     seguia dandolos con el modulo quitado. Solo una de las cuatro medía algo.
     visibility:hidden y no display:none, que display cambia la altura y con
     ella el encuadre. */
  await pg.evaluate(k => {
    const s = document.getElementById(k) || document.querySelector('.' + k);
    for (const h of s.children) h.style.visibility = 'hidden';
  }, id);
  await pg.waitForTimeout(150);
  medidas[id] = { alto: await franja(pg, { x: 200, y: 60,  width: 1040, height: 150 }),
                  bajo: await franja(pg, { x: 200, y: 640, width: 1040, height: 150 }) };
  await pg.evaluate(k => {
    const s = document.getElementById(k) || document.querySelector('.' + k);
    for (const h of s.children) h.style.visibility = '';
  }, id);
}
/* Lo que se mide es el GRADO, no la varianza. Aqui hubo una rejilla de
   ingenieria y la comprobacion miraba la desviacion tipica de un recorte, que
   es lo que sube una malla. La malla se fue —a pantalla completa y repetida
   por nueve bandas lo que salia era papel de cuaderno—, y con ella se habria
   ido la comprobacion si midiera lo mismo.
   Lo que ahora hace el trabajo es la LUZ: la banda esta iluminada arriba y se
   hunde abajo. Eso es lo que separa un fondo compuesto de un color plano, y
   eso es lo que se mide. Con el modulo quitado los dos extremos coinciden y
   el salto se va a cero. */
const grado = k => Math.abs(medidas[k].alto.medio - medidas[k].bajo.medio);
/* Se afirma sobre las bandas de fondo LISO. «network» y «thesis» traen arte
   propio en el encuadre —la tira de logotipos y la marquesina de al lado—, asi
   que su numero es alto con modulo y sin el: informan, pero no discriminan, y
   colgar la comprobacion de ellas seria fingir que mide mas de lo que mide.
   Medido quitando el modulo: press 0,115 → 0,000 y solutions 0,087 → 0,001. */
const LISAS = ['press', 'solutions'];
di(LISAS.every(k => grado(k) >= 0.020),
   'cada banda lisa esta graduada, no es un color plano (salto arriba-abajo ' +
   CLARAS.map(k => k + ' ' + grado(k).toFixed(3)).join(' / ') + ')');
/* Y dos claras SEGUIDAS tienen que distinguirse una de otra. Esto se mide en
   el SUELO, no en un recorte de pantalla: el primer intento comparaba una
   franja de cada banda a la misma altura y daba 0,004, porque las dos llevan
   la misma luz de escena por arriba y ahi se igualan. Lo que las separa es el
   fondo, y el fondo se pregunta. */
const suelos = await pg.evaluate(() => {
  const lee = id => {
    const s = document.getElementById(id) || document.querySelector('.' + id);
    return { css: getComputedStyle(s).backgroundColor, dice: s.getAttribute('data-bg') };
  };
  return { network: lee('network'), press: lee('press'),
           security: lee('security'), token: lee('token'),
           team: lee('team'), join: lee('join') };
});
/* Lee hex Y rgb(): la primera version tiraba de match(/\d+/g) para las dos, y
   sobre «#E4EAF4» eso saca los digitos sueltos —4, 4, 4— en vez del color.
   Daba seis bandas «mal» estando las seis bien. El instrumento antes que la
   pagina, otra vez. */
const rgb01 = t => {
  const s = String(t).trim();
  if (s[0] === '#') return [1, 3, 5].map(i => parseInt(s.slice(i, i + 2), 16));
  return (s.match(/\d+/g) || []).slice(0, 3).map(Number);
};
const claro01 = t => { const m = rgb01(t);
                       return (0.2126*m[0] + 0.7152*m[1] + 0.0722*m[2]) / 255 };
const PEGADAS = [['network','press'], ['security','token'], ['team','join']];
for (const [a, b] of PEGADAS) {
  const d = Math.abs(claro01(suelos[a].css) - claro01(suelos[b].css));
  di(d >= 0.025, a + ' y ' + b + ', que van pegadas, no comparten suelo (salto ' + d.toFixed(3) + ')');
}
// Y el suelo pintado tiene que seguir siendo el que la banda anuncia, o vuelve
// la franja del lienzo entre secciones.
{
  const malas = Object.entries(suelos)
    .filter(([k, s]) => claro01(s.css).toFixed(3) !== claro01(s.dice).toFixed(3))
    .map(([k, s]) => k + ' pinta ' + s.css + ' y anuncia ' + s.dice);
  di(malas.length === 0,
     'y cada una sigue pintando el suelo que anuncia en su data-bg' +
     (malas.length ? ' — ' + malas.join('; ') : ''));
}

/* ── 2 · el umbral ────────────────────────────────────────────────────────── */
const caja = await pg.evaluate(() => {
  const u = document.querySelector('.umb'); if (!u) return null;
  const r = u.getBoundingClientRect();
  return { top: r.top + scrollY, alto: r.height, vh: innerHeight,
           antesDeLaRonda: !!(u.nextElementSibling && u.nextElementSibling.id === 'presale') };
});
di(!!caja, 'el umbral esta puesto');
di(caja && caja.antesDeLaRonda, 'y esta justo delante de la ronda, no en otro sitio');
di(caja && caja.alto > caja.vh * 1.5,
   'con recorrido de scroll para operarlo (' + (caja ? Math.round(caja.alto / caja.vh * 100) / 100 : 0) + ' pantallas)');

const cuadros = [];
for (const p of [0.05, 0.30, 0.50, 0.72, 0.99]) {
  await pg.evaluate(v => scrollTo(0, v), Math.round(caja.top + p * (caja.alto - caja.vh)));
  await pg.waitForTimeout(420);
  cuadros.push({ p, ...await franja(pg, { x: 420, y: 150, width: 600, height: 600 }) });
}
// Que la escena AVANCE: si el lienzo estuviera parado, los cinco cuadros
// darian la misma media. El fallo que esto caza es el peor de todos —una
// animacion que no se mueve pasa desapercibida en una captura suelta—.
/* Se midio la CLARIDAD media mientras la pagina era clara: la plancha era
   tinta oscura sobre papel, y el recorrido de la escena era el recorrido del
   brillo —0,45 de sobra—. En negro ya no: la plancha y la pagina de debajo
   comparten suelo y la media apenas se mueve 0,08 aunque la escena entera
   pase por delante. Medir eso seria medir el fondo, no la animacion.
   Lo que de verdad cambia es CUANTO de la pantalla ocupa la cifra encendida y
   cuanta estructura hay dibujada, asi que se toma el mayor de los tres
   recorridos. Con la escena congelada los cinco cuadros son el mismo y los
   tres se van a cero a la vez; medido asi: 0,20 moviendose, 0,00 parada. */
const rango = f => Math.max(...cuadros.map(f)) - Math.min(...cuadros.map(f));
const recorrido = Math.max(rango(c => c.medio), rango(c => c.claro), rango(c => c.desv));
di(recorrido >= 0.10,
   'la escena avanza con el scroll, no esta parada (recorrido ' + recorrido.toFixed(2) + ')');
/* Aqui no vale la media, y por eso esta comprobacion se reescribio: la escena
   empieza con la cifra de la ronda RECORTADA en la tinta a media pantalla de
   alto, asi que hay un glifo enorme y claro que sube la media a 0,20 estando
   la pantalla cubierta de tinta. Se mide lo que de verdad define la entrada:
   que la mayor parte sea tinta, Y que la cifra este calada. Las dos cosas: sin
   la segunda, un fundido a negro pasaria. */
di(cuadros[0].oscuro >= 0.50,
   'empieza en camara: la mayor parte es tinta (' + (cuadros[0].oscuro * 100).toFixed(0) + '%)');
di(cuadros[0].claro >= 0.04,
   'y la cifra va calada en ella, no pintada encima (' + (cuadros[0].claro * 100).toFixed(0) + '% de hueco)');
/* Y al final entrega la SECCION, no una pantalla vacia. Esto tambien se medÍa
   por brillo —«>= 0,70», o sea «se ve papel»— y en negro no significa nada: un
   fundido a negro lo cumpliria igual de bien que la pagina. El fallo que esta
   comprobacion existe para cazar es el que ya paso una vez: la plancha se va y
   detras no queda nada. Asi que se cuenta lo unico que lo distingue, texto de
   verdad visible en pantalla. Con el agujero abierto salian 3; con la seccion
   entregada, entre 39 y 52. */
const vivos = await pg.evaluate(() => {
  let n = 0;
  for (const e of document.querySelectorAll('h1,h2,h3,p,li,dd,dt,a,span,button')) {
    if (e.children.length) continue;
    const t = (e.textContent || '').trim(); if (t.length < 2) continue;
    const r = e.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || r.width < 4 || r.height < 4) continue;
    const s = getComputedStyle(e);
    if (s.visibility === 'hidden' || +s.opacity < 0.08) continue;
    n++;
  }
  return n;
});
di(vivos >= 20,
   'y acaba entregando la seccion de la ronda, no una pantalla vacia (' + vivos + ' textos visibles)');
// El instrumento tiene que estar dibujado, no solo el negro: en el tramo de
// los anillos hay relieve dentro del recorte.
di(cuadros[1].desv >= 0.010 || cuadros[2].desv >= 0.010,
   'y por el camino hay instrumento dibujado, no un fundido a negro (desv ' +
   cuadros[1].desv.toFixed(3) + ' / ' + cuadros[2].desv.toFixed(3) + ')');

/* ── 2b · la barra de neon dice la cifra de verdad ────────────────────────── */
/* Una barra de progreso decorativa es una raya. Esta tiene que estar llena
   EXACTAMENTE hasta donde va la ronda, y eso se mide en el pixel: se busca la
   fila mas encendida de la mitad baja —la barra—, y en ella el arranque del
   carril, la cabeza del relleno y el tope de 100 %. La fraccion entre las tres
   es el porcentaje que la barra esta contando. */
{
  await pg.evaluate(v => scrollTo(0, v), Math.round(caja.top + 0.34 * (caja.alto - caja.vh)));
  await pg.waitForTimeout(500);
  const tira = (await pg.screenshot({ clip:{ x:0, y:0, width:1440, height:900 } })).toString('base64');
  const m = await pg.evaluate(async (b64) => {
    const im = new Image();
    await new Promise(r => { im.onload = r; im.src = 'data:image/png;base64,' + b64 });
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const luz = i => (0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2]) / 255;
    /* Del color de la marca, no solo encendido: la cifra calada es blanca y
       sus filas tambien estan llenas de pixeles claros, asi que buscando «la
       fila mas encendida» a secas la comprobacion pasaba igual con la barra
       quitada. El tubo es lo unico de la escena donde el VERDE le saca
       ventaja a los otros dos. */
    const acento = i => d[i+1] > d[i] + 26 && d[i+1] > d[i+2] + 12;
    let mejor = -1, mejorN = 0;
    for (let y = Math.floor(c.height * 0.55); y < c.height - 30; y++) {
      let n = 0;
      for (let px = 0; px < c.width; px++) { const i = (y*c.width + px) * 4;
        if (luz(i) > 0.45 && acento(i)) n++ }
      if (n > mejorN) { mejorN = n; mejor = y }
    }
    if (mejorN < 80) return null;
    if (mejor < 0) return null;
    const fila = px => luz((mejor*c.width + px) * 4);
    let ini = -1, cabeza = -1, tope = -1;
    for (let px = 0; px < c.width; px++) if (fila(px) > 0.45) { ini = px; break }
    for (let px = c.width - 1; px >= 0; px--) if (fila(px) > 0.30) { tope = px; break }
    // la cabeza: donde acaba la tirada continua que arranca en «ini»
    for (let px = ini; px < c.width; px++) { if (fila(px) < 0.30) { cabeza = px - 1; break } }
    return { fila: mejor, ini, cabeza, tope, ancho: c.width };
  }, tira);
  di(!!m && m.ini > 0 && m.cabeza > m.ini,
     'la barra de neon esta encendida, y en el verde de la marca (fila ' + (m ? m.fila : 'NO LA HAY') + ')');
  if (m && m.tope > m.ini) {
    const pct = 100 * (m.cabeza - m.ini) / (m.tope - m.ini);
    const dice = parseFloat(await pg.evaluate(() => (document.getElementById('umbPct')||{}).textContent)) || 0;
    di(Math.abs(pct - dice) <= 5,
       'y esta llena hasta la cifra de la ronda, no hasta un sitio decorativo (' +
       pct.toFixed(1) + '% frente a ' + dice + '%)');
  }
}

/* ── 3 · la cifra, la misma en los cuatro sitios ──────────────────────────── */
const cifras = await pg.evaluate(() => {
  const t = s => { const e = document.querySelector(s); return e ? (e.textContent || '').replace(/[^\d]/g, '') : null };
  return { franja: t('#annPct'), portada: t('#heroPct'), umbral: t('#umbPct'),
           barra: (document.getElementById('annFill') || {}).style ? document.getElementById('annFill').style.width : null };
});
const v = [cifras.franja, cifras.portada, cifras.umbral].filter(Boolean);
di(v.length === 3 && new Set(v).size === 1,
   'la cifra de la ronda dice lo mismo en los tres sitios de texto (' + v.join(' / ') + ')');
// Y esta VIVA: se mueve con la misma llamada que las otras.
const movida = await pg.evaluate(() => {
  if (typeof window.__aviso !== 'function') return null;
  window.__aviso(41);
  return { umbral: (document.getElementById('umbPct') || {}).textContent,
           portada: (document.getElementById('heroPct') || {}).textContent };
});
if (movida) di(String(movida.umbral).replace(/\D/g, '') === '41',
               'y la del umbral es la misma cifra viva, no un 85 escrito a mano (__aviso(41) → ' + movida.umbral + ')');
else console.log('  ··  no hay __aviso() expuesto: la cifra viva no se puede mover desde aqui');

di(errs.length === 0, 'sin errores de pagina' + (errs.length ? ': ' + errs[0] : ''));

/* ── 4 · y con el movimiento reducido, la puerta no existe ────────────────── */
const pg2 = await (await nav.newContext({ viewport:{width:1440, height:900}, reducedMotion:'reduce' })).newPage();
await pg2.goto('http://127.0.0.1:8987/', { waitUntil:'load' });
await pg2.waitForTimeout(1200);
const calma = await pg2.evaluate(() => {
  const u = document.querySelector('.umb');
  return { alto: Math.round(u.getBoundingClientRect().height),
           esc: getComputedStyle(u.querySelector('.umb-esc')).display };
});
di(calma.alto <= 2 && calma.esc === 'none',
   'con movimiento reducido la puerta se queda abierta y no cobra scroll (alto ' + calma.alto + 'px)');

await nav.close(); srv.close();
console.log('\n' + (mal ? ok + ' bien, ' + mal + ' MAL' : ok + '/' + ok + ' correctas'));
process.exit(mal ? 1 : 0);
