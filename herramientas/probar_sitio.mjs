/* ═══════════════════════════════════════════════════════════════════════════
   QUE UNA RECARGA NO SE VEA
   ═══════════════════════════════════════════════════════════════════════════
   Un telefono tira la pestaña cuando le aprieta la memoria y la recarga solo.
   La pagina no puede impedirlo; lo que si tiene que garantizar es que el
   visitante reaparezca donde estaba y no vea la portada desde el principio,
   porque eso es lo que se siente como «se reinicia la pagina».

   Se mide con los ojos, no con numeros internos: se recarga con red de movil
   y se hacen dieciocho capturas seguidas. En ninguna puede verse la portada.
   ══════════════════════════════════════════════════════════════════════════ */
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{
  let f=decodeURIComponent(q.url.split('?')[0]); if(f.endsWith('/')) f+='index.html';
  const p=path.join(RAIZ,f);
  if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){ r.writeHead(404); return r.end() }
  r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});
  r.end(fs.readFileSync(p));
});
await new Promise(r=>srv.listen(8974,r));

let bien=0, mal=0;
const ok =(t)=>{ bien++; console.log('  ok  '+t) };
const no =(t)=>{ mal++;  console.log('  MAL '+t) };

const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await nav.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const pg=await ctx.newPage();
await pg.goto('http://127.0.0.1:8974/index.html',{waitUntil:'load'});
await pg.waitForTimeout(1600);
const alto=await pg.evaluate(()=>document.documentElement.scrollHeight);

/* Tres sitios de la pagina: al principio de lo largo, a la mitad y al final. */
for(const frac of [0.30, 0.60, 0.88]){
  const y=Math.round((alto-844)*frac);
  await pg.evaluate(v=>scrollTo(0,v),y);
  await pg.waitForTimeout(1300);
  const sitio=await pg.evaluate(()=>Math.round(scrollY));

  const cdp=await ctx.newCDPSession(pg);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,
    downloadThroughput:1.5*1024*1024/8, uploadThroughput:750*1024/8});

  const recarga=pg.reload({waitUntil:'load'}).catch(()=>{});
  let arriba=0, tomas=0;
  for(let i=0;i<18;i++){
    try{
      await pg.screenshot({timeout:4000});                 /* obliga a pintar */
      const v=await pg.evaluate(()=>Math.round(scrollY)).catch(()=>-1);
      if(v>=0){ tomas++; if(v<400) arriba++ }
    }catch(e){}
    await new Promise(r=>setTimeout(r,250));
  }
  await recarga;
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1}).catch(()=>{});

  const etq='recargando al '+Math.round(frac*100)+' % de la pagina';
  if(arriba===0) ok(etq+': no se ve la portada en ninguna de las '+tomas+' capturas');
  else no(etq+': se ve la portada en '+arriba+' de '+tomas+' capturas');

  await pg.waitForTimeout(2500);
  const fin=await pg.evaluate(()=>Math.round(scrollY));
  if(Math.abs(fin-sitio)<250) ok('   y acaba donde estaba (pedia '+sitio+', quedo '+fin+')');
  else no('   acaba en otro sitio: estaba en '+sitio+', quedo en '+fin);
}

/* Quien llega de nuevo desde un enlace tiene que empezar arriba. */
await pg.evaluate(()=>{ try{ sessionStorage.clear() }catch(e){} });
const otra=await ctx.newPage();
await otra.goto('http://127.0.0.1:8974/index.html',{waitUntil:'load'});
await otra.waitForTimeout(2200);
const y0=await otra.evaluate(()=>Math.round(scrollY));
if(y0<40) ok('quien llega de nuevo empieza arriba (y='+y0+')');
else no('quien llega de nuevo no empieza arriba: y='+y0);

console.log('\n'+bien+'/'+(bien+mal)+' correctas');
await nav.close(); srv.close();
process.exit(mal? 1:0);
