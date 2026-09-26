/* El documento no debe cambiar de alto mientras se recorre la página, ni
   bajando ni subiendo. Cuando cambia, todo lo que hay por debajo se mueve y el
   scroll pega un tirón: es el fallo que se vio en el móvil. */
import { chromium, devices } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const RAIZ='/home/user/nerium';
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json',
'.woff2':'font/woff2','.jpg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon'};
const srv=http.createServer((q,r)=>{let f=decodeURIComponent(q.url.split('?')[0]);if(f.endsWith('/'))f+='index.html';
const p=path.join(RAIZ,f);if(!p.startsWith(RAIZ)||!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();}
r.writeHead(200,{'content-type':T[path.extname(p)]||'application/octet-stream'});r.end(fs.readFileSync(p));});
await new Promise(r=>srv.listen(8949,r));
const w=v=>BigInt(v).toString(16).padStart(64,'0');
const R={'0xaf68130e':'0x'+w(250595548942n)+w(1),'0x8b3948bd':'0x'+w(20000000n),'0x3fbb3d1d':'0x'+w(20000000n),
'0x4194fdd1':'0x'+w(1000000000000n),'0x63b20117':'0x'+w(0),'0x4b749535':'0x'+w(0),'0xb8f7a665':'0x'+w(1),
'0xb4bd9e27':'0x'+w(0),'0x5c975abb':'0x'+w(0),'0x78e97925':'0x'+w(1757000000),'0x4b8bcb58':'0x'+w(0),
'0x3acd1572':'0x'+w(1000000000000n),'0xdd62ed3e':'0x'+w(0)};
const TOLERANCIA = 8;   // px: por debajo de esto nadie ve nada
const nav=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--no-sandbox']});
const Rs=[]; const chk=(n,a,b)=>Rs.push({n,ok:String(a)===String(b),a,b});

