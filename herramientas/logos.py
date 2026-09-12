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

Y dos llevan icono de la casa, no logotipo, porque no hay logotipo que poner:

  · de DexScreener no se puede traer la marca oficial desde aqui: su sitio lo
    corta la politica del proxy, la busqueda de repositorios de GitHub esta
    cerrada a los del proyecto y ninguna ruta adivinada existe. Dibujarla de
    memoria es justo lo que esto evita;
  · «Venture Capital» no es una marca, es una categoria.

  Llevan un icono dibujado aqui con la paleta de Nereum —velas de cotizacion y
  linea de crecimiento— que no se parece a la marca de nadie a proposito. Un
  cuadradito de color al lado de cuatro logotipos de verdad se lee como un
  logotipo que falta; un icono hecho a conciencia se lee como lo que es.

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
    # Estos dos NO son logotipos de nadie, y por eso no van en el mismo saco:
    #
    # · de DexScreener no se puede traer la marca oficial desde aqui —su sitio
    #   lo corta la politica del proxy, la busqueda de repositorios de GitHub
    #   esta cerrada a los del proyecto, y ninguna ruta adivinada existe—, y
    #   dibujarla de memoria es justo lo que este modulo evita;
    # · «Venture Capital» no es una marca, es una categoria: no hay logotipo
    #   que traer ni ahora ni nunca.
    #
    # Asi que llevan ICONO propio, dibujado aqui y con la paleta de Nereum:
    # unas velas de cotizacion y una linea de crecimiento. No se parecen a la
    # marca de nadie a proposito. Un cuadradito de color al lado de cuatro
    # logotipos de verdad se lee como un logotipo que falta; un icono hecho a
    # conciencia se lee como lo que es.
    'DexScreener':        'dexscreener.svg',
    'Venture Capital':    'venture.svg',
}

CSS = """
/* ══ los logotipos ══════════════════════════════════════════════════════════
   Un cuadradito de color por marca estaba bien mientras no hubiera logotipos.
   Con ellos, un punto es solo un punto. */
.lane-in span img{width:20px;height:20px;flex:0 0 auto;object-fit:contain;
  border-radius:50%;display:block}
/* Los que traen su propio disco de color —Ethereum, Binance, y los dos iconos
   de la casa— ya vienen redondos; el zorro y el escudo van sobre transparente,
   asi que no se recortan: se dejan a su aire y solo se les iguala el tamano. */
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
