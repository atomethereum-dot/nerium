// La cabecera nueva: el aviso de la ronda y el menu del centro con fichas.
//
// Lo que vigila de verdad:
//  · que el porcentaje del aviso salga del MISMO sitio que la barra de
//    recaudacion. Escrito aparte se quedaria clavado el dia que la ronda
//    avance, y una portada de venta que se contradice a si misma es peor
//    que no decir nada.
//  · que ninguna entrada del menu lleve a una seccion oculta.
//  · que estando en la portada no haya nada subrayado: el observador solo
//    avisa cuando algo CRUZA la mitad de la pantalla, y la portada no cruza.
import { chromium } from 'playwright';
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
const URL = 'file:///home/user/nerium/index.html';
let ok = 0, mal = 0;
const di = (b, t) => { if (b) { ok++; console.log('  ok  ' + t); } else { mal++; console.log('  MAL ' + t); } };

const ctx = await nav.newContext({ viewport:{width:1440,height:900} });
const pg = await ctx.newPage();
const errs = []; pg.on('pageerror', e => errs.push(e.message));
await pg.goto(URL, { waitUntil:'load' });
await pg.waitForTimeout(2600);

// ── el aviso ──
// La franja de la ronda se puede apagar por diseno —paso 35, la clase
// «ann-fuera» en el cuerpo— y entonces no hay nada que mirar arriba, hay que
// mirar que no deje hueco. Se pregunta como esta puesta y se comprueba una
// cosa o la otra; lo que no se hace es dar por hecho que esta.
const MONTADO = !(await pg.evaluate(() => document.body.classList.contains('ann-fuera')));
console.log('  ··  la franja de la ronda esta ' + (MONTADO ? 'PUESTA' : 'APAGADA'));

const av = await pg.evaluate(() => {
  const a = document.querySelector('.ann');
  const f = document.getElementById('annFill');
  return a ? { alto: Math.round(a.getBoundingClientRect().height),
               txt: document.querySelector('.ann-in').textContent.replace(/\s+/g,' ').trim(),
               pct: document.getElementById('annPct').textContent,
               fill: f && f.style.width,
               destino: document.querySelector('.ann-in').getAttribute('href') } : null;
});
di(!!av, 'la franja sigue en el marcado, montada o no');
di(av && /Seed Round/.test(av.txt), 'dice de que ronda habla');
di(av && /8[0-9]%|9[0-9]%|100%/.test(av.pct), 'lleva el porcentaje: ' + (av && av.pct));
di(av && av.destino === '#presale', 'y lleva a la ronda al pulsarlo');

// El aviso y la barra de recaudacion tienen que decir lo mismo.
const par = await pg.evaluate(() => {
  const g = document.querySelector('#saleTip em');
  return { aviso: parseFloat(document.getElementById('annPct').textContent),
           barra: g ? parseFloat(g.textContent) : null };
});
di(par.barra !== null, 'la barra de recaudacion tiene su cifra');
di(par.barra !== null && Math.abs(par.aviso - par.barra) < 1,
   `aviso ${par.aviso}% y barra ${par.barra}%: la misma cifra`);

/* La cifra vive ahora en TRES sitios: la franja, la barra de recaudacion y la
   linea de la portada —ahi es donde se quedo el dato cuando se apago la
   franja—. Tres sitios con la misma cifra escrita a mano es un sitio con la
   cifra mal, asi que se comprueba que salgan del mismo numero y que la misma
   llamada mueva los tres. */
const hp = await pg.evaluate(() => {
  const e = document.getElementById('heroPct');
  return e ? parseFloat(e.textContent) : null;
});
di(hp !== null, 'la portada lleva la cifra en su linea');
di(hp !== null && Math.abs(hp - par.barra) < 1,
   `portada ${hp}% y barra ${par.barra}%: la misma cifra`);
await pg.evaluate(() => window.__aviso(91)); await pg.waitForTimeout(400);
di(await pg.evaluate(() => document.getElementById('heroPct').textContent) === '91%' &&
   await pg.evaluate(() => document.getElementById('annPct').textContent) === '91%',
   'y si la ronda avanza avanzan las dos, no una');
di(av && Math.abs(parseFloat(av.fill) - par.barra) < 1, 'la linea de abajo dibuja la misma cifra');

