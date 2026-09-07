// La extension con una peticion de conexion ya abierta.
//
// MetaMask guarda esa peticion hasta que alguien la contesta, y la conserva
// aunque se recargue la pagina: a la segunda responde -32002 «already pending»
// y no hay forma de salir pulsando el boton. Por fuera se ve como que la
// cartera no conecta, ni en BNB ni en Ethereum.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ='/home/user/nerium';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
'.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';
const p=path.join(RAIZ,f);if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p));});
await new Promise(r=>srv.listen(8943,r));

const w=v=>BigInt(v).toString(16).padStart(64,'0');
const R={'0xaf68130e':'0x'+w(250595548942n)+w(1),'0x8b3948bd':'0x'+w(20000000n),
'0x3fbb3d1d':'0x'+w(20000000n),'0x4194fdd1':'0x'+w(1000000000000n),'0x63b20117':'0x'+w(0),
'0x4b749535':'0x'+w(0),'0xb8f7a665':'0x'+w(1),'0xb4bd9e27':'0x'+w(0),'0x5c975abb':'0x'+w(0),
'0x78e97925':'0x'+w(1757000000),'0x4b8bcb58':'0x'+w(0),'0xb81b8630':'0x'+w(0),
'0x0da8b1c9':'0x'+w(0),'0x3acd1572':'0x'+w(1000000000000n),'0x402914f5':'0x'+w(0),
'0x70a08231':'0x'+w(0),'0xdd62ed3e':'0x'+w(0)};
const REGISTRO={listings:Object.fromEntries('abcdefghijklmnopqrstuvwx'.split('').map((k,i)=>
  [k,{name:'Cartera '+i, image_id:'t'+i, mobile:{native:'w'+i+'://'}}]))};

const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const Rs=[]; const chk=(n,a,b)=>Rs.push({n,ok:String(a)===String(b),a,b});

// modo: 'pendiente' = la extension ya tiene una ventana abierta y responde -32002
//       'concedida' = el permiso ya esta dado; eth_accounts devuelve la cuenta
async function abrir(modo, registroLento=0){
  const ctx=await nav.newContext({viewport:{width:1280,height:1000}});
  await ctx.addInitScript(({R,modo})=>{ const of=window.fetch;
    window.fetch=async(u,o)=>{ if(!o||!o.body) return of(u,o);
      const j=JSON.parse(o.body);
      return new Response(JSON.stringify({jsonrpc:'2.0',id:j.id,
        result:j.method==='eth_call'?(R[j.params[0].data.slice(0,10)]??'0x'+'0'.repeat(64)):'0x0'}),
        {status:200,headers:{'content-type':'application/json'}});};
    window.__pedidos=[];
    const CUENTA='0x2222222222222222222222222222222222222222';
    const prov={_cid:'0x1',on(){},removeListener(){},async request({method,params}){
      window.__pedidos.push(method);
      if(method==='eth_accounts') return modo==='concedida'?[CUENTA]:[];
      if(method==='eth_requestAccounts'){
        const e=new Error("Request of type 'wallet_requestPermissions' already pending for origin https://nereum.xyz. Please wait.");
        e.code=-32002; throw e; }
      if(method==='eth_chainId')return prov._cid;
      if(method==='eth_call')return R[params[0].data.slice(0,10)]??'0x'+'0'.repeat(64);
      if(method==='eth_getBalance')return '0x0';
      throw new Error(method);}};
    const info={uuid:'w1',name:'MetaMask',rdns:'io.metamask',icon:''};
    window.addEventListener('eip6963:requestProvider',()=>window.dispatchEvent(
      new CustomEvent('eip6963:announceProvider',{detail:Object.freeze({info,provider:prov})})));
  },{R,modo});
  const pg=await ctx.newPage();
  await pg.route('**explorer-api.walletconnect.com/v3/wallets**', async r=>{
    if(registroLento) await new Promise(x=>setTimeout(x,registroLento));
    r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(REGISTRO)});});
  await pg.route('**explorer-api.walletconnect.com/v3/logo/**', r=>r.abort());
  await pg.route('**api.web3modal.org/**', r=>r.abort());
  await pg.route('**/assets/walletconnect.js', r=>r.fulfill({status:200,
    contentType:'text/javascript',body:'window.NereumWC={EthereumProvider:{init:async()=>({on(){},removeListener(){},connect:()=>new Promise(()=>{}),request:async()=>{throw new Error("x")}})}};'}));
  await pg.goto('http://127.0.0.1:8943/index.html',{waitUntil:'load'});
  await pg.locator('#presale').scrollIntoViewIfNeeded(); await pg.waitForTimeout(1400);
  return {ctx,pg};
}

