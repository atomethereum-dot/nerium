/* LA BARRA DE DIRECCIONES DEL MOVIL NO PUEDE MOVER LA PAGINA.
   Al desplazarse en un telefono, la barra del navegador se esconde y la ventana
   visible crece unos 60-90 px. La unidad «dvh» sigue ese cambio EN VIVO; «svh»
   y «lvh» no cambian nunca, y «vh» equivale a la ventana grande tanto en Chrome
   de Android como en Safari de iOS, o sea que tampoco.

   Si un elemento del FLUJO NORMAL mide su alto en «dvh», el documento entero
   cambia de alto mientras el dedo se desliza y todo lo que hay debajo se mueve
   solo. Medido aqui: «.hero-hold» llevaba «calc(100lvh + 125dvh)», y 78 px de
   barra son 97 px que la pagina da de si de golpe. Eso es lo que el visitante
   vive como «se reinicia al llegar a algunas secciones».

   En un elemento «sticky», «absolute» o «fixed», «dvh» es justo lo que hay que
   usar: llenar la ventana visible es su trabajo y no toca el alto del documento.
   Asi que la regla no es «nada de dvh», es «dvh fuera del flujo, nunca dentro». */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, devices } from 'playwright';
const RAIZ = '/home/user/nerium'; const P = 9188;
const TIPO = {'.html':'text/html','.svg':'image/svg+xml','.css':'text/css','.woff2':'font/woff2',
  '.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.js':'text/javascript',
  '.json':'application/json','.ico':'image/x-icon'};
const srv = http.createServer((q, r) => {
  let p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end() }
  r.writeHead(200, {'content-type': TIPO[path.extname(p)] || 'application/octet-stream'});
  r.end(fs.readFileSync(p));
}).listen(P);

const nav = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
let ok = 0, mal = 0;
const di = (b, t) => { if (b) { ok++; console.log('  ok  ' + t) } else { mal++; console.log('  MAL ' + t) } };

const ctx = await nav.newContext({ ...devices['iPhone 13'], isMobile: true, hasTouch: true });
/* Se cuenta cada vez que un lienzo rehace su mapa de bits. Asignar
   «canvas.width» libera la memoria de la GPU y vuelve a reservarla AUNQUE EL
   VALOR NO CAMBIE, y eso es lo que manda la norma, no un detalle de un motor.
   Medido antes de arreglarlo: 105 reasignaciones y 37 MB reservados y tirados
   en un solo recorrido de la pagina, de los cuales 80 eran del sistema que
   dormia los lienzos lejanos. En Safari de iOS, donde esa memoria es de la
   GPU y va contra un presupuesto por pestaña, ese vaiven mata la pestaña —y
   una pestaña muerta se recarga sola: es el «se reinicia» y el «servidor no
   encontrado» que se reportaron desde el movil—. */
await ctx.addInitScript(() => {
  window.__re = 0; window.__bytes = 0;
  const d = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'width');
  Object.defineProperty(HTMLCanvasElement.prototype, 'width', { configurable: true,
    get(){ return d.get.call(this) },
    set(v){ if (window.__cuenta) { window.__re++; window.__bytes += v * this.height * 4 }
            return d.set.call(this, v) } });
});
const pg = await ctx.newPage();
await pg.goto('http://127.0.0.1:' + P + '/', { waitUntil: 'load' });
await pg.waitForTimeout(2600);

/* Se recorre la hoja de estilo de verdad, no el fichero: asi entran las reglas
   dentro de @media y las que una regla posterior pisa. De cada regla que
   mencione «dvh» en una propiedad de TAMANO se buscan los elementos que
   encajan, y se mira la «position» que de verdad tienen. */
