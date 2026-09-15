# -*- coding: utf-8 -*-
"""Paso 34 · la simetria, la limpieza y el acero.

Tres cosas, en este orden.

SIMETRIA. La pagina tiene una regla y la rompia en tres sitios:

    epigrafe numerado  ->  titular grande  ->  el contenido
    todo pegado al mismo margen izquierdo

  · 01 Network llevaba «Compatible with» a tamano de etiqueta, en mayusculas
    y a media tinta, donde las demas llevan titular. Ahora es el titular de la
    casa, y la fila de logotipos que va debajo termina la frase.
  · 04 Guarantees no tenia titular: saltaba del numero a la lista.
  · 05 The stack lo llevaba todo CENTRADO —epigrafe, titular, subtitulo y los
    tres pasos—, unico caso en toda la pagina.

LIMPIEZA. Fuera las diez fichas del menu. Eran diez cajitas con borde y un
icono de 10 px cada una, al lado de diez enlaces: a ese tamano no se leen, no
se pulsan y no dicen nada; lo unico que hacen es llenar de ruido la primera
barra que se ve. Los enlaces se quedan enteros.

Y el segundo boton de la portada deja de ser un boton blanco macizo. «Join the
Seed Round» es una accion; «Registered & audited» es una AFIRMACION, y estaba
compitiendo en peso con la accion. Pasa a botón de contorno: sigue estando,
sigue llevando a Seguridad, pero deja de disputar el clic.

ACERO. El suelo claro era papel: #F5F8FC, a un paso del blanco. Baja a
#E4EAF4, un gris azulado. No cambia una sola letra de sitio y cambia la
pagina entera: las tarjetas blancas, que antes se confundian con el fondo,
ahora se LEVANTAN sobre el, y la mitad clara deja de parecer papel para
parecer instrumental. Y la portada estrena un horizonte azul bajo el titular:
el negro plano se convierte en profundidad.
"""

MARCA = '/* ══ oscuro ══ Lo aplica herramientas/oscuro.py ═══'

# ── 1 · el titular de «01 Network» ───────────────────────────────────────────
UNO_VIEJO = """.logos h2,.logos .lane-sub{margin-inline:0;text-align:start}"""
UNO_NUEVO = """.logos h2,.logos .lane-sub{margin-inline:0;text-align:start}
""" + MARCA + """════════════════════
   «Compatible with» iba a tamano de etiqueta —mono, mayusculas, media tinta—
   donde las otras diez secciones llevan titular. Es el titular: la fila de
   logotipos que va debajo termina la frase. */
.logos h2.lane-k{font-family:inherit;font-weight:300;font-size:var(--fs-h2);
  line-height:1.02;letter-spacing:-.042em;text-transform:none;
  opacity:1;color:var(--ink);max-width:20ch;margin:14px 0 0}"""

# ── 2 · el titular que le faltaba a «04 Guarantees» ──────────────────────────
DOS_VIEJO = """    <div class="k sk rv"><i class="sk-n">04</i>Guarantees</div>
    <ul class="rows">"""
DOS_NUEVO = """    <div class="k sk rv"><i class="sk-n">04</i>Guarantees</div>
    <h2 class="sec-h rows-h rv">Four guarantees, written into the protocol.</h2>
    <ul class="rows">"""

TITULAR_04 = 'Four guarantees, written into the protocol.'
TRADUCCIONES_04 = {
    'es': 'Cuatro garant\u00edas, escritas en el protocolo.',
    'zh': '四项保证，写入协议。',
    'ko': '프로토콜에 새겨진 네 가지 보장.',
    'ja': 'プロトコルに書き込まれた四つの保証。',
    'pt': 'Quatro garantias, escritas no protocolo.',
    'fr': 'Quatre garanties, inscrites dans le protocole.',
    'de': 'Vier Garantien, im Protokoll verankert.',
    'tr': 'Protokole yazılmış dört garanti.',
    'vi': 'Bốn bảo đảm, được ghi trong giao thức.',
    'ru': 'Четыре гарантии, записанные в протоколе.',
    'id': 'Empat jaminan, tertulis dalam protokol.',
    'ar': 'أربع ضمانات، مكتوبة في البروتوكول.',
}

