# -*- coding: utf-8 -*-
"""El umbral: la cifra que se cizalla y deja pasar a la ronda.

A la ronda -el sitio al que la pagina entera lleva- se llegaba sin nada: acaba
una seccion, empieza otra banda del mismo gris y ahi esta el precio.

Aqui hubo antes un instrumento: tres anillos concentricos con sus dientes de
medida, cruz de mira y destello al enganchar. Estaba bien hecho y estaba mal
elegido. Un reticulo de puntería con anillos girando es el cliché de HUD de
ciencia ficcion: se ha visto en mil pantallas de carga, no dice nada de esta
pagina y no aguanta una comparacion seria. Fuera entero.

Lo que hay ahora es una sola idea, y es la de la casa:

  LA CIFRA ES LA PUERTA. La tinta cubre la pantalla y la cifra de la ronda va
  RECORTADA en ella, a tamano colosal -media pantalla de alto-, de modo que no
  es un numero pintado encima: es un hueco, y por el hueco ya se ve la ronda
  que viene. Se lee el dato y se ve el destino a la vez.

  Y LA TINTA SE LIQUIDA. Al bajar, la plancha se cizalla en trece losas
  horizontales que se van cada una a su lado, las pares a la izquierda y las
  impares a la derecha, arrancando del centro hacia fuera. La cifra se
  descompone en tajadas que se desplazan, los huecos entre losas se abren, y
  por ellos entra la seccion entera. Cuando la ultima losa sale, la ronda esta
  puesta.

Por que asi y no de otra forma: el motivo de esta pagina son bloques que se
mueven a su sitio. La portada es un campo de losas. Que la puerta de la ronda
sea la misma materia -losas que se apartan- es lo unico que hace que la
transicion pertenezca a ESTA pagina y no a cualquiera.

Detalles que no son de gusto:

  · trece losas, impar, para que ninguna parta la cifra justo por el medio;
  · el desfase va del centro hacia fuera, no de arriba abajo: de arriba abajo
    parece una persiana;
  · la salida es rapida al principio y larga al final, que es como se mueve
    algo pesado al que sueltas;
  · el unico color es el filo de ataque de cada losa, encendido en proporcion
    a lo que corre. Color que aparece cuando pasa algo, no color de adorno;
  · y la tinta con la cifra recortada se dibuja UNA VEZ por medida, en un
    lienzo aparte. Las losas son tajadas suyas. Redibujar texto de media
    pantalla por cuadro no baja de los 16 ms.

La puerta se SOLAPA con la seccion de la ronda -100vh de margen negativo-, asi
que la ronda esta viva por debajo del escenario anclado y lo que se ve por los
huecos es el contenido de verdad, no un suelo de relleno. Esto es lo que
arregla el hueco en blanco que quedaba al final de la primera version.

La cifra no se escribe a mano: vive ya en tres sitios con una bateria que
exige que los tres digan lo mismo, asi que este es el cuarto, esta en el DOM
-invisible- y se engancha a la misma llamada. Si cambia, la plancha se rehace.

Con «prefers-reduced-motion» no hay puerta: la pagina pasa de largo.

`montar_home.py` lo aplica en el paso 37.
"""

MARCA = '/* ══ umbral ══'
FIN = '/* ══ fin: umbral ══ */'
SELLO_JS = '/* ── el umbral: la puerta de la ronda ── */'

