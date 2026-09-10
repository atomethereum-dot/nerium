# -*- coding: utf-8 -*-
"""Los arreglos de la portada, que viajan dentro del index.html que se sube.

Se cambia lo que estaba mal, no el diseno: sigue siendo el mosaico centrado
con su titular y sus dos botones. `montar_home.py` lo aplica.
"""

CAMBIOS = [

 # ── 1 · el titular dejaba de ser Switzer ──────────────────────────────────
 # No hay nada que tocar aqui: el arreglo es una regla de CSS y va en
 # bloque_css.txt. Se anota para que se sepa donde vive.

 # ── 2 · el mosaico se sale de la paleta ───────────────────────────────────
 # Los tonos 196 a 210 con saturacion del 100% son CIAN, no el azul de la
 # marca. El #2F6BFF es hsl(222). Se recorta la lista a la familia del azul
 # propio y se le quita un punto de saturacion, que a estos tamanos el 100%
 # vibra y ensucia.
 ("const HUES=[196,202,206,210,212,212,214,216,218,222,226,230,206,212,220,208];",
  "const HUES=[212,214,216,218,220,222,222,224,226,228,230,232,218,222,226,220];"),
 ("      sat:rnd(95,100),",
  "      sat:rnd(78,92),"),

 # El blanco puro de la paleta del mosaico grande es el que dejaba esos
 # bloques que parecen un fallo de pantalla. Se cambia por la plata de la
 # marca, y los dos azules mas frios se acercan al #2F6BFF.
 ("const T=[[77,162,255],[42,91,255],[130,190,255],[255,255,255],[120,145,190],[30,60,150]];",
  "const T=[[64,132,255],[47,107,255],[124,168,255],[220,226,238],[116,134,176],[26,52,132]];"),

 # ── 3 · la jerarquia de los botones estaba del reves ──────────────────────
 # Con la ronda abierta, la accion principal es entrar en ella; «registrado y
 # auditado» es la prueba que la respalda, no la llamada.
 ('<a class="hb blue" href="#security">Registered &amp; audited</a>\n'
  '      <a class="hb white" href="#presale">Join the Seed Round</a>',
  '<a class="hb blue" href="#presale">Join the Seed Round</a>\n'
  '      <a class="hb white" href="#security">Registered &amp; audited</a>'),

 # ── 5 · el cian no venia de la paleta, venia de la mezcla ─────────────────
 # Los bloques se pintaban SUMANDO (gl.ONE,gl.ONE y «lighter»). Dos azules
 # de marca encima uno de otro dan 47+64=111, 107+132=239, 255+255=510 que
 # se recorta a 255: sale rgb(111,239,255), cian. Tres dan blanco. Por eso
 # recortar los tonos no arreglaba nada: el color malo nacia en la mezcla.
 # Se pasa a «trama» (screen: a + b - a*b), que aclara igual pero no puede
 # pasarse de 255, asi que el solape sube al azul claro de la propia paleta
 # en vez de irse al cian.
 ("    gl.blendFunc(gl.ONE,gl.ONE);",
  "    gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_COLOR);"),
 ("    ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(0,0,W,H);\n"
  "    ctx.globalCompositeOperation='lighter';",
  "    ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(0,0,W,H);\n"
  "    ctx.globalCompositeOperation='screen';"),

 # La barra que barre la portada llevaba los bloques a BLANCO puro, y sobre
 # una mezcla que suma eso es justo lo que reventaba el color. Ahora los
 # lleva a la plata de la marca, que es el mismo gesto sin quemar el tono.
 ("    O=vec4(c*vAlfa,vAlfa);        // se suma sobre lo ya pintado",
  "    O=vec4(c*vAlfa,vAlfa);        // se trama sobre lo ya pintado"),

 ("    if(vScan>0.42){ float m=(vScan-0.42)/0.58; c=mix(c,vec3(1.0),m*0.8); }",
  "    if(vScan>0.42){ float m=(vScan-0.42)/0.58; c=mix(c,PAL[3],m*0.62); }"),
 ("        c=[c[0]+(255-c[0])*m*.8, c[1]+(255-c[1])*m*.8, c[2]+(255-c[2])*m*.55];",
  "        const S=T[3];\n"
  "        c=[c[0]+(S[0]-c[0])*m*.62, c[1]+(S[1]-c[1])*m*.62, c[2]+(S[2]-c[2])*m*.62];"),
]

# ── 4 · la portada no daba ni un dato ────────────────────────────────────────
# Se podia estar diez segundos delante sin saber el precio, en que redes esta
# ni si los contratos estan verificados. Va debajo de los botones, en la letra
# pequena del propio sitio, sin tocar la composicion.
PRUEBAS = """
    <ul class="hero-pr">
      <li><i></i>Seed Round open</li>
      <li>1 NRM = $0.20</li>
      <li>Ethereum &middot; BNB Chain</li>
      <li>Contracts verified</li>
    </ul>"""

ANCLA = ('<a class="hb white" href="#security">Registered &amp; audited</a>\n'
         '    </div>')

# El guardia mira la ETIQUETA, no el nombre de la clase: el CSS de .hero-pr
# entra antes que esto en montar_home.py, asi que buscar 'hero-pr' a secas
# daba siempre por hecho que la lista ya estaba puesta y no la ponia nunca.
MARCA = '<ul class="hero-pr">'


def aplicar(html):
    """Idempotente."""
    for viejo, nuevo in CAMBIOS:
        if viejo in html:
            html = html.replace(viejo, nuevo)
    # La lista va DESPUES del </div> de .hero-act, como hermana suya dentro de
    # .hero-in; dentro de .hero-act la partiria el display:flex de los botones.
    if MARCA not in html and ANCLA in html:
        html = html.replace(ANCLA, ANCLA + PRUEBAS, 1)
    return html
