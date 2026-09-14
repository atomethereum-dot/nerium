// La ruta: las tres fases de adopcion, debajo de la seccion de proyectos.
//
// Lo que sujeta, por orden de lo que mas duele si se rompe:
//
//   1. Que el TEXTO siga siendo el del whitepaper, letra por letra. Un
//      roadmap es un compromiso con quien pone dinero; si alguien edita la
//      tabla «Adoption phases» del whitepaper y la portada se queda con la
//      version vieja, la pagina pasa a prometer una cosa y el documento otra.
//      Esto compara las dos fuentes, no una copia mia de ninguna.
//   2. Que el rail se ANIME con el scroll: «--p» de 0 a 1 y las tres fases
//      encendiendose en orden. Es lo que se pidio.
//   3. Que los extremos del rail salgan de MEDIR los nodos y no de un numero
//      a ojo, que a ojo se descuadra en cuanto un titular pasa a dos renglones.
//   4. Que no entre en el menu: la cabecera tiene diez entradas y otra bateria
//      lo comprueba; esto es un capitulo, no una estacion.
//   5. Que el suelo sea el MISMO que el de la seccion de proyectos, que es lo
//      que hace que las dos se lean como un solo campo.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const RAIZ = '/home/user/nerium';
const TIPO = {'.html':'text/html','.svg':'image/svg+xml','.css':'text/css','.woff2':'font/woff2',
  '.png':'image/png','.jpg':'image/jpeg','.js':'text/javascript','.json':'application/json',
  '.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
const srv = http.createServer((q, r) => {
  let p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, {'content-type': TIPO[path.extname(p)] || 'application/octet-stream'});
  r.end(fs.readFileSync(p));
}).listen(9163);
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
let ok = 0, mal = 0;
const di = (b, t) => { if (b) { ok++; console.log('  ok  ' + t) } else { mal++; console.log('  MAL ' + t) } };

// ── 1 · el texto, contra el whitepaper ──────────────────────────────────────
{
  const wp = fs.readFileSync(path.join(RAIZ, 'whitepaper/index.html'), 'utf8');
  const home = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const limpio = s => s.replace(/&#8201;/g, ' ').replace(/&middot;/g, '·')
                       .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const FASES = ['Validation', 'Utility', 'Integration'];
  const OBJ = [
    'One asset class issued entirely on Nereum and transferred between qualified holders with no human intervention in the settlement path.',
    'Tokenized assets accepted as collateral. An asset reaches genuine liquidity when credit is available against it.',
    'The infrastructure ceases to be a decision factor for the issuer, in the same way interbank payment rails are not one today.',
  ];
  for (let i = 0; i < 3; i++) {
    di(limpio(wp).includes(limpio(OBJ[i])),
       'fase ' + (i + 1) + ' · el objetivo sigue en el whitepaper: «' + OBJ[i].slice(0, 46) + '…»');
    di(limpio(home).includes(limpio(OBJ[i])),
       'fase ' + (i + 1) + ' · y la portada dice exactamente lo mismo');
    di(home.includes('>' + FASES[i] + '</h3>'), 'fase ' + (i + 1) + ' · se titula «' + FASES[i] + '»');
  }
}

const ctx = await nav.newContext({ viewport:{ width:1440, height:900 } });
const pg = await ctx.newPage();
const fallos = [];
pg.on('pageerror', e => fallos.push(String(e).slice(0, 140)));
await pg.goto('http://127.0.0.1:9163/', { waitUntil:'load' });
await pg.waitForTimeout(900);
const alto = await pg.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < alto; y += 450) { await pg.evaluate(v => scrollTo(0, v), y); await pg.waitForTimeout(45); }

// ── 2 · donde esta y de que color ───────────────────────────────────────────
{
  const r = await pg.evaluate(() => {
    const s = document.getElementById('ruta');
    if (!s) return null;
    const b = document.getElementById('builds'), d = document.getElementById('docs');
    const cs = getComputedStyle(s), cb = getComputedStyle(b);
    return { padre:s.parentElement.tagName,
             tras:s.previousElementSibling && s.previousElementSibling.id,
             antes:s.nextElementSibling && s.nextElementSibling.id,
             bg:cs.backgroundColor, bgBuilds:cb.backgroundColor,
             dbg:s.getAttribute('data-bg'), dbgBuilds:b.getAttribute('data-bg'),
             fases:document.querySelectorAll('.ruta-f').length,
             menu:document.querySelectorAll('.nav>a').length,
             enMenu:!!document.querySelector('.nav>a[href="#ruta"]') };
  });
  di(!!r, 'la seccion existe');
  di(r.padre === 'MAIN', 'cuelga de «main», que es de donde la pagina lee los fondos (' + r.padre + ')');
  di(r.tras === 'builds', 'va justo DEBAJO de la seccion de proyectos (tras «' + r.tras + '»)');
  di(r.antes === 'docs', 'y justo encima de la de documentacion (antes de «' + r.antes + '»)');
  di(r.fases === 3, 'tres fases (' + r.fases + ')');
  di(r.bg === r.bgBuilds && r.dbg === r.dbgBuilds,
     'mismo suelo que proyectos: ' + r.bg + ' / ' + r.dbg);
  di(r.menu === 10 && !r.enMenu, 'no entra en el menu, que sigue con ' + r.menu + ' entradas');
}

