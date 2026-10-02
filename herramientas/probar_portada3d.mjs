/* Portada 3D de /app, pie y P2P: la escena carga y se detiene fuera de la portada, los
   enlaces llevan a su vista, «NEREUM» + el logo del pie caben en cualquier ancho, y
   P2P muestra la tasa de referencia y guarda, valida y borra anuncios.
   Uso: node herramientas/probar_portada3d.mjs (sirve la carpeta del repo). */
import { chromium } from 'playwright'; import http from 'http'; import fs from 'fs'; import path from 'path';
const R = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const T = {'.html':'text/html','.svg':'image/svg+xml','.woff2':'font/woff2','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png'};
const s = http.createServer((q, r) => { let f = path.join(R, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e){ r.writeHead(404); r.end(); return; } r.writeHead(200, {'content-type': T[path.extname(f)] || 'application/octet-stream'}); r.end(d); }); }).listen(0);
const URL0 = `http://localhost:${s.address().port}/app/`;
/* mercado simulado: así la prueba no depende de la red */
async function simula(p){
  await p.route(/kraken|coinbase|binance|coingecko|ws\.okx|fonts\.g/, r => r.abort());
  await p.route(/www\.okx\.com\/api\/v5\/market\/(tickers|candles)/, r => { const u = r.request().url();
    if (u.includes('tickers')) return r.fulfill({contentType: 'application/json', body: JSON.stringify({code: '0', data: [{instId: 'BTC-USDT', last: '64182.4', open24h: '62672', high24h: '64800', low24h: '62100', volCcy24h: '1', vol24h: '1', bidPx: '64182', askPx: '64183'}]})});
    const out = []; let c = 61500; for (let i = 0; i < 300; i++){ const a = c; c = a * (1 + Math.sin(i / 9) * .004 + .0004); out.push([String(i), String(a), String(Math.max(a, c) * 1.002), String(Math.min(a, c) * .998), String(c), '1', '0', '0', '1']); }
    return r.fulfill({contentType: 'application/json', body: JSON.stringify({code: '0', data: out.reverse()})}); });
}
let ok = 0, mal = 0; const prueba = (n, v) => { v ? ok++ : mal++; console.log((v ? '✓ ' : '✗ ') + n); };
const b = await chromium.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']});
for (const [w, h] of [[320, 568], [375, 667], [390, 844], [430, 932], [820, 1180], [1280, 800], [1920, 1080]]){
  const p = await b.newPage({viewport: {width: w, height: h}}); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await simula(p); await p.goto(URL0);
  const carga = await p.waitForFunction(() => typeof c3 !== 'undefined' && c3 && document.querySelector('.c3-gl'), null, {timeout: 60000}).then(() => true, () => false);
  prueba(`${w}×${h}: la escena 3D carga`, carga);
  if (carga){ await p.evaluate(() => { c3.activa(false); for (let i = 40; i >= 0; i--) c3.ve(9 - i * .016); });
    const m = await p.evaluate(() => { const r = e => document.querySelector(e).getBoundingClientRect();
      return {movil: document.querySelector('#c3').classList.contains('m'), fi: r('#c3fi'), ctas: r('.c3-ctas'), pasos: r('.c3-pasos'), docW: document.documentElement.scrollWidth}; });
    prueba(`${w}×${h}: diseño ${m.movil ? 'de teléfono' : 'de escritorio'} sin desbordar`, m.docW === w && m.movil === (w <= 700 || w / h < 1.05));
    prueba(`${w}×${h}: la ficha no pisa los botones ni la barra de productos`, m.fi.bottom <= m.pasos.top + 1 && (m.fi.top >= m.ctas.bottom || m.fi.left >= m.ctas.right - 1));
  }
  const pie = await p.evaluate(() => { const f = document.querySelector('.cv-foot .fmark'), c = f.getBoundingClientRect(), sv = f.querySelector('svg').getBoundingClientRect(), sp = f.querySelector('span').getBoundingClientRect();
    return sv.right <= c.right + .5 && sp.right <= sv.left && sv.right <= innerWidth && sp.left >= 0; });
  prueba(`${w}×${h}: NEREUM y el logo del pie caben enteros`, pie);
  prueba(`${w}×${h}: sin errores de página`, !errs.length);
  await p.close();
}
const p = await b.newPage({viewport: {width: 1280, height: 800}}); await simula(p);
await p.goto(URL0 + '#/spot'); await p.waitForTimeout(1500);
prueba('el spot no carga la escena 3D', await p.evaluate(() => !document.querySelector('.c3-gl')));
await p.evaluate(() => location.hash = '#/'); await p.waitForFunction(() => typeof c3 !== 'undefined' && c3, null, {timeout: 60000});
for (const [sel, v] of [['.c3-pasos a[href="#/p2p"]', 'p2p'], ['.c3-pasos a[href="#/swap"]', 'swap'], ['.c3-nav a[href="#/pools"]', 'pools'], ['.c3-ctas .lima', 'spot']]){
  await p.evaluate(() => location.hash = '#/'); await p.waitForTimeout(300); await p.click(sel); await p.waitForTimeout(300);
  prueba(`${sel} lleva a ${v}`, await p.evaluate(() => vista) === v); }
/* P2P */
await p.route(/api\.coinbase\.com\/v2\/exchange-rates/, r => r.fulfill({contentType: 'application/json', body: JSON.stringify({data: {rates: {USD: '1', EUR: '0.9312'}}})}));
await p.evaluate(() => { localStorage.removeItem('nereum-dex-p2p'); localStorage.removeItem('nereum-dex-p2p-ads'); location.hash = '#/p2p'; }); await p.waitForTimeout(600);
await p.selectOption('#ppFiat', 'EUR'); await p.waitForTimeout(400);
prueba('P2P: tasa de referencia en vivo', (await p.textContent('#ppRef')).includes('0.9312 EUR'));
await p.fill('#ppC1', '93.12'); prueba('P2P: la calculadora convierte a la tasa', (await p.inputValue('#ppC2')) === '100.00');
prueba('P2P: libro vacío, sin ofertas inventadas', (await p.textContent('#ppVacioT')).startsWith('No sellers yet'));
await p.click('#ppCalcBt'); await p.click('#ppPost');
prueba('P2P: pide mínimo y método de pago', (await p.$$eval('#ppForm .e:not([hidden])', e => e.length)) === 2);
await p.fill('[data-pf="min"]', '10'); await p.click('[data-pfm="SEPA"]'); await p.click('#ppPost'); await p.waitForTimeout(200);
prueba('P2P: el anuncio queda en «My ads»', (await p.$$eval('#ppCuerpo tr', t => t.length)) === 1);
await p.reload(); await p.waitForTimeout(800); prueba('P2P: el anuncio sigue tras recargar', (await p.$$eval('#ppCuerpo tr', t => t.length)) === 1);
await p.click('[data-borra]'); prueba('P2P: se puede borrar', (await p.textContent('#ppVacioT')) === 'You have no ads');
await b.close(); s.close();
console.log(`\n${ok}/${ok + mal}`); process.exit(mal ? 1 : 0);
