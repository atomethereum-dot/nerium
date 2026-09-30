// probar_proyectos: «06 · What we are building» es el tunel de cubos (d64):
// un escenario anclado con un lienzo que vuela por un tunel de cubos y frena
// en tres estaciones -la cadena, la tokenizacion de activos y la mineria-,
// con los textos de la web y todo en azules. Al final los cubos implosionan
// en UN cubo azul cargado (mira de 1 px y cifra «NN / NN»); quedan unos pocos
// cubos lejanos y apagados a la deriva, debajo se dibuja la hebra hacia un
// «07 Roadmap» provisional, y esa hebra es el primer tramo de una VIA (su
// propio lienzo, anclado a la pagina, «.via-cv») que se curva al margen,
// cruza la costura y entra en la hebra de la ruta. El cubo baja por ella -en
// el lienzo fijo «.caida-cv»- y se posa en su cabeza. El epigrafe provisional
// le pasa el relevo al de la ruta: nunca se ven los dos.
//
// p68 · el escenario lleva un margen negativo abajo (-14 % de pantalla): el
// anclado mide lo mismo, pero #builds acaba antes. El avance se cuenta como
// lo cuenta la pagina: alto del anclado - (alto del escenario + ese margen).
//
// Lo que se mide, por orden:
//   1. que la seccion este, se vea, vaya en su sitio y con su numero (05, y
//      la ruta 07 y «In the open» 08; el contador de abajo dice «/ 08»);
//   2. que los textos sean los de la web, letra por letra;
//   3. que el lienzo llene el escenario hasta el canto de abajo y se MUEVA sin
//      que nadie toque el scroll;
//   4. que al bajar se lea una estacion cada vez, entera y sin pisar el carril
//      ni la leyenda, y que no haya ni un pixel ambar;
//   5. que al final quede el cubo cargado EN EL CENTRO, con su mira, su cifra
//      y la hebra que baja hasta el epigrafe, y fuera solo luz tenue;
//   6. que el relevo de epigrafes no duplique, que la via llegue del cubo a
//      la hebra de la ruta, que el cubo baje por ella hasta posarse y que todo
//      se deshaga al subir;
//   7. que sin movimiento sea una composicion quieta y sin errores.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ = '/home/user/nerium';
const T = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp','.jpg':'image/jpeg'};
const srv = http.createServer((q, r) => { let f = decodeURIComponent(q.url.split('?')[0]); if (f.endsWith('/')) f += 'index.html';
  const p = path.join(RAIZ, f); if (!fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end() }
  r.writeHead(200, {'content-type': T[path.extname(p)] || 'application/octet-stream'}); r.end(fs.readFileSync(p)) });
await new Promise(r => srv.listen(9055, r));
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
let ok = 0, mal = 0;
/* Mientras la seccion este oculta (atributo hidden, a la espera de decidir el
   diseño) no hay nada que medir: se dice y se sale en verde. */
if (fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8').includes('id="builds" data-bg="#000000" data-acc="#63A9FF" hidden')) {
  console.log('  --  la seccion de proyectos esta oculta: no hay nada que medir');
  await nav.close(); srv.close(); process.exit(0);
}
const di = (c, t) => { if (c) { ok++; console.log('  ok  ' + t) } else { mal++; console.log('  MAL ' + t) } };

/* Los textos de las tres estaciones, como los tenia la seccion antes del
   tunel: el rediseño cambio el dibujo, no lo que se promete. */
const ESTACIONES = [
  { t:'The chain', est:'Testnet · 75% to mainnet', cta:'https://nereum.xyz/explorer',
    p:'Own validators, own consensus, EVM-compatible. Every transfer is cleared against the asset\'s policy before it is written — in the protocol, not in a contract on top.' },
  { t:'Asset tokenization', est:'Testnet · 75% to mainnet', cta:'https://nereum.xyz/explorer/#/tokenize',
    p:'Describe the asset, attach its documentation, choose the conditions that travel with it, and issue. No custom contract to write and no audit to commission for every issuance.' },
  { t:'Bitcoin mining', est:'In development', cta:null,
    p:'Physical servers we own and operate, powered by solar. Not rented hashrate and not a reseller\'s contract: machines in racks, with their own energy behind them.' },
];
const PARADAS = [.2, .44, .68];          // donde la camara frena en cada estacion

