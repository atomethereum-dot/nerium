import { chromium, devices } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ='/home/user/nerium';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';
const p=path.join(RAIZ,f);if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p));});
await new Promise(r=>srv.listen(8946,r));
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await nav.newContext({viewport:{width:1280,height:900}});
const pg=await ctx.newPage();
await pg.goto('http://127.0.0.1:8946/index.html',{waitUntil:'load'});
await pg.waitForTimeout(1200);
// Cada seccion se lleva a pantalla, se deja asentar y se mide ahi mismo.
const filas = await pg.evaluate(async ()=>{
  const secs=[...document.querySelectorAll('main>section')];
  const out=[];
  for(let i=0;i<secs.length;i++){
    const s=secs[i];
    s.scrollIntoView({block:'center'});
    await new Promise(r=>setTimeout(r,320));
    const cs=getComputedStyle(s);
    const extra=parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom)
               +parseFloat(cs.borderTopWidth)+parseFloat(cs.borderBottomWidth);
    out.push({i, id:s.id||'', cls:(s.className.trim().split(/\s+/)[0]||''),
      total:s.offsetHeight, contenido:Math.round(s.offsetHeight-extra), relleno:Math.round(extra),
      cv:cs.contentVisibility, intr:cs.containIntrinsicSize});
  }
  return out;
});
for(const f of filas)
  console.log(String(f.i).padStart(2)+'  '+(f.id||'.'+f.cls).padEnd(11)+
    ' total '+String(f.total).padStart(5)+'  contenido '+String(f.contenido).padStart(5)+
    '  relleno '+String(f.relleno).padStart(4)+'  cv:'+f.cv.padEnd(8)+' intr:'+f.intr);
await nav.close(); srv.close();