# Con «.sec-h» ya hereda el cuerpo, el interletrado y la alineacion de la casa;
# «.rows-h» solo le da el aire de debajo, que la lista va pegada.
DOS_CSS_VIEJO = """.paper2{background:var(--paper2);color:var(--ink)}"""
DOS_CSS_NUEVO = """.paper2{background:var(--paper2);color:var(--ink)}
.rows-h{margin-bottom:clamp(26px,3.4vw,44px)}"""

# ── 3 · «05 The stack», al margen como todas ─────────────────────────────────
# Todo lo de esta escena colgaba de «left:50%» con su «translateX(-50%)»: el
# bloque, el titular, el subtitulo y los tres pasos. Se pasa al mismo borde que
# el resto de cabeceras —el del «.wrap» mas el carril— y se anulan los cuatro
# centrados, incluidos los que vuelven a ponerlo en el estado «.on».
TRES_MARCA_VIEJO = """    <div class="stk-copy">
      <div class="k sk"><i class="sk-n">05</i>The stack</div>"""
TRES_MARCA_NUEVO = """    <div class="stk-copy wrap">
      <div class="stk-steps"><i><b></b></i><i><b></b></i><i><b></b></i></div>
      <div class="k sk"><i class="sk-n">05</i>The stack</div>"""
TRES_PASOS_VIEJO = """    <div class="stk-steps"><i><b></b></i><i><b></b></i><i><b></b></i></div>
  </div>
  <span class="hold" data-bg="#000000" data-acc="#5B7BFF"></span>"""
TRES_PASOS_NUEVO = """  </div><!-- los tres pasos viven ahora dentro de .stk-copy -->
  <span class="hold" data-bg="#000000" data-acc="#5B7BFF"></span>"""
TRES_VIEJO = """.stk-steps i b{display:block;height:100%;width:0;background:var(--blue);border-radius:2px}"""
TRES_NUEVO = """.stk-steps i b{display:block;height:100%;width:0;background:var(--blue);border-radius:2px}
""" + MARCA + """════════════════════
   Era la unica seccion centrada de las once. El borde izquierdo de todas las
   cabeceras es el del «.wrap», asi que la manera honrada de alinearla es
   darle el «.wrap»: la caja se la calcula el mismo sitio que a las demas, y
   los cambios de tamano la siguen solos. Van con ella el titular y el
   subtitulo, que colgaban de «left:50%».

   Y los tres pasos se suben ENCIMA del epigrafe, dentro del bloque. Estaban
   sueltos, pegados al suelo de la escena y centrados; al traerlos al margen
   izquierdo se pusieron justo donde vive el selector de idioma y se pisaban.
   Arriba no estorban a nadie, van con el texto al que pertenecen y se leen
   como lo que son: por donde va la escena. */
.stk-copy{text-align:start;padding-inline:0}
.stk-t b,.stk-sub s{left:0;right:auto}
.stk-t b{transform:translateY(14px)}
.stk-t b.on{transform:none}
.stk-sub s{transform:translateY(10px)}
.stk-sub s.on{transform:none}
.stk-steps{position:static;transform:none;left:auto;bottom:auto;
  justify-content:flex-start;margin-bottom:clamp(16px,2vw,24px)}"""

# ── 4 · fuera las fichas del menu ────────────────────────────────────────────
CUATRO_VIEJO = """.nav>a:hover .chip,.nav>a.on .chip{background:var(--blue);border-color:var(--blue);color:#fff}"""
CUATRO_NUEVO = """.nav>a:hover .chip,.nav>a.on .chip{background:var(--blue);border-color:var(--blue);color:#fff}
""" + MARCA + """════════════════════
   Diez cajitas de 19 px con un icono de 10 dentro, al lado de diez enlaces.
   A ese tamano no se leen, no se pulsan y no dicen nada: solo llenan de ruido
   la primera barra que se ve. Se quedan en el marcado —el menu de movil las
   usa a 26 px, donde si valen— y desaparecen de la barra de escritorio. */
.nav .chip{display:none}"""

