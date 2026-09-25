#!/usr/bin/env python3
"""Banner de X (1500x500) hecho con la escena de cubos de la propia web.

No dibuja nada nuevo: levanta el index.html real en un servidor local, se
para en la seccion #xfade —la del enjambre— y fotografia el lienzo. Lo que
cambia respecto a la web es solo lo que pide un lienzo 3:1:

  · el corredor se abre de lado (x de +-1.5 a +-3.6) porque en 1500x500 la
    perspectiva cuadrada de la web deja los costados vacios;
  · mas cubos (520 -> 1000) para que la densidad aguante esa apertura;
  · fuera todo el mobiliario fijo salvo la barra de indice (.srail);
  · fuera los textos de la escena salvo la palabra del centro;
  · el enlace nereum.xyz en dos esquinas.

    python3 herramientas/og/banner_cubos.py            # -> img/nereum-x-banner.png
    python3 herramientas/og/banner_cubos.py /tmp/x.png
"""
import os, shutil, subprocess, sys, tempfile, time, signal

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SALIDA = sys.argv[1] if len(sys.argv) > 1 else os.path.join(RAIZ, 'img', 'nereum-x-banner.png')
PUERTO = '8899'
PUNTO = '0.85'          # p de la escena: barras cerradas, enjambre al maximo
CROMO = '/opt/pw-browsers/chromium'

