# -*- coding: utf-8 -*-
"""La escala tipografica: el titular manda.

Mirando la pagina entera, lo que quedaba conservador no era el color ni el
movimiento —eso ya estaba trabajado— sino el TAMANO. Los titulares de seccion
se quedaban en 58 px con 1440 de ancho: legibles, correctos y sin autoridad
ninguna. En una pagina que quiere leerse cara, el titular tiene que ocupar
sitio; si no, todo lo demas parece de relleno por mucho que no lo sea.

Sube el cuerpo, se aprieta el interletraje —a estos tamanos el espaciado
normal se abre demasiado— y se cierra el interlineado. Los minimos no se
tocan: en el telefono ya estaban bien y agrandarlos ahi solo parte palabras.

`montar_home.py` lo aplica en el paso 16.
"""

MARCA = '/* ══ la escala: el titular manda ══'
FIN = '/* ══ fin: escala ══ */'

CSS = """
/* ══ la escala: el titular manda ═════════════════════════════════════════
   58 px de titular con 1440 de ancho es correcto y no dice nada. Sube a 76, y
   el numero grande —el precio, el suministro— a 92. Los minimos se quedan
   como estaban: en el telefono ya funcionaban. */
:root{
  --fs-h1:clamp(34px,6.8vw,92px);
  --fs-h2:clamp(28px,5.5vw,76px);
  --fs-h3:clamp(21px,2.9vw,36px);
}
/* A este cuerpo, el interletraje normal se abre demasiado y el interlineado
   de 1,02 deja calles entre renglones: las dos cosas se cierran. */
.press-h,.builds-h,.tkp-h,.sale-h,.sec-h,.join-h,.tm-h{
  letter-spacing:-.052em;line-height:.97}
.hero h1{font-size:clamp(38px,7.4vw,100px);letter-spacing:-.056em}
@media(max-width:900px){
  /* en vertical manda lo de siempre: que no se parta ninguna palabra */
  .hero h1{font-size:clamp(34px,10.4vw,54px);letter-spacing:-.045em}
  .press-h,.builds-h,.tkp-h,.sale-h,.sec-h,.join-h,.tm-h{
    letter-spacing:-.042em;line-height:1.02}
}

/* La cabecera de «Security» estaba encerrada en 56ch —una medida de LECTURA,
   la del parrafo— y eso ahogaba al titular: con el cuerpo nuevo se partia en
   cuatro renglones dentro de una columna de 484 px teniendo 1360 de seccion.
   La medida no va en la caja: va en cada pieza. El titular lleva la suya
   (20ch de su propio cuerpo, que a 76 px son 760) y el parrafo la de leer. */
.sec-head{max-width:none}
.sec-sub{margin-top:clamp(14px,1.4vw,20px)}

/* Las dos tarjetas de «In the open» son carteles: el signo arriba, el nombre
   abajo. Con el titular ya grande, el nombre se quedaba pequeno al lado y el
   cartel perdia el pie. Sube con el resto. */
.jbtn-name{font-size:clamp(24px,2.9vw,42px);letter-spacing:-.04em;line-height:1}

/* La rueda de reparto se defendia sola contra un fondo blanco; contra el
   tapiz, no. Un velo de blanco por delante del tapiz —y solo aqui— le
   devuelve el sitio sin quitarle fondo al resto de la pagina. */
.tkp{background-image:
  linear-gradient(rgba(255,255,255,.58),rgba(255,255,255,.58)),
  var(--grano),url(img/tapiz.svg)}
""" + '\n' + FIN


def aplicar(html):
    """Idempotente."""
    if MARCA in html:
        i = html.index(MARCA)
        j = html.index(FIN, i) + len(FIN)
        return html[:i] + CSS.strip('\n') + html[j:]
    assert html.count('\n</style>') == 1
    return html.replace('\n</style>', '\n' + CSS.strip('\n') + '\n</style>', 1)