# ── 5 · el segundo boton de la portada, de contorno ──────────────────────────
CINCO_VIEJO = """.hero-act .hb.blue{box-shadow:0 14px 30px -18px rgba(47,107,255,.6)}"""
CINCO_NUEVO = """.hero-act .hb.blue{box-shadow:0 14px 30px -18px rgba(47,107,255,.6)}
""" + MARCA + """════════════════════
   «Join the Seed Round» es una accion. «Registered & audited» es una
   afirmacion, y siendo un boton blanco macizo competia en peso con la accion.
   De contorno: sigue estando y sigue llevando a Seguridad, pero ya no disputa
   el clic. */
.hero-act .hb.white{background:transparent;color:rgba(226,236,255,.92);
  box-shadow:inset 0 0 0 1px rgba(150,180,255,.30)}
.hero-act .hb.white:hover{background:rgba(255,255,255,.07);color:#fff;
  box-shadow:inset 0 0 0 1px rgba(150,180,255,.55)}
.hero-act .hb.white::before{background:#fff;opacity:.10}"""

# ── 6 · el horizonte de la portada ───────────────────────────────────────────
# El negro de la portada era negro plano. Un halo azul bajo el titular, ancho y
# muy abierto, le da fondo sin tapar nada: queda por debajo del texto y de los
# botones, que ya van a «z-index:2».
SEIS_VIEJO = """.hero-in h1,.hero-in .hero-act{position:relative;z-index:2}"""
SEIS_NUEVO = """.hero-in h1,.hero-in .hero-act{position:relative;z-index:2}
""" + MARCA + """════════════════════
   El horizonte: el negro de la portada deja de ser negro plano. Va por debajo
   del titular y de los botones, que ya se declaran a «z-index:2». */
.hero-in::before{content:"";position:absolute;left:50%;bottom:-14%;
  width:min(1500px,150%);height:62%;translate:-50% 0;z-index:0;pointer-events:none;
  background:radial-gradient(ellipse 52% 50% at 50% 100%,
    rgba(47,107,255,.34),rgba(47,107,255,.10) 42%,transparent 72%)}"""

# ── 7 · el suelo claro deja de ser papel ─────────────────────────────────────
SUELO = '#E4EAF4'

SIETE_VIEJO = """--suelo:#F5F8FC"""
SIETE_NUEVO = """--suelo:""" + SUELO

