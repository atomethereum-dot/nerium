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

Aqui se separa la marca del fondo y se guarda en PNG con transparencia, para
que se pose directamente sobre el color de su tarjeta, junto al logotipo de
Nereum y con su misma altura. No hay baldosa, no hay cuadro, no hay saltos.

  la mascara   cada fondo es plano y separable, asi que no hace falta recortar
               a mano: el canal minimo de RGB distingue el blanco de cualquier
               color saturado (blanco 255, azul Benzinga 8, rojo Morningstar 1),
               y para MarketWatch basta el canal verde sobre el negro.
  la tinta     el color se fija plano y solo varia la transparencia. Es lo que
               evita la orla oscura: si se conserva el color original, los
               pixeles del borde llevan mezclado el fondo viejo y al posarlos
               sobre otro color se ve el halo.
  el doble     la mascara se sube a 2x con Lanczos y se le vuelve a apretar el
               contraste en el medio. No inventa detalle: el borde de una letra
               es una curva conocida y la semitransparencia dice por donde pasa,
               asi que reconstruirla sale mejor que dejar que el navegador la
               interpole. Aun asi NO sustituye a un archivo de verdad grande.

No es un paso de `montar_home.py`: se ejecuta a mano cuando cambia el arte.

    python3 herramientas/prensa_marcas.py
"""
import numpy as np
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


def _doble(m):
    """A 2x, apretando el contraste para que el borde no quede blando."""
    g = Image.fromarray((m * 255).astype(np.uint8), 'L')
    g = g.resize((g.width * 2, g.height * 2), Image.LANCZOS)
    x = np.asarray(g).astype(np.float32) / 255.0
    x = np.clip((x - 0.5) * 1.6 + 0.5, 0.0, 1.0)   # smoothstep alrededor del medio
    return x * x * (3.0 - 2.0 * x)


def generar():
    for nombre, (modo, tinta) in MARCAS.items():
        m = _doble(_recortar(_mascara(Image.open(RAIZ + nombre + '.jpg'), modo)))
        h, w = m.shape
        rgba = np.zeros((h, w, 4), dtype=np.uint8)
        rgba[..., 0], rgba[..., 1], rgba[..., 2] = tinta
        rgba[..., 3] = (m * 255).round().astype(np.uint8)
        Image.fromarray(rgba, 'RGBA').save(RAIZ + nombre + '.png', optimize=True)
        print('  %s.png  %dx%d' % (nombre, w, h))


if __name__ == '__main__':
    generar()
