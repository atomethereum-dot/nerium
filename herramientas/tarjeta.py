# -*- coding: utf-8 -*-
"""Las tarjetas de seguridad se llenan en vez de dejar un hueco abajo.

En el movil «#security» es un escenario anclado: ocupa la pantalla entera y
las tres tarjetas se pasan una a una. El area de las tarjetas se reparte lo
que sobra —«.secure .sec-grid{flex:1}»— y cada tarjeta va «position:absolute;
inset:0», o sea que se ESTIRA hasta el alto del area.

El contenido no se estira. Y como el enlace del pie lleva «margin-top:auto»,
se va al canto de abajo y deja el hueco entre medias. Medido:

    390 x 844   area 486   contenido ~464   hueco   22 px
    430 x 932   area 566   contenido ~464   hueco  124 px

Ciento veinticuatro pixeles de tarjeta blanca entre el ultimo dato y el
enlace. Cuanto mas alto el telefono, mayor el agujero: es el area la que
crece, no lo que hay dentro.

Se podria rellenar repartiendo las filas de datos por el hueco, pero eso es
maquillar: cuatro filas separandose mas o menos segun el telefono que tengas
no es una decision de diseño, es el agujero disimulado. Lo que sobra no es
contenido que falte, es una caja de mas.

Asi que la tarjeta deja de estirarse: mide lo que mide su contenido y se
centra en el area. El hueco de dentro desaparece —no queda nada que
rellenar— y el aire que sobra pasa a ser del escenario, repartido arriba y
abajo, que es composicion y no un agujero.

El fundido entre tarjetas se conserva: seguian apiladas en absoluto, y lo
unico que cambia es de donde cuelgan. Antes «inset:0» —las cuatro esquinas,
que es lo que las estiraba—; ahora del centro, con la subida de 16 px del
fundido compuesta en el mismo «transform».

No estrena ni un texto.

`montar_home.py` lo aplica en el paso 28.
"""

# El marcador tiene que ser el PRINCIPIO literal del CSS de abajo. Si los
# dos se separan —cambie el titulo del bloque y no el marcador— «aplicar»
# deja de encontrarse a si mismo y en la siguiente pasada añade un segundo
# bloque en vez de sustituir el suyo.
MARCA = '/* ══ la tarjeta que se llena ══'
FIN = '/* ══ fin: tarjeta ══ */'

# El mismo corte donde el paso original pasa las tarjetas a carrusel apilado.
CORTE = 899

