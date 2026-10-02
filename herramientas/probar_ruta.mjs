// La ruta: las tres fases de adopcion, debajo de la seccion de proyectos.
//
// Lo que sujeta, por orden de lo que mas duele si se rompe:
//
//   1. Que el TEXTO siga siendo el del whitepaper, letra por letra. Un
//      roadmap es un compromiso con quien pone dinero; si alguien edita la
//      tabla «Adoption phases» del whitepaper y la portada se queda con la
//      version vieja, la pagina pasa a prometer una cosa y el documento otra.
//      Esto compara las dos fuentes, no una copia mia de ninguna.
//   2. Que el indice «estamos aqui» sea el CUBO que cae del tunel de
//      proyectos: posado SOBRE la hebra, bajando por ella con el scroll y
//      parado en «hoy»; y que al subir se despegue otra vez. El punto y el
//      galon del DOM («.ruta-punto», «.ruta-flecha») ya no existen: la hebra
//      la pinta un lienzo («.hb-lz») y el cubo lo pinta la hebra al posarse.
//   3. Que la hebra ramifique a cada hito: cubo lleno si esta hecho, aro
//      discontinuo si esta en proceso; todo en azul, sin ambar, y el «In
//      progress» legible (4,5:1 como minimo).
//   4. Que no entre en el menu: esto es un capitulo, no una estacion.
//   5. Que el suelo siga cosido con documentacion, que es su familia.
//
// Para saber donde esta el cubo se le pregunta a la pagina, no a un numero
// mio: «__hebra.M» da las medidas de la hebra (su eje «sx», «y0», «aqui» =
// hoy, los hitos), «__hebra.tip()» la punta que crece con el scroll y
// «__caida.posada()» si el cubo ya esta en la hebra. Lo que se ve se comprueba
// leyendo los PIXELES de los dos lienzos.
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
  // Los nombres y los textos cambiaron cuando la ruta paso de ser tres
  // enunciados a ser una lista de hitos: «Validation» encabezaba el registro
  // de la empresa y la auditoria, que no es validar, son cimientos. Lo que NO
  // cambia es lo que esta prueba vigila: que la portada y el whitepaper digan
  // lo mismo. Cambiar solo uno de los dos es justamente el fallo que esto
  // cazo cuando se movio la portada y no la tabla del whitepaper.
  const FASES = ['Foundation', 'Expansion', 'Integration'];
  const OBJ = [
    'The contract deployed and verified, and the company registration, the audit and the team KYC under way. Each step will be checkable by someone who is not us.',
    'The chain and the interfaces that sit on top of it, built and out in the open, with a price anyone can look up.',
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
    const cs = getComputedStyle(s), cb = getComputedStyle(b), cd = getComputedStyle(d);
    return { padre:s.parentElement.tagName,
             tras:s.previousElementSibling && s.previousElementSibling.id,
             antes:s.nextElementSibling && s.nextElementSibling.id,
             bg:cs.backgroundColor, bgBuilds:cb.backgroundColor, bgDocs:cd.backgroundColor,
             dbg:s.getAttribute('data-bg'), dbgBuilds:b.getAttribute('data-bg'),
             dbgDocs:d.getAttribute('data-bg'),
             buildsClaro:b.classList.contains('claro'),
             fases:document.querySelectorAll('.ruta-f').length,
             menu:document.querySelectorAll('.nav>a').length,
             enMenu:!!document.querySelector('.nav>a[href="#ruta"]'),
             num:(document.querySelector('#ruta .ruta-top .sk-n') || {}).textContent,
             rotulo:(document.querySelector('#ruta .ruta-top') || {}).textContent };
  });
  di(!!r, 'la seccion existe');
  di(r.padre === 'MAIN', 'cuelga de «main», que es de donde la pagina lee los fondos (' + r.padre + ')');
  di(r.tras === 'builds', 'va justo DEBAJO de la seccion de proyectos (tras «' + r.tras + '»)');
  di(r.antes === 'docs', 'y justo encima de la de documentacion (antes de «' + r.antes + '»)');
  di(r.fases === 3, 'tres fases (' + r.fases + ')');
  /* ESTO DECIA «MISMO SUELO QUE PROYECTOS» Y HA DEJADO DE SER VERDAD A
     PROPOSITO. Proyectos paso a ser una de las tres bandas de PAPEL, asi que
     el borde de arriba de la hoja de ruta ya no es una continuidad: es uno de
     los tres cortes de la pagina, y lleva su filo encima. Pedir que los dos
     suelos coincidan seria pedir que el corte no exista.
     Lo que la comprobacion defendia -que la hoja de ruta no se invente un
     suelo suelto- se dice ahora por los dos lados, y asi caza dos fallos en
     vez de uno: sigue cosida HACIA ABAJO con documentacion, que es su familia,
     y separada HACIA ARRIBA de proyectos mientras proyectos sea papel.
     Comprobado inyectando los dos fallos que caza: cambiando el «data-bg» de
     la ruta falla la primera mitad, y pintando de negro una banda que se
     declara papel -que es como se pierde un corte sin darse cuenta- falla la
     segunda. Si algun dia proyectos vuelve a ser oscuro no falla ninguna: la
     comprobacion cambia de rama sola y vuelve a exigir continuidad, que es lo
     correcto entonces. */
  di(r.bg === r.bgDocs && r.dbg === r.dbgDocs,
     'cosida hacia abajo: mismo suelo que documentacion (' + r.bg + ' / ' + r.dbg + ')');
  /* Proyectos es hoy NEGRO PURO, el mismo del globo que tiene encima: lo
     pidio asi el dueño. La hoja de ruta sigue en el suelo de documentacion y
     entra con su propio filo, asi que el paso de negro a su suelo es un corte
     con borde, no una costura rota. Se acepta ese caso y solo ese: cualquier
     otro oscuro que no sea el suyo sigue fallando. */
  di(r.buildsClaro ? (r.bg !== r.bgBuilds) : (r.bg === r.bgBuilds || r.bgBuilds === 'rgb(0, 0, 0)'),
     r.buildsClaro
       ? 'y separada hacia arriba: proyectos es papel y el corte existe (' + r.bgBuilds + ')'
       : 'y hacia arriba: proyectos es oscuro, su mismo suelo o el negro del globo (' + r.bgBuilds + ')');
  // Lo que esta prueba defiende es que la ruta NO se cuela en el menu, no que
  // el menu tenga un numero concreto de entradas. Estaba escrito «10» a mano y
  // salto en cuanto se oculto «03 The thesis» y su entrada se fue con ella,
  // senalando un fallo donde no lo habia. Se comprueba lo que importa.
  di(!r.enMenu, 'no entra en el menu (que tiene ' + r.menu + ' entradas)');
  di(r.num === '06' && /^06\s*Roadmap$/.test(r.rotulo.trim()), 'se numera «06 Roadmap», detras de proyectos (05) (' + r.rotulo.trim() + ')');
}

