// Que la pagina no vuelva a verse blanca y vacia.
//
// Las tres cosas que se arreglaron, medidas y no a ojo:
//  · el papel: ninguna seccion clara puede volver a ser un color plano.
//  · «Compatible with»: era una pantalla de blanco con nombres en gris.
//  · las cuatro garantias: decian QUE hacen y nunca por que importan.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const RAIZ = '/home/user/nerium';
const TIPO = {'.html':'text/html','.svg':'image/svg+xml','.css':'text/css','.woff2':'font/woff2',
  '.png':'image/png','.jpg':'image/jpeg','.js':'text/javascript','.json':'application/json'};
const srv = http.createServer((q, r) => {
  let p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, {'content-type': TIPO[path.extname(p)] || 'application/octet-stream'});
  r.end(fs.readFileSync(p));
}).listen(9007);
const PUERTO = 9007;
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
let ok = 0, mal = 0;
const di = (b, t) => { if (b) { ok++; console.log('  ok  ' + t); } else { mal++; console.log('  MAL ' + t); } };

const ctx = await nav.newContext({ viewport:{width:1440,height:950}, deviceScaleFactor:1 });
const pg = await ctx.newPage();
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto('http://127.0.0.1:9007/', { waitUntil:'load' });
await pg.waitForTimeout(2600);

// ── el papel ──
const papel = await pg.evaluate(() => ['.paper', '.paper2', '.secure', '.sale', '.tkp', '.join', '.press']
  .map(s => { const e = document.querySelector(s); if (!e) return null;
    const c = getComputedStyle(e);
    return { sel: s, claro: e.classList.contains('claro'), col: c.backgroundColor,
             img: c.backgroundImage, capas: c.backgroundImage.split(/,(?![^()]*\))/).length }; })
  .filter(Boolean));
di(papel.length >= 6, 'estan las secciones claras (' + papel.length + ')');
di(papel.every(p => p.img !== 'none'),
   'ninguna es ya un color plano: todas llevan luz encima');
di(papel.every(p => /feTurbulence/.test(p.img)),
   'y todas llevan el grano, que es lo que quita el blanco de plantilla');
/* EL SUELO YA NO ES UN ARCHIVO. Aqui se comprobaba que todas las secciones
   claras pidieran el MISMO dibujo de suelo, y estaba bien mientras el suelo
   era un bitmap: si una seccion pedia otro, se notaba el salto. Con el paso a
   negro y plata el suelo dejo de ser un archivo y paso a ser metal, hecho de
   degradados y grano, asi que no hay nombre de archivo que comparar.

   Lo que aquello defendia -que las secciones claras compartan suelo y no se
   noten cosidas- se sigue defendiendo, solo que sobre lo que hay: que todas
   declaren la MISMA pila de fondo. Si alguien le pone una capa distinta a una
   sola seccion, salta igual que antes. */
/* «UNA SOLA PILA PARA LAS SIETE» YA NO DESCRIBE LA PAGINA, Y AGRUPAR POR
   CLARO/OSCURO TAMPOCO. Hay tres niveles de suelo y los tres son a proposito:
   el papel de las tres bandas claras, y DOS negros, porque dos secciones
   oscuras seguidas con el mismo negro exacto son una losa -eso ya se decidio
   y «probar_costura» lo defiende por el otro lado-.
   Lo unico que esta comprobacion defendio nunca es que nadie se invente un
   suelo suelto, y eso se dice mejor asi: dos secciones que declaran el MISMO
   color de fondo tienen que pintarlo con la MISMA pila. Un nivel nuevo es una
   decision y se ve en el color; una capa colada en una sola seccion es un
   descuido, y sigue saltando.
   Comprobado inyectando el fallo: anadiendo una capa de mas a «.sale» -que
   comparte color con «.paper» y «.join»- la prueba falla. */
