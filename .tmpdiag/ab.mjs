import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, devices } from 'playwright';
const RAIZ='/home/user/nerium'; const P=9310;
const TIPO={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let p=path.join(RAIZ,decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');
 if(!fs.existsSync(p)){r.writeHead(404);return r.end()}
 r.writeHead(200,{'content-type':TIPO[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p))}).listen(P);
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await nav.newContext({...devices['iPhone 13'],isMobile:true,hasTouch:true});
const pg=await ctx.newPage();
const cdp=await ctx.newCDPSession(pg); await cdp.send('Performance.enable');
const dur=async()=>{const {metrics}=await cdp.send('Performance.getMetrics');
  const m={}; metrics.forEach(x=>m[x.name]=x.value); return m.ScriptDuration+m.LayoutDuration+m.RecalcStyleDuration};
await pg.goto('http://127.0.0.1:'+P+'/',{waitUntil:'load'});
await pg.waitForTimeout(2600);
const y=await pg.evaluate(()=>{const n=document.querySelector('section.chroma');
  let y=0,q=n;while(q){y+=q.offsetTop;q=q.offsetParent}return y});
/* QUIETO sobre la banda, que es donde una escena que corre sola se paga */
await pg.evaluate(v=>scrollTo(0,v-60), y); await pg.waitForTimeout(1200);
async function quieto(nombre){
  const a=await dur(); await pg.waitForTimeout(5000); const b=await dur();
  console.log(nombre+': '+((b-a)*1000).toFixed(0)+' ms en 5 s quieto  ('+(((b-a)/5)*100).toFixed(1)+' % de un nucleo)');
  return b-a;
}
const con=await quieto('CON la banda');
await pg.evaluate(()=>{ const c=document.getElementById('chroma'); if(c) c.remove() });
await pg.waitForTimeout(800);
const sin=await quieto('SIN la banda');
console.log('--> la banda cuesta '+(((con-sin)/5)*100).toFixed(1)+' puntos de nucleo, quieto');
await nav.close(); srv.close();
