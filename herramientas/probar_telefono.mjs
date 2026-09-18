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
/* EL SUELO YA NO ES UN DIBUJO, ES METAL, asi que aqui habia tres pruebas
   defendiendo un bitmap que ya nadie pinta: que el movil pidiera el archivo
   vertical, que no se repitiera y que llenara la caja. Las tres median el
   MECANISMO, y el mecanismo cambio.

   Lo que aquellas tres protegian de verdad era una cosa sola, y es la que se
   reporto en su dia: la RAYA que partia la seccion por la mitad, que salia de
   una teja no continua repitiendose. Asi que se mide eso y no el como: se baja
   por una columna de la seccion y se busca un ESCALON. Un degradado, por
   fuerte que sea, cambia poco a poco; una costura cambia de golpe. La prueba
   vale igual si manana el suelo vuelve a ser un bitmap, un degradado o otra
   cosa. */
{
  const sec = await pg.$('.secure');
  const caja = sec ? await sec.boundingBox() : null;
  di(!!caja, 'hay una seccion clara en la que mirar el suelo');
  if (caja) {
    await pg.evaluate(y => scrollTo(0, y), Math.round(caja.y + 40));
    await pg.waitForTimeout(700);
    const b64 = (await pg.screenshot()).toString('base64');
    const esc = await pg.evaluate(async s => {
      const im = new Image();
      await new Promise(z => { im.onload = z; im.src = 'data:image/png;base64,' + s });
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0);
      // una columna por el margen izquierdo, donde no hay texto que confunda
      // A 4 % del borde la columna caia justo en el canto del contenido -14 px de
      // margen en el telefono- y el escalon que encontraba era ese canto, no una
      // costura. A 1,5 % esta dentro del margen, o sea suelo puro.
      const col = Math.round(c.width * 0.015);
      /* Solo el INTERIOR de la seccion. La primera version cogia la columna
         entera y el mayor escalon salia 0,55: era el borde entre la seccion
         oscura de arriba y esta, o sea el cambio de seccion, que es justo lo
         que TIENE que haber. Se descarta el 22 % de arriba y el de abajo. */
      const y0 = Math.round(c.height * 0.22), y1 = Math.round(c.height * 0.78);
      const d = x.getImageData(col, y0, 3, y1 - y0).data;
      const f = v => { v /= 255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4) };
      const L = [];
      for (let y = 0; y < (y1 - y0); y++) {
        let s2 = 0;
        for (let k = 0; k < 3; k++) {
          const i = (y*3 + k) * 4;
          s2 += .2126*f(d[i]) + .7152*f(d[i+1]) + .0722*f(d[i+2]);
        }
        L.push(s2/3);
      }
      // el escalon: el mayor cambio de una fila a la siguiente, comparado con
      // el cambio TIPICO. Un degradado tiene todos los pasos parecidos.
      const bruto = L.slice(1).map((v, i) => Math.abs(v - L[i]));
      const paso = bruto.slice().sort((a,b) => a-b);
      const mediana = paso[Math.floor(paso.length/2)] || 1e-6;
      let donde = 0;
      for (let i = 0; i < bruto.length; i++) if (bruto[i] === paso[paso.length-1]) { donde = i; break }
      return { peor: paso[paso.length-1], mediana, donde: (y0 + donde), alto: c.height };
    }, b64);
    di(esc.peor <= Math.max(0.02, esc.mediana * 60),
       'y el suelo no tiene costura: el mayor escalon de la columna es ' +
       esc.peor.toFixed(4) + ' y el paso tipico ' + esc.mediana.toFixed(5) +
       ' (el escalon, en y=' + esc.donde + ' de ' + esc.alto + ')');
  }
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

/* Aqui se descargaba el bitmap del suelo para comprobar que el del telefono
   era mas alto que ancho. Ya no hay bitmap: el suelo es metal, hecho de
   degradados, y un degradado se adapta a la caja sea cual sea su forma, asi
   que la pregunta «es mas alto que ancho» perdio el sujeto. La costura, que
   era lo que aquello protegia de verdad, la mide ahora la prueba de arriba
   directamente sobre lo pintado. */