const norm = s => s.replace(/\s+/g, ' ').trim();
const porColor = new Map();
for (const p of papel) {
  if (!porColor.has(p.col)) porColor.set(p.col, new Set());
  porColor.get(p.col).add(norm(p.img));
}
const rotas = [...porColor].filter(([, s]) => s.size > 1).map(([c]) => c);
di(rotas.length === 0,
   'las secciones que declaran el mismo suelo lo pintan igual: ' +
   porColor.size + ' nivel(es) para ' + papel.length + ' secciones' +
   (rotas.length ? ' — descuadran ' + rotas.join(', ') : ''));
di(papel.every(p => /gradient/.test(p.img)),
   'y el suelo es metal —degradados—, no un color plano');

/* ── el suelo de la mitad clara ───────────────────────────────────────────
   Tercera version de estas comprobaciones, y la primera que mide lo que el
   diseno de verdad afirma. La primera contaba <rect> del archivo; la segunda
   contaba TRAZO —pixeles que se separan de su vecino de dos filas arriba—, que
   servia mientras el fondo era un dibujo. Ahora no hay dibujo: el suelo es un
   campo de LUZ, liso a proposito, y contar trazo daba cero estando el fondo
   perfectamente bien.

   Lo que el suelo promete son tres cosas, y son estas tres las que se miden:
     · que NO sea plano. Es el fallo que se quiere cazar: un color liso;
     · que el rincon del titular sea lo mas CLARO. Ahi va tinta negra en las
       siete secciones, y ademas es lo que da la direccion de la luz;
     · y que el campo tire a frio, no a gris de plantilla.
   Se miden pixeles del archivo que la pagina PIDE, no del que haya en disco. */
/* Se mide sobre lo PINTADO y no sobre un archivo. Antes esto descargaba el
   bitmap del suelo; ya no hay bitmap -el suelo es metal, degradados y grano-
   y ademas medir el archivo siempre fue medir menos: el archivo podia estar
   perfecto y el resultado no, si algo se le ponia encima. Se fotografia una
   seccion clara y se mide ahi. */
const suelo = await (async () => {
  const sec = await pg.$('.secure');
  const caja = sec ? await sec.boundingBox() : null;
  if (!caja) return { rango: 0, rincon: 1, resto: 0, frio: 0 };
  await pg.evaluate(y => scrollTo(0, y), Math.round(caja.y + 40));
  await pg.waitForTimeout(700);
  /* El CONTENIDO se esconde para la foto. Sin esto, la region del rincon del
     titular incluye el titular, que es plata sobre negro, y sale mas clara que
     el resto: la medida acaba midiendo el texto en vez del suelo. La version
     anterior no lo sufria porque fotografiaba el archivo del dibujo, donde no
     hay texto; midiendo lo pintado hay que quitarlo a mano. Se usa
     «visibility», que no toca la maquetacion ni los fondos. */
  const tapa = await pg.addStyleTag({ content:
    '.secure .wrap,.secure .sec-head,.secure .sec-grid,.secure .sec-stage>*{visibility:hidden!important}' });
  await pg.waitForTimeout(350);
  const b64 = (await pg.screenshot()).toString('base64');
  await pg.evaluate(() => { const s=[...document.querySelectorAll('style')].pop(); if(s) s.remove(); });
  await pg.waitForTimeout(200);
  return pg.evaluate(async s => {
    const im = new Image();
    await new Promise(z => { im.onload = z; im.src = 'data:image/png;base64,' + s });
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const f = v => { v /= 255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4) };
    let lo = 1, hi = 0, sRin = 0, nRin = 0, sRes = 0, nRes = 0, frios = 0, tot = 0, croma = 0;
    const brillos = [];
    for (let y = 0; y < c.height; y += 2) {
      for (let px = 0; px < c.width; px += 2) {
        const i = (y*c.width + px) * 4;
        const l = .2126*f(d[i]) + .7152*f(d[i+1]) + .0722*f(d[i+2]);
        if (l < lo) lo = l; if (l > hi) hi = l;
        tot++;
        if (d[i+2] >= d[i]) frios++;
        croma += Math.abs(d[i+2] - d[i]);
        // el rincon del titular: arriba a la izquierda, donde arranca el texto
        if (y < c.height*0.34 && px < c.width*0.48) { sRin += l; nRin++ }
        else { sRes += l; nRes++ }
        brillos.push([l, px/c.width, y/c.height]);
      }
    }
    /* DONDE ESTA EL FOCO. Comparar la media del rincon con la del resto no
       sirve en grafito: el suelo entero vive en 0,02 de recorrido y las dos
       medias salen a 0,0001 una de otra, o sea dentro del ruido. Lo que si es
       inequivoco es donde cae la LUZ: se coge el 4 % de pixeles mas claros del
       suelo y se mira su centro. Si ese centro cae en el cuadrante del
       titular, el suelo esta iluminando justo donde va el texto. */
    brillos.sort((a, b) => b[0] - a[0]);
    const top = brillos.slice(0, Math.max(1, Math.round(brillos.length * 0.04)));
    const fx = top.reduce((s, v) => s + v[1], 0) / top.length;
    const fy = top.reduce((s, v) => s + v[2], 0) / top.length;
    return { rango: hi - lo, rincon: sRin/nRin, resto: sRes/nRes,
             frio: frios/tot, croma: croma/tot, fx, fy };
  }, b64);
})();

