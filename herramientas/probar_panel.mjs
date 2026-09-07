import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ='/home/user/nerium';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
'.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';
const p=path.join(RAIZ,f);if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p));});
await new Promise(r=>srv.listen(8937,r));
const w=v=>BigInt(v).toString(16).padStart(64,'0');
const E18=10n**18n;

// Base comun de la ronda, y luego lo propio de cada red para el comprador.
const ronda={'0xaf68130e':'0x'+w(250595548942n),'0x8b3948bd':'0x'+w(20000000n),
'0x3fbb3d1d':'0x'+w(20000000n),'0x4194fdd1':'0x'+w(1000000000000n),'0x63b20117':'0x'+w(0),
'0x4b749535':'0x'+w(0),'0xb8f7a665':'0x'+w(1),'0xb4bd9e27':'0x'+w(0),'0x5c975abb':'0x'+w(0),
'0x78e97925':'0x'+w(1757000000),'0x4b8bcb58':'0x'+w(0),'0xdd62ed3e':'0x'+w(0)};
ronda['0xaf68130e']='0x'+w(250595548942n)+w(1);

function red(alloc,gasto,recl,extra={}){return {...ronda,
  '0xb81b8630':'0x'+w(alloc), '0x0da8b1c9':'0x'+w(gasto),
  '0x3acd1572':'0x'+w(1000000000000n-gasto), '0x402914f5':'0x'+w(recl), ...extra};}

const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const Rs=[]; const chk=(n,a,b)=>Rs.push({n,ok:String(a)===String(b),a,b});

