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
     fiable en todos los navegadores; declarados en el documento, si.
     Van en userSpaceOnUse, en el espacio local del <g> del simbolo.
     Se generan con herramientas/logo/logo.py; el cubo va de pie (GIRO 0),
     no de canto. -->
<defs>
  <linearGradient id="nrmPlata" gradientUnits="userSpaceOnUse" x1="105.20" y1="182.04" x2="566.80" y2="489.96"><stop offset="0" stop-color="#C6CAD7"/><stop offset="1" stop-color="#9498A1"/></linearGradient>
  <radialGradient id="nrmBrillo" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="1" gradientTransform="translate(266.00 256.00) rotate(35.40) scale(47.20 252.40)"><stop offset="0" stop-color="#fff" stop-opacity="0.92"/><stop offset=".36" stop-color="#fff" stop-opacity="0.43"/><stop offset=".70" stop-color="#fff" stop-opacity="0.10"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
</defs>
<symbol id="nlogo" viewBox="0 0 672 672">
  <g transform="translate(-183.76 -192.57) scale(1.5189)">
    <path fill="#57595E" d="M536.00 136.00 L548.40 160.00 L548.40 560.00 L148.40 560.00 L136.00 536.00 L536.00 536.00 Z"/>
    <path fill="url(#nrmPlata)" d="M136.00 136.00 L536.00 136.00 L536.00 536.00 L136.00 536.00 Z"/>
    <path fill="url(#nrmBrillo)" d="M136.00 136.00 L536.00 136.00 L536.00 536.00 L136.00 536.00 Z"/>
    <path fill="#FCFCFC" d="M136.00 462.00 L536.00 462.00 L536.00 536.00 L136.00 536.00 Z"/>
  </g>
</symbol>
<!-- El pequeno lleva el mismo reflejo: sin el, a 30 px en la cabecera el cubo
     se veia plano, que es justo donde mas se mira. -->
<symbol id="nlogo-s" viewBox="0 0 672 672">
  <g transform="translate(-183.76 -192.57) scale(1.5189)">
    <path fill="#57595E" d="M536.00 136.00 L548.40 160.00 L548.40 560.00 L148.40 560.00 L136.00 536.00 L536.00 536.00 Z"/>
    <path fill="url(#nrmPlata)" d="M136.00 136.00 L536.00 136.00 L536.00 536.00 L136.00 536.00 Z"/>
    <path fill="url(#nrmBrillo)" d="M136.00 136.00 L536.00 136.00 L536.00 536.00 L136.00 536.00 Z"/>
    <path fill="#FCFCFC" d="M136.00 462.00 L536.00 462.00 L536.00 536.00 L136.00 536.00 Z"/>
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
