# -*- coding: utf-8 -*-
"""El indice de la derecha, en su carril: ni tapa texto ni le quita el clic.

Dos cosas, y la que se veia no era la grave.

LA QUE NO SE VE. El indice dibuja una raya de 34 px a 10 px del borde, pero la
CAJA de cada boton medía 159: la etiqueta ocupaba sitio en la fila -aunque
estuviera invisible- y encima habia 26 px de relleno por la izquierda. Esos
159 px de <nav> quedan por delante de la pagina. En «security» no se podia
seleccionar el parrafo, en «presale» tampoco el precio y el enlace «News and
mentions» no se podia pinchar: el indice se comia el clic de un texto que ni
siquiera tapaba. Ahora la etiqueta sale del flujo -absoluta, a la izquierda de
su raya- y la caja pasa de 159 a 54.

LA QUE SE VE. En la portada, el campo de losas pasa piezas claras por detras
del rotulo de abajo y de la raya. Medido: la luminancia del fondo detras de
«COMPATIBLE WITH» llega a 0,34 cuando pasa una losa, y el texto es #79ABFF,
que esta en 0,44. Ahi no se lee nada. Un velo oscurisimo debajo lo arregla:
sobre el negro de la pagina no se nota -es #03050A sobre #050609- y sobre la
losa clara la baja hasta que el texto vuelve a despegar.

Y LAS BANDAS DE BORDE A BORDE. Encoger la caja no salva a las marquesinas ni
a los carruseles, que van de borde a borde por diseno y ningun margen les deja
sitio. Ahi el indice se aparta: se mide que secciones llegan a su carril y,
cuando una de esas cae en su banda, se va con un fundido. No se pierde nada:
el contador de abajo sigue diciendo por que seccion vas.

Tres trampas en esa medida, las tres pisadas:

  · Medir la CAJA del texto y no el texto. La caja de un rotulo ocupa todo el
    carril aunque la palabra acabe a la izquierda del todo: doce secciones
    daban choque sin tener ninguno.
  · Medir la marquesina parada. Sale limpia justo en el instante en que la
    miras y a los dos segundos esta encima. Y no basta con mirar scrollWidth,
    porque la de «thesis» se mueve con transform y un transform no crea
    desbordamiento: hay que ver si la caja se sale de su propio recorte.
  · Medir antes de que este dibujada. Con content-visibility:auto lo que esta
    fuera de pantalla no tiene medidas y TODO sale limpio; si eso se guarda,
    la seccion queda marcada limpia para el resto de la visita. Por eso la
    medida devuelve null mientras no haya nada que medir, y se repite.

Y una cuarta que no era de la pagina sino de la sonda: barria toda la altura
de la pantalla en vez de la banda que el indice ocupa de verdad, y cantaba
como choque el texto de «kin», que pasa sesenta pixeles POR DEBAJO. Con eso
llegue a dar por inutil el apartado y a quitarlo; al reponer la sonda
resultaron ser siete choques por pantallazo a 1440.

Barrido continuo de la pagina entera a 1180, 1280, 1366, 1440, 1600, 1920 y
2560: cero. Quitando el apartado vuelven; reponiendo la caja de 159, tambien.

`montar_home.py` lo aplica en el paso 35.
"""

MARCA = '/* ══ carril ══'
FIN = '/* ══ fin: carril ══ */'

