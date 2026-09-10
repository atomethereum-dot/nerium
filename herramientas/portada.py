# -*- coding: utf-8 -*-
"""Los arreglos de la portada, que viajan dentro del index.html que se sube.

Se cambia lo que estaba mal, no el diseno: sigue siendo el mosaico centrado
con su titular y sus dos botones. `montar_home.py` lo aplica.
"""

CAMBIOS = [

 # ── 1 · el titular dejaba de ser Switzer ──────────────────────────────────
 # No hay nada que tocar aqui: el arreglo es una regla de CSS y va en
 # bloque_css.txt. Se anota para que se sepa donde vive.

 # ── 2 · el mosaico se salia de la paleta ──────────────────────────────────
 # Aqui vivian seis cambios sobre el campo de bloques de la portada: la paleta
 # que se iba al cian, la mezcla que sumaba en vez de tramar y la barra que
 # llevaba los bloques a blanco puro. Ya no tienen a que agarrarse: el campo
 # entero se sustituye en el paso 12, y el nuevo nace con la paleta buena y
 # con la mezcla en trama. Vive en herramientas/fondo.py y fondo_js.txt.
 #
 # Lo que sigue aqui son las barras del #chroma, que son OTRO lienzo: los
 # tonos 196 a 210 con saturacion del 100 % son cian, no el azul de la marca.
 ("const HUES=[196,202,206,210,212,212,214,216,218,222,226,230,206,212,220,208];",
  "const HUES=[212,214,216,218,220,222,222,224,226,228,230,232,218,222,226,220];"),
 ("      sat:rnd(95,100),",
  "      sat:rnd(78,92),"),

 # ── 3 · la jerarquia de los botones estaba del reves ──────────────────────
 # Con la ronda abierta, la accion principal es entrar en ella; «registrado y
 # auditado» es la prueba que la respalda, no la llamada.
 ('<a class="hb blue" href="#security">Registered &amp; audited</a>\n'
  '      <a class="hb white" href="#presale">Join the Seed Round</a>',
  '<a class="hb blue" href="#presale">Join the Seed Round</a>\n'
  '      <a class="hb white" href="#security">Registered &amp; audited</a>'),

]

# ── 4 · la portada no daba ni un dato ────────────────────────────────────────
# Se podia estar diez segundos delante sin saber el precio, en que redes esta
# ni si los contratos estan verificados. Va debajo de los botones, en la letra
# pequena del propio sitio, sin tocar la composicion.
PRUEBAS = """
    <ul class="hero-pr">
      <li><i></i>Seed Round open</li>
      <li>1 NRM = $0.20</li>
      <li>Ethereum &middot; BNB Chain</li>
      <li>Contracts verified</li>
    </ul>"""

ANCLA = ('<a class="hb white" href="#security">Registered &amp; audited</a>\n'
         '    </div>')

# El guardia mira la ETIQUETA, no el nombre de la clase: el CSS de .hero-pr
# entra antes que esto en montar_home.py, asi que buscar 'hero-pr' a secas
# daba siempre por hecho que la lista ya estaba puesta y no la ponia nunca.
MARCA = '<ul class="hero-pr">'


def aplicar(html):
    """Idempotente."""
    for viejo, nuevo in CAMBIOS:
        if viejo in html:
            html = html.replace(viejo, nuevo)
    # La lista va DESPUES del </div> de .hero-act, como hermana suya dentro de
    # .hero-in; dentro de .hero-act la partiria el display:flex de los botones.
    if MARCA not in html and ANCLA in html:
        html = html.replace(ANCLA, ANCLA + PRUEBAS, 1)
    return html