/* Lo que se hace DENTRO de la pagina, una vez por contexto. */
const AYUDA = () => {
  /* el anclado, contado como lo cuenta la pagina: el escenario lleva un
     margen negativo abajo (p68), asi que el recorrido es el alto del anclado
     menos el escenario MAS lo que ese margen le deja seguir anclado */
  window.__anclado = () => { const h = document.getElementById('tnHold'), st = document.getElementById('tnStage');
    const mb = parseFloat(getComputedStyle(st).marginBottom) || 0, top = h.getBoundingClientRect().top + scrollY;
    return { top, run:h.offsetHeight - (st.offsetHeight + mb), mb }; };
  /* ambar: tono de 20 a 60 grados, saturado y con luz. Es el color que la
     seccion tenia en la mineria y que se pidio quitar. */
  window.__ambar = (r, g, b) => { const M = Math.max(r, g, b), m = Math.min(r, g, b);
    if (M < 90 || (M - m) / M < .45) return false;
    const h = M === r ? (((g - b) / (M - m)) % 6) * 60 : M === g ? ((b - r) / (M - m) + 2) * 60 : ((r - g) / (M - m) + 4) * 60;
    const hh = (h + 360) % 360; return hh >= 20 && hh <= 60; };
  /* el azul del cubo: el de «TONES[0]» con su sombreado, de la cara oscura a
     la clara, y solo lo opaco (el aro de la mira y la estela son tenues). Se
     cuentan TODAS las caras: la silueta de un cubo en ortografica es simetrica
     respecto a su centro, asi que el centro de los pixeles es el del cubo gire
     como gire. */
  window.__azulCubo = (r, g, b, a) => a > 180 && b > 150 && b > r + 40 && b > g;
  /* los pixeles azules de un lienzo, con su centro */
  window.__cubo = (cv, caja) => {
    if (!cv || getComputedStyle(cv).display === 'none' || !cv.width) return { n:0 };
    const b = cv.getBoundingClientRect(), k = cv.width / b.width;
    const [x0, y0, x1, y1] = caja ? caja.map(v => Math.round(v * k)) : [0, 0, cv.width, cv.height];
    const X0 = Math.max(0, x0), Y0 = Math.max(0, y0), X1 = Math.min(cv.width, x1), Y1 = Math.min(cv.height, y1);
    if (X1 <= X0 || Y1 <= Y0) return { n:0 };
    const d = cv.getContext('2d').getImageData(X0, Y0, X1 - X0, Y1 - Y0).data, w = X1 - X0;
    let n = 0, sx = 0, sy = 0;
    for (let i = 0; i < d.length; i += 4) if (__azulCubo(d[i], d[i+1], d[i+2], d[i+3])) {
      const p = i / 4; n++; sx += X0 + p % w; sy += Y0 + Math.floor(p / w); }
    return n ? { n, x:b.left + sx / n / k, y:b.top + sy / n / k } : { n:0 };
  };
  /* p68 · los dos «07 Roadmap»: el provisional del tunel y el de la ruta.
     «op» es lo que se ve de cada uno (opacidad, y 0 si esta oculto o fuera
     de la pantalla); el relevo exige que nunca se vean los dos. */
  window.__epigrafes = () => [document.getElementById('tnSig'), document.querySelector('#ruta .ruta-top')].map(e => {
    const cs = getComputedStyle(e), r = e.getBoundingClientRect();
    const dentro = r.bottom > 0 && r.top < innerHeight && r.width > 0;
    return { op:cs.visibility === 'hidden' || !dentro ? 0 : +cs.opacity, top:r.top, txt:e.textContent.replace(/\s+/g, '') };
  });
  /* p68 · la via, horneada en su lienzo de pagina: por cada fila con trazo,
     su y en el documento y la x minima, maxima y media de lo pintado */
  window.__via = () => {
    const vd = document.querySelector('.via-cv');
    if (!vd || vd.width < 2) return null;
    const L = parseFloat(vd.style.left), Tp = parseFloat(vd.style.top), w = parseFloat(vd.style.width), h = parseFloat(vd.style.height);
    const k = vd.width / w, d = vd.getContext('2d').getImageData(0, 0, vd.width, vd.height).data, filas = [];
    for (let y = 0; y < vd.height; y++) { let a = 1e9, b = -1e9, s = 0, n = 0;
      for (let x = 0; x < vd.width; x++) if (d[(y * vd.width + x) * 4 + 3] > 60) { if (x < a) a = x; if (x > b) b = x; s += x; n++; }
      if (n) filas.push({ y:Tp + (y + .5) / k, a:L + a / k, b:L + (b + 1) / k, m:L + (s / n + .5) / k }); }
    return { pos:getComputedStyle(vd).position, L, Tp, w, h, filas };
  };
};