CSS = """
/* ══ carril ════════════════════════════════════════════════════════════════
   El indice de secciones, metido en su propio carril. */

/* ── la caja, del ancho de la raya ──
   La etiqueta sale del flujo: en la fila no ocupa, y el <nav> deja de estar
   por delante del texto de media pagina. De 159 px a 54. */
.srail{padding:10px 6px}
.srail button{padding:6px 4px;gap:0}
.srail s{position:absolute;right:calc(100% + 12px);top:50%;
  transform:translate(6px,-50%);
  padding:4px 8px;border-radius:5px;
  background:rgba(6,9,16,.82);backdrop-filter:blur(6px);
  box-shadow:0 2px 14px -6px rgba(0,0,0,.6)}
.srail button:hover s{transform:translate(0,-50%)}
body.light .srail s{background:rgba(255,255,255,.88);
  box-shadow:0 2px 14px -6px rgba(10,12,16,.28)}

/* ── y un velo en la esquina del rotulo ──
   El campo de losas de la portada pasa piezas claras por detras de
   «COMPATIBLE WITH» y de «01 / 11». Medido sobre 26 fotogramas: el pico de
   luminancia del fondo estaba en 0,54 y la tinta es #79ABFF, que esta en
   0,44. Ahi no se lee. El velo lo baja a 0,29 y el contador de 0,41 a 0,17.
   Va DEBAJO del texto, y sobre el negro de la pagina no se nota: es #03050A
   sobre #050609. Mejora, no resuelve: para que el peor caso quede holgado
   habria que tocar la tinta del rotulo, y eso ya es otra decision.
   En la raya del indice NO se pone: ahi el fondo se queda en 0,15 y el velo
   caia dentro del ruido de la medida. Si no se puede demostrar, no va. */
.hud{isolation:isolate}
.hud::after{content:"";position:absolute;pointer-events:none;z-index:-1;
  right:0;bottom:0;width:340px;height:170px;
  background:radial-gradient(120% 120% at 100% 100%,
    rgba(3,5,10,.86) 0%, rgba(3,5,10,.56) 42%, rgba(3,5,10,0) 78%)}
body.light .hud::after{background:radial-gradient(120% 120% at 100% 100%,
    rgba(244,247,252,.88) 0%, rgba(244,247,252,.58) 42%, rgba(244,247,252,0) 78%)}
/* ── y si por debajo pasa una banda de borde a borde, se aparta ── */
/* Aparecer con calma y desaparecer deprisa: mientras se va, sigue estando
   encima. Medido, con el fundido simetrico quedaba un choque en el punto en
   que «kin» entra en la banda. */
.srail{transition:opacity .34s var(--ease)}
.srail.tapa{opacity:0;pointer-events:none;transition-duration:.12s}
/* ══ fin: carril ══ */
"""

ANCLA_JS = '</body>'