if (!MONTADO) {
  /* Apagada de verdad: ni se ve ni deja hueco. Lo segundo importa tanto como
     lo primero —el alto de la franja es «--ann», y de esa variable cuelgan la
     posicion de la cabecera, el relleno de la portada y el techo del menu de
     movil—, asi que si se apaga la franja y no la variable queda una banda
     vacia arriba que nadie sabe de donde sale. */
  di(av.alto === 0, 'apagada: no ocupa nada (' + av.alto + ' px)');
  /* Se lee en el CUERPO, no en la raiz: ahi es donde vive la clase que lo
     apaga y donde lo resuelven la cabecera, la portada y el menu, que cuelgan
     todos de el. En la raiz sigue valiendo lo de siempre, que es lo que hace
     que devolver la franja sea quitar una clase y nada mas. */
  di(await pg.evaluate(() => getComputedStyle(document.body)
       .getPropertyValue('--ann').trim()) === '0px', 'y su hueco tampoco: --ann a cero');
  di(await pg.evaluate(() => Math.round(document.querySelector('.hd').getBoundingClientRect().top)) === 14,
     'la cabecera sube a lo alto de la pagina');
  /* Y no vuelve sola. El estado de la X si vuelve cuando la ronda avanza dos
     puntos; este no, que es una decision y no un cierre. */
  await pg.evaluate(() => window.__aviso(88)); await pg.waitForTimeout(700);
  di(await pg.evaluate(() => document.querySelector('.ann').getBoundingClientRect().height === 0),
     'y no la devuelve que la ronda avance: es decision, no cierre');
} else {
  di(av.alto > 20, 'el aviso se ve arriba del todo');
  // ── cerrar y volver ──
  await pg.click('#annX');
  await pg.waitForTimeout(700);
  di(await pg.evaluate(() => document.querySelector('.ann').getBoundingClientRect().height === 0),
     'la X lo cierra');
  di(await pg.evaluate(() => Math.round(document.querySelector('.hd').getBoundingClientRect().top)) === 14,
     'y la barra sube a ocupar su sitio');
  await pg.reload({ waitUntil:'load' }); await pg.waitForTimeout(2200);
  di(await pg.evaluate(() => document.querySelector('.ann').getBoundingClientRect().height === 0),
     'cerrado sigue cerrado al recargar');
  await pg.evaluate(() => window.__aviso(86)); await pg.waitForTimeout(700);
  di(await pg.evaluate(() => document.querySelector('.ann').getBoundingClientRect().height === 0),
     'un punto mas no lo devuelve: seria pesado');
  await pg.evaluate(() => window.__aviso(88)); await pg.waitForTimeout(700);
  di(await pg.evaluate(() => document.querySelector('.ann').getBoundingClientRect().height > 20),
     'dos puntos mas si: la ronda avanzo y hay algo que decir');
  di(await pg.evaluate(() => document.getElementById('annPct').textContent) === '88%',
     'y trae la cifra nueva');
}

// ── la marca: la palabra centrada con el rombo ──
// Antes esto media que la linea de base cayera en el canto de abajo del
// cubo. Tenia sentido mientras el cubo era un CUADRADO: habia una recta
// horizontal sobre la que posar la palabra. El rombo acaba en punta, y
// colgar la palabra de un vertice la deja flotando. La regla nueva es
// centrar, y se mide igual de duro: el alto real de la palabra sale del
// canvas (actualBoundingBoxAscent, no una constante a ojo) y el centro del
// dibujo del getBBox del simbolo, asi que si la marca cambia otra vez de
// forma la comprobacion cambia con ella.
const marca = await pg.evaluate(() => {
  const br = document.querySelector('.hd .brand');
  const svg = br.querySelector('svg'), sp = br.querySelector('.bw');
  if (!sp) return null;
  const R = e => e.getBoundingClientRect();
  const k = document.createElement('span');
  k.style.cssText = 'display:inline-block;width:0;height:0;overflow:hidden';
  sp.appendChild(k); const base = R(k).bottom; k.remove();
  const rs = R(svg), hd = R(document.querySelector('.hd'));
  // el canto de abajo del dibujo, medido de verdad y no a ojo: si algun dia
  // el cubo cambia de forma, esta comprobacion cambia con el
  const sym = document.getElementById('nlogo-s');
  const vb = sym.getAttribute('viewBox').split(/\s+/).map(Number);
  const t = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  t.setAttribute('viewBox', vb.join(' '));
  t.style.cssText = 'position:absolute;left:-9999px;width:' + vb[2] + 'px;height:' + vb[3] + 'px';
  [...sym.childNodes].forEach(x => t.appendChild(x.cloneNode(true)));
  document.body.appendChild(t);
  const g = t.querySelector('g'), bb = g.getBBox(), m = g.getCTM();
  const ys = [[bb.x, bb.y], [bb.x + bb.width, bb.y], [bb.x, bb.y + bb.height],
              [bb.x + bb.width, bb.y + bb.height]].map(([x, y]) => m.b * x + m.d * y + m.f);
  t.remove();
  const arriba = Math.min(...ys) / vb[3], abajo = Math.max(...ys) / vb[3];
  const cs = getComputedStyle(sp);
  const cv = document.createElement('canvas').getContext('2d');
  cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
  const alto = cv.measureText(sp.textContent.trim()).actualBoundingBoxAscent;
  const centroPalabra = base - alto / 2;
  const centroDibujo = rs.top + rs.height * (arriba + abajo) / 2;
  const cuerpo = parseFloat(cs.fontSize);
  return { arriba, abajo, alto, cuerpo,
           desfase: (centroPalabra - centroDibujo) / cuerpo,
           centroBarra: hd.top + hd.height / 2, centroCubo: rs.top + rs.height / 2 };
});
di(marca !== null, 'la palabra de la marca va en su propia caja');
di(marca && marca.alto > 0, 'y se puede medir su alto de verdad');
// El cero geometrico no es el sitio: centrar la caja de mayusculas exacta
// deja la palabra alta, porque «Nereum» es una N y cinco letras bajas y el
// ojo lee donde esta la tinta, no donde acaba la caja. Baja 0,2534 em, que
// es lo que se eligio mirando la barra. Se comprueba el valor elegido, no
// un cero que nunca fue el bueno: si alguien lo mueve sin querer, salta.
di(marca && Math.abs(marca.desfase - 0.2534) < 0.03,
   'y baja del medio del rombo lo que tiene que bajar (' +
   (marca ? marca.desfase.toFixed(4) : '?') + ' em, buscado 0,2534; el dibujo va del ' +
   (marca ? (marca.arriba*100).toFixed(1) : '?') + ' al ' +
   (marca ? (marca.abajo*100).toFixed(1) : '?') + ' % de su recuadro)');
