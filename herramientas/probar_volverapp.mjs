// El enlace de vuelta a la cartera, y la salida cuando la cartera abre por su
// pantalla de inicio en vez de por la peticion pendiente.
import { chromium, devices } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ='/home/user/nerium';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
'.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';
const p=path.join(RAIZ,f);if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p));});
await new Promise(r=>srv.listen(8947,r));
const w=v=>BigInt(v).toString(16).padStart(64,'0');
const R={'0xaf68130e':'0x'+w(250595548942n)+w(1),'0x8b3948bd':'0x'+w(20000000n),
'0x3fbb3d1d':'0x'+w(20000000n),'0x4194fdd1':'0x'+w(1000000000000n),'0x63b20117':'0x'+w(0),
'0x4b749535':'0x'+w(0),'0xb8f7a665':'0x'+w(1),'0xb4bd9e27':'0x'+w(0),'0x5c975abb':'0x'+w(0),
'0x78e97925':'0x'+w(1757000000),'0x4b8bcb58':'0x'+w(0),'0xb81b8630':'0x'+w(0),
'0x0da8b1c9':'0x'+w(0),'0x3acd1572':'0x'+w(1000000000000n),'0x402914f5':'0x'+w(0),
'0x70a08231':'0x'+w(0),'0xdd62ed3e':'0x'+w(0)};
const REGISTRO={listings:{d:{name:'MetaMask',image_id:'t4',
  mobile:{native:'metamask://',universal:'https://metamask.app.link'}}}};

// La sesion declara SOLO el enlace universal, que es el caso que llevaba a la
// pantalla de inicio de MetaMask en vez de a la peticion pendiente.
const SDK=`window.NereumWC={EthereumProvider:{init:async function(o){
  const oy={}; window.__pedidos=[]; window.__txs=[];
  let soltar; const aprobado=new Promise(r=>{soltar=r;}); window.__aprobar=()=>soltar();
  const prov={ _cid:'0x1',
    session:{ peer:{ metadata:{ name:'MetaMask', icons:[],
      redirect:{ universal:'https://metamask.app.link' } } } },
    on:(e,f)=>{(oy[e]=oy[e]||[]).push(f)}, removeListener(){}, disconnect(){ window.__desconecto=true; },
    connect: async function(){ (oy['display_uri']||[]).forEach(f=>f('wc:7f@2?relay-protocol=irn&symKey=abc'));
      await aprobado; },
    request: async function({method,params}){ window.__pedidos.push(method);
      if(method==='eth_accounts')return['0x2222222222222222222222222222222222222222'];
      if(method==='eth_requestAccounts')return['0x2222222222222222222222222222222222222222'];
      if(method==='eth_chainId')return prov._cid;
      if(method==='wallet_switchEthereumChain'){ prov._cid=params[0].chainId; return null; }
      if(method==='eth_sendTransaction'){ window.__txs.push(params[0]);
        await new Promise(()=>{}); }        // la cartera nunca contesta
      if(method==='eth_call')return (window.__R||{})[params[0].data.slice(0,10)]??'0x'+'0'.repeat(64);
      if(method==='eth_getBalance')return '0x0';
      throw new Error(method); } };
  return prov;
}}};`;
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const Rs=[]; const chk=(n,a,b)=>Rs.push({n,ok:String(a)===String(b),a,b});
const ctx=await nav.newContext({...devices['iPhone 13']});
await ctx.addInitScript(({R})=>{ const of=window.fetch; window.__R=R;
  window.fetch=async(u,o)=>{ if(!o||!o.body) return of(u,o);
    const j=JSON.parse(o.body);
    return new Response(JSON.stringify({jsonrpc:'2.0',id:j.id,
      result:j.method==='eth_call'?(R[j.params[0].data.slice(0,10)]??'0x'+'0'.repeat(64)):'0x0'}),
      {status:200,headers:{'content-type':'application/json'}});};},{R});
const pg=await ctx.newPage();
await pg.route('**explorer-api.walletconnect.com/v3/wallets**', r=>
  r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(REGISTRO)}));
await pg.route('**explorer-api.walletconnect.com/v3/logo/**', r=>r.abort());
await pg.route('**api.web3modal.org/**', r=>r.abort());
await pg.route('**/assets/walletconnect.js', r=>r.fulfill({status:200,contentType:'text/javascript',body:SDK}));
await pg.goto('http://127.0.0.1:8947/index.html',{waitUntil:'load'});
await pg.locator('#presale').scrollIntoViewIfNeeded(); await pg.waitForTimeout(1500);
await pg.evaluate(()=>document.getElementById('wCta').click()); await pg.waitForTimeout(900);
await pg.locator('.nrm-w',{hasText:'MetaMask'}).first().click(); await pg.waitForTimeout(700);
await pg.evaluate(()=>window.__aprobar()); await pg.waitForTimeout(1800);
await pg.locator('#wUsd').fill('0,05'); await pg.waitForTimeout(600);
await pg.evaluate(()=>document.getElementById('wCta').click()); await pg.waitForTimeout(1800);

chk('la firma sale', await pg.evaluate(()=>window.__txs.length), 1);
const href = await pg.evaluate(()=>{const a=document.querySelector('.nrm-fondo a');return a?a.getAttribute('href'):'';});
chk('el enlace usa el esquema propio, no el universal', href, 'metamask://');
chk('  y no lleva a la pantalla de inicio', /app\.link/.test(href), false);

chk('al principio no hay salida de emergencia',
    await pg.locator('.nrm-fondo .nrm-flojo').count(), 0);
await pg.waitForTimeout(25500);
chk('pasado un rato, ofrece rehacer la conexión',
    await pg.locator('.nrm-fondo .nrm-flojo').count(), 1);
await pg.evaluate(()=>{ const b=[...document.querySelectorAll('.nrm-fondo button')]
  .filter(x=>/Reconnect/.test(x.textContent))[0]; if(b) b.click(); });
await pg.waitForTimeout(1200);
chk('  y al pulsarla desconecta', await pg.evaluate(()=>!!window.__desconecto), true);
chk('  olvida la cartera guardada',
    await pg.evaluate(()=>localStorage.getItem('nrm:cartera')), 'null');
chk('  y vuelve a abrir la lista',
    await pg.evaluate(()=>!!document.querySelector('.nrm-rej')), true);

console.log('');
Rs.forEach(r=>console.log((r.ok?'  ok  ':'  MAL ')+r.n+(r.ok?'':`   (era ${r.a}, se esperaba ${r.b})`)));
const mal=Rs.filter(r=>!r.ok).length;
console.log(mal?`${Rs.length-mal} bien, ${mal} MAL`:`${Rs.length}/${Rs.length} correctas`);
await ctx.close(); await nav.close(); srv.close();
process.exit(mal?1:0);
