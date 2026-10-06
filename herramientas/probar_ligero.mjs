/* p77 · EL MODO LIGERO. En un equipo de gama media -aqui, cuatro nucleos- la
   pagina entra en modo ligero desde el principio: <html class="ligero">, los
   lienzos pintan uno de cada dos cuadros y el escritorio usa el scroll del
   navegador en vez del suave por JavaScript. En un equipo rapido no entra.
   Y el boton flotante y el acento de la raiz no rehacen el estilo mientras
   se baja. */
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.mp4':'video/mp4','.webm':'video/webm'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';const p=path.join(RAIZ,f);
  if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end()}
  r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p))});
await new Promise(r=>srv.listen(0,r));
const URL_='http://127.0.0.1:'+srv.address().port+'/';
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
let ok=0,mal=0;const di=(c,t)=>{if(c){ok++;console.log('  ok  '+t)}else{mal++;console.log('  MAL '+t)}};
/* en cuantos cuadros pinta el lienzo que mas pinta, bajando unos pixeles por
   cuadro: con la pagina quieta los bucles duermen y no pinta ninguno */
const cuenta=()=>new Promise(res=>{const M=['fillRect','fill','drawImage','stroke'],quita=[];let cu=0;const por=new Map();
  /* cada lienzo lleva sus propios metodos (los que no pintan fuera de pantalla), asi que se cuenta en ellos */
  document.querySelectorAll('canvas').forEach(c=>{if(c.offsetWidth<300)return;const g=c.getContext('2d');if(!g)return;
    M.forEach(m=>{const o=g[m];if(typeof o!=='function')return;g[m]=function(){let s=por.get(c);if(!s){s=new Set();por.set(c,s)}s.add(cu);return o.apply(g,arguments)};quita.push(()=>{g[m]=o})})});
  (function f(){cu++;scrollBy(0,6);if(cu<60)requestAnimationFrame(f);else{quita.forEach(q=>q());let best=0;por.forEach(s=>{if(s.size>best)best=s.size});res({cu,frac:best/cu})}})()});
async function abre(nucleos){
  const ctx=await nav.newContext({viewport:{width:1440,height:900}});
  await ctx.addInitScript(n=>{Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>n});Object.defineProperty(navigator,'deviceMemory',{get:()=>8});
    window.fetch=async()=>new Response('{}',{status:200})},nucleos);
  const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(URL_,{waitUntil:'load'});await pg.waitForTimeout(4600);return {ctx,pg,errs};
}
{ const {ctx,pg,errs}=await abre(4);
  const r=await pg.evaluate(()=>({lig:document.documentElement.classList.contains('ligero'),flag:window.__lento===true,sm:document.body.classList.contains('sm')}));
  di(r.lig&&r.flag,'cuatro nucleos: entra en modo ligero desde el principio');
  di(!r.sm,'y el escritorio usa el scroll del navegador, no el suave por JavaScript');
  /* un lienzo a la vista pinta uno de cada dos cuadros */
  await pg.evaluate(()=>scrollTo(0,document.getElementById('stack').getBoundingClientRect().top+scrollY+300));await pg.waitForTimeout(800);
  const k=await pg.evaluate(cuenta);
  di(k.cu>=60,'los bucles siguen vivos ('+k.cu+' cuadros)');
  di(k.frac>.3&&k.frac<.7,'el lienzo de «The stack», bajando, pinta uno de cada dos cuadros ('+Math.round(k.frac*100)+' %)');
  /* la rueda no se intercepta */
  const y0=await pg.evaluate(()=>scrollY);await pg.mouse.move(700,450);await pg.mouse.wheel(0,600);await pg.waitForTimeout(500);
  const y1=await pg.evaluate(()=>scrollY);di(y1-y0>=500,'la rueda baja la pagina con el scroll del navegador ('+Math.round(y1-y0)+' px)');
  di(!errs.length,'sin errores de pagina'+(errs.length?': '+errs[0]:''));
  await ctx.close(); }
{ const {ctx,pg,errs}=await abre(16);
  const r=await pg.evaluate(()=>({lig:document.documentElement.classList.contains('ligero'),sm:document.body.classList.contains('sm')}));
  di(!r.lig,'dieciseis nucleos: no entra en modo ligero de entrada');
  di(r.sm,'y conserva el scroll suave del escritorio');
  await pg.evaluate(()=>scrollTo(0,document.getElementById('stack').getBoundingClientRect().top+scrollY+300));await pg.waitForTimeout(800);
  const k=await pg.evaluate(cuenta);
  di(k.frac>.85,'y el lienzo de «The stack», bajando, pinta en todos los cuadros ('+Math.round(k.frac*100)+' %)');
  /* mientras se baja, nadie escribe el acento en la raiz */
  const n=await pg.evaluate(async()=>{let c=0;const D=document.documentElement.style,o=D.setProperty.bind(D);D.setProperty=function(k,v){if(k==='--blue')c++;return o(k,v)};
    for(let i=0;i<40;i++){window.dispatchEvent(new WheelEvent('wheel',{deltaY:120,cancelable:true}));await new Promise(r=>requestAnimationFrame(r))}
    return c});
  di(n===0,'bajando, el acento de la raiz no se reescribe ('+n+' veces)');
  di(!errs.length,'sin errores de pagina'+(errs.length?': '+errs[0]:''));
  await ctx.close(); }
/* p79 · EL TELEFONO NO SE PARTE. Tiene su propio techo de cuadros en la
   cabecera; el modo ligero lo leia como «lento» y bajaba los lienzos a quince
   por segundo. En el telefono -aun con cuatro nucleos- los lienzos pintan en
   todos los cuadros de su reloj, y solo se quitan los desenfoques. */
{ const ctx=await nav.newContext({viewport:{width:390,height:844},deviceScaleFactor:3,isMobile:true,hasTouch:true});
  await ctx.addInitScript(()=>{Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>4});window.fetch=async()=>new Response('{}',{status:200})});
  const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto(URL_,{waitUntil:'load'});await pg.waitForTimeout(4600);
  await pg.evaluate(()=>scrollTo(0,document.getElementById('stack').getBoundingClientRect().top+scrollY+300));await pg.waitForTimeout(800);
  const r=await pg.evaluate(()=>({lento:!!window.__lento,lig:document.documentElement.classList.contains('ligero')}));
  di(!r.lento,'telefono con cuatro nucleos: no parte los cuadros');
  di(r.lig,'y si quita los desenfoques (clase «ligero»)');
  const k=await pg.evaluate(cuenta);
  di(k.frac>.85,'el lienzo de «The stack», bajando, pinta en cada cuadro de su reloj ('+Math.round(k.frac*100)+' %)');
  di(!errs.length,'sin errores de pagina'+(errs.length?': '+errs[0]:''));
  await ctx.close(); }
console.log(mal?`${ok} bien, ${mal} MAL`:`${ok}/${ok} correctas`);
await nav.close();srv.close();process.exit(mal?1:0);
