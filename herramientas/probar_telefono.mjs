// Tres rondas de «lo veo igual» y la causa era esta: yo comprobaba todo a
// 1440 px y el sitio se mira en un movil. El fondo de las secciones claras,
// con «cover» sobre una caja de 390x1900, salia agrandado casi ocho veces y
// recortado por el centro: dos manchas azules donde tenia que haber un campo
// de placas. Invisible el trabajo entero, y en algun tramo peor que invisible.
//
// Esto mide el TELEFONO. No comprueba que quede bonito —eso no se mide—: mide
// lo unico que fallaba y que ninguna otra bateria miraba, que es que el fondo
// llegue a la pantalla pequena con su tamano de verdad y no como un borron.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, devices } from 'playwright';
const RAIZ = '/home/user/nerium';
const TIPO = {'.html':'text/html','.svg':'image/svg+xml','.css':'text/css','.woff2':'font/woff2',
  '.png':'image/png','.jpg':'image/jpeg','.js':'text/javascript','.json':'application/json','.ico':'image/x-icon'};
const srv = http.createServer((q, r) => {
  let p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, {'content-type': TIPO[path.extname(p)] || 'application/octet-stream'});
  r.end(fs.readFileSync(p));
}).listen(9133);
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
let ok = 0, mal = 0;
const di = (b, t) => { if (b) { ok++; console.log('  ok  ' + t) } else { mal++; console.log('  MAL ' + t) } };

const ctx = await nav.newContext({ ...devices['iPhone 13'], isMobile:true, hasTouch:true });
const pg = await ctx.newPage();
await pg.goto('http://127.0.0.1:9133/', { waitUntil:'load' });
await pg.waitForTimeout(2600);

const f = await pg.evaluate(() => {
  const s = document.querySelector('.secure'), c = getComputedStyle(s);
  const r = s.getBoundingClientRect();
  return { img:c.backgroundImage, size:c.backgroundSize, rep:c.backgroundRepeat,
           ancho:Math.round(r.width) };
});
/* Se lee el nombre que la banda PIDE, no uno fijado aqui: asi el resto de las
   comprobaciones miden el archivo que de verdad se sirve. Lo que se afirma es
   lo mismo de siempre: que el movil pide el VERTICAL y no el de escritorio. */
const arch = (f.img.match(/img\/([a-z0-9-]+\.(?:svg|webp|png|avif))/) || [, '?'])[1];
di(/^papel-alto/.test(arch),
   'el telefono pide el dibujo VERTICAL, no el de escritorio (' + arch + ')');
/* Antes se pedia que el dibujo SE REPITIERA, y era lo correcto mientras era un
   motivo de placas: estirandolo, la misma placa medía 36 px en una seccion y
   56 en otra. Ahora el dibujo es luz lisa —no hay motivo que deformar— y
   repetirlo tiene un precio que antes no se veia: el campo lleva un gradiente
   fuerte de arriba abajo, asi que en cada vuelta hay un salto de tono. En el
   telefono cae cada 1.114 px y la seccion de seguridad mide 2.026: una raya
   horizontal partiendola por la mitad, con lo de abajo lavado. Es lo que se
   vio en pantalla.

   Se intento medirlo en pixeles —buscar la fila donde el tono salta de borde a
   borde— y no separa: el suelo repetido da 0,106 y estirado 0,060, y ese 0,060
   no es ninguna costura sino el canto de la seccion y el filete de la tarjeta.
   Con tan poco margen, un liston entre los dos seria inventado.

   Asi que se afirma el MECANISMO, que aqui si es exacto: la capa del dibujo
   —la ultima de la pila— no se repite, y su tamano llena la caja. Son dos
   hechos, sin umbral que ajustar, y saltan en cuanto alguien vuelva a poner
   «repeat-y». */
{
  const capa = t => { const v = t.split(',').map(x => x.trim()); return v[v.length - 1] };
  di(capa(f.rep) === 'no-repeat',
     'el suelo no se repite: una costura por vuelta era la raya que partia la seccion (' +
     capa(f.rep) + ')');
  di(capa(f.size) === '100% 100%',
     'y llena la seccion entera, sin dejar el resto en blanco (' + capa(f.size) + ')');
}

