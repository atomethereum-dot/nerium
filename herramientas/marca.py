# -*- coding: utf-8 -*-
"""La marca de la web: el cubo, con su plata fija.

Vive aparte porque los <symbol> viajan dentro del index.html que se sube, y un
diseno nuevo traeria de vuelta la marca anterior. `montar_home.py` lo aplica.

El bloque se genera con herramientas/logo/logo.py; aqui va ya escrito para no
depender de nada al montar.
"""

VIEJO_ANCLA = '<svg width="0" height="0" style="position:absolute" aria-hidden="true">'
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
  <g transform="translate(-43.23 -38.23) scale(1.0766)">
    <path fill="#6E7482" d="M336.00 53.16 L368.48 76.36 L651.32 359.20 L368.48 642.04 L336.00 618.84 L618.84 336.00 Z"/>
    <path fill="url(#nrmPlata)" d="M53.16 336.00 L336.00 53.16 L618.84 336.00 L336.00 618.84 Z"/>
    <path fill="#FAFBFC" d="M283.67 566.52 L566.52 283.67 L618.84 336.00 L336.00 618.84 Z"/>
    <path fill="url(#nrmBrillo)" opacity=".8" d="M138.01 251.15 L159.22 229.93 L368.53 586.32 L348.73 606.11 Z"/>
  </g>
</symbol>
<!-- El de la cabecera se dibuja a 30 px: ahi el reflejo es ruido. -->
<symbol id="nlogo-s" viewBox="0 0 672 672">
  <g transform="translate(-43.23 -38.23) scale(1.0766)">
    <path fill="#6E7482" d="M336.00 53.16 L368.48 76.36 L651.32 359.20 L368.48 642.04 L336.00 618.84 L618.84 336.00 Z"/>
    <path fill="url(#nrmPlata)" d="M53.16 336.00 L336.00 53.16 L618.84 336.00 L336.00 618.84 Z"/>
    <path fill="#FAFBFC" d="M283.67 566.52 L566.52 283.67 L618.84 336.00 L336.00 618.84 Z"/>
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
