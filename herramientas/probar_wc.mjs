import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ='/home/user/nerium';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
'.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';
const p=path.join(RAIZ,f);if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p));});
await new Promise(r=>srv.listen(8934,r));
const w=v=>BigInt(v).toString(16).padStart(64,'0');
const R={'0xaf68130e':'0x'+w(250595548942n)+w(1),'0x8b3948bd':'0x'+w(20000000n),'0x3fbb3d1d':'0x'+w(20000000n),
'0x4194fdd1':'0x'+w(1000000000000n),'0x63b20117':'0x'+w(0),'0x4b749535':'0x'+w(0),'0xb8f7a665':'0x'+w(1),
'0xb4bd9e27':'0x'+w(0),'0x5c975abb':'0x'+w(0),'0x78e97925':'0x'+w(1757000000),'0x4b8bcb58':'0x'+w(0),
'0x3acd1572':'0x'+w(1000000000000n),'0xdd62ed3e':'0x'+w(0)};
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const R2=[]; const chk=(n,a,b)=>R2.push({n,ok:String(a)===String(b),a,b});

// ── caso 1: sin carteras de navegador, WalletConnect debe ser la unica opcion ──
{
 const ctx=await nav.newContext({viewport:{width:1400,height:1000}});
 await ctx.addInitScript(({R})=>{ const of=window.fetch;
  window.fetch=async(u,o)=>{if(!o||!o.body)return of(u,o);const j=JSON.parse(o.body);
   let res=null; if(j.method==='eth_call')res=R[j.params[0].data.slice(0,10)]??'0x'+'0'.repeat(64);
   return new Response(JSON.stringify({jsonrpc:'2.0',id:j.id,result:res}),{status:200,headers:{'content-type':'application/json'}});};
  delete window.ethereum;      // ni extension ni navegador de cartera
 },{R});
 const pg=await ctx.newPage(); const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
 // el CDN esta bloqueado en este entorno igual que en el sandbox: se corta la peticion
 await pg.route('**cdn.jsdelivr.net/**', r=>r.abort());
 await pg.goto('http://127.0.0.1:8934/index.html',{waitUntil:'load'});
 await pg.locator('#presale').scrollIntoViewIfNeeded(); await pg.waitForTimeout(1800);
 await pg.locator('#wCta').click(); await pg.waitForTimeout(300);
 const ops=await pg.locator('.nrm-w').allTextContents();
 chk('WalletConnect aparece en el selector', ops.join('|'), 'WalletConnect');
 await pg.locator('.nrm-w').first().click();
 await pg.waitForTimeout(2500);
 chk('el CDN caido da mensaje legible', await pg.locator('#wNote').textContent(),
     'WalletConnect could not load. Check your connection.');
 chk('el boton vuelve a estar usable', await pg.locator('#wCta').isDisabled(), false);
 chk('sin errores de pagina', errs.length, 0);
 await ctx.close();
}
// ── caso 2: con cartera de navegador, salen las dos ──────────────────────────
{
 const ctx=await nav.newContext({viewport:{width:1400,height:1000}});
 await ctx.addInitScript(({R})=>{ const of=window.fetch;
  window.fetch=async(u,o)=>{if(!o||!o.body)return of(u,o);const j=JSON.parse(o.body);
   let res=null; if(j.method==='eth_call')res=R[j.params[0].data.slice(0,10)]??'0x'+'0'.repeat(64);
   return new Response(JSON.stringify({jsonrpc:'2.0',id:j.id,result:res}),{status:200,headers:{'content-type':'application/json'}});};
  const prov={_cid:'0x1',on(){},removeListener(){},async request({method}){
   if(method==='eth_requestAccounts')return['0x1111111111111111111111111111111111111111'];
   if(method==='eth_chainId')return '0x1'; throw new Error(method);}};
  const info={uuid:'w1',name:'Rabby',rdns:'io.rabby',icon:''};
  window.addEventListener('eip6963:requestProvider',()=>window.dispatchEvent(
    new CustomEvent('eip6963:announceProvider',{detail:Object.freeze({info,provider:prov})})));
 },{R});
 const pg=await ctx.newPage();
 await pg.goto('http://127.0.0.1:8934/index.html',{waitUntil:'load'});
 await pg.locator('#presale').scrollIntoViewIfNeeded(); await pg.waitForTimeout(1800);
 await pg.locator('#wCta').click(); await pg.waitForTimeout(300);
 chk('las dos vias juntas', (await pg.locator('.nrm-w').allTextContents()).join('|'), 'Rabby|WalletConnect');
 await pg.locator('.nrm-caja').screenshot({path:'/tmp/wc.png'});
 await ctx.close();
}
await nav.close(); srv.close();
let mal=0; for(const r of R2){ if(!r.ok)mal++;
 console.log((r.ok?'  ok  ':'  MAL ')+r.n+(r.ok?'':`\n         esperado: ${r.b}\n         obtenido: ${r.a}`)); }
console.log(mal?`\n${mal} fallo(s)`:'\ntodo correcto');
process.exit(mal?1:0);
