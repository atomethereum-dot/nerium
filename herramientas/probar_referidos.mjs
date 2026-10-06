import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = '/home/user/nerium';
const TIPOS = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.woff2':'font/woff2', '.jpg':'image/jpeg',
  '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon' };

const srv = http.createServer((req,res)=>{
  let f = decodeURIComponent(req.url.split('?')[0]);
  if (f.endsWith('/')) f += 'index.html';
  const p = path.join(RAIZ, f);
  if (!p.startsWith(RAIZ) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, {'content-type': TIPOS[path.extname(p)] || 'application/octet-stream'});
  res.end(fs.readFileSync(p));
});
await new Promise(r=>srv.listen(8957, r));

const PRECIO_NATIVO = 250595548942n;   // $2.505,95548942 / ETH
const PRECIO_USD    = 20000000n;       // $0,20
const MIN           = 20000000n;       // $0,20
const MAX           = 1000000000000n;  // $10.000
const VENTA_ETH     = '0xacbf1add75139d0e926d57ec715fdab8bee04a89';

const w = v => BigInt(v).toString(16).padStart(64,'0');

const RESP = {
  '0xaf68130e': '0x'+w(PRECIO_NATIVO)+w(1),
  '0x8b3948bd': '0x'+w(PRECIO_USD),
  '0x3fbb3d1d': '0x'+w(MIN),
  '0x4194fdd1': '0x'+w(MAX),
  '0x63b20117': '0x'+w(0),
  '0x4b749535': '0x'+w(0),
  '0xb8f7a665': '0x'+w(1),     // isLive
  '0xb4bd9e27': '0x'+w(0),     // isOver
  '0x5c975abb': '0x'+w(0),     // paused
  '0x78e97925': '0x'+w(1757000000),
  '0x4b8bcb58': '0x'+w(0),     // claimOpen
  '0x3acd1572': '0x'+w(MAX),   // remainingAllowanceUsd
  '0xdd62ed3e': '0x'+w(0),     // allowance
};

const nav = await chromium.launch({ executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args:['--no-sandbox'] });

/* La ronda puede estar en espera (NRM_PRONTO en index.html: «Starts soon» y la
   privada sin sumar). Esta prueba comprueba la CUENTA, asi que carga la pagina
   con la espera apagada. La espera tiene su propia prueba: probar_pronto. */
{ const nc = nav.newContext.bind(nav);
  nav.newContext = async o => { const c = await nc(o); await c.addInitScript(() => { window.NRM_PRONTO = false }); return c } }
const ctx = await nav.newContext({ viewport:{width:1400,height:1000}, permissions:['clipboard-read','clipboard-write'] });

await ctx.addInitScript(({RESP}) => {
  window.__rpc = [];
  window.__tx  = [];
  const origFetch = window.fetch;
  window.fetch = async (url, opt) => {
    if (!opt || !opt.body) return origFetch(url, opt);
    const j = JSON.parse(opt.body);
    window.__rpc.push(j.method);
    let result = null;
    if (j.method === 'eth_call') {
      const data = j.params[0].data;
      result = RESP[data.slice(0,10)] ?? '0x'+'0'.repeat(64);
    } else if (j.method === 'eth_getTransactionReceipt') {
      result = { status:'0x1', transactionHash: j.params[0] };
    }
    return new Response(JSON.stringify({jsonrpc:'2.0',id:j.id,result}),
      {status:200, headers:{'content-type':'application/json'}});
  };

  const prov = {
    _cid: '0x1',
    _oyentes: {},
    on(ev, fn){ (prov._oyentes[ev] = prov._oyentes[ev] || []).push(fn); },
    removeListener(){},
    _emitir(ev, arg){ (prov._oyentes[ev]||[]).forEach(f=>f(arg)); },
    async request({method, params}) {
      if (method === 'eth_requestAccounts' || method === 'eth_accounts')
        return ['0x1111111111111111111111111111111111111111'];
      if (method === 'eth_chainId') return prov._cid;
      if (method === 'wallet_switchEthereumChain') { prov._cid = params[0].chainId; prov._emitir('chainChanged', prov._cid); return null; }
      if (method === 'eth_sendTransaction') {
        window.__tx.push(params[0]);
        return '0x'+'ab'.repeat(32);
      }
      throw new Error('metodo no simulado: '+method);
    }
  };
  const info = { uuid:'test-1', name:'Cartera de prueba', rdns:'xyz.nereum.test', icon:'' };
  window.addEventListener('eip6963:requestProvider', () => {
    window.dispatchEvent(new CustomEvent('eip6963:announceProvider',
      { detail: Object.freeze({ info, provider: prov }) }));
  });
  window.__prov = prov;
}, { RESP });

const pg = await ctx.newPage();
const errores = [];
pg.on('pageerror', e => errores.push(String(e)));
await pg.route('**explorer-api.walletconnect.com/**', r => r.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({listings:{}}) }));

