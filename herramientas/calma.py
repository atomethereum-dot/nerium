# -*- coding: utf-8 -*-
"""Quitar. Seis rondas anadiendo y la palabra fue «cargada».

Contadas las piezas de menos de 26 px que hay en UNA pantalla de escritorio:
treinta y cuatro. Placas de fondo al .34, un rotulo de seccion hecho de cinco
marcas, ordinales en el canto de cada tarjeta, tres sombras por tarjeta, y un
rail de trece rayas a la derecha diciendo lo mismo que el menu de arriba y que
el contador de abajo.

Cada una de esas decisiones la defendi en su momento y cada una, sola, estaba
bien. Juntas son ruido con forma de sistema. Esto es la ronda que resta.

Lo que se va, y por que:

  · las placas del fondo, de .07-.34 a .035-.15 y la mitad de piezas;
  · los dos filetes del epigrafe: un numero y un nombre bastan para decir
    donde estas;
  · los ordinales del canto de las tarjetas, que repiten lo que ya dice el
    orden;
  · dos de las tres sombras de cada tarjeta;
  · el cubo de la estacion, de 11 px con halo a 7 sin el;
  · y el rail de la derecha se duerme: en reposo solo se ve la marca de la
    seccion en la que estas; las trece aparecen al acercarse. No se borra
    —navega— pero deja de contar por tercera vez lo mismo.

`montar_home.py` lo aplica en el paso 21.
"""

MARCA = '/* ══ calma ══'
FIN = '/* ══ fin: calma ══ */'

CSS = """
/* ══ calma ═════════════════════════════════════════════════════════════════
   La ronda que resta. Treinta y cuatro piezas de menos de 26 px en una sola
   pantalla, y tres cosas distintas diciendo en que seccion estas. */

/* ── el rail de la derecha, dormido ──
   El menu de arriba ya subraya la seccion y el rotulo de abajo la nombra.
   Trece rayas mas es decirlo por tercera vez. En reposo solo se ve la de la
   seccion actual; al acercar el raton aparecen las trece, que para eso estan.
   La zona sensible se ensancha con padding, no con un ancho mayor: asi no se
   come el margen de la pagina. */
.srail{padding:10px 6px;transition:opacity .3s var(--ease)}
.srail button:not(.on) i{opacity:0;transition:opacity .3s var(--ease),
  width .3s var(--ease)}
.srail:hover button:not(.on) i,
.srail:focus-within button:not(.on) i{opacity:.45}
/* Y el dedo no tiene raton: en tactil se queda solo la marca de la seccion,
   que es informacion, y se navega con el menu. */
@media(hover:none){
  .srail button:not(.on) i{opacity:0}
  .srail s{display:none}
}

/* ── el pautado de las filas ──
   Las cuatro garantias iban separadas por una linea de puntos. A ese tamano
   una linea punteada es una fila de marcas, no un separador: son treinta y
   tantos puntos por costura. Un filete. */
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .rows li{
  border-image:none}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .rows li+li{
  border-top:1px solid rgba(30,58,116,.12)}

/* ── las cuatro esquinas del telefono ──
   En una pantalla de 390 px habia CUATRO cosas flotando encima del contenido a
   la vez: la flecha de bajar abajo a la izquierda, el idioma debajo, la flecha
   de subir abajo a la derecha y el rotulo de la seccion encima de esa. Y el
   rotulo decia «SECURITY» teniendo «06 SECURITY» a la vista en el mismo
   pantallazo.

   · la flecha de bajar es una pista de la portada: cumple su papel ahi y
     estorba el resto del recorrido, donde ademas convive con la de subir
     apuntando al reves;
   · el rotulo de la seccion se va: con el epigrafe centrado en cada estacion,
     el nombre ya esta en pantalla y sobra decirlo por segunda vez.

   En escritorio se quedan las dos: hay sitio de sobra y ahi no estorban. */
@media(max-width:760px){
  /* No hay ninguna clase que diga «estas arriba», pero el boton de subir se
     enciende solo al bajar: se cuelga de el. */
  body:has(.subir.on) .scrollbtn{opacity:0;pointer-events:none;
    transition:opacity .3s var(--ease)}
  .hud-band{display:none}
}
""" + '\n' + FIN


def aplicar(html):
    """Idempotente."""
    if MARCA in html:
        i = html.index(MARCA)
        j = html.index(FIN, i) + len(FIN)
        return html[:i] + CSS.strip('\n') + html[j:]
    assert html.count('\n</style>') == 1
    return html.replace('\n</style>', '\n' + CSS.strip('\n') + '\n</style>', 1)
