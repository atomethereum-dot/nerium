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


CAMBIOS = [
    ('el vigilante del tono', TONO_VIEJO, TONO_NUEVO),
    ('el bucle muerto del carril', MUERTO_VIEJO, MUERTO_NUEVO),
    ('el paralaje', PARALAJE_VIEJO, PARALAJE_NUEVO),
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
    io.open(p, 'w', encoding='utf-8').write(aplicar(s))
    print('fluidez aplicada')
