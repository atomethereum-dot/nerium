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
await new Promise(r=>srv.listen(8931, r));

const PRECIO_NATIVO = 250595548942n;   // $2.505,95548942 / ETH
const PRECIO_USD    = 20000000n;       // $0,20
const MIN           = 20000000n;       // $0,20
const MAX           = 1000000000000n;  // $10.000

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
const ctx = await nav.newContext({ viewport:{width:1400,height:1000} });

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
pg.on('console', m => { if (m.type()==='error') errores.push('console: '+m.text()); });

// El registro de carteras es de red: se sirve aquí para que la prueba no dependa de ella.
await pg.route('**explorer-api.walletconnect.com/**', r => r.fulfill({
  status:200, contentType:'application/json', body:JSON.stringify({listings:{}}) }));
await pg.goto('http://127.0.0.1:8931/index.html', { waitUntil:'load' });
await pg.waitForTimeout(1200);

const R = [];
const chk = (n, real, esp) => R.push({ n, ok: String(real)===String(esp), real, esp });

// ── 1 · lectura de cadena y cálculo ──────────────────────────────────────────
await pg.locator('#presale').scrollIntoViewIfNeeded();
await pg.waitForTimeout(1500);

chk('precio por NRM', await pg.locator('#wRate').textContent(), '1 NRM = $0.20');

// El campo arranca vacío y va en la moneda de pago.
chk('arranca sin importe', await pg.locator('#wUsd').inputValue(), '');
chk('y la unidad lo dice',  await pg.locator('#presale .w-field em').first().textContent(), 'ETH');
chk('nota de límites',    await pg.locator('#wNote').textContent(),
    'Min $0.20 · max $10,000 per wallet · live oracle price');

// Se escribe el importe en ETH: eso es exactamente lo que se firmará.
const weiEsp = 200000000000000000n;                 // 0,2 ETH
const usdReal = weiEsp * PRECIO_NATIVO / 10n**18n;  // lo que contará el contrato
await pg.locator('#wUsd').fill('0.2');
await pg.locator('#wUsd').blur();
await pg.waitForTimeout(350);
chk('los dólares van debajo', await pg.locator('#wEq').textContent(), '≈ $501 on Ethereum');
chk('NRM por ese importe', await pg.locator('#wNrm').inputValue(), '2,506');
chk('pie de la barra',    (await pg.locator('#presale .raise-foot').textContent()).trim(),
    'Minimum $0.20Maximum $10,000 per wallet');

// ── 2 · la barra de la ronda privada NO se toca ──────────────────────────────
await pg.waitForTimeout(2200);
chk('la privada sigue siendo la base', await pg.locator('#saleRaised').textContent(), '$13,616,000');
chk('porcentaje intacto', await pg.locator('#saleTip em').textContent(), '85.1%');

// ── 3 · conectar cartera ─────────────────────────────────────────────────────
chk('CTA sin conectar', await pg.locator('#wCta').textContent(), 'Connect wallet');
await pg.locator('#wCta').click();
await pg.waitForTimeout(400);
chk('el modal abre', await pg.locator('.nrm-cab h3').textContent(), 'Connect a wallet');
chk('la instalada va primera', await pg.locator('.nrm-w b').first().textContent(), 'Cartera de prueba');
await pg.locator('.nrm-w').first().click();
await pg.waitForTimeout(900);
chk('el modal se cierra al conectar', await pg.locator('.nrm-fondo').count(), 0);
chk('CTA conectado', await pg.locator('#wCta').textContent(), 'Buy 2,506 NRM');

// ── 4 · compra con ETH ───────────────────────────────────────────────────────
await pg.locator('#wCta').click();
await pg.waitForTimeout(1200);
const tx1 = (await pg.evaluate(() => window.__tx))[0] || {};
chk('destino de la compra', (tx1.to||'').toLowerCase(), '0xacbf1add75139d0e926d57ec715fdab8bee04a89');
chk('firma exactamente lo escrito', BigInt(tx1.value||0).toString(), weiEsp.toString());
chk('selector buyWithNative', (tx1.data||'').slice(0,10), '0x31ad36ab');
const minEsp = (usdReal * 10n**18n / PRECIO_USD) * 9900n / 10000n;
chk('minTokensOut (1% holgura)', BigInt('0x'+(tx1.data||'').slice(10)).toString(), minEsp.toString());

