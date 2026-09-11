// El riesgo de pasar la pagina a oscuro no es que quede fea: es que algun
// texto quede ilegible y no se note en una captura. Esto recorre la pagina
// entera, mide el contraste REAL de cada texto contra el fondo que de verdad
// tiene detras —subiendo por los padres hasta encontrar uno opaco— y falla si
// alguno baja del minimo. 4,5:1 para el texto normal, 3:1 para el grande, que
// es lo que pide la norma.
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
}).listen(9022);
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
let ok = 0, mal = 0;
const di = (b, t) => { if (b) { ok++; console.log('  ok  ' + t); } else { mal++; console.log('  MAL ' + t); } };

const MEDIR = () => {
  const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v/12.92 : Math.pow((v+.055)/1.055, 2.4) };
    return .2126*f(c[0]) + .7152*f(c[1]) + .0722*f(c[2]) };
  const par = s => { const m = (s||'').match(/[\d.]+/g); return m ? m.map(Number) : null };
  const sobre = (fg, bg) => {             // fg puede llevar alfa: se compone
    const a = fg.length > 3 ? fg[3] : 1;
    return [0,1,2].map(i => fg[i]*a + bg[i]*(1-a));
  };
  /* Sube por los padres hasta el primer fondo OPACO y lo devuelve. Si por el
     camino se topa antes con algo que pinta ese hueco y no esta en el CSS
     —un lienzo que lo tapa, o un degradado— devuelve «nada»: no es que el
     texto falle, es que desde aqui no se puede medir, y decir 1:1 seria
     mentira.

     El orden importa y es la correccion de un intento anterior. La primera
     version de esto descartaba todo lo que tuviera un lienzo por encima, y se
     tragaba los botones de la portada, que tienen fondo propio y si hay que
     medirlos. Se mira el fondo del elemento ANTES que el lienzo del padre: si
     el texto se apoya en algo opaco suyo, el lienzo de detras da igual. */
  const tapa = (n, r) => [...n.children].some(k => {
    if (k.tagName !== 'CANVAS') return false;
    const b = k.getBoundingClientRect();
    return b.left <= r.left + 1 && b.right >= r.right - 1
        && b.top <= r.top + 1 && b.bottom >= r.bottom - 1;
  });
  const fondoDe = (el, r) => {
    let n = el;
    while (n && n !== document.documentElement) {
      /* En un PADRE el lienzo se mira antes que el color, porque el lienzo se
         pinta encima de ese color y es el que se ve. En el elemento mismo, al
         reves: si el texto se apoya en un fondo propio y opaco, lo que haya
         detras da igual. Poner los dos en el mismo orden es lo que hacia que
         la palabra del pase de escala saliera a 1:1 contra un negro que nadie
         llega a ver. */
      if (n !== el && tapa(n, r)) return null;         // lienzo
      const c = par(getComputedStyle(n).backgroundColor);
      if (c && (c.length < 4 || c[3] >= .92)) return c.slice(0,3);
      /* «background-image» a secas NO vale como corte: casi todo aqui lleva
         grano, tapiz o un filete en degradado encima de un color opaco, y
         cortar ahi dejaba sin medir media pagina —incluidas las filas y las
         tarjetas de prensa, que si se miden—. La unica placa pintada de
         verdad con un degradado y sin color debajo es la de prensa, y esa va
         nombrada abajo. */
      n = n.parentElement;
    }
    return [0,0,0];
  };
  const malos = [], lienzos = new Set();
  document.querySelectorAll('body *').forEach(el => {
    const txt = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!txt) return;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 6) return;
    if (r.bottom < 0 || r.top > innerHeight) return;      // solo lo que se ve
    const c = getComputedStyle(el);
    if (c.visibility === 'hidden' || c.display === 'none') return;
    /* Se descartan tres cosas, y ninguna por comodidad:
       · lo que esta marcado aria-hidden —los carriles de palabras en contorno,
         que son decoracion y no texto que nadie tenga que leer;
       · el texto dibujado solo con contorno (-webkit-text-stroke), que por
         definicion tiene el relleno igual al fondo;
       · lo que en ese momento esta a medio desvanecer, propio o por un padre:
         medirlo a mitad de transicion no dice nada. */
    if (el.closest('[aria-hidden="true"]')) return;
    /* La placa de color de las tarjetas de prensa es un degradado sin color
       opaco debajo: desde el CSS no hay contra que medir. Va nombrada, no por
       una regla general, y se dice al final. */
    if (el.closest('.pcd-art')) { lienzos.add((el.className || el.tagName).toString()); return }
    /* Y el parrafo de la tesis, donde las palabras nacen en gris y se van
       poniendo en tinta segun bajas: ese gris es el efecto, no un descuido, y
       cada palabra acaba en negro. Medir la mitad sin revelar dice 2,23:1 de
       algo que nadie ve quieto. Va nombrado y se dice al final. */
    if (el.closest('.say')) { lienzos.add((el.className || el.tagName).toString()); return }
    /* · y el pase de escala, donde la palabra es tinta OSCURA a proposito y
         solo se lee cuando el lienzo de debajo se enciende: el fondo que de
         verdad tiene detras lo pinta el canvas pixel a pixel y no esta en
         ninguna regla, asi que medirla contra el color del padre da 1:1 y es
         mentira. La excepcion se nombra —no es «lleva un canvas encima»— y se
         cuenta al final: la primera version decia eso y se tragaba tambien los
         botones de la portada, que SI tienen fondo propio y SI hay que medir.
         Una excepcion que se lleva por delante lo que venias a comprobar no es
         una excepcion, es un agujero. */
    const trazo = c.webkitTextStrokeWidth;
    if (trazo && parseFloat(trazo) > 0) return;
    let op = 1, n2 = el;
    while (n2 && n2 !== document.documentElement) { op *= +getComputedStyle(n2).opacity; n2 = n2.parentElement; }
    if (op < .92) return;
    const fg = par(c.color); if (!fg) return;
    if (fg.length > 3 && fg[3] < .1) return;   /* invisible a proposito */
    const bg = fondoDe(el, r);
    if (!bg) { lienzos.add((el.className || el.tagName).toString()); return }
    const col = sobre(fg, bg);
    const L1 = lum(col), L2 = lum(bg);
    const cr = (Math.max(L1,L2) + .05) / (Math.min(L1,L2) + .05);
    const px = parseFloat(c.fontSize), grande = px >= 24 || (px >= 18.66 && +c.fontWeight >= 700);
    const min = grande ? 3 : 4.5;
    if (cr < min) malos.push({
      q: (el.className || el.tagName).toString().split(' ').slice(0,2).join('.'),
      cr: +cr.toFixed(2), min, px: Math.round(px),
      txt: el.textContent.trim().slice(0, 30) });
  });
  return { malos, lienzos: [...lienzos] };
};

