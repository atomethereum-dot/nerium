# -*- coding: utf-8 -*-
"""Paso 35 · el campo de cubos, tambien en la portada.

La portada llevaba su campo de bloques, pero encima lleva dos vinetas negras
—una de ellas al 98,5 % en el centro— para que el titular se lea. Entre las
dos se comian el fondo: mirando la portada en un telefono no se veia nada.

Lo que si se ve, y bien, es el campo de cubos de la escena de fundido: el
corredor en tres dimensiones con las estelas. Se trae a la portada, con el
mismo dibujo, la misma paleta y la misma geometria; lo unico que cambia es de
donde saca la fuerza.

  · Alli la marca el scroll: la escena arranca parada y acelera segun bajas.
  · Aqui no hay scroll que valga —es lo primero que se ve, y quieto—, asi que
    va a una velocidad de crucero fija.

Y una cosa que alli no hace falta: el centro se calma. En la escena de fundido
el texto del medio es una linea fina en gris; aqui va el titular a 100 px, y
un cubo encendido cruzandole la A no es fondo, es estorbo. Cada pieza lleva un
factor por distancia al centro: del 28 % del radio hacia dentro no se dibuja
nada, y de ahi al 62 % entra poco a poco. El hueco es el del titular, no un
circulo cualquiera.

El lienzo va a «z-index:1», que es el de la vineta: como la vineta es el
«::before» de la seccion y el lienzo viene despues en el marcado, se pinta
ENCIMA de ella, y por eso se ve. El titular y los botones van a «z-index:2»,
asi que siguen por delante de todo.

Con movimiento reducido no se monta: la portada se queda como estaba.
"""

MARCA = '/* ══ vuelo ══ Lo aplica herramientas/vuelo.py ═══'
MARCA_JS = '/* ══ vuelo ══ El campo de cubos de la escena de fundido'

# ── el lienzo ────────────────────────────────────────────────────────────────
LIENZO_VIEJO = """<section class="hero" id="top" data-bg="#04070C" data-acc="#2F6BFF">
  <canvas id="burst"></canvas>"""
LIENZO_NUEVO = """<section class="hero" id="top" data-bg="#04070C" data-acc="#2F6BFF">
  <canvas id="burst"></canvas>
  <canvas id="heroCubos" aria-hidden="true"></canvas>"""

CSS_VIEJO = """#burst{position:absolute;inset:0;width:100%;height:100%}"""
CSS_NUEVO = """#burst{position:absolute;inset:0;width:100%;height:100%}
""" + MARCA + """═════════════════════════
   El campo de cubos de la escena de fundido, tambien aqui. Va al z-index de
   la vineta —el «::before» de la seccion— y despues que ella en el marcado,
   asi que se pinta encima y se ve. El titular va a 2 y sigue por delante. */
#heroCubos{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none}"""

# ── el vuelo ─────────────────────────────────────────────────────────────────
# Los numeros son los de la escena de fundido, uno por uno. Los dos que no:
#   FUERZA  alli sube de 0 a 1 con el scroll; aqui es fija.
#   VELOCE  alli es «0.9 + fuerza*3.4», que a plena marcha cruza la pantalla
#           en tres segundos. Aqui va a dos tercios de eso, que es el paso al
#           que se lee como un corredor y no como un fondo que tiembla.
JS_VIEJO = """(function(){
  const esq=document.getElementById('xfEsq');"""
