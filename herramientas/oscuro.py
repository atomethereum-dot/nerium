# -*- coding: utf-8 -*-
"""La pagina entera en oscuro.

Tres veces seguidas el mismo comentario: que se ve blanca, plana y vacia. Y
tres veces respondi con ajustes —un tapiz, mas cuerpo de letra, mascaras al
aparecer—. Eran mejoras de verdad, pero todas dentro de la misma decision de
fondo, que era la que fallaba: seis secciones de papel blanco alternando con
cuatro negras.

Lo que se ve mejor de esta pagina ya era lo oscuro. La portada, la pila, el
campo de bloques, las transiciones: eso nadie lo ha discutido nunca. Lo que
chirriaba era el papel. Asi que el papel se va.

No es invertir colores: es rehacer las siete secciones claras con la misma
paleta con la que ya esta hecho el resto. Sesenta y ocho componentes, uno a
uno, y una bateria que recorre la pagina midiendo el CONTRASTE de cada texto
contra su fondo, porque el riesgo de un cambio asi no es que quede feo: es
que algo quede ilegible y no se vea en una captura.

Se puede volver atras quitando el paso 17 de `montar_home.py`.
"""
import random

MARCA = '/* ══ la pagina, en oscuro ══'
FIN = '/* ══ fin: oscuro ══ */'

# ── el fondo de las claras, ahora oscuro ─────────────────────────────────────
def tapiz(semilla=11):
    """El mismo campo de bloques, con los tonos al reves: ahora los bloques
       son mas claros que el suelo, no mas oscuros."""
    W, H, U = 1600, 1000, 40
    AZUL = [(47, 107, 255), (121, 171, 255), (70, 96, 170), (160, 186, 232)]
    r = random.Random(semilla)
    piezas = []
    cols, filas = W // U, H // U
    for _ in range(190):
        while True:
            cx, cy = r.randrange(cols), r.randrange(filas)
            dx, dy = abs(cx / cols - .5) * 2, abs(cy / filas - .5) * 2
            d = (dx * dx * 1.15 + dy * dy) ** .5
            if r.random() < min(1.0, d * 1.35):
                break
        an = r.choice([1, 1, 2, 2, 3, 4]) * U
        c = AZUL[r.randrange(len(AZUL))]
        a = round(r.uniform(.030, .095) * (0.42 + d * 0.72), 3)
        piezas.append('<rect x="%d" y="%d" width="%d" height="%d" rx="3" '
                      'fill="rgb(%d,%d,%d)" opacity="%s"/>'
                      % (cx * U, cy * U, an, U, c[0], c[1], c[2], a))

    def rg(nid, col, op):
        return ('<radialGradient id="' + nid + '">'
                '<stop offset="0" stop-color="' + col + '" stop-opacity="' + op + '"/>'
                '<stop offset="1" stop-color="' + col + '" stop-opacity="0"/></radialGradient>')
    defs = ('<defs>' + rg('b1', 'rgb(47,107,255)', '.22')
                     + rg('b2', 'rgb(91,140,255)', '.16')
                     + rg('b3', 'rgb(140,170,255)', '.07') + '</defs>')
    blooms = ('<circle cx="150" cy="70" r="620" fill="url(#b1)"/>'
              '<circle cx="1480" cy="960" r="560" fill="url(#b2)"/>'
              '<circle cx="820" cy="520" r="480" fill="url(#b3)"/>')
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" '
            'preserveAspectRatio="xMidYMid slice">%s%s%s</svg>'
            % (W, H, defs, blooms, ''.join(piezas)))


def escribir_tapiz(raiz):
    import os
    ruta = os.path.join(raiz, 'img', 'tapiz-oscuro.svg')
    dibujo = tapiz()
    try:
        if open(ruta, encoding='utf-8').read() == dibujo:
            return ruta
    except OSError:
        pass
    open(ruta, 'w', encoding='utf-8').write(dibujo)
    return ruta