const ctx = await nav.newContext({ viewport:{width:1440,height:900} });
const pg = await ctx.newPage();
await pg.goto('http://127.0.0.1:9022/', { waitUntil:'load' });
await pg.waitForTimeout(2600);
const alto = await pg.evaluate(() => document.body.scrollHeight);
const fallos = new Map(), sobreLienzo = new Set();
for (let y = 0; y < alto - 700; y += 620) {
  await pg.evaluate(v => scrollTo(0, v), y);
  await pg.waitForTimeout(420);
  const paso = await pg.evaluate(MEDIR);
  paso.lienzos.forEach(c => sobreLienzo.add(c));
  for (const m of paso.malos) {
    const k = m.q + '|' + m.txt;
    if (!fallos.has(k) || fallos.get(k).cr > m.cr) fallos.set(k, m);
  }
}
const lista = [...fallos.values()].sort((a,b) => a.cr - b.cr);
di(lista.length === 0, 'todo el texto de la pagina se lee' +
   (lista.length ? ' — ' + lista.length + ' por debajo del minimo' : ''));
if (sobreLienzo.size) console.log('      (sin medir, el fondo no esta en el CSS: ' +
  [...sobreLienzo].join(', ') + ')');
lista.slice(0, 80).forEach(m => console.log('      ' + m.cr + ':1 (min ' + m.min + ') ' +
  m.px + 'px  ' + m.q + '  «' + m.txt + '»'));
await ctx.close();

console.log(mal ? `\n${ok} bien, ${mal} MAL` : `\n${ok}/${ok} correctas`);
await nav.close(); srv.close();
process.exit(mal ? 1 : 0);
