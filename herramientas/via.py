# -*- coding: utf-8 -*-
"""La via: una sola linea cose la pagina, y las bandas dejan de cortarse.

La pagina eran diez secciones y cuatro bandas animadas entre ellas, y cada
costura un corte seco: la banda se guillotinaba a media letra y la seccion
siguiente aterrizaba encima sin ninguna relacion con lo de arriba. Cuatro
veces. Eso es lo que hacia que no pareciera una pagina sino catorce trozos
seguidos, por bien acabado que estuviera cada uno.

La via es una linea central continua. Entra en cada seccion por arriba, la
banda animada se ESTRECHA hacia ella en vez de cortarse, y la entrega en una
estacion: el cubo de la marca cerrandose, y debajo el numero y el nombre —los
del menu, que ya estaban—. Lo de arriba y lo de abajo pasan a ser la misma
pagina.

No estrena ni un texto.

`montar_home.py` lo aplica en el paso 20.
"""

MARCA = '/* ══ la via ══'
FIN = '/* ══ fin: via ══ */'

# ── las estaciones ───────────────────────────────────────────────────────────
# Las diez del menu, en orden. La via entra por arriba de cada una.
ESTACIONES = ['network', 'press', 'thesis', 'solutions', 'stack',
              'security', 'presale', 'token', 'builds', 'join']

# ── los empalmes ─────────────────────────────────────────────────────────────
# Cada banda animada y el suelo de la seccion que le sigue. El embudo se pinta
# del color de ABAJO, no del de arriba: es la seccion siguiente subiendo a
# recoger, no la banda desangrandose.
# El embudo va del color de la PROPIA BANDA, no del de la seccion siguiente.
# Lo probe al reves y sale un triangulo palido gigante encima del negro: se lee
# como una mancha, no como una entrega. Lo que tiene que hacer es apagar la
# banda hacia la linea; la seccion siguiente ya entra sola por debajo.
EMPALMES = [
    ('chroma', '#000000'),   # su propio suelo
    ('kin',    '#050609'),
    ('xf',     '#F5F5F7'),   # el escenario de xfade es claro
    ('xl',     '#0A0E18'),
]

