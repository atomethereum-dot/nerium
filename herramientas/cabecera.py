# -*- coding: utf-8 -*-
"""La cabecera: el aviso de la ronda arriba del todo y el menu del centro.

Como el resto de piezas de `herramientas/`, esto viaja DENTRO del index.html
que se sube: el archivo que llega del diseno no trae nada de esto, y sin este
paso cada montaje devolveria la barra con solo el logotipo y el boton.
`montar_home.py` lo aplica en el paso 11.
"""
import json
import re

# ── el aviso ─────────────────────────────────────────────────────────────────
# El porcentaje que va escrito aqui es el que se ve mientras carga la capa
# web3; en cuanto `assets/dapp.js` pinta la barra de recaudacion llama a
# window.__aviso() con SU cifra, la misma que sale en la barra. Asi el aviso no
# puede contradecir a la pagina: sale del mismo calculo.
PCT = 85

AVISO = """
<div class="ann" id="ann">
  <a class="ann-in" href="#presale">
    <i class="ann-dot" aria-hidden="true"></i>
    <span class="ann-k">Seed Round</span>
    <i class="ann-p ann-p1" aria-hidden="true"></i>
    <span class="ann-n"><b id="annPct">%d%%</b> <span>complete</span></span>
    <i class="ann-p ann-p2" aria-hidden="true"></i>
    <span class="ann-s">1 NRM = $0.20</span>
    <span class="ann-go" aria-hidden="true">&#8594;</span>
  </a>
  <i class="ann-track" aria-hidden="true"><i class="ann-fill" id="annFill" style="width:%d%%"></i></i>
  <button class="ann-x" id="annX" type="button" aria-label="Hide this notice">
    <svg viewBox="0 0 14 14" aria-hidden="true"><path d="M3 3l8 8M11 3l-8 8"/></svg>
  </button>
</div>
<script>
(function(){
  var b=document.getElementById('ann'); if(!b) return;
  var K='nrm:aviso', txt=document.getElementById('annPct'), fill=document.getElementById('annFill');
  function ahora(){ return parseFloat((txt&&txt.textContent||'').replace('%%',''))||0 }
  function guardado(){ try{ var v=localStorage.getItem(K); return v===null?null:parseFloat(v) }catch(e){ return null } }
  /* Se oculta si ya se cerro, pero vuelve sola cuando la ronda avanza dos
     puntos: un aviso de venta que se cierra para siempre deja de avisar. */
  var v=guardado();
  if(v!==null && ahora()-v < 2) document.body.classList.add('ann-off');
  document.getElementById('annX').addEventListener('click',function(){
    document.body.classList.add('ann-off');
    try{ localStorage.setItem(K,String(ahora())) }catch(e){}
  });
  window.__aviso=function(p){
    if(!(p>=0)) return;
    if(txt) txt.textContent=Math.round(p)+'%%';
    if(fill) fill.style.width=Math.min(100,p)+'%%';
    var g=guardado();
    if(g!==null && p-g>=2){
      try{ localStorage.removeItem(K) }catch(e){}
      document.body.classList.remove('ann-off');
    }
  };
})();
</script>
""" % (PCT, PCT)

ANCLA_AVISO = '<header class="hd" id="hd">'


# ── el menu del centro ───────────────────────────────────────────────────────
# Cada entrada lleva su ficha, como en las cabeceras que usan ese patron. La
# ficha NO es un desplegable: aqui no hay subpaginas a las que ir, y una ficha
# que se abre para ensenar cuatro enlaces al mismo sitio miente. Es un icono
# que dice a que se va. Docs y Blog se quedan fuera a proposito: sus secciones
# estan en display:none, y un enlace a algo oculto no lleva a ninguna parte.
# ── secciones sin ancla ──────────────────────────────────────────────────────
# Dos de las secciones de la pagina no tenian id: no se podia enlazar a ellas.
# El nombre que les da el marcador de abajo sale del mapa NOMBRE, y ese mapa
# busca por id, asi que a la de la tesis hay que darle tambien su entrada o el
# marcador pasaria a decir «thesis» a secas.
ANCLAS = [
 ('<section class="press paper" data-bg="#FFFFFF" data-acc="#1D6AFF">',
  '<section class="press paper" id="press" data-bg="#FFFFFF" data-acc="#1D6AFF">'),
 ('<section class="paper say" data-bg="#FFFFFF" data-acc="#2E60FF">',
  '<section class="paper say" id="thesis" data-bg="#FFFFFF" data-acc="#2E60FF">'),
 ("    security:'Security', presale:'Seed Round', token:'Tokenomics',",
  "    security:'Security', presale:'Seed Round', token:'Tokenomics',\n"
  "    thesis:'The thesis', builds:'What is running',"),

 # La palabra de la marca, en su propia caja: suelta, como nodo de texto, no
 # hay forma de colocarla, y hace falta para apoyarla en la punta del rombo.
 ('<svg aria-hidden="true"><use href="#nlogo-s"/></svg>\n    Nereum</a>',
  '<svg aria-hidden="true"><use href="#nlogo-s"/></svg>\n'
  '    <span class="bw">Nereum</span></a>'),
]

