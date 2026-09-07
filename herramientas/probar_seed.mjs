import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ='/home/user/nerium';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
'.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';
const p=path.join(RAIZ,f);if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p));});
await new Promise(r=>srv.listen(8942,r));
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const Rs=[]; const chk=(n,a,b)=>Rs.push({n,ok:String(a)===String(b),a,b});
const ctx=await nav.newContext({viewport:{width:1400,height:1000}});
const pg=await ctx.newPage(); const errs=[];
pg.on('pageerror',e=>errs.push(String(e)));

// ── whitepaper: la ruta nueva ───────────────────────────────────────────────
await pg.goto('http://127.0.0.1:8942/whitepaper/index.html#/seedround',{waitUntil:'load'});
await pg.waitForTimeout(900);
chk('la ruta nueva pinta la sección', await pg.title(), 'Nereum — Join the Seed Round');
chk('y el texto ya no dice whitelist',
    (await pg.locator('body').innerText()).toLowerCase().includes('whitelist'), false);

// ── whitepaper: el enlace viejo sigue funcionando ───────────────────────────
await pg.goto('http://127.0.0.1:8942/whitepaper/index.html#/whitelist',{waitUntil:'load'});
await pg.waitForTimeout(900);
chk('el enlace viejo sigue llevando ahí', await pg.title(), 'Nereum — Join the Seed Round');

// ── whitepaper en español ───────────────────────────────────────────────────
await pg.goto('http://127.0.0.1:8942/whitepaper/index.html#/seedround',{waitUntil:'load'});
await pg.waitForTimeout(700);
const botes = await pg.locator('button, a').filter({hasText:/Español|ES/}).count();

// ── la portada ──────────────────────────────────────────────────────────────
await pg.goto('http://127.0.0.1:8942/index.html',{waitUntil:'load'});
await pg.waitForTimeout(1200);
await pg.locator('#presale').scrollIntoViewIfNeeded();
await pg.waitForTimeout(1400);
// textContent y no innerText: las secciones fuera de vista no se renderizan y
// innerText solo devuelve lo pintado.
const txt = await pg.locator('body').evaluate(el => el.textContent);
chk('la portada no dice whitelist', /whitelist/i.test(txt), false);
chk('y sí dice Seed Round', txt.includes('Seed Round open'), true);
chk('el precio se llama así', txt.includes('Seed Round price'), true);
chk('el multiplicador también', txt.includes('from Seed Round to listing'), true);
chk('y el botón', txt.includes('Join the Seed Round'), true);
chk('la descripción social', await pg.locator('meta[property="og:description"]').getAttribute('content'),
    'Issue, move and settle real-world assets on a chain built for them. Seed Round open.');
chk('y la de twitter', await pg.locator('meta[name="twitter:description"]').getAttribute('content'),
    'Issue, move and settle real-world assets on a chain built for them. Seed Round open.');
chk('sin errores', errs.length, 0);

// ── traducido al español, sigue diciendo Seed Round ─────────────────────────
await pg.evaluate(()=>{ const b=document.querySelector('.lang'); if(b) b.click(); });
await pg.waitForTimeout(400);
const opt = pg.locator('.lang-menu button, .lang-menu a').filter({hasText:/Español/});
if (await opt.count()) {
  await opt.first().click();
  await pg.waitForTimeout(1600);
  const t2 = await pg.locator('body').innerText();
  chk('en español también es Seed Round', t2.includes('Seed Round'), true);
  chk('y no queda lista blanca', /lista blanca/i.test(t2), false);
}
await nav.close(); srv.close();
let mal=0; for(const r of Rs){ if(!r.ok)mal++;
 console.log((r.ok?'  ok  ':'  MAL ')+r.n+(r.ok?'':`\n         esperado: ${r.b}\n         obtenido: ${r.a}`)); }
console.log(mal?`\n${mal} fallo(s)`:`\n${Rs.length}/${Rs.length} correctas`);
process.exit(mal?1:0);
