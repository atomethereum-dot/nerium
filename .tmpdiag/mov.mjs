import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, devices } from 'playwright';
const RAIZ='/home/user/nerium'; const P=9311;
const TIPO={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let p=path.join(RAIZ,decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');
 if(!fs.existsSync(p)){r.writeHead(404);return r.end()}
 r.writeHead(200,{'content-type':TIPO[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p))}).listen(P);
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const D='/tmp/claude-0/-home-user-test2/f0f81d8c-503b-5035-a856-a071059ad8b5/scratchpad/mov';
fs.rmSync(D,{recursive:true,force:true}); fs.mkdirSync(D,{recursive:true});
for(const [nom,calma] of [['normal',false],['calma',true]]){
  const ctx=await nav.newContext({...devices['iPhone 13'],isMobile:true,hasTouch:true,
    reducedMotion: calma?'reduce':'no-preference'});
  const pg=await ctx.newPage();
  await pg.goto('http://127.0.0.1:'+P+'/',{waitUntil:'load'});
  await pg.waitForTimeout(2600);
  const y=await pg.evaluate(()=>{const n=document.querySelector('section.chroma');
    let y=0,q=n;while(q){y+=q.offsetTop;q=q.offsetParent}return y});
  await pg.evaluate(v=>scrollTo(0,v-60), y);
  await pg.waitForTimeout(1500);
  const firma=async()=>pg.evaluate(()=>{
    const c=document.getElementById('chroma'), x=c.getContext('2d');
    const d=x.getImageData(0,0,c.width,Math.min(c.height,80)).data;
    let s=0; for(let i=0;i<d.length;i+=997) s+=d[i]; return s;
  });
  const a=await firma(); await pg.waitForTimeout(2200); const b=await firma();
  console.log(nom+': firma '+a+' -> '+b+'   '+(a===b?'QUIETA':'se mueve'));
  await pg.screenshot({path:D+'/'+nom+'.png'});
  await ctx.close();
}
await nav.close(); srv.close();
