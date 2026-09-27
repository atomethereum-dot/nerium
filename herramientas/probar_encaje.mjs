// probar_encaje: en ESCRITORIO la seccion de Seguridad -la columna y la
// tarjeta- tiene que caber entera en la pantalla, con margen arriba y abajo,
// y sin quedar debajo del boton de subir, en portatiles bajos y en monitores
// grandes. Antes median lo mismo en 768 de alto que en 1440: se cortaban.
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ='/home/user/nerium';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.webp':'image/webp'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';const p=path.join(RAIZ,f);if(!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end()}r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p))});
await new Promise(r=>srv.listen(9021,r));
let ok=0, total=0;
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const VS=(process.argv[2]||'1024x640,1280x600,1280x680,1280x720,1366x625,1366x768,1440x740,1440x900,1536x730,1536x864,1600x780,1680x950,1920x940,1920x1080,2560x1300,2560x1440,960x600,1100x700').split(',').map(s=>s.split('x').map(Number));
for(const [W,H] of VS){
  const ctx=await nav.newContext({viewport:{width:W,height:H}});
  const pg=await ctx.newPage(); await pg.goto('http://127.0.0.1:9021/index.html',{waitUntil:'load'}); await pg.waitForTimeout(400);
  const res=[];
  for(const f of [.05,.5,.95]){
    await pg.evaluate(f=>{const h=document.querySelector('#security .sx-hold');const t=h.getBoundingClientRect().top+scrollY;window.scrollTo(0,t+f*(h.offsetHeight-innerHeight))},f);
    await pg.waitForTimeout(1200);
    res.push(await pg.evaluate(()=>{const c=document.querySelector('#security .sx-card.on');const r=c.getBoundingClientRect();
      const inner=Math.max(...[...c.querySelectorAll('.sx-foot,.sx-go,.sx-log')].map(e=>e.getBoundingClientRect().bottom));
      const rail=document.querySelector('#security .sx-rail').getBoundingClientRect();
      const cnt=document.querySelector('#security .sx-cnt').getBoundingClientRect();
      const hud=document.querySelector('#subir').getBoundingClientRect();
      const g=document.querySelector('#security .sx-grid');
      const eng=document.querySelector('.hud-l, #idioma, .lang')?.getBoundingClientRect();
      return {i:c.dataset.i,top:Math.round(r.top),bot:Math.round(r.bottom),vh:innerHeight,railL:Math.round(rail.left),railTop:Math.round(rail.top),cntB:Math.round(cnt.bottom),R:Math.round(r.right),sL:Math.round(hud.left),sT:Math.round(hud.top),tr:g.style.transform.replace(/.*scale\((.*)\)/,'$1')};
      return `${c.dataset.i}: top ${Math.round(r.top)} bottom ${Math.round(r.bottom)} (vh ${innerHeight}) contenido ${Math.round(inner)} desborde ${Math.round(c.scrollHeight-c.clientHeight)} | rail ${Math.round(rail.top)}-${Math.round(rail.bottom)} cnt ${Math.round(cnt.bottom)} | cardRight ${Math.round(r.right)} subirLeft ${Math.round(hud.left)} subirTop ${Math.round(hud.top)}`}));
  }
  const top=Math.min(...res.map(r=>Math.min(r.top,r.railTop))), bot=Math.max(...res.map(r=>Math.max(r.bot,r.cntB)));
  const pisa=res.some(r=>r.R>r.sL-8&&r.bot>r.sT-8);
  const bien = top >= 24 && H - bot >= 24 && !pisa && res[0].railL >= 60;
  total++; if (bien) ok++;
  console.log('  ' + (bien ? 'ok ' : 'MAL') + ' ' + W + 'x' + H + ' · escala ' + res[0].tr + ', ' + top + ' px arriba, ' + (H - bot) + ' px abajo, lados ' + res[0].railL + '/' + (W - res[0].R) + (pisa ? ', PISA EL BOTON DE SUBIR' : ''));
  await ctx.close();
}
await nav.close();srv.close();
console.log('\n' + ok + '/' + total + ' correctas');
process.exit(ok === total ? 0 : 1);
