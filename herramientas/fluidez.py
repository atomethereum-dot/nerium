# -*- coding: utf-8 -*-
"""Paso 32 · que la pagina se pueda navegar.

Medido antes de tocar nada, recorriendo la pagina entera a 1440x900: 32,7 ms
por cuadro de media y 359 de 667 cuadros por debajo de 30 imagenes por segundo.
Parado, casi todas las secciones iban a 60; el atasco estaba en el DESPLAZARSE.

Quitar capas de pintura no movia la aguja —sin los lienzos 32,6, sin la marca
34,3—, asi que no era pintar. El perfilador de CPU lo dijo claro, sobre 25 s de
recorrido:

    getPropertyValue ....... 8.272 ms   32,9 %
    getBoundingClientRect .. 4.218 ms   16,8 %

O sea: la mitad del tiempo se iba en PREGUNTARLE al navegador cosas que le
obligan a recalcular estilo y maquetacion, sesenta veces por segundo. Tres
sitios, y los tres hacian trabajo que no servia para nada.

Eso arreglo la mitad. La otra mitad no se veia con el perfilador de CPU porque
no era JavaScript: habia que medir con RUEDA DE VERDAD —la pagina se queda con
la rueda en escritorio y mueve ella el scroll, asi que todo lo medido con
«scrollTo» iba por otro camino— y con el trazador del navegador, que reparte el
cuadro entre estilo, maquetacion, pintura y rasterizado. Sobre 313 cuadros:

    recalculo de estilo ...... 9,9 ms por cuadro
    rasterizado .............. 20,0 ms por cuadro
    los rAF .................. 11,0 ms por cuadro
    cuadros de mas de 20 ms ... 137 de 385   ·   p95: 50,0 ms

Diez milisegundos de recalculo de estilo por cuadro en una pagina que no cambia
de forma. La causa esta en el cambio 5: dos propiedades personalizadas escritas
sobre el <html> en casi todos los cuadros. Despues de los cambios 5 a 9, y con
la misma rueda:

    recalculo de estilo ...... 3,0 ms por cuadro   (-70 %)
    rasterizado .............. 12,4 ms por cuadro  (-38 %)
    los rAF ................... 3,9 ms por cuadro  (-65 %)
    cuadros de mas de 20 ms .... 54 de 427   ·   p95: 33,4 ms
    cuadros entregados ......... 357 frente a 313

Y el diseno no se mueve: comparadas las mismas trece vistas antes y despues, la
diferencia esta por debajo de lo que la propia pagina cambia entre dos pasadas
suyas —tiene lienzos animados—, y en las vistas que si son deterministas es
cero.
"""

MARCA = '/* ══ fluidez ══ Lo aplica herramientas/fluidez.py ═══'

# ── 1 · el vigilante del tono ────────────────────────────────────────────────
# Un bucle de «requestAnimationFrame» eterno que en CADA cuadro llamaba a
# «getComputedStyle» solo para ver si «--wash» habia cambiado. «getComputedStyle»
# obliga a recalcular el estilo del documento; hacerlo por cuadro, para siempre,
# es el 33 % del coste del scroll de toda la pagina.
#
# Y no hacia falta: «--wash» se escribe como estilo EN LINEA sobre el <html>
# —linea 4749, «documentElement.style.setProperty»—, asi que se puede leer de
# «raiz.style», que devuelve la declaracion tal cual y no recalcula nada.
# Cuando no hay valor en linea, la cadena vacia da luminancia 0, que es
# justamente el «#04070C» oscuro del CSS: mismo resultado, coste cero.
TONO_VIEJO = """  (function mira(){
    requestAnimationFrame(mira);
    const q=lum(getComputedStyle(raiz).getPropertyValue('--wash'))>.35;"""
TONO_NUEVO = """  (function mira(){
    requestAnimationFrame(mira);
    /* «raiz.style» y NO «getComputedStyle»: lo segundo recalcula el estilo del
       documento entero, y esto corre en cada cuadro mientras la pagina este
       abierta. Era el 33 % del coste de desplazarse. El valor se escribe en
       linea sobre el <html>, asi que leerlo de aqui es exacto y gratis. */
    const q=lum(raiz.style.getPropertyValue('--wash'))>.35;"""

