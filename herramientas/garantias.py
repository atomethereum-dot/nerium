# -*- coding: utf-8 -*-
"""Las cuatro garantias: aire arriba y los textos en su linea.

Dos cosas que se veian en cuanto alguien miraba la seccion, y que ninguna
bateria miraba porque ninguna medía huecos ni lineas base.

1 · El epigrafe pegado a la primera fila
    «04 Guarantees» caia a CERO pixeles del borde de la lista. Cero. Las
    demas secciones tienen entre 13 y 48, asi que no era una decision de
    ritmo sino un descuido, y encima el borde superior de la lista es una
    linea de puntos: el rotulo no quedaba cerca de la raya, quedaba ENCIMA.

    La causa estaba escrita hace tiempo: existe la regla

        .say .sk, .rows-head .sk, .join-head .sk { margin-bottom: ... }

    y «.rows-head» no existe en el marcado. Se escribio pensando en esta
    seccion y nunca llego a engancharla. Se enchufa por identificador, que es
    lo que de verdad hay.

2 · La descripcion mas arriba que el titulo de la fila
    En cada fila hay un titulo grande —32 px— y una descripcion pequena
    —16.5 px—, uno al lado del otro, y la fila los alineaba por ARRIBA
    («align-items:flex-start»). Alinear por arriba dos textos de tamano
    distinto no los alinea: la caja de linea del grande es mas alta, asi que
    su letra empieza mas abajo. Medido, la descripcion iba 18 px por encima
    del titulo. No 18 px de caja: 18 px de LINEA BASE, que es lo que ve el
    ojo. (La primera medida dijo 22, y estaba mal: media el fondo del renglon,
    que en dos tamanos distintos no es lo mismo que la linea base. El numero
    bueno sale con una caja en linea de altura cero, que se apoya EXACTA sobre
    ella.)

    La solucion no es un margen a ojo —eso se descuadra en cuanto cambia un
    «clamp»—: es «align-self:baseline» en los dos, que es justo para esto.
    Se pone en las dos piezas y no en la fila entera, porque el numero de
    orden y el icono SI tienen que seguir pegados arriba.

    En el telefono la descripcion baja a su propio renglon —«flex:1 0 100 %», a partir de 820 px—,
    o sea otra linea del flex, y ahi la linea base no se comparte ni hace
    falta: el movil se queda como estaba.

No estrena ni un texto.

`montar_home.py` lo aplica en el paso 25.
"""

MARCA = '/* ══ las garantias ══'
FIN = '/* ══ fin: garantias ══ */'

CSS = """
/* ══ las garantias ════════════════════════════════════════════════════════
   Aire entre el epigrafe y la lista, y los dos textos de cada fila en la
   misma linea. */

/* ── 1 · el epigrafe ──
   Iba a CERO del borde de la lista, y ese borde es una linea de puntos: el
   rotulo no quedaba cerca de la raya, quedaba encima. La regla que le daba
   aire existia desde hace tiempo pero apuntaba a «.rows-head», que no esta
   en el marcado. Se enchufa por identificador, que es lo que hay. */
#solutions .sk{margin-bottom:clamp(18px,2vw,28px)}

/* ── 2 · las dos columnas de cada fila ──
   Un titulo de 32 px y una descripcion de 16.5 px alineados por arriba no
   quedan alineados: la caja de linea del grande es mas alta y su letra
   empieza mas abajo. Medido, la descripcion iba 18 px POR ENCIMA del titulo.
   «baseline» los pone en el mismo renglon sea cual sea el tamano, que es lo
   que el ojo llama «alineado».

   Solo en estas dos piezas: el numero de orden y el icono siguen arriba. */
.rows b,.rows .rd{align-self:baseline}

/* En el telefono la descripcion baja a su propio renglon del flex, y entre
   renglones distintos no hay linea base que compartir. Se deja como estaba
   para no arrastrarla con un margen que alli no pinta nada. */
@media(max-width:820px){
  .rows b,.rows .rd{align-self:flex-start}
}
""" + '\n' + FIN


def aplicar(html):
    """Idempotente."""
    css = CSS.strip('\n')
    if MARCA in html:
        i = html.index(MARCA)
        j = html.index(FIN, i) + len(FIN)
        return html[:i] + css + html[j:]
    assert html.count('\n</style>') == 1
    return html.replace('\n</style>', '\n' + css + '\n</style>', 1)