CSS = """
/* ══ umbral ════════════════════════════════════════════════════════════════
   La cifra colosal que se cizalla en losas y deja pasar a la ronda. */
.umb{position:relative;height:230vh;z-index:3;
  margin-top:clamp(-36px,-3.4vw,-64px);
  /* La puerta es decoracion (aria-hidden) y esta ANCLADA ENCIMA de la ronda
     durante 100vh: si intercepta el puntero, durante ese tramo los botones de
     la ronda no se pueden pulsar. Lo canto probar_vista intentando un clic. */
  pointer-events:none;
  /* Y aqui esta lo que arregla el hueco en blanco: la puerta se SOLAPA con la
     seccion de la ronda, que asi ya esta viva por debajo del escenario
     anclado. Lo que se ve por los huecos es la ronda de verdad. */
  margin-bottom:-100vh}
.umb-esc{position:sticky;top:0;height:100dvh;overflow:hidden;background:transparent}
.umb-lz{position:absolute;inset:0;width:100%;height:100%;display:block}
/* La cifra vive en el DOM aunque se dibuje en el lienzo: es la misma cifra
   viva que la franja, la barra y la portada, y hay una bateria que exige que
   las cuatro digan lo mismo. Aqui esta, y no se ve. */
.umb-cifra{position:absolute;width:1px;height:1px;overflow:hidden;
  clip-path:inset(50%);white-space:nowrap}
@media(max-width:760px){.umb{height:200vh;margin-bottom:-90vh}}
@media(prefers-reduced-motion:reduce){
  .umb{height:0;margin-top:0;margin-bottom:0}
  .umb-esc{display:none}
}
/* ══ fin: umbral ══ */
"""

HTML = """<div class="umb" aria-hidden="true">
  <div class="umb-esc">
    <canvas class="umb-lz" id="umbLz"></canvas>
    <span class="umb-cifra" id="umbPct">85</span>
  </div>
</div>
"""

