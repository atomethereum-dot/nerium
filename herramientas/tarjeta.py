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
