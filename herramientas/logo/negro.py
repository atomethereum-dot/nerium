# -*- coding: utf-8 -*-
"""El mismo rombo, pero asentado sobre negro.

Robinhood pinta la ficha del token sobre su propio fondo; un PNG transparente
queda a merced de ese fondo. Aqui el negro va dentro del archivo.

El vector se dibuja 8 veces mas grande y luego se reduce: las puntas del
rombo son diagonales y a 48 px, sin ese margen, se escalonan.
"""
import io, cairosvg
from PIL import Image

FUENTE = '/home/user/nerium/herramientas/logo/favicon.svg'
SALIDA = '/home/user/nerium/img/'
NEGRO  = (0, 0, 0)
SUPER  = 8

for px in (48, 256, 512):
    g = px * SUPER
    b = cairosvg.svg2png(url=FUENTE, output_width=g, output_height=g)
    rombo = Image.open(io.BytesIO(b)).convert('RGBA')
    lienzo = Image.new('RGB', (g, g), NEGRO)
    lienzo.paste(rombo, (0, 0), rombo)          # el alpha del rombo manda
    lienzo = lienzo.resize((px, px), Image.LANCZOS)
    ruta = '%snrm-%d-negro.png' % (SALIDA, px)
    lienzo.save(ruta, 'PNG', optimize=True)
    print(' ', ruta)
