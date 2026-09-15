# -*- coding: utf-8 -*-
"""El umbral: la puerta que se abre justo antes de la ronda.

La ronda es el sitio al que la pagina entera lleva, y se llegaba a ella sin
nada: la seccion anterior acaba, empieza otra banda del mismo gris y ahi esta
el precio. Ni un cambio de aire, ni un respiro, ni una senal de que lo que
viene es distinto de lo que se estaba leyendo.

Esto es esa senal. Una camara oscura de dos pantallas de alto, anclada, con el
scroll como mando: no se reproduce sola, se OPERA. Tres tiempos.

  el instrumento   (0 → .42) tres anillos concentricos con sus dientes de
                   medida, desalineados, girando cada uno a su paso. Nada de
                   resplandor: trazo fino, como la caratula de un aparato.
  el enganche      (.42 → .62) los tres anillos caen en linea de golpe, la
                   cruz de mira converge y la cifra de la ronda se engancha.
                   Es el momento en que el aparato dice «listo».
  la apertura      (.62 → 1) el diafragma abre, y por el hueco no hay dibujo:
                   hay LUZ, que es el suelo de la ronda esperando detras. La
                   camara se va en cuanto el hueco la come, y la pagina sale a
                   la seccion de la ronda sin corte.

Lo que hay detras del lienzo es, literalmente, el color de la banda que viene.
El lienzo pinta la camara encima y le RECORTA el hueco con destination-out, de
modo que la apertura no es un degradado imitando luz: es el propio fondo de la
ronda apareciendo. Por eso el paso de una seccion a la otra no tiene costura.

Tres decisiones que no son de gusto:

  · Va en un <div> entre las dos secciones, no en una <section>. Como
    <section> entraria en el indice de la derecha, en el contador de bandas y
    en el reparto del lienzo fijo, y habria que tocar cuatro sitios para meter
    una cosa que no es una seccion: es una puerta.
  · Y no va DENTRO de la seccion de la ronda, aunque sea lo que parece: «.sale»
    lleva overflow:hidden, que crea contenedor de scroll, y ahi dentro un
    position:sticky se queda clavado en su sitio y no ancla nada.
  · La cifra no se escribe a mano. Vive ya en tres sitios y hay una bateria que
    exige que los tres digan lo mismo; este es el cuarto y se engancha a la
    misma llamada que mueve los otros.

Con «prefers-reduced-motion» no hay camara: la puerta se queda abierta y la
pagina pasa de largo.

`montar_home.py` lo aplica en el paso 37.
"""

MARCA = '/* ══ umbral ══'
FIN = '/* ══ fin: umbral ══ */'
SELLO_JS = '/* ── el umbral: la puerta de la ronda ── */'

CSS = """
/* ══ umbral ════════════════════════════════════════════════════════════════
   La camara oscura que se abre antes de la ronda. */
.umb{position:relative;height:220vh;z-index:1;
  margin-top:clamp(-36px,-3.4vw,-64px)}
.umb-esc{position:sticky;top:0;height:100dvh;overflow:hidden;
  /* El fondo ES el suelo de la ronda: lo que aparece por el hueco del
     diafragma no imita la luz, es la banda que viene. */
  background:var(--suelo)}
.umb-lz{position:absolute;inset:0;width:100%;height:100%;display:block}
.umb-hud{position:absolute;inset:0;display:grid;place-items:center;
  pointer-events:none;text-align:center;
  font-family:var(--m);color:#E9EEF7}
.umb-caja{display:flex;flex-direction:column;align-items:center;gap:clamp(12px,1.6vw,20px);
  opacity:0;transform:translateY(14px);will-change:opacity,transform}
.umb-k{font-size:11px;letter-spacing:.26em;color:#79ABFF}
.umb-n{display:flex;align-items:baseline;gap:.06em;
  font-family:var(--f);font-weight:200;letter-spacing:-.05em;
  font-size:clamp(76px,13vw,190px);line-height:.88;color:#fff;
  font-variant-numeric:tabular-nums}
.umb-n i{font-style:normal;font-size:.42em;color:#79ABFF;font-weight:300}
.umb-sub{font-size:11px;letter-spacing:.2em;color:rgba(233,238,247,.62)}
@media(max-width:760px){
  .umb{height:200vh}
  .umb-k,.umb-sub{font-size:9.5px;letter-spacing:.18em}
}
@media(prefers-reduced-motion:reduce){
  .umb{height:0;margin-top:0}
  .umb-esc{display:none}
}
/* ══ fin: umbral ══ */
"""

