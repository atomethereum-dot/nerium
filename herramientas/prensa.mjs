import { chromium, devices } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ='/home/user/nerium';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';
const p=path.join(RAIZ,f);if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p));});
await new Promise(r=>srv.listen(8948,r));
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await nav.newContext({...devices['iPhone 13']});
const pg=await ctx.newPage();
await pg.goto('http://127.0.0.1:8948/index.html',{waitUntil:'load'});
await pg.waitForTimeout(1200);
const out = await pg.evaluate(async ()=>{
  const s=[...document.querySelectorAll('main>section')][1];
  const filas=[];
  const mira=()=>{
    const cs=getComputedStyle(s);
    const hijos=[...s.querySelectorAll('*')].filter(e=>e.offsetHeight>60).slice(0,4)
      .map(e=>e.tagName.toLowerCase()+'.'+(e.className.trim().split(/\s+/)[0]||'')+':'+e.offsetHeight);
    return {y:Math.round(scrollY), h:s.offsetHeight, cv:cs.contentVisibility,
            cls:s.className, hijos:hijos.join(' ')};
  };
  for(let y=0;y<2600;y+=150){ window.scrollTo(0,y); await new Promise(r=>setTimeout(r,140)); filas.push(mira()); }
  // y ahora de vuelta hacia arriba
  for(let y=2600;y>=0;y-=150){ window.scrollTo(0,y); await new Promise(r=>setTimeout(r,140)); filas.push({...mira(), sube:1}); }
  return filas;
});
let ant=null;
for(const f of out){
  if(ant===null||f.h!==ant) console.log(`${f.sube?'↑':'↓'} y=${String(f.y).padStart(4)}  alto=${String(f.h).padStart(4)}  cv=${f.cv.padEnd(8)}  ${f.hijos}`);
  ant=f.h;
}
await nav.close(); srv.close();
