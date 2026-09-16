/* Los dibujos del suelo, de SVG a mapa de bits.
 *
 * El relieve son ~580 trazos. Como SVG se ve perfecto, pero las secciones
 * llevan una escala atada al scroll y el navegador RE-RASTERIZA el fondo en
 * cada paso de esa escala: el p90 del cuadro se fue de 50 a 83 ms sin que el
 * p50 se moviera —o sea, no es que la pagina vaya lenta, es que cada tanto da
 * un tiron—. Rasterizado una vez, escalar un mapa de bits es gratis.
 *
 * Se usa Chromium para codificar porque es lo que hay y porque es exactamente
 * el mismo motor que lo va a pintar: lo que se guarda es lo que se vera.
 *
 *     node herramientas/rasterizar.mjs
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const RAIZ = '/home/user/nerium';
http.createServer((q, r) => {
  if (q.url === '/') { r.writeHead(200, {'content-type':'text/html'}); return r.end('<html></html>') }
  const p = path.join(RAIZ, q.url);
  if (!fs.existsSync(p)) { r.writeHead(404); return r.end() }
  r.writeHead(200, {'content-type':'image/svg+xml'}); r.end(fs.readFileSync(p));
}).listen(9099);
const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });
const pg = await (await nav.newContext()).newPage();
await pg.goto('http://127.0.0.1:9099/');
for (const [svg, w, h] of [['papel.svg', 1600, 1000], ['papel-alto.svg', 840, 2400]]) {
  const b64 = await pg.evaluate(async ([url, W, H]) => {
    const im = new Image();
    await new Promise((ok, no) => { im.onload = ok; im.onerror = no; im.src = url });
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    /* El suelo va DENTRO del mapa de bits. El SVG era transparente y se
       apoyaba en el color de la banda; un webp con alfa pesa el triple y no
       hace falta: el color de la banda es este. */
    x.fillStyle = '#EEF2F8'; x.fillRect(0, 0, W, H);
    x.drawImage(im, 0, 0, W, H);
    return c.toDataURL('image/webp', 0.86).split(',')[1];
  }, ['http://127.0.0.1:9099/img/' + svg, w, h]);
  const salida = path.join(RAIZ, 'img', svg.replace('.svg', '.webp'));
  fs.writeFileSync(salida, Buffer.from(b64, 'base64'));
  console.log('  ' + path.basename(salida) + '  ' + fs.statSync(salida).size + ' bytes');
}
await nav.close(); process.exit(0);