/* ── el HUD no se va con el documento ─────────────────────────────────────
   El «.hud» es hijo de <body> y esta en «absolute», asi que vive en el
   documento: a media portada su canto de abajo —con el contador y su velo
   oscuro— quedaba flotando en mitad de la pantalla. Es la franja negra que se
   subia al hacer scroll. Se comprueba donde acaba el contador despues de
   desplazarse: tiene que seguir en su esquina. */
{
  await pg.evaluate(() => scrollTo(0, 700));
  await pg.waitForTimeout(500);
  const g = await pg.evaluate(() => {
    const e = document.querySelector('.hud-count'); if (!e) return null;
    const r = e.getBoundingClientRect();
    return { abajo: Math.round(innerHeight - r.bottom), vh: innerHeight };
  });
  di(!!g && g.abajo >= 0 && g.abajo < 120,
     'el contador se queda en su esquina al desplazarse (' +
     (g ? g.abajo + ' px del canto de abajo' : 'no esta') + ')');
}

/* Lo que de verdad importa no es que regla gane, sino el TAMANO al que acaban
   el dibujo en la pantalla. Esto se medía leyendo el alto del primer <rect>
   del archivo, y con el dibujo en curvas de nivel ya no hay rects: leia el
   rectangulo de la mascara —del alto entero— y daba 1.114 px.

   Se pasa a medir PIXELES, igual que en probar_pagina: se pinta el SVG solo y
   se cuenta TRAZO —pixeles que se separan de su vecino de dos filas mas
   arriba—. Lo que importa no es con que primitiva esta hecho el dibujo, sino
   cuanto dibujo hay y donde. */
/* La forma se le pregunta a la IMAGEN, no al archivo: el relieve se sirve
   rasterizado y ahi no hay «viewBox» que leer. */
const forma = await pg.evaluate(async (url) => {
  const im = new Image();
  await new Promise((ok, no) => { im.onload = ok; im.onerror = no; im.src = url });
  return { w: im.naturalWidth, h: im.naturalHeight };
}, 'http://127.0.0.1:9133/img/' + arch);
di(forma.h > forma.w, 'el dibujo del movil es mas alto que ancho, como la pantalla: ' +
   forma.w + 'x' + forma.h);

/* El suelo del movil promete lo mismo que el de escritorio, con el hueco
   limpio en otro sitio: en vertical el titular ocupa todo el ancho, asi que lo
   que tiene que quedar claro es la FRANJA DE ARRIBA, no una esquina.
   Se mide luz, no trazo: el suelo es un campo liso a proposito y contar trazo
   daba cero estando el fondo bien. */
const suelo = await pg.evaluate(async (url) => {
  const im = new Image();
  await new Promise((ok, no) => { im.onload = ok; im.onerror = no; im.src = url });
  const c = document.createElement('canvas'); c.width = 200; c.height = 560;
  const x = c.getContext('2d');
  x.drawImage(im, 0, 0, c.width, c.height);
  const d = x.getImageData(0, 0, c.width, c.height).data;
  const L = i => (0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2]) / 255;
  const corte = c.height * 0.35;
  let lo = 1, hi = 0, sA = 0, nA = 0, sB = 0, nB = 0;
  for (let y = 0; y < c.height; y++) {
    for (let px = 0; px < c.width; px++) {
      const l = L((y*c.width + px) * 4);
      if (l < lo) lo = l; if (l > hi) hi = l;
      if (y < corte) { sA += l; nA++ } else { sB += l; nB++ }
    }
  }
  return { rango: hi - lo, arriba: sA/nA, abajo: sB/nB };
}, 'http://127.0.0.1:9133/img/' + arch);
di(suelo.rango > 0.10,
   'el suelo del movil no es un color plano: ' + suelo.rango.toFixed(3) + ' de recorrido de luz');
di(suelo.arriba > suelo.abajo + 0.05,
   'y la franja de leer es la mas clara, que es donde va el titular (' +
   suelo.arriba.toFixed(3) + ' contra ' + suelo.abajo.toFixed(3) + ')');

