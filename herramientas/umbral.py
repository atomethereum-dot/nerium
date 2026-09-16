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
  var cara='', tamCifra=0, meta=0.85;

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
    /* La cifra baja de tamano para dejarle sitio a la barra: antes ocupaba
       casi toda la altura y la barra acababa aplastada contra el canto. */
    var tam=Math.min(W*0.58,H*0.66);
    pc.font='200 '+tam+'px '+cara;
    var an=pc.measureText(txt).width;
    if(an>W*0.86){ tam=tam*(W*0.86)/an; pc.font='200 '+tam+'px '+cara }
    pc.textAlign='center'; pc.textBaseline='middle';
    pc.globalCompositeOperation='destination-out';
    pc.fillStyle='#000';
    pc.fillText(txt,W/2,H/2-tam*0.10);
    pc.globalCompositeOperation='source-over';
    tamCifra=tam;
    meta=Math.min(1,Math.max(0,(parseFloat(num.textContent)||85)/100));
    reticula(tam);
  }
  /* ── la cifra se ARMA, no aparece ─────────────────────────────────────
     La cifra es un hueco recortado en la tinta, y un hueco o esta o no esta:
     entraba de golpe, ya hecha. Ahora entra como se construye una cifra en una
     pantalla, pixel a pixel, barriendo de izquierda a derecha.

     Lo que NO se puede hacer es rehacer la plancha cada cuadro: dibujar texto
     de medio metro sesenta veces por segundo es justo lo que hacia esto
     imposible, y por eso la plancha se dibuja una vez por medida. Asi que el
     recorte se queda entero y lo que se mueve es la TAPA: se vuelve a cubrir
     con tinta cada celda que todavia no ha llegado, y se destapan por orden.
     Un fillRect por celda, sin texto y sin sombra.

     Las celdas se sacan preguntandole al alfa de la plancha donde hay hueco
     -una vez, al medir-, no calculando donde deberia estar la cifra: asi vale
     para cualquier numero y cualquier tipografia sin tocar nada. */
  var celdas=[], LADO=0;

  function reticula(tam){
    LADO=Math.max(12,Math.round(tam/16));
    celdas.length=0;
    var d=pc.getImageData(0,0,placa.width,placa.height).data;
    var anc=placa.width;
    var nc=Math.ceil(W/LADO), nf=Math.ceil(H/LADO);
    /* Primero el mapa de que celda TOCA hueco. Con muestreo a secas quedaban
       esquirlas: trocitos de glifo mas finos que la rejilla de muestras, que
       asomaban desde el primer cuadro porque ninguna muestra caia encima.
       Se muestrea 5x5 y luego se DILATA el mapa una celda: la tapa se pasa un
       poco por fuera —cubrir tinta con tinta no se ve— y el borde del glifo
       queda cubierto entero. El canto azul solo lo llevan las celdas que de
       verdad tienen hueco, para no dibujar una rejilla alrededor de la cifra. */
    var hay=new Uint8Array(nc*nf);
    for(var f=0;f<nf;f++){
      for(var c=0;c<nc;c++){
        var x=c*LADO, y=f*LADO, toca=0;
        for(var sy=0;sy<5&&!toca;sy++){
          for(var sx=0;sx<5;sx++){
            var px=Math.min(placa.width-1,Math.round((x+LADO*(sx+0.5)/5)*DPR));
            var py=Math.min(placa.height-1,Math.round((y+LADO*(sy+0.5)/5)*DPR));
            if(d[(py*anc+px)*4+3]<=110){ toca=1; break }
          }
        }
        hay[f*nc+c]=toca;
      }
    }
    for(var f2=0;f2<nf;f2++){
      for(var c2=0;c2<nc;c2++){
        var propio=hay[f2*nc+c2];
        var vecino=propio
          || (c2>0     && hay[f2*nc+c2-1])
          || (c2<nc-1  && hay[f2*nc+c2+1])
          || (f2>0     && hay[(f2-1)*nc+c2])
          || (f2<nf-1  && hay[(f2+1)*nc+c2]);
        if(!vecino) continue;
        /* El orden: un barrido de izquierda a derecha con desorden. Todo
           barrido y se ve una persiana; todo azar y se ve ruido. El azar es
           una funcion de la posicion, no Math.random: tiene que dar lo mismo
           en cada cuadro o las celdas parpadean. */
        var hh=Math.sin(c2*12.9898+f2*78.233)*43758.5453;
        hh=hh-Math.floor(hh);
        celdas.push({x:c2*LADO,y:f2*LADO,h:hh,c:propio?1:0,t:0});
      }
    }
    /* El barrido se reparte sobre el ANCHO DE LA CIFRA, no sobre el de la
       pantalla. Normalizando por W, una cifra que ocupa el 60 % central usaba
       el 60 % central de la ventana: al llegar arriba ya iba medio armada y
       terminaba antes de tiempo. Se mide la caja real. */
    var x0=1e9, x1=-1e9;
    for(var k=0;k<celdas.length;k++){
      if(celdas[k].x<x0) x0=celdas[k].x;
      if(celdas[k].x>x1) x1=celdas[k].x;
    }
    var ancho=Math.max(1,x1-x0);
    for(var k2=0;k2<celdas.length;k2++){
      var ce=celdas[k2];
      ce.t=0.80*((ce.x-x0)/ancho)+0.20*ce.h;
    }
  }

  /* La ventana de armado acaba antes de que la primera losa se mueva (0,36):
     armarse y desmontarse a la vez seria dos cosas peleandose. */
  var ARMA_A=0.00, ARMA_B=0.30, ARMA_C=0.09;   /* inicio, fin, duracion de celda */

  function mosaico(p){
    if(!celdas.length) return;
    var g=cx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#070B14'); g.addColorStop(0.55,'#04070C'); g.addColorStop(1,'#02040A');
    for(var i=0;i<celdas.length;i++){
      var c=celdas[i];
      var t0=ARMA_A+c.t*(ARMA_B-ARMA_A);
      var l=(p-t0)/ARMA_C;
      if(l>=1) continue;                            /* ya llego: el hueco se ve */
      if(l<=0){                                      /* aun no: tinta maciza */
        cx.globalAlpha=1; cx.fillStyle=g;
        cx.fillRect(c.x,c.y,LADO+1,LADO+1);
        continue;
      }
      /* llegando: la tapa se desvanece y la celda lleva un canto encendido,
         que es lo que hace que se vea CAER en su sitio y no fundirse */
      cx.globalAlpha=1-l; cx.fillStyle=g;
      cx.fillRect(c.x,c.y,LADO+1,LADO+1);
      if(c.c){
        cx.globalAlpha=Math.sin(Math.PI*l)*0.85;
        cx.fillStyle='rgba('+AZUL+',1)';
        cx.fillRect(c.x,c.y,LADO+1,1);
        cx.fillRect(c.x,c.y,1,LADO+1);
      }
    }
    cx.globalAlpha=1;
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

  /* ── la barra: lo unico que EMITE luz ──────────────────────────────────
     La cifra es un hueco -luz que pasa-; la barra es luz que sale. Ese par es
     lo que hace que las dos cosas no compitan.
     El neon de verdad no es un color claro: son tres pasadas. Una ancha y
     difusa que tine el aire, una media que da el tubo, y un nucleo casi blanco
     que es lo que el ojo lee como encendido. Con una sola pasada sale un
     rectangulo cian, que es lo que parece barato.
     Y la estela: lo ya recorrido no queda a brillo plano, se apaga hacia atras.
     Eso es lo fosforescente —el fosforo sigue luciendo un rato donde le dio el
     haz— y es lo que hace que la barra parezca haber PASADO por ahi. */
  /* Azul de neon, no azul de marca. El #2F6BFF de la pagina tiene luminancia
     0,20: como tinta va bien, pero un tubo encendido a 0,20 sobre negro no se
     lee como encendido, se lee como pintado. Este es el mismo azul subido de
     luz hasta donde el ojo lo llama neon, y el nucleo va casi blanco con tinte
     azul, que es lo que de verdad hace el efecto. */
  var AZUL='62,134,255';
  function barra(dx,p){
    var an=Math.min(W*0.86,tamCifra*3.1), x0=(W-an)/2+dx;
    var y=H/2+tamCifra*0.46;
    if(y>H-86) y=H-86;
    var t=tramo(p,0.08,0.34);
    var f=an*meta*t;                       /* lo recorrido */
    /* el carril y sus marcas de escala: sin ellas la barra es un cargador
       generico; con ellas es un instrumento */
    cx.fillStyle='rgba('+AZUL+',.16)';
    cx.fillRect(x0,y-1,an,2);
    for(var k=0;k<=4;k++){
      var mx=x0+an*k/4;
      var fin=(k===4);
      cx.fillStyle='rgba('+AZUL+',' + (fin?.85:(k%4===0?.48:.26)) + ')';
      cx.fillRect(mx-(fin?1:0.5),y-(k%4===0?15:8),(fin?2:1),(k%4===0?30:16));
    }
    if(f<=0.5) return;
    var alto=16;
    cx.save();
    /* 0 · el derrame. Un tubo de neon se nota porque TINE lo que tiene
       alrededor: si el resplandor acaba en el borde del tubo, lo que hay es
       un rectangulo claro. Esto es una mancha de luz ancha, muy floja, que
       cae sobre la tinta por encima y por debajo. Es la mitad del efecto. */
    /* En elipse y no en rectangulo: con un rectangulo de degradado vertical el
       derrame se corta EN SECO por los lados y se ve un canto recto a la
       derecha de la cabeza, que delata el truco. Salio en la captura. */
    cx.save();
    cx.translate(x0+f*0.52,y);
    cx.scale(Math.max(1,f*0.66),138);
    var der=cx.createRadialGradient(0,0,0,0,0,1);
    der.addColorStop(0,  'rgba('+AZUL+',.20)');
    der.addColorStop(0.55,'rgba('+AZUL+',.085)');
    der.addColorStop(1,  'rgba('+AZUL+',0)');
    cx.fillStyle=der;
    cx.beginPath(); cx.arc(0,0,1,0,Math.PI*2); cx.fill();
    cx.restore();
    /* 1 · el aire */
    cx.shadowColor='rgba('+AZUL+',.95)'; cx.shadowBlur=70;
    cx.fillStyle='rgba('+AZUL+',.38)';
    cx.fillRect(x0,y-alto/2,f,alto);
    /* 2 · el tubo, con la estela apagandose hacia atras */
    var g=cx.createLinearGradient(x0,0,x0+f,0);
    g.addColorStop(0,'rgba('+AZUL+',.20)');
    g.addColorStop(0.55,'rgba('+AZUL+',.62)');
    g.addColorStop(1,'rgba('+AZUL+',1)');
    cx.shadowBlur=28; cx.fillStyle=g;
    cx.fillRect(x0,y-alto/2,f,alto);
    /* 3 · el nucleo */
    var n=cx.createLinearGradient(x0,0,x0+f,0);
    n.addColorStop(0,'rgba(255,255,255,0)');
    n.addColorStop(0.7,'rgba(226,238,255,.60)');
    n.addColorStop(1,'rgba(255,255,255,.95)');
    cx.shadowBlur=0; cx.fillStyle=n;
    cx.fillRect(x0,y-2,f,4);
    /* 4 · la cabeza: donde esta pasando ahora */
    var cab=t<0.999?1:0.55;
    cx.shadowColor='rgba(170,205,255,1)'; cx.shadowBlur=60*cab;
    cx.fillStyle='rgba(255,255,255,'+(0.97*cab).toFixed(2)+')';
    cx.fillRect(x0+f-3,y-30,6,60);
    /* y el haz vertical de la cabeza: un corte de luz que sube y baja desde
       donde esta pasando. Es lo que hace que la cabeza pese. */
    var haz=cx.createLinearGradient(0,y-190,0,y+190);
    haz.addColorStop(0,   'rgba(150,190,255,0)');
    haz.addColorStop(0.5, 'rgba(150,190,255,'+(0.50*cab).toFixed(3)+')');
    haz.addColorStop(1,   'rgba(150,190,255,0)');
    cx.shadowBlur=0; cx.fillStyle=haz;
    cx.fillRect(x0+f-1.5,y-190,3,380);
    /* 5 · y el fogonazo al llegar a la meta: una sola vez, corto */
    var golpe=tramo(p,0.30,0.35)*(1-tramo(p,0.35,0.46));
    if(golpe>0.01){
      cx.shadowBlur=70*golpe;
      cx.fillStyle='rgba(255,255,255,'+(0.5*golpe).toFixed(3)+')';
      cx.fillRect(x0,y-alto/2-1,f,alto+2);
    }
    cx.restore();
  }

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
      /* La barra va DENTRO del recorte de la losa y con su mismo
         desplazamiento, asi que cuando la tinta se desmonta la barra se rasga
         con ella. Flotando por encima seria un adorno pegado encima de la
         escena; asi es parte de la misma materia. */
      barra(dx,p);
      cx.restore();
      /* el filo de ataque, encendido en proporcion a lo que corre: es lo unico
         que lleva color, y solo mientras se mueve */
      if(t>0.001&&t<0.999){
        var borde=(lado<0)?(dx+W):dx;
        var lg=cx.createLinearGradient(borde-lado*90,0,borde,0);
        lg.addColorStop(0,'rgba(62,134,255,0)');
        lg.addColorStop(1,'rgba(62,134,255,'+(0.60*Math.sin(Math.PI*t)).toFixed(3)+')');
        cx.save();
        cx.beginPath(); cx.rect(0,y,W,alto+1); cx.clip();
        cx.fillStyle=lg; cx.fillRect(Math.min(borde,borde-lado*90),y,90,alto+1);
        cx.fillStyle='rgba(180,214,255,'+(0.80*Math.sin(Math.PI*t)).toFixed(3)+')';
        cx.fillRect(borde-(lado<0?1.5:0),y,1.5,alto+1);
        cx.restore();
      }
    }
    /* el armado va DESPUES de las losas y sin recorte: mientras dura, ninguna
       losa se ha movido todavia -la primera arranca en 0,36-, asi que la tinta
       esta entera y la tapa cae justo encima de donde esta el hueco */
    if(p<ARMA_B+ARMA_C) mosaico(p);
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