// ── 5 · cambio de red al elegir BNB ──────────────────────────────────────────
await pg.evaluate(()=>{ window.__tx.length=0; });
await pg.locator('#wPay button').nth(1).click();
await pg.waitForTimeout(400);
chk('al cambiar de moneda se conserva el valor', await pg.locator('#wEq').textContent(), '≈ $501 on BNB Chain');
chk('CTA pide cambiar de red', await pg.locator('#wCta').textContent(), 'Switch to BNB Chain');
await pg.locator('#wCta').click();
await pg.waitForTimeout(600);
chk('cadena tras el cambio', await pg.evaluate(()=>window.__prov._cid), '0x38');

// ── 6 · compra con USDT (aprobación + compra) ────────────────────────────────
await pg.evaluate(()=>{ window.__prov._cid='0x1'; window.__prov._emitir('chainChanged','0x1'); });
await pg.locator('#wPay button').nth(2).click();   // USDT ERC-20
await pg.waitForTimeout(400);
chk('la unidad cambia a USDT', await pg.locator('#presale .w-field em').first().textContent(), 'USDT');
await pg.locator('#wUsd').fill('500');
await pg.locator('#wUsd').blur();
await pg.waitForTimeout(300);
chk('en USDT los dólares son los mismos', await pg.locator('#wEq').textContent(), '≈ $500 on Ethereum');
await pg.evaluate(()=>{ window.__tx.length=0; });
await pg.locator('#wCta').click();
await pg.waitForTimeout(2500);
const txs = await pg.evaluate(() => window.__tx);
chk('dos transacciones (approve + buy)', txs.length, 2);
if (txs.length === 2) {
  chk('approve al USDT de Ethereum', (txs[0].to||'').toLowerCase(),
      '0xdac17f958d2ee523a2206206994597c13d831ec7');
  chk('selector approve', (txs[0].data||'').slice(0,10), '0x095ea7b3');
  chk('gastador aprobado', '0x'+(txs[0].data||'').slice(34,74),
      '0xacbf1add75139d0e926d57ec715fdab8bee04a89');
  chk('selector buyWithUsdt', (txs[1].data||'').slice(0,10), '0x7789e96e');
  chk('cantidad USDT (6 dec)', BigInt('0x'+(txs[1].data||'').slice(10,74)).toString(), '500000000');
  chk('compra sin ether adjunto', txs[1].value === undefined || BigInt(txs[1].value)===0n, true);
}

// ── 7 · límites ──────────────────────────────────────────────────────────────
await pg.locator('#wPay button').nth(0).click();   // vuelta a ETH
await pg.waitForTimeout(300);
await pg.locator('#wUsd').fill('0.00001');        // ~$0,025
await pg.locator('#wUsd').blur();
await pg.waitForTimeout(300);
const minU = (20000000n*10n**18n + PRECIO_NATIVO - 1n) / PRECIO_NATIVO;
const minS = (minU/10n**18n).toString()+'.'+(minU%10n**18n).toString().padStart(18,'0').slice(0,6).replace(/0+$/,'');
chk('por debajo del mínimo, con su equivalente', await pg.locator('#wNote').textContent(),
    'Minimum purchase is $0.20 — about ' + minS + ' ETH');
await pg.locator('#wUsd').fill('10');             // ~$25.059
await pg.locator('#wUsd').blur();
await pg.waitForTimeout(300);
const maxU = (1000000000000n*10n**18n + PRECIO_NATIVO - 1n) / PRECIO_NATIVO;
const maxS = (maxU/10n**18n).toString()+'.'+(maxU%10n**18n).toString().padStart(18,'0').slice(0,6).replace(/0+$/,'');
chk('por encima del máximo, con su equivalente', await pg.locator('#wNote').textContent(),
    'Maximum is $10,000 per wallet — about ' + maxS + ' ETH');

console.log('\n──────── resultado ────────');
let mal = 0;
for (const r of R) {
  if (!r.ok) mal++;
  console.log((r.ok?'  ok  ':'  MAL ') + r.n + (r.ok ? '' : `\n         esperado: ${r.esp}\n         obtenido: ${r.real}`));
}
console.log(`\n${R.length-mal}/${R.length} correctas`);
console.log('errores de página:', errores.length, errores.slice(0,4));

await nav.close(); srv.close();
process.exit(mal || errores.length ? 1 : 0);