// ── 3 · el recorrido y la hebra son UNA cosa ───────────────────────────────
// Antes el recorrido era una linea recta blanca por encima del dibujo, y se
// leian como dos cosas que no se conocen: una trenza que curva y un palo que
// no. Ahora la barra ES la hebra —la misma trenza, encendida hasta donde vas—
// y el punto cabalga la curva.
//
// Lo que se comprueba es justo eso, y no que «exista un elemento»: que no
// quede ninguna linea recta, que el punto caiga SOBRE el camino, y que el
// borde de la luz y el punto sean el mismo sitio.
{
  await pg.evaluate(() => document.getElementById('ruta').scrollIntoView({ block:'center' }));
  await pg.waitForTimeout(1100);
  const r = await pg.evaluate(() => {
    const ad = document.querySelector('.ruta-adn'), cad = getComputedStyle(ad);
    const caja = ad.getBoundingClientRect();
    const pu = document.querySelector('.ruta-punto'), cp = getComputedStyle(pu);
    const fl = document.querySelector('.ruta-flecha'), cf = getComputedStyle(fl);
    const rp = pu.getBoundingClientRect(), rf = fl.getBoundingClientRect();
    const viva = document.querySelector('.ruta-viva');
    const cabs = [...document.querySelectorAll('.ruta-cab')].map(c => {
      const b = c.getBoundingClientRect(); return (b.top - caja.top) / caja.height; });
    // donde pasa el camino a la altura del punto, preguntandoselo a el
    const esp = document.querySelector('#nr-adn-0');
    const vb = (document.querySelector('.ruta-viva svg').getAttribute('viewBox') || '').split(' ');
    const alto = +vb[3] || 0;
    const fPunto = (rp.top + rp.height / 2 - caja.top) / caja.height;
    let xCamino = null;
    if (esp && alto) {
      const u = fPunto * alto, L = esp.getTotalLength();
      let lo = 0, hi = L, q = null;
      for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; q = esp.getPointAtLength(m);
        if (q.y < u) lo = m; else hi = m; }
      xCamino = caja.left + q.x / 96 * caja.width;
    }
    return {
      puntos:document.querySelectorAll('.ruta-punto').length,
      aros:document.querySelectorAll('.ruta-nodo').length,
      rectas:document.querySelectorAll('.ruta-linea, .ruta-rail').length,
      colorPunto:cp.backgroundColor, radio:cp.borderRadius, sombra:cp.boxShadow,
      viva:!!viva, recorte:viva ? getComputedStyle(viva).clipPath : '',
      v0:parseFloat(cad.getPropertyValue('--v0')), v1:parseFloat(cad.getPropertyValue('--v1')),
      cab0:cabs[0] * 100, fPunto:fPunto * 100,
      ejePunto:(rp.left + rp.right) / 2, xCamino,
      galon:{ op:+cf.opacity, vis:cf.visibility, alto:+rf.height.toFixed(1) },
      titular:+(function(){ const e = document.querySelector('.ruta-h');
        const g = document.createRange(); g.selectNodeContents(e);
        return g.getBoundingClientRect().left; })().toFixed(1) };
  });
  di(r.puntos === 1 && r.aros === 0,
     'un solo punto y ningun aro, como en la referencia (' + r.puntos + ' punto, ' + r.aros + ' aros)');
  di(/^rgb\(62, 134, 255\)/.test(r.colorPunto) && r.radio.startsWith('50%'),
     'el punto va LLENO y azul: ' + r.colorPunto);
  di(r.sombra === 'none', 'y sin halo, que la referencia no lo lleva (' + r.sombra + ')');
  di(r.rectas === 0, 'no queda ninguna barra recta encima del dibujo (' + r.rectas + ' piezas)');
  di(r.viva && /inset/.test(r.recorte), 'la barra es la propia hebra encendida: ' + r.recorte);
  // EL punto de todo esto: el punto cae SOBRE el camino, no a su lado
  const desvio = r.xCamino === null ? 999 : Math.abs(r.ejePunto - r.xCamino);
  di(desvio <= 2, 'y el punto cabalga la curva: ' + desvio.toFixed(2) +
     ' px entre el punto y el camino a esa altura (maximo 2)');
  di(Math.abs(r.v0 - r.cab0) <= 1.2,
     'la luz arranca en el renglon del primer contador: ' + r.v0.toFixed(2) + '% vs ' + r.cab0.toFixed(2) + '%');
  di(Math.abs((100 - r.v1) - r.fPunto) <= 1.2,
     'y termina EN el punto, no antes ni despues: ' + (100 - r.v1).toFixed(2) + '% vs ' + r.fPunto.toFixed(2) + '%');
  di(r.galon.op === 1 && r.galon.vis === 'visible' && r.galon.alto > 8,
     'el galon del final se VE (opacidad ' + r.galon.op + ', ' + r.galon.alto + ' px)');
  di(r.ejePunto < r.titular, 'y todo ello en su carril, a la izquierda del texto: ' +
     r.ejePunto.toFixed(1) + ' vs ' + r.titular);
}