HTML = """<div class="umb" aria-hidden="true">
  <div class="umb-esc">
    <canvas class="umb-lz" id="umbLz"></canvas>
    <div class="umb-hud"><div class="umb-caja" id="umbCaja">
      <span class="umb-k">SEED ROUND</span>
      <span class="umb-n"><b id="umbPct">85</b><i>%</i></span>
      <span class="umb-sub">1 NRM = $0.20 &#183; ETHEREUM &#183; BNB CHAIN</span>
    </div></div>
  </div>
</div>
"""

JS = """<script>
/* ── el umbral: la puerta de la ronda ── */
(function(){
  var raiz=document.querySelector('.umb'); if(!raiz) return;
  var lz=document.getElementById('umbLz'), caja=document.getElementById('umbCaja');
  var cx=lz.getContext('2d'); if(!cx) return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var W=0,H=0,DPR=1,dentro=false,pide=0;
  function medir(){
    DPR=Math.min(2,window.devicePixelRatio||1);
    var r=lz.getBoundingClientRect();
    W=Math.max(1,r.width); H=Math.max(1,r.height);
    lz.width=Math.round(W*DPR); lz.height=Math.round(H*DPR);
    cx.setTransform(DPR,0,0,DPR,0,0);
  }
  /* El mando es el scroll: p va de 0 a 1 mientras la caja alta recorre la
     pantalla. No hay reloj, asi que la escena no se adelanta ni se pierde. */
  function avance(){
    var r=raiz.getBoundingClientRect();
    var total=r.height-innerHeight;
    if(total<=0) return 1;
    return Math.min(1,Math.max(0,-r.top/total));
  }
  var suave=function(t){return t*t*(3-2*t)};
  var tramo=function(p,a,b){return suave(Math.min(1,Math.max(0,(p-a)/(b-a))))};

  var DIENTES=60;
  function anillo(g,R,seg,hueco,ang,alfa,grueso){
    cx.save(); cx.translate(W/2,H/2); cx.rotate(ang);
    cx.strokeStyle='rgba(150,185,255,'+alfa.toFixed(3)+')';
    cx.lineWidth=grueso; cx.lineCap='butt';
    var paso=Math.PI*2/seg;
    for(var i=0;i<seg;i++){
      cx.beginPath();
      cx.arc(0,0,R,i*paso,i*paso+paso*(1-hueco));
      cx.stroke();
    }
    cx.restore();
  }
  function dibuja(p){
    cx.clearRect(0,0,W,H);
    /* la camara */
    cx.fillStyle='#04070C';
    cx.fillRect(0,0,W,H);
    var R=Math.min(W,H)*0.29;

    /* 1 · el instrumento: tres anillos que llegan desalineados */
    var vis=tramo(p,0.02,0.20)*(1-tramo(p,0.72,0.92));
    if(vis>0.002){
      var enc=tramo(p,0.34,0.52);              /* el enganche */
      var giro=(1-enc);
      anillo(cx,R*1.34,DIENTES,0.42, giro*1.10, 0.46*vis, 1);
      anillo(cx,R*1.06,24,0.34,      -giro*1.70, 0.62*vis, 1.5);
      anillo(cx,R*0.82,8, 0.18,       giro*2.40, 0.80*vis, 2.5);

      /* los dientes de medida, cada cinco mas largo */
      cx.save(); cx.translate(W/2,H/2);
      for(var i=0;i<DIENTES;i++){
        var a=i*Math.PI*2/DIENTES, lg=(i%5===0)?12:6;
        cx.strokeStyle='rgba(150,185,255,'+(((i%5===0)?0.80:0.40)*vis).toFixed(3)+')';
        cx.lineWidth=1;
        cx.beginPath();
        cx.moveTo(Math.cos(a)*(R*1.46),Math.sin(a)*(R*1.46));
        cx.lineTo(Math.cos(a)*(R*1.46+lg),Math.sin(a)*(R*1.46+lg));
        cx.stroke();
      }
      /* 2 · la cruz de mira, que converge */
      var c=tramo(p,0.30,0.56), largo=R*2.6*(1-c)+R*0.30*c;
      cx.strokeStyle='rgba(120,170,255,'+(0.70*vis*c).toFixed(3)+')';
      cx.lineWidth=1;
      cx.beginPath();
      cx.moveTo(-largo,0); cx.lineTo(-R*0.16,0);
      cx.moveTo(R*0.16,0);  cx.lineTo(largo,0);
      cx.moveTo(0,-largo); cx.lineTo(0,-R*0.16);
      cx.moveTo(0,R*0.16);  cx.lineTo(0,largo);
      cx.stroke();
      cx.restore();
    }

    /* 3 · la apertura: un iris de doce palas. No se pinta luz —se RECORTA la
       camara con destination-out y detras esta el suelo de la ronda—. Un
       ovalo daba una mancha; doce palas rectas dan un mecanismo, que es lo
       que se abre de verdad en un objetivo. */
    var ab=tramo(p,0.58,1.00);
    if(ab>0){
      var PALAS=12;
      /* el radio pasa de cero a mas que la diagonal, para comerse la pantalla */
      var diag=Math.sqrt(W*W+H*H)*0.62;
      var rad=Math.pow(ab,1.32)*diag;
      /* y las palas giran mientras abren, como el anillo de un objetivo */
      var gir=(1-ab)*0.42;
      var camino=function(){
        cx.beginPath();
        for(var i=0;i<=PALAS;i++){
          var a=gir+i*Math.PI*2/PALAS;
          var x=W/2+Math.cos(a)*rad, y=H/2+Math.sin(a)*rad;
          if(i===0)cx.moveTo(x,y); else cx.lineTo(x,y);
        }
        cx.closePath();
      };
      cx.save();
      cx.globalCompositeOperation='destination-out';
      camino(); cx.fill();
      cx.restore();
      /* el filo, y un segundo anillo de palas por fuera que lo acompaña */
      if(ab<0.99){
        cx.save();
        cx.strokeStyle='rgba(170,205,255,'+(0.62*(1-ab)).toFixed(3)+')';
        cx.lineWidth=1.5; camino(); cx.stroke();
        cx.strokeStyle='rgba(120,170,255,'+(0.26*(1-ab)).toFixed(3)+')';
        cx.lineWidth=1;
        cx.beginPath();
        for(var k=0;k<PALAS;k++){
          var a2=gir+k*Math.PI*2/PALAS;
          cx.moveTo(W/2+Math.cos(a2)*rad, H/2+Math.sin(a2)*rad);
          cx.lineTo(W/2+Math.cos(a2)*(rad*1.16+18), H/2+Math.sin(a2)*(rad*1.16+18));
        }
        cx.stroke();
        cx.restore();
      }
    }
  }
  var visto=-1;
  function pinta(){
    pide=0;
    if(!dentro) return;
    var p=avance();
    dibuja(p);
    /* la cifra entra con el enganche y se va con la apertura */
    var e=tramo(p,0.24,0.44)*(1-tramo(p,0.54,0.68));
    caja.style.opacity=e.toFixed(3);
    caja.style.transform='translateY('+((1-e)*14).toFixed(1)+'px)';
  }
  function pedir(){ if(!pide) pide=requestAnimationFrame(pinta) }
  new IntersectionObserver(function(ee){
    dentro=ee[0].isIntersecting;
    if(dentro){ medir(); pedir() }
  },{rootMargin:'120px 0px'}).observe(raiz);
  addEventListener('scroll',pedir,{passive:true});
  addEventListener('resize',function(){ medir(); pedir() },{passive:true});
  medir(); pedir();
})();
</script>
"""


