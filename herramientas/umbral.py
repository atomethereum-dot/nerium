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
  la apertura      (.56 → .96) el diafragma abre, y por el hueco no hay
                   dibujo: esta LA RONDA. La camara se va en cuanto el hueco
                   la come.

Y eso ultimo es literal. La puerta se SOLAPA con la seccion de la ronda -100vh
de margen negativo- de modo que la ronda ya esta ahi debajo, viva, mientras el
escenario sigue anclado encima. El lienzo pinta la camara y le recorta el hueco
con destination-out, asi que por el diafragma aparece el contenido de verdad.

Esto es lo que arregla el hueco en blanco de la primera version: alli el iris
abria sobre un suelo vacio y quedaban casi mil pixeles de pantalla sin nada
hasta que llegaba la seccion. Medido contando textos visibles: tres —los tres
del HUD— desde el 80 % del recorrido hasta pasado el final.

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
   La camara oscura que se abre sobre la ronda. */
.umb{position:relative;height:210vh;z-index:3;
  /* La puerta es decoracion (aria-hidden) y esta ANCLADA ENCIMA de la ronda
     durante 100vh: si intercepta el puntero, durante ese tramo los botones de
     la ronda no se pueden pulsar. Lo canto probar_vista intentando un clic. */
  pointer-events:none;
  margin-top:clamp(-36px,-3.4vw,-64px);
  /* Y aqui esta lo que arregla el hueco en blanco: la puerta se SOLAPA con la
     seccion de la ronda. Antes el iris abria sobre el suelo vacio y quedaban
     casi mil pixeles de pantalla sin nada hasta que llegaba el contenido.
     Ahora la ronda empieza 100vh antes, por debajo del escenario anclado, y
     lo que aparece por el hueco del iris es la ronda de verdad. */
  margin-bottom:-100vh}
.umb-esc{position:sticky;top:0;height:100dvh;overflow:hidden;
  /* transparente: la cortina la pinta el lienzo, y debajo esta la ronda */
  background:transparent}