// ── 3b · el carril y el texto, separados de verdad ──────────────────────────
// El primer montaje ponia el rail en el mismo eje que el titular, asi que
// media hebra caia debajo de las primeras letras. Ahora la seccion tiene su
// propia columna y la hebra su carril, y esto lo mide a siete anchos.
//
// El borde de la hebra se mide CON EL RESPLANDOR: la sombra de las chispas y
// el «drop-shadow» del trazo se salen de la caja, y era justo eso lo que se
// comia el hueco cuando la medida a secas decia que habia sitio de sobra.
{
  for (const [W, H] of [[1512,900],[1440,900],[1280,900],[1024,800],[430,932],[390,844],[320,700]]) {
    const c = await nav.newContext({ viewport:{ width:W, height:H }, isMobile:W < 900, hasTouch:W < 900 });
    const p2 = await c.newPage();
    await p2.goto('http://127.0.0.1:9163/', { waitUntil:'load' });
    await p2.waitForTimeout(800);
    const alto = await p2.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < alto; y += 450) { await p2.evaluate(v => scrollTo(0, v), y); await p2.waitForTimeout(45); }
    await p2.evaluate(() => document.getElementById('ruta').scrollIntoView({ block:'center' }));
    await p2.waitForTimeout(800);
    const r = await p2.evaluate(() => {
      const sv = document.querySelector('.ruta-adn svg').getBoundingClientRect();
      const brillo = e => parseFloat((getComputedStyle(e).boxShadow.match(/0px 0px ([\d.]+)px/) || [0, 0])[1]) || 0;
      const chispas = [...document.querySelectorAll('.ruta-adn i')].map(e => e.getBoundingClientRect().right + brillo(e));
      const trazo = parseFloat((getComputedStyle(document.querySelector('.ruta-adn use')).filter
        .match(/drop-shadow\(0px 0px ([\d.]+)px/) || [0, 0])[1]) || 0;
      const derecha = Math.max(sv.right + trazo, ...chispas);
      // El borde del TEXTO con un «Range» sobre su contenido. Sumar el
      // «padding-left» que devuelve «getComputedStyle» NO vale: con barra de
      // scroll, un «clamp» en «vw» se reporta contra un ancho y se maqueta
      // contra otro, y salian 5 px de desajuste que en pantalla no existen.
      const borde = sel => { const e = document.querySelector(sel); if (!e) return null;
        const g = document.createRange(); g.selectNodeContents(e);
        const b = g.getBoundingClientRect(); return b.width ? b.left : null; };
      const bordes = ['.ruta-top', '.ruta-h', '.ruta-cab', '.ruta-t', '.ruta-p']
        .map(borde).filter(x => x !== null);
      /* TODO LO DE AQUI SE DESESCALA ANTES DE MEDIR.
         La seccion lleva un «scale» de 0,95-1 que va con el scroll, y
         «scrollIntoView» la deja en un punto distinto en cada ancho: a 1280
         se mide a 0,978 y a 1440 a 0,955. Encogida tira de sus cantos hacia
         el centro, asi que un recorte de 20 px se lee como si sobraran 13.
         Asi se colo: la medida era estable —misma cifra a 800 ms y a 3,3 s—
         pero indulgente. El centro de la seccion no se mueve con el «scale»,
         asi que desde el se deshace: x → cx + (x - cx) / k. */
      const sc = document.getElementById('ruta').getBoundingClientRect();
      const k = (getComputedStyle(document.getElementById('ruta')).transform
        .match(/matrix\(([\d.]+)/) || [0, 1])[1] * 1 || 1;
      const cx = sc.left + sc.width / 2;
      const real = x => cx + (x - cx) / k;

      // El canto IZQUIERDO de la hebra, y el eje del rail. Faltaban las dos:
      // sin la primera se colo una version con «--borde» a 11-22 px que
      // cortaba 18 px de hebra contra el borde de la pantalla, y sin la
      // segunda se colo que el rail leia «--borde» con «parseFloat» de un
      // «clamp()» —NaN— y se quedaba clavado en el respaldo, asi que la
      // hebra se movia y el rail no.
      const izq = Math.min(sv.left - trazo, ...[...document.querySelectorAll('.ruta-adn i')]
        .map(e => e.getBoundingClientRect().left - brillo(e)));
      const pt = document.querySelector('.ruta-punto').getBoundingClientRect();
      const ad = document.querySelector('.ruta-adn').getBoundingClientRect();
      return { derecha, izq:real(izq), escala:k,
               ejePunto:real(pt.left + pt.width / 2),
               hebraIzq:real(ad.left), hebraDer:real(ad.right),
               texto:Math.min(...bordes), disp:Math.max(...bordes) - Math.min(...bordes),
               scroll:document.documentElement.scrollWidth > innerWidth };
    });
    const hueco = r.texto - r.derecha;
    di(hueco >= 10, W + 'px · la hebra despega del texto: ' + hueco.toFixed(1) + ' px de hueco (minimo 10)');
    di(r.izq >= 0, W + 'px · y entra ENTERA: su canto izquierdo cae en ' + r.izq.toFixed(1)
       + ' px, en reposo (medido a escala ' + r.escala.toFixed(3) + ')');
    /* Ya no se pide que el punto este en el EJE: cabalga la curva, asi que
       se separa del centro a proposito. Que caiga sobre el camino lo mide el
       bloque 3; aqui solo se exige que no se salga de la hebra. */
    di(r.ejePunto > r.hebraIzq && r.ejePunto < r.hebraDer,
       W + 'px · el punto va DENTRO de la hebra: ' + r.ejePunto.toFixed(1) +
       ' entre ' + r.hebraIzq.toFixed(1) + ' y ' + r.hebraDer.toFixed(1));
    di(r.disp <= 1.5, W + 'px · y todo el texto de la seccion en una sola columna (dispersion ' + r.disp.toFixed(1) + ' px)');
    di(!r.scroll, W + 'px · sin scroll horizontal');
    await c.close();
  }
}

// ── 3c · la trenza es una trenza, no una barra ─────────────────────────────
// Dos fallos distintos la convirtieron en una barra blanca maciza, y ninguno
// se veia leyendo el CSS:
//
//   · la caja que envuelve las chispas es TAMBIEN un <i> dentro de
//     «.ruta-adn», asi que la regla «.ruta-adn i» —fondo #E4EFFF, para las
//     chispas— la pintaba a ella entera: un rectangulo macizo de la altura de
//     la seccion encima del dibujo;
//
//   · y las medidas proporcionales se escribieron como «calc(var(--adn)/56…)».
//     Una propiedad personalizada llega SIN resolver, asi que ahi dentro
//     «--adn» es la cadena «clamp(30px,4.4vw,74px)»: la cuenta sale px por px
//     —px al cuadrado— y la declaracion entera se cae. Apagaba el resplandor
//     en unas pantallas y mandaba el tamaño de las chispas a «auto» en otras.
//
// Asi que se comprueba lo que se ve: que dentro de la hebra no haya nada
// pintado que sea ancho —solo las chispas, y son diminutas— y que ni el trazo
// ni el resplandor se hayan caido.
{
  for (const [W, H] of [[1440,900],[1280,900],[390,844],[320,700]]) {
    const c = await nav.newContext({ viewport:{ width:W, height:H }, isMobile:W < 900, hasTouch:W < 900 });
    const p3 = await c.newPage();
    await p3.goto('http://127.0.0.1:9163/', { waitUntil:'load' });
    await p3.waitForTimeout(700);
    await p3.evaluate(() => document.getElementById('ruta').scrollIntoView({ block:'center' }));
    await p3.waitForTimeout(900);
    const r = await p3.evaluate(() => {
      const ad = document.querySelector('.ruta-adn');
      const ancho = ad.getBoundingClientRect().width;
      // lo que pinta un fondo dentro de la hebra, y cuanto ocupa
      const manchas = [...ad.querySelectorAll('*')].filter(e => {
        // el punto y el galon son el recorrido, no la trenza
        if (e.closest('.ruta-punto, .ruta-flecha')) return false;
        const cs = getComputedStyle(e);
        return cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none';
      }).map(e => ({ q:e.tagName.toLowerCase() + '.' + (e.getAttribute('class') || ''),
                     w:+e.getBoundingClientRect().width.toFixed(1) }));
      const ps = [...ad.querySelectorAll('use')].map(e => {
        const cs = getComputedStyle(e);
        return { sw:parseFloat(cs.strokeWidth), fill:cs.fill, luz:cs.filter };
      });
      return { ancho:+ancho.toFixed(1), manchas, ps,
               k:getComputedStyle(ad).getPropertyValue('--k').trim() };
    });
    const gorda = r.manchas.filter(m => m.w > 6);
    di(gorda.length === 0, W + 'px · nada macizo dentro de la hebra: ' +
       (gorda.length ? gorda.map(m => m.q + ' de ' + m.w + ' px' ).join(', ') + ' sobre una caja de ' + r.ancho
                     : r.manchas.length + ' piezas pintadas, ninguna pasa de 6 px'));
    di(r.ps.every(x => x.fill === 'none'), W + 'px · las hebras son trazo, no relleno');
    const sw = r.ps.map(x => x.sw);
    di(sw.every(v => v >= .3 && v <= 3), W + 'px · el trazo sale en pixeles razonables: ' +
       sw.map(v => v.toFixed(2)).join(', '));
    di(r.ps.every(x => x.luz !== 'none'), W + 'px · y el resplandor no se ha caido por una cuenta invalida');
    di(/^[0-9.]+$/.test(r.k), W + 'px · «--k» llega resuelto y sin unidades: "' + r.k + '"');
    await c.close();
  }
}

// ── 3d · la marca de fondo no se come el texto ─────────────────────────────
// El logo va detras del texto, y esto NO lo vigila «probar_contraste»: aquella
// bateria calcula el fondo subiendo por los padres, y un decorado colocado en
// absoluto no es padre de nada. Por eso se lee el PIXEL de la pantalla.
//
// Se mide con el texto escondido —lo que hay DETRAS— y con la animacion
// congelada en varios momentos del ciclo, que dura casi un minuto y el peor
// fotograma no tiene por que ser el primero.
//
// El limite no es un gusto: el parrafo de una fase no alcanzada va en
// rgba(226,236,250,.58), que compuesto sobre negro da luminancia 0,2517. Para
// no bajar de 4,5:1 el fondo no puede pasar de (0,3017/4,5) - 0,05 = 0,0170.
{
  const c = await nav.newContext({ viewport:{ width:1440, height:900 } });
  const p4 = await c.newPage();
  await p4.goto('http://127.0.0.1:9163/', { waitUntil:'load' });
  await p4.waitForTimeout(700);
  /* El scroll se CONVERGE, no se pide y ya. «scrollIntoView» en esta pagina no
     cae dos veces en el mismo sitio: hay secciones ancladas que cambian el
     alto del documento mientras te mueves, asi que cada tirada dejaba la ruta
     unos pixeles mas arriba o mas abajo, entraban renglones distintos en la
     franja medible y el resultado bailaba. Repitiendo hasta clavarlo, la
     medida sale igual siempre. */
  for (let i = 0; i < 12; i++) {
    const d = await p4.evaluate(() => {
      const r = document.getElementById('ruta').getBoundingClientRect();
      return (r.top + r.height / 2) - innerHeight / 2;
    });
    if (Math.abs(d) < 2) break;
    await p4.evaluate(v => scrollBy(0, v), d);
    await p4.waitForTimeout(90);
  }
  await p4.waitForTimeout(700);
  await p4.addStyleTag({ content:
    '.ruta-marca-v,.ruta-marca-g{animation-play-state:paused !important}' +
    /* «opacity:0» y no «visibility:hidden»: el sistema de revelado de la
       pagina le pone «visibility:visible» a los hijos al entrar, asi que el
       texto reaparecia y lo que se media era el azul del rotulo —rgb
       122,172,254— y no el fondo. La opacidad de un padre no la puede
       deshacer ningun hijo. */
    '.ruta-wrap{opacity:0 !important}' });
  /* LA ZONA SON LOS RENGLONES, uno por uno. Tres intentos hasta acertar, y los
     dos primeros daban lecturas de 0,4 y 0,7 que parecian decir que el logo
     cegaba la seccion:

       · desde la caja de «.ruta-h» —que empieza antes de su sangria— entraba
         el carril, y con el la hebra encendida, clara a proposito;
       · acotando en horizontal pero cogiendo los 900 px de alto entraban los
         filetes y el canto azul de la seccion, que no estan detras de ninguna
         letra; y como el scroll no cae dos veces en el mismo sitio —esta
         pagina tiene secciones ancladas— unas tiradas los pillaban y otras
         no. Una medida que solo a veces miente es peor que no tenerla.

     Asi que se miden los rectangulos del TEXTO, con «Range» y uno a uno: lo
     que no esta debajo de una letra no cuenta. */
  const zonas = await p4.evaluate(() => {
    const sec = document.getElementById('ruta').getBoundingClientRect();
    /* Y ademas: solo la franja CENTRAL de la pantalla, dejando 110 px arriba y
       abajo. Ahi es donde vive el cromo fijo —la barra de arriba, el boton de
       subir, el rotulo de seccion—, que va por encima de todo y es claro: un
       renglon que quedaba debajo de la barra se medía contra ella, un gris de
       94, y no contra el fondo de la seccion. Fallaba una tirada de cada tres
       o cuatro segun donde cayera el scroll.

       Se intento enumerar los elementos fijos y descartar lo que pisaran, y no
       vale: esta pagina lleva un lienzo fijo a pantalla completa que va DEBAJO
       y no tapa nada, y el filtro se quedaba sin un solo renglon que medir,
       que es otra manera de no comprobar nada. Una franja fija es tosca pero
       no miente. */
    const MARGEN = 110;
    const fuera = [];
    const mete = (e, quien) => { if (!e) return;
      const g = document.createRange(); g.selectNodeContents(e);
      for (const b of g.getClientRects()) {
        /* Los renglones que no caben ENTEROS en pantalla se descartan, no se
           recortan. Recortandolos, un renglon que asoma por arriba se
           convertia en una franja pegada a y=0 que en realidad cae sobre la
           seccion anterior: una tirada de cada tres media el fondo de otro
           sitio y daba un gris de 95 que aqui no existe. */
        /* Entero en pantalla Y entero dentro de la seccion. Lo segundo hacia
           falta: esta pagina apila secciones ancladas que se solapan mientras
           una entra, asi que un renglon que asoma por el canto de la ruta se
           mide contra el fondo de la de al lado. Era lo que daba un gris de 96
           en una tirada de cada tres, un gris que en esta seccion no existe. */
        if (b.top < 0 || b.bottom > innerHeight || b.left < 0 || b.right > innerWidth) continue;
        if (b.top < sec.top || b.bottom > sec.bottom) continue;
        if (b.top < MARGEN || b.bottom > innerHeight - MARGEN) continue;
        const x = Math.floor(b.left), y = Math.floor(b.top);
        const w = Math.ceil(b.right) - x, h = Math.ceil(b.bottom) - y;
        if (w > 4 && h > 4) fuera.push({ x, y, width:w, height:h, q:quien });
      }
    };
    mete(document.querySelector('.ruta-h'), 'h');
    mete(document.querySelector('.ruta-sub'), 'sub');
    document.querySelectorAll('.ruta-t,.ruta-p').forEach((e, i) =>
      mete(e, e.className.replace('ruta-', '') + i));
    return fuera;
  });
  di(zonas.length >= 3, 'hay texto de la ruta en pantalla para medir lo que tiene detras (' +
     zonas.length + ' renglones)');

  /* Antes de medir, que el texto este DE VERDAD apagado. Una tirada dio 0,41
     de fondo y el pixel culpable era el azul de un rotulo: la captura salio
     antes de que la regla hiciera efecto. Una medida que a veces miente es
     peor que no tenerla, asi que aqui se comprueba y se vuelve a comprobar al
     final, por si algo lo reenciende a mitad. */
  const apagado = async () => p4.evaluate(() =>
    getComputedStyle(document.querySelector('.ruta-wrap')).opacity);
  await p4.waitForFunction(() =>
    getComputedStyle(document.querySelector('.ruta-wrap')).opacity === '0', null, { timeout:4000 });

  let peor = 0, cuando = 0, donde = null;
  for (const d of [0, 9, 18, 27, 36, 45, 54, 63]) {
    await p4.evaluate(v => { document.querySelectorAll('.ruta-marca-v,.ruta-marca-g')
      .forEach(e => { e.style.animationDelay = (-v) + 's'; }); }, d);
    // dos cuadros, para que el cambio este pintado y no a medio pintar
    await p4.evaluate(() => new Promise(r =>
      requestAnimationFrame(() => requestAnimationFrame(r))));
    await p4.waitForTimeout(120);
    for (const zona of zonas) {
    const png = await p4.screenshot({ clip:zona });
    const L = await p4.evaluate(async b64 => {
      const img = new Image();
      await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + b64; });
      const cv = document.createElement('canvas');
      cv.width = img.width; cv.height = img.height;
      const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
      const px = g.getImageData(0, 0, cv.width, cv.height).data;
      const lin = v => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
      let max = 0, mx = 0, my = 0, rgb = '';
      for (let i = 0; i < px.length; i += 4) {
        const L = .2126 * lin(px[i]) + .7152 * lin(px[i+1]) + .0722 * lin(px[i+2]);
        if (L > max) { max = L; const n = i / 4;
          mx = n % cv.width; my = (n / cv.width) | 0;
          rgb = px[i] + ',' + px[i+1] + ',' + px[i+2]; }
      }
      return { max, mx, my, rgb, w:cv.width, h:cv.height };
    }, png.toString('base64'));
    if (L.max > peor) { peor = L.max; cuando = d; donde = Object.assign({}, L, { z:zona }); }
    }
  }
  /* El contraste que le queda al parrafo mas apagado contra ESE pixel.
     El color del parrafo se LEE de la pagina, no se escribe aqui: llevandolo
     a mano, el dia que alguien lo cambie la bateria seguiria dando por bueno
     un numero que ya no existe.

     La primera version ponia «(0.3017 + 0.05) / (peor + 0.05)» y el 0,3017 ya
     llevaba el 0,05 sumado: daba 5,23:1 donde de verdad habia 4,48 y dejaba
     pasar un fondo que no cumplia. */
  const opWrap = await apagado();
  const Ltexto = await p4.evaluate(() => {
    const c = getComputedStyle(document.querySelector('.ruta-f:last-of-type .ruta-p')).color;
    const m = c.match(/[\d.]+/g).map(Number);
    const a = m.length > 3 ? m[3] : 1;
    const lin = v => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
    // compuesto sobre negro, que es el suelo de la seccion
    const s = m.slice(0, 3).map(v => v * a);
    return .2126 * lin(s[0]) + .7152 * lin(s[1]) + .0722 * lin(s[2]);
  });
  const cr = (Ltexto + 0.05) / (peor + 0.05);
  di(cr >= 4.5, 'al parrafo mas apagado le quedan ' + cr.toFixed(2) +
     ':1 contra el fondo mas claro que le pone la marca (minimo 4,5; texto ' +
     Ltexto.toFixed(4) + ', fondo ' + peor.toFixed(4) + ', peor momento a los ' + cuando + ' s' +
     (donde ? ', rgb ' + donde.rgb + ' en ' + donde.mx + ',' + donde.my + ' en el renglon ' + donde.z.q + ' (' + donde.z.x + ',' + donde.z.y + ' ' + donde.z.width + 'x' + donde.z.height + ')' : '') + ', wrap op ' + opWrap + ')');
  di(cr >= 4.8, 'y con holgura, no al filo: ' + cr.toFixed(2) + ':1 (se pide 4,8 para no vivir en el limite)');
  di(opWrap === '0', 'y la medida es del FONDO: el texto seguia apagado al terminar (opacidad ' + opWrap + ')');
  await c.close();
}