for (const [nombre, opciones] of [['móvil', {...devices['iPhone 13']}],
                                  ['escritorio', {viewport:{width:1400,height:900}}]]) {
  const ctx=await nav.newContext(opciones);
  await ctx.addInitScript(({R})=>{const of=window.fetch;
   window.fetch=async(u,o)=>{const url=String(u);
    if(url.indexOf('explorer-api')>=0)return new Response('{"listings":{}}',{status:200,headers:{'content-type':'application/json'}});
    if(!o||!o.body)return of(u,o);const j=JSON.parse(o.body);let res=null;
    if(j.method==='eth_call')res=R[j.params[0].data.slice(0,10)]??'0x'+'0'.repeat(64);
    return new Response(JSON.stringify({jsonrpc:'2.0',id:j.id,result:res}),{status:200,headers:{'content-type':'application/json'}});};
  },{R});
  /* cuenta lo que pinta el tunel, para saber si sigue encendido */
  await ctx.addInitScript(()=>{ window.__tp=0; const P=CanvasRenderingContext2D.prototype, f=P.fillRect;
    P.fillRect=function(){ if(this.canvas&&this.canvas.id==='shTunel') window.__tp++; return f.apply(this,arguments); }; });
  const pg=await ctx.newPage();
  await pg.goto('http://127.0.0.1:8949/index.html',{waitUntil:'load'});
  await pg.waitForTimeout(1600);
  const total = await pg.evaluate(()=>document.documentElement.scrollHeight);
  const paso = 260, ruta=[];
  for(let y=0;y<total;y+=paso) ruta.push(y);
  for(let y=total;y>=0;y-=paso) ruta.push(y);
  const altos=[];
  for(const y of ruta){
    await pg.evaluate(v=>scrollTo(0,v), y);
    await pg.waitForTimeout(80);
    altos.push(await pg.evaluate(()=>document.documentElement.scrollHeight));
  }
  const rango = Math.max(...altos) - Math.min(...altos);
  chk(`${nombre}: el documento no cambia de alto (±${rango}px)`, rango <= TOLERANCIA, true);

  // Y ninguna sección debe cambiar de tamaño entre pasadas
  const cambios = await pg.evaluate(async ()=>{
    const secs=[...document.querySelectorAll('main>section')];
    const antes=secs.map(s=>s.offsetHeight);
    const h=document.documentElement.scrollHeight;
    for(let y=h;y>=0;y-=400){ scrollTo(0,y); await new Promise(r=>setTimeout(r,70)); }
    for(let y=0;y<h;y+=400){ scrollTo(0,y); await new Promise(r=>setTimeout(r,70)); }
    return secs.map((s,i)=>({i, id:s.id||s.className.split(' ')[0], de:antes[i], a:s.offsetHeight}))
               .filter(x=>Math.abs(x.a-x.de)>2);
  });
  chk(`${nombre}: ninguna sección cambia al volver a pasar`,
      cambios.map(c=>`${c.id} ${c.de}→${c.a}`).join(', ') || 'ninguna', 'ninguna');

  /* Y LO QUE DE VERDAD SE VE: QUE LA PÁGINA NO SE MUEVA SOLA.
     Las dos pruebas de arriba miden el ALTO del documento, y el fallo que el
     visitante reportó —«se reinicia al llegar a algunas secciones»— no cambiaba
     el alto ni un píxel: el documento medía 16678 antes y después. Lo que se
     movía era el SCROLL. Un aviso de «resize» —la barra de direcciones del
     móvil al desplazarse, o el que la propia página se manda para despertar los
     lienzos dormidos— disparaba un remedido completo que reponía el scroll a un
     número de píxeles ya caducado, y tiraba de la lectura 781 px hacia atrás.
     Cuatro veces en un recorrido. Así que se para en cada tramo, se deja a la
     página sola medio segundo, y se comprueba que siga donde se la dejó. */
  /* La portada ya NO salta sola a la prensa: se pidio que baje normal.
     Asi que no tiene excepcion en el barrido -se mide como todo lo demas- y
     abajo se exige lo contrario de lo que se exigia: que al terminar el
     tunel la pagina se quede donde la dejas. */
  const zona = await pg.evaluate(()=>{
    const h = document.querySelector('.hero-hold');
    if(!h) return null;
    const fin = h.offsetHeight - innerHeight;
    const sig = [...document.querySelectorAll('main>section')].find(s=>
      s.getBoundingClientRect().top + scrollY > 20 &&
      getComputedStyle(s).display !== 'none' &&
      s.getBoundingClientRect().height > 40);
    return sig ? { fin, destino: Math.round(sig.getBoundingClientRect().top + scrollY),
                   id: sig.id || sig.className.split(' ')[0] } : null;
  });

  const quieta = await (async () => {
    const h = await pg.evaluate(()=>document.documentElement.scrollHeight);
    let peor = 0, dondeError = 0;
    for (let y = 0; y < h; y += 300) {
      await pg.evaluate(v=>scrollTo(0,v), y);
      await pg.waitForTimeout(60);
      const a = await pg.evaluate(()=>Math.round(scrollY));
      await pg.waitForTimeout(420);
      const b = await pg.evaluate(()=>Math.round(scrollY));
      if (Math.abs(b-a) > Math.abs(peor)) { peor = b-a; dondeError = y }
    }
    return { peor, dondeError };
  })();
  chk(`${nombre}: la página no se desplaza sola mientras se lee` +
      (Math.abs(quieta.peor) > 20 ? ` (${quieta.peor}px en y=${quieta.dondeError})` : ''),
      Math.abs(quieta.peor) <= 20, true);

  /* ── la portada baja normal ── */
  if (zona) {
    /* 1 · al acabar el tunel NO salta: se queda donde se la deja */
    await pg.evaluate(v=>scrollTo(0,v), 0); await pg.waitForTimeout(260);
    for (let y = Math.round(zona.fin * 0.5); y <= zona.fin + 40; y += 120)
      { await pg.evaluate(v=>scrollTo(0,v), Math.min(y, zona.fin + 40)); await pg.waitForTimeout(70); }
    await pg.evaluate(v=>scrollTo(0,v), zona.fin + 40); await pg.waitForTimeout(1500);
    const quedo = await pg.evaluate(()=>Math.round(scrollY));
    chk(`${nombre}: al acabar el tunel no salta sola, se queda donde se deja (${quedo} de ${zona.fin + 40})`,
        Math.abs(quedo - (zona.fin + 40)) <= 4, true);

    /* 2 · CON LA RUEDA DE VERDAD, bajando normal, se llega a la seccion. Y
       «Nereum» sigue en su sitio al final del tunel: si se va, lo que queda a
       la vista es el hueco que el tunel talla para el. */
    await pg.evaluate(v=>scrollTo(0,v), 0); await pg.waitForTimeout(500);
    await pg.mouse.move(200, 300);
    let nereumFin = null, llego = false;
    for (let k = 0; k < 60 && !llego; k++) {
      await pg.mouse.wheel(0, 60);
      await pg.waitForTimeout(90);
      const s = await pg.evaluate(()=>{ const l = document.querySelector('.lockup');
        return { y: Math.round(scrollY), p: window.__tunelP || 0,
                 op: l ? +getComputedStyle(l).opacity : 1 }; });
      if (s.p >= 0.99 && nereumFin === null) nereumFin = s.op;
      if (s.y >= zona.destino - 4) llego = true;
    }
    await pg.evaluate(v=>scrollTo(0,v), zona.destino); await pg.waitForTimeout(1200);
    const conRueda = await pg.evaluate(()=>Math.round(scrollY));
    chk(`${nombre}: bajando a golpes de rueda, sin parar, llega a «${zona.id}» (${conRueda} de ${zona.destino})`,
        llego && Math.abs(conRueda - zona.destino) <= 4, true);
    chk(`${nombre}: y al final del tunel «Nereum» sigue ahi, no queda el hueco (${nereumFin})`,
        nereumFin !== null && nereumFin > 0.9, true);

    /* 3 · Y EN LA SECCION, EL TUNEL APAGADO. La prensa se monta 36 px sobre el
       final de la portada, y justo donde aterriza el salto quedaban esos 36
       px de lienzo asomando: el tunel se creia visible y seguia pintando
       tapado, a 34.000 dibujos por segundo, en el sitio exacto donde uno se
       queda leyendo. Se mide ahi y no un poco mas abajo, que es donde se
       media antes y por eso no se vio. */
    await pg.evaluate(()=>{ window.__tp=0 }); await pg.waitForTimeout(1200);
    const tunelTras = await pg.evaluate(()=>Math.round(window.__tp / 1.2));
    chk(`${nombre}: en la seccion, el tunel esta apagado (${tunelTras} dibujos/s)`,
        tunelTras === 0, true);

  }

  await ctx.close();
}
await nav.close(); srv.close();
let mal=0; for(const r of Rs){ if(!r.ok)mal++;
 console.log((r.ok?'  ok  ':'  MAL ')+r.n+(r.ok?'':`\n         esperado: ${r.b}\n         obtenido: ${r.a}`)); }
console.log(mal?`\n${mal} fallo(s)`:`\n${Rs.length}/${Rs.length} correctas`);
process.exit(mal?1:0);