# ── 2 · el bucle que no hacia nada ───────────────────────────────────────────
# Leia «scrollWidth» y «clientWidth» del carril —las dos fuerzan maquetacion—
# en cada cuadro, calculaba un numero y lo guardaba en «lastP»... que no se lee
# en ninguna parte. Trabajo puro perdido, sesenta veces por segundo. Se va el
# bucle; los escuchadores que ponen el modo manual se quedan, que esos si valen.
MUERTO_VIEJO = """    let lastP=-1;
    (function tick(){
      if(!manual){
        const max=rail.scrollWidth-rail.clientWidth;
        if(max>2){
          const y0=top-vh*.86, y1=top+h-vh*.24;
          let p=Math.min(1,Math.max(0,(scrollY-y0)/Math.max(1,y1-y0)));
          lastP=p;
        }
      }
      requestAnimationFrame(tick);
    })();"""
MUERTO_NUEVO = """    /* Aqui habia un bucle que en cada cuadro leia «scrollWidth» y
       «clientWidth» —las dos fuerzan maquetacion— para calcular una fraccion
       que guardaba en «lastP», y «lastP» no se leia en ninguna parte. Sesenta
       veces por segundo, mientras la pagina estuviera abierta, para nada.
       Los escuchadores de «takeOver» se quedan: esos si cambian el modo. */"""

# ── 3 · el paralaje, que se peleaba consigo mismo ────────────────────────────
# En cada cuadro recorria sus elementos haciendo LEER-ESCRIBIR-LEER-ESCRIBIR:
# «getBoundingClientRect» de uno, «style.transform» del mismo, y vuelta. Cada
# escritura invalida la maquetacion, asi que la lectura siguiente obliga a
# rehacerla: con ocho elementos son ocho maquetaciones por cuadro en vez de una.
#
# Ahora se lee TODO primero y se escribe TODO despues —una sola maquetacion— y
# ademas no se hace nada si la pagina no se ha movido, que es la mayoria de los
# cuadros.
PARALAJE_VIEJO = """  (function paso(t){
    requestAnimationFrame(paso);
    if(pend.length) repaso(t || 0);
    if(!flota.length) return;
    var h = innerHeight;
    for(var i = 0; i < flota.length; i++){
      var f = flota[i], r = f.el.getBoundingClientRect();
      if(r.bottom < -240 || r.top > h + 240) continue;
      var p = (r.top + r.height / 2 - h / 2) / h;   /* -1 arriba, +1 abajo */
      f.el.style.transform = 'translate3d(0,' + (p * f.k).toFixed(2) + 'px,0)';
    }
  })(0);"""
PARALAJE_NUEVO = """  /* NI UNA LECTURA DE GEOMETRIA POR CUADRO.
     Antes preguntaba «getBoundingClientRect» de cada elemento en cada cuadro.
     Medido con el perfilador: 3.385 ms de 23.598, el 14 % del coste de
     desplazarse por la pagina entera, y el mayor de todos.

     Y no era solo el numero de llamadas: justo antes, en el mismo cuadro, el
     sistema que escala las secciones ESCRIBE «transform» sobre ellas. Cada
     escritura invalida la maquetacion, asi que la primera lectura de aqui
     obligaba a rehacerla entera. Escribir-leer-escribir-leer en el mismo
     cuadro es el caso peor que hay.

     Ahora el sitio de cada pieza en el documento se mide UNA vez —y otra al
     cambiar el tamaño de ventana— y por cuadro solo se resta el scroll, que
     es aritmetica. Cero lecturas.

     La cuenta ignora el escalado de la seccion que contiene cada pieza, que
     la mueve unos pocos pixeles. En un paralaje de nueve a veinticuatro
     pixeles eso no se ve, y cuesta la mitad del presupuesto de la pagina. */
  var antesY = -1;
  function situar(){
    for(var i = 0; i < flota.length; i++){
      var f = flota[i];
      f.el.style.transform = '';
      var r = f.el.getBoundingClientRect();
      f.y = r.top + scrollY + r.height / 2;
    }
  }
  if(flota.length){
    situar();
    addEventListener('resize', situar, {passive:true});
    addEventListener('load', function(){ setTimeout(situar, 600) });
  }
  (function paso(t){
    requestAnimationFrame(paso);
    if(pend.length) repaso(t || 0);
    if(!flota.length) return;
    if(scrollY === antesY) return;
    antesY = scrollY;
    var h = innerHeight, medio = scrollY + h / 2;
    for(var i = 0; i < flota.length; i++){
      var f = flota[i], d = f.y - medio;
      if(d < -h - 240 || d > h + 240) continue;
      f.el.style.transform = 'translate3d(0,' + ((d / h) * f.k).toFixed(2) + 'px,0)';
    }
  })(0);"""



