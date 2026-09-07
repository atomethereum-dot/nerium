import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs';
const JS = fs.readFileSync('/tmp/claude-0/-home-user-test2/f0f81d8c-503b-5035-a856-a071059ad8b5/scratchpad/wcbuild/salida.js');
const srv=http.createServer((q,r)=>{
  if(q.url.startsWith('/wc.js')){ r.writeHead(200,{'content-type':'text/javascript'}); return r.end(JS); }
  r.writeHead(200,{'content-type':'text/html'}); r.end('<!doctype html><meta charset=utf-8><body>hola');
});
await new Promise(r=>srv.listen(8947,r));
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const pg=await (await nav.newContext()).newPage();
const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
pg.on('console',m=>{ if(m.type()==='error') errs.push('console: '+m.text()); });
await pg.goto('http://127.0.0.1:8947/');
// Se corta cualquier salida a la red: aquí no hay relay que valga.
await pg.route('**', r => r.request().url().startsWith('http://127.0.0.1:8947') ? r.continue() : r.abort());
const r1 = await pg.evaluate(async ()=>{
  await new Promise((ok,mal)=>{ const s=document.createElement('script');
    s.src='/wc.js'; s.onload=ok; s.onerror=()=>mal(new Error('no cargó')); document.head.appendChild(s); });
  return {
    global: typeof window.NereumWC,
    provider: typeof (window.NereumWC && window.NereumWC.EthereumProvider),
    init: typeof (window.NereumWC && window.NereumWC.EthereumProvider && window.NereumWC.EthereumProvider.init),
    viejo: typeof window.EthereumProvider
  };
});
console.log('tras cargar:', JSON.stringify(r1));

// init de verdad: sin relay no llegará a conectar, pero tiene que devolver una
// promesa y no reventar al construir el proveedor.
const r2 = await pg.evaluate(async ()=>{
  try{
    const p = window.NereumWC.EthereumProvider.init({
      projectId:'87eced186475c03170cf7792da6a9ecd', chains:[1], optionalChains:[56],
      showQrModal:false, rpcMap:{1:'http://127.0.0.1:8947/rpc',56:'http://127.0.0.1:8947/rpc'},
      metadata:{name:'Nereum',description:'x',url:location.origin,icons:[]}
    });
    if(!(p instanceof Promise)) return {ok:false, por:'init no devolvió una promesa'};
    const prov = await Promise.race([p, new Promise(r=>setTimeout(()=>r('tiempo'),12000))]);
    if(prov==='tiempo') return {ok:true, nota:'init sigue esperando al relay (esperado sin red)'};
    return {ok:true, nota:'init resolvió', on:typeof prov.on, connect:typeof prov.connect, request:typeof prov.request};
  }catch(e){ return {ok:false, por:String(e && e.message || e)}; }
});
console.log('init:', JSON.stringify(r2));
console.log('errores de página:', errs.filter(e=>!/net::ERR|Failed to fetch|Failed to load resource/i.test(e)).slice(0,4));
await nav.close(); srv.close();
