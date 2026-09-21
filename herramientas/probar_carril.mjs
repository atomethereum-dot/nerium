// El indice de secciones de la derecha: que no tape texto ni le quite el clic.
//
// Esta bateria existe porque el fallo no se veia. El indice dibuja una raya de
// 34 px pegada al borde, pero la CAJA de cada boton medía 159: la etiqueta
// ocupaba sitio en la fila aunque estuviera invisible. Esos 159 px de <nav>
// quedan por delante de la pagina, asi que habia parrafos que no se podian
// seleccionar y un enlace que no se podia pinchar, debajo de un indice que ni
// siquiera los tapaba.
//
// Y ojo con como se mide, que aqui me cai dos veces:
//   · barriendo toda la altura de la pantalla en vez de la banda que el indice
//     ocupa, salen choques que nadie ve —el texto de «kin» pasa sesenta
//     pixeles POR DEBAJO—. Con eso llegue a dar por inutil el apartado;
//   · y mirando la clase .tapa para saber si el indice esta puesto, la sonda
//     se salta justo las posiciones que quiere probar. Se mira la opacidad
//     calculada, que es lo que de verdad se ve.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const RAIZ = '/home/user/nerium';
const TIPO = {'.html':'text/html','.svg':'image/svg+xml','.css':'text/css','.woff2':'font/woff2',
  '.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.js':'text/javascript','.json':'application/json'};
