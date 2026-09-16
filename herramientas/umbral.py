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
    var txt=(num.textContent||'85').replace(/[^0-9]/g,'')+'%';
    /* La cifra baja de tamano para dejarle sitio a la barra: antes ocupaba
       casi toda la altura y la barra acababa aplastada contra el canto. */
    var tam=Math.min(W*0.58,H*0.66);
    pc.font='200 '+tam+'px '+cara;
    var an=pc.measureText(txt).width;
    if(an>W*0.86){ tam=tam*(W*0.86)/an; pc.font='200 '+tam+'px '+cara }
    pc.textAlign='center'; pc.textBaseline='middle';
    tamCifra=tam;
    meta=Math.min(1,Math.max(0,(parseFloat(num.textContent)||85)/100));
    /* La cifra ya no se RECORTA de la tinta. Antes era un hueco -y un hueco o
       esta o no esta-, asi que para armarla habia que ir tapandolo y
       destapandolo: el movimiento era de la tapa, no de la cifra. Ahora la
       cifra se construye con teselas que vuelan a su sitio, que es el mismo
       lenguaje de la rueda del reparto del token. La plancha se queda siendo
       tinta lisa y la cifra vive en su propio lienzo. */
    cifraTxt=txt; cifraY=H/2-tam*0.10;
    teselas(txt,tam);
  }
  /* ── la cifra se construye con teselas ────────────────────────────────
     El mismo lenguaje que la rueda del reparto del token, que es lo que la
     pagina ya usa para «esto se esta montando»: cuadrados iguales con un hueco
     de un pixel entre ellos, cada uno llega volando desde lejos girando sobre
     si mismo, y aterriza. Repetir ese vocabulario no es pereza: es lo que hace
     que las dos piezas parezcan de la misma casa.

     Antes la cifra era un hueco recortado en la tinta. Para armar un hueco hay
     que ir tapandolo, o sea que lo que se movia era la tapa: la cifra no
     entraba, se destapaba. Con teselas entra de verdad.

     Las teselas salen de dibujar el texto en un lienzo aparte y preguntarle
     donde hay glifo, no de calcular donde deberia estar: vale para cualquier
     numero y cualquier tipografia.

     El coste: un fillRect por tesela, sin texto y sin sombra, sobre un lienzo
     propio que las losas luego reparten con drawImage. Nueve drawImage mas por
     cuadro en vez de nueve pasadas de teselas. */
  var tes=[], TLADO=0, cifraTxt='85%', cifraY=0, ojoX=0, ojoY=0;
  var cifraCv=document.createElement('canvas'), cc=cifraCv.getContext('2d');
  var TONOS=['#1B49E0','#2F6BFF','#2E86FF','#79ABFF'];   /* la rampa, de hondo a claro */

  function teselas(txt,tam){
    TLADO=Math.max(6,Math.round(tam/58));
    tes.length=0;
    /* el glifo, en un lienzo de trabajo del tamano de la escena */
    var w=Math.max(1,Math.round(W)), h=Math.max(1,Math.round(H));
    var aux=document.createElement('canvas'); aux.width=w; aux.height=h;
    var ac=aux.getContext('2d');
    ac.font='200 '+tam+'px '+cara;
    ac.textAlign='center'; ac.textBaseline='middle';
    ac.fillStyle='#fff';
    ac.fillText(txt,w/2,h/2-tam*0.10);
    var d=ac.getImageData(0,0,w,h).data;
    var x0=1e9,x1=-1e9;
    for(var y=0;y<h;y+=TLADO){
      for(var x=0;x<w;x+=TLADO){
        /* la tesela entra si su centro cae dentro del glifo: aqui si vale el
           centro, porque la tesela SE DIBUJA -no tapa nada-, y una de mas en
           el borde solo engorda el trazo un pixel */
        var px=Math.min(w-1,x+(TLADO>>1)), py=Math.min(h-1,y+(TLADO>>1));
        if(d[(py*w+px)*4+3]<130) continue;
        if(x<x0)x0=x; if(x>x1)x1=x;
        tes.push({x:x,y:y});
      }
    }
    var anc=Math.max(1,x1-x0);
    /* El PUNTO DE FUGA de la apertura tiene que caer DENTRO del glifo.
       Agrandando la cifra desde el centro de la caja, el centro cae en el hueco
       entre el cinco y el por ciento -que es tinta-, asi que por mucho que
       creciera el hueco lo que quedaba en pantalla era el interior de la cifra:
       a 0,60 la pantalla se quedaba negra con una curva blanca en una esquina.
       Escalando alrededor de un punto interior, ese punto se queda quieto y su
       entorno crece sin limite: el hueco acaba comiendose la pantalla siempre.
       Y un punto interior seguro ya lo tenemos: cualquier tesela. */
    var mx=0,my=0;
    for(var q=0;q<tes.length;q++){ mx+=tes[q].x; my+=tes[q].y }
    mx/=tes.length; my/=tes.length;
    var mejor=0, dmin=1e9;
    for(var q2=0;q2<tes.length;q2++){
      var dd=(tes[q2].x-mx)*(tes[q2].x-mx)+(tes[q2].y-my)*(tes[q2].y-my);
      if(dd<dmin){ dmin=dd; mejor=q2 }
    }
    ojoX=tes[mejor].x+TLADO/2; ojoY=tes[mejor].y+TLADO/2;
    for(var i=0;i<tes.length;i++){
      var t=tes[i];
      var hh=Math.sin(t.x*12.9898+t.y*78.233)*43758.5453; hh=hh-Math.floor(hh);
      var hb=Math.sin(t.x*39.3468+t.y*11.1357)*24634.6345; hb=hb-Math.floor(hb);
      var ang=hh*Math.PI*2, lejos=560+hb*900;
      t.ox=W/2+Math.cos(ang)*lejos;          /* de donde viene */
      t.oy=H/2+Math.sin(ang)*lejos;
      t.giro=(hb-0.5)*1.8;
      t.d=0.78*((t.x-x0)/anc)+0.22*hh;       /* barrido con desorden */
      /* El color va por POSICION, no al azar: la rueda del token reparte sus
         tonos por sectores y se lee como una decision. Al azar sale confeti.
         Recorre la rampa de izquierda a derecha con un punto de mezcla. */
      var g=(t.x-x0)/anc*(TONOS.length-1)+ (hh-0.5)*0.7;
      t.c=TONOS[Math.max(0,Math.min(TONOS.length-1,Math.round(g)))];
    }
  }

  /* Tres tiempos, y cada uno hace una sola cosa:
       0,00 - 0,24  las teselas vuelan y arman la cifra, en azul;
       0,24 - 0,40  FUNDEN: se cierran las juntas y el color va a blanco. La
                    cifra deja de estar HECHA de piezas y pasa a SER una pieza.
                    Esta es la imagen que se queda;
       0,40 - 1,00  esa cifra blanca se ABRE: es la ventana por la que entra la
                    ronda. Crece desde el centro hasta comerse la pantalla.
     Lo que habia antes era la plancha partida en nueve losas que se iban a los
     lados. Funcionaba, pero es un recurso de motion graphics: nueve paneles
     deslizando. Una cifra que se abre y te deja pasar dice lo mismo con una
     sola idea, que es lo que hace la pagina en todas partes: menos piezas. */
  var ARMA_A=0.00, ARMA_B=0.24, ARMA_C=0.10;   /* inicio, fin, duracion de tesela */
  /* La fusion termina en 0,34 y la apertura no empieza hasta 0,40: entre las
     dos hay un respiro en el que la cifra esta QUIETA, blanca y limpia. Sin
     ese hueco la fusion y la apertura se pisaban y el contorno escalonado de
     las teselas seguia asomando justo cuando la cifra tenia que leerse mejor.
     Un gesto tiene que terminar antes de que empiece el siguiente. */
  var FUNDE_A=0.24, FUNDE_B=0.34;              /* junta a cero y color a blanco */
  var ABRE_A=0.40;                             /* la cifra se abre */
  var cae=function(t){return 1-Math.pow(1-t,3.4)};   /* el mismo de la rueda */

  /* del azul de la tesela al blanco, en el propio espacio del color: echarle
     una capa blanca encima daria un azul lavado, no blanco. */
  var _mz={};
  function mezcla(hex,k){
    var c=_mz[hex]; if(!c){ c=[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),
                             parseInt(hex.slice(5,7),16)]; _mz[hex]=c }
    return 'rgb('+Math.round(c[0]+(255-c[0])*k)+','+Math.round(c[1]+(255-c[1])*k)+','
               +Math.round(c[2]+(255-c[2])*k)+')';
  }
  function pintaCifra(p){
    if(cifraCv.width!==placa.width){ cifraCv.width=placa.width; cifraCv.height=placa.height }
    cc.setTransform(DPR,0,0,DPR,0,0);
    cc.clearRect(0,0,W,H);
    if(!tes.length) return;
    /* La junta se cierra y el color va a blanco. Es el mismo gesto contado dos
       veces: la cifra pasa de estar hecha de piezas a ser una pieza. */
    var fu=tramo(p,FUNDE_A,FUNDE_B);
    /* Fundida del todo, las teselas SOBRAN y ademas estorban: son cuadrados y
       su silueta desborda el contorno de la letra, asi que por debajo de la
       cifra limpia asomaba un reborde escalonado. Cuando la fusion termina se
       dibuja solo la letra. Las dos son blancas, asi que el relevo no se ve. */
    var soloLetra=fu>0.99;
    var lado=Math.max(2,TLADO-1.1*(1-fu));
    for(var i=0;i<tes.length&&!soloLetra;i++){
      var t=tes[i];
      var t0=ARMA_A+t.d*(ARMA_B-ARMA_A);
      var k=(p-t0)/ARMA_C;
      if(k<=0) continue;                        /* aun no ha salido */
      k=cae(Math.min(1,k));
      var x=t.ox+(t.x-t.ox)*k, y=t.oy+(t.y-t.oy)*k;
      cc.globalAlpha=k<1?0.30+k*0.70:1;
      if(k<1){
        cc.save();
        cc.translate(x+lado/2,y+lado/2);
        cc.rotate(t.giro*(1-k));
        cc.fillStyle=t.c; cc.fillRect(-lado/2,-lado/2,lado,lado);
        cc.fillStyle='rgba(226,238,255,.55)';
        cc.fillRect(-lado/2,-lado/2,lado,Math.max(1,lado*0.16));
        cc.restore();
      }else{
        cc.fillStyle=fu>0?mezcla(t.c,fu):t.c; cc.fillRect(x,y,lado,lado);
        if(fu<1){
          /* el canto de luz se va con la junta: en una pieza maciza no pinta
             nada, y dejarlo la volvia a partir en cuadros */
          cc.globalAlpha=(1-fu);
          cc.fillStyle='rgba(226,238,255,.55)';
          cc.fillRect(x,y,lado,Math.max(1,lado*0.16));
          cc.globalAlpha=1;
        }
      }
    }
    /* Y cuando la fusion termina, encima va la LETRA. Las teselas pegadas dejan
       el contorno escalonado -son cuadrados-, y lo que tiene que quedar es una
       cifra, no un mosaico apretado. Se dibuja la letra de verdad con el alfa
       de la fusion: al principio no se ve y al final es lo unico que se ve, asi
       que el paso de mosaico a tipografia no tiene costura. Y es una sola
       llamada, no mil seiscientos rectangulos. */
    if(fu>0.002){
      cc.globalAlpha=fu;
      cc.font='200 '+tamCifra+'px '+cara;
      cc.textAlign='center'; cc.textBaseline='middle';
      cc.fillStyle='#fff';
      cc.fillText(cifraTxt,W/2,cifraY);
    }
    cc.globalAlpha=1;
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
    if(p<ABRE_A){
      /* la tinta entera, la cifra encima y la barra */
      cx.drawImage(placa,0,0,W,H);
      pintaCifra(p);
      cx.drawImage(cifraCv,0,0,W,H);
      barra(0,p);
      return;
    }
    /* ── LA CIFRA SE ABRE ─────────────────────────────────────────────────
       La cifra blanca deja de estar pintada sobre la tinta y pasa a ser un
       hueco EN la tinta, del mismo tamano y en el mismo sitio: en el cambio no
       se mueve nada. Lo que se ve es que se rellena de blanco por dentro, y
       ese blanco se apaga mientras la cifra crece, asi que por donde estaba la
       cifra acaba entrando la ronda.

       El recorte con «destination-out» borra EN PROPORCION AL ALFA de lo que
       se pinta. Con un degradado o un color translucido como fillStyle el
       hueco sale a medias y la pagina se queda detras de un velo permanente:
       es exactamente lo que paso la primera vez. Opaco siempre. */
    var t=pesa(Math.min(1,(p-ABRE_A)/(0.995-ABRE_A)));
    var esc=1+t*t*80;                       /* al cuadrado: arranca despacio */
    var blanco=Math.max(0,1-t*3.4);         /* el blanco se va en el primer tercio */
    /* Un ultimo velo que se va del todo al final. No es lo que abre la escena
       -eso lo hace el hueco-: es el seguro de que no quede una esquirla de
       tinta en un canto cuando la ronda ya esta entregada. Empieza tardisimo a
       proposito; fundiendola antes, la seccion se veia a traves de un velo
       gris y lo que se leia era suciedad, no transicion. */
    var tinta=1-tramo(t,0.86,1.0);
    if(tinta<=0.002) return;                /* ya esta entregada: nada que pintar */

    cx.globalAlpha=tinta;
    cx.drawImage(placa,0,0,W,H);
    cx.globalAlpha=1;
    cx.save();
    cx.translate(ojoX,ojoY); cx.scale(esc,esc); cx.translate(-ojoX,-ojoY);
    cx.font='200 '+tamCifra+'px '+cara;
    cx.textAlign='center'; cx.textBaseline='middle';
    cx.globalCompositeOperation='destination-out';
    cx.fillStyle='#000';
    cx.fillText(cifraTxt,W/2,cifraY);
    cx.globalCompositeOperation='source-over';
    if(blanco>0.002){
      cx.globalAlpha=blanco*tinta;
      cx.fillStyle='#fff';
      cx.fillText(cifraTxt,W/2,cifraY);
      cx.globalAlpha=1;
    }
    cx.restore();
    /* la barra se apaga con el blanco: es el instrumento de la cifra, y cuando
       la cifra deja de serlo no pinta nada */
    if(blanco>0.02){ cx.globalAlpha=blanco*tinta; barra(0,p); cx.globalAlpha=1 }
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