const REF  = '0x2222222222222222222222222222222222222222';
const YO   = '0x1111111111111111111111111111111111111111';
const COLA = '4e524d52' + REF.slice(2);
const R = [];
const chk = (n, real, esp) => R.push({ n, ok: String(real)===String(esp), real, esp });

/* p78 · REFERIDOS. Se entra por un enlace con ?ref=, la compra lleva al final
   la marca «NRMR» y la direccion de quien la trajo, y el widget da a cada
   cartera su propio enlace. El contrato no se toca: la compra es la misma. */
await pg.goto('http://127.0.0.1:8957/index.html?ref=' + REF, { waitUntil:'load' });
await pg.waitForTimeout(1200);
chk('el referido se guarda en el navegador',
    await pg.evaluate(() => JSON.parse(localStorage.getItem('nrm-ref')||'{}').a), REF);
await pg.locator('#seed-round').scrollIntoViewIfNeeded();
await pg.waitForTimeout(1500);
chk('sin conectar se ve quien lo refirio', (await pg.locator('.w-ref-por').textContent()).trim(), 'Referred by 0x2222…2222');
chk('y aun no hay enlace propio', await pg.locator('.w-ref-mio').isHidden(), true);

await pg.locator('#wUsd').fill('0.2'); await pg.locator('#wUsd').blur(); await pg.waitForTimeout(300);
await pg.locator('#wCta').click(); await pg.waitForTimeout(400);
await pg.locator('.nrm-w').first().click(); await pg.waitForTimeout(900);
chk('conectado: su enlace propio', await pg.locator('.w-ref-mio code').textContent(), 'https://nereum.xyz/?ref=' + YO + '#seed-round');
await pg.locator('.w-ref-fila button').click(); await pg.waitForTimeout(200);
chk('el boton copia', await pg.locator('.w-ref-fila button').textContent(), 'Copied');
chk('y el enlace queda en el portapapeles', await pg.evaluate(() => navigator.clipboard.readText()), 'https://nereum.xyz/?ref=' + YO + '#seed-round');

// compra con ETH
await pg.evaluate(() => { window.__tx.length = 0 });
await pg.locator('#wCta').click(); await pg.waitForTimeout(1200);
let tx = (await pg.evaluate(() => window.__tx))[0] || {};
chk('ETH: selector buyWithNative', (tx.data||'').slice(0,10), '0x31ad36ab');
chk('ETH: el referido va al final, detras del argumento', (tx.data||'').slice(74), COLA);
chk('ETH: y el argumento queda intacto', (tx.data||'').length, 10 + 64 + 48);

// compra con USDT: la aprobacion va limpia, la compra lleva el referido
await pg.locator('#wPay button').nth(2).click(); await pg.waitForTimeout(400);
await pg.locator('#wUsd').fill('500'); await pg.locator('#wUsd').blur(); await pg.waitForTimeout(300);
await pg.evaluate(() => { window.__tx.length = 0 });
await pg.locator('#wCta').click(); await pg.waitForTimeout(2500);
let txs = await pg.evaluate(() => window.__tx);
chk('USDT: aprobacion + compra', txs.length, 2);
if (txs.length === 2) {
  chk('USDT: la aprobacion no lleva nada detras', (txs[0].data||'').length, 10 + 128);
  chk('USDT: la compra lleva el referido al final', (txs[1].data||'').slice(138), COLA);
}

// referirse a uno mismo no pega nada
await pg.evaluate(y => localStorage.setItem('nrm-ref', JSON.stringify({a:y, t:Date.now()})), YO);
await pg.locator('#wPay button').nth(0).click(); await pg.waitForTimeout(300);
await pg.locator('#wUsd').fill('0.2'); await pg.locator('#wUsd').blur(); await pg.waitForTimeout(300);
await pg.evaluate(() => { window.__tx.length = 0 });
await pg.locator('#wCta').click(); await pg.waitForTimeout(1200);
tx = (await pg.evaluate(() => window.__tx))[0] || {};
chk('a si mismo: la compra va sin referido', (tx.data||'').length, 10 + 64);
chk('y no dice «Referred by»', await pg.locator('.w-ref-por').isHidden(), true);

// un referido caducado (mas de 60 dias) tampoco
await pg.evaluate(r => localStorage.setItem('nrm-ref', JSON.stringify({a:r, t:Date.now()-61*864e5})), REF);
await pg.evaluate(() => { window.__tx.length = 0 });
await pg.locator('#wCta').click(); await pg.waitForTimeout(1200);
tx = (await pg.evaluate(() => window.__tx))[0] || {};
chk('caducado: la compra va sin referido', (tx.data||'').length, 10 + 64);

chk('sin errores de pagina', errores.join(' | '), '');

console.log('\n──────── resultado ────────');
let mal = 0;
for (const r of R) { if (!r.ok) mal++; console.log((r.ok?'  ok  ':'  MAL ') + r.n + (r.ok ? '' : `\n         esperado: ${r.esp}\n         obtenido: ${r.real}`)); }
console.log(`\n${R.length-mal}/${R.length} correctas`);
await nav.close(); srv.close(); process.exit(mal ? 1 : 0);
