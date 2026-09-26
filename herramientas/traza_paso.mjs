/* Traza del paso portada -> prensa con la CPU a 1/4: que se come cada cuadro */
import { chromium, devices } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ='/home/user/nerium';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.mp4':'video/mp4'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';
const p=path.join(RAIZ,f);if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p));});
const PORT=+process.env.PORT||8971;
await new Promise(r=>srv.listen(PORT,r));
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const modo=process.env.MODO||'movil';
const opc = modo==='movil'? {...devices['iPhone 13']} : {viewport:{width:1440,height:900}};
const ctx=await nav.newContext(opc);
await ctx.addInitScript(()=>{ window.fetch=async()=>new Response('{}',{status:200}); });
const pg=await ctx.newPage();
const cdp=await ctx.newCDPSession(pg);
await pg.goto(`http://127.0.0.1:${PORT}/index.html`,{waitUntil:'load'});
await pg.waitForTimeout(2500);
await cdp.send('Emulation.setCPUThrottlingRate',{rate:+process.env.RATE||4});
await pg.evaluate(()=>{ window.__fr=[]; let u=performance.now();
  (function f(t){ window.__fr.push(t-u); u=t; requestAnimationFrame(f); })(u); });
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval',{interval:200}); await cdp.send('Profiler.start');
await nav.startTracing(pg,{categories:['devtools.timeline','disabled-by-default-devtools.timeline','v8.execute','blink.user_timing','disabled-by-default-devtools.timeline.invalidationTracking','disabled-by-default-devtools.timeline.stack']});
await pg.mouse.move(200,300);
const rec = await pg.evaluate(()=>document.querySelector('.hero-hold').offsetHeight-innerHeight);
const t0=Date.now();
let y=0;
while(Date.now()-t0<6000){
  await pg.mouse.wheel(0,120); await pg.waitForTimeout(90);
  y=await pg.evaluate(()=>scrollY);
  const pr=await pg.evaluate(()=>{const s=document.querySelector('#press');return s.getBoundingClientRect().top});
  if(Math.abs(pr)<4 && y>rec) break;
}
await pg.waitForTimeout(1500);
const buf=await nav.stopTracing();
const {profile}=await cdp.send('Profiler.stop');
{const self={};const dt=(profile.endTime-profile.startTime)/profile.samples.length;const cnt={};for(const s of profile.samples)cnt[s]=(cnt[s]||0)+1;
for(const n of profile.nodes){const f=n.callFrame;const k=(f.functionName||'(anon)')+' @'+(f.lineNumber+1);self[k]=(self[k]||0)+(cnt[n.id]||0)*dt;}
{const par={};for(const n of profile.nodes)for(const c of (n.children||[]))par[c]=n;const g={};for(const n of profile.nodes){if(!/getBoundingClientRect|scrollTo|offset|getComputedStyle/.test(n.callFrame.functionName))continue;const p=par[n.id];const k=n.callFrame.functionName+' <- '+(p?(p.callFrame.functionName||'(anon)')+' @'+(p.callFrame.lineNumber+1):'?');g[k]=(g[k]||0)+(cnt[n.id]||0)*dt;}console.log('== quien fuerza ==\n'+Object.entries(g).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([k,v])=>(v/1000).toFixed(0).padStart(6)+' ms '+k).join('\n'));}
console.log('== JS propio ==\n'+Object.entries(self).sort((a,b)=>b[1]-a[1]).slice(0,25).map(([k,v])=>(v/1000).toFixed(0).padStart(6)+' ms '+k).join('\n'));}
const fr=await pg.evaluate(()=>window.__fr);
fs.writeFileSync(`/tmp/traza_${modo}.json`,buf);
const ev=JSON.parse(buf.toString()).traceEvents;
// agrega por nombre (solo hilo principal del renderer)
const main = ev.filter(e=>e.name==='TracingStartedInBrowser'||e.name==='thread_name');
const rend = ev.filter(e=>e.name==='thread_name'&&e.args&&e.args.name==='CrRendererMain').map(e=>e.pid+':'+e.tid);
const agg={}, fun={};
for(const e of ev){ if(e.ph!=='X'||!e.dur) continue; if(!rend.includes(e.pid+':'+e.tid)) continue;
  agg[e.name]=(agg[e.name]||0)+e.dur;
  if(e.name==='FunctionCall'||e.name==='TimerFire'||e.name==='FireAnimationFrame'||e.name==='EventDispatch'){
    const d=e.args&&e.args.data||{}; const k=e.name+' '+(d.functionName||d.type||'')+' @'+(d.lineNumber||'')+':'+(d.columnNumber||'');
    fun[k]=(fun[k]||0)+e.dur; }
}
{const inv={};for(const e of ev){if(!/InvalidationTracking|ScheduleStyleInvalidation/.test(e.name))continue;const d=(e.args&&e.args.data)||{};const st=d.stackTrace||[];const f=st[0]||{};const k=e.name.replace('InvalidationTracking','')+' '+(d.reason||'')+' <- '+(f.functionName||'?')+'@'+(f.lineNumber||'')+' '+(d.nodeName||'').slice(0,40);inv[k]=(inv[k]||0)+1;}
console.log('== invalidaciones ==\n'+Object.entries(inv).sort((a,b)=>b[1]-a[1]).slice(0,30).map(([k,v])=>String(v).padStart(6)+' '+k).join('\n'));}
const top=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,22).map(([k,v])=>`${(v/1000).toFixed(0).padStart(7)} ms  ${k}`).join('\n');
console.log('== hilo principal, por tipo ==\n'+top(agg));
console.log('== llamadas ==\n'+top(fun));
const largos=fr.filter(x=>x>34).length, med=fr.slice().sort((a,b)=>a-b)[Math.floor(fr.length/2)];
console.log(`cuadros ${fr.length}, mediana ${med.toFixed(1)} ms, >34ms: ${largos}, peores: ${fr.slice().sort((a,b)=>b-a).slice(0,8).map(x=>x.toFixed(0)).join(' ')}`);
await nav.close(); srv.close();
