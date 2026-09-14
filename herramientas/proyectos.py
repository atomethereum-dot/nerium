# -*- coding: utf-8 -*-
"""Paso 33 · las dos tarjetas de proyectos ensenan el producto.

Las tarjetas de «What we are building» tenian por ilustracion una placa
sintetica: un lienzo animado, el logotipo y un rotulo —«NereumEVM · Layer 1»,
«Forge · Issuance»—. Bonita, pero no ensenaba nada: quien llega no ve el
explorador ni el alta de un activo, ve un cartel.

Ahora cada tarjeta lleva la captura de lo que dice ser:

  1 · la cadena ............ la portada del explorador, con los bloques vivos
  2 · la tokenizacion ...... el primer paso del alta de un activo

Las capturas no vienen de fuera: se sacan del propio /explorer con el
navegador a 1520x800 y el doble de densidad —3040x1600 reales—, se bajan a
1.500 px de ancho y se guardan en WebP de calidad 94. La tarjeta mide 667 px
como mucho, asi que a pantalla del doble de densidad se piden 1.334: sobran
166 px de margen y el texto de la interfaz se lee nitido sin reescalar hacia
arriba. Pesan 87 y 58 KB, y se cargan tarde («loading=lazy»), que estan a
nueve secciones de la portada.

Se van los dos lienzos animados de las placas: eran dos animaciones por cuadro
que ya no se ven.
"""

MARCA = '/* ══ proyectos ══ Lo aplica herramientas/proyectos.py ═══'

# ── el hueco de la ilustracion ───────────────────────────────────────────────
# La captura mide 1,9 de ancho por 1 de alto y la caja pedia 1,62. Recortar el
# 15 % por la derecha se comia el boton de «Tokenize» y media tabla de bloques,
# asi que manda la captura: la caja se abre a 1,9 y se ve entera. Las tarjetas
# quedan algo mas bajas, que a la seccion le sienta bien.
CSS_VIEJO = """.bcd-cv{position:absolute;inset:0;width:100%;height:100%;z-index:0}"""
CSS_NUEVO = """.bcd-cv{position:absolute;inset:0;width:100%;height:100%;z-index:0}
""" + MARCA + """═══════════════
   La caja de la ilustracion se abre a lo que mide la captura —1,9— en vez de
   recortarle el 15 % por la derecha, que ahi estan el buscador y el boton.
   Y se apaga el halo azul de la placa: encima de una captura clara tenia la
   pantalla de un color que no es el suyo. */
.bcd-art{aspect-ratio:1.9}
.bcd-foto{padding:0;gap:0;background:#EEF2FB}
.bcd-foto::after{display:none}
.bcd-shot{position:absolute;inset:0;width:100%;height:100%;
  object-fit:cover;object-position:left top;display:block}"""

# ── la placa de cada tarjeta ─────────────────────────────────────────────────
PLACA = """          <div class="bcd-plate">
            <canvas class="bcd-cv"></canvas>
            <span class="bcd-mark"><svg aria-hidden="true"><use href="#nlogo"/></svg>Nereum</span>
            <span class="bcd-rule"></span>
            <span class="bcd-kind"><b>%s</b>%s</span>
          </div>"""
FOTO = """          <div class="bcd-plate bcd-foto">
            <img class="bcd-shot" src="img/%s.webp" width="1500" height="789"
                 alt="%s" loading="lazy" decoding="async">
          </div>"""

CAMBIOS = [
    ('el hueco de la ilustracion', CSS_VIEJO, CSS_NUEVO),
    ('la cadena',
     PLACA % ('NereumEVM', 'Layer 1'),
     FOTO % ('explorer-overview',
             'The Nereum explorer: block height, tokenized assets and live block production')),
    ('la tokenizacion',
     PLACA % ('Forge', 'Issuance'),
     FOTO % ('explorer-tokenize',
             'Issuing an asset on Nereum: name, symbol, type, units and declared value')),
]


def aplicar(html):
    """Idempotente: si el cambio ya esta, no lo repite."""
    for nombre, viejo, nuevo in CAMBIOS:
        if nuevo in html:
            continue
        assert html.count(viejo) == 1, 'no esta, o esta repetido: ' + nombre
        html = html.replace(viejo, nuevo, 1)
    return html


if __name__ == '__main__':
    import sys, io
    p = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
    s = io.open(p, encoding='utf-8').read()
    salida = aplicar(s)
    io.open(p, 'w', encoding='utf-8').write(salida)
    print('proyectos aplicado')