RENDER = r'''
import { chromium } from '%(pw)s';
const nav = await chromium.launch({ executablePath:'%(cromo)s' });
const ctx = await nav.newContext({ viewport:{width:1500,height:500}, deviceScaleFactor:2 });
const pg = await ctx.newPage();
pg.on('pageerror', e => console.log('  · error de pagina:', e.message));
await pg.goto('http://127.0.0.1:%(puerto)s/', { waitUntil:'load', timeout:60000 });
await pg.evaluate(() => document.fonts && document.fonts.ready);
await pg.waitForTimeout(1200);

const quitado = await pg.evaluate(() => {
  const fuera = [];
  for (const e of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(e);
    if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
    if (e.closest('.srail')) continue;                      /* la barra de indice se queda */
    if (e.closest('#xfade')) continue;                      /* la escena se queda */
    if (e.contains(document.querySelector('#xfade'))) continue;
    e.style.setProperty('display','none','important');
    fuera.push(e.className || e.tagName);
  }
  for (const s of ['#xfEsq', '.xf-go']) {                   /* textos de la escena */
    const n = document.querySelector(s);
    if (n) { n.style.setProperty('display','none','important'); fuera.push(s); }
  }
  return fuera;
});
console.log('  · piezas ocultas: ' + quitado.length);

await pg.evaluate(() => {
  const css = document.createElement('style');
  css.textContent = `
    .ban-url{position:fixed;z-index:9000;font-family:var(--m),ui-monospace,monospace;
      font-size:13px;letter-spacing:.30em;text-transform:lowercase;
      color:rgba(255,255,255,.80);pointer-events:none;white-space:nowrap;
      text-shadow:0 0 14px rgba(6,7,10,.95),0 0 4px rgba(6,7,10,.95)}
    .ban-url.tl{left:46px;top:40px}
    .ban-url.br{right:46px;bottom:40px}
    /* la palabra del centro es lo unico que hay que poder leer de un vistazo */
    #xfade .xf-word{color:#fff !important;font-size:18px !important;
      letter-spacing:.46em !important;
      text-shadow:0 0 26px rgba(4,7,16,.98),0 0 10px rgba(4,7,16,.95),
                  0 1px 2px rgba(4,7,16,.9) !important}`;
  document.head.appendChild(css);
  document.querySelector('.xf-word').textContent = 'Nereum Finance';
  for (const d of ['tl','br']) {
    const n = document.createElement('div');
    n.className = 'ban-url ' + d; n.textContent = 'nereum.xyz';
    document.body.appendChild(n);
  }
});

const sitio = await pg.evaluate((p) => {
  const sec = document.getElementById('xfade');
  let y = 0, n = sec; while (n) { y += n.offsetTop; n = n.offsetParent; }
  const run = Math.max(1, sec.offsetHeight - innerHeight);
  scrollTo(0, y + p * run);
  return { y, run };
}, %(punto)s);
console.log('  · escena en y=' + sitio.y + ', recorrido ' + sitio.run);

/* El enjambre se siembra al azar: hay tiradas en las que un cubo grande cae
   justo encima de la palabra del centro y se la come. Se mira la franja que
   hay detras del texto y, si viene cargada, se vuelve a tirar. */
const CLARO = 52, TAPADO = 0.045;   /* media de la franja y parte de ella comida */
let tirada = 0, franja = null;
for (; tirada < 8; tirada++) {
  await pg.waitForTimeout(3200);                            /* que el enjambre coja fondo */
  franja = await pg.evaluate(() => {
    const cv = document.getElementById('xfCv');
    const d = cv.width / cv.clientWidth;                     /* lienzo en pixeles de pantalla */
    const w = document.querySelector('.xf-word').getBoundingClientRect();
    const st = document.getElementById('xfStage').getBoundingClientRect();
    const px = Math.round((w.left - st.left - 24) * d), py = Math.round((w.top - st.top - 10) * d);
    const pw = Math.round((w.width + 48) * d), ph = Math.round((w.height + 20) * d);
    const im = cv.getContext('2d').getImageData(px, py, pw, ph).data;
    /* El pico no sirve de vara: con los cubos ya claros, un solo pixel
       brillante rozando la franja lo dispara y no habria tirada buena. Lo
       que estorba a la lectura es que una PARTE de la franja venga clara,
       asi que se cuenta cuanta. */
    let suma = 0, claros = 0, n = im.length / 4;
    for (let i = 0; i < im.length; i += 4) {
      const l = 0.2126*im[i] + 0.7152*im[i+1] + 0.0722*im[i+2];
      suma += l; if (l > 120) claros++;
    }
    return { media: suma / n, tapado: claros / n, caja: [px, py, pw, ph] };
  });
  if (franja.media < CLARO && franja.tapado < TAPADO) break;
  console.log('  · tirada ' + (tirada+1) + ': la palabra queda tapada (media ' +
              franja.media.toFixed(1) + ', ' + (franja.tapado*100).toFixed(1) + '%% comida) — se repite');
  await pg.reload({ waitUntil:'load' });
  await pg.evaluate(() => document.fonts && document.fonts.ready);
  await pg.waitForTimeout(900);
  await pg.evaluate(() => {                                  /* la pagina vuelve limpia */
    for (const e of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(e);
      if (cs.position !== 'fixed' && cs.position !== 'sticky') continue;
      if (e.closest('.srail') || e.closest('#xfade')) continue;
      if (e.contains(document.querySelector('#xfade'))) continue;
      e.style.setProperty('display','none','important');
    }
    for (const s of ['#xfEsq', '.xf-go']) {
      const n = document.querySelector(s);
      if (n) n.style.setProperty('display','none','important');
    }
    const css = document.createElement('style');
    css.textContent = `
      .ban-url{position:fixed;z-index:9000;font-family:var(--m),ui-monospace,monospace;
        font-size:13px;letter-spacing:.30em;text-transform:lowercase;
        color:rgba(255,255,255,.80);pointer-events:none;white-space:nowrap;
        text-shadow:0 0 14px rgba(6,7,10,.95),0 0 4px rgba(6,7,10,.95)}
      .ban-url.tl{left:46px;top:40px}
      .ban-url.br{right:46px;bottom:40px}
      #xfade .xf-word{color:#fff !important;font-size:18px !important;
        letter-spacing:.46em !important;
        text-shadow:0 0 26px rgba(4,7,16,.98),0 0 10px rgba(4,7,16,.95),
                    0 1px 2px rgba(4,7,16,.9) !important}`;
    document.head.appendChild(css);
    document.querySelector('.xf-word').textContent = 'Nereum Finance';
    for (const d of ['tl','br']) {
      const n = document.createElement('div');
      n.className = 'ban-url ' + d; n.textContent = 'nereum.xyz';
      document.body.appendChild(n);
    }
    const sec = document.getElementById('xfade');
    let y = 0, n = sec; while (n) { y += n.offsetTop; n = n.offsetParent; }
    scrollTo(0, y + %(punto)s * Math.max(1, sec.offsetHeight - innerHeight));
  });
}
if (!franja || franja.media >= CLARO || franja.tapado >= TAPADO) {
  console.log('  x ocho tiradas y la palabra sigue tapada'); process.exit(1);
}
console.log('  · palabra libre en la tirada ' + (tirada+1) + ' (media ' +
            franja.media.toFixed(1) + ', ' + (franja.tapado*100).toFixed(1) + '%% comida)');

const st = await pg.evaluate(() => {
  const s = document.getElementById('xfStage');
  return { lit:s.classList.contains('lit'), go:s.classList.contains('go'),
           rail:getComputedStyle(document.querySelector('.srail')).display };
});
if (!st.lit || st.go) { console.log('  x escena en mal punto: ' + JSON.stringify(st)); process.exit(1); }
if (st.rail === 'none') { console.log('  x falta la barra de indice'); process.exit(1); }
console.log('  · estado: ' + JSON.stringify(st));

await pg.screenshot({ path: '%(png2x)s' });
await nav.close();
'''