// ── 4 · el punto baja con el scroll ────────────────────────────────────────
// Dos cosas distintas, y hay que medirlas por separado:
//
//   · el ESTADO —por que fase vas— cambia en el mismo cuadro del scroll, asi
//     que se puede leer recorriendo la seccion a pasos cortos;
//   · el SITIO del punto llega deslizandose, 0,8 s. Leerlo a 320 ms del paso
//     es leer un fotograma a medio camino: la primera version de esto daba
//     24 px de desvio y los 24 px eran el deslizamiento, no un fallo.
//
// Asi que el recorrido comprueba el estado, y el sitio se comprueba parado.
//
// Se RECORRE en vez de saltar a una fraccion: esta pagina lleva secciones
// ancladas que cambian de alto mientras la recorres, y un salto calculado no
// deja el scroll donde uno cree.
{
  const estado = () => pg.evaluate(() =>
    [...document.querySelectorAll('.ruta-f')].map(e => e.classList.contains('on') ? 1 : 0).join(''));
  const clavado = () => pg.evaluate(() => {
    const l = document.getElementById('rutaLista'), cl = l.getBoundingClientRect();
    const rp = document.querySelector('.ruta-punto').getBoundingClientRect();
    const cabs = [...document.querySelectorAll('.ruta-cab')].map(c => {
      const b = c.getBoundingClientRect(); return (b.top - cl.top) + b.height / 2; });
    const y = (rp.top - cl.top) + rp.height / 2;
    let cerca = 0, d = 1e9;
    cabs.forEach((c, i) => { if (Math.abs(c - y) < d) { d = Math.abs(c - y); cerca = i; } });
    return { fase:cerca, lejos:+d.toFixed(1) };
  });
  /* Colocarse arriba de la seccion cuesta varias pasadas: al subir desde
     abajo, las secciones ancladas de encima se re-despliegan y el documento
     cambia de alto, asi que el primer «scrollTo» aterriza en otro sitio. Se
     repite hasta que el borde superior se queda donde toca. */
  const arriba = async () => {
    for (let i = 0; i < 8; i++) {
      const d = await pg.evaluate(() => { const s = document.getElementById('ruta');
        const t = s.getBoundingClientRect().top - innerHeight * 0.92;
        scrollBy(0, t); return Math.abs(t); });
      await pg.waitForTimeout(320);
      if (d < 4) break;
    }
    await pg.waitForTimeout(900);
  };

  await arriba();
  di(await estado() === '100', 'al entrar solo esta encendida la fase 1 (' + await estado() + ')');
  const q0 = await clavado();
  di(q0.fase === 0 && q0.lejos <= 2, 'y el punto, parado, cae clavado en su renglon (' + q0.lejos + ' px)');

  const paso = await pg.evaluate(() => Math.round(document.getElementById('ruta').getBoundingClientRect().height / 16));
  const serie = [];
  for (let k = 0; k < 22; k++) {
    await pg.evaluate(d => scrollBy(0, d), paso);
    await pg.waitForTimeout(260);
    serie.push(await estado());
  }
  const n = serie.map(x => x.split('').filter(c => c === '1').length);
  di(n[n.length - 1] === 3, 'al salir estan las tres encendidas (' + serie[serie.length - 1] + ')');
  const atras = n.filter((v, i) => i && v < n[i - 1]).length;
  di(atras === 0, 'y nunca vuelve atras: ' + n.join('') + (atras ? ' — ' + atras + ' retrocesos' : ''));
  di(new Set(n).size === 3, 'pasa por las tres, sin saltarse ninguna (' + [...new Set(n)].join(',') + ')');
  const desorden = serie.filter(x => !/^1*0*$/.test(x)).length;
  di(desorden === 0, 'y siempre en orden, en las ' + serie.length + ' paradas del recorrido');

  await pg.waitForTimeout(1200);
  const q2 = await clavado();
  di(q2.fase === 2 && q2.lejos <= 2, 'al final, parado, el punto cae clavado en la fase 3 (' + q2.lejos + ' px)');
}

