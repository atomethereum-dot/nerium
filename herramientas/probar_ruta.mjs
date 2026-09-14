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

// ── 3 · el rail es el de la referencia, y medido ────────────────────────────
// Un punto LLENO, un hueco, una linea BLANCA y un galon al final. Ni aros ni
// tres puntos ni la linea azul: eso fue invencion mia y no era lo que se pidio.
{
  await pg.evaluate(() => document.getElementById('ruta').scrollIntoView({ block:'center' }));
  await pg.waitForTimeout(900);
  const r = await pg.evaluate(() => {
    const l = document.getElementById('rutaLista'), cs = getComputedStyle(l);
    const cl = l.getBoundingClientRect();
    const pu = document.querySelector('.ruta-punto'), cp = getComputedStyle(pu);
    const li = document.querySelector('.ruta-linea'), cli = getComputedStyle(li);
    const fl = document.querySelector('.ruta-flecha'), cf = getComputedStyle(fl);
    const rp = pu.getBoundingClientRect(), rl = li.getBoundingClientRect(), rf = fl.getBoundingClientRect();
    const cabs = [...document.querySelectorAll('.ruta-cab')].map(c => {
      const b = c.getBoundingClientRect(); return (b.top - cl.top) + b.height / 2; });
    const fin = document.querySelector('.ruta-f:last-of-type .ruta-p').getBoundingClientRect();
    const w = document.querySelector('#ruta .wrap').getBoundingClientRect();
    const t = document.querySelector('.ruta-h').getBoundingClientRect();
    return {
      a:parseFloat(cs.getPropertyValue('--a')), b:parseFloat(cs.getPropertyValue('--b')),
      cab0:cabs[0], finTexto:(fin.bottom - cl.top),
      puntos:document.querySelectorAll('.ruta-punto').length,
      aros:document.querySelectorAll('.ruta-nodo').length,
      colorPunto:cp.backgroundColor, radio:cp.borderRadius, sombra:cp.boxShadow,
      colorLinea:cli.backgroundColor,
      hueco:+(rl.top - rp.bottom).toFixed(1), largo:+rl.height.toFixed(1),
      galon:{ op:+cf.opacity, vis:cf.visibility, alto:+rf.height.toFixed(1),
              bajo:+(rf.top - rl.bottom).toFixed(1) },
      eje:+((rp.left + rp.right) / 2).toFixed(1),
      titular:+(function(){ const e=document.querySelector('.ruta-h');
        const g=document.createRange(); g.selectNodeContents(e);
        return g.getBoundingClientRect().left; })().toFixed(1),
      wrap:+w.left.toFixed(1) };
  });
  di(r.puntos === 1 && r.aros === 0,
     'un solo punto y ningun aro, como en la referencia (' + r.puntos + ' punto, ' + r.aros + ' aros)');
  di(/^rgb\(62, 134, 255\)/.test(r.colorPunto) && r.radio.startsWith('50%'),
     'el punto va LLENO y azul: ' + r.colorPunto);
  di(r.sombra === 'none', 'y sin halo, que la referencia no lo lleva (' + r.sombra + ')');
  di(/rgba\(255, 255, 255/.test(r.colorLinea), 'la linea es BLANCA, no azul: ' + r.colorLinea);
  di(r.hueco >= 18, 'hay hueco entre el punto y la linea: ' + r.hueco + ' px');
  di(r.largo > 120, 'y la linea es larga, no un muñon: ' + r.largo + ' px');
  di(r.galon.op === 1 && r.galon.vis === 'visible' && r.galon.alto > 8,
     'el galon del final se VE (opacidad ' + r.galon.op + ', ' + r.galon.alto + ' px)');
  di(Math.abs(r.a - r.cab0) <= 1.5,
     'el rail arranca en el renglon del primer contador, medido: ' + r.a.toFixed(1) + ' vs ' + r.cab0.toFixed(1));
  di(r.a + r.b > r.finTexto,
     'y baja pasado el texto de la ultima fase (' + (r.a + r.b).toFixed(1) + ' > ' + r.finTexto.toFixed(1) + ')');
  di(r.eje < r.titular, 'el rail va en su carril, a la izquierda del texto: ' + r.eje + ' vs ' + r.titular);
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
      const trazo = parseFloat((getComputedStyle(document.querySelector('.ruta-adn path')).filter
        .match(/drop-shadow\(0px 0px ([\d.]+)px/) || [0, 0])[1]) || 0;
      const derecha = Math.max(sv.right + trazo, ...chispas);
      // El borde del TEXTO con un «Range» sobre su contenido. Sumar el
      // «padding-left» que devuelve «getComputedStyle» NO vale: con barra de
      // scroll, un «clamp» en «vw» se reporta contra un ancho y se maqueta
      // contra otro, y salian 5 px de desajuste que en pantalla no existen.
      const borde = sel => { const e = document.querySelector(sel); if (!e) return null;
        const g = document.createRange(); g.selectNodeContents(e);
        const b = g.getBoundingClientRect(); return b.width ? b.left : null; };
      const bordes = ['.ruta-k', '.ruta-h', '.ruta-cab', '.ruta-t', '.ruta-p']
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
               ejePunto:real(pt.left + pt.width / 2), ejeHebra:real(ad.left + ad.width / 2),
               texto:Math.min(...bordes), disp:Math.max(...bordes) - Math.min(...bordes),
               scroll:document.documentElement.scrollWidth > innerWidth };
    });
    const hueco = r.texto - r.derecha;
    di(hueco >= 10, W + 'px · la hebra despega del texto: ' + hueco.toFixed(1) + ' px de hueco (minimo 10)');
    di(r.izq >= 0, W + 'px · y entra ENTERA: su canto izquierdo cae en ' + r.izq.toFixed(1)
       + ' px, en reposo (medido a escala ' + r.escala.toFixed(3) + ')');
    const desvio = Math.abs(r.ejePunto - r.ejeHebra);
    di(desvio <= 2, W + 'px · el rail va por DENTRO de la hebra: ' + desvio.toFixed(1) + ' px entre los dos ejes (maximo 2)');
    di(r.disp <= 1.5, W + 'px · y todo el texto de la seccion en una sola columna (dispersion ' + r.disp.toFixed(1) + ' px)');
    di(!r.scroll, W + 'px · sin scroll horizontal');
    await c.close();
  }
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