JS_NUEVO = """(function(){
  /* ══ vuelo ══ El campo de cubos de la escena de fundido, en la portada.
     Mismo dibujo, misma paleta, misma geometria. Cambian dos cosas: la fuerza
     es fija —aqui no hay scroll que la marque— y el centro se calma, que ahi
     va el titular. */
  const cv=document.getElementById('heroCubos');
  if(!cv||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const ctx=cv.getContext('2d');
  const PAL=[[77,162,255],[42,91,255],[130,190,255],[255,255,255],[120,145,190],[30,60,150]];
  const HONDO=9, FUERZA=0.92, VELOCE=2.80;
  let W=0,H=0,piezas=null,antes=0;
  function mide(){
    const d=Math.min(devicePixelRatio||1,2);
    W=cv.clientWidth; H=cv.clientHeight;
    if(!W||!H)return;
    cv.width=W*d; cv.height=H*d; ctx.setTransform(d,0,0,d,0,0);
    piezas=null;
  }
  function siembra(){
    piezas=[];
    const cuantas=W<760?260:480;
    for(let i=0;i<cuantas;i++)piezas.push({
      x:(Math.random()*2-1)*1.5, y:(Math.random()*2-1)*1.5,
      z:Math.random()*HONDO+0.35,
      giro:Math.random()*Math.PI, vg:(Math.random()*2-1)*0.5,
      lado:0.12+Math.random()*0.30,
      c:PAL[(Math.random()*PAL.length)|0],
      a:0.30+Math.random()*0.7});
  }
  mide();
  addEventListener('resize',mide,{passive:true});
  if(window.ResizeObserver) new ResizeObserver(mide).observe(cv);
  (function pinta(){
    requestAnimationFrame(pinta);
    if(!W){mide(); if(!W)return}
    if(!piezas)siembra();
    const ahora=performance.now()/1000;
    const dt=Math.min(.05,(ahora-antes)||.016); antes=ahora;
    ctx.clearRect(0,0,W,H);
    const cx=W/2, cy=H/2, foco=Math.min(W,H)*0.92, vel=VELOCE*dt;
    ctx.globalCompositeOperation='lighter';
    for(const c of piezas){
      const zAntes=c.z;
      c.z-=vel;
      if(c.z<0.30){ c.z+=HONDO; c.x=(Math.random()*2-1)*1.5; c.y=(Math.random()*2-1)*1.5 }
      c.giro+=c.vg*dt;
      const k=foco/c.z, kA=foco/zAntes;
      const px=cx+c.x*k, py=cy+c.y*k;
      const lado=Math.min(Math.min(W,H)*0.30, Math.max(1.4, c.lado*k*0.30));
      if(px<-lado*2||px>W+lado*2||py<-lado*2||py>H+lado*2)continue;
      /* el hueco del titular. No es un circulo: el titular es una BANDA
         —ancha y baja—, asi que el hueco tiene su forma. Un circulo se
         llevaba por delante justo las piezas que pasan cerca y se hacen
         grandes, que son las que dan el efecto. */
      const r=Math.hypot((px-cx)/(W*.60),(py-cy)/(H*.26));
      const hueco=Math.min(1,Math.max(0,(r-0.62)/0.55));
      if(hueco<=0)continue;
      const cerca=1-Math.min(1,(c.z-0.30)/HONDO);
      /* Y se apaga lo que pasa DEMASIADO cerca. Una pieza a punto de cruzar
         la camara se hace enorme y opaca, y deja de leerse como un cubo que
         pasa: es una plancha gris parada en medio de la portada. Del ultimo
         palmo del corredor se va disolviendo, que es lo que hace una camara
         de verdad. */
      const roza=Math.min(1,(c.z-0.30)/0.95);
      const a=c.a*cerca*cerca*roza*FUERZA*hueco;
      if(a<0.012)continue;
      const ax=cx+c.x*kA, ay=cy+c.y*kA;
      const dx=px-ax, dy=py-ay;
      if(dx*dx+dy*dy>4){
        ctx.strokeStyle='rgba('+c.c.join(',')+','+(a*0.55).toFixed(3)+')';
        ctx.lineWidth=Math.max(1,lado*0.6);
        ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(px,py); ctx.stroke();
      }
      ctx.save();
      ctx.translate(px,py);
      ctx.rotate(c.giro);
      ctx.fillStyle='rgba('+c.c.join(',')+','+a.toFixed(3)+')';
      ctx.fillRect(-lado/2,-lado/2,lado,lado);
      ctx.fillStyle='rgba(255,255,255,'+(a*0.5).toFixed(3)+')';
      ctx.fillRect(-lado/2,-lado/2,lado,Math.max(1,lado*0.16));
      ctx.restore();
    }
    ctx.globalCompositeOperation='source-over';
  })();
})();
(function(){
  const esq=document.getElementById('xfEsq');"""


# ── y se apaga el campo de losas ─────────────────────────────────────────────
# La portada llevaba dos fondos a la vez: las losas planas —tres planos de
# celdas, del paso 12— y los cubos. Juntos no se leen: las losas son grandes y
# planas y los cubos pequenos y con volumen, y cada uno le quita sitio al otro.
# Se queda el de cubos.
#
# El lienzo de las losas NO se quita del marcado, y no es por prudencia: de el
# cuelga la entrada de la portada —el lockup que se borra, las lamas, el suelo
# de luz—, que empieza por «if(!cv||!inn)return». Sin el lienzo no hay entrada.
# Lo que se corta es que se pinte: no arranca el motor y el lienzo se esconde.
LOSAS_VIEJO = """if(!campoGL()){ window.__campo='canvas'; campo2D(); }"""
LOSAS_NUEVO = """/* El campo de losas se queda apagado: la portada va con los cubos. El lienzo
   sigue en el marcado porque de el cuelga la entrada —el lockup, las lamas, el
   suelo de luz—, pero no se le pone motor ni se pinta. */
window.__campo='apagado';"""
LOSAS_CSS_VIEJO = """#heroCubos{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none}"""
LOSAS_CSS_NUEVO = """#heroCubos{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none}
#burst{display:none}
/* Sin las losas debajo, las dos vinetas de la portada —uma al 98,5 % en el
   centro— ya no tapan un fondo: tapan los cubos. Se abren, que el hueco del
   titular lo hace ahora el propio campo, pieza a pieza. */
.hero::before{background:radial-gradient(ellipse 58% 44% at 50% 47%,rgba(0,0,0,.72),rgba(0,0,0,0) 74%)}
.hero::after{background:radial-gradient(ellipse 46% 38% at 50% 44%,rgba(0,0,0,.42),rgba(0,0,0,0) 72%)}"""


CAMBIOS = [
    ('el lienzo de la portada', LIENZO_VIEJO, LIENZO_NUEVO),
    ('su sitio en la pila', CSS_VIEJO, CSS_NUEVO),
    ('el vuelo', JS_VIEJO, JS_NUEVO),
    ('fuera el campo de losas', LOSAS_VIEJO, LOSAS_NUEVO),
    ('y sus vinetas, mas abiertas', LOSAS_CSS_VIEJO, LOSAS_CSS_NUEVO),
]


def aplicar(html):
    """Idempotente: si el cambio ya esta, no lo repite.

    El bloque del vuelo TERMINA con el texto que lo ancla —se mete delante de
    la escena de fundido—, asi que el ancla sigue ahi despues de ponerlo y
    comparar «nuevo in html» no basta: al cambiar una constante, el ancla
    volvia a encajar y el bloque se metia dos veces. Se mira la marca."""
    if MARCA_JS in html:
        return html
    for nombre, viejo, nuevo in CAMBIOS:
        if nuevo in html:
            continue
        assert html.count(viejo) == 1, 'no esta, o esta repetido: ' + nombre
        html = html.replace(viejo, nuevo, 1)
    return html


if __name__ == '__main__':
    import sys, io
    p = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
    s = io.open(p, encoding='utf-8').read()
    salida = aplicar(s)
    io.open(p, 'w', encoding='utf-8').write(salida)
    print('vuelo aplicado')