def aplicar(html):
    """Idempotente."""
    if MARCA in html:
        i = html.index(MARCA)
        j = html.index(FIN, i) + len(FIN)
        html = html[:i] + CSS.strip('\n') + html[j:]
    else:
        assert html.count('\n</style>') == 1
        html = html.replace('\n</style>', '\n' + CSS.strip('\n') + '\n</style>', 1)

    if 'class="umb"' not in html:
        ancla = '<section class="sale" id="presale"'
        assert html.count(ancla) == 1, 'no esta la seccion de la ronda'
        html = html.replace(ancla, HTML + ancla, 1)

    if SELLO_JS not in html:
        assert html.count('</body>') == 1
        html = html.replace('</body>', JS + '</body>', 1)

    # La cifra no se escribe a mano: se engancha a la misma llamada que ya
    # mueve la franja, la barra de la ronda y la linea de la portada.
    gancho = "var hp=document.getElementById('heroPct');"
    assert gancho in html, 'no esta el gancho de la cifra en la portada'
    # El guardia mira SU PROPIA linea, no el contexto. La primera version
    # miraba si «umbPct» salia DESPUES del gancho, y el enganche va justo
    # ANTES: nunca lo encontraba y lo metio cuatro veces seguidas.
    linea = "var up=document.getElementById('umbPct');"
    if linea not in html:
        html = html.replace(gancho,
            linea + "\n"
            "  if(up) up.textContent=Math.round(p);\n"
            "  " + gancho, 1)
    assert html.count(linea) == 1, 'el enganche de la cifra esta repetido'
    return html