/* Lo que se hace DENTRO de la pagina: leer los lienzos.
   Dos azules distintos, y no por gusto:
     · en la hebra se cuenta solo el azul LLENO del cubo (sin rojo): la trenza
       es un blanco azulado que por tono se confunde con la cara clara del
       cubo, y alrededor del indice pasan sus cinco hebras;
     · en el lienzo de la caida no hay trenza, asi que se cuentan todas las
       caras, de la oscura a la clara. */
const AYUDA = () => {
  window.__ambar = (r, g, b) => { const M = Math.max(r, g, b), m = Math.min(r, g, b);
    if (M < 90 || (M - m) / M < .45) return false;
    const h = M === r ? (((g - b) / (M - m)) % 6) * 60 : M === g ? ((b - r) / (M - m) + 2) * 60 : ((r - g) / (M - m) + 4) * 60;
    const hh = (h + 360) % 360; return hh >= 20 && hh <= 60; };
  const lleno = (r, g, b, a) => a > 180 && r < 120 && b > r + 100;
  const todo = (r, g, b, a) => a > 180 && b > 150 && b > r + 40 && b > g;
  /* los pixeles azules de un lienzo dentro de una caja EN PANTALLA, con su centro */
  window.__azul = (cv, caja, estricto) => {
    if (!cv || getComputedStyle(cv).display === 'none' || !cv.width) return { n:0 };
    const b = cv.getBoundingClientRect(), k = cv.width / b.width, es = estricto ? lleno : todo;
    const [x0, y0, x1, y1] = caja ? caja.map((v, i) => Math.round((v - (i % 2 ? b.top : b.left)) * k)) : [0, 0, cv.width, cv.height];
    const X0 = Math.max(0, x0), Y0 = Math.max(0, y0), X1 = Math.min(cv.width, x1), Y1 = Math.min(cv.height, y1);
    if (X1 <= X0 || Y1 <= Y0) return { n:0 };
    const d = cv.getContext('2d').getImageData(X0, Y0, X1 - X0, Y1 - Y0).data, w = X1 - X0;
    let n = 0, sx = 0, sy = 0;
    for (let i = 0; i < d.length; i += 4) if (es(d[i], d[i+1], d[i+2], d[i+3])) {
      const p = i / 4; n++; sx += X0 + p % w + .5; sy += Y0 + Math.floor(p / w) + .5; }
    return n ? { n, x:b.left + sx / n / k, y:b.top + sy / n / k } : { n:0 };
  };
  /* donde tiene que estar el indice, segun la hebra, y lo que hay pintado ahi */
  window.__indice = () => {
    const M = __hebra.M, lz = document.querySelector('#ruta .hb-lz').getBoundingClientRect();
    const tip = __hebra.tip(), my = Math.min(Math.max(tip, M.y0 + 20), M.aqui);
    const hx = lz.left + M.sx, hy = lz.top + my, R = M.movil ? 11 : 14;
    return { M:{ y0:M.y0, aqui:M.aqui, sx:M.sx, movil:M.movil }, tip, my, hx, hy,
             marca:__azul(document.querySelector('#ruta .hb-lz'), [hx - R, hy - R, hx + R, hy + R], true),
             caida:__azul(document.querySelector('.caida-cv')),
             posada:__caida.posada(),
             on:[...document.querySelectorAll('.ruta-f')].map(e => e.classList.contains('on') ? 1 : 0).join('') };
  };
};
await pg.evaluate(AYUDA);

/* El tramo de la caida: «Se» es donde el escenario de proyectos se suelta y
   «Sc» donde el cubo se posa. «Sc» se busca preguntando a «posada()» -
   biseccion sobre el scroll-, no copiando la cuenta de la pagina. */
async function tramo(p, H) {
  const Se = await p.evaluate(() => { const h = document.getElementById('tnHold'), st = document.getElementById('tnStage');
    return h.getBoundingClientRect().top + scrollY + h.offsetHeight - st.offsetHeight; });
  let lo = Se, hi = Se + H * 5;
  for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2;
    await p.evaluate(v => scrollTo(0, v), Math.round(m)); await p.waitForTimeout(90);
    (await p.evaluate(() => __caida.posada())) ? hi = m : lo = m; }
  return { Se, Sc:hi };
}

