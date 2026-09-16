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
    /* La cifra dejo de ser un hueco claro y paso a ser teselas AZULES, asi que
       contar «pixeles claros» ya no la ve: a 0,20 de luminancia el azul de la
       marca no llega al 0,60 que pedia «claro». Se cuenta tesela: pixel donde
       el azul le saca ventaja al rojo y hay algo de luz. */
    let tes = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i+2] > d[i] + 40 && (0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2]) > 26) tes++;
    }
    /* Y el ENREJADO: cuantas veces cambia de encendido a apagado al recorrer
       una fila. Un glifo macizo cambia dos veces por trazo; uno de teselas,
       una por tesela. Es lo que distingue «esta hecho de piezas» de «esta
       pintado de una pieza», que es lo que la comprobacion del calado decia
       antes con otras palabras. */
    let saltos = 0, filas = 0;
    for (let y = 0; y < c.height; y += 3) {
      let cambios = 0, prev = null;
      for (let x = 0; x < c.width; x++) {
        const i = (y*c.width + x) * 4;
        const on = d[i+2] > d[i] + 40;
        if (prev !== null && on !== prev) cambios++;
        prev = on;
      }
      if (cambios > 0) { saltos += cambios; filas++ }
    }
    /* Blanco de verdad: claro Y neutro. Solo por luminancia, un azul claro
       pasaria por blanco, y lo que se pidio fue que la cifra acabara BLANCA. */
    let bl = 0;
    for (let i = 0; i < d.length; i += 4) {
      const M = Math.max(d[i], d[i+1], d[i+2]), mn = Math.min(d[i], d[i+1], d[i+2]);
      if (M > 205 && M - mn < 20) bl++;
    }
    return { medio: m, desv: Math.sqrt(s2 / n), oscuro: oscuro / n, claro: claro / n,
             tesela: tes / n, blanco: bl / n, saltos: filas ? saltos / filas : 0 };
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
const recorrido = Math.max(...cuadros.map(c => c.medio)) - Math.min(...cuadros.map(c => c.medio));
di(recorrido >= 0.45,
   'la escena avanza con el scroll, no esta parada (recorrido de claridad ' + recorrido.toFixed(2) + ')');
/* Aqui no vale la media, y por eso esta comprobacion se reescribio: la escena
   empieza con la cifra de la ronda RECORTADA en la tinta a media pantalla de
   alto, asi que hay un glifo enorme y claro que sube la media a 0,20 estando
   la pantalla cubierta de tinta. Se mide lo que de verdad define la entrada:
   que la mayor parte sea tinta, Y que la cifra este calada. Las dos cosas: sin
   la segunda, un fundido a negro pasaria. */
di(cuadros[0].oscuro >= 0.50,
   'empieza en camara: la mayor parte es tinta (' + (cuadros[0].oscuro * 100).toFixed(0) + '%)');
/* El calado se mide donde la cifra YA ESTA, que desde que se arma por pixeles
   no es el primer cuadro: en 0,05 la ventana de armado apenas ha empezado y no
   hay hueco ninguno, que es justo lo que se quiere. Midiendolo ahi, la
   comprobacion afirmaba lo viejo. */