# ── 4 · el scroll suavizado, por TIEMPO y no por cuadro ──────────────────────
# En escritorio la pagina se queda con la rueda —«preventDefault»— y mueve ella
# el scroll con un suavizado propio. El suavizado avanzaba un 11 % de lo que
# falta EN CADA CUADRO, y eso solo se comporta como se diseño si los cuadros
# duran 16,7 ms. Medido con ruedas de verdad —100 px cada 50 ms, como un raton—
# los cuadros duraban 34,6 ms: la mitad de rapido, asi que al soltar la rueda
# la pagina iba 219 px por detras de donde se le habia pedido.
#
# Es el peor sitio donde puede aparecer un retraso, porque no es una animacion
# de adorno: es la respuesta a lo que el usuario acaba de hacer con la mano.
#
# Ahora el paso se calcula con el tiempo que ha durado el cuadro. A 60 por
# segundo sale exactamente el mismo 0,11 de antes —el tacto no cambia— y
# cuando un cuadro se alarga, avanza lo que le corresponde en vez de quedarse
# corto. El retraso deja de acumularse.
SUAVE_VIEJO = """  function frame(){
    if(smooth){
      const prev=S.y;
      S.y=lerp(S.y,S.t,.11);
      if(Math.abs(S.t-S.y)<.4)S.y=S.t;
      S.v=S.y-prev;
      if(Math.abs(S.v)>.05)scrollTo({top:S.y,behavior:'auto'});"""
SUAVE_NUEVO = """  let antesT=0;
  function frame(ahora){
    if(smooth){
      const prev=S.y;
      /* El paso, por TIEMPO y no por cuadro. Antes era un 0,11 fijo por
         cuadro: con cuadros de 34 ms —medido con ruedas de verdad— avanzaba la
         mitad de lo que toca y la pagina se quedaba 219 px por detras de la
         rueda. A 60 por segundo esta cuenta da el mismo 0,11 de siempre, asi
         que el tacto es identico; lo que cambia es que ya no se retrasa
         cuando un cuadro se alarga. */
      const dt=Math.min(64,(ahora||0)-antesT||16.7); antesT=ahora||0;
      const k=1-Math.pow(1-.11,dt/16.7);
      S.y=lerp(S.y,S.t,k);
      if(Math.abs(S.t-S.y)<.4)S.y=S.t;
      S.v=S.y-prev;
      if(Math.abs(S.v)>.05)scrollTo(0,S.y);"""


# ── 5 · el lavado deja de vivir en la raiz ───────────────────────────────────
# Este es el atasco de verdad. Medido con la rueda de un raton —110 px cada
# 45 ms— y el trazador del navegador abierto, sobre 290 cuadros:
#
#     recalculo de estilo ... 12,0 ms por cuadro
#     rasterizado ........... 22,2 ms por cuadro
#     los rAF ............... 12,9 ms por cuadro
#     cuadros de mas de 20 ms .. 140 de 321
#
# Doce milisegundos de recalculo de estilo por cuadro para una pagina que no
# cambia de forma. La causa: estas dos lineas. El lavado y el azul se escriben
# como propiedades personalizadas SOBRE EL <html>, y una propiedad que se
# hereda, escrita en la raiz, obliga a Chrome a repasar el estilo del documento
# ENTERO: 1.135 de los 1.644 elementos de la pagina, 2,6 ms cada pasada, y las
# dos cambiaban en casi todos los cuadros mientras se baja.
#
# No es que alguien las lea de mas: probado escribiendolas con un nombre que no
# usa nadie, cuesta exactamente lo mismo. Es la escritura en si.
#
# El lavado no necesita ser variable: lo pintan cinco elementos contados. Va en
# linea al <div id=wash> —que esta vacio, asi que repasar su rama es repasar un
# elemento— y a las secciones que lo pintan, como «background-color», que no se
# hereda y por tanto no arrastra a nadie. Quien lo lee desde JS lo lee de ahi.
#
# Cuales son «las secciones que lo pintan» no se decide de memoria: se pregunta.
# Antes de escribir nada se compara el color calculado de cada candidata con el
# del propio #wash, y solo entran las que coinciden. Asi el <footer>, que
# declara «background:var(--wash)» pero lo pierde contra una regla mas fuerte,
# se queda fuera y conserva su color. Se vuelve a preguntar en cada medida.
LAVADO_VIEJO = """    const measure=()=>{
      bands.forEach(b=>{let y=0,n=b.n;while(n){y+=n.offsetTop;n=n.offsetParent}b.top=y});
      vivas=bands.filter(b=>b.n.offsetHeight>0||b.n.offsetParent);
    };
    measure();
    let cur=[0,0,0],ca=[0,0,0],first=true,lastBg='',lastAcc='';"""
