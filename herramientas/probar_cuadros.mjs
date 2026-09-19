/* ═══════════════════════════════════════════════════════════════════════════
   EL TECHO DE CUADROS DEL TELEFONO
   ═══════════════════════════════════════════════════════════════════════════
   Medido con el navegador metido en un grupo con la memoria limitada —que es
   lo que hace un telefono— y recorriendo la pagina dos veces: el pico de
   memoria del navegador entero era de 758 MB con los bucles de animacion a
   sesenta cuadros, y de 425 MB con los bucles apagados del todo. Trescientos
   treinta y tres megas son los cuadros. Con el limite puesto a 500 MB la
   pagina se moria tres veces de tres, la primera en y=9994, dentro de la
   seccion de compra: justo donde se cae en el telefono de verdad.

   Por eso hay un techo. Pero el techo no es un numero sagrado: es «lo que
   haga falta para que el pico no llegue al precipicio». Cuando cada cuadro
   cuesta menos, caben mas cuadros por el mismo dinero. Al quitar las lecturas
   de geometria del camino del scroll y sacar «--vel» de la raiz, el mismo
   numero de cuadros paso a costar bastante menos:

       tandas/s   pico     antes de aquellos dos arreglos
          19      616 MB      (a este ritmo, 660 MB)
          27      648 MB
          31      667 MB

   O sea que 27 por segundo salen hoy mas baratos que 19 entonces. Se sube a
   27 —se ve bastante mas fluido— y se comprueba: con el limite en 500 MB,
   sobrevive tres de tres.

   Lo importante es el techo MIENTRAS SE HACE SCROLL, que es cuando se cae:
   al principio solo frenaba con la pagina quieta.
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
await new Promise(r=>srv.listen(8968,r));

let bien=0, mal=0;
const ok=t=>{bien++;console.log('  ok  '+t)};
const no=t=>{mal++;console.log('  MAL '+t)};

const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});

async function cuenta(ancho, alto, segundos, moviendo){
  const ctx=await nav.newContext({viewport:{width:ancho,height:alto},deviceScaleFactor:2,
    isMobile:ancho<900, hasTouch:ancho<900});
  /* Se cuentan los cuadros que el navegador entrega de verdad: este parche va
     antes que los de la pagina, asi que ve lo que sale por debajo de todos. */
  await ctx.addInitScript(()=>{
    const raf=window.requestAnimationFrame.bind(window);
    let n=0;
    window.requestAnimationFrame=f=>raf(t=>{ n++; return f(t) });
    window.__n=()=>{ const v=n; n=0; return v };
  });
  const pg=await ctx.newPage();
  await pg.goto('http://127.0.0.1:8968/index.html',{waitUntil:'load'});
  await pg.waitForTimeout(2000);
  const h=await pg.evaluate(()=>document.documentElement.scrollHeight);
  await pg.evaluate(y=>scrollTo(0,y), Math.round(h*0.4));
  await pg.waitForTimeout(moviendo? 200 : 1600);
  await pg.evaluate(()=>window.__n());
  const t0=Date.now(); let y=Math.round(h*0.4);
  while(Date.now()-t0 < segundos*1000){
    if(moviendo){ y+=90; if(y>h-alto) y=Math.round(h*0.4); await pg.evaluate(v=>scrollTo(0,v),y) }
    await pg.waitForTimeout(100);
  }
  const n=await pg.evaluate(()=>window.__n());
  const seg=(Date.now()-t0)/1000;
  await ctx.close();
  return n/seg;
}

/* Se cuentan entregas del navegador. En el telefono el techo junta todas las
   escenas en UNA entrega por tanda, asi que este numero es el pulso real de
   la pagina; en escritorio no hay techo y cada escena pide la suya, asi que
   alli el numero sale multiplicado por el numero de escenas. Por eso los dos
   limites no se comparan entre si: cada uno vigila lo suyo. */
const conDedo = await cuenta(390,844,4,true);
if(conDedo <= 34) ok('en telefono, haciendo scroll: '+conDedo.toFixed(0)+' tandas/s (techo 34)');
else no('en telefono, haciendo scroll: '+conDedo.toFixed(0)+' tandas/s — pasa del techo de 34, y por ahi es por donde se cae');

const quieta = await cuenta(390,844,4,false);
if(quieta <= 22) ok('en telefono, quieta: '+quieta.toFixed(0)+' tandas/s (techo 22)');
else no('en telefono, quieta: '+quieta.toFixed(0)+' tandas/s — pasa del techo de 22');

if(conDedo >= 20) ok('y va fluida: '+conDedo.toFixed(0)+' tandas/s, no es un pase de diapositivas');
else no('demasiado lento: '+conDedo.toFixed(0)+' tandas/s, se ve a tirones');

/* En escritorio no hay problema que resolver y no debe haber techo. */
const escritorio = await cuenta(1280,900,4,true);
if(escritorio >= 60) ok('en escritorio no se frena nada: '+escritorio.toFixed(0)+' peticiones/s');
else no('en escritorio se esta frenando sin motivo: '+escritorio.toFixed(0)+' peticiones/s');

console.log('\n'+bien+'/'+(bien+mal)+' correctas');
await nav.close(); srv.close();
process.exit(mal?1:0);