/* ── la barra no se monta en la cifra ─────────────────────────────────────
   Se comprueba AQUI y no solo en escritorio porque aqui es donde aprieta: en
   vertical la cifra ocupa mucha mas proporcion de pantalla, asi que es el
   telefono el que decide si la barra cabe debajo. Con la geometria vieja la
   barra le subia 32 px por ENCIMA del canto de arriba de la cifra.

   Bajando desde arriba, la primera banda seguida de filas con blanco es la
   cifra. La primera fila con azul es lo mas alto que llega la barra, y se mide
   con el liston bajo porque lo que se metia dentro no era el trazo sino la
   LUZ: el haz de la cabeza, de tres pixeles, y el derrame. */
{
  const u = await pg.evaluate(() => {
    const e = document.querySelector('.umb'); if (!e) return null;
    const r = e.getBoundingClientRect();
    return { top: r.top + scrollY, alto: r.height, vh: innerHeight };
  });
  if (!u) { di(false, 'el umbral esta en el telefono'); }
  else {
    // 0,57 y no 0,38: el reloj del umbral se re-sincronizo con la pagina que
    // hay detras -la cifra se arma hasta 0,40, funde hasta 0,52 y se queda
    // quieta hasta 0,62-, asi que el momento en que la cifra esta blanca,
    // entera y con su barra se movio. En 0,38 esto media la fusion a medias y
    // cantaba un choque que no existe.
    await pg.evaluate(v => scrollTo(0, v), Math.round(u.top + 0.57 * (u.alto - u.vh)));
    await pg.waitForTimeout(700);
    const m = await pg.evaluate(() => {
      const cv = document.getElementById('umbLz');
      const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height;
      c.getContext('2d').drawImage(cv, 0, 0);
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      const bl = [], az = [], azAncho = [], anchoBl = [];
      for (let y = 0; y < c.height; y++) {
        let b1 = 0, a1 = 0;
        for (let x = 0; x < c.width; x++) {
          const i = (y*c.width + x) * 4;
          const M = Math.max(d[i], d[i+1], d[i+2]), mn = Math.min(d[i], d[i+1], d[i+2]);
          if (M > 200 && M - mn < 22) b1++;
          else if (d[i+2] > d[i] + 18 && d[i+2] > 40) a1++;
        }
      /* Los listones van en PROPORCION AL ANCHO, no en pixeles sueltos, y es
         lo que hace que la medida distinga la barra de los rotulos. Con
         «bl>20 / az>=2» el rotulo de arriba -texto de 14 px- contaba como
         banda blanca, y sus pixeles de borde antialiasados contaban como
         azul: la comprobacion daba 0 px de aire con la escena perfectamente
         bien. La cifra y la barra son objetos ANCHOS -cientos de pixeles por
         fila-; un rotulo, no. */
        const anchoMin = c.width * 0.08;
        bl.push(b1 > anchoMin); anchoBl.push(b1);        /* la CIFRA es ancha; un rotulo, no */
        az.push(a1 >= 2);              /* de la barra basta un hilo */
        azAncho.push(a1 > anchoMin);
      }
      /* De todas las bandas blancas seguidas, la CIFRA es la del pico mas alto.
         Cogiendo la primera se cogia el rotulo de arriba -que en el telefono
         tambien es ancho en proporcion- y entonces «dentro de la cifra» era
         «dentro del rotulo», donde por supuesto no hay barra: la comprobacion
         daba cero filas sucias con el fallo puesto. */
      let ini = -1, fin = -1, mejor = -1;
      for (let y = 0; y < bl.length; y++) {
        if (!bl[y]) continue;
        let z = y, pico = 0;
        while (z < bl.length && bl[z]) { if (anchoBl[z] > pico) pico = anchoBl[z]; z++ }
        if (pico > mejor) { mejor = pico; ini = y; fin = z - 1 }
        y = z;
      }
      let sucias = 0;
      for (let y = ini; y >= 0 && y <= fin; y++) if (az[y]) sucias++;
      let bajo = -1;
      for (let y = fin + 1; y < azAncho.length; y++) if (azAncho[y]) { bajo = y; break }
      return { cifra: [ini, fin], sucias, bajo,
               dpr: c.height / (cv.getBoundingClientRect().height || 1) };
    });
    const aire = m.bajo < 0 ? 999 : (m.bajo - m.cifra[1]) / m.dpr;
    di(m.cifra[0] >= 0 && m.sucias === 0 && aire >= 24,
       'la barra va debajo de la cifra, no dentro (' + m.sucias +
       ' filas de la cifra con barra encima, ' + aire.toFixed(0) + ' px de aire)');
  }
}

/* Nada se sale por el lado. Ojo con como se mide: la primera version miraba
   elemento por elemento si su borde derecho pasaba del ancho, y delataba el
   carrusel de nombres y el de prensa —que son mas anchos A PROPOSITO y viven
   dentro de una caja con overflow—. Eso no es un defecto, es como funciona un
   carrusel. Lo que hay que mirar es si el DOCUMENTO se puede arrastrar de
   lado, que es el sintoma que ve la persona. */
const lado = await pg.evaluate(() => {
  const d = document.documentElement;
  scrollTo(0, 0);
  const antes = scrollX;
  scrollTo(400, 0);
  const movido = scrollX - antes;
  scrollTo(0, 0);
  return { scrollW: d.scrollWidth, clientW: d.clientWidth, movido };
});
di(lado.scrollW <= lado.clientW + 2 && lado.movido === 0,
   'y la pagina no se arrastra de lado: ' + lado.scrollW + ' de ancho para ' +
   lado.clientW + ' de pantalla');

await ctx.close(); await nav.close(); srv.close();
console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
process.exit(mal ? 1 : 0);