JS = """<script>
/* ── el umbral: la puerta de la ronda ── */
(function(){
  var raiz=document.querySelector('.umb'); if(!raiz) return;
  var lz=document.getElementById('umbLz'), num=document.getElementById('umbPct');
  var cx=lz.getContext('2d'); if(!cx) return;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var W=0,H=0,DPR=1,dentro=false,pide=0;
  var LOSAS=9;                        /* impar: ninguna losa parte la cifra por el medio */
  var placa=document.createElement('canvas'), pc=placa.getContext('2d');
  var cara='';

  function tipo(){
    /* la misma familia que los titulares de la pagina, leida de la pagina */
    var h=document.querySelector('.hero h1')||document.body;
    return getComputedStyle(h).fontFamily;
  }
  /* La plancha: la tinta con la cifra RECORTADA. Se dibuja una vez por medida
     y las losas no son mas que tajadas suyas, cada una desplazada. Redibujar
     texto gigante por cuadro es lo que habria hecho esto imposible a 60. */
  function plancha(){
    placa.width=Math.round(W*DPR); placa.height=Math.round(H*DPR);
    pc.setTransform(DPR,0,0,DPR,0,0);
    pc.clearRect(0,0,W,H);
    var g=pc.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#070B14'); g.addColorStop(0.55,'#04070C'); g.addColorStop(1,'#02040A');
    pc.fillStyle=g; pc.fillRect(0,0,W,H);
    /* la cifra, a cuchillo */
    var txt=(num.textContent||'85').replace(/[^0-9]/g,'')+'%';
    var tam=Math.min(W*0.62,H*0.95);
    pc.font='200 '+tam+'px '+cara;
    var an=pc.measureText(txt).width;
    if(an>W*0.86){ tam=tam*(W*0.86)/an; pc.font='200 '+tam+'px '+cara }
    pc.textAlign='center'; pc.textBaseline='middle';
    pc.globalCompositeOperation='destination-out';
    pc.fillStyle='#000';
    pc.fillText(txt,W/2,H/2+tam*0.02);
    pc.globalCompositeOperation='source-over';
  }
  function medir(){
    DPR=Math.min(2,window.devicePixelRatio||1);
    var r=lz.getBoundingClientRect();
    W=Math.max(1,r.width); H=Math.max(1,r.height);
    lz.width=Math.round(W*DPR); lz.height=Math.round(H*DPR);
    cx.setTransform(DPR,0,0,DPR,0,0);
    cara=tipo(); plancha();
  }
  function avance(){
    var r=raiz.getBoundingClientRect();
    var total=r.height-innerHeight;
    if(total<=0) return 1;
    return Math.min(1,Math.max(0,-r.top/total));
  }
  var suave=function(t){return t*t*(3-2*t)};
  var tramo=function(p,a,b){return suave(Math.min(1,Math.max(0,(p-a)/(b-a))))};
  /* la salida: rapida al principio y larga al final, que es como se mueve algo
     pesado al que sueltas */
  var pesa=function(t){return 1-Math.pow(1-t,2.6)};

  function dibuja(p){
    cx.clearRect(0,0,W,H);
    var alto=H/LOSAS;
    /* Cada losa arranca en su momento y se va a su lado: las pares a la
       izquierda, las impares a la derecha. El desfase va del centro hacia
       fuera, asi que la cifra se abre por el medio y no de arriba abajo, que
       es lo que la haria parecer una persiana. */
    for(var i=0;i<LOSAS;i++){
      var d=Math.abs(i-(LOSAS-1)/2)/((LOSAS-1)/2);   /* 0 centro, 1 extremos */
      /* El desfase es largo a proposito: con todas las losas saliendo a la
         vez lo que se ve es un glitch, y un glitch es otro cliché. Con esto
         solo hay dos o tres en movimiento en cada instante y se lee como un
         desmontaje deliberado. */
      var arranca=0.36+0.30*d;
      var t=pesa(Math.min(1,Math.max(0,(p-arranca)/(0.99-arranca))));
      var lado=(i%2===0)?-1:1;
      var dx=lado*t*(W*1.35);
      var y=i*alto;
      if(t>=1) continue;                              /* fuera de pantalla */
      cx.save();
      cx.beginPath(); cx.rect(0,y,W,alto+1); cx.clip();
      cx.drawImage(placa,
        0,Math.round(y*DPR),Math.round(W*DPR),Math.round((alto+1)*DPR),
        dx,y,W,alto+1);
      cx.restore();
      /* el filo de ataque, encendido en proporcion a lo que corre: es lo unico
         que lleva color, y solo mientras se mueve */
      if(t>0.001&&t<0.999){
        var borde=(lado<0)?(dx+W):dx;
        var lg=cx.createLinearGradient(borde-lado*90,0,borde,0);
        lg.addColorStop(0,'rgba(95,233,255,0)');
        lg.addColorStop(1,'rgba(95,233,255,'+(0.55*Math.sin(Math.PI*t)).toFixed(3)+')');
        cx.save();
        cx.beginPath(); cx.rect(0,y,W,alto+1); cx.clip();
        cx.fillStyle=lg; cx.fillRect(Math.min(borde,borde-lado*90),y,90,alto+1);
        cx.fillStyle='rgba(180,240,255,'+(0.75*Math.sin(Math.PI*t)).toFixed(3)+')';
        cx.fillRect(borde-(lado<0?1.5:0),y,1.5,alto+1);
        cx.restore();
      }
    }
  }
  function pinta(){
    pide=0;
    if(!dentro) return;
    dibuja(avance());
  }
  function pedir(){ if(!pide) pide=requestAnimationFrame(pinta) }
  new IntersectionObserver(function(ee){
    dentro=ee[0].isIntersecting;
    if(dentro){ medir(); pedir() }
  },{rootMargin:'160px 0px'}).observe(raiz);
  addEventListener('scroll',pedir,{passive:true});
  addEventListener('resize',function(){ medir(); pedir() },{passive:true});
  /* la cifra puede cambiar en vivo: si cambia, la plancha se rehace */
  new MutationObserver(function(){ if(W){ plancha(); pedir() } })
    .observe(num,{childList:true,characterData:true,subtree:true});
  if(document.fonts&&document.fonts.ready) document.fonts.ready.then(function(){ if(W){medir();pedir()} });
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