/* El limite baja con la paleta: el recorrido de luz posible en grafito es una
   fraccion del que habia en papel. Un color liso sigue dando 0,000. */
di(suelo.rango > 0.02,
   'el suelo no es un color plano: ' + suelo.rango.toFixed(3) + ' de recorrido de luz');
/* Al reves que antes, y por el mismo motivo de siempre: donde va el texto, el
   suelo tiene que APARTARSE. Con tinta negra sobre papel eso queria decir que
   el rincon del titular fuera lo mas CLARO. Con plata sobre negro quiere decir
   exactamente lo contrario: lo mas oscuro. La regla no cambia, cambia el
   signo, y el margen se ajusta a la escala en la que ahora vive todo. */
di(!(suelo.fx < 0.48 && suelo.fy < 0.34),
   'y el foco del suelo NO cae en el rincon del titular, que es donde va la ' +
   'tinta de plata (el foco, en x=' + (suelo.fx*100).toFixed(0) + ' % y=' +
   (suelo.fy*100).toFixed(0) + ' %)');
/* ESTO MEDIA MAL EL FALLO QUE DICE CAZAR, Y LLEVABA ASI DESDE QUE SE ESCRIBIO.
   El fallo es «gris de plantilla»: un suelo neutro, sin color dentro. La
   medida contaba pixeles con azul >= rojo y pedia mas de la mitad. Pero en un
   gris neutro azul ES IGUAL a rojo, asi que un gris muerto puntuaba 100 % y
   pasaba la prueba tan campante. Cazaba lo contrario de lo que promete.
   Lo que de verdad separa un suelo con color de uno muerto es el CROMA: la
   distancia media entre el canal rojo y el azul. Un neutro da ~0. La plata
   fria da unos pocos puntos por el lado del azul; el papel calido, los mismos
   por el lado del rojo. Las dos son direcciones de arte legitimas; el neutro
   no es ninguna. Se mide la distancia y se informa del signo. */
di(suelo.croma > 1.6,
   'y el suelo tiene color dentro, no es el gris de una plantilla: ' +
   suelo.croma.toFixed(2) + ' de croma medio (limite 1,6), y tira a ' +
   (suelo.frio > 0.5 ? 'frio' : 'calido'));