/* EL SUELO DEL MOVIL PROMETE LO MISMO QUE EL DE ESCRITORIO: que no sea un
   color plano y que la franja de arriba -donde va el titular- sea la mas
   clara. Eso no cambia con la paleta; lo que cambia es DONDE se mide. Antes
   se descargaba el bitmap del suelo y se medía el archivo. Ya no hay archivo:
   el suelo es metal, hecho de degradados. Asi que se mide lo PINTADO, que
   ademas es lo que el visitante ve —el bitmap podia estar perfecto y el
   resultado no, si algo se le ponia encima—. */
{
  const sec2 = await pg.$('.secure');
  const caja2 = sec2 ? await sec2.boundingBox() : null;
  if (caja2) {
    /* EL SCROLL SE CONVERGE, NO SE PIDE Y YA. «caja2.y» se mide ANTES de
       moverse, y entre medias hay una seccion anclada de 3.060 px: pedir ese
       desplazamiento dejaba la pantalla en mitad de la PILA, no en el papel.
       Bisecado: la prueba llevaba en rojo desde que el documento cambio de
       alto, fotografiando un fondo negro y cantando «el suelo es un color
       plano» —0,0014 de recorrido— sin que el suelo tuviera nada que ver.
       Se repite hasta que la banda de papel ocupa de verdad la pantalla. */
    for (let i = 0; i < 14; i++) {
      const t = await pg.evaluate(() => Math.round(
        document.querySelector('.secure').getBoundingClientRect().top));
      if (t > 40 && t < 120) break;
      await pg.evaluate(v => scrollBy(0, v), t - 80);
      await pg.waitForTimeout(140);
    }
    await pg.waitForTimeout(800);
    const b64 = (await pg.screenshot()).toString('base64');
    const suelo = await pg.evaluate(async s => {
      const im = new Image();
      await new Promise(z => { im.onload = z; im.src = 'data:image/png;base64,' + s });
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d'); x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      const f = v => { v /= 255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4) };
      // solo los margenes laterales: el centro lleva texto y tarjetas, y eso
      // no es suelo. Un 8 % por cada lado.
      const m = Math.round(c.width * 0.08);
      /* Arriba contra EL MEDIO, no contra el fondo de la pantalla. Abajo
         estan las tarjetas, y su canto encendido y su sombra iluminan los
         margenes: medido, 0,0042 abajo contra 0,0031 arriba, y ese 0,0042 no
         era suelo, era el halo de una tarjeta. Lo que el suelo promete es que
         la franja de LEER -donde va el titular- sea mas clara que el cuerpo
         de la seccion, y eso se mide entre el tercio de arriba y el de en
         medio, que es suelo limpio por los dos lados. */
      const cA = c.height * 0.30, cB = c.height * 0.62;
      let lo = 1, hi = 0, sA = 0, nA = 0, sB = 0, nB = 0;
      for (let y = 0; y < c.height; y++) {
        for (const px of [Math.round(m*0.4), c.width - Math.round(m*0.4) - 1]) {
          const i = (y*c.width + px) * 4;
          const l = .2126*f(d[i]) + .7152*f(d[i+1]) + .0722*f(d[i+2]);
          if (l < lo) lo = l; if (l > hi) hi = l;
          if (y < cA) { sA += l; nA++ } else if (y < cB) { sB += l; nB++ }
        }
      }
      return { rango: hi - lo, arriba: sA/nA, abajo: sB/nB };
    }, b64);
    /* Los limites bajan con la paleta: el recorrido de luz posible en un suelo
       de grafito es una fraccion del que habia en papel. Lo que se sigue
       cazando es lo mismo -un suelo plano da 0,000- y la direccion de la luz. */
    di(suelo.rango > 0.004,
       'el suelo del movil no es un color plano: ' + suelo.rango.toFixed(4) + ' de recorrido de luz');
    /* Y aqui hay que ser honrado con lo que la medida puede decir. Sobre papel
       la franja de arriba era medio punto de luminancia mas clara y se VEIA.
       Sobre grafito todo el suelo vive entre 0,002 y 0,004, y la diferencia
       entre la franja de leer y el cuerpo es de 0,0004: por debajo del umbral
       en que un ojo distingue dos grises. Exigir una direccion concreta ahi es
       exigir que una medida de ruido salga con un signo determinado.
       Lo que si se puede defender, y es lo que importa, es que la franja de
       leer no sea PERCEPTIBLEMENTE mas oscura que el cuerpo -un suelo iluminado
       desde abajo daria una diferencia diez veces mayor y saltaria-. */
    di(suelo.arriba >= suelo.abajo - 0.002,
       'y la franja de leer no queda mas oscura que el cuerpo (' +
       suelo.arriba.toFixed(4) + ' contra ' + suelo.abajo.toFixed(4) +
       ', margen 0,002)');
  }
}

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

