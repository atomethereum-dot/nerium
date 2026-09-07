/* Todos los iconos que declaran las páginas tienen que existir, servirse con su
   tipo y tener el tamaño que dicen. Un favicon roto no da error: simplemente no
   sale, y nadie se entera hasta que Google indexa el sitio sin icono. */
import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ='/home/user/nerium';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
'.webmanifest':'application/manifest+json','.woff2':'font/woff2','.jpg':'image/jpeg',
'.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';
const p=path.join(RAIZ,f);if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p));});
await new Promise(r=>srv.listen(8953,r));
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const Rs=[]; const chk=(n,a,b)=>Rs.push({n,ok:String(a)===String(b),a,b});
const ctx=await nav.newContext(); const pg=await ctx.newPage();

for (const pagina of ['/index.html','/whitepaper/index.html','/explorer/index.html']) {
  await pg.goto('http://127.0.0.1:8953'+pagina,{waitUntil:'domcontentloaded'});
  const enlaces = await pg.evaluate(()=>[...document.querySelectorAll('link[rel*="icon"],link[rel="manifest"]')]
    .map(l=>({rel:l.getAttribute('rel'), href:l.getAttribute('href'), sizes:l.getAttribute('sizes')})));
  chk(pagina+': declara iconos', enlaces.length >= 10, true);
  for (const e of enlaces) {
    const r = await pg.request.get('http://127.0.0.1:8953'+e.href);
    chk(pagina+' '+e.href+' se sirve', r.status(), 200);
  }
  // El manifiesto tiene que apuntar a archivos que existan
  const man = enlaces.find(e=>e.rel==='manifest');
  if (man) {
    const j = await (await pg.request.get('http://127.0.0.1:8953'+man.href)).json();
    for (const ic of (j.icons||[])) {
      const r = await pg.request.get('http://127.0.0.1:8953'+ic.src);
      chk(pagina+' manifiesto → '+ic.src, r.status(), 200);
    }
  }
}
await nav.close(); srv.close();
let mal=0; for(const r of Rs){ if(!r.ok)mal++;
 console.log((r.ok?'  ok  ':'  MAL ')+r.n+(r.ok?'':`  (${r.a})`)); }
console.log(mal?`\n${mal} fallo(s)`:`\n${Rs.length}/${Rs.length} correctas`);
process.exit(mal?1:0);
