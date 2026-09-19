import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, devices } from 'playwright';
const RAIZ='/home/user/nerium'; const P=9281;
const TIPO={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let p=path.join(RAIZ,decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');
 if(!fs.existsSync(p)){r.writeHead(404);return r.end()}
 r.writeHead(200,{'content-type':TIPO[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p))}).listen(P);
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await nav.newContext({...devices['iPhone 13'],isMobile:true,hasTouch:true});
const pg=await ctx.newPage();
const fuera=new Map(), fallos=[];
pg.on('request',q=>{ const u=q.url();
  if(!u.startsWith('http://127.0.0.1')&&!u.startsWith('data:')&&!u.startsWith('blob:')){
    const h=new URL(u).host; fuera.set(h,(fuera.get(h)||0)+1) } });
pg.on('requestfailed',q=>{ const u=q.url();
  if(!u.startsWith('http://127.0.0.1')) fallos.push(new URL(u).host+'  '+(q.failure()?q.failure().errorText:'')) });
const marcas=[];
const t0=Date.now();
pg.on('request',q=>{ const u=q.url();
  if(!u.startsWith('http://127.0.0.1')&&!u.startsWith('data:')&&!u.startsWith('blob:'))
    marcas.push(Date.now()-t0) });
await pg.goto('http://127.0.0.1:'+P+'/',{waitUntil:'load'});
await pg.waitForTimeout(12000);          /* doce segundos quieto: ¿reintenta? */
console.log('TOTAL de peticiones a fuera: '+marcas.length);
const tramos=[0,0,0,0,0,0];
marcas.forEach(t=>{ const i=Math.min(5,Math.floor(t/2000)); tramos[i]++ });
console.log('repartidas por tramos de 2 s: '+tramos.join(' | '));
console.log('PETICIONES A FUERA DEL SITIO:');
if(!fuera.size) console.log('  ninguna');
for(const [h,n] of [...fuera].sort((a,b)=>b[1]-a[1])) console.log('  '+h+'  x'+n);
console.log('FALLARON:');
if(!fallos.length) console.log('  ninguna');
[...new Set(fallos)].forEach(f=>console.log('  '+f));
/* y los lienzos sueltos, que no salen en el DOM */
const off=await pg.evaluate(()=>{
  let n=0,b=0;
  /* no hay forma de enumerarlos: se estima por los que la pagina crea */
  document.querySelectorAll('canvas').forEach(c=>{n++;b+=c.width*c.height*4});
  return {n,mb:+(b/1048576).toFixed(1)};
});
console.log('lienzos en el DOM: '+off.n+'  '+off.mb+' MB');
await nav.close(); srv.close();
