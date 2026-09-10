# -*- coding: utf-8 -*-
"""El cubo nuevo tambien en /whitepaper y /explorer.

Esas dos paginas llevan el logotipo escrito dentro, con sus propios ids de
degradado (wpHP, exFB, pdfP...), asi que no les sirve el <symbol> del index.
Aqui se cambian las cuatro rutas y los dos degradados, dejando cada id como
estaba: la marca es la misma en las tres paginas o no es una marca.

  python3 marca_paginas.py        # las repasa y las deja al dia
"""
import os, re, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, 'logo'))
import logo                                   # noqa: E402

RAIZ = os.path.dirname(AQUI)
PAGINAS = ['whitepaper/index.html', 'explorer/index.html']

# el cubo, tal y como lo escribe logo.py ahora mismo
_caraf, _canto, _tx, _ty, _esc = logo._encajado(672, 14)
TRANS = 'translate(%.2f %.2f) scale(%.4f)' % (_tx, _ty, _esc)
CANTO = logo.d(_canto)
CARA = logo.d(_caraf)
_banda = [logo.entre(_caraf[0], _caraf[3], 1 - logo.BANDA),
          logo.entre(_caraf[1], _caraf[2], 1 - logo.BANDA), _caraf[2], _caraf[3]]
BANDA = logo.d(_banda)
_pl, _br = logo.degradados(_caraf, 'X', 'Y')
LIN = re.search(r'x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"', _pl).group(0)
RAD = re.search(r'gradientTransform="([^"]+)"', _br).group(1)

# el <g> del cubo: cuatro rutas seguidas, con los ids de degradado que sean
BLOQUE = re.compile(
    r'(<g transform=")[^"]+(">\s*)'
    r'(<path fill="#57595E" d=")[^"]+(")(/>\s*)'
    r'(<path fill="url\(#\w+\)" d=")[^"]+(")(/>\s*)'
    r'(<path fill="url\(#\w+\)" d=")[^"]+(")(/>\s*)'
    r'(<path fill="#FCFCFC" d=")[^"]+(")(/>\s*</g>)', re.S)


def _bloque(m):
    g = list(m.groups())
    return (g[0] + TRANS + g[1] + g[2] + CANTO + g[3] + g[4]
            + g[5] + CARA + g[6] + g[7] + g[8] + CARA + g[9] + g[10]
            + g[11] + BANDA + g[12] + g[13])


def aplicar(html):
    """Idempotente."""
    html = BLOQUE.sub(_bloque, html)
    html = re.sub(r'x1="[\d.]+" y1="[\d.]+" x2="[\d.]+" y2="[\d.]+"'
                  r'(?=><stop offset="0" stop-color="#C6CAD7")', LIN, html)
    html = re.sub(r'(gradientTransform=")[^"]+(">\s*<stop offset="0" stop-color="#fff" stop-opacity="0\.92")',
                  lambda m: m.group(1) + RAD + m.group(2), html)
    return html


if __name__ == '__main__':
    for rel in PAGINAS:
        ruta = os.path.join(RAIZ, rel)
        viejo = open(ruta, encoding='utf-8').read()
        nuevo = aplicar(viejo)
        open(ruta, 'w', encoding='utf-8').write(nuevo)
        print(' ', rel, 'sin cambios' if nuevo == viejo else 'al dia',
              '·', nuevo.count(CARA), 'cubos')