JS = """<script>
/* El indice no se monta encima de nada. Solo donde existe: raton y 1180 px
   para arriba. */
(function(){
  var rail=document.getElementById('srail'); if(!rail) return;
  if(!matchMedia('(min-width:1180px) and (hover:hover)').matches) return;
  var secs=[], llenas=[], lim=0, puesto=null;

  /* hasta donde se ve de verdad: la caja, cortada por cada overflow que lleve
     encima. Sin esto una marquesina de 4000 px dice que llega a 4000, cuando
     en pantalla acaba en el borde. */
  function corte(el){
    var der=Infinity, izq=-Infinity, mov=false;
    for(var p=el.parentElement;p&&p!==document.body;p=p.parentElement)
      if(getComputedStyle(p).overflowX!=='visible'){
        var q=p.getBoundingClientRect();
        if(q.right<der) der=q.right;
        if(q.left>izq) izq=q.left;
        if(p.scrollWidth>p.clientWidth+2) mov=true;
      }
    return {der:der, izq:izq, mov:mov};
  }
  /* ¿este texto se mueve? Si su caja se sale del recorte que lo contiene es
     una tira -marquesina o carrusel-, y entonces no vale donde esta AHORA la
     palabra: dentro de un segundo esta en otro sitio. Cuenta ocupado el
     recorte entero.
     Mirar solo scrollWidth no basta: la marquesina de «thesis» se mueve con
     transform, y un transform no crea desbordamiento de scroll. Daba verde y
     a los dos segundos estaba encima del indice. */
  function tira(r,c){
    return c.mov || r.right>c.der+2 || (c.izq>-Infinity && r.left<c.izq-2);
  }
  /* Y se mide el TEXTO, no la caja que lo contiene: la caja de un rotulo
     ocupa todo el carril aunque la palabra acabe a la izquierda del todo. Por
     ahi salieron doce secciones dando choque sin tener ninguno. */
  /* Devuelve null si la seccion no esta dibujada todavia: con
     content-visibility:auto, lo que esta fuera no tiene medidas y TODO sale
     limpio. Si eso se guarda, la seccion queda marcada como limpia para
     siempre y la marquesina se pasea por encima del indice el resto de la
     visita. Aqui se cayo la primera version. */
  function llena(sec){
    var todo=sec.querySelectorAll('*'), medido=false;
    for(var i=0;i<todo.length;i++){
      var e=todo[i], c=null;
      for(var k=0;k<e.childNodes.length;k++){
        var n=e.childNodes[k];
        if(n.nodeType!==3||!n.textContent.trim()) continue;
        if(getComputedStyle(e).visibility==='hidden') break;
        if(c===null) c=corte(e);
        var re=e.getBoundingClientRect();
        if(re.width<2&&re.height<2) continue;          /* sin dibujar */
        medido=true;
        if(tira(re,c)){ if(c.der>lim) return true; continue }
        var rg=document.createRange(); rg.selectNodeContents(n);
        var rs=rg.getClientRects();
        for(var j=0;j<rs.length;j++){
          var q=rs[j];
          if(q.width<2||q.height<2) continue;
          if(Math.min(q.right,c.der)>lim) return true;
        }
      }
    }
    return medido ? false : null;
  }

  /* Se mide cuando la seccion entra en pantalla, no al cargar: la pagina
     lleva content-visibility:auto, asi que lo de fuera no tiene medidas y
     todo saldria limpio. Hasta que se mide cuenta como llena: equivocarse
     escondiendo el indice no le tapa el texto a nadie. */
  var ojoMedir=new IntersectionObserver(function(ee){
    var nuevo=false;
    for(var i=0;i<ee.length;i++){
      if(!ee[i].isIntersecting) continue;
      var k=secs.indexOf(ee[i].target);
      if(k<0||llenas[k]!==undefined) continue;
      var v=llena(ee[i].target);
      if(v===null) continue;            /* aun sin dibujar: se vuelve a mirar */
      llenas[k]=v; nuevo=true;
    }
    if(nuevo) pintar();
  },{threshold:[0,0.02,0.2]});

  /* El indice ocupa casi 300 px de alto: cae sobre DOS secciones a la vez casi
     siempre. Preguntar por la seccion ACTIVA daba verde mientras la de al
     lado le pasaba la marquesina por debajo -medido: estando en «thesis», el
     texto que se le montaba encima era de «kin»-. Asi que se mira la banda.
     Y se mira leyendo las cajas, no con un IntersectionObserver de margen
     negativo: lo probe y en esta pagina no llegaba a disparar. Quince
     getBoundingClientRect por cuadro con el layout ya limpio no se notan, y
     la clase solo se escribe cuando cambia. */
  var puestoB=null;
  function pintar(){
    var r=rail.getBoundingClientRect(), tapa=false;
    for(var i=0;i<secs.length;i++){
      var q=secs[i].getBoundingClientRect();
      if(q.bottom<=r.top||q.top>=r.bottom) continue;
      if(llenas[i]!==false){ tapa=true; break }
    }
    if(tapa!==puesto){ puesto=tapa; rail.classList.toggle('tapa',tapa) }
  }
  function vigila(){ pintar(); requestAnimationFrame(vigila) }

  function lista(){
    ojoMedir.disconnect();
    secs=[].slice.call(document.querySelectorAll('main>section[data-bg]'))
      .filter(function(e){return getComputedStyle(e).display!=='none'});
    llenas=secs.map(function(){return undefined});
    puesto=null;
    lim=rail.getBoundingClientRect().left;
    for(var i=0;i<secs.length;i++) ojoMedir.observe(secs[i]);
  }

  var cita=0;
  addEventListener('resize',function(){
    clearTimeout(cita); cita=setTimeout(lista,220);
  },{passive:true});
  addEventListener('load',function(){setTimeout(lista,700)});
  lista(); vigila();
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
    if 'El indice no se monta encima de nada' not in html:
        assert html.count(ANCLA_JS) == 1
        html = html.replace(ANCLA_JS, JS + ANCLA_JS, 1)
    return html