const culpables = await pg.evaluate(() => {
  const TAMANO = { height:1, 'min-height':1, 'max-height':1, 'flex-basis':1,
                   'margin-top':1, 'margin-bottom':1, 'padding-top':1, 'padding-bottom':1 };
  const fuera = { sticky:1, absolute:1, fixed:1 };
  const out = [];

  /* Una sonda para saber a cuantos pixeles equivale el valor declarado. Sirve
     para lo unico que importa despues de encontrar la regla: saber si esa
     declaracion GANA en el elemento o si otra la pisa. */
  const sonda = document.createElement('div');
  sonda.style.cssText = 'position:absolute;visibility:hidden;width:1px;left:-9999px;top:0';
  document.body.appendChild(sonda);
  const enPx = (prop, val) => {
    sonda.style.cssText = 'position:absolute;visibility:hidden;width:1px;left:-9999px;top:0';
    sonda.style.setProperty(prop === 'height' ? 'height' : prop, val);
    return Math.round(sonda.getBoundingClientRect().height);
  };

  /* PRIMERO LA DECLARACION Y DESPUES LO ANIDADO, NO AL REVES. Desde que Chrome
     entiende CSS anidado, TODA regla de estilo trae su propia lista «cssRules»,
     vacia. Mirando «if (r.cssRules) recurre y sigue» se saltaban las 2141 reglas
     de la pagina una por una y la sonda daba verde con el defecto puesto.

     Y LAS CONDICIONES SE ARRASTRAN. Una regla dentro de «@media(min-width:1000px)»
     no pinta nada en un telefono, pero «querySelectorAll» encuentra su elemento
     igual: sin filtrar por el medio, la sonda denunciaba «.loop .gal-hold .cards»
     —que en el movil no es sticky ni mide en dvh— y eso es gritar en falso. */
  const visita = (reglas, medios) => {
    for (const r of reglas) {
      const m = (r.media && r.media.mediaText) ? medios.concat(r.media.mediaText) : medios;
      if (r.cssRules && r.cssRules.length) visita(r.cssRules, m);
      if (!r.selectorText || !r.style) continue;
      let vale = true;
      for (const q of m) { try { if (!matchMedia(q).matches) { vale = false; break } } catch (e) {} }
      if (!vale) continue;
      for (let i = 0; i < r.style.length; i++) {
        const prop = r.style[i], val = r.style.getPropertyValue(prop);
        if (val.indexOf('dvh') < 0) continue;
        if (!TAMANO[prop]) continue;              /* «top» en un sticky es pegado, no tamano */
        let els = [];
        try { els = [].slice.call(document.querySelectorAll(r.selectorText)) } catch (e) { continue }
        const px = enPx(prop, val);
        for (const el of els) {
          const cs = getComputedStyle(el);
          if (fuera[cs.position]) continue;
          /* Y que la declaracion GANE de verdad: si otra regla la pisa, el alto
             del elemento no depende de la ventana visible y no hay nada que
             denunciar. */
          const real = Math.round(parseFloat(cs[prop]));
          if (Math.abs(real - px) > 2) continue;
          out.push({ sel:r.selectorText, prop:prop, val:val, pos:cs.position,
                     px:px, id: el.id || String(el.className).split(' ')[0] });
        }
      }
    }
  };
  for (const h of document.styleSheets) { try { visita(h.cssRules, []) } catch (e) {} }
  sonda.remove();
  return out;
});
di(culpables.length === 0,
   'ningun elemento del flujo mide su alto en «dvh»' +
   (culpables.length ? ': ' + culpables.map(c => c.sel + ' {' + c.prop + ':' + c.val + '} (' + c.pos + ')').join('; ') : ''));

/* Y la otra mitad: que las etapas que SI deben llenar la ventana visible sigan
   haciendolo. Quitar «dvh» de donde estorba es facil; quitarlo de donde hace
   falta deja una franja de fondo debajo de cada escena al esconderse la barra. */
const etapas = await pg.evaluate(() => {
  const sel = ['.hpin-stage', '.stk-stage', '.xf-stage', '.xl-stage', '.umb-esc'];
  const out = [];
  for (const s of sel) {
    const e = document.querySelector(s);
    if (!e) continue;
    const cs = getComputedStyle(e);
    out.push({ s: s, pos: cs.position, alto: Math.round(parseFloat(cs.height)), vh: innerHeight });
  }
  return out;
});
const pegadas = etapas.filter(e => e.pos === 'sticky');
di(pegadas.length === etapas.length && etapas.length >= 4,
   'las etapas a pantalla completa siguen pegadas y fuera del flujo (' + pegadas.length + '/' + etapas.length + ')');
di(etapas.every(e => Math.abs(e.alto - e.vh) <= 2),
   'y siguen llenando la ventana (' + etapas.map(e => e.s + ' ' + e.alto + '/' + e.vh).join(', ') + ')');

/* Y el recorrido entero, con la cuenta puesta. El limite es generoso a
   proposito: doce lienzos tienen derecho a construirse UNA vez cada uno, y
   sobran cuatro para un giro de pantalla o un caso raro. Lo que no cabe ahi
   es un sistema que duerma y despierte lienzos mientras se lee. */
await pg.evaluate(() => { window.__cuenta = 1 });
{
  const h = await pg.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < h; y += 300) {
    await pg.evaluate(v => scrollTo(0, v), y);
    await pg.waitForTimeout(70);
  }
  const r = await pg.evaluate(() => ({ re: window.__re, mb: window.__bytes / 1048576 }));
  di(r.re <= 16,
     'recorrer la pagina no rehace los mapas de bits una y otra vez (' + r.re +
     ' reasignaciones, ' + r.mb.toFixed(1) + ' MB, limite 16)');
}

await ctx.close(); await nav.close(); srv.close();
console.log(mal ? '\n' + ok + ' bien, ' + mal + ' MAL' : '\n' + ok + '/' + ok + ' correctas');
process.exit(mal ? 1 : 0);