def parchea(dst):
    p = os.path.join(dst, 'index.html')
    L = open(p, encoding='utf-8').read().split('\n')
    hechos = {'cuantos': 0, 'ancho': 0}
    for i, ln in enumerate(L):
        if 'const cuantos=W<760?' in ln and 'HONDO' not in ln and hechos['cuantos'] == 0 \
           and 'haceVuelo' in '\n'.join(L[max(0, i - 3):i + 1]):
            L[i] = ln[:ln.index('const cuantos=')] + 'const cuantos=W<760?420:1000;'
            hechos['cuantos'] += 1
        elif '(Math.random()*2-1)*1.5' in ln and 'c.z' not in ln and 'x:' in ln and hechos['ancho'] == 0:
            L[i] = ln.replace('x:(Math.random()*2-1)*1.5', 'x:(Math.random()*2-1)*3.6') \
                     .replace('y:(Math.random()*2-1)*1.5', 'y:(Math.random()*2-1)*1.32')
            hechos['ancho'] += 1
        elif 'c.z+=HONDO' in ln and '(Math.random()*2-1)*1.5' in ln:
            L[i] = ln.replace('c.x=(Math.random()*2-1)*1.5', 'c.x=(Math.random()*2-1)*3.6') \
                     .replace('c.y=(Math.random()*2-1)*1.5', 'c.y=(Math.random()*2-1)*1.32')
            hechos['ancho'] += 1
    if hechos['cuantos'] != 1 or hechos['ancho'] != 2:
        sys.exit('  x la escena #xfade ha cambiado de forma: ' + repr(hechos))

    # En la web la escena se ve a pantalla completa y en movimiento, asi que
    # aguanta ser casi negra. Una foto quieta y pequena en una linea de tiempo
    # no: se lee como un rectangulo oscuro. Se le sube la luz.
    t = '\n'.join(L)
    luz = [
        # la paleta, un paso mas arriba (los mismos azules, no otros)
        ('const PAL=[[24,59,246],[8,28,196],[28,46,140],[48,53,128],[26,25,60],[4,13,104]];',
         'const PAL=[[58,102,255],[38,72,232],[62,88,186],[86,94,176],[62,60,112],[30,48,156]];'),
        # mas cubos claros entre los azules
        ('const cl=Math.random()<0.16;', 'const cl=Math.random()<0.24;'),
        # y todos menos transparentes
        ('a:cl?0.20+Math.random()*0.30 : 0.30+Math.random()*0.7',
         'a:cl?0.38+Math.random()*0.34 : 0.52+Math.random()*0.48'),
        # el suelo deja de ser casi negro...
        ("ctx.fillStyle='#06070A';ctx.fillRect(0,0,W,H);",
         "ctx.fillStyle='#0B1020';ctx.fillRect(0,0,W,H);"),
        # ...y las persianas, que a esta altura de la escena lo tapan entero,
        # tampoco: eran negro puro y por eso el suelo no se notaba nunca
        ("      const h=H*k, down=i%2===0, y=down?0:H-h;\n      ctx.fillStyle='#000000';",
         "      const h=H*k, down=i%2===0, y=down?0:H-h;\n      ctx.fillStyle='#0A1122';"),
    ]
    for a, b in luz:
        if t.count(a) != 1:
            sys.exit('  x no encuentro donde subir la luz: ' + a[:40])
        t = t.replace(a, b, 1)
    open(p, 'w', encoding='utf-8').write(t)
    print('  · escena abierta de lado, 1000 cubos y un paso mas de luz')

def main():
    if not os.path.exists(CROMO):
        sys.exit('  x no esta ' + CROMO)
    tmp = tempfile.mkdtemp(prefix='banner-cubos-')
    try:
        shutil.copy(os.path.join(RAIZ, 'index.html'), tmp)
        for d in ('assets', 'img'):
            shutil.copytree(os.path.join(RAIZ, d), os.path.join(tmp, d))
        parchea(tmp)

        srv = subprocess.Popen([sys.executable, '-m', 'http.server', PUERTO, '--bind', '127.0.0.1'],
                               cwd=tmp, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(1.5)
        try:
            png2x = os.path.join(tmp, 'banner-2x.png')
            js = os.path.join(tmp, 'render.mjs')
            open(js, 'w').write(RENDER % {
                'pw': os.path.join(RAIZ, 'node_modules', 'playwright', 'index.mjs'),
                'cromo': CROMO, 'puerto': PUERTO, 'punto': PUNTO, 'png2x': png2x})
            r = subprocess.run(['node', js], cwd=RAIZ)
            if r.returncode:
                sys.exit('  x el render ha fallado')
        finally:
            srv.send_signal(signal.SIGTERM); srv.wait()

        from PIL import Image
        im = Image.open(png2x).convert('RGB')
        if im.size != (3000, 1000):
            sys.exit('  x la foto no mide 3000x1000 sino ' + str(im.size))
        im.resize((1500, 500), Image.LANCZOS).save(SALIDA, optimize=True)
        print('  · %s  %d bytes  1500x500' % (SALIDA, os.path.getsize(SALIDA)))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

main()