# ── los data-bg: de ellos sale el color de la regla y del cursor ─────────────
FONDOS = [
    ('<section class="paper logos" id="network" data-bg="#FFFFFF"', '#06080D'),
    ('<section class="press paper" id="press" data-bg="#FFFFFF"', '#06080D'),
    ('<section class="paper say" id="thesis" data-bg="#FFFFFF"', '#06080D'),
    ('<section class="paper2 pad" id="solutions" data-bg="#F1F2F4"', '#0A0D14'),
    ('<section class="secure" id="security" data-bg="#FFFFFF"', '#06080D'),
    ('<section class="sale" id="presale" data-bg="#FBFCFD"', '#070A10'),
    ('<section class="tkp" id="token" data-bg="#F5F5F7"', '#080B12'),
    ('<section class="join" id="join" data-bg="#FBFCFD"', '#070A10'),
]

SECS = '.paper,.paper2,.secure,.sale,.tkp,.join,.press'

CSS = """
/* ══ la pagina, en oscuro ════════════════════════════════════════════════
   Las siete secciones que eran de papel pasan a la misma paleta con la que ya
   estaba hecho el resto. No es invertir: cada componente se rehace.

   Todo lo que no sea el suelo va escopado bajo C —las siete secciones—, por
   dos motivos: no tocar lo que ya era oscuro, y GANAR en especificidad a las
   reglas originales. Sin eso, «.rd» pierde contra «.rows .rd» y el texto se
   queda en tinta negra sobre fondo negro: 1:1. Pasó, y lo cazo la bateria de
   contraste antes de que llegara a ninguna captura. */
:root{
  --o-bg:#06080D; --o-bg2:#0A0D14; --o-card:#0E1118;
  --o-ink:#E9EEF7; --o-ink2:rgba(233,238,247,.72); --o-ink3:rgba(233,238,247,.52);
  --o-line:rgba(255,255,255,.11); --o-line2:rgba(255,255,255,.07);
  --o-blue:#8FB8FF; --o-verde:#6FE3A8;
}

/* ── los suelos ── */
/* La portada es sticky dentro de .hero-hold, que es mas alta que ella: al
   despegarse asomaba el blanco del hold, puesto ahi cuando lo de abajo era
   papel. Con la pagina en oscuro era una banda blanca de 220 px justo debajo
   del titular. */
.hero-hold{background:#06080D}
.paper{background-color:#06080D}
.paper2{background-color:#0A0D14}
.secure{background-color:#06080D}
.sale{background-color:#070A10}
.tkp{background-color:#080B12}
.join{background-color:#070A10}
.paper,.paper2,.secure,.sale,.tkp,.join,.press{
  color:#E9EEF7;
  background-image:var(--grano),url(img/tapiz-oscuro.svg)}
.tkp{background-image:
  linear-gradient(rgba(8,11,18,.55),rgba(8,11,18,.55)),
  var(--grano),url(img/tapiz-oscuro.svg)}
main>section+section{box-shadow:0 -1px 0 rgba(120,160,240,.16),
  0 -46px 96px -54px rgba(0,0,0,.98)}

/* ── el texto ── */
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) :is(h1,h2,h3,h4,b,strong,dd,em,dl){
  color:var(--o-ink)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press)
  :is(.press-h,.sec-h,.sale-h,.join-h,.tkp-h,.builds-h,.tm-h,.pcd-t,.sec-t,
      .pr-v,.jbtn-name,.tec-real,.tec-fantasma,.sec-live,.sale-live,.wi,
      .join-h,.raise-n,.w-out b){color:var(--o-ink)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press)
  :is(p,li,dt,span,small,i,.sec-sub,.sale-sub,.join-note,.lane-sub,.rd,.sec-p,
      .jbtn-sub,.k,.mono,.rn,.sec-k,.sec-foot,.pr-k,.w-rate,.w-lab,.w-eq,
      .sale-net,.tkp-list,.press-foot){color:var(--o-ink2)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press)
  :is(dt,.sec-n,.pr-n,.w-note,.sec-foot){color:var(--o-ink3)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press)
  :is(.sec-go,.press-all,.up,.pcd-tag,.pr-mult b,.sec-ok){color:var(--o-blue)}
/* El CTA del widget sale de la lista de enlaces azules de arriba: ahi «.pr-mult b»
   subia la especificidad del :is() entero a (0,2,1) y le ganaba a esta regla,
   que es la del boton. Azul encendido con tinta negra, como los otros dos. */
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .w-cta{background:#4C82FF;color:#00070F}

/* ── las tarjetas ── */
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press)
  :is(.sec-card,.widget,.prices,.w-field){
  background-color:#0E1118;border-color:var(--o-line)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .pcd{
  background-color:#0E1118;border-color:var(--o-line)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .pcd-body{
  background-image:linear-gradient(180deg,rgba(255,255,255,.045) 0%,rgba(255,255,255,.010) 100%)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .jbtn{
  background-color:rgba(255,255,255,.05);border-color:var(--o-line)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .sec-card{
  box-shadow:0 1px 2px rgba(0,0,0,.5)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .sec-ic{
  background:rgba(47,107,255,.18);color:var(--o-blue)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .sec-ok{
  background:rgba(111,227,168,.13);color:var(--o-verde);border-color:rgba(111,227,168,.26)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .sec-ok i{background:var(--o-verde)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .sec-live i{background:var(--o-verde)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .sec-fields>div{border-color:var(--o-line2)}

/* ── la compatibilidad ── */
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .lane-in span{
  background:rgba(255,255,255,.05);border-color:var(--o-line);color:rgba(233,238,247,.86)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .lane-in span:hover{
  background:rgba(255,255,255,.10);color:#fff;border-color:rgba(143,184,255,.45)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .lane::before{
  background:linear-gradient(90deg,rgba(47,107,255,0) 0%,rgba(47,107,255,.12) 18%,
    rgba(47,107,255,.12) 82%,rgba(47,107,255,0) 100%)}

/* ── las cuatro garantias ── */
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .rows li{border-color:var(--o-line2)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .rows li::before{
  background:var(--blue);opacity:.16}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .rows .rn{color:var(--o-ink3)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .rows .rd{color:var(--o-ink2)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .rows b{color:var(--o-ink)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .ic{
  background:rgba(47,107,255,.20);color:var(--o-blue)}

/* ── la ronda y su widget ── */
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .pr.up{
  background:rgba(47,107,255,.12);border-color:var(--o-line)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .pr-mult{
  background:rgba(111,227,168,.10);color:var(--o-verde)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .raise-bar{background:rgba(255,255,255,.12)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) :is(.w-field,.w-field.out){
  background:rgba(255,255,255,.045);border-color:var(--o-line);color:var(--o-ink)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .widget :is(button,.red):not(.w-cta){
  background:rgba(255,255,255,.045);border-color:var(--o-line);color:rgba(233,238,247,.80)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .widget .on{
  background:rgba(47,107,255,.20);border-color:rgba(143,184,255,.5);color:var(--o-ink)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .w-range{background:rgba(255,255,255,.16)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .w-out{background:rgba(255,255,255,.12)}

/* ── el cierre ── */
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .jbtn-go{color:var(--o-ink)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .pn{
  border-color:var(--o-line);color:rgba(233,238,247,.80)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .pn:hover{color:#fff}

/* ── el pie ── */
/* Se quedaba en papel blanco debajo de una pagina entera en oscuro, que es
   justo el corte que se venia criticando. Baja al suelo mas oscuro de todos,
   y las auroras que ya tenia detras por fin hacen lo que hacen en la portada:
   sobre blanco eran manchas, sobre negro son luz. */
footer{background:#05070B;color:var(--o-ink);border-top-color:rgba(255,255,255,.10)}
footer .ffield i{opacity:.38;mix-blend-mode:screen}
footer :is(.fbrand,.fbrand svg,.fgrid a:hover){color:var(--o-ink)}
footer .fbrand svg{--nl-chip:var(--o-blue)}
footer .fgrid h4{color:rgba(233,238,247,.52)}
footer .fgrid a{color:rgba(233,238,247,.74)}
footer .fgrid a::before{color:rgba(233,238,247,.30)}
footer :is(.fcopy,.f-legal){color:rgba(233,238,247,.68)}
footer .fend{border-top-color:rgba(255,255,255,.11);color:rgba(233,238,247,.60)}
footer .fmark span{background-image:linear-gradient(180deg,
  rgba(233,238,247,.22),rgba(233,238,247,.04))}

/* ── contraste ──
   Lo que la bateria encontro por debajo del minimo, medido y no estimado.

   Las cifras del widget eran el error tipico de un cambio asi: yo pinte de
   claro el texto y di por hecho que el fondo bajaba con la seccion, pero las
   celdas llevan su propio «background:#fff» en «.w-out>div» y se quedaron
   blancas. Texto claro sobre blanco: 1,11:1. No se arregla aclarando mas la
   letra, se arregla en la celda. */
C .w-out{background:var(--o-line);border-color:var(--o-line);color:var(--o-ink)}
C .w-out>div{background:rgba(255,255,255,.045)}
C .w-out :is(dt,.mono){color:var(--o-ink2)}
C .w-out :is(dd,b){color:var(--o-ink)}
C .w-out dd.up{color:var(--o-verde)}

/* Y dos que el medidor no podia ver, porque ninguno de los dos es un
   problema de contraste:
   · «Buy NRM» lo pinta «.w-top>span:first-child», que con dos elementos en el
     selector le gana a la regla generica y se quedo en tinta negra;
   · la marca de X y la de Telegram son «fill:currentColor», y el color venia
     del propio «.jbtn», que nadie habia tocado: la X salia negra sobre negro.
   Se ven en una captura, no en una medida. */
C .w-top>span:first-child{color:var(--o-ink)}
C .jbtn{color:var(--o-ink);border-color:var(--o-line)}

/* El resto ya venia de antes y sale ahora porque por fin hay quien lo mida:
   ninguno es de este cambio. */
.hero-pr{color:rgba(226,236,250,.66)}      /* la tira de pruebas: 4,10 */
.bcd-tag{color:rgba(255,255,255,.58)}      /* el pie de las dos tarjetas: 4,08 */
.raise-bar em,.raise-tip em{color:#fff}    /* el globo del porcentaje */

/* Los dos botones azules daban 4,43 con tinta casi negra y 3,54 con blanca:
   el azul de marca esta en mitad de la escala y no gana por ningun lado. En
   oscuro sube un escalon —sigue siendo el mismo azul, mas encendido, que es
   lo que pide un fondo negro— y con tinta negra se va a 5,8. */
.hb.blue,.get{background:#4C82FF;color:#00070F}

/* La placa de color de cada tarjeta de prensa es ella misma un fondo fuerte:
   ahi la marca sigue en blanco. La regla generica de arriba la alcanzaba por
   ser «span» y la dejo en gris claro sobre azul electrico. */
C .pcd-plate,C .pcd-plate span{color:#fff}

/* Los logotipos de los medios y la baldosa que los lleva se quedan BLANCOS:
   estan hechos sobre blanco y sobre negro pierden su forma. */
C .cb-tile{background:#fff}
""".replace('\nC ', '\n:is(' + SECS + ') ').replace(',C ', ',:is(' + SECS + ') ') + '\n' + FIN


def aplicar(html):
    """Idempotente."""
    for viejo, color in FONDOS:
        if viejo in html:
            html = html.replace(viejo, viejo.rsplit('data-bg="', 1)[0] + 'data-bg="' + color + '"', 1)
    if MARCA in html:
        i = html.index(MARCA)
        j = html.index(FIN, i) + len(FIN)
        return html[:i] + CSS.strip('\n') + html[j:]
    assert html.count('\n</style>') == 1
    return html.replace('\n</style>', '\n' + CSS.strip('\n') + '\n</style>', 1)
