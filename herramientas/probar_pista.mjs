/* ══ LA PISTA DE BAJAR ══
   La portada no decia en ninguna parte que hubiera que seguir bajando: la
   unica sena era un circulo de 32 px en la esquina de abajo a la izquierda.
   Esta pista va centrada, dice la palabra, se anima y se puede pulsar.

   Lo que se vigila aqui:
     · esta y se ve desde arriba del todo Y durante el emblema, que es el
       momento en que uno no sabe si la pagina ha terminado de cargar;
     · se retira cuando la cortina acaba, porque a partir de ahi hay contenido
       que leer y la pista seria un estorbo;
     · mientras esta, el circulo de la esquina se aparta — dos flechas
       diciendo lo mismo a la vez, no — y vuelve en cuanto ella se va;
     · al pulsarla lleva a la seccion siguiente ENTERA, no «un poco mas abajo»,
       que dejaria al visitante donde ya estaba;
     · y su animacion es un bucle infinito, que es la unica clase que el freno
       de animaciones puede pausar sin dejar nada escondido.               */
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ='/home/user/nerium';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
'.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';
const p=path.join(RAIZ,f);if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p));});
await new Promise(r=>srv.listen(8996,r));
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const R=[]; const chk=(n,a,b)=>R.push({n,ok:String(a)===String(b),a,b});

const LEE=()=>{
  const e=document.getElementById('pista');
  if(!e) return null;
  const r=e.getBoundingClientRect(), cs=getComputedStyle(e);
  const btn=document.querySelector('.scrollbtn');
  return {op:+cs.opacity, pe:cs.pointerEvents, z:+cs.zIndex,
          centrado:Math.abs((r.left+r.width/2)-innerWidth/2)<2,
          dentro:r.bottom<=innerHeight && r.top>=0,
          clase:document.body.classList.contains('pista-on'),
          esquina:btn?+getComputedStyle(btn).opacity:null};
};

for (const [nom,opts] of [['escritorio',{viewport:{width:1532,height:771}}],
                          ['movil',{viewport:{width:390,height:844},hasTouch:true,isMobile:true}]]) {
  const ctx=await nav.newContext(opts); const pg=await ctx.newPage();
  const errs=[]; pg.on('pageerror',e=>errs.push(String(e)));
  await pg.goto('http://127.0.0.1:8996/index.html',{waitUntil:'load'});
  await pg.waitForTimeout(2600);

  const arriba=await pg.evaluate(LEE);
  chk(`[${nom}] la pista existe`, !!arriba, true);
  chk(`[${nom}] se ve nada mas entrar`, arriba.op, 1);
  chk(`[${nom}] centrada en el ancho`, arriba.centrado, true);
  chk(`[${nom}] entera dentro de la pantalla`, arriba.dentro, true);
  chk(`[${nom}] por encima de la cortina`, arriba.z>5, true);
  chk(`[${nom}] se puede pulsar`, arriba.pe, 'auto');
  chk(`[${nom}] y el circulo de la esquina se aparta`, arriba.esquina, 0);

  const pin=await pg.evaluate(()=>document.querySelector('.hero-hold').offsetHeight-innerHeight);
  await pg.evaluate(v=>scrollTo(0,Math.round(v*0.72)), pin); await pg.waitForTimeout(800);
  const emblema=await pg.evaluate(LEE);
  chk(`[${nom}] sigue ahi durante el emblema`, emblema.op, 1);
  chk(`[${nom}]   y el emblema esta de verdad en pantalla`,
      await pg.evaluate(()=>+getComputedStyle(document.getElementById('lockup')).opacity>.9), true);

  await pg.evaluate(v=>scrollTo(0,v), pin); await pg.waitForTimeout(800);
  const final=await pg.evaluate(LEE);
  chk(`[${nom}] se retira al acabar la cortina`, final.op, 0);
  chk(`[${nom}]   deja de estorbar al raton`, final.pe, 'none');
  chk(`[${nom}]   y devuelve el circulo de la esquina`, final.clase, false);

  await pg.evaluate(()=>scrollTo(0,0)); await pg.waitForTimeout(900);
  await pg.locator('#pista').click();
  await pg.waitForTimeout(2400);
  const nt=await pg.evaluate(()=>Math.round(document.getElementById('network').getBoundingClientRect().top));
  chk(`[${nom}] al pulsarla, la seccion siguiente queda arriba`, Math.abs(nt)<=2, true);

  chk(`[${nom}] sin errores de pagina`, errs.length, 0);
  await ctx.close();
}

/* ── que su animacion sea de las que el freno puede parar sin romper nada ── */
{
  const ctx=await nav.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const pg=await ctx.newPage();
  await pg.goto('http://127.0.0.1:8996/index.html',{waitUntil:'load'});
  await pg.waitForTimeout(2200);
  const a=await pg.evaluate(()=>{
    const e=document.getElementById('pista');
    const l=document.getAnimations().filter(x=>{
            const t=x.effect&&x.effect.target;
            return t && (t===e || e.contains(t) || (t.parentElement&&e.contains(t.parentElement)));
          });
    return l.map(x=>{ let it=null;
      try{ it=x.effect.getComputedTiming().iterations }catch(e){}
      return {tipo:Object.prototype.toString.call(x).slice(8,-1), infinita:it===Infinity}; });
  });
  chk('la pista se anima', a.length>0, true);
  chk('   y todas sus animaciones son bucles infinitos',
      a.length>0 && a.every(x=>x.infinita), true);
  chk('   ninguna es una transicion', a.some(x=>x.tipo==='CSSTransition'), false);
  await ctx.close();
}

console.log('');
let mal=0;
R.forEach(r=>{ if(!r.ok) mal++;
  console.log((r.ok?'  ok  ':'  MAL ')+r.n+(r.ok?'':`   (era ${r.a}, se esperaba ${r.b})`)); });
console.log(mal ? `\n${R.length-mal} bien, ${mal} MAL` : `\n${R.length}/${R.length} correctas`);
await nav.close(); srv.close();
