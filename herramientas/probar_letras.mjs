/* ══ QUE NINGUN TEXTO SE QUEDE A MEDIAS ══
   El titular de portada, y los de casi todas las secciones, entran partidos en
   trozos: cada trozo sube desde abajo dentro de una caja con «overflow:hidden»,
   que es lo que hace que asome en vez de aparecer. Mientras el trozo no ha
   subido, esta TAPADO POR SU PROPIA CAJA.

   Eso choca con el freno de animaciones, que pausa lo que no esta a la vista y
   pregunta por la vista a un IntersectionObserver — y un IntersectionObserver
   tiene en cuenta el recorte del padre. Resultado: la letra esta escondida
   porque su transicion esta pausada, y su transicion esta pausada porque la
   letra esta escondida. Un abrazo del que no se sale. Se vio en un iPhone:
   «A chain for real assets» se quedaba en «A chain for».

   Esta prueba vigila las dos caras:
     1. el freno no toca NUNCA una transicion ni una animacion de una sola
        pasada — la regla que evita el abrazo —, pero sigue parando los bucles
        infinitos, que es para lo que existe;
     2. bajando la pagina entera, en movil y en escritorio, ningun trozo de
        texto se queda desplazado dentro de su caja.                          */
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ='/home/user/nerium';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
'.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';
const p=path.join(RAIZ,f);if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p));});
await new Promise(r=>srv.listen(8983,r));
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const R=[]; const chk=(n,a,b)=>R.push({n,ok:String(a)===String(b),a,b});

/* apunta que pausa el freno, con su tipo y si termina alguna vez */
const ESPIA=()=>{ window.__pausas=[];
  const p=Animation.prototype.pause;
  Animation.prototype.pause=function(){
    try{
      let inf=false;
      try{ const t=this.effect&&this.effect.getComputedTiming&&this.effect.getComputedTiming();
           inf = !!t && t.iterations===Infinity }catch(e){}
      window.__pausas.push({tipo:Object.prototype.toString.call(this).slice(8,-1), infinita:inf});
    }catch(e){}
    return p.apply(this,arguments);
  };
};

/* mide si algun trozo sigue caido dentro de su caja, mirando solo lo que esta
   en pantalla: lo que aun no ha llegado abajo es normal que este escondido */
const COLGADAS=()=>{
  const malas=[];
  document.querySelectorAll('.ws').forEach(ws=>{
    const wi=ws.firstElementChild; if(!wi) return;
    const a=ws.getBoundingClientRect();
    if(a.bottom<0 || a.top>innerHeight || !a.height) return;
    /* un titular al que aun no le han dado la entrada esta escondido con todo
       el derecho: lo que se persigue es el que YA arranco y no llego */
    const jefe=ws.closest('.sp');
    if(!jefe || !jefe.classList.contains('in')) return;
    const b=wi.getBoundingClientRect();
    if(b.height && (b.top-a.top) > a.height*0.35){
      const t=ws.closest('[data-orig]');
      malas.push({letra:wi.textContent, de:(t&&t.dataset.orig||'').slice(0,42)});
    }
  });
  return malas;
};

/* Esperar un reloj fijo confunde «todavia entrando» con «atascado». Aqui se
   espera a que no quede ni una transicion CORRIENDO sobre los trozos: una
   atascada esta «paused», no «running», asi que no se cuela por esta puerta. */
const QUIETO=()=>new Promise(res=>{
  let vueltas=0;
  const mira=()=>{
    let vivas=0;
    try{
      vivas=document.getAnimations().filter(a=>{
        const e=a.effect&&a.effect.target;
        return e&&e.classList&&e.classList.contains('wi')&&a.playState==='running';
      }).length;
    }catch(e){}
    if(vivas===0 || ++vueltas>60) return res(vueltas);
    setTimeout(mira,50);
  };
  mira();
});

async function recorrer(movil){
  const ctx=await nav.newContext(movil
    ? {viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:3}
    : {viewport:{width:1400,height:900}});
  await ctx.addInitScript(ESPIA);
  const pg=await ctx.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
  await pg.goto('http://127.0.0.1:8983/index.html',{waitUntil:'load'});
  await pg.waitForTimeout(2600);
  await pg.evaluate(QUIETO);
  const nombre=movil?'movil':'escritorio';

  let colgadas=[...await pg.evaluate(COLGADAS)];
  const alto=await pg.evaluate(()=>document.body.scrollHeight);
  const paso=Math.round((movil?844:900)*0.75);
  for(let y=paso; y<alto; y+=paso){
    await pg.evaluate(v=>scrollTo(0,v), y);
    await pg.waitForTimeout(450);
    await pg.evaluate(QUIETO);
    await pg.waitForTimeout(120);
    colgadas=colgadas.concat(await pg.evaluate(COLGADAS));
  }
  chk(`[${nombre}] ningun texto se queda a medias bajando la pagina`, colgadas.length, 0);
  if(colgadas.length) console.log('   colgadas:', JSON.stringify(colgadas.slice(0,8)));

  const p=await pg.evaluate(()=>{
    const l=window.__pausas||[];
    return {total:l.length,
            transiciones:l.filter(x=>x.tipo==='CSSTransition').length,
            finitas:l.filter(x=>x.tipo!=='CSSTransition'&&!x.infinita).length,
            infinitas:l.filter(x=>x.infinita).length};
  });
  chk(`[${nombre}] el freno no pausa ni una transicion`, p.transiciones, 0);
  chk(`[${nombre}] ni una animacion de una sola pasada`, p.finitas, 0);
  if(movil) chk('[movil] pero sigue parando los bucles infinitos', p.infinitas>0, true);
  chk(`[${nombre}] sin errores de pagina`, errs.length, 0);
  await ctx.close();
}

await recorrer(true);
await recorrer(false);

/* ── y el titular, letra por letra, contra su texto original ──────────────── */
{
  const ctx=await nav.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const pg=await ctx.newPage();
  await pg.goto('http://127.0.0.1:8983/index.html',{waitUntil:'load'});
  await pg.waitForTimeout(3500);
  const r=await pg.evaluate(()=>{
    const h=document.querySelector('.hero h1');
    const trozos=[...h.querySelectorAll('.ws')];
    const visto=trozos.map(ws=>{
      const wi=ws.firstElementChild, a=ws.getBoundingClientRect(), b=wi.getBoundingClientRect();
      return (b.top-a.top)>a.height*0.35 ? '' : wi.textContent;
    }).join('');
    return {visto, esperado:(h.dataset.orig||'').replace(/\s+/g,''), trozos:trozos.length};
  });
  chk('el titular de portada se lee entero', r.visto, r.esperado);
  chk('   y esta partido de verdad, no es un falso verde', r.trozos>5, true);
  await ctx.close();
}

console.log('');
let mal=0;
R.forEach(r=>{ if(!r.ok) mal++;
  console.log((r.ok?'  ok  ':'  MAL ')+r.n+(r.ok?'':`   (era ${r.a}, se esperaba ${r.b})`)); });
console.log(mal ? `\n${R.length-mal} bien, ${mal} MAL` : `\n${R.length}/${R.length} correctas`);
await nav.close(); srv.close();