for (const [W, H, mob] of [[1440, 900, 0], [390, 844, 1]]) {
  const ctx = await nav.newContext({ viewport:{ width:W, height:H }, isMobile:!!mob, hasTouch:!!mob });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://127.0.0.1:9055/', { waitUntil:'load' }); await pg.waitForTimeout(1500);
  await pg.evaluate(AYUDA);
  const tag = W + 'x' + H + ' · ';
  /* el avance del anclado: 0 al entrar, 1 cuando el escenario se suelta. El
     lienzo suaviza el avance (~1 s), asi que se espera a que se asiente. */
  const en = async (p, ms = 1800) => { await pg.evaluate(p => scrollTo(0, Math.round(__anclado().top + p * __anclado().run)), p);
    await pg.waitForTimeout(ms); };
  const irA = async (y, ms = 120) => { await pg.evaluate(v => scrollTo(0, v), Math.round(y)); await pg.waitForTimeout(ms); };

  // ── 1 · la seccion: esta, se ve, va en su sitio y con su numero ──────────
  {
    const r = await pg.evaluate(() => {
      const b = document.getElementById('builds'); if (!b) return null;
      const cs = getComputedStyle(b);
      const vis = [...document.querySelectorAll('main>section')].filter(s => getComputedStyle(s).display !== 'none' && !s.hidden).map(s => s.id);
      const n = sel => { const e = document.querySelector(sel); return e ? e.textContent.trim() : null; };
      return { oculta:b.hidden, display:cs.display, alto:b.offsetHeight, padre:b.parentElement.tagName,
               fondo:cs.backgroundColor, escala:cs.transform, sig:b.nextElementSibling && b.nextElementSibling.id,
               iB:vis.indexOf('builds'), iR:vis.indexOf('ruta'), iJ:vis.indexOf('join'),
               nB:n('#builds .tn-cab .sk-n'), nR:n('#ruta .ruta-top .sk-n'), nJ:n('#join .sk-n'),
               sig06:n('#tnSig'), tot:n('.hud-count s'), enMenu:!!document.querySelector('.nav>a[href="#builds"]') };
    });
    di(!!r && !r.oculta && r.display !== 'none' && r.alto > H * 3, tag + 'la seccion existe y se ve (' + (r && r.alto) + ' px de recorrido)');
    di(r.padre === 'MAIN', tag + 'cuelga de «main», que es de donde la pagina lee los fondos');
    di(/rgb\(0, 0, 0\)/.test(r.fondo), tag + 'la seccion es negra, la del globo de arriba (' + r.fondo + ')');
    di(r.escala === 'none', tag + 'no se hunde ni se vela (' + r.escala + ')');
    di(r.sig === 'ruta' && r.iB >= 0 && r.iB < r.iR && r.iR < r.iJ,
       tag + 'va justo encima de la ruta, y las dos antes de «In the open» (' + [r.iB, r.iR, r.iJ].join(' < ') + ')');
    di(r.nB === '06' && r.nR === '07' && r.nJ === '08', tag + 'numeracion: proyectos 06, ruta 07, «In the open» 08 (' + [r.nB, r.nR, r.nJ].join(', ') + ')');
    di(/^07\s*Roadmap$/.test(r.sig06), tag + 'el epigrafe provisional del final dice «07 Roadmap» (' + r.sig06 + ')');
    di(r.tot === '08', tag + 'el contador de abajo a la derecha cuenta «/ 08» (' + r.tot + ')');
    di(!r.enMenu, tag + 'no entra en el menu: es el paso del globo a la ruta, no una estacion');
  }

  // ── 2 · los textos, los de la web ─────────────────────────────────────────
  {
    const r = await pg.evaluate(() => ({
      h:document.querySelector('#builds .builds-h').textContent.trim(),
      papel:document.querySelector('#builds .tn-papel').getAttribute('href'),
      sta:[...document.querySelectorAll('#builds .tn-sta')].map(s => ({
        t:s.querySelector('.tn-t').textContent.trim(), p:s.querySelector('.tn-p').textContent.trim().replace(/\s+/g, ' '),
        est:s.querySelector('.tn-lk span').textContent.replace(/^\s*\d\d/, '').trim(),
        cta:s.querySelector('.tn-cta') ? s.querySelector('.tn-cta').getAttribute('href') : null })) }));
    di(r.h === 'Three pieces, two already running.', tag + 'el titular: «' + r.h + '»');
    di(/\/whitepaper\/?$/.test(r.papel), tag + 'y el enlace lleva al whitepaper (' + r.papel + ')');
    di(r.sta.length === 3, tag + 'tres estaciones (' + r.sta.length + ')');
    ESTACIONES.forEach((e, i) => {
      const s = r.sta[i] || {};
      di(s.t === e.t && s.p === e.p, tag + 'estacion ' + (i + 1) + ' · «' + e.t + '» con su texto, letra por letra');
      di(s.est === e.est && s.cta === e.cta, tag + 'estacion ' + (i + 1) + ' · estado «' + s.est + '» y ' + (e.cta ? 'enlace ' + s.cta : 'sin enlace'));
    });
  }

  // ── 3 · el lienzo llena el escenario y se mueve solo ─────────────────────
  {
    await en(.1);
    const r = await pg.evaluate(() => {
      const st = document.getElementById('tnStage').getBoundingClientRect(), cv = document.getElementById('tnCv'), c = cv.getBoundingClientRect();
      const fila = cv.getContext('2d').getImageData(0, cv.height - 1, cv.width, 1).data;
      let luz = 0; for (let i = 0; i < fila.length; i += 4) luz += fila[i] + fila[i+1] + fila[i+2];
      return { st:[st.top, st.bottom].map(Math.round), cv:[c.left, c.top, c.right, c.bottom].map(Math.round),
               ancho:document.documentElement.clientWidth, ih:innerHeight, fila:luz / (fila.length / 4) / 3,
               alto:getComputedStyle(document.getElementById('tnStage')).height };
    });
    di(r.st[0] === 0 && r.st[1] >= r.ih, tag + 'el escenario queda anclado arriba y llega al canto de abajo (' + r.st.join('→') + ' de ' + r.ih + ')');
    di(r.cv[0] <= 0 && r.cv[1] <= 0 && r.cv[2] >= r.ancho && r.cv[3] >= r.ih,
       tag + 'y el lienzo del tunel lo llena entero (' + r.cv.join(',') + ')');
    di(r.fila > 8, tag + 'la ultima fila de pixeles esta pintada, sin franja negra abajo (luz media ' + r.fila.toFixed(1) + ')');
    const foto = () => pg.evaluate(() => { const cv = document.getElementById('tnCv');
      return Array.from(cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data.filter((v, i) => i % 16 === 0)); });
    const f1 = await foto(); await pg.waitForTimeout(400); const f2 = await foto();
    let dif = 0; for (let i = 0; i < f1.length; i++) if (Math.abs(f1[i] - f2[i]) > 6) dif++;
    di(dif / f1.length > .02, tag + 'el tunel se mueve SIN tocar el scroll: ' + (100 * dif / f1.length).toFixed(1) + ' % de pixeles cambian en 0,4 s');
    const hud = await pg.evaluate(() => document.querySelector('.hud-count b').textContent);
    di(hud === '06', tag + 'y el contador marca 06 mientras se cruza (' + hud + ' / 08)');
  }

  // ── 4 · una estacion cada vez, entera, y sin ambar ────────────────────────
  {
    const vistas = [];
    for (const p of PARADAS) {
      await en(p);
      vistas.push(await pg.evaluate(() => {
        const R = e => { const b = e.getBoundingClientRect(); return { l:b.left, t:b.top, r:b.right, b:b.bottom }; };
        const sta = [...document.querySelectorAll('#builds .tn-sta')];
        const op = sta.map(e => +getComputedStyle(e).opacity);
        const on = op.findIndex(v => v > .95);
        const rail = document.querySelector('#builds .tn-rail'), fig = document.querySelector('#builds .tn-fig');
        const cv = document.getElementById('tnCv'), d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
        let ambar = 0; for (let i = 0; i < d.length; i += 4) if (__ambar(d[i], d[i+1], d[i+2])) ambar++;
        return { op, on, caja:on >= 0 ? R(sta[on]) : null, rail:R(rail), fig:R(fig),
                 railOn:[...rail.children].findIndex(e => e.classList.contains('on')),
                 figTxt:fig.querySelector('b').textContent, ambar, vw:innerWidth, vh:innerHeight };
      }));
    }
    di(vistas.map(v => v.on).join('') === '012', tag + 'al bajar se lee una estacion cada vez (' + vistas.map(v => v.on).join(' → ') + ')');
    di(vistas.every((v, i) => v.op.every((o, j) => j === i ? o > .95 : o < .05)),
       tag + 'entera la que toca y apagadas las otras, sin fundidos a medias');
    di(vistas.every((v, i) => v.railOn === i && v.figTxt === 'FIG. 0' + (i + 1)),
       tag + 'el carril y la leyenda van con ella (' + vistas.map(v => v.railOn + '/' + v.figTxt).join(', ') + ')');
    const pisa = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
    di(vistas.every(v => v.caja && v.caja.l >= 0 && v.caja.r <= v.vw && v.caja.t >= 0 && v.caja.b <= v.vh && !pisa(v.caja, v.rail) && !pisa(v.caja, v.fig)),
       tag + 'la ficha cabe en pantalla y no pisa ni el carril ni la leyenda (' +
       vistas.map(v => v.caja ? [v.caja.t, v.caja.b].map(Math.round).join('-') : '?').join(', ') + ')');
    di(vistas.every(v => v.ambar === 0), tag + 'ni un pixel ambar en el tunel, tampoco en la mineria (' + vistas.map(v => v.ambar).join(', ') + ')');
    const dom = await pg.evaluate(() => {
      const malos = [];
      for (const e of document.querySelectorAll('#builds, #builds *')) {
        const cs = getComputedStyle(e);
        for (const k of ['color', 'backgroundColor', 'borderTopColor', 'borderBottomColor', 'fill', 'stroke', 'boxShadow', 'textShadow']) {
          for (const m of (cs[k] || '').matchAll(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/g)) {
            if ((m[4] === undefined || +m[4] > .1) && __ambar(+m[1], +m[2], +m[3])) malos.push(e.className + ' ' + k + ' ' + m[0]);
          }
        }
      }
      return malos;
    });
    di(dom.length === 0, tag + 'y ningun estilo de la seccion es ambar' + (dom.length ? ': ' + dom.slice(0, 3).join(' | ') : ''));
  }

  // ── 5 · la implosion: el cubo cargado, en el centro ──────────────────────
  {
    await en(.99, 2200);
    const r = await pg.evaluate(() => {
      const oc = document.querySelector('.caida-cv');
      const HC = document.getElementById('tnVis').offsetHeight / 2, CX = innerWidth / 2;
      const c0 = __cubo(oc);
      /* segunda pasada, solo alrededor: la cifra tambien es azul y no es el cubo */
      const tam = Math.min(38, Math.max(15, Math.min(innerWidth, innerHeight) * .042));
      const c = c0.n ? __cubo(oc, [c0.x - tam * 2.2, c0.y - tam * 2.2, c0.x + tam * 2.2, c0.y + tam * 2.2]) : c0;
      /* la mira: el aro de 1 px (radio max(2,5 cubos, 42 px)) y la cifra arriba a su derecha */
      const R = Math.max(tam * 2.5, 42), B = Math.round(R * 1.34);
      let aro = 0, vueltas = 0, cifra = 0, cifraAzul = 0;
      if (c.n) {
        const g = oc.getContext('2d'), k = oc.width / oc.getBoundingClientRect().width;
        const px = (x, y) => g.getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data;
        for (let a = 0; a < 360; a += 3) {
          vueltas++;
          let hay = false;
          for (const dr of [-1.5, -.5, .5, 1.5]) { const q = px(c.x + Math.cos(a / 57.3) * (R + dr), c.y + Math.sin(a / 57.3) * (R + dr)); if (q[3] > 25) hay = true; }
          if (hay) aro++;
        }
        const d = g.getImageData(Math.round((c.x + B + 4) * k), Math.round((c.y - B - 12) * k), Math.round(90 * k), Math.round(24 * k)).data;
        for (let i = 0; i < d.length; i += 4) if (d[i+3] > 60) { cifra++; if (d[i+2] > d[i] + 90) cifraAzul++; }
      }
      /* el tunel, a esas alturas: los cubos que volaban ya se han ido al
         centro. p68 · quedan unos pocos (9 en el telefono, 13 en escritorio)
         lejos, pequeños y apagados a menos de la mitad, a la deriva: fuera del
         centro hay algo de luz, pero solo tenue. Mientras se vuela, los cubos
         del tunel llegan al blanco (canal 255, suma 765); los que quedan no
         pasan de ~120 por canal. Se mide el canal mas vivo, lo que pasa de
         suma 360 (lo vivo) y cuanto ocupa lo que no es negro. */
      const cv = document.getElementById('tnCv'), k2 = cv.width / cv.getBoundingClientRect().width;
      const d2 = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
      let fuera = 0, vivos = 0, canal = 0, tot = 0;
      for (let y = 0; y < cv.height; y += 2) for (let x = 0; x < cv.width; x += 2) {
        const X = x / k2, Y = y / k2;
        if (Math.hypot(X - CX, Y - HC) < R * 3.8 || Math.abs(X - CX) < 60) continue;
        tot++; const i = (y * cv.width + x) * 4, s = d2[i] + d2[i+1] + d2[i+2];
        if (s > 90) fuera++; if (s > 360) vivos++; canal = Math.max(canal, d2[i], d2[i+1], d2[i+2]);
      }
      /* la hebra que baja del cubo hasta el epigrafe. p68 · es el primer tramo
         de la via y, mientras el escenario esta anclado, la pinta el lienzo
         fijo de la caida (ya no el del tunel) */
      const sig = document.getElementById('tnSig'), sr = sig.getBoundingClientRect();
      let hebra = 0, filas = 0;
      if (c.n) { const ko = oc.width / oc.getBoundingClientRect().width, go = oc.getContext('2d');
        for (let y = Math.round(c.y + R + 20); y < sr.top - 20; y += 2) {
          filas++;
          const d = go.getImageData(Math.round((CX - 24) * ko), Math.round(y * ko), Math.round(48 * ko), 1).data;
          let mx = 0; for (let i = 0; i < d.length; i += 4) mx = Math.max(mx, (d[i] + d[i+1] + d[i+2]) * d[i+3] / 255);
          if (mx > 150) hebra++;
        } }
      return { c, CX, HC, aro:aro / (vueltas || 1), cifra, cifraAzul, fuera:fuera / (tot || 1), vivos, canal,
               hebra:hebra / (filas || 1), filas, sigTop:sr.top, epi:__epigrafes(),
               posada:window.__caida && window.__caida.posada() };
    });
    di(r.c.n > 80, tag + 'al final queda UN cubo azul en el lienzo de la caida (' + r.c.n + ' px)');
    const dx = r.c.n ? Math.abs(r.c.x - r.CX) : 1e9, dy = r.c.n ? Math.abs(r.c.y - r.HC) : 1e9;
    di(dx <= 6 && dy <= H * .06, tag + 'y esta en el centro: ' + dx.toFixed(1) + ' px en horizontal y ' + dy.toFixed(1) + ' en vertical');
    di(r.aro > .75, tag + 'cargado: lo rodea el aro de 1 px de la mira (' + (100 * r.aro).toFixed(0) + ' % de la vuelta)');
    di(r.cifra > 20 && r.cifraAzul > 5, tag + 'con su cifra «NN / NN» arriba a la derecha (' + r.cifra + ' px, ' + r.cifraAzul + ' azules)');
    /* (los de fondo giran: alguna cara clara puede asomar un pixel; los del
       tunel en vuelo son miles, el 3-9 % de lo medido) */
    /* sin «canal < 200»: con la maquina cargada (bateria) un cubo de fondo
       giraba y ponia UN pixel a 248 con 10 px vivos y 0,85 % no negro; los del
       tunel en vuelo son miles de pixeles, asi que basta con vivos y fuera */
    di(r.vivos <= 20 && r.fuera < .03,
       tag + 'los cubos del tunel ya han implosionado: fuera del centro solo quedan cubos apagados (canal mas vivo ' + r.canal +
       ', ' + r.vivos + ' px vivos, ' + (100 * r.fuera).toFixed(2) + ' % no negro)');
    di(r.filas > 10 && r.hebra > .8, tag + 'debajo baja la hebra hasta el epigrafe, en el lienzo fijo (' + (100 * r.hebra).toFixed(0) + ' % de ' + r.filas + ' filas)');
    const vistos = r.epi.filter(e => e.op > .02);
    di(vistos.length === 1 && r.epi[0].op > .9 && /^07\s*Roadmap$/.test(r.epi[0].txt) && r.sigTop > r.c.y,
       tag + 'se ve UN «07 Roadmap», el provisional, debajo del cubo (provisional ' + r.epi[0].op + ', el de la ruta ' + r.epi[1].op + ')');
    di(r.posada === false, tag + 'y el cubo aun no esta en la hebra de la ruta');
  }

  // ── 6 · el relevo, la via y la bajada hasta la hebra; y vuelta atras ─────
  {
    /* «Se»: donde el escenario se suelta (contado con su margen negativo) */
    const Se = await pg.evaluate(() => { const a = __anclado(); return a.top + a.run; });
    /* p68 · #builds acaba un 14 % de pantalla antes: al soltarse el
       escenario, el canto de la ruta ya asoma al 86 % de la pantalla */
    await irA(Se, 600);
    const canto = await pg.evaluate(() => document.getElementById('ruta').getBoundingClientRect().top / innerHeight);
    di(canto > .8 && canto < .92, tag + 'al soltarse el escenario la ruta ya asoma abajo: #builds acaba antes (canto al ' + (100 * canto).toFixed(0) + ' % de la pantalla)');
    /* el relevo de epigrafes: del provisional al de la ruta, nunca los dos */
    const relevo = [];
    for (let y = Se - H * .03; y <= Se + H * .3; y += H * .015) { await irA(y, 110); relevo.push(await pg.evaluate(() => __epigrafes().map(e => e.op))); }
    const dobles = relevo.filter(e => e[0] > .02 && e[1] > .02).length, fin = relevo[relevo.length - 1];
    di(dobles === 0 && relevo[0][0] > .9 && fin[0] <= .02 && fin[1] > .9,
       tag + 'el «07 Roadmap» provisional le pasa el relevo al de la ruta sin verse nunca los dos (' + dobles + ' de ' + relevo.length +
       ' posiciones con los dos; al final ' + fin.map(v => v.toFixed(2)).join(' / ') + ')');
    /* donde se posa, preguntandoselo a la pagina: «__caida.posada()» */
    let lo = Se, hi = Se + H * 5;
    for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; await irA(m); (await pg.evaluate(() => __caida.posada())) ? hi = m : lo = m; }
    const Sc = hi;
    const mira = () => pg.evaluate(() => {
      const M = __hebra.M, lz = document.querySelector('#ruta .hb-lz').getBoundingClientRect();
      const tip = __hebra.tip(), my = Math.min(Math.max(tip, M.y0 + 20), M.aqui);
      const texto = Math.min(...[...document.querySelectorAll('#ruta .ruta-cab')].map(e => e.getBoundingClientRect().left));
      return { c:__cubo(document.querySelector('.caida-cv')), hx:lz.left + M.sx, hy:lz.top + my, texto, sy:scrollY,
               posada:__caida.posada(), vista:getComputedStyle(document.querySelector('.caida-cv')).display,
               via:getComputedStyle(document.querySelector('.via-cv')).display };
    });
    const tramo = [];
    for (const f of [.1, .3, .45, .6, .8, .97]) { await irA(Se + (Sc - Se) * f, 900); tramo.push(await mira()); }
    di(tramo.every(t => t.c.n > 20 && !t.posada), tag + 'el cubo se ve durante toda la bajada (' + tramo.map(t => t.c.n).join(', ') + ' px)');
    /* p68 · la via: su propio lienzo, anclado a la pagina (no a la pantalla),
       que sale de debajo del cubo, se curva al margen izquierdo, baja por el
       junto al epigrafe y el titular de la ruta, cruza la costura y acaba en
       la cabeza de la hebra de la ruta */
    const via = await pg.evaluate(() => { const M = __hebra.M, lz = document.querySelector('#ruta .hb-lz').getBoundingClientRect();
      return { v:__via(), hx:lz.left + scrollX + M.sx, hy:M.docTop + M.y0, ruta:document.getElementById('ruta').getBoundingClientRect().top + scrollY }; });
    const F = via.v ? via.v.filas : [], f0 = F[0], fN = F[F.length - 1];
    const margen = F.length ? Math.min(...F.map(f => f.a)) : 1e9;
    di(!!via.v && via.v.pos === 'absolute' && tramo.every(t => t.via !== 'none') && F.length > 100,
       tag + 'la hebra de debajo del cubo sigue en una via, horneada en su lienzo de pagina (' + (via.v ? via.v.pos + ', ' + F.length + ' filas' : 'no hay via') + ')');
    di(F.length && Math.abs(f0.m - W / 2) <= 8 && margen < tramo[0].texto && f0.y < via.ruta && fN.y > via.ruta,
       tag + 'sale de debajo del cubo (x ' + (F.length ? Math.round(f0.m) : '?') + '), se curva al margen a la izquierda del texto (x ' + Math.round(margen) +
       ' < ' + Math.round(tramo[0].texto) + ') y cruza la costura (' + (F.length ? Math.round(f0.y) + ' < ' + Math.round(via.ruta) + ' < ' + Math.round(fN.y) : '?') + ')');
    di(F.length && Math.abs(fN.m - via.hx) <= 10 && Math.abs(fN.y - via.hy) <= 14,
       tag + 'y acaba en la cabeza de la hebra de la ruta (' + (F.length ? Math.abs(fN.m - via.hx).toFixed(1) + ' px en horizontal, ' + Math.abs(fN.y - via.hy).toFixed(1) + ' en vertical' : '?') + ')');
    /* el cubo no vuela suelto: en la curva, en el margen y al volver hacia la
       hebra esta sobre la via (su centro, en el documento, a pocos pixeles de
       lo pintado). Al principio aun esta dentro de la mira, por encima de
       donde se pinta la via, y al final ya esta en la hebra: eso lo miden las
       comprobaciones de al lado. */
    const sobre = tramo.slice(1, -1).map(t => { const yd = t.c.y + t.sy; let m = 1e9;
      for (const f of F) { if (Math.abs(f.y - yd) > 30) continue;
        const dx = t.c.x < f.a ? f.a - t.c.x : t.c.x > f.b ? t.c.x - f.b : 0; m = Math.min(m, Math.hypot(dx, f.y - yd)); }
      return m; });
    di(sobre.every(d => d <= 8), tag + 'el cubo baja POR la via: en cada muestra esta sobre ella (a ' + sobre.map(d => d > 1e8 ? '?' : d.toFixed(1)).join(', ') + ' px)');
    const xs = tramo.map(t => Math.round(t.c.x)), minX = Math.min(...xs);
    di(Math.abs(tramo[0].c.x - W / 2) <= 8 && minX < tramo[0].texto && xs.indexOf(minX) > 0 && xs.indexOf(minX) < xs.length - 1,
       tag + 'sale del centro, se aparta al margen de la ruta a la izquierda del texto y vuelve a la hebra (x ' + xs.join(' → ') + ')');
    const u = tramo[tramo.length - 1];
    di(Math.abs(u.c.x - u.hx) <= 4 && Math.abs(u.c.y - u.hy) <= 8,
       tag + 'y acaba SOBRE la hebra: ' + Math.abs(u.c.x - u.hx).toFixed(1) + ' px de la hebra, ' + Math.abs(u.c.y - u.hy).toFixed(1) + ' de su punta');
    await irA(Sc + 40, 900);
    const p = await mira();
    di(p.posada && p.c.n === 0, tag + 'posado, lo pinta ya la hebra y el lienzo de la caida queda limpio (' + p.c.n + ' px)');
    await irA(Se + (Sc - Se) * .5, 900);
    const v = await mira();
    const lejos = v.c.n ? Math.hypot(v.c.x - v.hx, v.c.y - v.hy) : 0;
    di(!v.posada && v.c.n > 20 && lejos > 30, tag + 'al subir se deshace: el cubo vuelve a despegarse de la hebra (a ' + lejos.toFixed(0) + ' px de su punta)');
    await en(.95);
    const w = await mira(), HC = await pg.evaluate(() => document.getElementById('tnVis').offsetHeight / 2);
    di(!w.posada && w.c.n > 80 && Math.abs(w.c.x - W / 2) <= 6 && Math.abs(w.c.y - HC) <= H * .06,
       tag + 'y de vuelta en el tunel esta otra vez en el centro (' + Math.round(w.c.x) + ', ' + Math.round(w.c.y) + ')');
    await en(.2);
    const x = await mira();
    di(x.vista === 'none' || x.c.n === 0, tag + 'mas arriba el lienzo de la caida ni se ve (' + x.vista + ')');
  }

  di(errs.length === 0, tag + 'sin errores de pagina' + (errs.length ? ': ' + errs[0] : ''));
  await ctx.close();
}

