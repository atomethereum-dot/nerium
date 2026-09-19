import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, devices } from 'playwright';
const RAIZ='/home/user/nerium'; const P=9282;
const TIPO={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let p=path.join(RAIZ,decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');
 if(!fs.existsSync(p)){r.writeHead(404);return r.end()}
 r.writeHead(200,{'content-type':TIPO[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p))}).listen(P);
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
for(const [nom,op] of [['movil',{...devices['iPhone 13'],isMobile:true,hasTouch:true}],
                       ['escritorio',{viewport:{width:1440,height:900}}]]){
  const ctx=await nav.newContext(op);
  await ctx.addInitScript(()=>{ window.__sueltos=[];
    const C=document.createElement.bind(document);
    document.createElement=function(t){ const e=C(t);
      if(String(t).toLowerCase()==='canvas') window.__sueltos.push(e); return e } });
  const pg=await ctx.newPage();
  await pg.goto('http://127.0.0.1:'+P+'/',{waitUntil:'load'});
  await pg.waitForTimeout(2600);
  const caja=await pg.evaluate(()=>{const n=document.querySelector('section.chroma');
    let y=0,q=n;while(q){y+=q.offsetTop;q=q.offsetParent}return y});
  await pg.evaluate(v=>scrollTo(0,v), Math.max(0,caja-200));
  await pg.waitForTimeout(2200);
  const r=await pg.evaluate(()=>{
    let n=0,mb=0; window.__sueltos.forEach(c=>{ if(c.width>1&&!c.isConnected){n++; mb+=c.width*c.height*4/1048576} });
    let dn=0,dmb=0; document.querySelectorAll('canvas').forEach(c=>{ if(c.width>1){dn++; dmb+=c.width*c.height*4/1048576} });
    const det=window.__sueltos.filter(c=>c.width>1&&!c.isConnected)
      .map(c=>c.width+'x'+c.height+' = '+(c.width*c.height*4/1048576).toFixed(1)+' MB')
      .sort((a,b)=>parseFloat(b.split('= ')[1])-parseFloat(a.split('= ')[1]));
    return {n,mb:+mb.toFixed(1),dn,dmb:+dmb.toFixed(1),det};
  });
  console.log(nom+': sueltos '+r.n+' ('+r.mb+' MB) + DOM '+r.dn+' ('+r.dmb+' MB) = '+(r.mb+r.dmb).toFixed(1)+' MB');
  console.log('   los sueltos: '+r.det.join('  |  '));
  await ctx.close();
}
await nav.close(); srv.close();