ICONOS = {
    'network':   '<path d="M12 3.4 19 7.4v8.2l-7 4-7-4V7.4l7-4Z"/>',
    'press':     '<path d="M4.6 6.4h14.8v8.8h-8.1L7.4 18.6v-3.4H4.6Z"/>',
    'thesis':    '<path d="M7 4.6h6.4L17 8.2v11.2H7Z"/><path d="M13 4.6v3.8h4"/>',
    'solutions': '<path d="M4.5 4.5h5.5v5.5H4.5zM14 4.5h5.5v5.5H14z'
                 'M4.5 14h5.5v5.5H4.5zM14 14h5.5v5.5H14z"/>',
    'stack':     '<path d="M12 4 4 8l8 4 8-4-8-4Z"/><path d="M4 14l8 4 8-4"/>',
    'security':  '<path d="M12 3.5 5.2 6.4v4.8c0 4 2.8 6.8 6.8 7.6 4-.8 6.8-3.6 6.8-7.6V6.4L12 3.5Z"/>',
    'presale':   '<path d="M4.6 18.4h14.8"/><path d="M8 18.4v-4.2M12 18.4v-8.6M16 18.4v-6.2"/>',
    'token':     '<circle cx="12" cy="12" r="7.6"/><circle cx="12" cy="12" r="3"/>',
    'builds':    '<path d="M9.2 8 5 12l4.2 4"/><path d="M14.8 8 19 12l-4.2 4"/>',
    'join':      '<circle cx="12" cy="12" r="2.2"/>'
                 '<path d="M7.6 7.6a6.2 6.2 0 0 0 0 8.8"/><path d="M16.4 7.6a6.2 6.2 0 0 1 0 8.8"/>',
}

# Todas las secciones de la pagina, en el orden en que se bajan: asi lo que se
# subraya al desplazar avanza de izquierda a derecha, sin saltos. Faltan tres
# —Docs, Blog y el equipo— porque estan en display:none, y un enlace a algo
# oculto no lleva a ninguna parte. Quedan fuera tambien las de paso (chroma,
# kin, xfade, xlight), que no tienen contenido propio: son transiciones.
ENTRADAS = [
    ('network',   'Network'),
    ('press',     'Press'),
    ('thesis',    'Thesis'),
    ('solutions', 'Solutions'),
    ('stack',     'Stack'),
    ('security',  'Security'),
    ('presale',   'Seed Round'),
    ('token',     'Token'),
    ('builds',    'Build'),
    ('join',      'In the open'),
]


def _ficha(sid):
    return ('<i class="chip" aria-hidden="true"><svg viewBox="0 0 24 24">'
            + ICONOS[sid] + '</svg></i>')


NAV = '  <nav class="nav">\n' + ''.join(
    '    <a href="#%s">%s%s</a>\n' % (sid, txt, _ficha(sid))
    for sid, txt in ENTRADAS) + '  </nav>'

NAV_VIEJO = """  <nav class="nav">
    <a href="#stack">Stack</a>
    <a href="#solutions">Solutions</a>
    <a href="#network">Network</a>
    <a href="#security">Security</a>
    <a href="#docs">Docs</a>
    <a href="#blog">Blog</a>
  </nav>"""

HOJA = '<div class="sheet" id="sheet">\n' + ''.join(
    '  <a href="#%s">%s%s</a>\n' % (sid, txt, _ficha(sid))
    for sid, txt in ENTRADAS) + \
    '  <a class="sheet-cta" href="#presale">Join the Seed Round</a>\n</div>'

HOJA_VIEJA = """<div class="sheet" id="sheet">
  <a href="#stack">Stack</a><a href="#solutions">Solutions</a><a href="#network">Network</a>
  <a href="#security">Security</a><a href="#docs">Docs</a><a href="#blog">Blog</a>
</div>"""


