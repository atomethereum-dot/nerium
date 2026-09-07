import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ='/home/user/nerium';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';
const p=path.join(RAIZ,f);if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p));});
await new Promise(r=>srv.listen(8945,r));
const w=v=>BigInt(v).toString(16).padStart(64,'0');
const R={'0xaf68130e':'0x'+w(250595548942n)+w(1),'0x8b3948bd':'0x'+w(20000000n),'0x3fbb3d1d':'0x'+w(20000000n),
'0x4194fdd1':'0x'+w(1000000000000n),'0x63b20117':'0x'+w(0),'0x4b749535':'0x'+w(0),'0xb8f7a665':'0x'+w(1),
'0xb4bd9e27':'0x'+w(0),'0x5c975abb':'0x'+w(0),'0x78e97925':'0x'+w(1757000000),'0x4b8bcb58':'0x'+w(0),
'0x3acd1572':'0x'+w(1000000000000n),'0xdd62ed3e':'0x'+w(0)};
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const anchos=[[360,780],[390,844],[430,932],[768,1024],[1280,900]];
const tabla={};
for(const [W,H] of anchos){
  const ctx=await nav.newContext({viewport:{width:W,height:H},deviceScaleFactor:2,isMobile:W<900,hasTouch:W<900});
  await ctx.addInitScript(({R})=>{const of=window.fetch;
   window.fetch=async(u,o)=>{const url=String(u);
    if(url.indexOf('explorer-api')>=0)return new Response('{"listings":{}}',{status:200,headers:{'content-type':'application/json'}});
    if(!o||!o.body)return of(u,o);const j=JSON.parse(o.body);let res=null;
    if(j.method==='eth_call')res=R[j.params[0].data.slice(0,10)]??'0x'+'0'.repeat(64);
    return new Response(JSON.stringify({jsonrpc:'2.0',id:j.id,result:res}),{status:200,headers:{'content-type':'application/json'}});};
  },{R});
  const pg=await ctx.newPage();
  await pg.goto('http://127.0.0.1:8945/index.html',{waitUntil:'load'});
  await pg.waitForTimeout(1200);
  // Se baja hasta el final para que todo se pinte Y termine de animarse: el
  // alto que importa es el que queda, no el de justo antes de la animación.
  const alto = await pg.evaluate(()=>document.documentElement.scrollHeight);
  for(let y=0;y<alto*1.4;y+=300){ await pg.evaluate(v=>scrollTo(0,v),y); await pg.waitForTimeout(70); }
  await pg.waitForTimeout(1500);
  const m = await pg.evaluate(()=>{
    const o={};
    [...document.querySelectorAll('main>section')].forEach((s,i)=>{
      const cs=getComputedStyle(s);
      const extra = parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom)
                  + parseFloat(cs.borderTopWidth)+parseFloat(cs.borderBottomWidth);
      // contain-intrinsic-size gobierna la caja de contenido: hay que descontar
      // el relleno y el borde, que el navegador suma aparte.
      const clave = s.id || ('['+i+'] .'+(s.className.trim().split(/\s+/)[0]||'?'));
      o[clave]=Math.round(s.offsetHeight - extra);
    });
    return o;
  });
  tabla[W+'x'+H]=m;
  await ctx.close();
}
const ids=[...new Set(Object.values(tabla).flatMap(o=>Object.keys(o)))];
const anch=Object.keys(tabla);
console.log('sección'.padEnd(12)+anch.map(a=>a.padStart(11)).join('')+'   100vh');
for(const id of ids){
  const fila=anch.map(a=>String(tabla[a][id]??'-').padStart(11)).join('');
  const vh=anch.map(a=>+a.split('x')[1]);
  console.log(id.padEnd(12)+fila+'   '+vh.join('/'));
}
await nav.close(); srv.close();
