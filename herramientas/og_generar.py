# -*- coding: utf-8 -*-
"""Las imagenes que salen al compartir el enlace, con el cubo nuevo.

Se rehacen en HTML y se fotografian con el mismo Chromium de las pruebas, para
que la tipografia sea la del propio sitio y no una aproximacion. Los tonos de
fondo estan muestreados de las imagenes que habia, no elegidos a ojo.
"""
import importlib.util, os
spec = importlib.util.spec_from_file_location('l', '/home/user/nerium/herramientas/logo/logo.py')
L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)

def cubo(px):
    return L.svg(px, margen=0.0)

CAB = """<meta charset="utf-8">
<link rel="stylesheet" href="/assets/fonts.css">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:2400px;height:1260px;overflow:hidden}
  body{font-family:'Switzer','Inter Tight',system-ui,sans-serif;-webkit-font-smoothing:antialiased}
  .lienzo{position:relative;width:2400px;height:1260px;overflow:hidden}
  .mono{font-family:'DM Mono',ui-monospace,monospace}
</style>
"""

PORTADA = CAB + """
<div class="lienzo" style="
  background:
    radial-gradient(120% 90% at 18% 12%, #EFF4FD 0%, rgba(239,244,253,0) 55%),
    radial-gradient(100% 80% at 82% 88%, #F1F5FD 0%, rgba(241,245,253,0) 60%),
    linear-gradient(#E5ECFB 0%, #CFDFFC 48%, #E9EFFB 100%);">
  <svg viewBox="0 0 2400 1260" style="position:absolute;inset:0" aria-hidden="true">
    <path fill="#FFFFFF" opacity=".34"
      d="M0 690 C 420 560, 900 900, 1400 760 C 1800 648, 2100 700, 2400 640 L2400 1260 L0 1260 Z"/>
    <path fill="#FFFFFF" opacity=".26"
      d="M0 900 C 500 800, 1000 1030, 1500 930 C 1900 850, 2150 900, 2400 860 L2400 1260 L0 1260 Z"/>
  </svg>
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;
              align-items:center;justify-content:center">
    <div style="width:250px;height:250px;margin-bottom:56px;
                filter:drop-shadow(0 22px 44px rgba(30,52,102,.20))">__CUBO__</div>
    <div style="font-size:170px;font-weight:400;letter-spacing:-.055em;line-height:1;
                background:linear-gradient(100deg,#0B0D12 8%,#8A9099 92%);
                -webkit-background-clip:text;background-clip:text;color:transparent">Nereum</div>
    <div style="width:520px;height:1px;background:rgba(28,42,74,.30);margin:52px 0 40px"></div>
    <div class="mono" style="font-size:40px;letter-spacing:.30em;color:#5A6478">REAL-WORLD ASSET CHAIN</div>
  </div>
</div>
"""

WHITEPAPER = CAB + """
<div class="lienzo" style="
  background:
    radial-gradient(90% 90% at 20% 25%, #D2DEF8 0%, rgba(210,222,248,0) 60%),
    linear-gradient(160deg,#DDE5F8 0%, #E6EDFB 55%, #E1EAFA 100%);">
  <svg viewBox="0 0 2400 1260" style="position:absolute;inset:0" aria-hidden="true">
    <path fill="#FFFFFF" opacity=".42"
      d="M0 560 C 420 470, 900 700, 1400 610 C 1800 538, 2100 570, 2400 530 L2400 1260 L0 1260 Z"/>
    <path fill="#FFFFFF" opacity=".30"
      d="M0 800 C 500 720, 1000 900, 1500 830 C 1900 774, 2150 800, 2400 770 L2400 1260 L0 1260 Z"/>
  </svg>
  <div style="position:absolute;right:110px;top:50%;transform:translateY(-50%);
              width:720px;height:720px;
              filter:drop-shadow(0 30px 60px rgba(30,52,102,.24))">__CUBO__</div>
  <div style="position:absolute;left:172px;top:50%;transform:translateY(-50%)">
    <div style="font-size:118px;font-weight:300;letter-spacing:.01em;line-height:1.06;
                color:#151C2B">NEREUM<br>WHITEPAPER</div>
    <div style="width:790px;height:1px;background:rgba(28,42,74,.32);margin:54px 0 40px"></div>
    <div class="mono" style="font-size:34px;letter-spacing:.16em;color:#5A6478">A Layer 1 built for real-world assets</div>
  </div>
</div>
"""

EXPLORER = CAB + """
<div class="lienzo" style="
  background:
    radial-gradient(70% 60% at 50% 14%, #1B3E96 0%, rgba(27,62,150,0) 62%),
    linear-gradient(#0B1B4E 0%, #091640 38%, #050D22 74%, #03070F 100%);">
  <div style="position:absolute;left:50%;top:300px;transform:translate(-50%,-50%);
              width:330px;height:330px;
              filter:drop-shadow(0 26px 60px rgba(0,0,0,.55))">__CUBO__</div>
  <div style="position:absolute;left:0;right:0;top:640px;text-align:center">
    <div style="font-size:112px;letter-spacing:-.035em;line-height:1">
      <span style="color:#FFFFFF">Nereum</span><span style="color:#5B8CFF"> Explorer</span>
    </div>
    <div class="mono" style="margin-top:56px;font-size:34px;letter-spacing:.34em;color:#8A93A8">THE PUBLIC RECORD OF THE NETWORK</div>
    <div style="margin:78px auto 0;width:660px;height:12px;border-radius:99px;background:#252B3A;overflow:hidden">
      <div style="width:74%;height:100%;border-radius:99px;background:#3B7BFF"></div>
    </div>
  </div>
</div>
"""

SALIDA = '/home/user/nerium/herramientas/og'
os.makedirs(SALIDA, exist_ok=True)
for n, h, px in [('portada', PORTADA, 250), ('whitepaper', WHITEPAPER, 720), ('explorer', EXPLORER, 330)]:
    open(os.path.join(SALIDA, n + '.html'), 'w', encoding='utf-8').write(h.replace('__CUBO__', cubo(px)))
print('paginas listas en', SALIDA)
