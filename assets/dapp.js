/* ───────────────────────────────────────────────────────────────────────────
   Nereum · Seed Round — capa web3 de la web.

   Sustituye a la maqueta del widget de compra: los precios ya no son fijos,
   salen del oráculo del contrato, y el botón compra de verdad.

   Sin librerías. Las llamadas al contrato son eth_call con los datos montados
   a mano: todos los argumentos son uint256 o address, así que codificarlos es
   rellenar con ceros hasta 32 bytes. Meter ethers.js aquí serían 300 KB para
   ahorrarse veinte líneas.
   ─────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* ───────────────────────────── configuración ───────────────────────────── */

  /* Project ID de https://cloud.reown.com — gratis. Mientras esté vacío, la web
     conecta con carteras de navegador (MetaMask, Rabby, Trust, Coinbase, OKX,
     Brave, Phantom…) pero NO ofrece WalletConnect, porque el relay lo exige. */
  var PROYECTO_WC = '87eced186475c03170cf7792da6a9ecd';

  /* La misma dirección en las dos redes. No es casualidad: se desplegó desde la
     misma cuenta con el nonce 0 en ambas. */
  var VENTA = '0xaCbf1Add75139D0E926d57EC715FDaB8bee04A89';

  var CADENAS = {
    1: {
      id: 1, hex: '0x1', nombre: 'Ethereum', simbolo: 'ETH', moneda: 'Ether',
      venta: VENTA,
      usdt: '0xdAC17F958D2ee523a2206206994597C13D831ec7', usdtDec: 6,
      explorador: 'https://etherscan.io',
      rpc: [
        'https://ethereum-rpc.publicnode.com',
        'https://eth.llamarpc.com',
        'https://rpc.ankr.com/eth',
        'https://cloudflare-eth.com'
      ]
    },
    56: {
      id: 56, hex: '0x38', nombre: 'BNB Chain', simbolo: 'BNB', moneda: 'BNB',
      venta: VENTA,
      usdt: '0x55d398326f99059fF775485246999027B3197955', usdtDec: 18,
      explorador: 'https://bscscan.com',
      rpc: [
        'https://bsc-rpc.publicnode.com',
        'https://bsc-dataseed.binance.org',
        'https://bsc-dataseed1.defibit.io',
        'https://rpc.ankr.com/bsc'
      ]
    }
  };

  /* Tolerancia de precio entre que el comprador firma y se mina su transacción.
     Va como minTokensOut: si el oráculo se mueve más que esto, la compra
     revierte en vez de darle menos tokens de los que vio. */
  var HOLGURA_BPS = 100;            /* 1 % */

  /* Objetivo de recaudación que muestra la barra cuando el contrato no tiene
     hard cap puesto. Es una cifra de la página, no de la cadena. */
  var OBJETIVO_USD = 16000000;

  var LISTADO = 1.00;               /* precio de listado, solo informativo */

  /* ─────────────────────────── selectores (keccak) ────────────────────────── */

  var SEL = {
    nativeUsdPrice:  '0xaf68130e',
    priceUsd:        '0x8b3948bd',
    minBuyUsd:       '0x3fbb3d1d',
    maxBuyUsd:       '0x4194fdd1',
    totalTokensSold: '0x63b20117',
    hardCapTokens:   '0x4b749535',
    isLive:          '0xb8f7a665',
    isOver:          '0xb4bd9e27',
    paused:          '0x5c975abb',
    finalized:       '0xb3f05b97',
    startTime:       '0x78e97925',
    claimOpen:       '0x4b8bcb58',
    claimable:       '0x402914f5',
    allocation:      '0xb81b8630',
    remaining:       '0x3acd1572',   /* remainingAllowanceUsd(address) */
    spentUsd:        '0x0da8b1c9',
    buyWithNative:   '0x31ad36ab',
    buyWithUsdt:     '0x7789e96e',
    claim:           '0x4e71d92d',
    allowance:       '0xdd62ed3e',
    approve:         '0x095ea7b3',
    balanceOf:       '0x70a08231'
  };

  /* Errores del contrato, para no enseñarle a nadie un "execution reverted"
     pelado cuando el motivo es que puso menos del mínimo. */
  var ERRORES = {
    '0x9946a058': 'The round is not open right now.',
    '0xd93c0665': 'The round is paused.',
    '0xbd49034f': 'Below the minimum purchase.',
    '0x301300f6': 'That would go over the $10,000 cap for this wallet.',
    '0x9788c342': 'The round has sold out.',
    '0x76baadda': 'The price moved while you were signing. Try again.',
    '0xc10e8918': 'No price feed available right now.',
    '0x3b036449': 'Claims are not open yet.',
    '0x969bf728': 'Nothing to claim.',
    '0xa327f805': 'The token has not been set yet.',
    '0x329d6cd8': 'The round is already closed.',
    '0xa9fd8a31': 'Send through the buy button, not a plain transfer.',
    '0x5274afe7': 'The USDT transfer failed.',
    '0x118cdaa7': 'That wallet is not the owner.'
  };

  /* ──────────────────────────── codificar y leer ──────────────────────────── */

  function rell(h) { return h.replace(/^0x/, '').toLowerCase().padStart(64, '0'); }
  function encU(v) { return rell(BigInt(v).toString(16)); }
  function encA(a) { return rell(a.replace(/^0x/, '')); }
  function palabras(hex) {
    hex = (hex || '').replace(/^0x/, '');
    var w = [];
    for (var i = 0; i + 64 <= hex.length; i += 64) w.push(hex.slice(i, i + 64));
    return w;
  }
  function decU(w) { return w ? BigInt('0x' + w) : 0n; }
  function decB(w) { return decU(w) !== 0n; }

  /* Un RPC público puede estar caído, saturado o bloqueado por el país del
     visitante. Se prueban en orden y con límite de tiempo: quedarse colgado en
     el primero dejaría la página en blanco para todo el que lo tenga bloqueado. */
  function rpc(cid, metodo, params) {
    var lista = CADENAS[cid].rpc.slice();
    var i = 0;
    function intento() {
      if (i >= lista.length) return Promise.reject(new Error('no RPC'));
      var url = lista[i++];
      var corte = new AbortController();
      var reloj = setTimeout(function () { corte.abort(); }, 7000);
      return fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: metodo, params: params }),
        signal: corte.signal
      }).then(function (r) {
        clearTimeout(reloj);
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (j) {
        if (j.error) throw new Error(j.error.message || 'rpc');
        return j.result;
      }).catch(function () {
        clearTimeout(reloj);
        return intento();
      });
    }
    return intento();
  }

  /* Si hay cartera conectada y está en esta red, se le pregunta a ella: trae su
     propio nodo, no depende de que el visitante pueda alcanzar un RPC público
     —hay países donde no— y no gasta cuota de nadie. Los públicos quedan como
     respaldo y como única vía antes de conectar. */
  function llamar(cid, to, data) {
    var params = [{ to: to, data: data }, 'latest'];
    if (sesion.prov && sesion.cid === cid) {
      return sesion.prov.request({ method: 'eth_call', params: params })
        .catch(function () { return rpc(cid, 'eth_call', params); });
    }
    return rpc(cid, 'eth_call', params);
  }

  /* ───────────────────────────── estado de venta ──────────────────────────── */

  /* Lo que la cadena dice de cada red. Se refresca solo mientras la sección
     está a la vista; fuera de ella no tiene sentido gastar peticiones. */
  var estado = {
    1:  { ok: false },
    56: { ok: false }
  };

  function leerRed(cid) {
    var c = CADENAS[cid];
    var uno = function (sel) { return llamar(cid, c.venta, sel).catch(function () { return null; }); };
    return Promise.all([
      uno(SEL.nativeUsdPrice), uno(SEL.priceUsd), uno(SEL.minBuyUsd), uno(SEL.maxBuyUsd),
      uno(SEL.totalTokensSold), uno(SEL.hardCapTokens), uno(SEL.isLive), uno(SEL.isOver),
      uno(SEL.paused), uno(SEL.startTime), uno(SEL.claimOpen)
    ]).then(function (r) {
      if (!r[1]) { estado[cid] = { ok: false }; return estado[cid]; }
      var wp = palabras(r[0]);
      estado[cid] = {
        ok: true,
        precioNativo: decU(wp[0]),          /* 8 decimales */
        oraculoVivo: decB(wp[1]),
        precioUsd: decU(palabras(r[1])[0]), /* 8 decimales */
        minUsd: decU(palabras(r[2])[0]),
        maxUsd: decU(palabras(r[3])[0]),
        vendidos: decU(palabras(r[4])[0]),  /* 18 decimales */
        tope: decU(palabras(r[5])[0]),
        viva: decB(palabras(r[6])[0]),
        terminada: decB(palabras(r[7])[0]),
        pausada: decB(palabras(r[8])[0]),
        inicio: decU(palabras(r[9])[0]),
        reparto: decB(palabras(r[10])[0])
      };
      return estado[cid];
    }).catch(function () { estado[cid] = { ok: false }; return estado[cid]; });
  }

  function leerTodo() { return Promise.all([leerRed(1), leerRed(56)]); }

  /* Lo que lleva comprado esta cartera, por red. Son cuatro lecturas más por
     cadena, así que solo se piden con una cartera conectada. */
  var posicion = { 1: null, 56: null };

  /* Estado de la venta y posición del comprador se piden juntos: si se pintaran
     con lecturas de momentos distintos, el panel podría enseñar una compra que
     el resto de la vista todavía no cuenta. */
  function refrescar() { return Promise.all([leerTodo(), leerPosicion()]); }

  function leerPosicion() {
    var quien = sesion.cuenta;
    if (!quien) { posicion = { 1: null, 56: null }; return Promise.resolve(); }
    return Promise.all([1, 56].map(function (cid) {
      var c = CADENAS[cid];
      var uno = function (sel) {
        return llamar(cid, c.venta, sel + encA(quien)).catch(function () { return null; });
      };
      return Promise.all([uno(SEL.allocation), uno(SEL.spentUsd),
                          uno(SEL.remaining), uno(SEL.claimable)])
        .then(function (r) {
          if (!r[0]) { posicion[cid] = null; return; }
          posicion[cid] = {
            tokens: decU(palabras(r[0])[0]),        /* 18 decimales */
            gastado: decU(palabras(r[1])[0]),       /* 8 decimales  */
            queda: r[2] ? decU(palabras(r[2])[0]) : 0n,
            reclamable: r[3] ? decU(palabras(r[3])[0]) : 0n
          };
        });
    })).then(function () {
      /* Si la cuenta cambió mientras se leía, lo leído ya no es de nadie. */
      if (sesion.cuenta !== quien) posicion = { 1: null, 56: null };
    });
  }


  /* ─────────────────────────────── carteras ──────────────────────────────── */

  /* EIP-6963: las carteras se anuncian solas. Es lo que sustituyó al viejo
     window.ethereum, que con dos extensiones instaladas se pisaban entre ellas
     y acababas firmando con la que no era. */
  var carteras = [];
  var vistas = {};

  window.addEventListener('eip6963:announceProvider', function (e) {
    var d = e.detail;
    if (!d || !d.info || vistas[d.info.uuid]) return;
    vistas[d.info.uuid] = true;
    carteras.push({ nombre: d.info.name, icono: d.info.icon, prov: d.provider });
  });
  try { window.dispatchEvent(new Event('eip6963:requestProvider')); } catch (e) {}

  function listaCarteras() {
    var l = carteras.slice();
    /* Carteras viejas o navegadores dentro de app que aún no anuncian. */
    if (!l.length && window.ethereum) {
      l.push({ nombre: window.ethereum.isMetaMask ? 'MetaMask' : 'Browser wallet',
               icono: '', prov: window.ethereum });
    }
    return l;
  }

  var sesion = { prov: null, cuenta: null, cid: null, nombre: '' };

  function enchufar(prov, nombre) {
    return prov.request({ method: 'eth_requestAccounts' }).then(function (cs) {
      if (!cs || !cs.length) throw new Error('sin cuenta');
      return prov.request({ method: 'eth_chainId' }).then(function (h) {
        sesion = { prov: prov, cuenta: cs[0], cid: parseInt(h, 16), nombre: nombre || '' };
        if (prov.on) {
          prov.on('accountsChanged', function (a) {
            sesion.cuenta = (a && a[0]) || null;
            if (!sesion.cuenta) sesion.prov = null;
            posicion = { 1: null, 56: null };
            refrescar().then(function () { pintar(); });
          });
          prov.on('chainChanged', function (h2) {
            sesion.cid = parseInt(h2, 16);
            refrescar().then(function () { pintar(); });
          });
        }
        return sesion;
      });
    });
  }

  var scripts = {};
  function cargarScript(src, nombre) {
    if (scripts[src]) return scripts[src];
    scripts[src] = new Promise(function (ok, mal) {
      var s = document.createElement('script');
      var fallo = function () {
        mal(new Error((nombre || 'A script') + ' could not load. Check your connection.'));
      };
      var reloj = setTimeout(fallo, 20000);
      s.src = src; s.async = true;
      s.onload = function () { clearTimeout(reloj); ok(); };
      s.onerror = function () { clearTimeout(reloj); fallo(); };
      document.head.appendChild(s);
    });
    return scripts[src];
  }

  /* El modal es nuestro, así que del SDK solo se usa el transporte: se pide el
     proveedor sin su interfaz (showQrModal: false) y la URI de emparejamiento
     llega por el evento display_uri, que es lo que se convierte en QR o en
     enlace a la app. */
  var wcProv = null;
  function iniciarWC() {
    if (!PROYECTO_WC) return Promise.reject(new Error('WalletConnect is not configured.'));
    if (wcProv) return Promise.resolve(wcProv);
    return cargarScript(
        'https://cdn.jsdelivr.net/npm/@walletconnect/ethereum-provider@2.24.0/dist/index.umd.js',
        'WalletConnect')
      .then(function () {
        return window.EthereumProvider.init({
          projectId: PROYECTO_WC,
          chains: [1],
          optionalChains: [56],
          showQrModal: false,
          /* Sin rpcMap, las lecturas viajan por el relay hasta el móvil y
             vuelven: lentas y a merced de que la app esté despierta. Con él,
             eth_call sale por estos nodos y solo se molesta a la cartera para
             firmar, que es lo único que solo ella puede hacer. */
          rpcMap: { 1: CADENAS[1].rpc[0], 56: CADENAS[56].rpc[0] },
          metadata: {
            name: 'Nereum',
            description: 'Nereum Seed Round',
            url: location.origin,
            icons: [location.origin + '/icon-192.png']
          }
        });
      })
      .then(function (prov) { wcProv = prov; return prov; });
  }

  function cambiarRed(cid) {
    var c = CADENAS[cid];
    return sesion.prov.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: c.hex }]
    }).catch(function (e) {
      /* 4902 = la cartera no conoce la red. Pasa siempre con BNB Chain en
         MetaMask recién instalado. */
      if (e && (e.code === 4902 || (e.data && e.data.originalError &&
          e.data.originalError.code === 4902))) {
        return sesion.prov.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: c.hex, chainName: c.nombre,
            nativeCurrency: { name: c.moneda, symbol: c.simbolo, decimals: 18 },
            rpcUrls: [c.rpc[0]], blockExplorerUrls: [c.explorador]
          }]
        });
      }
      throw e;
    }).then(function () { sesion.cid = cid; });
  }

  function enviar(tx) {
    tx.from = sesion.cuenta;
    return sesion.prov.request({ method: 'eth_sendTransaction', params: [tx] });
  }

  /* Espera a que la transacción entre en un bloque. Se pregunta por el RPC
     público y no por la cartera: algunas in-app devuelven null para siempre. */
  function esperar(cid, hash) {
    return new Promise(function (ok, mal) {
      var t0 = Date.now();
      (function mirar() {
        var pide = (sesion.prov && sesion.cid === cid)
          ? sesion.prov.request({ method: 'eth_getTransactionReceipt', params: [hash] })
              .catch(function () { return rpc(cid, 'eth_getTransactionReceipt', [hash]); })
          : rpc(cid, 'eth_getTransactionReceipt', [hash]);
        pide.then(function (r) {
          if (r) return ok(r);
          if (Date.now() - t0 > 300000) return mal(new Error('sin confirmar'));
          setTimeout(mirar, 3000);
        }).catch(function () { setTimeout(mirar, 4000); });
      })();
    });
  }

  function motivo(e) {
    var d = '';
    try {
      d = (e && (
            (e.data && e.data.originalError && e.data.originalError.data) ||
            (e.data && e.data.data) || e.data ||
            (e.error && e.error.data) || e.info && e.info.error && e.info.error.data
          ) || '') + '';
      if (!/^0x[0-9a-fA-F]{8}/.test(d)) d = '';
    } catch (x) {}
    if (d) {
      var sel = d.slice(0, 10).toLowerCase();
      if (ERRORES[sel]) return ERRORES[sel];
      if (sel === '0x08c379a0') {           /* Error(string) */
        try {
          var w = palabras(d.slice(10));
          var largo = Number(decU(w[1]));
          var bytes = w.slice(2).join('').slice(0, largo * 2);
          return decodeURIComponent(bytes.replace(/../g, '%$&'));
        } catch (x) {}
      }
    }
    if (e && (e.code === 4001 || /user rejected|denied/i.test(e.message || ''))) {
      return 'Signature cancelled.';
    }
    return (e && e.message) ? e.message.slice(0, 140) : 'Transaction failed.';
  }

  /* ───────────────────── quedarse donde uno estaba ───────────────────────── */

  /* Al recargar, el navegador guarda una posición en píxeles y la repone. Pero
     esta página cambia de alto mientras carga —fuentes, imágenes, lienzos que
     se dimensionan— así que esos píxeles ya no caen donde caían y el visitante
     aparece en otra sección. Se guarda la sección y el desplazamiento dentro
     de ella, que sí sobreviven al cambio de alto.

     En sessionStorage a propósito: solo vale para recargar esta pestaña. Quien
     llegue de nuevo desde un enlace tiene que empezar arriba. */
  (function () {
    var CLAVE = 'nrm:vista';
    var almacen = null;
    try { almacen = window.sessionStorage; } catch (e) { return; }
    if (!almacen) return;
    try { if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; } catch (e) {}

    function cima(n) { var y = 0; while (n) { y += n.offsetTop; n = n.offsetParent; } return y; }
    function partes() { return [].slice.call(document.querySelectorAll('main > section[id]')); }

    function guardar() {
      var y = window.scrollY || window.pageYOffset || 0;
      if (y < 40) { try { almacen.removeItem(CLAVE); } catch (e) {} return; }
      var cual = null, suya = -1;
      partes().forEach(function (sec) {
        var t = cima(sec);
        if (t <= y + 4 && t > suya) { suya = t; cual = sec; }
      });
      if (!cual) return;
      try {
        almacen.setItem(CLAVE, JSON.stringify({ id: cual.id, d: Math.round(y - suya) }));
      } catch (e) {}
    }

    var espera = 0;
    addEventListener('scroll', function () {
      if (espera) return;
      espera = setTimeout(function () { espera = 0; guardar(); }, 250);
    }, { passive: true });
    addEventListener('pagehide', guardar);
    addEventListener('beforeunload', guardar);

    var donde = null;
    try { donde = JSON.parse(almacen.getItem(CLAVE) || 'null'); } catch (e) {}
    if (!donde || !donde.id) return;

    /* Si el visitante toca algo antes de que termine de asentarse, manda él:
       nada peor que la página tirando de ti mientras intentas leer. */
    var suyo = false;
    var mio = function () { suyo = true; };
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach(function (ev) {
      addEventListener(ev, mio, { once: true, passive: true });
    });

    function ir() {
      if (suyo) return;
      var sec = document.getElementById(donde.id);
      if (!sec) return;
      var y = Math.max(0, cima(sec) + (donde.d || 0));
      if (Math.abs((window.scrollY || 0) - y) > 2) window.scrollTo(0, y);
    }

    function asentar() {
      ir();
      /* El alto sigue moviéndose un rato después de load. Se reponen unas
         cuantas veces y se deja de insistir. */
      var n = 0;
      var reloj = setInterval(function () {
        ir();
        if (++n > 8 || suyo) clearInterval(reloj);
      }, 120);
    }

    if (document.readyState === 'complete') asentar();
    else addEventListener('load', asentar);
  })();

  /* ─────────────────────────────── el widget ─────────────────────────────── */

  var pay = document.getElementById('wPay');
  if (!pay) return;

  /* La maqueta que viene en el HTML ya dejó puestas sus propias escuchas sobre
     estos controles. Clonar un nodo copia todo menos las escuchas, así que
     reemplazarlo por su clon las borra de una vez. Es la forma de tomar el
     mando sin tener que editar el index.html: cuando llegue el próximo diseño,
     lo único que hay que reinsertar es la etiqueta <script> de este archivo. */
  function relevar(el) {
    if (!el) return el;
    var c = el.cloneNode(true);
    el.parentNode.replaceChild(c, el);
    return c;
  }
  ['wPay', 'wUsd', 'wRange', 'wChips', 'wCta'].forEach(function (id) {
    relevar(document.getElementById(id));
  });
  /* La maqueta también anima la barra de recaudación hasta una cifra fija.
     Se le quitan las escuchas igual, porque ahora esa cifra tiene que subir
     con las compras. */
  relevar(document.querySelector('#presale .raise'));
  pay = document.getElementById('wPay');

  var usdIn  = document.getElementById('wUsd'),
      nrmOut = document.getElementById('wNrm'),
      eq     = document.getElementById('wEq'),
      tasa   = document.getElementById('wRate'),
      val    = document.getElementById('wVal'),
      gain   = document.getElementById('wGain'),
      range  = document.getElementById('wRange'),
      chips  = document.getElementById('wChips'),
      nota   = document.getElementById('wNote'),
      cta    = document.getElementById('wCta'),
      campo  = usdIn.closest('.w-field');

  /* Cada botón de pago es una red y un medio. */
  var BOTONES = [
    { cid: 1,  usdt: false }, { cid: 56, usdt: false },
    { cid: 1,  usdt: true  }, { cid: 56, usdt: true  }
  ];
  var botones = [].slice.call(pay.querySelectorAll('button'));
  var elegido = 0;
  botones.forEach(function (b, i) {
    b.addEventListener('click', function () {
      botones.forEach(function (x) { x.classList.remove('on'); });
      b.classList.add('on');
      var antes = pago === 0n ? null : usdDe(pago);
      elegido = i;
      pago = 0n;
      if (antes !== null) {
        var u = unidDeUsd(Number(antes) / 1e8);
        if (u !== null) pago = u;
      }
      pintar(false);
    });
  });

  function medio() { return BOTONES[elegido] || BOTONES[0]; }
  function red()   { return CADENAS[medio().cid]; }
  function est()   { return estado[medio().cid] || { ok: false }; }

  /* Límites: los del contrato si se pudieron leer, y si no los de la página,
     que es mejor que dejar el campo sin validar. */
  function minUsd() { var e = est(); return e.ok && e.minUsd ? Number(e.minUsd) / 1e8 : 0.2; }
  function maxUsd() { var e = est(); return e.ok && e.maxUsd ? Number(e.maxUsd) / 1e8 : 10000; }
  function precio() { var e = est(); return e.ok && e.precioUsd ? Number(e.precioUsd) / 1e8 : 0.20; }

  var dinero = function (v, d) {
    return '$' + v.toLocaleString('en-US',
      { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  };
  var num   = function (v) { return v.toLocaleString('en-US', { maximumFractionDigits: 0 }); };
  var limpio = function (v) { return parseFloat(String(v).replace(/[^0-9.]/g, '')) || 0; };

  function aBarra(u) { return Math.log10(Math.max(minUsd(), u)); }
  function deBarra(t) { return Math.pow(10, t); }

  /* ─────────────────── el importe va en la moneda de pago ─────────────────── */

  /* Se paga en BNB, se escribe en BNB. Antes el campo pedía dólares y la web
     los convertía: el número que el comprador tecleaba no era el que firmaba,
     y al aparecer otro distinto en la cartera lo normal es desconfiar. Ahora
     lo que se escribe es exactamente el `value` de la transacción, y los
     dólares se muestran debajo, que es el sentido correcto de la conversión
     porque el precio del oráculo se mueve y el importe firmado no. */

  var unidad = document.querySelector('#presale .w-field em');

  function decimales() { return medio().usdt ? red().usdtDec : 18; }
  function cifras()    { return medio().usdt ? 2 : 6; }
  function simbolo()   { return medio().usdt ? 'USDT' : red().simbolo; }

  /* Texto decimal → enteros, sin pasar por coma flotante: 0,1 + 0,2 no da 0,3
     y aquí cada unidad es dinero. */
  function aUnidades(txt, dec) {
    var t = String(txt).replace(/[^0-9.]/g, '').split('.');
    var ent = t[0] || '0';
    var fr = (t[1] || '').slice(0, dec);
    while (fr.length < dec) fr += '0';
    try { return BigInt(ent) * 10n ** BigInt(dec) + BigInt(fr || '0'); }
    catch (e) { return 0n; }
  }

  /* Lo que el contrato va a contar como dólares por ese pago. Se calcula igual
     que lo hace él: mismas divisiones, mismos truncamientos. */
  function usdDe(unid) {
    var m = medio(), e = est();
    if (m.usdt) return unid * 100000000n / (10n ** BigInt(red().usdtDec));
    if (!e.ok || !e.precioNativo) return null;
    return unid * e.precioNativo / 1000000000000000000n;
  }

  /* Y al revés, para los atajos de la barra y los botones de importe. Redondea
     hacia arriba: el contrato trunca, y un céntimo de menos dejaría la compra
     del mínimo justo por debajo del mínimo. */
  function unidDeUsd(usdCent) {
    var m = medio(), e = est();
    var u8 = BigInt(Math.round(usdCent * 1e8));
    if (m.usdt) {
      var u = 10n ** BigInt(red().usdtDec);
      return (u8 * u + 99999999n) / 100000000n;
    }
    if (!e.ok || !e.precioNativo) return null;
    return (u8 * 1000000000000000000n + e.precioNativo - 1n) / e.precioNativo;
  }

  function tokensPor(usd8) {
    var e = est();
    var p = e.ok && e.precioUsd ? e.precioUsd : 20000000n;
    return usd8 * 1000000000000000000n / p;
  }

  /* Todo en enteros. Pasar por coma flotante para enseñar "0,199525 ETH"
     cuando se envían 0,199524… es pequeño, pero es la cifra que el comprador
     compara con lo que le pide la cartera, y si no cuadra desconfía. */
  function humano(wei, dec, cif) {
    var u = 10n ** BigInt(dec);
    var ent = (wei / u).toString();
    var frac = (wei % u).toString().padStart(dec, '0').slice(0, cif || 6).replace(/0+$/, '');
    return frac ? ent + '.' + frac : ent;
  }

  /* Lo que se paga, en unidades de la moneda elegida. Es el único origen de
     verdad: el resto de la vista se deriva de aquí. Arranca vacío: un importe
     puesto de antemano es una cifra que alguien puede firmar sin haberla
     elegido. */
  var pago = 0n;



  var caja = cta.closest('.widget');
  var rotulo = caja ? caja.querySelector('.w-top span') : null;
  var rotuloOrig = rotulo ? rotulo.textContent : '';

  /* La ronda no puede reabrirse —isOver() es finalized o pasada la fecha, y
     ninguna de las dos vuelve atrás— así que esto es un cambio de una sola
     dirección, pero se guarda el texto original igualmente por si el diseño
     que llegue mañana trae otro. */
  function modoCerrada(cerrada, reparto) {
    if (caja) caja.classList.toggle('nrm-fin', !!cerrada);
    if (rotulo) rotulo.textContent = cerrada ? 'Seed Round closed' : rotuloOrig;
    if (!cerrada) return;
    nota.classList.remove('bad');
    nota.textContent = reparto
      ? 'Claims are open. Your NRM goes straight to this wallet.'
      : 'The round is closed. Claims open once the tokens are deposited.';
  }

  function pintar(desdeInput) {
    var ec = est();
    if (ec.ok && ec.terminada) {
      modoCerrada(true, ec.reparto);
      pintarCta();
      pintarPanel();
      pintarBarra();
      return;
    }
    modoCerrada(false);

    var m = medio(), c = red(), e = est();
    var dec = decimales(), cif = cifras(), sim = simbolo();
    if (unidad) unidad.textContent = sim;

    var mn0 = minUsd();
    if (pago === 0n) {
      if (!desdeInput) usdIn.value = '';
      usdIn.placeholder = '0.00';
      nrmOut.value = '';
      val.textContent = dinero(0);
      gain.textContent = '+' + dinero(0);
      range.value = String(Math.log10(mn0));
      campo.classList.remove('bad');
      nota.classList.remove('bad');
      nota.textContent = 'Min ' + dinero(mn0, mn0 < 1 ? 2 : 0) + ' · max ' +
        dinero(maxUsd()) + ' per wallet · live oracle price';
      eq.textContent = e.ok ? '' : 'Reading the price on ' + c.nombre + '…';
      pintarCta();
      pintarPanel();
      pintarBarra();
      return;
    }

    var usd = usdDe(pago);
    if (usd === null) {
      eq.textContent = 'Price unavailable on ' + c.nombre;
      pintarCta();
      pintarPanel();
      pintarBarra();
      return;
    }

    var mn = minUsd(), mx = maxUsd(), pr = precio();
    var d = Number(usd) / 1e8;
    var malo = d < mn || d > mx;

    if (!desdeInput) usdIn.value = humano(pago, dec, cif);

    campo.classList.toggle('bad', malo);
    nota.classList.toggle('bad', malo);

    if (malo && d < mn) {
      var minU = unidDeUsd(mn);
      nota.textContent = 'Minimum purchase is ' + dinero(mn, mn < 1 ? 2 : 0) +
        (minU === null ? '' : ' — about ' + humano(minU, dec, cif) + ' ' + sim);
    } else if (malo) {
      var maxU = unidDeUsd(mx);
      nota.textContent = 'Maximum is ' + dinero(mx) + ' per wallet' +
        (maxU === null ? '' : ' — about ' + humano(maxU, dec, cif) + ' ' + sim);
    } else {
      nota.textContent = 'Min ' + dinero(mn, mn < 1 ? 2 : 0) + ' · max ' +
        dinero(mx) + ' per wallet · live oracle price';
    }

    eq.textContent = '≈ ' + dinero(d, d < 100 ? 2 : 0) + ' on ' + c.nombre +
      (m.usdt || e.oraculoVivo ? '' : ' · cached price');

    var tk = tokensPor(usd);
    nrmOut.value = nrm(tk);
    tasa.textContent = '1 NRM = ' + dinero(pr, 2);
    val.textContent  = dinero(d / pr * LISTADO);
    gain.textContent = '+' + dinero(d / pr * LISTADO - d);
    range.value = aBarra(Math.min(mx, Math.max(mn, d))).toFixed(3);

    pintarCta();
    pintarPanel();
    pintarBarra();
  }

  /* Al cambiar de moneda se conserva el valor en dólares, no el número: pasar
     de 0,5 ETH a 0,5 BNB sería multiplicar por tres lo que se paga sin que
     nadie haya tocado el importe. */
  function ponerUsd(d) {
    var u = unidDeUsd(d);
    if (u !== null) pago = u;
    pintar(false);
  }

  /* ──────────────────────── barra de recaudación ─────────────────────────── */

  /* Lo levantado antes de que existiera el contrato. No vive en ninguna cadena
     —es la ronda privada, cerrada fuera de aquí— así que va escrito, y encima
     se suma lo que entra por Ethereum y BNB Chain. */
  var PRIVADA_USD = 13616000;

  var barra = document.getElementById('saleFill'),
      globo = document.getElementById('saleTip'),
      cifra = document.getElementById('saleRaised'),
      cifraPie = cifra ? cifra.nextElementSibling : null;
  var pintado = 0, animada = false, vuelta = 0;

  function enCadenaUsd() {
    var t = 0;
    [1, 56].forEach(function (k) {
      var e = estado[k];
      if (e && e.ok && e.precioUsd) {
        t += Number(e.vendidos * e.precioUsd / 1000000000000000000n) / 1e8;
      }
    });
    return t;
  }

  function objetivoUsd() {
    var t = 0, hay = false;
    [1, 56].forEach(function (k) {
      var e = estado[k];
      if (e && e.ok && e.tope && e.precioUsd) {
        hay = true;
        t += Number(e.tope * e.precioUsd / 1000000000000000000n) / 1e8;
      }
    });
    return hay ? PRIVADA_USD + t : OBJETIVO_USD;
  }

  function pintarBarra() {
    if (!barra) return;
    var total = PRIVADA_USD + enCadenaUsd();
    var meta = objetivoUsd();
    var pct = meta > 0 ? Math.min(100, total / meta * 100) : 0;

    if (cifraPie) cifraPie.textContent = 'raised of ' + dinero(meta);
    if (globo) {
      globo.querySelector('em').textContent = pct.toFixed(1) + '%';
      globo.style.left = pct + '%';
      globo.classList.add('on');
    }
    barra.style.width = pct + '%';

    /* La primera vez sube contando, como en el diseño. Después, cuando una
       compra cambia la cifra, se escribe sin más: un contador saltando cada
       treinta segundos sería ruido. */
    var hayCadena = (estado[1] && estado[1].ok) || (estado[56] && estado[56].ok);
    if (!animada) {
      /* Sin datos de la cadena todavía no se sabe el total: animar ahora
         significaría contar hasta una cifra que enseguida cambia, y el último
         fotograma de esa cuenta pisaría la buena. */
      if (!hayCadena) { cifra.textContent = dinero(Math.round(total)); return; }
      animada = true;
      pintado = total;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        cifra.textContent = dinero(Math.round(total));
        return;
      }
      var mio = ++vuelta, t0 = performance.now(), hasta = total;
      (function paso(t) {
        if (mio !== vuelta) return;      /* llegó una cifra más nueva */
        var q = Math.min(1, (t - t0) / 1800), e = 1 - Math.pow(1 - q, 4);
        cifra.textContent = dinero(Math.round(hasta * e));
        if (q < 1) requestAnimationFrame(paso);
      })(t0);
      return;
    }
    if (Math.round(total) !== Math.round(pintado)) {
      pintado = total;
      vuelta++;                          /* corta cualquier cuenta en curso */
      cifra.textContent = dinero(Math.round(total));
    }
  }

  /* ─────────────────────── lo que lleva el comprador ─────────────────────── */

  /* Durante la ronda la cartera no tiene ni un NRM: el contrato solo anota la
     asignación, y los tokens se transfieren al reclamar. Por eso lo que se
     enseña aquí es `allocation`, no el saldo del token, que sería 0 y haría
     pensar a la gente que su compra no entró. */

  var panel = null;

  function nrm(bi) {
    var ent = bi / 1000000000000000000n;
    var dec = Number((bi % 1000000000000000000n) / 10000000000000000n) / 100;
    var v = Number(ent) + dec;
    return v.toLocaleString('en-US', { maximumFractionDigits: v < 1 ? 4 : (v < 1000 ? 2 : 0) });
  }
  /* Céntimos solo cuando la cifra es pequeña: "$2,500.00" es ruido, pero
     "$1" en lugar de "$0.60" sería mentira. */
  var usd8 = function (bi, d) {
    var v = Number(bi) / 1e8;
    return dinero(v, d === undefined ? (v < 100 ? 2 : 0) : d);
  };

  function estilosPanel() {
    if (document.getElementById('nrmPos')) return;
    var e = document.createElement('style');
    e.id = 'nrmPos';
    e.textContent = [
      '.nrm-pos{margin-top:14px;padding:14px 15px 13px;border:1px solid rgba(10,12,16,.12);',
      'border-radius:14px;font-size:13px;line-height:1.45}',
      /* Con la ronda cerrada la calculadora ya no calcula nada que se pueda
         comprar: se retira entera y el recuadro queda para el reparto. */
      '.widget.nrm-fin .w-lab,.widget.nrm-fin .w-pay,.widget.nrm-fin .w-field,',
      '.widget.nrm-fin .w-eq,.widget.nrm-fin .w-range,.widget.nrm-fin .w-chips,',
      '.widget.nrm-fin .w-swap,.widget.nrm-fin .w-out{display:none!important}',
      '.widget.nrm-fin .w-cta{margin-top:2px}',
      '.nrm-pos .pos-cab{display:flex;align-items:center;justify-content:space-between;',
      'gap:10px;margin-bottom:10px;font-size:11px;opacity:.5}',
      /* La dirección va en monoespaciada y tal cual: en mayúsculas el 0x se lee
         como 0X y parece otra cosa. */
      ".nrm-pos .pos-cab .pos-dir{font-family:var(--m,ui-monospace,monospace);letter-spacing:0}",
      '.nrm-pos .pos-salir{border:0;background:none;color:inherit;font:inherit;font-size:10.5px;',
      'letter-spacing:.08em;text-transform:uppercase;cursor:pointer;opacity:.75;padding:0}',
      '.nrm-pos .pos-salir:hover{opacity:1;text-decoration:underline}',
      '.nrm-pos .pos-gran{display:flex;align-items:baseline;justify-content:space-between;gap:12px}',
      '.nrm-pos .pos-gran b{font-size:22px;font-weight:600;letter-spacing:-.02em}',
      '.nrm-pos .pos-gran b em{font-style:normal;font-size:12px;font-weight:500;opacity:.5;margin-left:5px}',
      '.nrm-pos .pos-gran span{opacity:.62}',
      '.nrm-pos ul{list-style:none;margin:11px 0 0;padding:10px 0 0;',
      'border-top:1px solid rgba(10,12,16,.09)}',
      '.nrm-pos li{display:flex;justify-content:space-between;gap:12px;padding:2px 0;opacity:.72}',
      '.nrm-pos .pos-pie{margin:9px 0 0;font-size:12px;opacity:.55}',
      '.nrm-pos .pos-rec{margin-top:10px;padding-top:10px;border-top:1px solid rgba(10,12,16,.09);',
      'display:flex;justify-content:space-between;gap:12px;color:var(--blue,#2F6BFF);font-weight:500}',
      '@media(prefers-color-scheme:dark){.nrm-pos{border-color:rgba(255,255,255,.14)}',
      '.nrm-pos ul,.nrm-pos .pos-rec{border-color:rgba(255,255,255,.10)}}'
    ].join('');
    document.head.appendChild(e);
  }

  function fila(k, v) {
    var li = document.createElement('li');
    var a = document.createElement('span'); a.textContent = k;
    var b = document.createElement('span'); b.textContent = v;
    li.appendChild(a); li.appendChild(b);
    return li;
  }

  function pintarPanel() {
    var p1 = posicion[1], p56 = posicion[56];
    var hay = sesion.cuenta && (p1 || p56);
    if (!hay) { if (panel) panel.hidden = true; return; }

    var tokens = (p1 ? p1.tokens : 0n) + (p56 ? p56.tokens : 0n);
    var gasto  = (p1 ? p1.gastado : 0n) + (p56 ? p56.gastado : 0n);
    var recl   = (p1 ? p1.reclamable : 0n) + (p56 ? p56.reclamable : 0n);

    estilosPanel();
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'nrm-pos';
      nota.parentNode.insertBefore(panel, nota.nextSibling);
    }
    panel.hidden = false;
    panel.textContent = '';

    var cab = document.createElement('div');
    cab.className = 'pos-cab';
    var quien = document.createElement('span');
    quien.className = 'pos-dir';
    quien.textContent = sesion.cuenta.slice(0, 6) + '…' + sesion.cuenta.slice(-4);
    var salir = document.createElement('button');
    salir.type = 'button'; salir.className = 'pos-salir'; salir.textContent = 'Disconnect';
    salir.addEventListener('click', desconectar);
    cab.appendChild(quien); cab.appendChild(salir);
    panel.appendChild(cab);

    if (tokens === 0n) {
      var v = document.createElement('div');
      v.className = 'pos-pie';
      v.style.margin = '0';
      v.textContent = 'No purchase from this wallet yet.';
      panel.appendChild(v);
      panel.appendChild(topeRestante());
      return;
    }

    var gran = document.createElement('div');
    gran.className = 'pos-gran';
    var b = document.createElement('b');
    b.textContent = nrm(tokens);
    var em = document.createElement('em'); em.textContent = 'NRM';
    b.appendChild(em);
    var g = document.createElement('span');
    g.textContent = usd8(gasto) + ' invested';
    gran.appendChild(b); gran.appendChild(g);
    panel.appendChild(gran);

    /* El desglose solo aporta si compró en las dos: si no, repite la cifra
       de arriba con otras palabras. */
    if (p1 && p56 && p1.tokens > 0n && p56.tokens > 0n) {
      var ul = document.createElement('ul');
      ul.appendChild(fila('Ethereum',  nrm(p1.tokens)  + ' NRM · ' + usd8(p1.gastado)));
      ul.appendChild(fila('BNB Chain', nrm(p56.tokens) + ' NRM · ' + usd8(p56.gastado)));
      panel.appendChild(ul);
    }

    if (recl > 0n) {
      var r = document.createElement('div');
      r.className = 'pos-rec';
      var ra = document.createElement('span'); ra.textContent = 'Ready to claim';
      var rb = document.createElement('span'); rb.textContent = nrm(recl) + ' NRM';
      r.appendChild(ra); r.appendChild(rb);
      panel.appendChild(r);
    } else {
      panel.appendChild(topeRestante());
    }
  }

  /* El tope de $10.000 lo lleva cada contrato por su cuenta, así que es por red
     y no una bolsa común: decir "te quedan X" sin nombrar la red sería mentira
     para quien compre en las dos. */
  function topeRestante() {
    var c = red(), p = posicion[c.id];
    var d = document.createElement('p');
    d.className = 'pos-pie';
    if (!p) { d.textContent = ''; return d; }
    var tope = maxUsd();
    if (!tope || p.queda > 100000000000000n) {
      d.textContent = 'No cap on this wallet.';
    } else if (p.queda === 0n) {
      d.textContent = 'Cap reached on ' + c.nombre + '.';
    } else {
      d.textContent = usd8(p.queda, 0) + ' of your ' + dinero(tope) + ' left on ' + c.nombre + '.';
    }
    return d;
  }

  function desconectar() {
    try { if (sesion.prov && sesion.prov.disconnect) sesion.prov.disconnect(); } catch (e) {}
    sesion = { prov: null, cuenta: null, cid: null, nombre: '' };
    posicion = { 1: null, 56: null };
    wcUri = null; wcPedida = false; wcProv = null;
    pintar();
  }

  /* ─────────────────────────── el botón principal ─────────────────────────── */

  var ocupado = false;

  function pintarCta() {
    if (ocupado) return;
    var e = est(), c = red();
    cta.disabled = false;
    cta.classList.remove('espera');

    if (!e.ok) {
      /* Sin datos de la cadena no se sabe ni el precio ni si la ronda está
         abierta, así que no se deja comprar. Pero si aún no hay cartera, el
         botón sigue sirviendo: al conectar se leerá a través de ella. */
      if (!sesion.cuenta) { cta.textContent = 'Connect wallet'; return; }
      cta.textContent = c.nombre + ' unavailable'; cta.disabled = true; return;
    }
    if (e.terminada) {
      if (e.reparto) { cta.textContent = 'Claim your NRM'; return; }
      cta.textContent = 'Round closed'; cta.disabled = true; return;
    }
    if (e.pausada)   { cta.textContent = 'Round paused';     cta.disabled = true; return; }
    if (!e.viva)     { cta.textContent = 'Round not open yet'; cta.disabled = true; return; }
    if (!sesion.cuenta) { cta.textContent = 'Connect wallet'; return; }
    if (sesion.cid !== c.id) { cta.textContent = 'Switch to ' + c.nombre; return; }
    if (pago === 0n) { cta.textContent = 'Enter an amount'; cta.disabled = true; return; }
    var u = usdDe(pago);
    cta.textContent = u === null ? 'Connect wallet'
      : 'Buy ' + nrm(tokensPor(u)) + ' NRM';
  }

  function trabajando(txt) {
    ocupado = true; cta.disabled = true;
    cta.classList.add('espera'); cta.textContent = txt;
  }
  function libre() { ocupado = false; cta.classList.remove('espera'); pintarCta(); }
  function aviso(txt, malo) {
    nota.textContent = txt;
    nota.classList.toggle('bad', !!malo);
  }

  cta.addEventListener('click', function () {
    if (ocupado) return;
    var e = est(), c = red();

    if (e.ok && e.terminada && e.reparto) return reclamar();
    if (!sesion.cuenta) return abrirCarteras();
    if (sesion.cid !== c.id) {
      trabajando('Confirm in your wallet…');
      return cambiarRed(c.id).then(function () { return refrescar(); })
        .then(function () { libre(); pintar(); })
        .catch(function (err) { libre(); aviso(motivo(err), true); });
    }
    comprar();
  });

  function comprar() {
    var c = red(), m = medio();
    if (pago === 0n) { aviso('Enter an amount first.', true); return; }

    /* Se envía exactamente lo que hay en el campo. El contrato sacará de ahí
       los dólares con la misma cuenta que hace la vista, así que lo que firma
       el comprador y lo que le cuenta el contrato son el mismo número. */
    var usd8 = usdDe(pago);
    if (usd8 === null) { aviso('No price available right now.', true); return; }

    var d = Number(usd8) / 1e8;
    if (d < minUsd()) { aviso('Minimum purchase is ' + dinero(minUsd(), 2), true); return; }
    if (d > maxUsd()) { aviso('Maximum is ' + dinero(maxUsd()) + ' per wallet', true); return; }

    var esperados = tokensPor(usd8);
    var minimo = esperados * BigInt(10000 - HOLGURA_BPS) / 10000n;

    /* El tope es por cartera y para toda la ronda, sumando ETH y USDT. Se
       comprueba antes de firmar para no hacerle gastar gas en un revert. */
    trabajando('Checking…');
    llamar(c.id, c.venta, SEL.remaining + encA(sesion.cuenta)).then(function (r) {
      var queda = decU(palabras(r)[0]);
      if (queda < usd8) {
        libre();
        aviso(queda === 0n
          ? 'This wallet has already bought its $' + num(maxUsd()) + '.'
          : 'Only ' + dinero(Number(queda) / 1e8, 2) + ' left for this wallet.', true);
        return null;
      }
      return m.usdt ? comprarUsdt(pago, usd8, minimo) : comprarNativo(pago, minimo);
    }).catch(function (err) { libre(); aviso(motivo(err), true); });
  }

  function comprarNativo(wei, minimo) {
    var c = red();
    trabajando('Confirm in your wallet…');
    return enviar({
      to: c.venta,
      value: '0x' + wei.toString(16),
      data: SEL.buyWithNative + encU(minimo)
    }).then(function (h) { return confirmar(h); });
  }

  function comprarUsdt(cantidad, usd8, minimo) {
    var c = red();
    trabajando('Checking allowance…');
    return llamar(c.id, c.usdt, SEL.allowance + encA(sesion.cuenta) + encA(c.venta))
      .then(function (r) {
        var permitido = decU(palabras(r)[0]);
        if (permitido >= cantidad) return null;

        /* El USDT de Ethereum no deja cambiar un permiso distinto de cero: hay
           que ponerlo a cero primero. Es una peculiaridad suya, no del estándar,
           y se traga la compra si no se contempla. */
        var pasos = Promise.resolve();
        if (permitido > 0n && c.usdtDec === 6) {
          trabajando('Resetting allowance…');
          pasos = enviar({ to: c.usdt, data: SEL.approve + encA(c.venta) + encU(0) })
            .then(function (h) { return esperar(c.id, h); });
        }
        /* Se aprueba el hueco que le queda a la cartera en toda la ronda, no
           solo esta compra: así la segunda ya no pide otra firma. */
        return pasos.then(function () {
          trabajando('Approve USDT in your wallet…');
          return llamar(c.id, c.venta, SEL.remaining + encA(sesion.cuenta));
        }).then(function (r2) {
          var queda = decU(palabras(r2)[0]);
          var tope = queda > 0n && queda < 10n ** 30n ? queda : usd8;
          var techo = unidDeUsd(Number(tope) / 1e8);
          if (techo === null) techo = cantidad;
          if (techo < cantidad) techo = cantidad;
          return enviar({ to: c.usdt, data: SEL.approve + encA(c.venta) + encU(techo) });
        }).then(function (h) {
          trabajando('Waiting for the approval…');
          return esperar(c.id, h);
        });
      })
      .then(function () {
        trabajando('Confirm the purchase…');
        return enviar({
          to: c.venta,
          data: SEL.buyWithUsdt + encU(cantidad) + encU(minimo)
        });
      })
      .then(function (h) { return confirmar(h); });
  }

  function reclamar() {
    var c = red();
    if (!sesion.cuenta) return abrirCarteras();
    if (sesion.cid !== c.id) {
      trabajando('Confirm in your wallet…');
      return cambiarRed(c.id).then(function () { libre(); }).catch(function (e) {
        libre(); aviso(motivo(e), true);
      });
    }
    trabajando('Confirm in your wallet…');
    enviar({ to: c.venta, data: SEL.claim })
      .then(function (h) { return confirmar(h, 'NRM sent to your wallet.'); })
      .catch(function (e) { libre(); aviso(motivo(e), true); });
  }

  function confirmar(hash, texto) {
    var c = red();
    trabajando('Confirming on ' + c.nombre + '…');
    return esperar(c.id, hash).then(function (r) {
      libre();
      if (r && r.status && BigInt(r.status) === 0n) {
        aviso('The transaction reverted. Nothing was charged beyond gas.', true);
        return;
      }
      aviso(texto || 'Done. Your NRM allocation is recorded on ' + c.nombre + '.');
      refrescar().then(function () { pintar(); });
    }).catch(function () {
      libre();
      aviso('Sent. It is taking longer than usual to confirm — check your wallet.');
    });
  }

  /* ──────────────────────── carteras: lista y conexión ───────────────────── */

  var MOVIL = /Android|iPhone|iPad|iPod|Mobile|Silk/i.test(navigator.userAgent || '');

  /* Los logos y los enlaces a cada app salen del registro de WalletConnect. Si
     no se puede alcanzar —red del visitante, API caída— la lista sigue saliendo
     con estos nombres y un monograma, y el enlace pasa a ser el `wc:` pelado,
     que el propio sistema operativo enruta a la cartera que haya instalada. */
  var RESPALDO = ['MetaMask', 'Trust Wallet', 'Coinbase Wallet', 'Rainbow', 'Zerion',
    'Uniswap Wallet', 'OKX Wallet', 'Bitget Wallet', 'Binance Web3 Wallet', 'SafePal',
    'TokenPocket', 'imToken', 'Ledger Live', 'Rabby Wallet', 'Argent', '1inch Wallet',
    'Crypto.com Onchain', 'Phantom', 'Exodus', 'Blockchain.com'];

  var registro = null, pidiendo = null;

  function traerRegistro() {
    if (registro) return Promise.resolve(registro);
    if (pidiendo) return pidiendo;
    var raso = function () {
      registro = RESPALDO.map(function (n) { return { nombre: n }; });
      return registro;
    };
    if (!PROYECTO_WC) return Promise.resolve(raso());
    var corte = new AbortController();
    setTimeout(function () { corte.abort(); }, 8000);
    pidiendo = fetch('https://explorer-api.walletconnect.com/v3/wallets?projectId=' +
        PROYECTO_WC + '&entries=100&page=1', { signal: corte.signal })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var l = j && j.listings, out = [];
        for (var k in l) if (Object.prototype.hasOwnProperty.call(l, k)) {
          var x = l[k];
          if (!x || !x.name) continue;
          out.push({
            nombre: x.name,
            logo: x.image_id ? 'https://explorer-api.walletconnect.com/v3/logo/md/' +
                  x.image_id + '?projectId=' + PROYECTO_WC : '',
            movil: x.mobile || {}, escritorio: x.desktop || {}
          });
        }
        if (!out.length) return raso();
        registro = out;
        return out;
      })
      .catch(raso);
    return pidiendo;
  }

  /* Cuando no hay logo, una inicial sobre un color estable sacado del nombre.
     Estable importa: la misma cartera tiene siempre el mismo color y la lista no
     cambia de aspecto entre visitas. */
  function tono(n) {
    var h = 0;
    for (var i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 360;
    return 'hsl(' + h + ' 62% 46%)';
  }

  /* Enlaces tal como los arma WalletConnect. Un esquema propio abre la app
     directamente; el universal es https y, si la app no está, cae en su web. */
  function enlaceNativo(base, uri) {
    if (/^http/.test(base)) return enlaceUniversal(base, uri);
    var b = base;
    if (b.indexOf('://') < 0) b = b.replace(/[/:]/g, '') + '://';
    if (b.charAt(b.length - 1) !== '/') b += '/';
    return b + 'wc?uri=' + encodeURIComponent(uri);
  }
  function enlaceUniversal(base, uri) {
    var b = base;
    if (b.charAt(b.length - 1) !== '/') b += '/';
    return b + 'wc?uri=' + encodeURIComponent(uri);
  }
  function enlaceApp(w, uri) {
    var m = w.movil || {};
    if (m.native) return enlaceNativo(m.native, uri);
    if (m.universal) return enlaceUniversal(m.universal, uri);
    return uri;
  }

  /* ─────────────────────────────── el modal ──────────────────────────────── */

  var hoja = null, buscador = null, rejilla = null, vistaQR = null, atras = null, titulo = null;

  function estilos() {
    if (document.getElementById('nrmCss')) return;
    var e = document.createElement('style');
    e.id = 'nrmCss';
    e.textContent = [
      '.w-cta.espera{opacity:.72;cursor:progress}',
      /* Las vistas del modal traen display propio, que le gana al [hidden] del
         navegador: sin esto el QR se queda encima de la lista al volver atrás. */
      '.nrm-caja [hidden]{display:none!important}',
      '.nrm-caja .nrm-ico[hidden]{display:flex!important;visibility:hidden}',
      /* La página esconde el cursor del sistema y pinta el suyo en #cur, a
         z-index 130. El modal va a 9999, así que ese cursor queda debajo y
         encima no hay puntero de ninguna clase: no se ve qué se va a pulsar.
         Dentro del modal se devuelve el del sistema, que además es lo que se
         espera de un diálogo. */
      '.nrm-fondo,.nrm-fondo *{cursor:default!important}',
      '.nrm-fondo button,.nrm-fondo .nrm-w,.nrm-fondo a{cursor:pointer!important}',
      '.nrm-fondo input{cursor:text!important}',
      '.nrm-fondo{position:fixed;inset:0;z-index:9999;background:rgba(4,7,12,.72);',
      '-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);display:flex;',
      'align-items:center;justify-content:center;padding:16px;opacity:0;transition:opacity .18s}',
      '.nrm-fondo.on{opacity:1}',
      '@media(max-width:560px){.nrm-fondo{align-items:flex-end;padding:0}}',

      '.nrm-caja{width:100%;max-width:420px;max-height:min(640px,92vh);display:flex;',
      'flex-direction:column;background:var(--paper,#fff);color:var(--ink,#0A0C10);',
      'border-radius:22px;box-shadow:0 36px 90px rgba(0,0,0,.42);overflow:hidden;',
      "font-family:var(--f,'Inter Tight',system-ui,sans-serif);",
      'transform:translateY(10px) scale(.985);transition:transform .22s var(--ease,ease)}',
      '.nrm-fondo.on .nrm-caja{transform:none}',
      '@media(max-width:560px){.nrm-caja{max-width:none;border-radius:22px 22px 0 0;',
      'max-height:88vh;padding-bottom:env(safe-area-inset-bottom,0px)}',
      '.nrm-fondo.on .nrm-caja{transform:none}',
      '.nrm-fondo:not(.on) .nrm-caja{transform:translateY(24px)}}',

      '.nrm-cab{display:flex;align-items:center;gap:8px;padding:16px 16px 10px}',
      '.nrm-cab h3{flex:1;margin:0;font-size:16px;font-weight:600;letter-spacing:-.01em;text-align:center}',
      '.nrm-ico{width:32px;height:32px;flex:0 0 auto;display:flex;align-items:center;',
      'justify-content:center;border:0;border-radius:50%;background:rgba(10,12,16,.05);',
      'color:inherit;cursor:pointer;font-size:15px;line-height:1;transition:background .15s}',
      '.nrm-ico:hover{background:rgba(10,12,16,.1)}',

      '.nrm-buscar{margin:0 16px 12px;padding:11px 14px;border:1px solid rgba(10,12,16,.12);',
      'border-radius:12px;background:rgba(10,12,16,.03);color:inherit;font:inherit;font-size:14px;',
      'outline:0;transition:border-color .15s}',
      '.nrm-buscar:focus{border-color:var(--blue,#2F6BFF)}',
      '.nrm-buscar::placeholder{color:currentColor;opacity:.42}',

      '.nrm-rej{flex:1;overflow-y:auto;overscroll-behavior:contain;padding:0 10px 14px;',
      'display:grid;grid-template-columns:repeat(4,1fr);gap:2px;-webkit-overflow-scrolling:touch}',
      '@media(max-width:380px){.nrm-rej{grid-template-columns:repeat(3,1fr)}}',

      '.nrm-w{position:relative;display:flex;flex-direction:column;align-items:center;gap:7px;',
      'padding:12px 4px 11px;border:0;border-radius:14px;background:none;color:inherit;',
      'font:inherit;cursor:pointer;transition:background .15s}',
      '.nrm-w:hover{background:rgba(47,107,255,.08)}',
      '.nrm-w b{font-size:11px;font-weight:500;line-height:1.25;text-align:center;',
      'width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.86}',
      '.nrm-av{width:46px;height:46px;border-radius:13px;object-fit:cover;',
      'background:rgba(10,12,16,.06);display:flex;align-items:center;justify-content:center;',
      'color:#fff;font-size:18px;font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.12)}',
      '.nrm-w i{position:absolute;top:9px;right:9px;width:8px;height:8px;border-radius:50%;',
      'background:#22C55E;box-shadow:0 0 0 2px var(--paper,#fff)}',
      '.nrm-vacia{grid-column:1/-1;padding:28px 12px;text-align:center;font-size:13px;opacity:.55}',

      '.nrm-qr{flex:1;display:flex;flex-direction:column;align-items:center;',
      'justify-content:center;gap:14px;padding:6px 24px 26px;text-align:center}',
      '.nrm-qr .marco{width:min(268px,68vw);aspect-ratio:1;padding:14px;border-radius:18px;',
      'background:#fff;box-shadow:0 2px 14px rgba(0,0,0,.10);display:flex}',
      '.nrm-qr .marco svg{width:100%;height:100%;display:block}',
      '.nrm-qr p{margin:0;font-size:13px;line-height:1.5;opacity:.62;max-width:280px}',
      '.nrm-copiar{padding:9px 18px;border:1px solid rgba(10,12,16,.14);border-radius:999px;',
      'background:none;color:inherit;font:inherit;font-size:13px;cursor:pointer;transition:background .15s}',
      '.nrm-copiar:hover{background:rgba(47,107,255,.08)}',
      '.nrm-cargando{grid-column:1/-1;padding:34px;text-align:center;font-size:13px;opacity:.5}',

      '@media(prefers-color-scheme:dark){',
      '.nrm-caja{background:#12151C;color:#EDF0F6}',
      '.nrm-ico{background:rgba(255,255,255,.07)}.nrm-ico:hover{background:rgba(255,255,255,.13)}',
      '.nrm-buscar{background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.12)}',
      '.nrm-av{background:rgba(255,255,255,.08)}',
      '.nrm-w i{box-shadow:0 0 0 2px #12151C}',
      '.nrm-copiar{border-color:rgba(255,255,255,.16)}}'
    ].join('');
    document.head.appendChild(e);
  }

  function icono(d) {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('width', '15'); svg.setAttribute('height', '15');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.7');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d);
    svg.appendChild(p);
    return svg;
  }

  function cerrar() {
    if (!hoja) return;
    var h = hoja; hoja = null;
    h.classList.remove('on');
    setTimeout(function () { if (h.parentNode) h.remove(); }, 200);
  }

  function avatar(w) {
    if (w.logo) {
      var img = document.createElement('img');
      img.className = 'nrm-av'; img.alt = ''; img.loading = 'lazy'; img.src = w.logo;
      img.addEventListener('error', function () {
        var d = monograma(w); img.parentNode.replaceChild(d, img);
      });
      return img;
    }
    return monograma(w);
  }
  function monograma(w) {
    var d = document.createElement('div');
    d.className = 'nrm-av';
    d.style.background = tono(w.nombre);
    d.textContent = w.nombre.charAt(0).toUpperCase();
    return d;
  }

  function ficha(w, instalada) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'nrm-w';
    b.appendChild(avatar(w));
    var n = document.createElement('b');
    n.textContent = w.nombre;
    b.appendChild(n);
    if (instalada) {
      b.title = w.nombre + ' — installed';
      b.appendChild(document.createElement('i'));
    }
    b.addEventListener('click', function () { elegir(w); });
    return b;
  }

  function pintarLista(filtro) {
    if (!rejilla) return;
    var f = (filtro || '').trim().toLowerCase();
    var mias = listaCarteras().map(function (w) {
      return { nombre: w.nombre, logo: w.icono, prov: w.prov };
    });
    var nombres = {};
    mias.forEach(function (w) { nombres[w.nombre.toLowerCase()] = true; });
    var otras = (registro || []).filter(function (w) {
      return !nombres[w.nombre.toLowerCase()];
    });
    var todas = mias.concat(otras).filter(function (w) {
      return !f || w.nombre.toLowerCase().indexOf(f) >= 0;
    });

    rejilla.textContent = '';
    if (!todas.length) {
      var v = document.createElement('div');
      v.className = registro ? 'nrm-vacia' : 'nrm-cargando';
      v.textContent = registro ? 'No wallet with that name.' : 'Loading wallets…';
      rejilla.appendChild(v);
      return;
    }
    todas.forEach(function (w) { rejilla.appendChild(ficha(w, !!w.prov)); });
  }

  function verLista() {
    vistaQR.hidden = true;
    buscador.hidden = false;
    rejilla.hidden = false;
    atras.hidden = true;
    titulo.textContent = 'Connect a wallet';
    /* Elegir una cartera vacía la rejilla para poner el "Opening…", así que al
       volver hay que repintarla: sin esto la flecha atrás lleva a una lista en
       blanco y no hay forma de salir salvo cerrando. */
    pintarLista(buscador.value);
  }

  function verQR(w, uri) {
    titulo.textContent = w.nombre;
    atras.hidden = false;
    buscador.hidden = true;
    rejilla.hidden = true;
    vistaQR.hidden = false;
    vistaQR.textContent = '';

    var marco = document.createElement('div');
    marco.className = 'marco';
    try {
      var q = window.qrcode(0, 'M');
      q.addData(uri);
      q.make();
      marco.innerHTML = q.createSvgTag({ cellSize: 6, margin: 0, scalable: true });
      var svg = marco.querySelector('svg');
      if (svg) { svg.setAttribute('shape-rendering', 'crispEdges'); }
    } catch (e) {
      marco.textContent = '';
    }
    vistaQR.appendChild(marco);

    var p = document.createElement('p');
    p.textContent = 'Scan with ' + w.nombre + ', or copy the link and paste it in the app.';
    vistaQR.appendChild(p);

    vistaQR.appendChild(botonCopiar(uri));
  }

  function botonCopiar(uri) {
    var c = document.createElement('button');
    c.type = 'button'; c.className = 'nrm-copiar'; c.textContent = 'Copy link';
    c.addEventListener('click', function () {
      var hecho = function () {
        c.textContent = 'Copied';
        setTimeout(function () { c.textContent = 'Copy link'; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(uri).then(hecho, function () {});
      } else {
        /* Safari viejo y cualquier navegador servido sin https no tienen
           clipboard: el textarea de toda la vida sigue funcionando. */
        var t = document.createElement('textarea');
        t.value = uri;
        t.setAttribute('readonly', '');
        t.style.cssText = 'position:fixed;top:-1000px';
        document.body.appendChild(t);
        t.select(); t.setSelectionRange(0, t.value.length);
        try { document.execCommand('copy'); hecho(); } catch (e) {}
        t.remove();
      }
    });
    return c;
  }

  function abrirCarteras() {
    estilos();
    cerrar();

    hoja = document.createElement('div');
    hoja.className = 'nrm-fondo';
    hoja.setAttribute('role', 'dialog');
    hoja.setAttribute('aria-modal', 'true');
    hoja.setAttribute('aria-label', 'Connect a wallet');

    var caja = document.createElement('div');
    caja.className = 'nrm-caja';

    var cab = document.createElement('div');
    cab.className = 'nrm-cab';
    atras = document.createElement('button');
    atras.type = 'button'; atras.className = 'nrm-ico';
    /* Dibujados, no escritos. `←` y `✕` son caracteres que muchas tipografías
       no traen —Switzer entre ellas— y entonces no se pinta nada: un botón
       invisible que el visitante no sabe que puede pulsar. */
    atras.appendChild(icono('M10 3 5 8l5 5'));
    atras.setAttribute('aria-label', 'Back');
    atras.hidden = true;
    atras.addEventListener('click', verLista);
    titulo = document.createElement('h3');
    titulo.textContent = 'Connect a wallet';
    var equis = document.createElement('button');
    equis.type = 'button'; equis.className = 'nrm-ico';
    equis.appendChild(icono('M4 4l8 8M12 4l-8 8'));
    equis.setAttribute('aria-label', 'Close');
    equis.addEventListener('click', cerrar);
    cab.appendChild(atras); cab.appendChild(titulo); cab.appendChild(equis);

    buscador = document.createElement('input');
    buscador.className = 'nrm-buscar';
    buscador.type = 'search';
    buscador.placeholder = 'Search wallet';
    buscador.setAttribute('aria-label', 'Search wallet');
    buscador.addEventListener('input', function () { pintarLista(buscador.value); });

    rejilla = document.createElement('div');
    rejilla.className = 'nrm-rej';

    vistaQR = document.createElement('div');
    vistaQR.className = 'nrm-qr';
    vistaQR.hidden = true;

    caja.appendChild(cab); caja.appendChild(buscador);
    caja.appendChild(rejilla); caja.appendChild(vistaQR);
    hoja.appendChild(caja);
    hoja.addEventListener('click', function (e) { if (e.target === hoja) cerrar(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key !== 'Escape') return;
      document.removeEventListener('keydown', esc);
      cerrar();
    });
    document.body.appendChild(hoja);
    requestAnimationFrame(function () { if (hoja) hoja.classList.add('on'); });

    pintarLista('');
    traerRegistro().then(function () { if (hoja) pintarLista(buscador.value); });
    /* El QR tarda en hacer falta y son 55 KB: se trae mientras el visitante
       mira la lista, para que al elegir ya esté. */
    if (!MOVIL) cargarScript('assets/qr.js', 'QR').catch(function () {});
  }

  /* ─────────────────────────── elegir una cartera ─────────────────────────── */

  function tras(p) {
    return p.then(function () { return refrescar(); })
      .then(function () { cerrar(); libre(); pintar(); })
      .catch(function (e) { cerrar(); libre(); aviso(motivo(e), true); });
  }

  /* La URI de emparejamiento no es de ninguna cartera en concreto: sirve para
     cualquiera. Por eso se pide una sola vez y se reutiliza si el visitante
     vuelve atrás y elige otra, en vez de abrir una conexión nueva por cada
     nombre que toque. */
  var wcUri = null, wcPedida = false;

  function mostrarWC(w, uri) {
    if (!hoja) return;
    titulo.textContent = w.nombre;
    atras.hidden = false;
    buscador.hidden = true;
    if (MOVIL) {
      /* El salto a la app es silencioso cuando falla: si no está instalada, o
         si el navegador bloquea el esquema, no hay error ninguno y la pantalla
         se queda esperando. De ahí el botón para reintentar y el enlace para
         pegar a mano. */
      rejilla.hidden = true;
      vistaQR.hidden = false;
      vistaQR.textContent = '';
      var p = document.createElement('p');
      p.textContent = 'Confirm the connection in ' + w.nombre +
        '. If it did not open, try again or copy the link into the app.';
      vistaQR.appendChild(p);
      var abrir = document.createElement('button');
      abrir.type = 'button'; abrir.className = 'nrm-copiar';
      abrir.textContent = 'Open ' + w.nombre;
      abrir.addEventListener('click', function () {
        window.location.href = enlaceApp(w, uri);
      });
      vistaQR.appendChild(abrir);
      vistaQR.appendChild(botonCopiar(uri));
      window.location.href = enlaceApp(w, uri);
      return;
    }
    cargarScript('assets/qr.js', 'QR')
      .then(function () { if (hoja) verQR(w, uri); })
      .catch(function () { if (hoja) verQR(w, uri); });
  }

  function esperandoA(nombre) {
    if (!hoja) return;
    titulo.textContent = nombre;
    atras.hidden = false;
    buscador.hidden = true;
    rejilla.textContent = '';
    rejilla.appendChild(nota_('Confirm the connection in ' + nombre + '…'));
  }

  function nota_(txt) {
    var d = document.createElement('div');
    d.className = 'nrm-cargando';
    d.textContent = txt;
    return d;
  }

  function elegir(w) {
    if (w.prov) {                      /* extensión o navegador de cartera */
      trabajando('Confirm in your wallet…');
      /* Una extensión puede no responder nunca —tiene otra petición abierta,
         está bloqueada— y hasta ahora eso dejaba la lista puesta sin nada que
         pulsar salvo cerrar. Se pasa a la misma vista de espera que
         WalletConnect, con su flecha para volver. */
      esperandoA(w.nombre);
      return tras(enchufar(w.prov, w.nombre));
    }
    if (!PROYECTO_WC) {
      cerrar();
      aviso('Open nereum.xyz inside your wallet app to connect.', true);
      return;
    }

    titulo.textContent = w.nombre;
    atras.hidden = false;
    buscador.hidden = true;
    rejilla.textContent = '';
    rejilla.appendChild(nota_('Opening ' + w.nombre + '…'));

    if (wcUri) return mostrarWC(w, wcUri);
    if (wcPedida) return;              /* ya se está pidiendo, llegará sola */

    wcPedida = true;
    var pedida = w;
    tras(iniciarWC().then(function (prov) {
      prov.on('display_uri', function (uri) {
        wcUri = uri;
        mostrarWC(pedida, uri);
      });
      return prov.connect().then(function () { return enchufar(prov, pedida.nombre); });
    }).catch(function (e) {
      wcPedida = false; wcUri = null; wcProv = null;
      throw e;
    }));
  }

  /* ─────────────────────────────── arranque ──────────────────────────────── */

  chips.querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () { ponerUsd(+b.dataset.v); });
  });
  range.addEventListener('input', function () { ponerUsd(deBarra(+range.value)); });
  usdIn.addEventListener('input', function () { pago = aUnidades(usdIn.value, decimales()); pintar(true); });
  usdIn.addEventListener('blur',  function () { pago = aUnidades(usdIn.value, decimales()); pintar(false); });

  pintar(false);

  leerTodo().then(function () {
    /* El primer chip de la maqueta era "$1"; el contrato admite desde $0,20. */
    var primero = chips.querySelector('button');
    if (primero && minUsd() < 1) {
      primero.dataset.v = String(minUsd());
      primero.textContent = dinero(minUsd(), 2);
    }
    range.min = String(Math.log10(minUsd()));
    range.max = String(Math.log10(maxUsd()));

    /* El pie de la barra anuncia el mínimo de compra. La maqueta decía $1 y el
       contrato acepta desde $0,20: dejarlo mal solo sirve para que alguien
       intente comprar $0,50 y no lo haga. La recaudación de la barra no se
       toca, es de la ronda privada y no vive en la cadena. */
    var pie = document.querySelector('#presale .raise-foot');
    if (pie) {
      var ss = pie.querySelectorAll('span');
      if (ss[0]) ss[0].textContent = 'Minimum ' + dinero(minUsd(), minUsd() < 1 ? 2 : 0);
      if (ss[1]) ss[1].textContent = 'Maximum ' + dinero(maxUsd()) + ' per wallet';
    }
    pintar(false);
  });

  /* Refresco mientras la sección está a la vista. Fuera de ella no se pide nada:
     son dos redes por vuelta y la página no tiene por qué sonar a minero. */
  var seccion = document.getElementById('presale');
  if (seccion && 'IntersectionObserver' in window) {
    var reloj = null;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting && !reloj) {
          reloj = setInterval(function () { refrescar().then(function () { pintar(false); }); }, 30000);
        } else if (!e.isIntersecting && reloj) {
          clearInterval(reloj); reloj = null;
        }
      });
    }, { threshold: 0 }).observe(seccion);
  }

  window.__nereum = { estado: estado, sesion: function () { return sesion; }, leer: leerTodo };
})();
