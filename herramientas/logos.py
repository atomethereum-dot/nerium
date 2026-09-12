# -*- coding: utf-8 -*-
"""Los logotipos de verdad en la fila de compatibilidad.

La fila llevaba un cuadradito de color por cada nombre, y estaba puesto asi a
proposito: «los puntos son puntos de color, no se falsifica el logotipo de
nadie». La decision era buena mientras no hubiera logotipos; con ellos, un
punto de color es solo un punto de color.

Asi que van los REALES, traidos de los repositorios de cada marca y no
dibujados de memoria:

  · Ethereum y BNB / Binance, de spothq/cryptocurrency-icons;
  · el zorro de MetaMask, del propio repositorio de MetaMask;
  · el escudo de Trust Wallet, del propio repositorio de Trust Wallet.

Y dos se quedan con su punto, que es lo honesto:

  · DexScreener no publica marca en ningun repositorio que se pueda alcanzar
    desde aqui, y dibujarla de memoria es justo lo que este modulo evita: un
    logotipo mal hecho es peor que ninguno;
  · «Venture Capital» no es una marca, es una categoria. No tiene logotipo que
    poner.

`montar_home.py` lo aplica en el paso 23.
"""

MARCA = '/* ══ los logotipos ══'
FIN = '/* ══ fin: logos ══ */'

# Sin «loading=lazy»: son cuatro archivos y 15 kB en total, y la fila es un
# carrusel que no para, asi que la mitad de las copias vive fuera de pantalla y
# con carga diferida entran apareciendo a trozos segun giran. Medido: cuatro de
# diez sin cargar en el telefono.
#
# nombre tal cual esta en la fila -> archivo, o None si se queda con su punto
MARCAS = {
    'Ethereum':           'ethereum.svg',
    'Binance Smart Chain': 'bnb.svg',
    'Binance Wallet':     'bnb.svg',
    'MetaMask':           'metamask.svg',
    'Trust Wallet':       'trust.png',
    'DexScreener':        None,
    'Venture Capital':    None,
}

CSS = """
/* ══ los logotipos ══════════════════════════════════════════════════════════
   Un cuadradito de color por marca estaba bien mientras no hubiera logotipos.
   Con ellos, un punto es solo un punto. */
.lane-in span img{width:20px;height:20px;flex:0 0 auto;object-fit:contain;
  border-radius:50%;display:block}
/* Los que traen su propio disco de color —Ethereum, Binance— ya vienen
   redondos; el zorro y el escudo van sobre transparente, asi que no se
   recortan: se dejan a su aire y solo se les iguala el tamano. */
.lane-in span img[src$="metamask.svg"],
.lane-in span img[src$="trust.png"]{border-radius:0}
/* Y donde hay logotipo, fuera el punto: decian lo mismo dos veces. */
.lane-in span:has(img)::before{display:none}
@media(max-width:760px){.lane-in span img{width:18px;height:18px}}
""" + '\n' + FIN


def aplicar(html):
    """Idempotente."""
    for nombre, archivo in MARCAS.items():
        if not archivo:
            continue
        viejo = '<span>%s</span>' % nombre
        nuevo = ('<span><img src="img/marcas/%s" alt="" aria-hidden="true" '
                 'width="20" height="20">%s</span>' % (archivo, nombre))
        if viejo in html:
            html = html.replace(viejo, nuevo)
    if MARCA in html:
        i = html.index(MARCA)
        j = html.index(FIN, i) + len(FIN)
        return html[:i] + CSS.strip('\n') + html[j:]
    assert html.count('\n</style>') == 1
    return html.replace('\n</style>', '\n' + CSS.strip('\n') + '\n</style>', 1)