// ── «Compatible with» ──
const comp = await pg.evaluate(() => {
  const f = v => { v /= 255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4) };
  const rgba = c => { const m = (c||'').match(/[\d.]+/g); return m ? m.map(Number) : null };
  /* el fondo REAL: se sube por los padres componiendo cada capa con su alfa,
     que es justo el paso que faltaba para ver el fallo que esto tapaba */
  const fondoReal = el => {
    let capas = [], n = el;
    while (n && n !== document.documentElement) {
      const c = rgba(getComputedStyle(n).backgroundColor);
      if (c && (c[3] === undefined || c[3] > 0)) capas.push(c);
      n = n.parentElement;
    }
    capas.push([0,0,0,1]);
    let out = capas[capas.length-1].slice(0,3);
    for (let i = capas.length-2; i >= 0; i--) {
      const a = capas[i][3] === undefined ? 1 : capas[i][3];
      out = out.map((v,k) => capas[i][k]*a + v*(1-a));
    }
    return out;
  };
  const L = c => .2126*f(c[0]) + .7152*f(c[1]) + .0722*f(c[2]);
  const sub = document.querySelector('.lane-sub');
  const chips = [...document.querySelectorAll('.lane-in span')];
  const razones = chips.slice(0, 7).map(c => {
    const t = rgba(getComputedStyle(c).color), b = fondoReal(c);
    if (!t) return 0;
    const a = t[3] === undefined ? 1 : t[3];
    const mez = b.map((v,k) => t[k]*a + v*(1-a));
    const x = L(mez), y = L(b);
    return (Math.max(x,y)+.05) / (Math.min(x,y)+.05);
  });
  const puntos = chips.map(c => getComputedStyle(c, '::before').backgroundColor);
  return { sub: sub ? sub.textContent.trim().length : 0, n: chips.length,
           razones, peor: Math.min(...razones),
           colores: new Set(puntos).size, puntos: puntos.slice(0,7) };
});
di(comp.sub > 40, 'la seccion dice ya para que sirve (' + comp.sub + ' caracteres)');
di(comp.n >= 14, 'siguen las ' + comp.n + ' fichas de la fila');
/* ESTO PEDIA «FILETE Y ESQUINAS», Y ESO NO ES UNA PROPIEDAD DE LA PAGINA: ES
   UNA PASTILLA QUE HABIA. La pastilla se fue —era blanca sobre negro, y una
   fila de compatibilidad no es una botonera— y la comprobacion habria hecho
   que volviera, que es lo que hace una prueba escrita sobre el estilo en vez
   de sobre lo que el estilo tiene que conseguir.
   Y ademas tapaba el fallo. Dentro de esa pastilla blanca el nombre iba en
   «rgba(232,236,244,.78)»: BLANCO SOBRE BLANCO, 1,14 de contraste, invisible.
   La ficha existia, tenia su filete y sus esquinas, y la prueba pasaba tan
   contenta mientras los siete nombres no se leian.
   Lo que hay que pedir es que se LEAN, sobre lo que de verdad tengan detras,
   componiendo cada alfa. Comprobado inyectando el fallo viejo —el fondo blanco
   con la tinta clara— y la razon cae a 1,14. */
di(comp.peor >= 4.5,
   'y los siete nombres se leen sobre lo que tienen detras (el peor, ' +
   comp.peor.toFixed(2) + ':1; minimo 4,5)');
di(comp.colores >= 5, 'y con el color de su marca: ' + comp.colores + ' colores distintos');

// ── las cuatro garantias ──
const filas = await pg.evaluate(() => [...document.querySelectorAll('.rows li')].map(li => ({
  titulo: li.querySelector('b') ? li.querySelector('b').textContent.trim() : '',
  linea: li.querySelector('.rd') ? li.querySelector('.rd').textContent.trim() : '',
  hueco: Math.round(li.getBoundingClientRect().width -
    [...li.children].reduce((s, c) => s + c.getBoundingClientRect().width, 0)) })));
di(filas.length === 4, 'las cuatro garantias siguen ahi');
di(filas.every(f => f.linea.length > 20),
   'y cada una dice por que importa: ' + filas.map(f => '«' + f.linea.slice(0, 26) + '…»').join(' '));

// ── los doce idiomas ──
const dic = await pg.evaluate(() => JSON.parse(document.getElementById('i18n').textContent));
for (const k of filas.map(f => f.linea)) {
  di(Object.values(dic).every(d => d[k]), 'traducida en los doce: «' + k.slice(0, 30) + '…»');
}
const sub = await pg.evaluate(() => document.querySelector('.lane-sub').textContent.trim());
di(Object.values(dic).every(d => d[sub]), 'y la frase de «Compatible with» tambien');