CSS = """
/* ══ la tarjeta que se llena ═══════════════════════════════════════════════
   El area de tarjetas se reparte lo que sobra de pantalla y cada tarjeta va
   «inset:0», asi que se estira hasta el area entera. El contenido no, y el
   enlace del pie lleva «margin-top:auto»: se iba al canto de abajo y dejaba
   todo el sobrante en un hueco entre el ultimo dato y el. Medido:

       390 x 844   area 486   hueco   22 px
       430 x 932   area 566   hueco  124 px

   Cuanto mas alto el telefono, mayor el agujero: es el area la que crece, no
   lo que hay dentro.

   Probe lo otro primero —que la tarjeta midiera su contenido y se centrara—
   y el agujero no desaparece: se sale de la tarjeta y se reparte alrededor.
   A 440x956 quedaban 94 px de aire encima y 185 debajo. El hueco seguia ahi,
   solo que fuera de la caja.

   Asi que el sobrante se reparte DENTRO, entre las filas de datos, que es
   contenido de verdad llenando la tarjeta. No es el hueco disimulado: las
   cuatro filas crecen lo mismo y lo que cambia es el ritmo vertical de una
   tabla, que es justo lo que un telefono mas alto puede permitirse. */
@media(max-width:__CORTE__px){
  /* La lista de datos se queda con lo que sobra... */
  .secure .sec-grid .sec-card .sec-fields{
    flex:1 1 auto;display:flex;flex-direction:column}
  /* ...y las cuatro filas se lo reparten a partes iguales.
     La fila pasa de «flex» a «grid» por una razon concreta: al crecer, con
     «flex» el texto se queda pegado arriba y el filete de abajo se aleja
     solo. En «grid», «align-content:center» centra la fila dentro de lo que
     ha crecido y «align-items:baseline» sigue cuadrando el rotulo pequeño
     con el dato grande, que es lo que hay que conservar. */
  .secure .sec-grid .sec-card .sec-fields>div{
    flex:1 1 auto;
    display:grid;grid-auto-flow:column;justify-content:space-between;
    align-content:center;align-items:baseline}
  /* El enlace ya no necesita empujarse solo: la lista lo ha dejado abajo. */
  .secure .sec-grid .sec-card .sec-go{margin-top:0}

  /* ── el carril de abajo ──
     Con el hueco de dentro resuelto quedaba el de FUERA: la seccion reservaba
     112 px en el canto inferior y ahi no hay nada. Los 112 salian de dejar
     libre el boton de subir, que se colocaba a 62 px del fondo y mide 42, o
     sea que su borde de arriba caia a 104.

     Pero ese boton va a la DERECHA y lo unico que hay debajo —el idioma— va a
     la izquierda: en su columna no tiene nada que esquivar. Baja al canto, y
     el carril pasa de 112 a 64. La tarjeta se queda esos 48 px y la franja de
     abajo deja de estar vacia: lo que queda es justo el alto de los mandos. */
  .subir{bottom:var(--hud-b)}
  .secure .sec-stage{padding-bottom:calc(var(--hud-b) + 50px) !important}
}

/* ── y lo que se escondia por no caber, vuelve ──
   Habia dos bloques que quitaban texto en pantallas cortas: la entradilla de
   la seccion por debajo de 720 px de alto, y ademas la descripcion de la
   tarjeta y el aviso de seguir bajando por debajo de 620. El comentario lo
   decia sin rodeos: «en pantallas muy cortas no cabe todo, se recorta lo
   prescindible». Cabia de sobra; lo que no cabia era con 112 px de carril
   vacio debajo. Con 64 sobran esos 48, y no hay que quitarle texto a nadie. */
@media(max-width:__CORTE__px) and (max-height:720px){
  .sec-sub{display:block}
}
@media(max-width:__CORTE__px) and (max-height:620px){
  /* Vuelven la entradilla de la seccion y la descripcion de la tarjeta, que
     son TEXTO: lo que cuentan no lo cuenta nadie mas.
     «Keep scrolling» no vuelve, y es a proposito: es una ayuda de navegacion,
     no informacion sobre el proyecto. En una pantalla de 568 px esos 21 px
     son justo los que le faltan a la tarjeta, y entre perder un aviso de que
     se puede seguir bajando —que el dedo ya sabe— y perder un parrafo, se
     pierde el aviso. */
  .secure .sec-sub,.secure .sec-p{display:block}
}

/* ── y para que quepa sin quitar nada, el ritmo se ata al alto ──
   En una pantalla de 568 px la cabecera se comia 195 —un tercio— y el
   contenido de la tarjeta pedia 367 para un area de 258. Lo que sobra no es
   texto: son margenes pensados para una pantalla de 900. Aqui todos los
   huecos verticales pasan a medirse en «vh», asi que encogen con la pantalla
   en vez de encogerla ellos. El texto no se toca en ningun tamaño; el
   titular baja de cuerpo, que es lo que un movil corto pide de todas formas. */
@media(max-width:__CORTE__px) and (max-height:740px){
  .secure .sec-h{font-size:clamp(21px,4.6vh,32px);line-height:1.08;
    margin-block:clamp(6px,1.5vh,14px) clamp(6px,1.5vh,16px)}
  .secure .sec-head{margin-bottom:clamp(6px,1.2vh,14px)}
  .secure .sec-head .sk{margin-bottom:clamp(5px,1.1vh,12px)}
  .secure .sec-sub{margin-top:clamp(6px,1.3vh,14px);
    font-size:clamp(11.5px,2vh,14px);line-height:1.42}
  .secure .sec-cue{margin-bottom:clamp(5px,1.1vh,12px)}
  .secure .sec-dots{margin-bottom:clamp(5px,1.1vh,14px)}
  .secure .sec-stage{padding-top:clamp(4px,1.2vh,22px) !important}

  .secure .sec-grid .sec-card{
    padding:clamp(10px,1.9vh,16px) clamp(13px,4vw,16px) clamp(9px,1.7vh,14px)}
  .secure .sec-card .sec-ic{width:28px;height:28px}
  .secure .sec-card .sec-t{margin-top:clamp(9px,2vh,20px)}
  .secure .sec-card .sec-k{margin-top:clamp(4px,.8vh,6px)}
  .secure .sec-card .sec-p{margin-top:clamp(7px,1.5vh,14px)}
  .secure .sec-card .sec-fields{margin-top:clamp(8px,1.7vh,18px)}
  .secure .sec-card .sec-go{padding-top:clamp(8px,1.7vh,14px)}
  /* El cuerpo del texto tambien se ata al alto, pero con suelo: por debajo
     de 11,5 px deja de leerse, y entonces lo que sobra no es el texto. */
  .secure .sec-card .sec-p{font-size:clamp(11.5px,2.05vh,13.5px);line-height:1.44}
  .secure .sec-card .sec-fields>div{padding-block:clamp(3px,.75vh,9px)}
  .secure .sec-card .sec-fields dd{font-size:clamp(12px,2.15vh,13.5px)}
}
""" + '\n' + FIN


def aplicar(html):
    """Idempotente."""
    css = CSS.replace('__CORTE__', str(CORTE)).strip('\n')
    if MARCA in html:
        i = html.index(MARCA)
        j = html.index(FIN, i) + len(FIN)
        return html[:i] + css + html[j:]
    assert html.count('\n</style>') == 1
    return html.replace('\n</style>', '\n' + css + '\n</style>', 1)