/* ── la barra no se monta en la cifra ─────────────────────────────────────
   Esto no tenia comprobacion, y por eso se colo: la barra se colocaba a
   «H/2 + tam*0,46», una cuenta sobre el cuerpo de la tipografia y no sobre lo
   que el glifo OCUPA, y su haz vertical subia 190 px y cruzaba el por ciento.
   Se ve a simple vista y ninguna de las veintitres comprobaciones lo miraba.

   Se mide asi: bajando desde arriba, la primera banda seguida de filas con
   blanco es la CIFRA -es lo unico blanco y ancho que hay ahi arriba-. La
   primera fila con azul es lo mas alto que llega la barra, resplandor
   incluido. Entre las dos tiene que haber aire de verdad. */
{
  const g = await pg.evaluate(v => scrollTo(0, v),
                              Math.round(caja.top + 0.38 * (caja.alto - caja.vh)));
  await pg.waitForTimeout(500);
  const m = await pg.evaluate(() => {
    const cv = document.getElementById('umbLz');
    const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
    c.getContext('2d').drawImage(cv, 0, 0);
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const blanca = [], azul = [], azulAncho = [], anchoBl = [];
    for (let y = 0; y < c.height; y++) {
      let bl = 0, az = 0;
      for (let x = 0; x < c.width; x++) {
        const i = (y*c.width + x) * 4;
        const M = Math.max(d[i], d[i+1], d[i+2]), mn = Math.min(d[i], d[i+1], d[i+2]);
        if (M > 200 && M - mn < 22) bl++;
        else if (d[i+2] > d[i] + 18 && d[i+2] > 40) az++;
      }
      /* Los listones van en PROPORCION AL ANCHO, no en pixeles sueltos, y es
         lo que hace que la medida distinga la barra de los rotulos. Con
         «bl>20 / az>=2» el rotulo de arriba -texto de 14 px- contaba como
         banda blanca, y sus pixeles de borde antialiasados contaban como
         azul: la comprobacion daba 0 px de aire con la escena perfectamente
         bien. La cifra y la barra son objetos ANCHOS -cientos de pixeles por
         fila-; un rotulo, no. */
      const anchoMin = c.width * 0.08;
      blanca.push(bl > anchoMin); anchoBl.push(bl);      /* la CIFRA es ancha; un rotulo, no */
      azul.push(az >= 2);              /* de la barra basta un hilo */
      azulAncho.push(az > anchoMin);
    }
    /* La caja de la cifra: la banda seguida de filas anchas en blanco. El
       liston de blanco va en proporcion al ancho para que el rotulo de arriba
       -texto de 14 px- no se cuele como si fuera la cifra. */
    /* De todas las bandas blancas seguidas, la CIFRA es la del pico mas alto.
       Cogiendo la primera se cogia el rotulo de arriba -que en el telefono
       tambien es ancho en proporcion- y entonces «dentro de la cifra» era
       «dentro del rotulo», donde por supuesto no hay barra: la comprobacion
       daba cero filas sucias con el fallo puesto. */
    let ini = -1, fin = -1, mejor = -1;
    for (let y = 0; y < blanca.length; y++) {
      if (!blanca[y]) continue;
      let z = y, pico = 0;
      while (z < blanca.length && blanca[z]) { if (anchoBl[z] > pico) pico = anchoBl[z]; z++ }
      if (pico > mejor) { mejor = pico; ini = y; fin = z - 1 }
      y = z;
    }
    /* Y lo que DECIDE: cuantas filas de la cifra llevan barra encima. Un solo
       numero no valia para las dos cosas que se metian dentro -el haz de la
       cabeza es un hilo de tres pixeles que llegaba muy arriba, y el derrame
       es ancho pero poco profundo-. Contado dentro de la caja, con el liston
       de azul en dos pixeles, se ven las dos. */
    let sucias = 0;
    for (let y = ini; y >= 0 && y <= fin; y++) if (azul[y]) sucias++;
    /* El aire se mide hasta el CUERPO de la barra, no hasta el primer pixel
       azulado: justo debajo de la cifra estan sus propios bordes antialiasados
       y el rotulo del importe, y con dos pixeles de liston el aire salia de
       1 px estando la barra a doscientos. Lo que se mete dentro se cuenta con
       el hilo; donde EMPIEZA la barra, con su anchura. */
    let bajo = -1;
    for (let y = fin + 1; y < azulAncho.length; y++) if (azulAncho[y]) { bajo = y; break }
    return { cifra: [ini, fin], sucias, bajo,
             dpr: c.height / (cv.getBoundingClientRect().height || 1) };
  });
  const aire = m.bajo < 0 ? 999 : (m.bajo - m.cifra[1]) / m.dpr;
  di(m.cifra[0] >= 0 && m.sucias === 0 && aire >= 24,
     'la barra va debajo de la cifra, no dentro (' + m.sucias +
     ' filas de la cifra con barra encima, ' + aire.toFixed(0) + ' px de aire)');
}