// ── los mandos del rincon no se montan ────────────────────────────────────
// En la columna de la derecha hay tres cosas pegadas al canto: el contador
// «02 / 11», la banda con el nombre de la seccion y el boton de subir. Una
// regla para pantallas cortas bajaba el boton al canto con el argumento de
// que «a la derecha no hay nada debajo», que era falso, y el boton se sentaba
// encima del contador: medido en 390x844, boton de 788 a 830 y contador de
// 813 a 830. El numero se leia a traves del cristal del boton. Se comprueban
// los tres contra todos, que es la unica manera de que no vuelva a pasar por
// otro lado.
{
  await pg.evaluate(() => scrollTo(0, innerHeight * 3));
  await pg.waitForTimeout(700);
  const cajas = await pg.evaluate(() => {
    const ns = ['.hud-count', '.hud-band', '.subir'];
    return ns.map(s => {
      const e = document.querySelector(s);
      if (!e) return null;
      const r = e.getBoundingClientRect();
      const c = getComputedStyle(e);
      if (!r.width || !r.height || c.visibility === 'hidden') return null;
      return { s, l: r.left, t: r.top, r: r.right, b: r.bottom };
    }).filter(Boolean);
  });
  const chocan = [];
  for (let i = 0; i < cajas.length; i++) for (let j = i + 1; j < cajas.length; j++) {
    const a = cajas[i], b = cajas[j];
    const sx = Math.min(a.r, b.r) - Math.max(a.l, b.l);
    const sy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
    if (sx > 1 && sy > 1) chocan.push(a.s + ' con ' + b.s + ' (' +
      Math.round(sx) + 'x' + Math.round(sy) + ' px)');
  }
  di(chocan.length === 0, 'los mandos del rincon no se montan entre ellos' +
     (chocan.length ? ': ' + chocan.join(', ') : ' (' + cajas.length + ' medidos)'));
}