# ── 7b · y el suelo es UNO, no siete ─────────────────────────────────────────
# Bajar «--suelo» no bastaba, y se veia: aparecia una franja mas clara entre
# secciones. La causa es que las secciones claras no pintan solas sobre el
# vacio. Detras hay un lienzo fijo —el «#wash»— cuyo color sale del «data-bg»
# de cada banda, y ademas la pagina ENCOGE cada seccion al entrar, un 5 % con
# el scroll. Encogida, la seccion deja de tapar su caja: se ve el lienzo por
# los cuatro lados. Mientras suelo y lienzo eran casi el mismo blanco no se
# notaba; con el suelo a #E4EAF4 y el lienzo en #F5F5F7 quedaban diecisiete
# puntos de diferencia, que es una franja.
#
# Y con el lienzo iban seis colores mas escritos a mano para el suelo viejo: el
# pie, el sosten de la portada, la escena del fundido —incluido el relleno del
# lienzo en JS— y las lamas que barren de negro a claro. Todos al mismo sitio.
PIE1_VIEJO = """footer{position:relative;overflow:hidden;background:#FBFCFD;color:#0B0D12"""
PIE1_NUEVO = """footer{position:relative;overflow:hidden;background:var(--suelo);color:#0B0D12"""
PIE2_VIEJO = """footer{background:#FBFCFD;border-top"""
PIE2_NUEVO = """footer{background:var(--suelo);border-top"""
SOSTEN_VIEJO = """.hero-hold{position:relative;height:calc(100lvh + 42dvh);z-index:0;background:#FBFCFD}"""
SOSTEN_NUEVO = """.hero-hold{position:relative;height:calc(100lvh + 42dvh);z-index:0;background:var(--suelo)}"""
FUNDIDO_VIEJO = """.xf-stage{position:sticky;top:0;height:100dvh;overflow:hidden;background:#F5F5F7}"""
FUNDIDO_NUEVO = """.xf-stage{position:sticky;top:0;height:100dvh;overflow:hidden;background:var(--suelo)}"""
MALLA_VIEJO = """.sh-mesh{position:absolute;inset:0;opacity:0;background:#FBFCFD;overflow:hidden"""
MALLA_NUEVO = """.sh-mesh{position:absolute;inset:0;opacity:0;background:var(--suelo);overflow:hidden"""
LAMAS_VIEJO = """--e:0;flex:1 1 0;background:#FBFCFD;transform:scaleX"""
LAMAS_NUEVO = """--e:0;flex:1 1 0;background:var(--suelo);transform:scaleX"""
# El lienzo del fundido se rellena desde JS, donde no hay variables de CSS.
# El literal se escribe desde el mismo sitio que el resto, asi que no se
# pueden separar.
LIENZO_VIEJO = """ctx.fillStyle='#F5F5F7';ctx.fillRect(0,0,W,H);"""
LIENZO_NUEVO = """ctx.fillStyle='""" + SUELO + """';ctx.fillRect(0,0,W,H);"""
EQUIPO_VIEJO = """.team{position:relative;background:#FBFCFD;color:var(--ink)"""
EQUIPO_NUEVO = """.team{position:relative;background:var(--suelo);color:var(--ink)"""
# La otra escena de fundido —la que vuelve de negro a claro— lleva su papel
# escrito como tres numeros dentro del JS, que es donde menos se busca. Se veia
# en la juntura con «In the open»: la escena acababa casi en blanco y la
# seccion empezaba en acero, con su escalon.
PAPEL_VIEJO = """  const PAPER=[251,252,253];"""
PAPEL_NUEVO = """  const PAPER=[""" + ','.join(
    str(int(SUELO[i:i + 2], 16)) for i in (1, 3, 5)) + """];"""

# ── 8 · el pie de los proyectos, legible ─────────────────────────────────────
# «Drag or scroll →» iba a blanco al 42 %, que sobre negro son 3,8:1: por
# debajo del 4,5 que pide el minimo para texto pequeno, y encima a 11 px en
# mayusculas. Estaba asi desde siempre; lo que pasa es que las tarjetas eran
# mas altas y el pie caia donde el lavado todavia no habia llegado al negro,
# asi que la bateria lo media contra un fondo mas claro y pasaba por poco. Con
# la captura la tarjeta es mas baja, el pie cae en negro de verdad y se ve lo
# que habia. Al 50 % son 5,3:1.
OCHO_VIEJO = """  letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.42)}"""
OCHO_NUEVO = """  letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.50)}"""


# ── 9 · el epigrafe recupera su raya ─────────────────────────────────────────
# «.sk::after» dibuja una raya corta detras del epigrafe —«05 THE STACK ———»—
# y estaba apagada en siete secciones de once. No por gusto: cuando esos
# epigrafes iban CENTRADOS, la raya colgando a un lado quedaba torcida, y se
# apago. Despues los titulos se pasaron todos a la izquierda y la raya se
# quedo apagada, asi que la pagina llevaba dos epigrafes distintos segun la
# seccion. Vuelve, y las once quedan iguales.
NUEVE_VIEJO = """:is(#press,#thesis,#solutions,#security,#token,#builds,#join) .sk::after{
  display:none}"""