LAVADO_NUEVO = """    /* NI UNA VARIABLE HEREDABLE EN LA RAIZ POR CUADRO.
       Escribir una propiedad personalizada sobre el <html> obliga a repasar el
       estilo del documento entero —1.135 de 1.644 elementos, 2,6 ms— y esto
       cambiaba en casi todos los cuadros al bajar: 12 ms por cuadro tirados.
       El lavado se reparte a mano, y el azul mas abajo se espacia. */
    const capa=document.getElementById('wash');
    let pinta=null;
    function reparte(){
      /* Quien pinta el lavado se pregunta, no se supone: se limpia lo escrito,
         se compara el color calculado de cada candidata con el del propio
         #wash y solo entran las que coinciden. El <footer> lo declara pero lo
         pierde contra una regla mas fuerte, y asi se queda fuera solo. */
      const cand=[...document.querySelectorAll('.hero,section.dark,.stack,footer')];
      for(const e of cand)e.style.backgroundColor='';
      if(!capa){pinta=[];return}
      capa.style.removeProperty('--wash');
      const v=getComputedStyle(capa).backgroundColor;
      pinta=cand.filter(e=>getComputedStyle(e).backgroundColor===v);
      lastBg='';
    }
    function lavado(c){
      if(!pinta)reparte();
      /* El #wash esta vacio: escribirle la variable cuesta un elemento, y de
         ahi la leen el vigilante del tono y el cursor. */
      if(capa)capa.style.setProperty('--wash',c);
      else document.documentElement.style.setProperty('--wash',c);
      for(let i=0;i<pinta.length;i++)pinta[i].style.backgroundColor=c;
    }
    const measure=()=>{
      bands.forEach(b=>{let y=0,n=b.n;while(n){y+=n.offsetTop;n=n.offsetParent}b.top=y});
      vivas=bands.filter(b=>b.n.offsetHeight>0||b.n.offsetParent);
      pinta=null;
    };
    measure();
    let cur=[0,0,0],ca=[0,0,0],first=true,lastBg='',lastAcc='',puesto='',ap=[0,0,0];"""

# ── 6 · el azul, que si tiene que ser variable, pero no por cuadro ───────────
# El azul no se puede sacar de la raiz: lo usan cuarenta y siete reglas, y dos
# de ellas —«::selection» y «:focus-visible»— valen para cualquier elemento de
# la pagina. Lo que si se puede es no reescribirlo sesenta veces por segundo.
#
# Mientras se mueve se refresca cada vez que ha corrido seis puntos de 255
# —un dos por ciento, sobre acentos pequenos, y en movimiento— y en cuanto la
# transicion se para se escribe el valor exacto. El color al que llega es
# siempre el mismo; solo se ahorran los pasos intermedios que nadie puede ver.
AZUL_VIEJO = """      if(c1!==lastBg){lastBg=c1;document.documentElement.style.setProperty('--wash',c1)}
      if(c2!==lastAcc){lastAcc=c2;document.documentElement.style.setProperty('--blue',c2)}"""
AZUL_NUEVO = """      if(c1!==lastBg){lastBg=c1;lavado(c1)}
      /* El azul si vive en la raiz —lo piden «::selection» y «:focus-visible»,
         que valen para cualquier elemento—, pero no se reescribe por cuadro:
         mientras corre, cada seis puntos de 255; en cuanto se para, exacto. */
      if(c2!==puesto&&(c2===lastAcc||
         Math.max(Math.abs(ca[0]-ap[0]),Math.abs(ca[1]-ap[1]),Math.abs(ca[2]-ap[2]))>=6)){
        puesto=c2; ap=[ca[0],ca[1],ca[2]];
        document.documentElement.style.setProperty('--blue',c2);
      }
      lastAcc=c2;"""

# ── 7 · el vigilante del tono, donde ahora vive el lavado ────────────────────
# El cambio 1 lo dejo leyendo el estilo en linea del <html>. Ahi ya no esta:
# esta en el #wash. Sin esto la pagina se quedaria siempre en modo oscuro.
TONO2_VIEJO = """    /* «raiz.style» y NO «getComputedStyle»: lo segundo recalcula el estilo del
       documento entero, y esto corre en cada cuadro mientras la pagina este
       abierta. Era el 33 % del coste de desplazarse. El valor se escribe en
       linea sobre el <html>, asi que leerlo de aqui es exacto y gratis. */
    const q=lum(raiz.style.getPropertyValue('--wash'))>.35;"""