// ── y el HUD va del tono de lo que tiene debajo ───────────────────────────
// «body.light» la consumen nueve reglas y las nueve son cromo de esquina. Se
// decidia con el lavado, que es la media de la seccion ENTERA interpolada
// entre una y la siguiente: llega tarde, y mientras llega, por el canto de
// abajo ya asoma la seccion siguiente. Lo que se veia -y es lo que se
// reporto- era el velo negro y el contador azul claro encima de la pagina
// casi blanca de «in the press».
//
// El primer intento de prueba se paraba en medio de cada seccion y exigia que
// el HUD llevara el tono de ESA seccion. Estaba mal planteado y lo canto
// solo: parado en medio de «chroma» -negra- lo que hay bajo el canto de abajo
// ya es «paper2» -clara-, porque las secciones son «sticky» dentro de
// soportes de tres pantallas. Exigir el tono de la seccion en la que estas es
// exigir justo el fallo que se arregla.
//
// Asi que no se comprueba el mecanismo, se comprueba el RESULTADO PINTADO: se
// apaga el HUD, se fotografia su huella exacta -la caja que ocupan los mandos
// con 6 px de aire- y se compara su luminancia con la bandera. Y solo se
// cuentan los desfases GRANDES, los que se ven: fondo claro de verdad con el
// HUD en oscuro, o fondo negro con el HUD en claro.
//
// Medido: con el lavado, 13 de 36; preguntando por la seccion del canto, 7.
// Los siete que quedan son tres sitios conocidos y ninguno es el reportado:
// el foco claro que la portada tiene justo en ese rincon, la franja en que
// entre dos secciones no asoma ninguna y se ve el telon negro, y los dos
// fundidos «xf» y «xl», que declaran negro y terminan casi blancos porque
// ninguna etiqueta fija describe algo que cambia de tono mientras lo cruzas.
// El limite va en 8: por debajo de lo que hay, no se toca; si sube, algo se
// ha roto.
{
  const caja = await pg.evaluate(() => {
    const es = ['.hud-count', '.hud-band', '.subir'].map(s => document.querySelector(s)).filter(Boolean);
    let l = 1e9, t = 1e9, r = -1e9, b = -1e9;
    for (const e of es) { const q = e.getBoundingClientRect(); if (!q.width) continue;
      l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom) }
    return r < 0 ? null : { x: Math.max(0, Math.round(l - 6)), y: Math.max(0, Math.round(t - 6)),
                            width: Math.round(r - l + 12), height: Math.round(b - t + 12) };
  });
  di(!!caja, 'los mandos del rincon estan en pantalla para poder medirlos');
  let malos = 0, n = 0;
  if (caja) {
    await pg.addStyleTag({ content: '.hud,.hud::after,.subir,.srail,.scrollbtn,.lang-menu{opacity:0!important}' });
    const alto = await pg.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    const paso = await pg.evaluate(() => Math.round(innerHeight * 0.6));
    for (let y = 0; y <= alto; y += paso) {
      await pg.evaluate(v => scrollTo(0, v), y);
      await pg.waitForTimeout(300); n++;
      const b64 = (await pg.screenshot({ clip: caja })).toString('base64');
      const r = await pg.evaluate(async s => {
        const im = new Image();
        await new Promise(z => { im.onload = z; im.src = 'data:image/png;base64,' + s });
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        const x = c.getContext('2d'); x.drawImage(im, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height).data;
        const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4) };
        let su = 0, m = 0;
        for (let i = 0; i < d.length; i += 4) { su += .2126*f(d[i]) + .7152*f(d[i+1]) + .0722*f(d[i+2]); m++ }
        return { L: su / m, light: document.body.classList.contains('light') };
      }, b64);
      if ((r.L > 0.70 && !r.light) || (r.L < 0.06 && r.light)) malos++;
    }
  }
  di(caja && malos <= 8, 'el HUD lleva el tono de lo que tiene debajo (' +
     malos + ' desfases grandes en ' + n + ' paradas, limite 8)');

  // Y el caso concreto que se reporto, que es el que si discrimina. El
  // barrido de arriba es un humo: a esta resolucion el mecanismo viejo y el
  // nuevo empatan, porque los desfases que quedan son los tres sitios
  // conocidos y caen en las dos versiones. Medido denso -97 paradas- el
  // nuevo baja de 17 a 14 en movil y de 20 a 16 en escritorio: mejora real
  // pero modesta. Lo que SI arregla del todo es la travesia de «in the
  // press», que es donde se vio: con el lavado, el velo negro y el contador
  // azul claro sobre la pagina casi blanca.
  if (caja) {
    const p2 = await pg.evaluate(() => {
      const e = document.querySelector('.press');
      const r = e.getBoundingClientRect();
      return { y: Math.round(r.top + scrollY), h: Math.round(r.height) };
    });
    let mal2 = 0, n2 = 0, peor = 0;
    for (let k = 0.15; k <= 0.9; k += 0.15) {
      await pg.evaluate(v => scrollTo(0, v), Math.round(p2.y + p2.h * k));
      await pg.waitForTimeout(340); n2++;
      const b64 = (await pg.screenshot({ clip: caja })).toString('base64');
      const r = await pg.evaluate(async s => {
        const im = new Image();
        await new Promise(z => { im.onload = z; im.src = 'data:image/png;base64,' + s });
        const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
        const x = c.getContext('2d'); x.drawImage(im, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height).data;
        const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4) };
        let su = 0, m = 0;
        for (let i = 0; i < d.length; i += 4) { su += .2126*f(d[i]) + .7152*f(d[i+1]) + .0722*f(d[i+2]); m++ }
        return { L: su / m, light: document.body.classList.contains('light') };
      }, b64);
      if (r.L > 0.55 && !r.light) { mal2++; peor = Math.max(peor, r.L) }
    }
    di(mal2 === 0, 'y cruzando «in the press» no se queda oscuro sobre la pagina clara' +
       (mal2 ? ' (' + mal2 + ' de ' + n2 + ', el peor a ' + peor.toFixed(2) + ' de luminancia)'
             : ' (' + n2 + ' paradas)'));
  }
}

await ctx.close(); await nav.close(); srv.close();
console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
process.exit(mal ? 1 : 0);