di(marca && Math.abs(marca.centroBarra - marca.centroCubo) < 0.6,
   'sin desplazar el cubo: sigue centrado en la barra');

// ── el menu ──
await pg.evaluate(() => { try{ localStorage.removeItem('nrm:aviso') }catch(e){} });
await pg.reload({ waitUntil:'load' }); await pg.waitForTimeout(2400);
const menu = await pg.evaluate(() => [...document.querySelectorAll('.nav>a')].map(a => {
  const d = document.querySelector(a.getAttribute('href'));
  return { href: a.getAttribute('href'),
           txt: a.textContent.trim().replace(/^(.+?)\1$/,'$1'),
           ficha: !!a.querySelector('.chip svg path, .chip svg circle'),
           destino: !!d, visible: d ? getComputedStyle(d).display !== 'none' : false };
}));
// Nueve, no diez: «03 The thesis» se oculto y con ella se fue su entrada.
// Y no se compara contra un numero escrito a mano, que es lo que hizo falta
// tocar aqui: se compara contra las secciones que la pagina considera
// enlazables. Asi el dia que se esconda o se anada otra, la prueba sigue
// midiendo lo que dice medir en vez de una constante vieja.
const enlazables = await pg.evaluate(() => {
  // Las de transicion y las decorativas nunca tuvieron entrada. «ruta»
  // tampoco, y esa si es una decision: la hoja de ruta esta numerada y se ve,
  // pero vive dentro del recorrido y no se salta a ella desde la barra.
  const FUERA = new Set(['chroma','kin','xfade','xlight','hpin','docs','blog',
                         'loop','dark','umb','hero','logos','team','tkp','ruta']);
  return [...document.querySelectorAll('main>section[id]')]
    .filter(s => getComputedStyle(s).display !== 'none')
    .map(s => s.id).filter(i => !FUERA.has(i)).length;
});
di(menu.length === enlazables,
   'una entrada por seccion enlazable, ni una de mas ni de menos (' +
   menu.length + ' entradas, ' + enlazables + ' secciones)');
di(menu.every(m => m.ficha), 'cada una con su ficha');
di(menu.every(m => m.destino), 'todas apuntan a una seccion que existe');
di(menu.every(m => m.visible), 'y ninguna a una seccion oculta');
const orden = await pg.evaluate(() => [...document.querySelectorAll('.nav>a')].map(a => {
  const e = document.querySelector(a.getAttribute('href'));
  let y = 0, n = e; while (n) { y += n.offsetTop; n = n.offsetParent } return y;
}));
di(orden.every((y, i) => i === 0 || y > orden[i-1]),
   'y van en el orden en que se bajan, sin saltos');
di(await pg.evaluate(() => getComputedStyle(document.querySelector('.nav')).display) === 'flex',
   'el menu se ve en escritorio');

