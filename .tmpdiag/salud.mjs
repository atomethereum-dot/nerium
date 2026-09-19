import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, devices } from 'playwright';
const RAIZ='/home/user/nerium'; const P=9280;
const TIPO={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let p=path.join(RAIZ,decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');
 if(!fs.existsSync(p)){r.writeHead(404);return r.end()}
 r.writeHead(200,{'content-type':TIPO[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p))}).listen(P);
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await nav.newContext({...devices['iPhone 13'],isMobile:true,hasTouch:true});
await ctx.addInitScript(()=>{
  window.__re=0; window.__mb=0;
  const d=Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype,'width');
  Object.defineProperty(HTMLCanvasElement.prototype,'width',{configurable:true,
    get(){return d.get.call(this)},
    set(v){ if(window.__cuenta){window.__re++; window.__mb+=v*this.height*4/1048576} return d.set.call(this,v) }});
});
const pg=await ctx.newPage();
const errs=[], warns=[];
pg.on('pageerror',e=>errs.push(String(e).slice(0,160)));
pg.on('console',m=>{ if(m.type()==='error') warns.push(m.text().slice(0,120)) });
const t0=Date.now();
await pg.goto('http://127.0.0.1:'+P+'/',{waitUntil:'load'});
const tLoad=Date.now()-t0;
await pg.waitForTimeout(3200);
const m0=await pg.evaluate(()=>{
  let n=0,b=0; document.querySelectorAll('canvas').forEach(c=>{ if(c.width>1){n++; b+=c.width*c.height*4} });
  return {n, mb:+(b/1048576).toFixed(1), doc:document.documentElement.scrollHeight,
          sueltos:0};
});
console.log('carga: '+tLoad+' ms   errores de pagina: '+(errs.length?errs.join(' | '):'ninguno'));
if(warns.length) console.log('consola: '+warns.slice(0,3).join(' | '));
console.log('al cargar: '+m0.n+' lienzos en el DOM, '+m0.mb+' MB, documento '+m0.doc+' px');
/* los lienzos SUELTOS (fuera del DOM) no salen en querySelectorAll */
await pg.evaluate(()=>{ window.__cuenta=1 });
const alto=await pg.evaluate(()=>document.documentElement.scrollHeight);
let pico=0, movs=0;
for(let y=0;y<alto;y+=300){
  await pg.evaluate(v=>scrollTo(0,v),y); await pg.waitForTimeout(60);
  const a=await pg.evaluate(()=>Math.round(scrollY));
  await pg.waitForTimeout(400);
  const b=await pg.evaluate(()=>Math.round(scrollY));
  if(Math.abs(b-a)>20) movs++;
  const v=await pg.evaluate(()=>{let b=0;document.querySelectorAll('canvas').forEach(c=>{if(c.width>1)b+=c.width*c.height*4});return b/1048576});
  if(v>pico)pico=v;
}
const r=await pg.evaluate(()=>({re:window.__re, mb:window.__mb}));
console.log('recorrido: '+r.re+' reasignaciones ('+r.mb.toFixed(1)+' MB), pico de lienzo en el DOM '+pico.toFixed(1)+' MB');
console.log('la pagina se movio sola en '+movs+' de '+Math.ceil(alto/300)+' paradas');
await nav.close(); srv.close();