# ── traducciones que faltaban ────────────────────────────────────────────────
# «Stack», «Solutions», «Network», «Security» y «Token» ya estaban en el
# diccionario; «Build» y el «complete» del aviso, no. Sin esto la cabecera se
# quedaria en ingles en los doce idiomas.
TRAD = {
    'es': {'Build': 'Construir',   'complete': 'completado', 'Press': 'Prensa', 'Thesis': 'Tesis'},
    'zh': {'Build': '构建',         'complete': '已完成', 'Press': '媒体', 'Thesis': '主张'},
    'ko': {'Build': '빌드',         'complete': '완료', 'Press': '미디어', 'Thesis': '논지'},
    'ja': {'Build': '開発',         'complete': '完了', 'Press': 'メディア', 'Thesis': '考え方'},
    'pt': {'Build': 'Construir',   'complete': 'concluído', 'Press': 'Imprensa', 'Thesis': 'Tese'},
    'fr': {'Build': 'Développer',  'complete': 'complété', 'Press': 'Presse', 'Thesis': 'Thèse'},
    'de': {'Build': 'Entwickeln',  'complete': 'abgeschlossen', 'Press': 'Presse', 'Thesis': 'These'},
    'tr': {'Build': 'Geliştir',    'complete': 'tamamlandı', 'Press': 'Basın', 'Thesis': 'Tez'},
    'vi': {'Build': 'Xây dựng',    'complete': 'hoàn thành', 'Press': 'Báo chí', 'Thesis': 'Luận điểm'},
    'ru': {'Build': 'Разработка',  'complete': 'завершено', 'Press': 'Пресса', 'Thesis': 'Тезис'},
    'id': {'Build': 'Bangun',      'complete': 'selesai', 'Press': 'Pers', 'Thesis': 'Tesis'},
    'ar': {'Build': 'التطوير',      'complete': 'مكتمل', 'Press': 'الصحافة', 'Thesis': 'الأطروحة'},
}


# ── el subrayado del menu marcaba una seccion en la que no estabas ───────────
# El observador solo avisa cuando algo CRUZA la mitad de la pantalla, y durante
# la carga la portada todavia no mide lo que va a medir: la primera seccion que
# cruza es la de despues, asi que nada mas abrir la pagina el menu subrayaba
# «Network» estando en la portada. Con el menu escondido no se veia; ahora si.
ESPIA_VIEJO = """  secs.forEach(o=>io.observe(o.el));
  pon(0);"""

ESPIA = """  secs.forEach(o=>io.observe(o.el));
  pon(0);
  /* Se repasa a mano cuando la pagina ya esta asentada, y en cada cambio de
     tamano: mirar quien cruza la mitad ahora no depende de haberlo visto
     cruzar. */
  function repasa(){
    const m=innerHeight/2;
    for(let i=0;i<secs.length;i++){
      const r=secs[i].el.getBoundingClientRect();
      if(r.top<=m&&r.bottom>m){ if(i!==actual){actual=-1;pon(i)} return }
    }
    /* La portada no esta en esta lista —vive dentro de .hero-hold, no es hija
       directa de <main>—, asi que estando en ella no cruza nadie la mitad: lo
       correcto es que no haya nada subrayado, no que se quede lo anterior. */
    links.forEach(l=>l.classList.remove('on'));
    actual=-1;
  }
  addEventListener('load',()=>setTimeout(repasa,80));
  addEventListener('resize',repasa,{passive:true});
  setTimeout(repasa,1000);"""

CSS = open(__file__.replace('cabecera.py', 'cabecera_css.txt'), encoding='utf-8').read()


def _traducir(html):
    m = re.search(r'(<script id="i18n" type="application/json">)(.*?)(</script>)',
                  html, re.S)
    if not m:
        return html
    d = json.loads(m.group(2))
    for lang, pares in TRAD.items():
        if lang not in d:
            continue
        for k, v in pares.items():
            d[lang].setdefault(k, v)
    crudo = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
    assert '</script' not in crudo
    return html[:m.start(2)] + crudo + html[m.end(2):]


def aplicar(html):
    """Idempotente."""
    for viejo, nuevo in ANCLAS:
        if viejo in html:
            html = html.replace(viejo, nuevo, 1)
    if ESPIA_VIEJO in html:
        html = html.replace(ESPIA_VIEJO, ESPIA, 1)
    if NAV_VIEJO in html:
        html = html.replace(NAV_VIEJO, NAV, 1)
    if HOJA_VIEJA in html:
        html = html.replace(HOJA_VIEJA, HOJA, 1)
    if '<div class="ann" id="ann">' not in html and ANCLA_AVISO in html:
        html = html.replace(ANCLA_AVISO, AVISO.strip() + '\n\n' + ANCLA_AVISO, 1)
    if '══ la cabecera ══' not in html:
        assert html.count('\n</style>') == 1
        html = html.replace('\n</style>', '\n' + CSS + '</style>', 1)
    return _traducir(html)
