# -*- coding: utf-8 -*-
"""Paso 35 · el aviso de la ronda, fuera de la portada.

La franja azul de arriba del todo —«Seed Round · 85 % complete · 1 NRM =
$0.20 · Join the Seed Round»— se retira. Era lo menos oscuro de la pagina, un
azul saturado a pantalla completa justo encima de una portada negra, y repetia
el mismo CTA que ya esta dos veces mas abajo.

No se borra: se apaga. La franja, su cuenta y su script se quedan enteros
donde estan, porque el dia que la ronda pida gritar se vuelven a encender
quitando una clase.

Como se apaga importa. La franja ya tenia un estado de apagado —«body.ann-off»,
el que pone la X— pero ese no vale aqui: el script lo QUITA solo en cuanto la
recaudacion avanza dos puntos, que es justo lo que se quiere de un aviso que
uno cierra y de ninguna manera lo que se quiere de una decision de diseno. Asi
que va un estado propio, «ann-fuera», que el script no toca.

Y con la franja se va su hueco. El alto de la franja es «--ann», y de esa
misma variable cuelgan la posicion de la cabecera, el relleno de arriba de la
portada y el techo del menu de movil. Poniendola a cero, las tres suben solas:
no hace falta tocar ninguna.
"""

MARCA = '/* ══ aviso ══ Lo aplica herramientas/aviso.py ═══'

# ── el estado propio ─────────────────────────────────────────────────────────
# Va detras de «body.ann-off .ann{height:0}» para no pelearse con el orden, y
# no comparte clase con el: «ann-off» es «lo ha cerrado alguien» y vuelve solo;
# «ann-fuera» es «no va», y no vuelve.
CSS_VIEJO = """body.ann-off .ann{height:0}"""
CSS_NUEVO = """body.ann-off .ann{height:0}
""" + MARCA + """══════════════════════════
   La franja de la ronda no se monta. Se queda entera en el marcado: quitando
   la clase «ann-fuera» del cuerpo vuelve como estaba, con su cuenta y su X.

   Es un estado propio y no el de la X a proposito: el de la X lo quita el
   script solo en cuanto la recaudacion avanza dos puntos —un aviso que se
   cierra para siempre deja de avisar—, y eso, que esta bien para quien la
   cierra, se llevaria por delante la decision. */
body.ann-fuera{--ann:0px}
body.ann-fuera .ann{height:0;pointer-events:none;transition:none}"""

CUERPO_VIEJO = """<body>"""
CUERPO_NUEVO = """<body class="ann-fuera">"""


CAMBIOS = [
    ('el estado propio', CSS_VIEJO, CSS_NUEVO),
    ('y puesto en el cuerpo', CUERPO_VIEJO, CUERPO_NUEVO),
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
    salida = aplicar(s)
    io.open(p, 'w', encoding='utf-8').write(salida)
    print('aviso apagado')
