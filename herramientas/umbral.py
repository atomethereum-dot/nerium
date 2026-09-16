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
  /* ── LA ESCENA ─────────────────────────────────────────────────────────
     Quinta version, y esta cambia la IDEA, no el acabado. Las cuatro
     anteriores eran la misma: una cifra enorme en mitad de una pantalla negra
     y una barra debajo. Se pulio el numero, se le pusieron rotulos, se ato la
     barra a su ancho... y seguia siendo lo mismo, porque la silueta no cambio
     nunca. Se ve igual porque ES igual.

     Esta parte de otro sitio: la escena no es un cartel, es un INSTRUMENTO que
     se lee de izquierda a derecha, y la transicion no es algo que le pase a la
     cifra, es la propia barra convirtiendose en la seccion.

       · arranca con un FILETE de un pixel cruzando el negro. Nada mas. Los
         rotulos de la ronda a sus dos extremos, como una escala;
       · el filete se LLENA de izquierda a derecha y el contador viaja en la
         cabeza. Aqui todavia no hay ninguna cifra grande;
       · al llegar a su marca, la cifra SALE DE LA CABEZA: crece desde ahi
         hasta su tamano y se queda alineada a la izquierda con el filete, no
         centrada. La composicion es de columna, como el resto de la pagina;
       · y entonces el tramo lleno se ABRE en vertical: sus cantos se separan
         y por dentro entra la ronda. La barra no se va: se convierte en ella.

     El plato ya no lleva teselas ni recortes de glifo. Lo que se mueve son
     cuatro numeros. */
  function plancha(){
    placa.width=Math.round(W*DPR); placa.height=Math.round(H*DPR);
    pc.setTransform(DPR,0,0,DPR,0,0);
    pc.clearRect(0,0,W,H);
    var g=pc.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#070B14'); g.addColorStop(0.55,'#04070C'); g.addColorStop(1,'#02040A');
    pc.fillStyle=g; pc.fillRect(0,0,W,H);
    cifraTxt=(num.textContent||'85').replace(/[^0-9]/g,'')+'%';
    meta=Math.min(1,Math.max(0,(parseFloat(num.textContent)||85)/100));
    /* el cuerpo de la cifra: alto de la columna, nunca mas ancho que ella */
    /* El cuerpo sale de la COLUMNA, no de la pantalla. Atado a «W*0,26» la
       cifra caia a 101 px en un telefono -una nota al pie- mientras en
       escritorio le sobraba sitio. La columna es la misma medida de la que
       cuelga todo lo demas, asi que la cifra escala con ella. */
    var tam=Math.min(H*0.30,W*0.40);
    pc.font='200 '+tam+'px '+cara;
    var an=pc.measureText(cifraTxt).width;
    if(an>ancho()*0.78){ tam=tam*(ancho()*0.78)/an }
    tamCifra=tam;
  }

  /* La columna: una sola medida de la que cuelga todo. */
  function ancho(){ return Math.min(W*0.78, 1180) }
  function colX(){ return (W-ancho())/2 }
  function rielY(){ return Math.round(H*0.58) }

  /* EL AIRE ENTRE LA CIFRA Y EL RIEL, y con el, el tamano del derrame.
     Se calcula en un sitio porque son la misma decision: el resplandor del
     riel es una elipse de radio vertical grande, y si se elige sin mirar donde
     esta la cifra, se le mete dentro. Paso en el telefono, donde la cifra mide
     101 px y el derrame iba a 135: veintitres filas de la cifra con luz
     encima. El derrame cede, que es luz; la cifra no. */
  function hueco(){ return Math.max(56, tamCifra*0.42) }
  function derrame(){ return Math.max(28, Math.min(H*0.16, hueco()-12)) }

  var ABRE_A=0.46;                 /* cuando la barra empieza a abrirse */
  var CIFRA_A=0.30, CIFRA_B=0.44;  /* cuando la cifra sale de la cabeza */

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
  /* ── EL RIEL ───────────────────────────────────────────────────────────
     Un filete de un pixel cruzando la columna, y encima el tramo recorrido,
     encendido. El neon de verdad no es un color claro: son tres pasadas —una
     ancha y difusa que tine el aire, una media que da el tubo, y un nucleo
     casi blanco que es lo que el ojo lee como encendido—. Con una sola sale un
     rectangulo azul, que es lo que parece barato.

     Aqui el riel ya no es un adorno debajo de una cifra: es el objeto
     principal y el unico que hay hasta bien entrada la escena. */
  function riel(p,vel){
    var x0=colX(), an=ancho(), y=rielY();
    var t=tramo(p,0.06,CIFRA_A);
    var f=an*meta*t;
    var alto=Math.max(3,Math.round(H*0.006));

    /* el carril entero, apagado: la escala existe desde el primer cuadro */
    cx.save(); cx.globalAlpha=vel;
    cx.fillStyle='rgba('+AZUL+',.18)';
    cx.fillRect(x0,y-0.5,an,1);
    /* las marcas de cuarto, cortas, hacia abajo */
    /* Los dos extremos van MARCADOS, no insinuados: son el cero y el objetivo,
       o sea los dos numeros que dan sentido a todo lo demas. Dejandolos al
       mismo tono que las marcas de cuarto, el riel no tenia final visible y
       lo que se veia era una linea que se pierde. */
    for(var k=0;k<=4;k++){
      var mx=x0+an*k/4, fin=(k===0||k===4);
      cx.fillStyle='rgba('+AZUL+','+(fin?.82:.24)+')';
      cx.fillRect(mx-(fin?1:0.5),y-(fin?5:0),(fin?1.5:1),fin?22:8);
    }
    if(f>0.5){
      /* 0 · el derrame: un tubo se nota porque TINE lo que tiene alrededor.
             En elipse y no en rectangulo, que un rectangulo de degradado se
             corta en seco por los lados y delata el truco. */
      cx.save();
      cx.translate(x0+f*0.52,y);
      cx.scale(Math.max(1,f*0.62),derrame());
      var der=cx.createRadialGradient(0,0,0,0,0,1);
      der.addColorStop(0,'rgba('+AZUL+',.22)');
      der.addColorStop(0.55,'rgba('+AZUL+',.09)');
      der.addColorStop(1,'rgba('+AZUL+',0)');
      cx.fillStyle=der; cx.beginPath(); cx.arc(0,0,1,0,Math.PI*2); cx.fill();
      cx.restore();
      /* 1 · el aire */
      cx.shadowColor='rgba('+AZUL+',.95)'; cx.shadowBlur=64;
      cx.fillStyle='rgba('+AZUL+',.40)';
      cx.fillRect(x0,y-alto/2,f,alto);
      /* 2 · el tubo, con la estela apagandose hacia atras */
      var g=cx.createLinearGradient(x0,0,x0+f,0);
      g.addColorStop(0,'rgba('+AZUL+',.22)');
      g.addColorStop(0.55,'rgba('+AZUL+',.66)');
      g.addColorStop(1,'rgba('+AZUL+',1)');
      cx.shadowBlur=26; cx.fillStyle=g;
      cx.fillRect(x0,y-alto/2,f,alto);
      /* 3 · el nucleo */
      var n=cx.createLinearGradient(x0,0,x0+f,0);
      n.addColorStop(0,'rgba(226,238,255,0)');
      n.addColorStop(0.7,'rgba(226,238,255,.6)');
      n.addColorStop(1,'rgba(240,247,255,.96)');
      cx.shadowBlur=0; cx.fillStyle=n;
      cx.fillRect(x0,y-1,f,2);
      /* 4 · la cabeza */
      var cab=t<0.999?1:0.6;
      cx.shadowColor='rgba(170,205,255,1)'; cx.shadowBlur=54*cab;
      cx.fillStyle='rgba(255,255,255,'+(0.97*cab).toFixed(2)+')';
      cx.fillRect(x0+f-1.5,y-alto*1.9,3,alto*3.8);
      cx.shadowBlur=0;
    }
    cx.restore();
    return {x0:x0,an:an,y:y,f:f,t:t,alto:alto};
  }

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
  /* ── LOS ROTULOS, EN COLUMNA ───────────────────────────────────────────
     Todo alineado al canto izquierdo del riel menos lo que pertenece a su
     extremo derecho. Centrado todo, la escena era un cartel; en columna se lee
     como la pagina, que es lo que es. */
  function marco(p,vel,r){
    var tk=Math.max(10,Math.min(14,W*0.0098));
    var x0=r.x0, x1=r.x0+r.an, y=r.y;

    /* que ronda es, sobre el canto izquierdo, con su punto vivo */
    var a1=tramo(p,0.00,0.10)*vel;
    if(a1>0.004&&rot.arriba){
      var pt=x0+tk*0.42;
      cx.save(); cx.globalAlpha=a1; cx.fillStyle='#12A45E';
      cx.beginPath(); cx.arc(pt,y-tk*2.5-tk*0.32,tk*0.25,0,Math.PI*2); cx.fill();
      cx.restore();
      ren(rot.arriba, pt+tk*1.15, y-tk*2.5, tk, a1, 'left',
          'rgba(228,234,243,.92)', 0.26, r.an*0.6);
    }
    /* y el objetivo, sobre el canto derecho: los dos extremos de la escala */
    ren(rot.tope, x1, y-tk*2.5, tk*0.92, tramo(p,0.04,0.14)*vel, 'right',
        'rgba(150,178,230,.78)', 0.20, r.an*0.34);

    /* la lectura viaja en la cabeza mientras el riel corre */
    if(r.t>0.02&&r.t<0.999&&vel>0.02){
      var hx=x0+r.f;
      var derecha=hx>x0+r.an*0.78;
      ren(Math.round(meta*100*r.t)+'%', hx+(derecha?-tk*0.8:tk*0.8), y+tk*2.4,
          tk*1.05, Math.min(1,r.t*5)*vel, derecha?'right':'left',
          'rgba(226,238,255,.96)', 0.06);
    }

    /* cuanto se lleva, bajo el canto izquierdo, cuando la cifra ya esta */
    var a3=tramo(p,CIFRA_B-0.06,CIFRA_B+0.04)*vel;
    ren(rot.dinero, x0, y+tk*2.4, tk*1.05, a3, 'left',
        'rgba(236,243,255,.94)', 0.12, r.an*0.86);
    /* y las condiciones, debajo */
    ren(rot.pie, x0, y+tk*4.5, tk*0.84, tramo(p,CIFRA_B,CIFRA_B+0.10)*vel,
        'left', 'rgba(140,166,214,.70)', 0.20, r.an*0.86);
  }

  /* ── LA CIFRA SALE DE LA CABEZA ────────────────────────────────────────
     No aparece: crece desde el punto exacto donde el riel se ha parado, que es
     lo que la ata al recorrido en vez de dejarla flotando encima. Va alineada
     al canto izquierdo del riel, no centrada. */
  function cifra(p,vel,r){
    var t=tramo(p,CIFRA_A,CIFRA_B);
    if(t<=0.004) return 0;
    var esc=0.06+0.94*t;
    var hx=r.x0+r.an*meta, hy=r.y;
    var dx=r.x0, dy=r.y-hueco();
    cx.save();
    cx.globalAlpha=vel*Math.min(1,t*2.2);
    cx.translate(hx+(dx-hx)*t, hy+(dy-hy)*t);
    cx.scale(esc,esc);
    cx.font='200 '+tamCifra+'px '+cara;
    cx.textAlign='left'; cx.textBaseline='alphabetic';
    cx.fillStyle='#fff';
    cx.fillText(cifraTxt,0,0);
    cx.restore();
    return t;
  }

  function dibuja(p){
    cx.clearRect(0,0,W,H);
    if(p<ABRE_A){
      cx.drawImage(placa,0,0,W,H);
      var r=riel(p,1);
      cifra(p,1,r);
      marco(p,1,r);
      return;
    }
    /* ── EL RIEL SE ABRE ───────────────────────────────────────────────
       El tramo recorrido separa sus dos cantos y por dentro entra la ronda.
       La barra no se va de la escena y la escena no se desmonta: la barra SE
       CONVIERTE en la seccion, que es lo unico que hacia falta que pasara.

       El recorte con «destination-out» borra en proporcion al alfa de lo que
       se pinta, asi que el relleno va opaco siempre: con un degradado, el
       hueco sale a medias y la pagina se queda detras de un velo. */
    var t=pesa(Math.min(1,(p-ABRE_A)/(0.99-ABRE_A)));
    var r=rielY();
    var x0=colX(), an=ancho();
    /* el hueco crece a lo alto deprisa y a lo ancho despues: primero se abre
       la rendija, luego se come los margenes */
    /* La rendija se abre DESPACIO al principio: ahi es cuando se entiende que
       lo que se separa son los dos cantos del riel, y con una curva rapida esa
       lectura se pierde en dos cuadros. Y se come los margenes despues, no a la
       vez: primero se abre, luego crece. */
    var alto=Math.max(2,H*1.12*Math.pow(t,1.25));
    var izq=x0*(1-Math.pow(t,2.4)), anc=an+(W-an)*Math.pow(t,2.4);
    var y0=r-alto/2, y1=r+alto/2;

    cx.drawImage(placa,0,0,W,H);
    cx.save();
    cx.globalCompositeOperation='destination-out';
    cx.fillStyle='#000';
    cx.fillRect(izq,y0,anc,alto);
    cx.restore();
    /* los dos cantos, encendidos mientras se separan: es la luz del riel
       abriendose, y es lo que hace que se lea como que la barra se abre y no
       como que aparece un rectangulo */
    var bri=Math.max(0,1-t*1.35);
    if(bri>0.01){
      cx.save(); cx.globalAlpha=bri;
      cx.shadowColor='rgba(170,205,255,1)'; cx.shadowBlur=44;
      cx.fillStyle='rgba(240,247,255,.95)';
      cx.fillRect(izq,y0-1.5,anc,3);
      cx.fillRect(izq,y1-1.5,anc,3);
      cx.restore();
    }
    /* y la escena que se va: la cifra y sus rotulos se apagan con la tinta */
    var q=Math.max(0,1-t*2.1);
    if(q>0.02){
      var rr=riel(ABRE_A,q*0.5);
      cifra(ABRE_A,q,rr);
      marco(ABRE_A,q,rr);
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
