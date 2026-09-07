import { chromium, devices } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ='/home/user/nerium';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';
const p=path.join(RAIZ,f);if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p));});
await new Promise(r=>srv.listen(8944,r));
const w=v=>BigInt(v).toString(16).padStart(64,'0');
const R={'0xaf68130e':'0x'+w(250595548942n)+w(1),'0x8b3948bd':'0x'+w(20000000n),'0x3fbb3d1d':'0x'+w(20000000n),
'0x4194fdd1':'0x'+w(1000000000000n),'0x63b20117':'0x'+w(0),'0x4b749535':'0x'+w(0),'0xb8f7a665':'0x'+w(1),
'0xb4bd9e27':'0x'+w(0),'0x5c975abb':'0x'+w(0),'0x78e97925':'0x'+w(1757000000),'0x4b8bcb58':'0x'+w(0),
'0x3acd1572':'0x'+w(1000000000000n),'0xdd62ed3e':'0x'+w(0)};
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await nav.newContext({...devices['iPhone 13']});
await ctx.addInitScript(({R})=>{const of=window.fetch;
 window.fetch=async(u,o)=>{const url=String(u);
  if(url.indexOf('explorer-api')>=0)return new Response('{"listings":{}}',{status:200,headers:{'content-type':'application/json'}});
  if(!o||!o.body)return of(u,o);const j=JSON.parse(o.body);let res=null;
  if(j.method==='eth_call')res=R[j.params[0].data.slice(0,10)]??'0x'+'0'.repeat(64);
  return new Response(JSON.stringify({jsonrpc:'2.0',id:j.id,result:res}),{status:200,headers:{'content-type':'application/json'}});};
},{R});
const pg=await ctx.newPage();
await pg.goto('http://127.0.0.1:8944/index.html',{waitUntil:'load'});
await pg.waitForTimeout(1500);

const secs = await pg.evaluate(()=>[...document.querySelectorAll('main>section')].map(s=>s.id));
console.log('secciones:', secs.join(' '));

// Se baja poco a poco y se anota la altura de cada seccion y la del documento.
const filas=[];
const paso = 260;
const total = await pg.evaluate(()=>document.documentElement.scrollHeight);
for(let y=0; y<total; y+=paso){
  await pg.evaluate(v=>window.scrollTo(0,v), y);
  await pg.waitForTimeout(90);
  const m = await pg.evaluate(()=>{
    const o={doc:document.documentElement.scrollHeight, y:Math.round(window.scrollY)};
    document.querySelectorAll('main>section').forEach((s,i)=>{ o[s.id||('sec'+i)]=s.offsetHeight; });
    [...document.body.children].forEach((el,i)=>{
      if(el.tagName==='SCRIPT'||el.tagName==='STYLE') return;
      o['body>'+el.tagName.toLowerCase()+(el.id?'#'+el.id:'')+'['+i+']']=el.offsetHeight;
    });
    [...document.querySelector('main').children].forEach((el,i)=>{
      if(el.tagName==='SECTION') return;
      o['main>'+el.tagName.toLowerCase()+(el.className?'.'+el.className.trim().split(/\s+/)[0]:'')+'['+i+']']=el.offsetHeight;
    });
    return o;
  });
  filas.push(m);
}
// Qué secciones cambian de alto durante el recorrido
const ids = [...new Set(filas.flatMap(f=>Object.keys(f)))].filter(k=>k!=='doc'&&k!=='y');
console.log('\n--- secciones que cambian de alto ---');
for(const id of ids){
  const vals=[...new Set(filas.map(f=>f[id]).filter(v=>v!==undefined))];
  if(vals.length>1) console.log(`${id.padEnd(12)} ${Math.min(...vals)} → ${Math.max(...vals)}  (Δ ${Math.max(...vals)-Math.min(...vals)}px, ${vals.length} valores)`);
}
console.log('\n--- alto del documento ---');
const docs=[...new Set(filas.map(f=>f.doc))];
console.log('valores distintos:', docs.length, '·', Math.min(...docs), '→', Math.max(...docs));
let ant=null, antF=null;
for(const f of filas){
  if(ant!==null && f.doc!==ant){
    const culpables = ids.filter(id=>f[id]!==antF[id])
      .map(id=>`${id} ${antF[id]}→${f[id]}`);
    console.log(`  en y=${f.y}: ${ant} → ${f.doc}  (Δ ${f.doc-ant})   ${culpables.join(' · ')||'???'}`);
  }
  ant=f.doc; antF=f;
}
await nav.close(); srv.close();