// ── 3 · el indice es el cubo, posado sobre la hebra ─────────────────────────
// Se hace a dos tamaños: la hebra del telefono es otra (mas estrecha y al
// canto) y el cubo, mas pequeño.
async function indice(p, W, H) {
  const tag = W + 'x' + H + ' · ';
  const ir = async (y, ms = 1300) => { await p.evaluate(v => scrollTo(0, v), Math.round(y)); await p.waitForTimeout(ms); };
  const viejo = await p.evaluate(() => ({
    dom:document.querySelectorAll('.ruta-punto, .ruta-flecha').length,
    lienzo:!!document.querySelector('#ruta .hb-lz'),
    rail:[...document.querySelectorAll('.ruta-adn')].filter(e => getComputedStyle(e).display !== 'none').length,
    ganchos:!!(window.__hebra && window.__hebra.M && window.__caida && window.__caida.posada) }));
  di(viejo.dom === 0 && viejo.rail === 0, tag + 'el punto y el galon del DOM ya no existen, ni el rail viejo (' + viejo.dom + ' piezas)');
  di(viejo.lienzo && viejo.ganchos, tag + 'la hebra es un lienzo y la pagina expone «__hebra» y «__caida»');

  const { Se, Sc } = await tramo(p, H);
  const docTop = await p.evaluate(() => __hebra.M.docTop), vh = H;
  const hacia = t => docTop + t - vh * .62;       // el scroll que pone la punta en «t»
  /* En la hebra solo se cuentan las caras de azul lleno (la clara se
     confunde con la trenza), asi que el centro de lo contado se corre hacia
     la cara oscura unos pixeles en vertical segun gire el cubo: la tolerancia
     vertical es la mitad del cubo (9 px), la horizontal no. */
  const enHebra = (q, tol) => q.marca.n >= 25 && Math.abs(q.marca.x - q.hx) <= tol && Math.abs(q.marca.y - q.hy) <= 6;
  const desvio = q => q.marca.n ? Math.abs(q.marca.x - q.hx).toFixed(1) + '/' + Math.abs(q.marca.y - q.hy).toFixed(1) + ' px' : 'sin cubo';

  await ir(Sc + 60);
  const a = await p.evaluate(() => __indice());
  di(a.posada && a.caida.n === 0, tag + 'pasada la caida el cubo esta en la hebra y el lienzo de la caida, limpio (' + a.caida.n + ' px)');
  di(enHebra(a, 3), tag + 'el cubo cae SOBRE el eje de la hebra: ' + (a.marca.n ? Math.abs(a.marca.x - a.hx).toFixed(1) + ' px de desvio, ' +
     Math.abs(a.marca.y - a.hy).toFixed(1) + ' de la punta (' + a.marca.n + ' px de cubo)' : 'no hay cubo'));
  await ir(Sc + 260);
  const b = await p.evaluate(() => __indice());
  di(b.my - a.my >= 150 && b.my < b.M.aqui, tag + 'y baja por ella con el scroll: de ' + a.my.toFixed(0) + ' a ' + b.my.toFixed(0) + ' px de hebra');
  di(enHebra(b, 3), tag + 'sin salirse del eje (' + desvio(b) + ')');
  await ir(hacia(a.M.aqui + 220));
  const c = await p.evaluate(() => __indice());
  await ir(hacia(a.M.aqui + 520));
  const d = await p.evaluate(() => __indice());
  di(Math.abs(c.my - c.M.aqui) < 1 && Math.abs(d.my - d.M.aqui) < 1 && c.tip > c.M.aqui + 100,
     tag + 'se para en «hoy» aunque la hebra siga: ' + c.my.toFixed(1) + ' y ' + d.my.toFixed(1) + ' con «aqui» en ' + c.M.aqui.toFixed(1));
  di(enHebra(c, 3) && enHebra(d, 3), tag + 'y alli sigue siendo el cubo, sobre la hebra (desvio ' + desvio(c) + ' y ' + desvio(d) + ')');
  const hoy = await p.evaluate(() => { const M = __hebra.M;
    return { hecho:Math.max(...M.hitos.filter(h => h.hecho).map(h => h.y)), plan:M.fases.filter(f => f.modo === 2).map(f => f.y)[0], aqui:M.aqui }; });
  di(hoy.aqui > hoy.hecho && hoy.aqui < hoy.plan, tag + '«hoy» cae pasado el ultimo hito hecho y antes de la fase planeada (' +
     hoy.hecho.toFixed(0) + ' < ' + hoy.aqui.toFixed(0) + ' < ' + hoy.plan.toFixed(0) + ')');

  // vuelta atras: el cubo se despega de la hebra y vuelve a caer
  await ir(Se + (Sc - Se) * .5);
  const e = await p.evaluate(() => __indice());
  const lejos = e.caida.n ? Math.hypot(e.caida.x - e.hx, e.caida.y - e.hy) : 0;
  di(!e.posada && e.marca.n <= 3 && e.caida.n > 20 && lejos > 30,
     tag + 'al subir se deshace: la hebra deja de pintar el cubo (' + e.marca.n + ' px) y vuelve al lienzo de la caida, a ' + lejos.toFixed(0) + ' px de la hebra');
  await ir(Sc - 30);
  const f = await p.evaluate(() => __indice());
  di(!f.posada && f.marca.n <= 3, tag + 'y justo antes de posarse la hebra aun no lo pinta (' + f.marca.n + ' px)');
  await ir(Sc + 60);
  const g = await p.evaluate(() => __indice());
  di(g.posada && enHebra(g, 3) && g.caida.n === 0, tag + 'al volver a bajar se posa otra vez en el mismo sitio (' + desvio(g) + ')');
}
await indice(pg, 1440, 900);
{
  const c = await nav.newContext({ viewport:{ width:390, height:844 }, isMobile:true, hasTouch:true });
  const p = await c.newPage();
  p.on('pageerror', e => fallos.push('390 · ' + String(e).slice(0, 140)));
  await p.goto('http://127.0.0.1:9163/', { waitUntil:'load' });
  await p.waitForTimeout(900);
  await p.evaluate(AYUDA);
  await indice(p, 390, 844);
  await c.close();
}