CSS = """
/* ══ la via ═══════════════════════════════════════════════════════════════
   Una sola linea cose la pagina. Entra en cada seccion por arriba, la banda
   animada se estrecha hacia ella en vez de cortarse, y la entrega en una
   estacion. Lo de arriba y lo de abajo pasan a ser la misma pagina. */

/* ── la linea ──
   Va por encima de la costura —z-index 4, que la costura es 1— y sale de
   ARRIBA del todo de la seccion, que con el solape negativo cae dentro de la
   anterior: por eso se lee continua y no como diez rayitas sueltas. */
.via{position:absolute;left:50%;top:calc(-1 * clamp(36px,3.4vw,64px));
  width:1px;transform:translateX(-.5px);
  height:clamp(120px,15vh,210px);z-index:4;pointer-events:none;
  background:linear-gradient(to bottom,
    transparent,var(--via-c,rgba(160,200,255,.55)) 34%,transparent)}
/* La estacion: el cubo de la marca, cerrado. Cuadrado, como el logotipo. */
.via::after{content:"";position:absolute;left:50%;top:clamp(34px,3.2vw,60px);
  width:11px;height:11px;transform:translateX(-50%);
  background:var(--via-c,#79ABFF);
  box-shadow:0 0 18px var(--via-g,rgba(121,171,255,.85))}
/* En papel el azul de marca; en lo oscuro, el claro. Es la misma regla que
   siguen los numeros de los epigrafes. */
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .via{
  --via-c:rgba(27,73,224,.55);--via-g:rgba(27,73,224,.5)}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .via::after{
  background:#1B49E0}
/* La primera no lleva cubo: no viene de ninguna banda, viene de la portada,
   que ya cierra con su propio rail. */
.logos .via::after{display:none}

/* ── el empalme ──
   El embudo se pinta del color de ABAJO: es la seccion siguiente subiendo a
   recoger, no la banda desangrandose. Y llega justo hasta el centro, que es
   por donde pasa la via. */
.emb{position:absolute;left:0;right:0;bottom:0;z-index:3;pointer-events:none;
  height:clamp(78px,9.5vw,132px);
  background:linear-gradient(to bottom,transparent,var(--emb,#06080D) 88%);
  clip-path:polygon(0 0,100% 0,50.7% 100%,49.3% 100%)}
/* Las dos bandas de escenario fijo son mas altas que la pantalla: el embudo
   se ancla al final de la seccion, que es donde el escenario acaba parado. */
.xf .emb,.xl .emb{height:clamp(90px,11vw,150px)}
@media(max-width:760px){.emb{height:clamp(56px,16vw,86px)}}

/* ── la estacion, centrada sobre la via ──
   Los epigrafes iban pegados a la izquierda. Centrados sobre la linea, las
   diez entradas caen en el mismo sitio y la pagina gana la simetria que le
   faltaba. El filete del epigrafe sale a los DOS lados, que si sale a uno
   solo se lee como un error de maquetacion. */
/* Los titulares si: cada cabecera es su propia caja y ahi centrar no arrastra
   contenido ajeno. */
:is(.press-head,.sec-head,.tkp-head,.builds-head,.join-head,.say .wrap){
  text-align:center}
:is(.press-head,.sec-head,.tkp-head,.builds-head,.join-head)>*{
  margin-inline:auto}
/* «.sk» es inline-flex: centrar su CONTENIDO no lo mueve a el, y centrarlo
   desde el padre —lo primero que probe— se lleva por delante TODO lo que hay
   dentro de ese padre: las cuatro filas de garantias se quedaron con sus
   descripciones centradas a media columna. Se hace block y se centra el solo,
   sin tocar a nadie. */
:is(#press,#thesis,#solutions,#security,#token,#builds,#join) .sk{
  display:flex;width:100%;justify-content:center;
  padding-top:clamp(16px,2vw,30px)}
:is(#press,#thesis,#solutions,#security,#token,#builds,#join) .sk::before{
  content:"";width:clamp(26px,3.4vw,54px);height:1px;flex:0 0 auto;order:-1;
  background:linear-gradient(90deg,transparent,currentColor);opacity:.45}
/* Y los titulares y sus entradillas, centrados con ellos. */
:is(.press-h,.sec-h,.tkp-h,.builds-h,.join-h,.sec-sub,.join-note,.say p){
  margin-inline:auto;text-align:center}
:is(.sec-sub,.join-note){max-width:52ch}

/* La ronda se queda como esta: su titular convive con el widget a la derecha
   y centrarlo lo dejaria hablando solo. Ahi la via entra igual y la estacion
   se centra; el resto, no. */
#presale .sale-top{justify-content:center;gap:clamp(14px,2vw,28px)}

/* ── el telefono ──
   En vertical la linea es mas corta: la pantalla mide un tercio y una via de
   210 px se come media seccion. */
@media(max-width:760px){
  .via{height:clamp(78px,13vh,120px);
    top:calc(-1 * clamp(24px,3.4vw,44px))}
  .via::after{top:clamp(22px,3.2vw,40px);width:9px;height:9px}
  :is(#press,#thesis,#solutions,#security,#token,#builds,#join) .sk{
    padding-top:clamp(10px,3vw,20px)}
}
""" + '\n' + FIN

MARCADOR = '<i class="via" aria-hidden="true"></i>'


def aplicar(html):
    """Idempotente."""
    # la via entra en cada estacion
    for sec in ESTACIONES:
        for abre in ('<section class="paper logos" id="%s"' % sec,
                     '<section class="press paper" id="%s"' % sec,
                     '<section class="paper say" id="%s"' % sec,
                     '<section class="paper2 pad" id="%s"' % sec,
                     '<section class="stack stk-hold" id="%s"' % sec,
                     '<section class="secure" id="%s"' % sec,
                     '<section class="sale" id="%s"' % sec,
                     '<section class="tkp" id="%s"' % sec,
                     '<section class="builds" id="%s"' % sec,
                     '<section class="join" id="%s"' % sec):
            i = html.find(abre)
            if i < 0:
                continue
            j = html.index('>', i) + 1
            if html[j:j + len(MARCADOR)] == MARCADOR:
                break
            html = html[:j] + MARCADOR + html[j:]
            break
    # el embudo de cada banda
    for clase, suelo in EMPALMES:
        emb = '<i class="emb" aria-hidden="true" style="--emb:%s"></i>' % suelo
        i = html.find('<section class="%s"' % clase)
        if i < 0:
            continue
        j = html.index('>', i) + 1
        if html[j:j + 12] == '<i class="emb':
            continue
        if '<i class="emb" aria-hidden="true" style="--emb:%s"></i>' % suelo in html:
            continue
        html = html[:j] + emb + html[j:]
    if MARCA in html:
        i = html.index(MARCA)
        j = html.index(FIN, i) + len(FIN)
        return html[:i] + CSS.strip('\n') + html[j:]
    assert html.count('\n</style>') == 1
    return html.replace('\n</style>', '\n' + CSS.strip('\n') + '\n</style>', 1)