// ── la escala tipografica ──
const tipo = await pg.evaluate(() => {
  const g = s => { const e = document.querySelector(s); if (!e) return null;
    const c = getComputedStyle(e), r = e.getBoundingClientRect();
    const sec = e.closest('section');
    const col = e.parentElement;
    return { px: Math.round(parseFloat(c.fontSize)),
             lineas: Math.round(r.height / parseFloat(c.lineHeight)),
             ancho: Math.round(r.width),
             columna: col ? Math.round(col.getBoundingClientRect().width) : 0,
             seccion: sec ? Math.round(sec.getBoundingClientRect().width) : 0 }; };
  return { h1: g('.hero h1'), sec: g('.sec-h'), press: g('.press-h'),
           sale: g('.sale-h'), join: g('.join-h') };
});
const titulares = ['sec','press','sale','join'].map(k => tipo[k]).filter(Boolean);
di(tipo.h1 && tipo.h1.px >= 90,
   'con 1440 de ancho el titular de portada pide sitio: ' + (tipo.h1 || {}).px + 'px');
/* El titular de portada vuelve a caber en un renglon: los cuerpos se
   devolvieron a como estaban a peticion del cliente. */
di(tipo.h1 && tipo.h1.lineas === 1, 'y cabe en un renglon');
di(titulares.every(t => t.px >= 70),
   'los titulares de seccion tambien: ' + titulares.map(t => t.px).join('/') + 'px');
/* El de «Security» estaba encerrado en una columna de 484 px teniendo 1360 de
   seccion, porque la caja llevaba la medida de LEER —56ch— y ahogaba al
   titular. La medida va en cada pieza, no en la caja. */
/* EL DENOMINADOR ERA LA SECCION, Y NO TODAS LAS SECCIONES SON UNA COLUMNA.
   Lo que esto defiende sigue valiendo entero: que a un titular no se le ponga
   la medida de LEER —55-70 caracteres— y se quede ahogado. Pero se medaba
   contra el ancho de la seccion, y la preventa va a DOS columnas: titular a la
   izquierda, panel de compra a la derecha. Medido, su titular ocupa el 100 %
   de su columna —637 de 637— y aun asi daba 44 % de la seccion y suspendia.
   No estaba ahogado: estaba lleno. El listón se mide ahora contra la caja en
   la que el titular vive de verdad, que es lo que la frase «media columna» ya
   decia. Comprobado inyectando el fallo: encajonando el titular en una caja
   estrecha baja al 34 % de su columna y vuelve a fallar. Ojo, que la primera
   inyeccion que probe —40ch— NO fallaba, y eso tambien enseña algo: 40
   caracteres a 76 px son 1.470 px, mas anchos que la columna entera. La
   medida de leer solo ahoga cuando el cuerpo es de leer; sobre un titular hay
   que encajonarlo de verdad para reproducir el fallo. */
di(titulares.every(t => t.ancho > (t.columna || t.seccion) * 0.45),
   'y ninguno encerrado en media columna: ' +
   titulares.map(t => Math.round(t.ancho / (t.columna || t.seccion) * 100) + '%').join(' '));
di(titulares.every(t => t.lineas <= 3), 'ninguno se parte en mas de tres renglones');

di(errs.length === 0, 'sin errores de pagina' + (errs.length ? ': ' + errs[0] : ''));
await ctx.close();

// ── el telefono ──
const ctx2 = await nav.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
const mo = await ctx2.newPage();
const errs2 = []; mo.on('pageerror', e => errs2.push(e.message));
await mo.goto('http://127.0.0.1:9007/', { waitUntil:'load' }); await mo.waitForTimeout(2500);
di((await mo.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) === 0,
   'en el telefono no se sale nada por el lado');
di(await mo.evaluate(() => {
  const li = document.querySelector('.rows li');
  if (!li) return false;
  const b = li.querySelector('b').getBoundingClientRect();
  const d = li.querySelector('.rd').getBoundingClientRect();
  return d.top >= b.bottom - 2;            // en el telefono, la linea va DEBAJO
}), 'y ahi la explicacion se pone debajo del titulo, no a su lado');
di(errs2.length === 0, 'sin errores en el telefono' + (errs2.length ? ': ' + errs2[0] : ''));
await ctx2.close();

console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
await nav.close(); srv.close();
process.exit(mal ? 1 : 0);
