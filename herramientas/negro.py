# -*- coding: utf-8 -*-
"""Las secciones oscuras, en negro de verdad. Sin tocar ni una animacion.

Lo que se veia como negro no lo era: «#0A0E18» en «builds», en la ruta y en la
documentacion, «#050609» en la cinta, «#05070C» en el escenario del final. Son
azules muy oscuros, y encima «builds» y la ruta llevaban un resplandor azul de
1100 px cruzandoles la esquina. De ahi el tono marino de todas esas pantallas.

Ahora el suelo es «#000000» en las seis, y el resplandor de esquina se retira.
Se cambian tres cosas por seccion, que si se cambia solo una el azul vuelve
por otro lado:

  · el «background» del CSS, que es lo que pinta la caja;
  · el «data-bg» del marcado, que es de donde la pagina saca el color de la
    banda que va por detras de todo al hacer scroll;
  · y en el escenario del final, el color con el que su LIENZO se limpia cada
    cuadro, que no esta en el CSS sino dentro del guion.

Lo que NO se toca, y es el encargo entero: las animaciones. Los cubos siguen
volando, la cinta sigue corriendo, la hebra de la ruta sigue encendida y los
resplandores que pinta cada lienzo —los que forman parte de su escena— siguen
donde estaban. Lo unico que se va es el SUELO azul de debajo.

`montar_home.py` lo aplica en el paso 30.
"""

MARCA = '/* ══ el negro de verdad ══'
FIN = '/* ══ fin: negro ══ */'

# Las secciones y el color que traian. El comentario del CSS los deja escritos
# para que se vea de un vistazo lo lejos del negro que estaban.
SECCIONES = [
    ('.builds', '#0A0E18'),
    ('.ruta',   '#0A0E18'),
    ('.hpin',   '#0A0E18'),
    ('.kin',    '#050609'),
    ('.xf',     '#000000'),
    ('.xl',     '#05070C'),
]

# El «data-bg» de cada seccion: la banda que la pagina pinta por detras.
DATA_BG = [
    ('id="builds" data-bg="#0A0E18"', 'id="builds" data-bg="#000000"'),
    ('id="ruta" data-bg="#0A0E18"',   'id="ruta" data-bg="#000000"'),
    ('id="docs" data-bg="#0A0E18"',   'id="docs" data-bg="#000000"'),
    ('class="kin" data-bg="#050609"', 'class="kin" data-bg="#000000"'),
    ('id="xlight" data-bg="#05070C"', 'id="xlight" data-bg="#000000"'),
]

# Y el lienzo del escenario del final, que se limpia con su propio color desde
# el guion: en el CSS no aparece, asi que cambiarlo solo en el CSS no bastaba.
LIENZOS = [
    ("sctx.fillStyle='#05070C'; sctx.fillRect(0,0,W,H);",
     "sctx.fillStyle='#000000'; sctx.fillRect(0,0,W,H);"),
    ("sctx.fillStyle='rgba(4,6,11,.26)';",
     "sctx.fillStyle='rgba(0,0,0,.26)';"),
]

_SEL = ','.join(s for s, _ in SECCIONES)
_LISTA = '\n'.join('     %s  venia de %s' % (s.ljust(9), c) for s, c in SECCIONES)

CSS = """
/* ══ el negro de verdad ════════════════════════════════════════════════════
   Lo que parecia negro eran azules muy oscuros:

__LISTA__

   y encima «builds» y la ruta llevaban un resplandor azul de 1100 px por la
   esquina. Suelo negro y fuera el resplandor de esquina.

   Las animaciones no se tocan: los cubos, la cinta, la hebra y los
   resplandores que pinta cada lienzo siguen igual. Lo unico que se va es el
   suelo de debajo. */
__SEL__{background:#000}
/* El resplandor de esquina era lo que mas tiznaba de azul: 1100 x 520 px de
   «rgba(47,107,255,.16)» entrando por arriba a la izquierda. */
.builds::before,.ruta::before{display:none}
""" + '\n' + FIN


def aplicar(html):
    """Idempotente."""
    for viejo, nuevo in DATA_BG:
        if viejo in html:
            html = html.replace(viejo, nuevo)
    for viejo, nuevo in LIENZOS:
        if viejo in html:
            html = html.replace(viejo, nuevo)
    css = CSS.replace('__SEL__', _SEL).replace('__LISTA__', _LISTA).strip('\n')
    if MARCA in html:
        i = html.index(MARCA)
        j = html.index(FIN, i) + len(FIN)
        return html[:i] + css + html[j:]
    assert html.count('\n</style>') == 1
    return html.replace('\n</style>', '\n' + css + '\n</style>', 1)
