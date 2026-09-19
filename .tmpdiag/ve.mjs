import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium, devices } from 'playwright';
const RAIZ='/home/user/nerium'; const P=9230;
const TIPO={'.html':'text/html','.js':'text/javascript','.css':'text/css','.woff2':'font/woff2','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.json':'application/json','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let p=path.join(RAIZ,decodeURIComponent(q.url.split('?')[0]));
 if(fs.existsSync(p)&&fs.statSync(p).isDirectory())p=path.join(p,'index.html');
 if(!fs.existsSync(p)){r.writeHead(404);return r.end()}
 r.writeHead(200,{'content-type':TIPO[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p))}).listen(P);
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const ctx=await nav.newContext({...devices['iPhone 13'],isMobile:true,hasTouch:true});
const pg=await ctx.newPage();
await pg.goto('http://127.0.0.1:'+P+'/',{waitUntil:'load'});   // SIN ?diag=1
await pg.waitForTimeout(3500);
await pg.evaluate(()=>scrollTo(0,5000)); await pg.waitForTimeout(2500);
const r=await pg.evaluate(()=>({
  cartel: !!document.querySelector('div[style*="99999"]'),
  textoCaja: document.body.innerText.toLowerCase().indexOf('caja negra')>=0,
  clavesGuardadas: Object.keys(sessionStorage),
  nodosRaros: [].filter.call(document.body.children, e=>/99999/.test(e.getAttribute('style')||'')).length
}));
console.log('¿se ve el cartel sin ?diag=1?        '+(r.cartel?'SI':'NO'));
console.log('¿aparece «caja negra» en el texto?   '+(r.textoCaja?'SI':'NO'));
console.log('¿nodos extra en el body?             '+r.nodosRaros);
console.log('claves en sessionStorage:            '+JSON.stringify(r.clavesGuardadas));
await nav.close(); srv.close();
