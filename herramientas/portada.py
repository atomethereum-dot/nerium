# -*- coding: utf-8 -*-
"""La portada con el globo, en lugar del mosaico de rectangulos.

Vive aparte porque el hero viaja dentro del index.html que se sube: cada
diseno nuevo devolveria el mosaico si no se rehiciera aqui. `montar_home.py`
lo aplica.

Se cambia SOLO el interior de <section class="hero">. El envoltorio
—.hero-hold, el sticky, la altura— se deja intacto para no tocar el desplome
de secciones ni el guardado de la vista, que dependen de esas alturas.

El script del hero anterior arranca con `if(!cv||!inn)return;` sobre el canvas
#burst, asi que al quitarlo se desactiva solo, sin errores y sin registrar
ningun trabajo de scroll.
"""
import os, re

AQUI = os.path.dirname(os.path.abspath(__file__))
ABRE = '<section class="hero" id="top"'
CIERRA = '</section>'
SCRIPT = '<script defer src="assets/globo.js"></script>\n'

# El sitio tiene dos animaciones de texto que muerden este hero:
#   · una parte «.hero h1» en letras sueltas para el efecto de raton. Vacia el
#     h1 con textContent y de paso se lleva por delante los <br>, asi que el
#     titular sale en una sola linea y en su estado intermedio: gris e inclinado.
#   · otra desvanece «.hero p» hasta que un trabajo de scroll la despierta, y
#     ese trabajo ya no existe porque el hero viejo se desactivo.
# Se las aparta por clase en vez de tocar su codigo.
APARTAR = [
    ("const h1=document.querySelector('.hero h1');",
     "const h1=document.querySelector('.hero h1:not(.nrm-h1)');"),
    ("const byChar=h.matches('.hero h1');",
     "const byChar=h.matches('.hero h1:not(.nrm-h1)');"),
    ("const step=h.matches('.hero h1')?.028:.042;",
     "const step=h.matches('.hero h1:not(.nrm-h1)')?.028:.042;"),
    ("document.querySelectorAll('h1, h2, .say p, .rows b, .duo h3, .start b, .card b')",
     "document.querySelectorAll('h1:not(.nrm-h1), h2, .say p, .rows b, .duo h3, .start b, .card b')"),
    ("document.querySelectorAll('.hero p, .stack .sub, .loop .sub')",
     "document.querySelectorAll('.hero p:not(.nrm-lead), .stack .sub, .loop .sub')"),
]


def aplicar(html):
    """Idempotente: si la portada ya es la del globo, no toca nada."""
    if 'id="nrmTierra"' in html:
        return _apartar(html if SCRIPT in html else _script(html))

    i = html.find(ABRE)
    if i < 0:
        return html                      # no es la portada
    j = html.find('>', i) + 1
    k = html.find(CIERRA, j)
    if k < 0:
        return html
    dentro = open(os.path.join(AQUI, 'bloque_hero.txt'), encoding='utf-8').read()
    html = html[:j] + '\n' + dentro + html[k:]
    return _script(_apartar(html))


def _apartar(html):
    for viejo, nuevo in APARTAR:
        html = html.replace(viejo, nuevo)
    return html


def _script(html):
    if SCRIPT in html:
        return html
    assert html.count('</body>') == 1
    return html.replace('</body>', SCRIPT + '</body>', 1)