const srv = http.createServer((q, r) => {
  let p = path.join(RAIZ, decodeURIComponent(q.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end() }
  r.writeHead(200, {'content-type': TIPO[path.extname(p)] || 'application/octet-stream'});
  r.end(fs.readFileSync(p));
}).listen(8991);
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
let ok = 0, mal = 0;
const di = (b, t) => { if (b) { ok++; console.log('  ok  ' + t) } else { mal++; console.log('  MAL ' + t) } };

// Las dos versiones, y el telefono el primero: el indice ahora existe ahi.
// El limite de la caja no es un numero redondo, es EL MARGEN QUE LA PAGINA
// DEJA LIBRE —.wrap deja 16 px a cada lado hasta 900 px de ancho y 32 de ahi
// en adelante—. Si el carril crece mas que eso, se come texto; si la pagina
// estrecha su margen, tambien. Comprobar contra el margen de verdad, leido de
// la propia pagina, ata las dos cosas a la vez.
for (const [W, H, tactil] of [[360, 780, true], [390, 844, true],
                              [1180, 900, false], [1440, 900, false], [1920, 1080, false]]) {
  const ctx = await nav.newContext({ viewport:{width:W, height:H},
                                     hasTouch:tactil, isMobile:tactil });
  const pg = await ctx.newPage();
  await pg.goto('http://127.0.0.1:8991/index.html');
  await pg.waitForTimeout(1500);

  const r = await pg.evaluate(async () => {
    const dormir = ms => new Promise(r => setTimeout(r, ms));
    const rail = document.getElementById('srail');
    if (!rail) return { fuera:true };
    // «elementFromPoint» no sabe de mascaras: una letra desvanecida a cero
    // sigue contestando que esta ahi. Y la fila de prensa va a sangre a
    // proposito, asi que lo que la aparta del indice no es un hueco sino un
    // velo. Se mira si el punto cae dentro de ese velo —el ancho lo declara
    // la propia regla en «--velo»— y si cae, ahi no hay letra que ver.
    // Quitar el velo pone «--velo» a cero y esto se vuelve rojo, que es para
    // lo que esta.
    const velado = (el, x) => {
      for (let p = el; p && p !== document.body; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (cs.maskImage === 'none' && cs.webkitMaskImage === 'none') continue;
        const v = parseFloat(cs.getPropertyValue('--velo')) || 0;
        if (!v) continue;
        const q = p.getBoundingClientRect();
        if (x > q.right - v || x < q.left + v) return true;
      }
      return false;
    };
    const texto = (x, y) => {
      const e = document.elementFromPoint(x, y);
      if (!e || rail.contains(e)) return null;
      if (velado(e, x)) return null;
      for (const n of e.childNodes) {
        if (n.nodeType !== 3 || !n.textContent.trim()) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const q of rg.getClientRects())
          if (x >= q.left && x <= q.right && y >= q.top && y <= q.bottom)
            return { t:n.textContent.trim().slice(0, 26),
                     sel:e.tagName.toLowerCase() + '.' + String(e.className || '').trim().split(/\s+/)[0] };
      }
      return null;
    };
    // SOLO la banda que el indice ocupa de verdad, no toda la pantalla
    const barre = (x0, x1, y0, y1) => {
      const h = [];
      for (let y = Math.max(2, y0); y < Math.min(innerHeight - 2, y1); y += 7)
        for (let x = Math.max(1, x0); x < Math.min(innerWidth - 1, x1); x += 7) {
          const t = texto(x, y); if (t) h.push(t);
        }
      return h;
    };
    const caja = Math.round(rail.getBoundingClientRect().width);
    const w = document.querySelector('.wrap').getBoundingClientRect();
    const margen = Math.round(innerWidth - w.right);
    const rayas = rail.querySelectorAll('i').length;
    const abiertas = [...rail.querySelectorAll('i')]
      .filter(e => e.getBoundingClientRect().width > 0 &&
                   parseFloat(getComputedStyle(e).opacity) > 0.1).length;
    const choques = [], apagado = [];
    const alto = document.documentElement.scrollHeight;
    for (let y = 0; y < alto - innerHeight; y += 400) {
      scrollTo(0, y); await dormir(240);
      const cs = getComputedStyle(rail);
      // Ya no se SALTA la parada cuando el indice esta apagado: que lo este
      // es el fallo. Antes se saltaba porque el indice se escondia a
      // proposito; hoy se pide verlo siempre.
      if (cs.display === 'none' || parseFloat(cs.opacity) < 0.9) { apagado.push(y); continue }
      const rr = rail.getBoundingClientRect();
      rail.style.visibility = 'hidden';
      const dentro = barre(rr.left, innerWidth, rr.top, rr.bottom);
      rail.style.visibility = '';
      if (dentro.length) choques.push({ y, n:dentro.length, ej:dentro[0] });
    }
    return { fuera:false, caja, margen, rayas, abiertas, choques, apagado,
             paradas:Math.ceil((alto - innerHeight) / 400) };
  });

  if (r.fuera) { di(false, 'a ' + W + 'px el indice ni existe'); await ctx.close(); continue }
  console.log('  ··  ' + W + 'px · ' + r.paradas + ' paradas por la pagina entera');
  di(r.abiertas === r.rayas,
     'a ' + W + 'px el indice se ve ABIERTO: las ' + r.rayas + ' rayas puestas (' + r.abiertas + ')');
  di(r.apagado.length === 0,
     'a ' + W + 'px no se esconde en ninguna parada' +
     (r.apagado.length ? ' (' + r.apagado.length + ', la primera en y=' + r.apagado[0] + ')' : ''));
  di(r.caja <= r.margen,
     'a ' + W + 'px cabe en el margen que deja la pagina (' + r.caja + ' de ' + r.margen + 'px)');
  di(r.choques.length === 0,
     'a ' + W + 'px no se monta encima de ningun texto' +
     (r.choques.length ? ' (' + r.choques.length + ' sitios, p.ej. y=' + r.choques[0].y +
       ' sobre ' + r.choques[0].ej.sel + ' "' + r.choques[0].ej.t + '")' : ''));
  await ctx.close();
}
await nav.close(); srv.close();
console.log('\n' + (mal ? ok + ' bien, ' + mal + ' MAL' : ok + '/' + ok + ' correctas'));
process.exit(mal ? 1 : 0);