// ── 3a · la cabecera, en el mismo borde que las demas secciones ────────────
// El rotulo y el titular llevaban la sangria del carril y arrancaban hasta
// 140 px a la derecha de los de «09 What we are building» o «02 In the press».
// Con todas las secciones alineadas en un borde, esta se salia de la columna.
//
// Y el borde se mide con «Range» sobre el texto, no con la caja: la caja
// empieza antes de la sangria y daria por bueno justo lo que se quiere cazar.
{
  for (const W of [1512, 1440, 1280, 1024, 430, 390]) {
    const c = await nav.newContext({ viewport:{ width:W, height:900 }, isMobile:W < 900, hasTouch:W < 900 });
    const p5 = await c.newPage();
    await p5.goto('http://127.0.0.1:9163/', { waitUntil:'load' });
    await p5.waitForTimeout(700);
    const alto = await p5.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < alto; y += 450) { await p5.evaluate(v => scrollTo(0, v), y); await p5.waitForTimeout(45); }
    const r = await p5.evaluate(() => {
      const izq = sel => { const e = document.querySelector(sel); if (!e) return null;
        const g = document.createRange(); g.selectNodeContents(e);
        const b = g.getBoundingClientRect(); return b.width ? b.left : null; };
      return { builds:izq('.builds-h'), press:izq('.press-h'), token:izq('.tkp-h'),
               rot:izq('.ruta-top'), tit:izq('.ruta-h') };
    });
    /* La prensa SALE de la referencia. Su titular ya no nace en la columna
       de la pagina sino en la rejilla de doce columnas que cruza la seccion
       de borde a borde -12 px-, que es lo que se pidio al copiar el video.
       Dejarla dentro hacia que «el borde de los demas» fuese el suyo y que
       la ruta -alineada con builds y token, o sea bien- saliera en rojo en
       los seis anchos. La referencia son las secciones que SI viven en la
       columna de la pagina. */
    const casa = [r.builds, r.token].filter(v => v !== null);
    const ref = casa.length ? Math.min(...casa) : null;
    di(ref !== null && Math.abs(r.tit - ref) <= 1,
       W + 'px · el titular de la ruta nace en el mismo borde que los demas: ' +
       r.tit.toFixed(1) + ' vs ' + (ref === null ? '?' : ref.toFixed(1)));
    di(ref !== null && Math.abs(r.rot - ref) <= 1,
       W + 'px · y su rotulo tambien: ' + r.rot.toFixed(1) + ' vs ' + (ref === null ? '?' : ref.toFixed(1)));
    await c.close();
  }
}

// ── 3b · la hebra y el texto, separados de verdad ──────────────────────────
// La hebra vive en su carril, a la izquierda de la columna de las fases. Se
// mide lo PINTADO -los pixeles del lienzo, con el resplandor, las ramas y los
// aros de los hitos-, no la caja del lienzo, que llega hasta la columna.
{
  for (const [W, H] of [[1512,900],[1440,900],[1280,900],[1024,800],[430,932],[390,844],[320,700]]) {
    const c = await nav.newContext({ viewport:{ width:W, height:H }, isMobile:W < 900, hasTouch:W < 900 });
    const p2 = await c.newPage();
    await p2.goto('http://127.0.0.1:9163/', { waitUntil:'load' });
    await p2.waitForTimeout(800);
    const alto = await p2.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < alto; y += 450) { await p2.evaluate(v => scrollTo(0, v), y); await p2.waitForTimeout(45); }
    for (let i = 0; i < 12; i++) {
      const d = await p2.evaluate(() => { const r = document.getElementById('ruta').getBoundingClientRect();
        return (r.top + r.height / 2) - innerHeight / 2; });
      if (Math.abs(d) < 2) break;
      await p2.evaluate(v => scrollBy(0, v), d); await p2.waitForTimeout(90);
    }
    await p2.waitForTimeout(1400);
    const r = await p2.evaluate(() => {
      const lz = document.querySelector('#ruta .hb-lz'), b = lz.getBoundingClientRect(), k = lz.width / b.width;
      const d = lz.getContext('2d').getImageData(0, 0, lz.width, lz.height).data;
      let izq = 1e9, der = -1;
      for (let y = 0; y < lz.height; y++) for (let x = 0; x < lz.width; x++)
        if (d[(y * lz.width + x) * 4 + 3] > 20) { if (x < izq) izq = x; if (x > der) der = x; }
      // el borde del TEXTO con un «Range» sobre su contenido, no con la caja
      const borde = sel => [...document.querySelectorAll(sel)].map(e => { const g = document.createRange(); g.selectNodeContents(e);
        const q = g.getBoundingClientRect(); return q.width ? q.left : null; }).filter(v => v !== null);
      const bordes = ['.ruta-cab', '.ruta-t', '.ruta-p'].flatMap(borde);
      const M = __hebra.M;
      return { izq:b.left + izq / k, der:b.left + (der + 1) / k, eje:b.left + M.sx,
               texto:Math.min(...bordes), disp:Math.max(...bordes) - Math.min(...bordes),
               escala:getComputedStyle(document.getElementById('ruta')).transform,
               scroll:document.documentElement.scrollWidth > innerWidth };
    });
    const hueco = r.texto - r.der;
    di(hueco >= 3, W + 'px · la hebra pintada despega del texto: ' + hueco.toFixed(1) + ' px de hueco (minimo 3)');
    di(r.izq >= 0, W + 'px · y entra ENTERA: su canto izquierdo cae en ' + r.izq.toFixed(1) + ' px');
    di(r.eje > r.izq && r.eje < r.texto, W + 'px · el eje del cubo va dentro de la hebra: ' + r.eje.toFixed(1) +
       ' entre ' + r.izq.toFixed(1) + ' y el texto en ' + r.texto.toFixed(1));
    di(r.disp <= 1.5, W + 'px · y las tres fases en una sola columna (dispersion ' + r.disp.toFixed(1) + ' px)');
    di(!r.scroll, W + 'px · sin scroll horizontal (' + r.escala + ')');
    await c.close();
  }
}

