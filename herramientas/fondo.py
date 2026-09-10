# -*- coding: utf-8 -*-
"""El fondo de la portada: los tres planos, lo que se posa y el papel pautado.

Sustituye entero el campo de bloques que trae el archivo del diseno —las dos
funciones, la de WebGL y la de lienzo, y la linea que las arranca— por el de
`fondo_js.txt`. `montar_home.py` lo aplica en el paso 12.

Va DESPUES de portada.py a proposito: aquel arreglaba cosas del campo viejo
(la paleta que se iba al cian, la mezcla que sumaba) y ya no tiene a que
agarrarse, porque este campo nace con la paleta buena y con la mezcla en
trama. Lo que portada.py sigue tocando —la cursiva del titular, el orden de
los botones, las cuatro pruebas y las barras del #chroma— no vive aqui.
"""
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
JS = open(os.path.join(AQUI, 'fondo_js.txt'), encoding='utf-8').read()

INICIO = 'function campoGL(){'
FIN = "if(!campoGL()){ window.__campo='canvas'; campo2D(); }"
MARCA = '/* \u2550\u2550 el fondo de la portada \u2550\u2550'


def aplicar(html):
    """Idempotente: si ya esta puesto, lo repone; si no, sustituye al viejo."""
    i = html.index(MARCA) if MARCA in html else html.index(INICIO)
    j = html.index(FIN, i) + len(FIN)
    return html[:i] + JS.rstrip('\n') + html[j:]
