# -*- coding: utf-8 -*-
"""El sistema: que la pagina se vea ORDENADA, y el aviso de la ronda otra vez.

Puesta la mitad clara a la altura de la oscura, lo que quedaba flojo ya no era
el acabado de cada seccion: era que las diez secciones no se presentan igual.
Contadas una por una habia CUATRO mecanismos distintos de epigrafe —«.k»,
«.lane-k», «.sec-live», «.sale-live»— y tres secciones sin ninguno. Por eso la
pagina no se ve ordenada aunque cada trozo suelto este bien: el lector no
recibe nunca la misma senal al entrar en una seccion nueva.

La regla nueva es una sola y da identidad ademas de orden:

    el epigrafe de cada seccion ES su entrada del menu, numerada.

Asi la espina dorsal de la pagina y el menu de arriba dicen lo mismo, el
subrayado del menu al pasar coincide con el rotulo que tienes delante, y
siempre sabes en cual de las diez vas. Las diez cadenas ya estaban traducidas
a los doce idiomas porque son las del menu: no se estrena ni una.

Y el aviso de la ronda, rehecho: era una tira plana con cuatro cosas sueltas y
un pelo de 2 px abajo que nadie ve. Ahora la barra de avance esta DENTRO, se
ve, y la llamada es un boton y no una flecha.

`montar_home.py` lo aplica en el paso 18.
"""

MARCA = '/* ══ el sistema: orden e identidad ══'
FIN = '/* ══ fin: sistema ══ */'


# ── 1 · el aviso de la ronda ─────────────────────────────────────────────────
# Se conservan los tres identificadores —annPct, annFill, annX— porque de ellos
# cuelga el guion que ya existe: el que lo esconde al cerrarlo, el que lo hace
# volver cuando la ronda avanza dos puntos y window.__aviso(p). Cambia como se
# ve, no como funciona.
PCT = 85

AVISO_VIEJO = """  <a class="ann-in" href="#presale">
    <i class="ann-dot" aria-hidden="true"></i>
    <span class="ann-k">Seed Round</span>
    <i class="ann-p ann-p1" aria-hidden="true"></i>
    <span class="ann-n"><b id="annPct">%d%%</b> <span>complete</span></span>
    <i class="ann-p ann-p2" aria-hidden="true"></i>
    <span class="ann-s">1 NRM = $0.20</span>
    <span class="ann-go" aria-hidden="true">&#8594;</span>
  </a>
  <i class="ann-track" aria-hidden="true"><i class="ann-fill" id="annFill" style="width:%d%%"></i></i>""" % (PCT, PCT)

AVISO_NUEVO = """  <a class="ann-in" href="#presale">
    <span class="ann-k"><i class="ann-dot" aria-hidden="true"></i>Seed Round</span>
    <span class="ann-bar" aria-hidden="true"><i class="ann-fill" id="annFill" style="width:%d%%"></i></span>
    <span class="ann-n"><b id="annPct">%d%%</b> <span>complete</span></span>
    <i class="ann-p" aria-hidden="true"></i>
    <span class="ann-s">1 NRM = $0.20</span>
    <span class="ann-cta">Join the Seed Round<i class="ann-go" aria-hidden="true">&#8594;</i></span>
  </a>""" % (PCT, PCT)


# ── 2 · la espina dorsal ─────────────────────────────────────────────────────
# Cada seccion, su numero y su nombre del menu. El orden es el de la pagina y
# el del menu, que son el mismo.
#
# Dos formas de ponerlo, segun lo que hubiera:
#   · si la seccion YA traia epigrafe, se le mete el numero dentro y se le anade
#     la clase: no se toca su texto ni su punto de «en directo», que significa
#     algo en seguridad y en la ronda;
#   · si no traia ninguno —tesis, garantias y «en abierto» no tenian—, se le
#     pone entero.
NUMERA = [
    # (lo que hay, lo que queda)
    ('<div class="k rv">In the press</div>',
     '<div class="k sk rv"><i class="sk-n">02</i>In the press</div>'),
    ('<div class="k">The stack</div>',
     '<div class="k sk"><i class="sk-n">05</i>The stack</div>'),
    ('<span class="sec-live"><i></i>Security</span>',
     '<span class="sec-live sk"><i class="sk-n">06</i><i></i>Security</span>'),
    ('<span class="sale-live"><i></i>Seed Round open</span>',
     '<span class="sale-live sk"><i class="sk-n">07</i><i></i>Seed Round open</span>'),
    ('<div class="k rv">Tokenomics</div>',
     '<div class="k sk rv"><i class="sk-n">08</i>Token</div>'),
    ('<div class="k rv">What we are building</div>',
     '<div class="k sk rv"><i class="sk-n">09</i>What we are building</div>'),
]