// ── 5 · sin movimiento, y sin desbordes ─────────────────────────────────────
{
  const c2 = await nav.newContext({ viewport:{ width:1280, height:900 }, reducedMotion:'reduce' });
  const p2 = await c2.newPage();
  await p2.goto('http://127.0.0.1:9163/', { waitUntil:'load' });
  await p2.waitForTimeout(900);
  await p2.evaluate(() => document.getElementById('ruta').scrollIntoView({ block:'center' }));
  await p2.waitForTimeout(700);
  await p2.evaluate(() => { const s = document.getElementById('ruta');
    scrollTo(0, scrollY + s.getBoundingClientRect().bottom - innerHeight * 0.4); });
  await p2.waitForTimeout(800);
  const r = await p2.evaluate(() => ({
    on:[...document.querySelectorAll('.ruta-f')].map(e => e.classList.contains('on') ? 1 : 0).join(''),
    tr:getComputedStyle(document.querySelector('.ruta-punto')).transitionDuration }));
  /* Sin movimiento el punto SIGUE avanzando —quien lo tiene desactivado
     tambien baja por la pagina y tiene que ver por que fase va—; lo unico que
     se apaga es el deslizamiento: salta en vez de deslizarse. */
  di(r.on === '111', 'sin movimiento el punto avanza igual (' + r.on + ')');
  di(/^0s?$/.test(r.tr.trim()), 'y lo que se apaga es el viaje, no el avance (transicion ' + r.tr + ')');
  await c2.close();

  for (const W of [320, 360, 390, 1440]) {
    const c3 = await nav.newContext({ viewport:{ width:W, height:840 }, isMobile:W < 900, hasTouch:W < 900 });
    const p3 = await c3.newPage();
    await p3.goto('http://127.0.0.1:9163/', { waitUntil:'load' });
    await p3.waitForTimeout(800);
    await p3.evaluate(() => document.getElementById('ruta').scrollIntoView({ block:'center' }));
    await p3.waitForTimeout(700);
    const r3 = await p3.evaluate(() => {
      const s = document.getElementById('ruta');
      const hijos = [...s.querySelectorAll('.ruta-t,.ruta-p,.ruta-h,.ruta-cab,.ruta-punto')];
      const fuera = hijos.filter(e => { const b = e.getBoundingClientRect();
        return b.width && (b.left < -1 || b.right > innerWidth + 1); }).length;
      return { fuera, scroll:document.documentElement.scrollWidth > innerWidth };
    });
    di(r3.fuera === 0 && !r3.scroll,
       W + 'px · nada se sale de la pantalla (' + r3.fuera + ' piezas fuera)');
    await c3.close();
  }
}

di(fallos.length === 0, 'sin errores de pagina' + (fallos.length ? ': ' + fallos.join(' | ') : ''));

console.log('\n' + ok + '/' + (ok + mal) + ' correctas');
await nav.close(); srv.close();
process.exit(mal ? 1 : 0);
