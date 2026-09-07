# -*- coding: utf-8 -*-
"""La marca de la web: el cubo, con su plata fija.

Vive aparte porque los <symbol> viajan dentro del index.html que se sube, y un
diseno nuevo traeria de vuelta la marca anterior. `montar_home.py` lo aplica.

El bloque se genera con herramientas/logo/logo.py; aqui va ya escrito para no
depender de nada al montar.
"""

VIEJO_ANCLA = '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><symbol id="nlogo"'
FIN_ANCLA = '</symbol></svg>'

NUEVO = """<svg width="0" height="0" style="position:absolute" aria-hidden="true">
<!-- El cubo lleva su plata fija: no toma el color del texto como la marca
     anterior. Los degradados van aqui fuera y no dentro de cada <symbol>,
     porque referenciar un id desde dentro del arbol que clona <use> no es
     fiable en todos los navegadores; declarados en el documento, si. -->
<defs>
  <linearGradient id="nrmPlata" x1="0" y1="0" x2=".28" y2="1">
    <stop offset="0" stop-color="#E7EAF1"/>
    <stop offset=".38" stop-color="#C6CBD7"/>
    <stop offset=".74" stop-color="#A9AEBB"/>
    <stop offset="1" stop-color="#9298A6"/>
  </linearGradient>
  <linearGradient id="nrmBrillo" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/>
    <stop offset=".5" stop-color="#fff"/>
    <stop offset="1" stop-color="#fff" stop-opacity="0"/>
  </linearGradient>
</defs>
<symbol id="nlogo" viewBox="0 0 672 672">
  <g transform="translate(-83.12 -88.92) scale(1.1963)">
    <path fill="#6E7482" d="M468.35 86.03 L497.06 124.43 L614.67 506.75 L232.35 624.37 L203.65 585.97 L585.97 468.35 Z"/>
    <path fill="url(#nrmPlata)" d="M86.03 203.65 L468.35 86.03 L585.97 468.35 L203.65 585.97 Z"/>
    <path fill="#FAFBFC" d="M181.89 515.24 L564.21 397.62 L585.97 468.35 L203.65 585.97 Z"/>
    <path fill="url(#nrmBrillo)" opacity=".8" d="M200.73 168.36 L229.40 159.54 L247.62 572.44 L220.85 580.67 Z"/>
  </g>
</symbol>
<!-- El de la cabecera se dibuja a 17-26 px: ahi el reflejo es ruido. -->
<symbol id="nlogo-s" viewBox="0 0 672 672">
  <g transform="translate(-83.12 -88.92) scale(1.1963)">
    <path fill="#6E7482" d="M468.35 86.03 L497.06 124.43 L614.67 506.75 L232.35 624.37 L203.65 585.97 L585.97 468.35 Z"/>
    <path fill="url(#nrmPlata)" d="M86.03 203.65 L468.35 86.03 L585.97 468.35 L203.65 585.97 Z"/>
    <path fill="#FAFBFC" d="M181.89 515.24 L564.21 397.62 L585.97 468.35 L203.65 585.97 Z"/>
  </g>
</symbol></svg>"""


def aplicar(html):
    """Cambia los dos <symbol> de la marca. Idempotente."""
    if NUEVO in html:
        return html
    i = html.find(VIEJO_ANCLA)
    if i < 0:
        return html                      # el diseno nuevo ya no trae esa marca
    j = html.find(FIN_ANCLA, i)
    if j < 0:
        return html
    return html[:i] + NUEVO + html[j + len(FIN_ANCLA):]