// ── 7 · sin movimiento: la composicion quieta ─────────────────────────────
{
  const ctx = await nav.newContext({ viewport:{ width:1440, height:900 }, reducedMotion:'reduce' });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('http://127.0.0.1:9055/', { waitUntil:'load' }); await pg.waitForTimeout(1500);
  await pg.evaluate(AYUDA);
  const en = async p => { await pg.evaluate(p => scrollTo(0, Math.round(__anclado().top + p * __anclado().run)), p);
    await pg.waitForTimeout(1500); };
  const foto = () => pg.evaluate(() => { const cv = document.getElementById('tnCv');
    return Array.from(cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data.filter((v, i) => i % 16 === 0)); });
  await en(.2);
  const f1 = await foto(); await pg.waitForTimeout(500); const f2 = await foto();
  const dif = f1.filter((v, i) => Math.abs(v - f2[i]) > 2).length;
  const op = await pg.evaluate(() => +getComputedStyle(document.querySelector('#builds .tn-sta')).opacity);
  di(dif === 0 && op > .95, 'sin movimiento · el tunel esta quieto (' + dif + ' pixeles cambian) y la estacion se lee igual');
  /* se llega bajando, como llega un visitante (varios «scroll»): sin
     movimiento el lienzo fijo se pinta una vez por «scroll», y el primer
     cuadro tras encenderlo se pierde (su vigia de visibilidad aun lo cree
     oculto; lo que se lleva el primer cuadro es un fallo aparte de la
     pagina, no del diseño: ver el mensaje del commit de esta sonda). */
  await en(.97); await en(.98); await en(.99);
  const fija = () => pg.evaluate(() => { const oc = document.querySelector('.caida-cv');
    if (getComputedStyle(oc).display === 'none' || oc.width < 2) return [];
    return Array.from(oc.getContext('2d').getImageData(0, 0, oc.width, oc.height).data.filter((v, i) => i % 16 === 3)); });
  const r = await pg.evaluate(() => {
    const cv = document.getElementById('tnCv'), oc = document.querySelector('.caida-cv'), HC = document.getElementById('tnVis').offsetHeight / 2;
    const caja = [innerWidth / 2 - 80, HC - 80, innerWidth / 2 + 80, HC + 80];
    /* la via quieta, en el lienzo fijo: lo pintado por debajo del cubo */
    let via = 0;
    if (getComputedStyle(oc).display !== 'none' && oc.width > 1) { const k = oc.width / oc.getBoundingClientRect().width;
      const d = oc.getContext('2d').getImageData(0, Math.round((HC + 100) * k), oc.width, Math.round(120 * k)).data;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 60) via++; }
    return { c:__cubo(cv, caja), cf:__cubo(oc, caja), HC, via, posada:__caida.posada(), epi:__epigrafes(),
             sigVis:getComputedStyle(document.getElementById('tnSig')).visibility,
             rk:+getComputedStyle(document.querySelector('#ruta .ruta-top')).opacity };
  });
  const q1 = await fija(); await pg.waitForTimeout(500); const q2 = await fija();
  const cambia = q1.length === q2.length ? q1.filter((v, i) => Math.abs(v - q2[i]) > 2).length : -1;
  di(r.c.n > 80 && Math.abs(r.c.x - 720) <= 6 && Math.abs(r.c.y - r.HC) <= 54,
     'sin movimiento · al final el cubo esta ya en el centro, pintado quieto (' + r.c.n + ' px en ' + Math.round(r.c.x || 0) + ', ' + Math.round(r.c.y || 0) + ')');
  /* p68 · el lienzo fijo existe tambien sin movimiento, pero solo para la via
     quieta: ningun cubo cae por el y el cubo ya esta en la hebra */
  di(r.cf.n === 0 && r.posada === true && r.via > 50 && cambia === 0,
     'sin movimiento · no hay caida: el lienzo fijo solo lleva la via, quieta (' + r.via + ' px de via, ' + r.cf.n + ' de cubo, ' + cambia +
     ' cambian en 0,5 s) y el cubo ya esta en la hebra');
  /* p68 · sin movimiento no hay relevo: el provisional no aparece y el de la
     ruta esta en su sitio desde el principio */
  await pg.evaluate(() => { const k = document.querySelector('#ruta .ruta-top'); scrollTo(0, Math.round(k.getBoundingClientRect().top + scrollY - innerHeight * .5)); });
  await pg.waitForTimeout(800);
  const e2 = await pg.evaluate(() => __epigrafes());
  di(r.epi[0].op === 0 && r.sigVis === 'hidden' && r.rk > .95 && e2.filter(e => e.op > .02).length === 1 && e2[1].op > .95 && /^07\s*Roadmap$/.test(e2[1].txt),
     'sin movimiento · se ve UN epigrafe «07 Roadmap», el de la ruta (provisional ' + r.epi[0].op + ', el de la ruta ' + e2[1].op + ')');
  di(errs.length === 0, 'sin movimiento · sin errores de pagina' + (errs.length ? ': ' + errs[0] : ''));
  await ctx.close();
}

await nav.close(); srv.close();
console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
process.exit(mal ? 1 : 0);