.umb-lz{position:absolute;inset:0;width:100%;height:100%;display:block}
.umb-hud{position:absolute;inset:0;display:grid;place-items:center;
  pointer-events:none;text-align:center;
  font-family:var(--m);color:#E9EEF7}
.umb-caja{display:flex;flex-direction:column;align-items:center;gap:clamp(12px,1.6vw,20px);
  opacity:0;transform:translateY(14px);will-change:opacity,transform}
.umb-k{font-size:11px;letter-spacing:.26em;color:#5FE9FF}
.umb-n{display:flex;align-items:baseline;gap:.06em;
  font-family:var(--f);font-weight:200;letter-spacing:-.05em;
  font-size:clamp(76px,13vw,190px);line-height:.88;color:#fff;
  font-variant-numeric:tabular-nums}
.umb-n i{font-style:normal;font-size:.42em;color:#5FE9FF;font-weight:300}
.umb-sub{font-size:11px;letter-spacing:.2em;color:rgba(233,238,247,.66)}
@media(max-width:760px){
  .umb{height:190vh;margin-bottom:-90vh}
  .umb-k,.umb-sub{font-size:9.5px;letter-spacing:.18em}
}
@media(prefers-reduced-motion:reduce){
  .umb{height:0;margin-top:0;margin-bottom:0}
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
  /* La paleta: el azul de la casa, cian y violeta. El color no es decoracion
     aqui —es lo que separa el aparato frio de arriba del momento en que
     engancha—: los anillos entran en azul apagado y en el enganche viran a
     cian encendido. */
  var AZUL=[47,107,255], CIAN=[95,233,255], VIOLETA=[150,90,255];
  function mez(a,b,t){return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]}
  function tinta(c,al){return 'rgba('+(c[0]|0)+','+(c[1]|0)+','+(c[2]|0)+','+al.toFixed(3)+')'}

  var DIENTES=60;
  function anillo(R,seg,hueco,ang,alfa,grueso,color,brillo){
    cx.save(); cx.translate(W/2,H/2); cx.rotate(ang);
    cx.strokeStyle=tinta(color,alfa);
    cx.lineWidth=grueso; cx.lineCap='butt';
    if(brillo>0){ cx.shadowColor=tinta(color,0.9); cx.shadowBlur=brillo }
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
    var R=Math.min(W,H)*0.29;
    var enc=tramo(p,0.34,0.54);              /* el enganche */
    var ab=tramo(p,0.56,0.96);               /* la apertura */

    /* 1 · la camara, con su propio campo de color. Un negro plano era una
       pantalla apagada; esto es una camara con algo encendido dentro. */
    cx.fillStyle='#04070C';
    cx.fillRect(0,0,W,H);
    var halo=cx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*0.62);
    var fuerza=(0.10+0.42*enc)*(1-ab*0.55);
    halo.addColorStop(0,   tinta(mez(AZUL,CIAN,enc), 0.30*fuerza*3));
    halo.addColorStop(0.42,tinta(mez(AZUL,VIOLETA,enc*0.6), 0.16*fuerza*3));
    halo.addColorStop(1,   'rgba(4,7,12,0)');
    cx.fillStyle=halo; cx.fillRect(0,0,W,H);

    /* 2 · el instrumento */
    var vis=tramo(p,0.02,0.20)*(1-tramo(p,0.74,0.92));
    if(vis>0.002){
      var giro=(1-enc), col=mez(AZUL,CIAN,enc), bri=16*enc;
      anillo(R*1.34,DIENTES,0.42, giro*1.10, 0.46*vis, 1,   mez(AZUL,VIOLETA,enc*0.5), bri*0.4);
      anillo(R*1.06,24,0.34,      -giro*1.70, 0.66*vis, 1.5, col, bri*0.7);
      anillo(R*0.82,8, 0.18,       giro*2.40, 0.88*vis, 2.5, col, bri);

      cx.save(); cx.translate(W/2,H/2);
      for(var i=0;i<DIENTES;i++){
        var a=i*Math.PI*2/DIENTES, lg=(i%5===0)?12:6;
        cx.strokeStyle=tinta(mez(AZUL,CIAN,enc), ((i%5===0)?0.85:0.42)*vis);
        cx.lineWidth=1;
        cx.beginPath();
        cx.moveTo(Math.cos(a)*(R*1.46),Math.sin(a)*(R*1.46));
        cx.lineTo(Math.cos(a)*(R*1.46+lg),Math.sin(a)*(R*1.46+lg));
        cx.stroke();
      }
      /* la cruz de mira */
      var c=tramo(p,0.30,0.56), largo=R*2.6*(1-c)+R*0.30*c;
      cx.strokeStyle=tinta(mez(AZUL,CIAN,enc), 0.72*vis*c);
      cx.lineWidth=1;
      cx.beginPath();
      cx.moveTo(-largo,0); cx.lineTo(-R*0.16,0);
      cx.moveTo(R*0.16,0);  cx.lineTo(largo,0);
      cx.moveTo(0,-largo); cx.lineTo(0,-R*0.16);
      cx.moveTo(0,R*0.16);  cx.lineTo(0,largo);
      cx.stroke();
      /* y el destello del enganche: un anillo que sale disparado justo en el
         instante en que los tres caen en linea */
      var chas=tramo(p,0.46,0.56)*(1-tramo(p,0.56,0.70));
      if(chas>0.01){
        cx.strokeStyle=tinta(CIAN,0.85*chas);
        cx.lineWidth=2*chas;
        cx.shadowColor=tinta(CIAN,0.9); cx.shadowBlur=24*chas;
        cx.beginPath(); cx.arc(0,0,R*(0.82+1.9*(1-chas)),0,Math.PI*2); cx.stroke();
      }
      cx.restore();
    }

    /* 3 · la apertura: un iris de doce palas. No se pinta luz —se RECORTA la
       camara con destination-out y detras esta la seccion de la ronda—. */
    if(ab>0){
      var PALAS=12;
      var diag=Math.sqrt(W*W+H*H)*0.62;
      var rad=Math.pow(ab,1.20)*diag;
      var gir=(1-ab)*0.42;
      var camino=function(k){
        cx.beginPath();
        for(var i=0;i<=PALAS;i++){
          var a=gir+i*Math.PI*2/PALAS;
          var x=W/2+Math.cos(a)*rad*k, y=H/2+Math.sin(a)*rad*k;
          if(i===0)cx.moveTo(x,y); else cx.lineTo(x,y);
        }
        cx.closePath();
      };
      /* el filo, en color, ANTES de recortar: asi el borde del diafragma
         queda encendido en vez de ser un corte seco */
      if(ab<0.995){
        cx.save();
        cx.strokeStyle=tinta(CIAN,0.85*(1-ab));
        cx.lineWidth=2.5; cx.shadowColor=tinta(CIAN,0.9); cx.shadowBlur=26*(1-ab);
        camino(1); cx.stroke();
        cx.strokeStyle=tinta(VIOLETA,0.45*(1-ab));
        cx.lineWidth=1; cx.shadowBlur=0;
        camino(1.075); cx.stroke();
        cx.restore();
      }
      cx.save();
      cx.globalCompositeOperation='destination-out';
      /* OPACO, y esto no es un detalle: destination-out borra EN PROPORCION al
         alfa de lo que pintas. El fillStyle que quedaba puesto era el
         degradado del halo, cuya ultima parada es transparente, asi que el
         iris borraba a medias y la ronda se quedaba detras de un velo oscuro
         para siempre. Se veia como «la pagina en blanco» del final. */
      cx.fillStyle='#000';
      camino(1); cx.fill();
      cx.restore();
    }
  }
  function pinta(){
    pide=0;
    if(!dentro) return;
    var p=avance();
    dibuja(p);
    var e=tramo(p,0.24,0.44)*(1-tramo(p,0.52,0.66));
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
