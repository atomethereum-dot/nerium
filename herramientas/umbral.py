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
  var cara='', mono='', tamCifra=0, meta=0.85, rot={arriba:'',dinero:'',tope:'',pie:''};

  function tipo(){
    /* la misma familia que los titulares de la pagina, leida de la pagina */
    var h=document.querySelector('.hero h1')||document.body;
    return getComputedStyle(h).fontFamily;
  }
  function tipoMono(){
    var e=document.querySelector('.sale-live')||document.querySelector('.mono')||document.body;
    return getComputedStyle(e).fontFamily;
  }

  /* ── LO QUE RODEA A LA CIFRA ───────────────────────────────────────────
     Un 85 % gigante en mitad de la pantalla puede ser cualquier cosa, y una
     barra encendida debajo, tambien. Hacen falta cuatro datos y ninguno se
     escribe aqui: se leen de la propia seccion de la ronda, que es la que los
     tiene vivos y traducidos a los once idiomas. Escribirlos a mano seria
     tener dos verdades y que una se quedara vieja.

       · que ronda es            → «.sale-live»    («Seed Round open»)
       · cuanto se lleva         → «#saleRaised» y su hermano
                                   («$13.616.000 raised of $16,000,000»)
       · donde acaba la barra    → el importe que aparece en ese hermano
       · con que condiciones     → «.raise-foot»   (minimo y maximo) */
  function limpio(e){
    if(!e) return '';
    var c=e.cloneNode(true);
    /* el numero de seccion -«07»- no es parte del rotulo */
    var n=c.querySelector('.sk-n'); if(n) n.remove();
    return (c.textContent||'').replace(/\s+/g,' ').trim();
  }
  function rotulos(){
    var r={arriba:'',dinero:'',tope:'',pie:''};
    r.arriba=limpio(document.querySelector('.sale-live')).toUpperCase();
    var a=document.getElementById('saleRaised');
    if(a){
      var resto=a.nextElementSibling?limpio(a.nextElementSibling):'';
      r.dinero=((a.textContent||'').trim()+' '+resto).replace(/\s+/g,' ').trim().toUpperCase();
      /* el tope de la barra es el ultimo importe de esa frase: el objetivo */
      var m=resto.match(/[^\s]*\d[\d.,]*[^\s]*$/);
      r.tope=m?m[0]:'';
    }
    var f=document.querySelector('.raise-foot');
    if(f) r.pie=[].map.call(f.children,limpio).join('   ·   ').toUpperCase();
    return r;
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
    /* La cifra ocupaba hasta el 86 % del ancho y llegaba a 60 px de cada
       canto: llena, pero sin aire. Al 70 % quedan margenes de verdad y la
       escena respira, que es lo que separa un cartel de una portada. */
    var tam=Math.min(W*0.50,H*0.62);
    pc.font='200 '+tam+'px '+cara;
    var an=pc.measureText(txt).width;
    if(an>W*0.70){ tam=tam*(W*0.70)/an; pc.font='200 '+tam+'px '+cara }
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
  var tes=[], TLADO=0, cifraTxt='85%', cifraY=0, ojoX=0, ojoY=0, cifraBajo=0, cifraArriba=0, cifraIzq=0, cifraDer=0;
  var cifraCv=document.createElement('canvas'), cc=cifraCv.getContext('2d');
  /* La misma rampa que el campo de la portada, violeta incluido. Las teselas
     iban en cuatro azules puros mientras el campo de arriba tiene azul,
     indigo y lila: dos mundos distintos a treinta segundos de scroll. Es la
     misma familia o no es nada. */
  var TONOS=['#2834B0','#2C50FC','#466EFF','#8664F4','#7E94FF'];

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
    var x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
    for(var y=0;y<h;y+=TLADO){
      for(var x=0;x<w;x+=TLADO){
        /* la tesela entra si su centro cae dentro del glifo: aqui si vale el
           centro, porque la tesela SE DIBUJA -no tapa nada-, y una de mas en
           el borde solo engorda el trazo un pixel */
        var px=Math.min(w-1,x+(TLADO>>1)), py=Math.min(h-1,y+(TLADO>>1));
        if(d[(py*w+px)*4+3]<130) continue;
        if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y;
        tes.push({x:x,y:y});
      }
    }
    var anc=Math.max(1,x1-x0);
    /* EL CANTO DE ABAJO DE LA CIFRA, medido. La barra se colocaba a
       «H/2 + tam*0,46», que es una cuenta sobre el cuerpo de la tipografia y
       no sobre lo que el glifo OCUPA de verdad: con «85%» a peso 200 el haz
       vertical de la cabeza subia 190 px y se metia dentro del por ciento.
       Se pregunta donde acaba el dibujo y se coloca debajo. */
    cifraBajo=y1+TLADO; cifraArriba=y0; cifraIzq=x0; cifraDer=x1+TLADO;
    /* El PUNTO DE FUGA de la apertura tiene que caer DENTRO del glifo.
       Agrandando la cifra desde el centro de la caja, el centro cae en el hueco
       entre el cinco y el por ciento -que es tinta-, asi que por mucho que
       creciera el hueco lo que quedaba en pantalla era el interior de la cifra:
       a 0,60 la pantalla se quedaba negra con una curva blanca en una esquina.
       Escalando alrededor de un punto interior, ese punto se queda quieto y su
       entorno crece sin limite: el hueco acaba comiendose la pantalla siempre.
       Y un punto interior seguro ya lo tenemos: cualquier tesela.

       Y NO en el centro. El punto de fuga manda hacia donde crece el hueco, y
       durante mucho tiempo estuvo en el centro del bloque -la tesela mas
       cercana al centroide-, que puesto en pantalla cae en (0,66 · 0,34):
       arriba y a la derecha. La ronda que hay detras tiene su tinta -titular,
       panel, precios- en (0,22 · 0,72): abajo y a la izquierda. Medido a lo
       largo de toda la apertura, las dos cifras no se mueven: el hueco se
       abria SIEMPRE en la esquina opuesta a lo que tenia que ensenar, y por
       eso la transicion no decia nada por mucho que se le retocara el brillo.
       El ojo se apunta al cuadrante de la tinta y se coge la tesela real mas
       cercana, que sigue garantizando que el punto cae dentro del glifo. */
    var okX=cifraIzq+(cifraDer-cifraIzq)*0.30;
    var okY=cifraY+(cifraBajo-cifraArriba)*0.16;
    var mejor=0, dmin=1e9;
    for(var q2=0;q2<tes.length;q2++){
      var ex=tes[q2].x+TLADO/2-okX, ey=tes[q2].y+TLADO/2-okY;
      var dd=ex*ex+ey*ey;
      if(dd<dmin){ dmin=dd; mejor=q2 }
    }
    ojoX=tes[mejor].x+TLADO/2; ojoY=tes[mejor].y+TLADO/2;
    for(var i=0;i<tes.length;i++){
      var t=tes[i];
      var hh=Math.sin(t.x*12.9898+t.y*78.233)*43758.5453; hh=hh-Math.floor(hh);
      var hb=Math.sin(t.x*39.3468+t.y*11.1357)*24634.6345; hb=hb-Math.floor(hb);
      /* DE DONDE VIENEN. Salian disparadas desde un angulo al azar alrededor
         del centro, y eso a pantalla completa se lee como confeti: sin
         direccion, no hay intencion. Ahora SUBEN, desde abajo -que es de donde
         viene la ronda, la seccion que esta a punto de entrar- con una deriva
         lateral pequena. La misma cantidad de movimiento, contando algo. */
      t.ox=t.x+(hh-0.5)*W*0.30;
      t.oy=H+120+hb*H*0.85;
      t.giro=(hb-0.5)*1.1;
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
  /* EL RELOJ DE LA PUERTA, Y POR QUE ESTABA MAL.
     Treinta rondas de retoques a esta transicion y ninguna arreglaba nada,
     porque lo que fallaba no era el dibujo: era el reloj. La cifra se abria
     entre 0,40 y 1,00 -el 60 % de la seccion- y DETRAS NO HABIA NADA. Medido
     apagando el lienzo y mirando la pagina sola: de 0,02 a 0,44 la ronda es
     un rectangulo claro vacio; el titular no entra en cuadro hasta 0,48 y el
     panel con el precio no esta bien encuadrado hasta 0,86. O sea que el
     hueco se abria sobre el margen de arriba de la seccion y lo que se veia
     era una curva blanca barriendo la pantalla durante media seccion, sin
     nada dentro. No es un problema de brillo, de color ni de easing: la
     puerta y lo que hay al otro lado iban desincronizadas un cuarto de
     seccion.

     El reloj nuevo lo ata a lo que hay detras. La cifra se arma con mas
     calma, funde, se queda QUIETA un momento -un gesto tiene que terminar
     antes de que empiece el siguiente- y se abre en 0,58, que es justo
     cuando el titular de la ronda y su panel ya estan en cuadro. Asi el
     hueco ensena la ronda, que es lo que la transicion dice que hace. */
  var ARMA_A=0.00, ARMA_B=0.40, ARMA_C=0.13;   /* inicio, fin, duracion de tesela */
  var FUNDE_A=0.40, FUNDE_B=0.52;              /* junta a cero y color a blanco */
  var ABRE_A=0.62;                             /* la cifra se abre */
  var ABRE_B=0.92;                             /* y esta entregada */
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
      /* Un respiro justo antes de abrirse: la cifra toma aire un 1,5 % en los
         ultimos cuadros de la espera. No se ve como movimiento, se nota como
         que la apertura la decide ella y no el scroll. */
      var aire=1+0.015*tramo(p,FUNDE_B,ABRE_A);
      cc.save(); cc.translate(W/2,cifraY); cc.scale(aire,aire); cc.translate(-W/2,-cifraY);
      cc.font='200 '+tamCifra+'px '+cara;
      cc.textAlign='center'; cc.textBaseline='middle';
      cc.fillStyle='#fff';
      cc.fillText(cifraTxt,W/2,cifraY);
      cc.restore();
      cc.globalAlpha=1;
      /* Y UN BRILLO QUE LA CRUZA UNA VEZ. La fusion es el momento en que la
         cifra deja de ser mosaico y pasa a ser pieza, y sin nada que lo marque
         el cambio ocurre sin que te des cuenta: las teselas simplemente dejan
         de verse. Una banda de luz que barre de izquierda a derecha, dentro
         del propio glifo, le pone acento a ese instante. Una sola vez, y
         recortada al glifo con «source-atop», que asi no hace falta ni mascara
         ni segundo lienzo. */
      var br=Math.sin(Math.PI*Math.min(1,Math.max(0,fu)));
      if(br>0.01){
        var cxp=(fu*1.5-0.25)*W;
        var g2=cc.createLinearGradient(cxp-W*0.22,0,cxp+W*0.22,0);
        g2.addColorStop(0,'rgba(255,255,255,0)');
        g2.addColorStop(0.5,'rgba(190,215,255,'+(0.85*br).toFixed(3)+')');
        g2.addColorStop(1,'rgba(255,255,255,0)');
        cc.globalCompositeOperation='source-atop';
        cc.fillStyle=g2; cc.fillRect(0,0,W,H);
        cc.globalCompositeOperation='source-over';
      }
    }
    cc.globalAlpha=1;
  }

  function medir(){
    DPR=Math.min(2,window.devicePixelRatio||1);
    var r=lz.getBoundingClientRect();
    W=Math.max(1,r.width); H=Math.max(1,r.height);
    lz.width=Math.round(W*DPR); lz.height=Math.round(H*DPR);
    cx.setTransform(DPR,0,0,DPR,0,0);
    cara=tipo(); mono=tipoMono(); rot=rotulos(); plancha();
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
  /* El sitio de la barra lo necesitan dos: ella y los rotulos que la
     etiquetan. Se calcula en un solo sitio para que no se separen nunca. */
  var DERRAME=138;
  /* El ancho de la barra tambien en un solo sitio: lo necesitan ella, sus
     topes y la lectura de la cabeza. Calculado por separado, los topes
     quedaban a cien pixeles de los extremos del carril. */
  /* LA BARRA MIDE LO QUE MIDE LA CIFRA. No una proporcion de la pantalla que
     casualmente se le parezca: exactamente su caja, medida. Asi las dos cosas
     comparten canto izquierdo y canto derecho, y lo que eran dos objetos
     apilados pasa a ser una sola columna. Es la unica relacion que hacia falta
     y no costaba nada, porque la caja ya estaba medida para otra cosa. */
  function barraAncho(){
    var a=cifraDer-cifraIzq;
    return a>40?a:Math.min(W*0.70,tamCifra*3.1);
  }
  function barraX(){
    var a=barraAncho();
    return cifraDer-cifraIzq>40?cifraIzq:(W-a)/2;
  }
  function barraY(){
    var tope=cifraBajo+20;
    var y=Math.max(tope+DERRAME, H*0.58);
    return y>H-86?H-86:y;
  }
  function barraDerrame(){
    return Math.max(40,Math.min(DERRAME,barraY()-(cifraBajo+20)));
  }
  function barra(dx,p){
    var an=barraAncho(), x0=barraX()+dx;
    /* Debajo del canto MEDIDO de la cifra, y contando TODA la luz que la barra
       reparte, no solo su trazo. El derrame es una elipse de 138 px de radio
       vertical: colocando la barra a ras del canto de la cifra, el trazo no la
       tocaba pero el resplandor le subia noventa pixeles por dentro. En el
       movil, donde la cifra es mas alta en proporcion, se le metia entera.
       Asi que el sitio se calcula desde el borde del DERRAME: el canto de la
       cifra, un respiro, y el radio entero. Y si no cabe en pantalla, el que
       encoge es el derrame -es luz, aguanta- y no el aire. */
    var y=barraY(), derrame=barraDerrame();
    var t=tramo(p,0.08,FUNDE_B);
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
    cx.scale(Math.max(1,f*0.66),derrame);
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
    /* y el haz vertical de la cabeza: un corte de luz desde donde esta
       pasando. Va SOLO HACIA ABAJO. Subiendo y bajando pesaba mas, pero la
       mitad de arriba se metia dentro de la cifra -190 px por encima de la
       barra, o sea dentro del por ciento- y lo que se veia era una raya
       cruzando el numero. Hacia abajo cae sobre suelo vacio y no estorba a
       nadie: la cabeza sigue pesando y la cifra se queda limpia. */
    var lar=Math.min(200,Math.max(60,H-y-10));
    var haz=cx.createLinearGradient(0,y,0,y+lar);
    haz.addColorStop(0,   'rgba(150,190,255,'+(0.55*cab).toFixed(3)+')');
    haz.addColorStop(1,   'rgba(150,190,255,0)');
    cx.shadowBlur=0; cx.fillStyle=haz;
    cx.fillRect(x0+f-1.5,y,3,lar);
    /* 5 · y el fogonazo al llegar a la meta: una sola vez, corto */
    var golpe=tramo(p,0.30,0.35)*(1-tramo(p,0.35,0.46));
    if(golpe>0.01){
      cx.shadowBlur=70*golpe;
      cx.fillStyle='rgba(255,255,255,'+(0.5*golpe).toFixed(3)+')';
      cx.fillRect(x0,y-alto/2-1,f,alto+2);
    }
    cx.restore();
  }

  /* ── la composicion alrededor de la cifra ─────────────────────────────
     Cada rotulo entra en SU momento, y el orden cuenta la historia: primero
     que ronda es, luego la barra con sus topes -para que se sepa que mide-,
     despues la cifra funde y aparece el importe, y al final las condiciones.
     Todos a la vez seria un cartel; escalonados es una escena. */
  function ren(txt,x,y,tam,alfa,al,col,esp,tope){
    if(!txt||alfa<=0.004) return;
    cx.save();
    cx.globalAlpha=alfa;
    cx.textAlign=al; cx.textBaseline='alphabetic';
    cx.fillStyle=col;
    /* Y SE ENCOGE SI NO CABE. Los rotulos son frases traducidas a once idiomas
       y con importes de longitud variable: «$13.616.000 RAISED OF $16,000,000»
       cabe en 1440 y se sale por los dos lados en un telefono. Se mide y se
       baja el cuerpo hasta que entra, en vez de fiarlo a que el texto sea
       corto. Es lo mismo que ya hace la cifra grande. */
    for(var k=0;k<6;k++){
      cx.font='500 '+tam.toFixed(1)+'px '+mono;
      if(cx.letterSpacing!==undefined) cx.letterSpacing=(tam*esp).toFixed(2)+'px';
      if(!tope||cx.measureText(txt).width<=tope||tam<7) break;
      tam*=0.88;
    }
    cx.fillText(txt,x,y);
    if(cx.letterSpacing!==undefined) cx.letterSpacing='0px';
    cx.restore();
  }
  function marco(p,vel){
    var tk=Math.max(10,Math.min(14,W*0.0098));
    var bx=barraAncho(), x0=barraX(), x1=x0+bx;
    var by=barraY();

    /* 1 · que ronda es, con su punto vivo, sobre la cifra */
    var a1=tramo(p,0.02,0.12)*vel;
    if(a1>0.004&&rot.arriba){
      var yr=Math.max(tk*3.4, cifraArriba-tk*2.6);
      /* El ancho se mide CON el interletrado puesto, que es como se va a
         dibujar: midiendolo sin el, el punto se montaba encima de la primera
         letra. Y el rotulo se corre a la derecha media distancia del punto
         para que el conjunto -punto mas texto- quede centrado. */
      var anc=0;
      cx.save();
      cx.font='500 '+tk+'px '+mono;
      if(cx.letterSpacing!==undefined) cx.letterSpacing=(tk*0.26).toFixed(2)+'px';
      anc=cx.measureText(rot.arriba).width;
      cx.restore();
      var hueco=tk*1.15;
      ren(rot.arriba, W/2+hueco/2, yr, tk, a1, 'center',
          'rgba(228,234,243,.92)', 0.26, W*0.80);
      cx.save(); cx.globalAlpha=a1; cx.fillStyle='#12A45E';
      cx.beginPath();
      cx.arc(W/2+hueco/2-anc/2-hueco*0.55, yr-tk*0.32, tk*0.25, 0, Math.PI*2);
      cx.fill();
      cx.restore();
    }

    /* 2 · los topes de la barra: sin ellos es un cargador, con ellos es una
       escala. A la izquierda el cero, a la derecha el objetivo de la ronda. */
    var a2=tramo(p,0.10,0.22)*vel;
    /* Por debajo de la CABEZA, que mide 30 px a cada lado del carril. Puestos
       a «tk*2,6» —26 px en el telefono— el tope de la derecha caia justo
       encima de la cabeza, que al 85 % esta casi en ese extremo. */
    var ye=by+Math.max(tk*2.6,42);
    ren('0', x0, ye, tk*0.86, a2, 'left', 'rgba(150,178,230,.72)', 0.20);
    ren(rot.tope, x1, ye, tk*0.86, a2, 'right', 'rgba(150,178,230,.72)', 0.20);

    /* 3 · cuanto se lleva, debajo de la cifra y pegado a ella: entra cuando la
       cifra ya esta fundida, que es cuando se puede leer de un golpe */
    var a3=tramo(p,0.26,0.36)*vel;
    ren(rot.dinero, W/2, cifraBajo+tk*2.9, tk*1.18, a3, 'center',
        'rgba(236,243,255,.94)', 0.14, W*0.88);

    /* 4 · LA LECTURA DE LA CABEZA. La cifra gigante y la barra contaban el
       mismo hecho, pero cada una por su lado: dos objetos compartiendo
       pantalla. Con un contador pequeno viajando en la cabeza, la barra deja
       de ser decorativa —se ve lo que marca en cada punto del recorrido— y las
       dos cosas se atan: el contador llega a su numero en el mismo instante en
       que la cifra grande funde. Una sola idea contada a dos escalas. */
    var tb=tramo(p,0.08,FUNDE_B);
    if(tb>0.02&&vel>0.02){
      var bx2=bx, bx0=x0;
      var hx=bx0+bx2*meta*tb;
      var leo=Math.round(meta*100*tb)+'%';
      var a5=Math.min(1,tb*4)*vel;
      /* pegada al lado de la cabeza y por ENCIMA del carril, que es donde no
         pisa ni las marcas de escala ni los topes */
      var der=hx>x0+bx2*0.86;
      ren(leo, hx+(der?-tk*0.9:tk*0.9), by-tk*1.5, tk*1.05, a5,
          der?'right':'left', 'rgba(226,238,255,.96)', 0.06);
    }

    /* 5 · y las condiciones, al pie */
    var a4=tramo(p,0.34,0.46)*vel;
    ren(rot.pie, W/2, Math.min(H-tk*1.6, ye+tk*3.0), tk*0.84, a4,
        'center', 'rgba(140,166,214,.70)', 0.20, W*0.88);
  }

  function dibuja(p){
    cx.clearRect(0,0,W,H);
    if(p<ABRE_A){
      /* la tinta entera, la cifra encima y la barra */
      cx.drawImage(placa,0,0,W,H);
      pintaCifra(p);
      cx.drawImage(cifraCv,0,0,W,H);
      barra(0,p);
      marco(p,1);
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
    var t=pesa(Math.min(1,(p-ABRE_A)/(ABRE_B-ABRE_A)));
    /* Al cuadrado para que arranque despacio, MAS una cola que se dispara al
       final. Sin la cola el hueco se quedaba clavado: medido, del 0,68 al
       0,84 de la seccion el agujero pasaba del 50 % al 53 % de la pantalla y
       ahi se quedaba, porque el ojo ya esta dentro de un contraforma y el
       asta de al lado crece al mismo ritmo que el hueco: hasta que el asta no
       se sale de cuadro no pasa nada. Eso es el sexto de seccion en que solo
       se ve una curva blanca que no se mueve. La cola saca el asta de la
       pantalla en vez de pasearla por ella. */
    var esc=1+t*t*80+Math.pow(t,6)*300;
    var blanco=Math.max(0,1-t*3.4);         /* el blanco se va en el primer tercio */
    /* Un ultimo velo que se va del todo al final. No es lo que abre la escena
       -eso lo hace el hueco-: es el seguro de que no quede una esquirla de
       tinta en un canto cuando la ronda ya esta entregada. Empieza tardisimo a
       proposito; fundiendola antes, la seccion se veia a traves de un velo
       gris y lo que se leia era suciedad, no transicion. */
    var tinta=1-tramo(t,0.86,1.0);
    if(tinta<=0.002) return;                /* ya esta entregada: nada que pintar */

    /* La tinta se agranda un pelo mientras el hueco crece. Es paralaje: el
       plano de delante se mueve y el de detras -la pagina- esta quieto, y eso
       es lo que hace que el hueco parezca una VENTANA y no un recorte. Un 6 %,
       que no se ve como movimiento pero se nota como profundidad. */
    var der=1+t*0.06;
    cx.globalAlpha=tinta;
    cx.drawImage(placa,-(der-1)*W/2,-(der-1)*H/2,W*der,H*der);
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
    /* Aqui hubo un filo encendido siguiendo el contorno del glifo mientras se
       abria: un «stroke» claro con 26 px de sombra azul. La intencion era que
       el hueco se leyera como una puerta y no como un agujero. En movimiento
       no se leia asi. La cifra, al abrirse, ocupa la pantalla entera, asi que
       ese halo no bordea una forma: tapiza el viewport, y lo que se ve es un
       fogonazo blanco a mitad de la transicion. Sin el, la cifra llega limpia
       al hueco y lo que se abre se entiende por el movimiento, que es de donde
       tenia que venir. */
    cx.restore();
    /* la barra se apaga con el blanco: es el instrumento de la cifra, y cuando
       la cifra deja de serlo no pinta nada */
    /* los rotulos se van con la cifra: son suyos, no del fondo */
    if(blanco>0.02){
      cx.globalAlpha=blanco*tinta; barra(0,p); cx.globalAlpha=1;
      marco(p,blanco*tinta);
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
