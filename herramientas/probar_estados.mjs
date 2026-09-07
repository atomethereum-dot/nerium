import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ='/home/user/nerium';
const TIPOS={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
 '.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';
 const p=path.join(RAIZ,f); if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
 r.writeHead(200,{'content-type':TIPOS[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p));});
await new Promise(r=>srv.listen(8932,r));
const w=v=>BigInt(v).toString(16).padStart(64,'0');
const base={'0xaf68130e':'0x'+w(250595548942n)+w(1),'0x8b3948bd':'0x'+w(20000000n),
 '0x3fbb3d1d':'0x'+w(20000000n),'0x4194fdd1':'0x'+w(1000000000000n),'0x63b20117':'0x'+w(0),
 '0x4b749535':'0x'+w(0),'0xb8f7a665':'0x'+w(1),'0xb4bd9e27':'0x'+w(0),'0x5c975abb':'0x'+w(0),
 '0x78e97925':'0x'+w(0),'0x4b8bcb58':'0x'+w(0),'0x3acd1572':'0x'+w(1000000000000n),'0xdd62ed3e':'0x'+w(0)};

const CASOS=[
 {n:'ronda sin abrir (estado de hoy)', r:{...base,'0xb8f7a665':'0x'+w(0)}, esp:'Round not open yet', off:true},
 {n:'ronda en pausa',                  r:{...base,'0xb8f7a665':'0x'+w(0),'0x5c975abb':'0x'+w(1)}, esp:'Round paused', off:true},
 {n:'ronda cerrada, sin reparto',      r:{...base,'0xb8f7a665':'0x'+w(0),'0xb4bd9e27':'0x'+w(1)}, esp:'Round closed', off:true},
 {n:'ronda cerrada, reparto abierto',  r:{...base,'0xb8f7a665':'0x'+w(0),'0xb4bd9e27':'0x'+w(1),'0x4b8bcb58':'0x'+w(1)}, esp:'Claim your NRM', off:false},
 {n:'sin RPC: invita a conectar',     r:null, esp:'Connect wallet', off:false},
];
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
let mal=0;
for(const c of CASOS){
  const ctx=await nav.newContext({viewport:{width:1400,height:1000}});
  await ctx.addInitScript(({R})=>{
    const of=window.fetch;
    window.fetch=async(u,o)=>{ if(!o||!o.body) return of(u,o);
      if(!R) throw new TypeError('Failed to fetch');
      const j=JSON.parse(o.body); let result=null;
      if(j.method==='eth_call') result=R[j.params[0].data.slice(0,10)] ?? '0x'+'0'.repeat(64);
      return new Response(JSON.stringify({jsonrpc:'2.0',id:j.id,result}),{status:200,headers:{'content-type':'application/json'}});
    };
  },{R:c.r});
  const pg=await ctx.newPage(); const errs=[];
  pg.on('pageerror',e=>errs.push(String(e)));
  await pg.goto('http://127.0.0.1:8932/index.html',{waitUntil:'load'});
  await pg.locator('#presale').scrollIntoViewIfNeeded();
  await pg.waitForTimeout(c.r?1800:9000);
  const txt=(await pg.locator('#wCta').textContent()).trim();
  const off=await pg.locator('#wCta').isDisabled();
  const raised=await pg.locator('#saleRaised').textContent();
  const ok = txt===c.esp && off===c.off && errs.length===0;
  if(!ok) mal++;
  console.log((ok?'  ok  ':'  MAL ')+c.n+`  →  "${txt}" ${off?'(bloqueado)':'(pulsable)'}  barra:${raised}`
    + (ok?'':`\n         esperado: "${c.esp}" ${c.off?'(bloqueado)':'(pulsable)'}  errores:${errs.length} ${errs.slice(0,2)}`));
  await ctx.close();
}
await nav.close(); srv.close();
console.log(mal?`\n${mal} fallo(s)`:'\ntodos los estados correctos');
process.exit(mal?1:0);