// ── el subrayado ──
di((await pg.evaluate(() => document.querySelectorAll('.nav>a.on').length)) === 0,
   'en la portada no hay nada subrayado');
// «thesis» sale de la lista: la seccion esta oculta, asi que no hay adonde
// desplazarse ni que subrayar. Dejarla aqui era pedirle a la prueba que
// comprobara algo que ya no existe.
for (const id of ['network','press','solutions','stack','security','presale','token','builds','join']) {
  await pg.evaluate(i => { const e = document.getElementById(i); let y=0,n=e;
    while(n){y+=n.offsetTop;n=n.offsetParent} scrollTo(0, y + e.offsetHeight/2 - innerHeight/2); }, id);
  await pg.waitForTimeout(800);
  const on = await pg.evaluate(() => [...document.querySelectorAll('.nav>a.on')].map(a=>a.getAttribute('href')));
  di(on.length === 1 && on[0] === '#' + id, 'en #' + id + ' se subraya ' + id + (on.length?' ('+on.join(',')+')':''));
}

// ── los doce idiomas ──
const dic = await pg.evaluate(() => JSON.parse(document.getElementById('i18n').textContent));
di(Object.keys(dic).length === 12, 'siguen los doce idiomas');
for (const k of ['Build','complete','Press','Thesis','Stack','Solutions','Network','Security','Token','Seed Round','In the open']) {
  di(Object.values(dic).every(d => d[k]), `«${k}» traducido en los doce`);
}
const es = await (async () => {
  await pg.evaluate(() => scrollTo(0,0)); await pg.waitForTimeout(400);
  await pg.click('.hud .lang'); await pg.waitForTimeout(400);
  await pg.evaluate(() => document.querySelector('.lang-menu button[data-l="es"]').click());
  await pg.waitForTimeout(1600);
  return pg.evaluate(() => ({
    nav: [...document.querySelectorAll('.nav>a')].map(a=>a.textContent.trim().replace(/^(.+?)\1$/,'$1')),
    ann: document.querySelector('.ann-in').innerText.replace(/\s+/g,' ') }));
})();
di(es.nav.includes('Construir') && es.nav.includes('Pila'), 'el menu se traduce: ' + es.nav.join(' '));
di(/completado/.test(es.ann), 'y el aviso tambien: ' + es.ann.trim());
await ctx.close();

// ── el telefono ──
const ctx2 = await nav.newContext({ viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true });
const mo = await ctx2.newPage();
mo.on('pageerror', e => errs.push('movil: ' + e.message));
await mo.goto(URL, { waitUntil:'load' }); await mo.waitForTimeout(2400);
di(await mo.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth) === 0,
   'en el telefono no se sale nada por el lado');
di(await mo.evaluate(() => document.querySelector('.ann').getBoundingClientRect().height > 20) === MONTADO,
   MONTADO ? 'el aviso tambien se ve en el telefono'
           : 'y en el telefono tampoco asoma');
await mo.click('#burger'); await mo.waitForTimeout(600);
const hoja = await mo.evaluate(() => {
  const s = document.getElementById('sheet');
  return { top: Math.round(s.getBoundingClientRect().top),
           n: s.querySelectorAll('a').length, fichas: s.querySelectorAll('.chip').length,
           cta: !!s.querySelector('.sheet-cta') };
});
di(hoja.n === menu.length + 1 && hoja.fichas === menu.length,
   'el menu del telefono trae las mismas que la barra y la llamada (' +
   hoja.fichas + ' + 1)');
di(hoja.cta, 'con el boton de entrar en la ronda al final');
/* El menu cuelga de «--ann + --bar»: lo que mida la franja mas lo que mida la
   barra. Se comprueba contra esa cuenta y no contra un numero fijo, que es lo
   que hacia antes —«>= 80»— y por eso no vio nada cuando la franja se apago:
   80 lo cumplen tanto los 86 de entonces como los 52 de ahora.

   No se compara con el BORDE de abajo de la barra a proposito: en el telefono
   la barra flota con diez pixeles de aire por los cuatro lados, asi que su
   borde cae mas abajo que la cuenta, y el menu asoma por detras de ella. Eso
   es como esta hecho, no un fallo. */
const cuenta = await mo.evaluate(() => {
  const cs = getComputedStyle(document.body);
  return Math.round(parseFloat(cs.getPropertyValue('--ann')) + parseFloat(cs.getPropertyValue('--bar')));
});
di(Math.abs(hoja.top - cuenta) <= 1,
   'y arranca en la cuenta de la franja mas la barra (' + hoja.top + ' vs ' + cuenta + ')');