NUEVE_NUEVO = """:is(#press,#thesis,#solutions,#security,#token,#builds,#join) .sk::after{
  display:block}
.logos .sk::after{display:block}"""


CAMBIOS = [
    ('el titular de Network', UNO_VIEJO, UNO_NUEVO),
    ('el titular de Guarantees', DOS_VIEJO, DOS_NUEVO),
    ('el aire del titular nuevo', DOS_CSS_VIEJO, DOS_CSS_NUEVO),
    ('la pila, al margen', TRES_VIEJO, TRES_NUEVO),
    ('la copia de la pila, en su caja', TRES_MARCA_VIEJO, TRES_MARCA_NUEVO),
    ('los pasos de la pila, en su caja', TRES_PASOS_VIEJO, TRES_PASOS_NUEVO),
    ('fuera las fichas del menu', CUATRO_VIEJO, CUATRO_NUEVO),
    ('el segundo boton, de contorno', CINCO_VIEJO, CINCO_NUEVO),
    ('el horizonte de la portada', SEIS_VIEJO, SEIS_NUEVO),
    ('el suelo, de acero', SIETE_VIEJO, SIETE_NUEVO),
    ('el pie, al mismo suelo', PIE1_VIEJO, PIE1_NUEVO),
    ('el pie, la segunda regla', PIE2_VIEJO, PIE2_NUEVO),
    ('el sosten de la portada', SOSTEN_VIEJO, SOSTEN_NUEVO),
    ('la escena del fundido', FUNDIDO_VIEJO, FUNDIDO_NUEVO),
    ('la malla del fundido', MALLA_VIEJO, MALLA_NUEVO),
    ('las lamas del fundido', LAMAS_VIEJO, LAMAS_NUEVO),
    ('el lienzo del fundido', LIENZO_VIEJO, LIENZO_NUEVO),
    ('el equipo, al mismo suelo', EQUIPO_VIEJO, EQUIPO_NUEVO),
    ('el papel de la vuelta', PAPEL_VIEJO, PAPEL_NUEVO),
    ('el pie de los proyectos, legible', OCHO_VIEJO, OCHO_NUEVO),
    ('la raya del epigrafe', NUEVE_VIEJO, NUEVE_NUEVO),
]


# Las bandas claras: el «data-bg» es lo que le dice al lienzo fijo de que
# color ponerse, asi que tiene que ser el suelo y no el blanco de antes.
CLARAS_BG = ('#FFFFFF', '#FBFCFD', '#F5F5F7', '#F1F2F4', '#F5F8FC')


def aplicar(html):
    """Idempotente: si el cambio ya esta, no lo repite."""
    for nombre, viejo, nuevo in CAMBIOS:
        if nuevo in html:
            continue
        assert html.count(viejo) == 1, 'no esta, o esta repetido: ' + nombre
        html = html.replace(viejo, nuevo, 1)
    for viejo in CLARAS_BG:
        html = html.replace('data-bg="%s"' % viejo, 'data-bg="%s"' % SUELO)
    assert 'data-bg="%s"' % SUELO in html, 'ninguna banda clara ha quedado al suelo'
    return traducir(html)


def traducir(html):
    """Mete el titular nuevo en los doce idiomas."""
    import json, re
    m = re.search(r'(<script id="i18n" type="application/json">)(.*?)(</script>)',
                  html, re.S)
    assert m, 'no esta el bloque de traducciones'
    d = json.loads(m.group(2))
    falta = False
    for lang, txt in TRADUCCIONES_04.items():
        assert lang in d, 'idioma que no esta: ' + lang
        if d[lang].get(TITULAR_04) != txt:
            d[lang][TITULAR_04] = txt
            falta = True
    if not falta:
        return html
    nuevo = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
    return html[:m.start(2)] + nuevo + html[m.end(2):]


if __name__ == '__main__':
    import sys, io
    p = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
    s = io.open(p, encoding='utf-8').read()
    salida = aplicar(s)
    io.open(p, 'w', encoding='utf-8').write(salida)
    print('oscuro aplicado')