/* ── la cifra: se arma, funde y abre ──────────────────────────────────────
   Los tres tiempos del umbral hacen cosas distintas y cada uno se mide en SU
   tramo. Medirlos todos en el mismo cuadro fue el fallo de la version
   anterior: la comprobacion del enrejado estaba puesta en 0,30, que con los
   tiempos nuevos es mitad de la fusion, y decia que la cifra no estaba hecha
   de piezas cuando lo que pasaba es que ya habia dejado de estarlo.

     0,00-0,24  las teselas vuelan y arman la cifra, en azul
     0,24-0,34  funden: se cierran las juntas y el color va a blanco
     0,40-1,00  la cifra blanca se abre y entrega la ronda                */
const CAJA = { x: 180, y: 150, width: 1110, height: 460 };
const enP = async (v) => {
  await pg.evaluate(y => scrollTo(0, y), Math.round(caja.top + v * (caja.alto - caja.vh)));
  await pg.waitForTimeout(420);
  return franja(pg, CAJA);
};

const arma = [];
for (const v of [0.05, 0.11, 0.17, 0.23]) arma.push((await enP(v)).tesela);
di(arma.every((v, i) => i === 0 || v > arma[i - 1] + 0.012),
   'la cifra se arma por pasos, no aparece de una pieza (' +
   arma.map(v => (v * 100).toFixed(1) + '%').join(' → ') + ')');
di(arma[0] < arma[3] * 0.45,
   'y al empezar solo hay un trozo, no la cifra entera atenuada (' +
   (arma[3] ? (arma[0] / arma[3] * 100).toFixed(0) : '—') + '% de lo que acaba siendo)');

/* Hecha de PIEZAS mientras se arma: se cuenta cuantas veces cambia de encendido
   a apagado al recorrer una fila. Un glifo macizo cambia dos veces por trazo;
   uno de teselas, una por tesela. */
const piezas = await enP(0.17);
di(piezas.saltos >= 14,
   'y mientras se arma esta hecha de piezas, no pintada de una pieza (' +
   piezas.saltos.toFixed(1) + ' cambios por fila)');

/* Y acaba BLANCA, que es lo que se pidio: fundida, limpia y sin tinte. Se mide
   despues de la fusion y antes de que se abra. */
const fundida = await enP(0.37);
di(fundida.blanco > 0.05 && fundida.blanco > fundida.tesela * 3,
   'y termina en blanco, no en el azul con el que se arma (' +
   (fundida.blanco * 100).toFixed(1) + '% blanco frente a ' +
   (fundida.tesela * 100).toFixed(1) + '% azul)');

/* La apertura entrega la seccion: la ronda va ganando pantalla mientras la
   cifra crece. Si el hueco dejara de crecer -o creciera sobre su propio
   interior, que es tinta- esto se quedaria plano. */
const abre = [];
for (const v of [0.46, 0.62, 0.80]) abre.push((await enP(v)).medio);
di(abre[1] > abre[0] + 0.05 && abre[2] > abre[1],
   'y al abrirse va entregando la ronda, no crece sobre si misma (' +
   abre.map(v => v.toFixed(2)).join(' → ') + ')');
di(cuadros[4].medio >= 0.70,
   'y acaba entregando el suelo de la ronda, no un blanco inventado (' + cuadros[4].medio.toFixed(3) + ')');
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
    /* CIAN, no solo encendido: la cifra calada es blanca y sus filas tambien
       estan llenas de pixeles claros. Buscando «la fila mas encendida» a secas
       la comprobacion pasaba igual con la barra quitada. El tubo es lo unico
       de la escena donde el azul y el verde le sacan ventaja al rojo. */
    /* Y AZUL, no «frio». La version de antes pedia solo que el azul y el verde
       le sacaran ventaja al rojo, y eso lo cumple igual un cian que un azul:
       con el tubo en cian la comprobacion pasaba diciendo que estaba en el
       color de la marca. Ahora el azul tiene que ganarle tambien al verde.
       Medido: azul 62,134,255 pasa; cian 95,233,255 no. */
    const azul = i => d[i+2] > d[i] + 40 && d[i+2] > d[i+1] + 30;
    let mejor = -1, mejorN = 0;
    for (let y = Math.floor(c.height * 0.55); y < c.height - 30; y++) {
      let n = 0;
      for (let px = 0; px < c.width; px++) { const i = (y*c.width + px) * 4;
        if (luz(i) > 0.45 && azul(i)) n++ }
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
     'la barra de neon esta encendida, y en azul (fila ' + (m ? m.fila : 'NO LA HAY') + ')');
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