await ctx2.close();

// ── las fichas del menu: azules y con trazo ──────────────────────────────
// Iban en gris y a 10,5 px desde una rejilla de 24, o sea con la escala en
// 0,44: un trazo de 1,6 acababa midiendo 0,7 px de pantalla, y medio pixel no
// se puede pintar, se reparte entre dos y los dos salen grises. Medido a DPR
// 1 sobre el interior del icono -sin el borde de la ficha, que si no
// contamina-: 8,4 % de trazo macizo contra 18,2 % de niebla. No habia icono,
// habia niebla.
// Se comprueban las dos cosas que se pidieron, y las dos sobre el PIXEL, no
// sobre el CSS: que el icono sea azul, y que el trazo tenga cuerpo. El fondo
// de la ficha se saca del tono mas repetido del recorte y el trazo es lo que
// se aleja de el, asi que la medida vale sea cual sea el color.
// Con el arreglo: azul 23,8 %, macizo 13,7 %, niebla 15,7 %.
{
  const ctx3 = await nav.newContext({ viewport:{width:1440,height:900}, deviceScaleFactor:1 });
  const ch = await ctx3.newPage();
  await ch.goto(URL, { waitUntil:'load' });
  await ch.waitForTimeout(2200);
  await ch.evaluate(() => scrollTo(0, 0));
  await ch.waitForTimeout(400);
  const cajas = await ch.evaluate(() => [...document.querySelectorAll('.nav .chip')].slice(0, 6)
    .map(e => { const r = e.getBoundingClientRect();
      return { x: Math.round(r.left) + 4, y: Math.round(r.top) + 4,
               width: Math.round(r.width) - 8, height: Math.round(r.height) - 8 }; })
    .filter(c => c.width > 4 && c.height > 4));
  di(cajas.length >= 5, 'las fichas del menu estan a la vista para medirlas (' + cajas.length + ')');
  let macizo = 0, niebla = 0, azul = 0, tot = 0;
  for (const q of cajas) {
    const b64 = (await ch.screenshot({ clip:q })).toString('base64');
    const r = await ch.evaluate(async s => {
      const im = new Image();
      await new Promise(z => { im.onload = z; im.src = 'data:image/png;base64,' + s });
      const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
      const x = cv.getContext('2d'); x.drawImage(im, 0, 0);
      const d = x.getImageData(0, 0, cv.width, cv.height).data;
      const cu = {};
      for (let i = 0; i < d.length; i += 4) {
        const k = (d[i]>>3) + ',' + (d[i+1]>>3) + ',' + (d[i+2]>>3);
        cu[k] = (cu[k] || 0) + 1;
      }
      let mj = null, mx = 0;
      for (const k in cu) if (cu[k] > mx) { mx = cu[k]; mj = k }
      const f = mj.split(',').map(v => +v * 8 + 4);
      const dd = [];
      for (let i = 0; i < d.length; i += 4) dd.push(Math.hypot(d[i]-f[0], d[i+1]-f[1], d[i+2]-f[2]));
      const top = Math.max(...dd);
      let n = 0, m = 0, g = 0, az = 0;
      for (let i = 0, j = 0; i < d.length; i += 4, j++) {
        n++;
        const r0 = top ? dd[j] / top : 0;
        if (r0 >= 0.70) g++; else if (r0 >= 0.22) m++;
        const L = (0.2126*d[i] + 0.7152*d[i+1] + 0.0722*d[i+2]) / 255;
        if (d[i+2] > d[i] + 40 && L > 0.12) az++;
      }
      return { n, m, g, az };
    }, b64);
    macizo += r.g; niebla += r.m; azul += r.az; tot += r.n;
  }
  const pAz = tot ? azul / tot * 100 : 0, pMa = tot ? macizo / tot * 100 : 0;
  // En REPOSO apagadas: el azul se reserva para el seleccionado. Diez fichas
  // azules en fila compiten con el enlace activo y el azul deja de senalar.
  di(pAz <= 6, 'y en reposo van apagadas, el azul es del seleccionado (' +
     pAz.toFixed(1) + ' % de pixeles azules, limite 6)');
  di(pMa >= 11, 'y el trazo tiene cuerpo a 20 px, no es niebla (' + pMa.toFixed(1) +
     ' % macizo frente a ' + (niebla / tot * 100).toFixed(1) + ' % de niebla, limite 11)');
  await ctx3.close();
}

di(errs.length === 0, 'sin errores de pagina' + (errs.length ? ': ' + errs[0] : ''));
console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
await nav.close();
process.exit(mal ? 1 : 0);
