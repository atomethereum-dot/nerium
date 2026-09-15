# -*- coding: utf-8 -*-
"""Saca la marca de cada medio de su cuadro y la deja en tinta plana.

Los tres logotipos llegaron como JPEG cuadrados CON su fondo cocido dentro:
Benzinga es blanco sobre azul, MarketWatch verde sobre negro y Morningstar
blanco sobre rojo. Por eso la tarjeta tenia que meterlos en una baldosa blanca
—un cuadro de color no se puede posar sobre otro color— y el resultado eran
tres capas: figura azul, baldosa blanca, cuadro azul. Dos saltos de color para
ensenar ocho letras.

Y el cuadro se comia el tamano. La palabra BENZINGA ocupa 229x32 de los 260x260
del archivo: el 11% de la superficie. Con la baldosa a 92 px la palabra se
dibujaba con 11 px de alto. Once. De ahi que se deshiciera.

Aqui se separa la marca del fondo y se guarda en SVG, para que ocupe la figura
entera de su tarjeta sobre su propio color. No hay baldosa, no hay cuadro, no
hay saltos —y al ser trazo y no pixeles, da igual lo grande que se pinte.

  la mascara   cada fondo es plano y separable, asi que no hace falta recortar
               a mano: el canal minimo de RGB distingue el blanco de cualquier
               color saturado (blanco 255, azul Benzinga 8, rojo Morningstar 1),
               y para MarketWatch basta el canal verde sobre el negro.
  la tinta     el color se fija plano, el de la propia marca. No se conserva el
               del original: sus pixeles de borde llevan mezclado el fondo
               viejo, y al posarlos sobre otro color se veria la orla.
  el trazo     y aqui esta el motivo de que sea SVG. La marca ocupa ahora la
               figura entera: 62% de 468 px en un ordenador retina son 580
               pixeles de pantalla, y 620 en el telefono. De un archivo de 229
               px no salen, y estirarlo deja el borde blando —se vio—. Pero una
               palabra de color plano no es una fotografia: es una silueta, y
               una silueta si se puede reconstruir. La mascara se sube a 3x, se
               le aprieta el contraste y se traza con potrace, que devuelve las
               curvas. A partir de ahi el tamano da igual.
               No es magia: si el original hubiera perdido un trazo fino, el
               trazo seguiria sin estar. Un archivo de verdad grande sigue
               siendo mejor punto de partida.

No es un paso de `montar_home.py`: se ejecuta a mano cuando cambia el arte.
Necesita `potracer`, que es potrace en python puro.

    pip install potracer
    python3 herramientas/prensa_marcas.py
"""
import io

import numpy as np
import potrace
from PIL import Image

RAIZ = '/home/user/nerium/img/'

# medio -> (de que fondo hay que separarlo, con que tinta se vuelve a pintar)
MARCAS = {
    'p1': ('blanco-sobre-color', (255, 255, 255)),   # BENZINGA, blanco sobre azul
    'p2': ('verde-sobre-negro',  (51, 255, 0)),      # MW, verde sobre negro
    'p3': ('blanco-sobre-color', (255, 255, 255)),   # MORNINGSTAR, blanco sobre rojo
}


def _mascara(im, modo):
    """La transparencia de la marca, de 0 a 1."""
    a = np.asarray(im.convert('RGB')).astype(np.float32)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    if modo == 'verde-sobre-negro':
        m = G / 255.0
    else:
        # el canal minimo: alto solo donde el pixel es neutro y claro, o sea
        # blanco. Cualquier color saturado lo deja por los suelos, y tambien
        # las pistas de circuito del fondo de Benzinga, que son azul claro.
        m = (np.minimum(np.minimum(R, G), B) - 100.0) / 155.0
    return np.clip(m, 0.0, 1.0)


def _recortar(m):
    """La caja de la marca, sin el aire que la rodea."""
    ys, xs = np.where(m > 0.35)
    return m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


ESCALA = 3


def _escalar(m):
    """A ESCALA, apretando el contraste para que el borde no quede blando."""
    g = Image.fromarray((m * 255).astype(np.uint8), 'L')
    g = g.resize((g.width * ESCALA, g.height * ESCALA), Image.LANCZOS)
    x = np.asarray(g).astype(np.float32) / 255.0
    x = np.clip((x - 0.5) * 1.6 + 0.5, 0.0, 1.0)   # smoothstep alrededor del medio
    return x * x * (3.0 - 2.0 * x)


def _trazar(m):
    """Las curvas de la silueta, en el espacio de la propia mascara."""
    d = []
    # invertida a proposito: potracer llama a invert() al construir el Bitmap,
    # asi que pasarle la tinta acaba trazando el fondo. Se veian las letras
    # recortadas dentro de una caja blanca.
    for c in potrace.Bitmap(m <= 0.5).trace(turdsize=6, alphamax=1.0,
                                            opticurve=True, opttolerance=0.2):
        d.append('M%.1f %.1f' % (c.start_point.x, c.start_point.y))
        for s in c:
            if s.is_corner:
                d.append('L%.1f %.1fL%.1f %.1f'
                         % (s.c.x, s.c.y, s.end_point.x, s.end_point.y))
            else:
                d.append('C%.1f %.1f %.1f %.1f %.1f %.1f'
                         % (s.c1.x, s.c1.y, s.c2.x, s.c2.y,
                            s.end_point.x, s.end_point.y))
        d.append('Z')
    return ''.join(d)


def generar():
    for nombre, (modo, tinta) in MARCAS.items():
        m = _escalar(_recortar(_mascara(Image.open(RAIZ + nombre + '.jpg'), modo)))
        h, w = m.shape
        # evenodd: los contornos interiores —la tripa de la B, de la A, de la O
        # de Morningstar— vienen como curvas aparte y tienen que quedar huecos
        svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d">'
               '<path fill="#%02X%02X%02X" fill-rule="evenodd" d="%s"/></svg>'
               % (w, h, tinta[0], tinta[1], tinta[2], _trazar(m)))
        io.open(RAIZ + nombre + '.svg', 'w', encoding='utf-8').write(svg)
        print('  %s.svg  %dx%d  %d bytes' % (nombre, w, h, len(svg)))


if __name__ == '__main__':
    generar()