async function abrir(eth, bsc, cerrarPanel=false){
  const ctx=await nav.newContext({viewport:{width:1400,height:1100}});
  await ctx.addInitScript(({eth,bsc})=>{ const of=window.fetch;
    window.fetch=async(u,o)=>{ const url=String(u);
      if(url.indexOf('explorer-api')>=0) return new Response('{"listings":{}}',{status:200,headers:{'content-type':'application/json'}});
      if(!o||!o.body) return of(u,o);
      const j=JSON.parse(o.body); const tabla=/bsc|binance|defibit/.test(url)?bsc:eth;
      let res=null;
      if(j.method==='eth_call') res=tabla[j.params[0].data.slice(0,10)]??'0x'+'0'.repeat(64);
      return new Response(JSON.stringify({jsonrpc:'2.0',id:j.id,result:res}),{status:200,headers:{'content-type':'application/json'}});};
    const prov={_cid:'0x1',_o:{},on(e,f){(prov._o[e]=prov._o[e]||[]).push(f)},removeListener(){},
      _emit(e,a){(prov._o[e]||[]).forEach(f=>f(a))},
      async request({method,params}){
        if(method==='eth_requestAccounts')return['0xf222259D0dE7428dC4e2e78E74cC72A85a7B6aa6'];
        if(method==='eth_chainId')return prov._cid;
        if(method==='eth_call'){ const tabla=eth; return tabla[params[0].data.slice(0,10)]??'0x'+'0'.repeat(64); }
        throw new Error(method);}};
    const info={uuid:'w1',name:'MetaMask',rdns:'io.metamask',icon:''};
    window.addEventListener('eip6963:requestProvider',()=>window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider',{detail:Object.freeze({info,provider:prov})})));
  },{eth,bsc});
  const pg=await ctx.newPage();
  await pg.goto('http://127.0.0.1:8937/index.html',{waitUntil:'load'});
  await pg.locator('#presale').scrollIntoViewIfNeeded(); await pg.waitForTimeout(1500);
  await pg.locator('#wCta').click(); await pg.waitForTimeout(500);
  await pg.locator('.nrm-w').first().click(); await pg.waitForTimeout(1600);
  return {ctx,pg};
}

// ── 1 · sin compras ──────────────────────────────────────────────────────────
{
 const {ctx,pg}=await abrir(red(0n,0n,0n), red(0n,0n,0n));
 chk('el panel aparece al conectar', await pg.locator('.nrm-pos').isVisible(), true);
 chk('muestra la dirección', await pg.locator('.pos-dir').textContent(), '0xf222…6aa6');
 chk('dice que aún no compró', (await pg.locator('.nrm-pos .pos-pie').first().textContent()),
     'No purchase from this wallet yet.');
 chk('y el tope entero disponible', await pg.locator('.nrm-pos .pos-pie').last().textContent(),
     '$10,000 of your $10,000 left on Ethereum.');
 await ctx.close();
}
// ── 2 · compras en las dos redes ─────────────────────────────────────────────
{
 const {ctx,pg}=await abrir(red(10000n*E18, 200000000000n, 0n), red(2500n*E18, 50000000000n, 0n));
 chk('suma las dos redes', await pg.locator('.pos-gran b').textContent(), '12,500NRM');
 chk('y lo invertido', await pg.locator('.pos-gran span').textContent(), '$2,500 invested');
 const fs_=await pg.locator('.nrm-pos li').allTextContents();
 chk('desglosa Ethereum', fs_[0], 'Ethereum10,000 NRM · $2,000');
 chk('desglosa BNB Chain', fs_[1], 'BNB Chain2,500 NRM · $500');
 chk('el tope es por red', await pg.locator('.nrm-pos .pos-pie').last().textContent(),
     '$8,000 of your $10,000 left on Ethereum.');
 await pg.locator('#wPay button').nth(1).click(); await pg.waitForTimeout(500);
 chk('al cambiar de red cambia el tope', await pg.locator('.nrm-pos .pos-pie').last().textContent(),
     '$9,500 of your $10,000 left on BNB Chain.');
 await pg.locator('#wPay button').nth(0).click(); await pg.waitForTimeout(400);
 await pg.locator('#presale .widget').screenshot({path:'/tmp/p_pos.png'});
 await ctx.close();
}
// ── 3 · solo una red: sin desglose que repita ────────────────────────────────
{
 const {ctx,pg}=await abrir(red(2500n*E18, 50000000000n, 0n), red(0n,0n,0n));
 chk('una sola red no desglosa', await pg.locator('.nrm-pos li').count(), 0);
 chk('pero sí el total', await pg.locator('.pos-gran b').textContent(), '2,500NRM');
 await ctx.close();
}
// ── 4 · reparto abierto ──────────────────────────────────────────────────────
{
 const cerrada={'0xb8f7a665':'0x'+w(0),'0xb4bd9e27':'0x'+w(1),'0x4b8bcb58':'0x'+w(1)};
 const {ctx,pg}=await abrir(red(10000n*E18,200000000000n,10000n*E18,cerrada), red(0n,0n,0n,cerrada));
 chk('sale lo reclamable', (await pg.locator('.pos-rec').textContent()), 'Ready to claim10,000 NRM');
 chk('y el botón invita a reclamar', await pg.locator('#wCta').textContent(), 'Claim your NRM');
 await pg.locator('#presale .widget').screenshot({path:'/tmp/p_claim.png'});
 await ctx.close();
}
// ── 5 · desconectar ──────────────────────────────────────────────────────────
{
 const {ctx,pg}=await abrir(red(2500n*E18,50000000000n,0n), red(0n,0n,0n));
 await pg.locator('.pos-salir').click(); await pg.waitForTimeout(500);
 chk('el panel se va al desconectar', await pg.locator('.nrm-pos').isVisible(), false);
 chk('y el botón vuelve a pedir cartera', await pg.locator('#wCta').textContent(), 'Connect wallet');
 await ctx.close();
}
await nav.close(); srv.close();
let mal=0; for(const r of Rs){ if(!r.ok)mal++;
 console.log((r.ok?'  ok  ':'  MAL ')+r.n+(r.ok?'':`\n         esperado: ${r.b}\n         obtenido: ${r.a}`)); }
console.log(mal?`\n${mal} fallo(s)`:`\n${Rs.length}/${Rs.length} correctas`);
process.exit(mal?1:0);