TONO2_NUEVO = """    /* El estilo EN LINEA y NO «getComputedStyle»: lo segundo recalcula el
       estilo del documento entero, y esto corre en cada cuadro mientras la
       pagina este abierta. Era el 33 % del coste de desplazarse. El lavado se
       escribe en linea sobre el #wash, asi que leerlo de ahi es exacto y
       gratis; sin valor, la cadena vacia da luminancia 0, que es el oscuro
       del CSS. */
    const q=lum(sitio?sitio.style.getPropertyValue('--wash'):'')>.35;"""
TONO3_VIEJO = """  const lum=c=>{
    const m=(c||'').match(/[\d.]+/g); if(!m||m.length<3)return 0;"""
TONO3_NUEVO = """  const sitio=document.getElementById('wash');
  const lum=c=>{
    const m=(c||'').match(/[\d.]+/g); if(!m||m.length<3)return 0;"""

# ── 8 · la tinta del cursor ──────────────────────────────────────────────────
# El lienzo del cursor preguntaba «getComputedStyle» del <html> EN CADA CUADRO
# para decidir si dibujarse en claro o en oscuro. Eso fuerza un recalculo de
# estilo por cuadro, y ademas el lavado ya no esta ahi: se quedaria siempre
# claro, invisible sobre las secciones claras.
TINTA_VIEJO = """  let medido=false;
  function ink(){
    const w=getComputedStyle(document.documentElement).getPropertyValue('--wash').trim();"""
TINTA_NUEVO = """  let medido=false;
  const capaW=document.getElementById('wash');
  function ink(){
    /* El estilo en linea del #wash, que es donde vive ahora el lavado, y no
       «getComputedStyle», que recalculaba el documento entero en cada cuadro
       del cursor. Sin valor se devuelve la tinta clara, igual que antes. */
    const w=capaW?capaW.style.getPropertyValue('--wash').trim():'';"""

# ── 9 · el cursor del tecleo ─────────────────────────────────────────────────
# «.tec-cur» se pinta del color del lavado, y lo tomaba de la raiz. Como el
# cursor se crea de nuevo en cada letra, el color se le pone al crearlo.
TECLEO_VIEJO = """  const SIM='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\\\<>[]{}#$%&*+=-';
  if(CALMA)return;"""
TECLEO_NUEVO = """  const SIM='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\\\<>[]{}#$%&*+=-';
  if(CALMA)return;
  const lavadoEl=document.getElementById('wash');"""
CURSOR_VIEJO = """        const cur=document.createElement('span');
        cur.className='tec-cur';"""
CURSOR_NUEVO = """        const cur=document.createElement('span');
        cur.className='tec-cur';
        /* El lavado vive en el #wash, no en la raiz; el cursor se crea en
           cada letra, asi que el color se le pone aqui. */
        if(lavadoEl)cur.style.color=lavadoEl.style.getPropertyValue('--wash');"""

CAMBIOS = [
    ('el vigilante del tono', TONO_VIEJO, TONO_NUEVO),
    ('el bucle muerto del carril', MUERTO_VIEJO, MUERTO_NUEVO),
    ('el paralaje', PARALAJE_VIEJO, PARALAJE_NUEVO),
    ('el scroll suavizado', SUAVE_VIEJO, SUAVE_NUEVO),
    ('el lavado fuera de la raiz', LAVADO_VIEJO, LAVADO_NUEVO),
    ('el azul, espaciado', AZUL_VIEJO, AZUL_NUEVO),
    ('donde vive el lavado', TONO3_VIEJO, TONO3_NUEVO),
    ('el tono lo lee del wash', TONO2_VIEJO, TONO2_NUEVO),
    ('la tinta del cursor', TINTA_VIEJO, TINTA_NUEVO),
    ('el wash para el tecleo', TECLEO_VIEJO, TECLEO_NUEVO),
    ('el cursor del tecleo', CURSOR_VIEJO, CURSOR_NUEVO),
]


def aplicar(html):
    """Idempotente: si el cambio ya esta, no lo repite."""
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
    # Primero se calcula y luego se abre para escribir: abrir en 'w' vacia el
    # archivo, y si «aplicar» se queja a mitad, ya no hay pagina que arreglar.
    salida = aplicar(s)
    io.open(p, 'w', encoding='utf-8').write(salida)
    print('fluidez aplicada')