// ── 1 · el permiso YA estaba dado: no se toca la extension ──────────────────
{
  const {ctx,pg}=await abrir('concedida');
  await pg.evaluate(()=>document.getElementById('wCta').click()); await pg.waitForTimeout(800);
  await pg.locator('.nrm-w',{hasText:'MetaMask'}).first().click(); await pg.waitForTimeout(1500);
  const ped=await pg.evaluate(()=>window.__pedidos);
  chk('con permiso dado, conecta', await pg.evaluate(()=>!!document.querySelector('.nrm-pos')), true);
  chk('  y NO pide permisos otra vez', ped.includes('eth_requestAccounts'), false);
  await ctx.close();
}

// ── 2 · la extension tiene una peticion colgada ─────────────────────────────
{
  const {ctx,pg}=await abrir('pendiente');
  await pg.evaluate(()=>document.getElementById('wCta').click()); await pg.waitForTimeout(800);
  await pg.locator('.nrm-w',{hasText:'MetaMask'}).first().click(); await pg.waitForTimeout(1500);
  const nota=await pg.evaluate(()=>{const e=document.querySelector('#presale .w-note');
    return e?e.textContent.trim():'';});
  chk('el aviso dice qué hacer', /already has a connection request open/i.test(nota), true);
  chk('  y no suelta el texto crudo de la extensión', /already pending for origin/i.test(nota), false);

  // insistir no debe multiplicar las peticiones mientras una esta en vuelo
  await pg.evaluate(async()=>{ window.__pedidos.length=0;
    const c=document.getElementById('wCta');
    c.click(); c.click(); c.click(); });
  await pg.waitForTimeout(400);
  await pg.evaluate(()=>{ const l=document.querySelectorAll('.nrm-w');
    for(const x of l) if(/MetaMask/.test(x.textContent)){ x.click(); x.click(); x.click(); break; } });
  await pg.waitForTimeout(1500);
  const n2=await pg.evaluate(()=>window.__pedidos.filter(m=>m==='eth_requestAccounts').length);
  chk('tres toques seguidos no son tres peticiones', n2 <= 1, true);
  await ctx.close();
}

// ── 3 · mientras el registro viaja, la lista dice que faltan ────────────────
{
  const {ctx,pg}=await abrir('concedida', 3000);
  await pg.evaluate(()=>document.getElementById('wCta').click()); await pg.waitForTimeout(600);
  chk('al abrir solo está la extensión', await pg.locator('.nrm-w').count(), 1);
  chk('  y avisa de que faltan', await pg.locator('.nrm-rej .nrm-cargando').count(), 1);
  chk('  con el texto correcto',
      await pg.evaluate(()=>{const e=document.querySelector('.nrm-rej .nrm-cargando');
        return e?e.textContent.trim():'(no hay aviso)';}), 'Loading more wallets…');
  await pg.waitForTimeout(3500);
  chk('llegado el registro, la lista se completa', await pg.locator('.nrm-w').count() > 20, true);
  chk('  y el aviso desaparece', await pg.locator('.nrm-rej .nrm-cargando').count(), 0);
  await ctx.close();
}

console.log('');
Rs.forEach(r=>console.log((r.ok?'  ok  ':'  MAL ')+r.n+(r.ok?'':`   (era ${r.a}, se esperaba ${r.b})`)));
const mal=Rs.filter(r=>!r.ok).length;
console.log(mal?`${Rs.length-mal} bien, ${mal} MAL`:`${Rs.length}/${Rs.length} correctas`);
await nav.close(); srv.close();
process.exit(mal?1:0);