# «Tokenomics» era el unico epigrafe que no estaba traducido a ningun idioma,
# porque no sale en el menu. Pasa a «Token», que es como se llama en el menu y
# si esta en los doce. Un rotulo menos que se queda en ingles.

INSERTA = [
    # (ancla, epigrafe nuevo) — las tres que no tenian ninguno
    ('<section class="paper logos" id="network"',
     '<h2 class="rv lane-k">Compatible with</h2>',
     '<div class="k sk rv"><i class="sk-n">01</i>Network</div>'),
    ('<section class="paper say" id="thesis"',
     '<p class="rv">When value moves',
     '<div class="k sk rv"><i class="sk-n">03</i>The thesis</div>'),
    ('<section class="paper2 pad" id="solutions"',
     '<ul class="rows">',
     '<div class="k sk rv"><i class="sk-n">04</i>Guarantees</div>'),
    ('<section class="join" id="join"',
     '<h2 class="join-h">',
     '<div class="k sk rv"><i class="sk-n">10</i>In the open</div>'),
]


CSS = """
/* ══ el sistema: orden e identidad ═══════════════════════════════════════
   Habia cuatro maneras distintas de presentar una seccion y tres secciones
   que no se presentaban. Ahora hay UNA, y ademas dice algo: el epigrafe de
   cada seccion es su entrada del menu, con su numero. La espina dorsal de la
   pagina y el menu de arriba cuentan lo mismo. */

/* ── el epigrafe, uno para las diez ── */
.sk{display:inline-flex;align-items:center;gap:13px;
  font-family:var(--m);font-size:11px;letter-spacing:.2em;text-transform:uppercase;
  line-height:1}
.sk-n{font-style:normal;font-weight:500;letter-spacing:.06em;
  font-variant-numeric:tabular-nums;font-size:11.5px;flex:0 0 auto;
  /* El azul de marca esta en mitad de la escala: sobre el negro de «Build»
     daba 4,29 y sobre el papel va sobrado. Cada mitad lleva el suyo. */
  color:#79ABFF}
/* El filete detras del rotulo: es lo que convierte diez rotulos sueltos en
   una serie. Corto, para que no se lea como un separador de seccion. */
.sk::after{content:"";width:clamp(26px,3.4vw,54px);height:1px;flex:0 0 auto;
  background:linear-gradient(90deg,currentColor,transparent);opacity:.45}
:is(.paper,.paper2,.secure,.sale,.tkp,.join,.press) .sk-n{color:#1B49E0}
/* En seguridad y en la ronda el epigrafe ya traia su punto de «en directo»,
   que significa algo y se queda: el numero entra delante, no en su sitio.
   Ojo con esto, que ya me lo comi una vez: esas dos reglas visten a CUALQUIER
   «i» de dentro como el punto —6 px, redondo y verde—, y el numero tambien es
   un «i». Salia machacado en un circulito. Hay que desvestirlo. */
:is(.sec-live,.sale-live).sk{gap:10px}
:is(.sec-live,.sale-live).sk .sk-n{
  width:auto;height:auto;border-radius:0;background:none;animation:none;
  box-shadow:none;margin-inline-end:4px}
/* Y los tres nuevos van con el mismo aire que los que ya estaban. */
.say .sk,.rows-head .sk,.join-head .sk{margin-bottom:clamp(18px,2vw,28px)}
.logos .sk{margin-bottom:clamp(12px,1.4vw,18px)}
/* La banda va centrada, y un filete que sale solo por la derecha de algo
   centrado se lee como un error de maquetacion, no como una serie. */
.logos .sk::after{display:none}

/* ── el aviso de la ronda ──
   Era una tira plana: cuatro datos sueltos en fila y el avance en un pelo de
   2 px pegado al canto de abajo, que es justo donde no se mira. Si lo que
   anuncia es que la ronda va por el 85 %, el 85 % tiene que SER el elemento,
   no una nota al pie. */
.ann{background:
  linear-gradient(90deg,#16379E 0%,#2F6BFF 42%,#2F6BFF 62%,#16379E 100%)}
.ann-in{gap:clamp(10px,1.5vw,18px);padding:0 52px 0 22px}
.ann-k{display:inline-flex;align-items:center;gap:8px;font-weight:600;flex:0 0 auto}
.ann-dot{box-shadow:0 0 0 3px rgba(255,255,255,.22)}
/* La barra, dentro y a la vista. Ancho fijo para que el numero de al lado no
   baile cuando la ronda avanza. */
.ann-bar{position:relative;width:clamp(64px,11vw,148px);height:5px;flex:0 0 auto;
  border-radius:3px;overflow:hidden;background:rgba(3,10,40,.55);
  box-shadow:inset 0 1px 2px rgba(3,10,40,.6)}
.ann-fill{display:block;height:100%;border-radius:3px;
  background:linear-gradient(90deg,#BFD6FF,#FFFFFF);
  box-shadow:0 0 10px rgba(255,255,255,.55);
  transition:width 1.1s cubic-bezier(.16,.84,.26,1)}
.ann-n{flex:0 0 auto}
.ann-n b{font-weight:600;font-variant-numeric:tabular-nums}
.ann-p{width:3px;height:3px;border-radius:50%;background:rgba(255,255,255,.45);flex:none}
.ann-s{color:rgba(255,255,255,.82);flex:0 0 auto}
/* La llamada era una flecha suelta. Ahora es un boton, que es lo que es. */
.ann-cta{display:inline-flex;align-items:center;gap:7px;flex:0 0 auto;
  margin-inline-start:clamp(4px,1vw,14px);
  height:24px;padding:0 12px;border-radius:999px;
  background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);
  font-weight:500;letter-spacing:.01em;white-space:nowrap;
  transition:background .22s,border-color .22s}
.ann-in:hover .ann-cta{background:#fff;border-color:#fff;color:#16379E}
.ann-go{font-style:normal;transition:transform .3s cubic-bezier(.16,.84,.26,1)}
.ann-in:hover .ann-go{transform:translateX(3px)}
/* Al estrechar se va lo prescindible por orden: primero el precio, luego el
   texto del boton —se queda la flecha—, y al final la palabra «complete». La
   barra y el porcentaje no se van nunca: son el aviso. */
@media(max-width:1180px){.ann-s,.ann-p{display:none}}
@media(max-width:860px){.ann-cta{padding:0 9px;gap:0;font-size:0}
  .ann-cta .ann-go{font-size:13px}}
@media(max-width:560px){.ann-n span{display:none}.ann-in{padding-inline-start:14px}}
""" + '\n' + FIN


def aplicar(html):
    """Idempotente."""
    if AVISO_VIEJO in html:
        html = html.replace(AVISO_VIEJO, AVISO_NUEVO, 1)
    for viejo, nuevo in NUMERA:
        if viejo in html:
            html = html.replace(viejo, nuevo, 1)
    for seccion, ancla, epigrafe in INSERTA:
        i = html.find(seccion)
        if i < 0:
            continue
        j = html.find(ancla, i)
        if j < 0 or epigrafe in html[i:j]:
            continue
        html = html[:j] + epigrafe + '\n    ' + html[j:]
    if MARCA in html:
        i = html.index(MARCA)
        j = html.index(FIN, i) + len(FIN)
        return html[:i] + CSS.strip('\n') + html[j:]
    assert html.count('\n</style>') == 1
    return html.replace('\n</style>', '\n' + CSS.strip('\n') + '\n</style>', 1)
