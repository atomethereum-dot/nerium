/* Agents en /app: la escena simulada se anima y cuenta propuestas, los cinco trabajos
   cambian el ensayo, las reglas aprueban o rechazan como lo haría la cadena, y los
   agentes se guardan, se pausan y se borran. Sin desbordar en teléfono ni escritorio.
   Uso: node herramientas/probar_agentes.mjs [carpeta de capturas] */
import { chromium } from 'playwright'; import http from 'http'; import fs from 'fs'; import path from 'path';
const R = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..'), CAP = process.argv[2];
const T = {'.html':'text/html','.svg':'image/svg+xml','.woff2':'font/woff2','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'};
const s = http.createServer((q, r) => { let f = path.join(R, decodeURIComponent(q.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html';
  fs.readFile(f, (e, d) => { if (e){ r.writeHead(404); r.end(); return; } r.writeHead(200, {'content-type': T[path.extname(f)] || 'application/octet-stream'}); r.end(d); }); }).listen(0);
const URL0 = `http://localhost:${s.address().port}/app/`;
async function simula(p){
  await p.route(/kraken|coinbase|binance|coingecko|ws\.okx|fonts\.g|mempool/, r => r.abort());
  await p.route(/www\.okx\.com\/api\/v5\/market\/(tickers|candles)/, r => { const u = r.request().url();
    const tk = (id, px) => ({instId: id, last: px, open24h: px, high24h: px, low24h: px, volCcy24h: '1', vol24h: '1', bidPx: px, askPx: px});
    if (u.includes('tickers')) return r.fulfill({contentType: 'application/json', body: JSON.stringify({code: '0', data: [tk('BTC-USDT', '64000'), tk('ETH-USDT', '3200')]})});
    return r.fulfill({contentType: 'application/json', body: JSON.stringify({code: '0', data: []})}); });
}
let ok = 0, mal = 0; const prueba = (n, v) => { v ? ok++ : mal++; console.log((v ? '✓ ' : '✗ ') + n); };
const b = await chromium.launch({executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox']});
for (const [w, h] of [[1440, 900], [390, 844], [320, 568], [820, 1180]]){
  const p = await b.newPage({viewport: {width: w, height: h}, deviceScaleFactor: CAP ? 2 : 1}); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await simula(p); await p.goto(URL0 + '#/agents'); await p.evaluate(() => { localStorage.removeItem('nereum-dex-agentes'); localStorage.removeItem('nereum-dex-agentes-mios'); });
  await p.reload(); await p.evaluate(() => document.querySelector('#agEsc').scrollIntoView({block: 'center'})); await p.waitForTimeout(4200);
  const v = await p.evaluate(() => ({vis: !document.querySelector('#vAgents').hidden, nav: !!document.querySelector('.top .nav button[data-v="agents"]'), feed: document.querySelectorAll('#agFeed .ag-ev').length,
    cnt: +document.querySelector('#agCP').textContent, docW: document.documentElement.scrollWidth, jobs: document.querySelectorAll('.ag-job').length,
    pix: (() => { const c = document.querySelector('#agCv'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 16) if (d[i] > 0) n++; return n; })()}));
  prueba(`${w}×${h}: Agents está en el menú y se abre`, v.vis && v.nav);
  prueba(`${w}×${h}: la escena dibuja y propone acciones (${v.cnt})`, v.pix > 500 && v.feed >= 1 && v.cnt >= 1);
  prueba(`${w}×${h}: seis trabajos`, v.jobs === 6);
  prueba(`${w}×${h}: sin desbordar a lo ancho`, v.docW === w);
  if (CAP){ await p.screenshot({path: `${CAP}/ag_${w}_hero.png`}); await p.evaluate(() => document.querySelector('.ag-h2').scrollIntoView()); await p.waitForTimeout(2500); await p.screenshot({path: `${CAP}/ag_${w}_jobs.png`});
    await p.screenshot({path: `${CAP}/ag_${w}_full.png`, fullPage: true}); }
  if (w === 1440){
    const ver = () => p.evaluate(() => document.querySelector('#agRes > div:last-child b').textContent);
    const log = () => p.evaluate(() => document.querySelector('#agLog').textContent);
    prueba('Trader por defecto: rejilla de 10 niveles ±5 %, compra límite en $63,644.4 y venta en $64,355.6, aprobadas', (await log()).includes('Buy limit') && (await log()).includes('63,644.4') && (await log()).includes('64,355.6') && (await ver()) === 'Approved');
    await p.click('#agPar [data-pv="ruptura"]'); await p.waitForTimeout(300);
    prueba('Trader breakout: por debajo del disparador (+2 %) espera', (await log()).includes('Waiting for the breakout'));
    await p.fill('#agK_trigP', '63000'); await p.waitForTimeout(700);
    prueba('Trader breakout: roto el nivel, compra $500 a mercado', (await log()).includes('Buy $500 of BTC at market') && (await ver()) === 'Approved');
    await p.click('#agPar [data-pv="salida"]'); await p.waitForTimeout(300);
    prueba('Trader TP/SL: con +3 % mantiene la posición', (await log()).includes('Holding at +3.09%'));
    await p.fill('#agK_entry', '58000'); await p.waitForTimeout(700);
    prueba('Trader TP/SL: con +10 % vende, pero 0.05 BTC ($3,200) pasa el límite de $1,000 y la cadena lo rechaza', (await log()).includes('take profit') && (await ver()) === 'Rejected by the chain');
    await p.click('.ag-job[data-aj="rebal"]'); await p.waitForTimeout(300);
    prueba('Rebalancer: con BTC a $64,000 el BTC queda en 54 % y propone comprar BTC', (await log()).includes('BTC 54.2%') && (await log()).includes('BTC with NUSD'));
    await p.click('.ag-job[data-aj="dca"]'); await p.waitForTimeout(300);
    prueba('DCA: propone comprar $100 de BTC y lo aprueba', (await log()).includes('Buy $100 of BTC') && (await ver()) === 'Approved');
    await p.fill('#agMax', '50'); await p.waitForTimeout(700);
    prueba('DCA: por encima del límite por acción, la cadena lo rechaza', (await ver()) === 'Rejected by the chain' && (await log()).includes('is above $50.00'));
    await p.fill('#agMax', '500'); await p.click('#agActivos [data-aa="BTC"]'); await p.waitForTimeout(300);
    prueba('DCA: sin BTC entre los activos permitidos, rechazado', (await log()).includes('BTC not allowed'));
    await p.click('#agActivos [data-aa="BTC"]'); await p.fill('#agPide', '80'); await p.waitForTimeout(700);
    prueba('DCA: por encima de «Ask me», espera tu firma', (await ver()) === 'Needs your signature');
    await p.click('.ag-job[data-aj="pay"]'); await p.waitForTimeout(300);
    prueba('Payments: sin dirección en la lista, rechazado', (await ver()) === 'Rejected by the chain');
    await p.fill('#agK_dir', '0x3A2f46170E57DDF11135e13884db0236f1924292'); await p.waitForTimeout(700);
    prueba('Payments: con la dirección en la lista, aprobado', (await ver()) === 'Approved');
    await p.click('#agDest [data-de="mias"]'); await p.waitForTimeout(300);
    prueba('Payments: «Only my wallets» bloquea pagar a un tercero', (await ver()) === 'Rejected by the chain');
    await p.click('.ag-job[data-aj="guard"]'); await p.fill('#agK_debt', '38000'); await p.waitForTimeout(700);
    prueba('Loan guardian: salud 1.31 con 1 BTC y 38,000 de deuda, por encima del umbral, no actúa', (await log()).includes('Nothing to do'));
    await p.fill('#agK_debt', '45000'); await p.waitForTimeout(700);
    prueba('Loan guardian: por debajo del umbral, propone pagar parte', (await log()).includes('Repay'));
    await p.click('#agGuardar'); await p.waitForTimeout(300);
    prueba('El agente se guarda', (await p.$$eval('#agMios .ag-m', e => e.length)) === 1 && (await p.textContent('#agMiosN')) === '1');
    await p.click('#agMios [data-ags]'); prueba('Se puede pausar', await p.evaluate(() => document.querySelector('#agMios .ag-m').classList.contains('pausa')));
    await p.reload(); await p.waitForTimeout(800); prueba('Sigue guardado al recargar', (await p.$$eval('#agMios .ag-m', e => e.length)) === 1);
    await p.click('#agMios [data-agb]'); prueba('Se puede borrar', (await p.$$eval('#agMios .ag-m', e => e.length)) === 0);
    await p.fill('#agMax', ''); await p.click('#agGuardar'); prueba('Sin límites no se guarda', (await p.$$eval('#agMios .ag-m', e => e.length)) === 0);
    await p.goto(URL0 + '#/spot'); await p.waitForTimeout(400);
    const f0 = await p.textContent('#agCP'); await p.waitForTimeout(2500);
    prueba('Fuera de Agents la escena se detiene', (await p.textContent('#agCP')) === f0);
  }
  prueba(`${w}×${h}: sin errores de página`, !errs.length); if (errs.length) console.log(errs);
  await p.close();
}
await b.close(); s.close(); console.log(`\n${ok} bien, ${mal} mal`); process.exit(mal ? 1 : 0);