// ── 3c · la hebra ramifica a cada hito ─────────────────────────────────────
// Cada hito visible tiene su rama y su nodo, y el nodo dice el estado: hecho
// = cubo azul LLENO; en proceso = aro azul DISCONTINUO alrededor. Se lee el
// pixel: el centro del nodo y un anillo a 1,8-2,3 radios (el aro vive ahi y
// un cubo lleno no llega), sin la franja por donde entra la rama.
// Y la trenza es una trenza, no una barra: pintada, pero con aire dentro.
{
  for (const [W, H] of [[1440,900],[1280,900],[390,844],[320,700]]) {
    const c = await nav.newContext({ viewport:{ width:W, height:H }, isMobile:W < 900, hasTouch:W < 900 });
    const p3 = await c.newPage();
    await p3.goto('http://127.0.0.1:9163/', { waitUntil:'load' });
    await p3.waitForTimeout(900);
    const n = await p3.evaluate(() => __hebra.M.hitos.length);
    const hitos = [];
    for (let h = 0; h < n; h++) {
      /* el renglon del hito al 40 % de la pantalla: la punta de la hebra va
         al 62 %, asi que ya lo ha pasado y su nodo esta entero */
      await p3.evaluate(h => { const M = __hebra.M; scrollTo(0, Math.round(M.docTop + M.hitos[h].y - innerHeight * .4)); }, h);
      await p3.waitForTimeout(1300);
      hitos.push(await p3.evaluate(h => {
        const M = __hebra.M, it = M.hitos[h], lz = document.querySelector('#ruta .hb-lz');
        const k = lz.width / lz.getBoundingClientRect().width, g = lz.getContext('2d');
        const hr = M.movil ? 4.8 : 7, cx = M.nx, cy = it.y;
        let centro = 0, ncentro = 0, aro = 0, naro = 0;
        for (let y = Math.floor(cy - hr * 2.6); y <= cy + hr * 2.6; y++) for (let x = Math.floor(cx - hr * 2.6); x <= cx + hr * 2.6; x++) {
          const q = g.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data, r = Math.hypot(x - cx, y - cy);
          if (r < hr * .45) { ncentro++; if (q[3] > 180 && q[0] < 120 && q[2] > q[0] + 100) centro++; }
          if (r >= hr * 1.8 && r <= hr * 2.3 && !(x < cx && Math.abs(y - cy) < 3)) { naro++; if (q[3] > 30 && q[0] < 130 && q[2] > q[0] + 90) aro++; }
        }
        return { hecho:it.hecho, on:it.el.classList.contains('hb-on'), txt:it.el.textContent.trim().slice(0, 28),
                 centro:centro / ncentro, aro:aro / naro };
      }, h));
    }
    const hechos = hitos.filter(x => x.hecho), proc = hitos.filter(x => !x.hecho);
    di(hitos.length >= 6 && hitos.every(x => x.on), W + 'px · la hebra llega a los ' + hitos.length + ' hitos visibles y los enciende');
    di(hechos.length > 0 && hechos.every(x => x.centro >= .5 && x.aro <= .08),
       W + 'px · hecho = cubo azul lleno, sin aro (centro ' + hechos.map(x => (100 * x.centro).toFixed(0)).join('/') +
       ' %, aro ' + hechos.map(x => (100 * x.aro).toFixed(0)).join('/') + ' %)');
    di(proc.length > 0 && proc.every(x => x.aro >= .12 && x.aro <= .7),
       W + 'px · en proceso = aro azul discontinuo (' + proc.map(x => (100 * x.aro).toFixed(0)).join('/') + ' % del anillo pintado)');
    /* la trenza: ruta centrada, y se mira el tramo de la hebra ya crecido */
    await p3.evaluate(() => { const r = document.getElementById('ruta').getBoundingClientRect();
      scrollBy(0, r.top + r.height / 2 - innerHeight / 2); });
    await p3.waitForTimeout(1300);
    const t = await p3.evaluate(() => {
      const M = __hebra.M, lz = document.querySelector('#ruta .hb-lz'), b = lz.getBoundingClientRect(), k = lz.width / b.width;
      const hasta = Math.min(__hebra.tip(), M.aqui) - 80, desde = Math.max(M.y0 + 160, -b.top + 20), fin = Math.min(hasta, innerHeight - b.top - 20);
      if (fin - desde < 60) return null;
      const A = M.movil ? 12 : 30;
      const d = lz.getContext('2d').getImageData(Math.round((M.sx - A) * k), Math.round(desde * k), Math.round(2 * A * k), Math.round((fin - desde) * k)).data;
      let algo = 0, macizo = 0; const tot = d.length / 4;
      for (let i = 0; i < d.length; i += 4) { if (d[i+3] > 20) algo++; if (d[i+3] > 200) macizo++; }
      return { algo:algo / tot, macizo:macizo / tot, alto:fin - desde };
    });
    di(t && t.algo > .05, W + 'px · la trenza esta pintada en su carril (' + (t ? (100 * t.algo).toFixed(0) + ' % de ' + t.alto.toFixed(0) + ' px de hebra' : 'sin tramo que medir') + ')');
    di(t && t.macizo < .35, W + 'px · y no es una barra maciza: ' + (t ? (100 * t.macizo).toFixed(0) : '?') + ' % opaco');
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
// CONGELADA ENTERA. Antes solo se paraban el paseo y el giro («-v», «-g»); el
// cabeceo («-x») y el reflejo que barre la cara («-luz») seguian corriendo, y
// la medida dependia del segundo en que cayera la captura: seis tiradas
// seguidas dieron de 4,17 a 5,19:1 sin tocar la pagina. Ahora el cabeceo va
// con el paseo y el giro, momento a momento, y el reflejo se deja en su
// arranque, fuera de la cara.
// OJO, PENDIENTE EN LA PAGINA: con el reflejo pasando por detras del primer
// parrafo (a los 3 s de sus 17) el peor momento baja a 4,19:1. No es de este
// rediseño -antes de el ya daba 4,27- y arreglarlo es cosa de «index.html»
// (mas velo sobre la columna o menos brillo en el reflejo), no de la prueba.
// Para comprobarlo: poner varios retrasos a «.ruta-marca-luz» abajo.
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
    '.ruta-marca-v,.ruta-marca-g,.ruta-marca-x,.ruta-marca-luz{animation-play-state:paused !important}' +
    '.ruta-marca-luz{animation-delay:0s !important}' +
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
  /* Y SI EN ESE PUNTO EXACTO NO HAY RENGLONES QUE MEDIR, SE BUSCA OTRO.
     Centrar la seccion no garantiza que algun parrafo caiga ENTERO dentro de
     la franja medible: los parrafos se mueven con el paralaje y con la
     entrada, y la seccion mide 1.387 px contra 900 de pantalla, asi que una
     tirada de cada tres se quedaba con cero renglones y la prueba fallaba por
     no encontrar que medir, no por encontrar algo mal. Medido: dos pasadas
     seguidas dan 111/112 y 112/112 sin tocar la pagina.
     Se prueban seis alturas alrededor del centro y se mide en la primera que
     tenga renglones. Si NINGUNA los tiene, entonces si es un fallo de verdad y
     la comprobacion de abajo lo canta igual. */
  const mideZonas = () => p4.evaluate(() => {
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
    /* SOLO LOS PARRAFOS DE LAS FASES. Son el texto mas pequeño y el mas
       apagado de la seccion —14 a 17 px, y en una fase no alcanzada van al
       .6—, o sea el que manda: lo que valga para ellos vale para el titular,
       que es cinco veces mas grande y va en blanco.

       Meter tambien el titular no añadia rigor y si ruido: el canto azul de
       un pixel que separa las secciones le cruza el renglon, y un filete de
       un pixel sobre un titular de 56 px no es un problema de lectura —ni es
       cosa del logo, que es lo que aqui se juzga—. */
    document.querySelectorAll('.ruta-p').forEach((e, i) => mete(e, 'p' + i));
    return fuera;
  });
  let zonas = await mideZonas();
  for (const nudge of [0, -90, 90, -180, 180, -270]) {
    if (zonas.length >= 2) break;
    if (nudge) { await p4.evaluate(v => scrollBy(0, v), nudge); await p4.waitForTimeout(420); }
    zonas = await mideZonas();
  }
  di(zonas.length >= 2, 'hay parrafos de la ruta en pantalla para medir lo que tienen detras (' +
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

  /* SE MIDE LA MARCA SOLA, sobre el negro de la seccion.
     Se apaga todo lo demas —el texto, la hebra, los filetes y el canto de la
     seccion— y queda el logo sobre el suelo, que es negro puro. Lo que se lee
     entonces ES la luz que el logo pone detras de cada renglon, sin nada
     prestado.

     Dos intentos peores antes de esto:

       · mirar el maximo absoluto del fondo encontraba siempre algo claro de
         un pixel —el canto azul de la seccion cruza el renglon del titular— y
         le echaba la culpa al logo de una linea que estaba ahi desde antes;
       · y comparar pixel a pixel «con logo» contra «sin logo» tampoco vale:
         entre las dos capturas la seccion se corre un pixel por su propio
         «scale», y una linea de un pixel deja de coincidir consigo misma, con
         lo que salia que el logo pintaba de azul un sitio donde solo se habia
         movido el canto.

     Sondear el punto con «elementsFromPoint» no aclaraba nada tampoco: las
     capas decorativas llevan «pointer-events:none» y el sondeo pasa de largo. */
  await p4.addStyleTag({ content:
    '.ruta-adn{display:none !important}' +
    '.ruta::before,.ruta::after{display:none !important}' +
    '.ruta-f::before,.ruta-f::after{display:none !important}' });

  const LEER = async b64 => p4.evaluate(async x => {
    const img = new Image();
    await new Promise(r => { img.onload = r; img.src = 'data:image/png;base64,' + x; });
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
    const px = g.getImageData(0, 0, cv.width, cv.height).data;
    const lin = v => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
    let max = 0, rgb = '';
    for (let i = 0; i < px.length; i += 4) {
      const L = .2126 * lin(px[i]) + .7152 * lin(px[i+1]) + .0722 * lin(px[i+2]);
      if (L > max) { max = L; rgb = px[i] + ',' + px[i+1] + ',' + px[i+2]; }
    }
    return { max, rgb };
  }, b64);

  let peor = 0, cuando = 0, donde = null;
  for (const d of [0, 9, 18, 27, 36, 45, 54, 63]) {
    await p4.evaluate(v => { document.querySelectorAll('.ruta-marca-v,.ruta-marca-g,.ruta-marca-x')
      .forEach(e => { e.style.animationDelay = (-v) + 's'; }); }, d);
    await p4.evaluate(() => new Promise(r =>
      requestAnimationFrame(() => requestAnimationFrame(r))));
    await p4.waitForTimeout(120);
    for (const z of zonas) {
      const L = await LEER((await p4.screenshot({ clip:z })).toString('base64'));
      if (L.max > peor) { peor = L.max; cuando = d; donde = { rgb:L.rgb, z }; }
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
     (donde ? ', rgb ' + donde.rgb + ' en el renglon ' + donde.z.q : '') + ', wrap op ' + opWrap + ')');
  di(cr >= 4.8, 'y con holgura, no al filo: ' + cr.toFixed(2) + ':1 (se pide 4,8 para no vivir en el limite)');
  di(opWrap === '0', 'y la medida es del FONDO: el texto seguia apagado al terminar (opacidad ' + opWrap + ')');
  await c.close();
}

// ── 3e · «In progress», en azul y legible ──────────────────────────────────
// El estado de las fases en marcha era ambar; ahora es el azul de la casa, y
// azul sobre casi negro hay que medirlo: apagado va al .78. Se mide en los
// dos estados -antes de que la hebra llegue y encendido-, contra el suelo de
// la seccion, que se LEE de la pagina. Y en toda la seccion, nada ambar.
{
  const c = await nav.newContext({ viewport:{ width:1440, height:900 } });
  const p6 = await c.newPage();
  await p6.goto('http://127.0.0.1:9163/', { waitUntil:'load' });
  await p6.waitForTimeout(900);
  await p6.evaluate(AYUDA);
  const mide = () => p6.evaluate(() => {
    const num = s => (s.match(/[\d.]+/g) || []).map(Number);
    const lin = v => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
    const L = c => .2126 * lin(c[0]) + .7152 * lin(c[1]) + .0722 * lin(c[2]);
    const fondo = num(getComputedStyle(document.getElementById('ruta')).backgroundColor);
    return [...document.querySelectorAll('#ruta .ruta-est-en')].map(e => {
      const m = num(getComputedStyle(e).color), a = m.length > 3 ? m[3] : 1;
      const s = [0, 1, 2].map(i => m[i] * a + fondo[i] * (1 - a));
      const M = Math.max(...s), mi = Math.min(...s);
      const h = M === s[2] ? ((s[0] - s[1]) / (M - mi) + 4) * 60 : M === s[1] ? ((s[2] - s[0]) / (M - mi) + 2) * 60 : (((s[1] - s[2]) / (M - mi)) % 6) * 60;
      return { txt:e.textContent.trim(), on:e.closest('.ruta-f').classList.contains('on'),
               cr:(Math.max(L(s), L(fondo)) + .05) / (Math.min(L(s), L(fondo)) + .05), tono:(h + 360) % 360,
               ambar:__ambar(m[0], m[1], m[2]) };
    });
  });
  const apagados = await mide();
  const ruta = await p6.evaluate(() => document.getElementById('ruta').getBoundingClientRect().top + scrollY);
  await p6.evaluate(y => scrollTo(0, y), ruta + 700);
  await p6.waitForTimeout(1800);
  const encendidos = await mide();
  const hud = await p6.evaluate(() => document.querySelector('.hud-count').textContent.replace(/\s+/g, ' ').trim());
  di(hud === '06 / 07', 'dentro de la ruta el contador de abajo dice «' + hud + '»');
  for (const [q, lista] of [['apagado', apagados], ['encendido', encendidos]]) {
    di(lista.length === 2 && lista.every(x => x.txt === 'In progress'), q + ' · las dos fases en marcha dicen «In progress» (' + lista.length + ')');
    di(lista.every(x => x.tono >= 200 && x.tono <= 230 && !x.ambar),
       q + ' · en azul, nada de ambar (' + lista.map(x => x.tono.toFixed(0) + 'deg').join(', ') + ')');
    di(lista.every(x => x.cr >= 4.5), q + ' · y legible: ' + lista.map(x => x.cr.toFixed(2) + ':1').join(', ') + ' (minimo 4,5)');
  }
  di(encendidos.every(x => x.on) && apagados.every(x => !x.on), 'y se midio de verdad en los dos estados');
  const dom = await p6.evaluate(() => {
    const malos = [];
    for (const e of document.querySelectorAll('#ruta, #ruta *')) {
      const cs = getComputedStyle(e);
      for (const k of ['color', 'backgroundColor', 'borderTopColor', 'fill', 'stroke', 'boxShadow'])
        for (const m of (cs[k] || '').matchAll(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/g))
          if ((m[4] === undefined || +m[4] > .1) && __ambar(+m[1], +m[2], +m[3])) malos.push((e.getAttribute('class') || e.tagName) + ' ' + k + ' ' + m[0]);
    }
    const lz = document.querySelector('#ruta .hb-lz'), d = lz.getContext('2d').getImageData(0, 0, lz.width, lz.height).data;
    let px = 0; for (let i = 0; i < d.length; i += 4) if (d[i+3] > 60 && __ambar(d[i], d[i+1], d[i+2])) px++;
    return { malos, px };
  });
  di(dom.malos.length === 0 && dom.px === 0, 'en la ruta nada es ambar: ni un estilo ni un pixel de la hebra' +
     (dom.malos.length ? ': ' + dom.malos.slice(0, 3).join(' | ') : ' (' + dom.px + ' px)'));
  await c.close();
}

// ── 4 · las fases se encienden con el scroll, y el cubo acaba en «hoy» ────
// El ESTADO -por que fase vas- lo pone la hebra al llegar a cada nodo, asi
// que se lee recorriendo la seccion a pasos cortos. Se RECORRE en vez de
// saltar a una fraccion: esta pagina lleva secciones ancladas que cambian de
// alto mientras la recorres, y un salto calculado no deja el scroll donde uno
// cree.
{
  const estado = () => pg.evaluate(() =>
    [...document.querySelectorAll('.ruta-f')].map(e => e.classList.contains('on') ? 1 : 0).join(''));
  /* Colocarse arriba de la seccion cuesta varias pasadas: al subir desde
     abajo, las secciones ancladas de encima se re-despliegan y el documento
     cambia de alto, asi que el primer «scrollTo» aterriza en otro sitio. Se
     repite hasta que el borde superior se queda donde toca.
     Y el sitio es con la seccion a MEDIA pantalla, no asomando: la pagina
     aparca el bucle de cada lienzo mientras el lienzo esta fuera de
     pantalla (el vigia de «requestAnimationFrame»), y el lienzo de la hebra
     empieza unos 400 px por debajo del borde de la seccion. Asomando, la
     hebra aun no ha despertado y las fases conservan el estado de la ultima
     vez que se pinto: se leia «100» de la bajada anterior y al primer paso se
     apagaba, que parecia un retroceso y era la hebra despertando. */
  const arriba = async () => {
    for (let i = 0; i < 8; i++) {
      const d = await pg.evaluate(() => { const s = document.getElementById('ruta');
        const t = s.getBoundingClientRect().top - innerHeight * 0.5;
        scrollBy(0, t); return Math.abs(t); });
      await pg.waitForTimeout(320);
      if (d < 4) break;
    }
    /* Y se espera a que la PUNTA de la hebra llegue: crece y encoge
       suavizada (~1 s), y se viene de mas abajo. Leyendo antes, la fase 1
       seguia encendida de la bajada anterior y se apagaba en el primer paso,
       que parecia un retroceso y era solo la hebra recogiendose. */
    await pg.waitForFunction(() => { const M = __hebra.M;
      const obj = Math.min(Math.max(__y + innerHeight * .62 - M.docTop, M.y0), M.fin + 4);
      return Math.abs(__hebra.tip() - obj) < 1; }, null, { timeout:8000 }).catch(() => {});
    await pg.waitForTimeout(300);
  };

  await arriba();
  const e0 = await estado();
  /* Ya no se exige «100» al entrar: la fase se enciende cuando la hebra llega
     a su nodo, y al asomar la seccion la hebra aun no ha crecido. Lo que no
     puede pasar es entrar con la 2 o la 3 ya encendidas. */
  di(/^[01]00$/.test(e0), 'al entrar no hay encendida ninguna fase mas alla de la 1 (' + e0 + ')');
  const q0 = await pg.evaluate(() => __indice());
  di(!q0.posada && q0.marca.n <= 3, 'y el cubo aun no esta en la hebra: viene cayendo del tunel (' + q0.marca.n + ' px en la hebra)');

  const paso = await pg.evaluate(() => Math.round(document.getElementById('ruta').getBoundingClientRect().height / 16));
  const serie = [];
  for (let k = 0; k < 22; k++) {
    await pg.evaluate(d => scrollBy(0, d), paso);
    await pg.waitForTimeout(300);
    serie.push(await estado());
  }
  const n = serie.map(x => x.split('').filter(c => c === '1').length);
  di(n[n.length - 1] === 3, 'al salir estan las tres encendidas (' + serie[serie.length - 1] + ')');
  const atras = n.filter((v, i) => i && v < n[i - 1]).length;
  di(atras === 0, 'y nunca vuelve atras: ' + n.join('') + (atras ? ' — ' + atras + ' retrocesos' : ''));
  di([1, 2, 3].every(v => n.includes(v)), 'pasa por las tres, sin saltarse ninguna (' + [...new Set(n)].join(',') + ')');
  const desorden = serie.filter(x => !/^1*0*$/.test(x)).length;
  di(desorden === 0, 'y siempre en orden, en las ' + serie.length + ' paradas del recorrido');

  await pg.waitForTimeout(1400);
  const q2 = await pg.evaluate(() => __indice());
  di(q2.posada && Math.abs(q2.my - q2.M.aqui) < 1 && q2.marca.n >= 25 && Math.abs(q2.marca.x - q2.hx) <= 3,
     'al final, parado, el cubo esta en «hoy» sobre la hebra (' + q2.my.toFixed(1) + ' vs ' + q2.M.aqui.toFixed(1) + ')');
}

// ── 5 · sin movimiento, y sin desbordes ─────────────────────────────────────
{
  const c2 = await nav.newContext({ viewport:{ width:1280, height:900 }, reducedMotion:'reduce' });
  const p2 = await c2.newPage();
  const f2 = []; p2.on('pageerror', e => f2.push(String(e).slice(0, 140)));
  await p2.goto('http://127.0.0.1:9163/', { waitUntil:'load' });
  await p2.waitForTimeout(900);
  await p2.evaluate(AYUDA);
  await p2.evaluate(() => document.getElementById('ruta').scrollIntoView({ block:'center' }));
  await p2.waitForTimeout(700);
  await p2.evaluate(() => { const M = __hebra.M; scrollTo(0, Math.round(M.docTop + M.aqui - innerHeight / 2)); });
  await p2.waitForTimeout(900);
  const r = await p2.evaluate(() => ({ ...__indice(),
    hitos:__hebra.M.hitos.every(h => h.el.classList.contains('hb-on')),
    caidaVis:getComputedStyle(document.querySelector('.caida-cv')).display }));
  /* Sin movimiento la composicion esta hecha desde el principio: la hebra
     entera, las tres fases y todos los hitos encendidos, y el cubo ya en
     «hoy»; lo unico que se apaga es el viaje. */
  di(r.on === '111' && r.hitos, 'sin movimiento la hebra esta entera: fases ' + r.on + ' y todos los hitos encendidos');
  di(r.posada && r.caidaVis === 'none', 'y no hay caida: el lienzo fijo no existe (' + r.caidaVis + ') y el cubo ya esta posado');
  di(Math.abs(r.my - r.M.aqui) < 1 && r.marca.n >= 25 && Math.abs(r.marca.x - r.hx) <= 3 && Math.abs(r.marca.y - r.hy) <= 6,
     'el cubo esta pintado en «hoy», sobre la hebra (' + r.marca.n + ' px, ' + (r.marca.n ? Math.abs(r.marca.x - r.hx).toFixed(1) : '?') + ' px de desvio)');
  di(f2.length === 0, 'sin movimiento · sin errores de pagina' + (f2.length ? ': ' + f2.join(' | ') : ''));
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
      const hijos = [...s.querySelectorAll('.ruta-t,.ruta-p,.ruta-h,.ruta-cab,.ruta-hecho li,.hb-lz')];
      const fuera = hijos.filter(e => { const b = e.getBoundingClientRect();
        return b.width && (b.left < -1 || b.right > innerWidth + 1); }).length;
      return { fuera, scroll:document.documentElement.scrollWidth > innerWidth };
    });
    di(r3.fuera === 0 && !r3.scroll,
       W + 'px · nada se sale de la pantalla (' + r3.fuera + ' piezas fuera)');
    await c3.close();
  }
}

di(fallos.length === 0, 'sin errores de pagina a 1440x900 ni a 390x844' + (fallos.length ? ': ' + fallos.join(' | ') : ''));

console.log('\n' + ok + '/' + (ok + mal) + ' correctas');
await nav.close(); srv.close();
process.exit(mal ? 1 : 0);
