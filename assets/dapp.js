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
  var PROYECTO_WC = '';

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
            pintar();
          });
          prov.on('chainChanged', function (h2) { sesion.cid = parseInt(h2, 16); pintar(); });
        }
        return sesion;
      });
    });
  }

  function cargarScript(src) {
    return new Promise(function (ok, mal) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = ok; s.onerror = function () { mal(new Error('no cargó ' + src)); };
      document.head.appendChild(s);
    });
  }

  /* WalletConnect. Solo se carga si hay Project ID: sin él el relay rechaza la
     sesión, y bajar 400 KB para enseñar un error no le sirve a nadie. */
  function conectarWC() {
    if (!PROYECTO_WC) return Promise.reject(new Error('WalletConnect sin Project ID'));
    var base = window.EthereumProvider
      ? Promise.resolve()
      : cargarScript('https://cdn.jsdelivr.net/npm/@walletconnect/ethereum-provider@2.17.2/dist/index.umd.js');
    return base.then(function () {
      return window.EthereumProvider.init({
        projectId: PROYECTO_WC,
        chains: [1],
        optionalChains: [56],
        showQrModal: true,
        metadata: {
          name: 'Nereum',
          description: 'Nereum Seed Round',
          url: location.origin,
          icons: [location.origin + '/icon-192.png']
        }
      });
    }).then(function (prov) {
      return prov.enable().then(function () { return enchufar(prov, 'WalletConnect'); });
    });
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
      elegido = i;
      pintar();
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

  /* Cuánto hay que enviar para que al contrato le lleguen exactamente estos
     dólares. Se redondea hacia arriba porque el contrato divide y trunca: un
     wei de menos dejaría una compra del mínimo justo por debajo del mínimo. */
  function pagoNativo(usd8) {
    var e = est();
    if (!e.ok || !e.precioNativo) return null;
    return (usd8 * 1000000000000000000n + e.precioNativo - 1n) / e.precioNativo;
  }
  function pagoUsdt(usd8) {
    var u = 10n ** BigInt(red().usdtDec);
    return (usd8 * u + 99999999n) / 100000000n;
  }
  function tokensPor(usd8) {
    var e = est();
    var p = e.ok && e.precioUsd ? e.precioUsd : 20000000n;
    return usd8 * 1000000000000000000n / p;
  }

  /* Todo en enteros. Pasar por coma flotante para enseñar "0,199525 ETH"
     cuando se envían 0,199524… es pequeño, pero es la cifra que el comprador
     compara con lo que le pide la cartera, y si no cuadra desconfía. */
  function humano(wei, dec, cifras) {
    var u = 10n ** BigInt(dec);
    var ent = (wei / u).toString();
    var frac = (wei % u).toString().padStart(dec, '0').slice(0, cifras || 6).replace(/0+$/, '');
    return frac ? ent + '.' + frac : ent;
  }

  var usdActual = 500;

  function pintar(desdeInput) {
    var mn = minUsd(), mx = maxUsd(), pr = precio();
    var usd = usdActual;
    var malo = usd < mn || usd > mx;
    var uso  = Math.min(mx, Math.max(mn, usd));
    if (!desdeInput) usdIn.value = uso >= 1000 ? num(uso) : String(+uso.toFixed(2));

    campo.classList.toggle('bad', malo);
    nota.classList.toggle('bad', malo);

    var lineaLimites = 'Min ' + dinero(mn, mn < 1 ? 2 : 0) + ' · max ' +
                       dinero(mx) + ' per wallet';
    nota.textContent = malo
      ? (usd < mn ? 'Minimum purchase is ' + dinero(mn, mn < 1 ? 2 : 0)
                  : 'Maximum is ' + dinero(mx) + ' per wallet')
      : lineaLimites + ' · live oracle price';

    var nrm = uso / pr;
    nrmOut.value = num(nrm);
    tasa.textContent = '1 NRM = ' + dinero(pr, 2);
    val.textContent  = dinero(nrm * LISTADO);
    gain.textContent = '+' + dinero(nrm * LISTADO - uso);
    range.value = aBarra(uso).toFixed(3);

    var e = est(), m = medio(), c = red();
    if (m.usdt) {
      eq.textContent = '≈ ' + uso.toFixed(2) + ' USDT on ' + c.nombre;
    } else if (e.ok && e.precioNativo) {
      var wei = pagoNativo(BigInt(Math.round(uso * 1e8)));
      eq.textContent = '≈ ' + humano(wei, 18, 6) + ' ' + c.simbolo + ' on ' + c.nombre +
                       (e.oraculoVivo ? '' : ' · cached price');
    } else {
      eq.textContent = 'Price unavailable on ' + c.nombre;
    }

    pintarCta();
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
    cta.textContent = 'Buy ' + num(usdActual / precio()) + ' NRM';
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
      return cambiarRed(c.id).then(function () { return leerTodo(); })
        .then(function () { libre(); pintar(); })
        .catch(function (err) { libre(); aviso(motivo(err), true); });
    }
    comprar();
  });

  function comprar() {
    var c = red(), m = medio(), e = est();
    var usd8 = BigInt(Math.round(Math.min(maxUsd(), Math.max(minUsd(), usdActual)) * 1e8));
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
      return m.usdt ? comprarUsdt(usd8, minimo) : comprarNativo(usd8, minimo);
    }).catch(function (err) { libre(); aviso(motivo(err), true); });
  }

  function comprarNativo(usd8, minimo) {
    var c = red();
    var wei = pagoNativo(usd8);
    if (wei === null) { libre(); aviso('No price available right now.', true); return; }
    trabajando('Confirm in your wallet…');
    return enviar({
      to: c.venta,
      value: '0x' + wei.toString(16),
      data: SEL.buyWithNative + encU(minimo)
    }).then(function (h) { return confirmar(h); });
  }

  function comprarUsdt(usd8, minimo) {
    var c = red();
    var cantidad = pagoUsdt(usd8);
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
          var techo = pagoUsdt(queda > 0n && queda < 10n ** 30n ? queda : usd8);
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
      leerTodo().then(function () { pintar(); });
    }).catch(function () {
      libre();
      aviso('Sent. It is taking longer than usual to confirm — check your wallet.');
    });
  }

  /* ────────────────────────── selector de cartera ─────────────────────────── */

  var hoja = null;

  function estilos() {
    if (document.getElementById('nrmWalletCss')) return;
    var s = document.createElement('style');
    s.id = 'nrmWalletCss';
    s.textContent = [
      '.nrm-fondo{position:fixed;inset:0;z-index:9999;background:rgba(8,10,16,.62);',
      'backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px}',
      '.nrm-caja{width:100%;max-width:380px;background:#fff;border-radius:18px;padding:22px;',
      'box-shadow:0 30px 80px rgba(0,0,0,.35);font:400 15px/1.45 var(--f,system-ui,sans-serif);color:#0B1020}',
      '.nrm-caja h3{margin:0 0 4px;font-size:17px;font-weight:600}',
      '.nrm-caja p{margin:0 0 16px;font-size:13px;opacity:.62}',
      '.nrm-w{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;margin-bottom:8px;',
      'border:1px solid rgba(10,16,32,.10);border-radius:12px;background:#fff;cursor:pointer;',
      'font:inherit;text-align:left;transition:border-color .15s,background .15s}',
      '.nrm-w:hover{border-color:#2A5BFF;background:rgba(42,91,255,.04)}',
      '.nrm-w img{width:26px;height:26px;border-radius:7px;flex:0 0 auto}',
      '.nrm-w b{font-weight:500}',
      '.nrm-x{display:block;width:100%;margin-top:10px;padding:9px;border:0;background:none;',
      'font:inherit;font-size:13px;opacity:.55;cursor:pointer}',
      '.nrm-vacio{font-size:13px;line-height:1.5;opacity:.7;margin:0 0 12px}',
      '.nrm-vacio a{color:#2A5BFF}',
      '@media(prefers-color-scheme:dark){.nrm-caja{background:#12151D;color:#EDF0F6}',
      '.nrm-w{background:#171B25;border-color:rgba(255,255,255,.10)}',
      '.nrm-w:hover{background:rgba(42,91,255,.14)}}',
      '.w-cta.espera{opacity:.72;cursor:progress}'
    ].join('');
    document.head.appendChild(s);
  }

  function cerrar() { if (hoja) { hoja.remove(); hoja = null; } }

  function abrirCarteras() {
    estilos();
    cerrar();
    var lista = listaCarteras();
    hoja = document.createElement('div');
    hoja.className = 'nrm-fondo';
    hoja.setAttribute('role', 'dialog');
    hoja.setAttribute('aria-modal', 'true');

    var caja = document.createElement('div');
    caja.className = 'nrm-caja';
    caja.innerHTML = '<h3>Connect a wallet</h3><p>You stay in control. Nereum never sees your keys.</p>';

    lista.forEach(function (w) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'nrm-w';
      b.innerHTML = (w.icono ? '<img alt="" src="' + w.icono + '">' : '') +
                    '<b></b>';
      b.querySelector('b').textContent = w.nombre;
      b.addEventListener('click', function () {
        cerrar();
        trabajando('Confirm in your wallet…');
        enchufar(w.prov, w.nombre)
          .then(function () { return leerTodo(); })
          .then(function () { libre(); pintar(); })
          .catch(function (e) { libre(); aviso(motivo(e), true); });
      });
      caja.appendChild(b);
    });

    if (PROYECTO_WC) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'nrm-w';
      b.innerHTML = '<b>WalletConnect</b>';
      b.addEventListener('click', function () {
        cerrar();
        trabajando('Opening WalletConnect…');
        conectarWC()
          .then(function () { return leerTodo(); })
          .then(function () { libre(); pintar(); })
          .catch(function (e) { libre(); aviso(motivo(e), true); });
      });
      caja.appendChild(b);
    } else if (!lista.length) {
      var p = document.createElement('p');
      p.className = 'nrm-vacio';
      p.innerHTML = 'No wallet detected in this browser. Open nereum.xyz inside your ' +
                    'wallet app, or install <a href="https://metamask.io" target="_blank" ' +
                    'rel="noopener">MetaMask</a>.';
      caja.appendChild(p);
    }

    var x = document.createElement('button');
    x.type = 'button'; x.className = 'nrm-x'; x.textContent = 'Cancel';
    x.addEventListener('click', cerrar);
    caja.appendChild(x);

    hoja.appendChild(caja);
    hoja.addEventListener('click', function (e) { if (e.target === hoja) cerrar(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') { cerrar(); document.removeEventListener('keydown', esc); }
    });
    document.body.appendChild(hoja);
  }

  /* ─────────────────────────────── arranque ──────────────────────────────── */

  chips.querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () { usdActual = +b.dataset.v; pintar(false); });
  });
  range.addEventListener('input', function () { usdActual = deBarra(+range.value); pintar(false); });
  usdIn.addEventListener('input', function () { usdActual = limpio(usdIn.value); pintar(true); });
  usdIn.addEventListener('blur',  function () { usdActual = limpio(usdIn.value); pintar(false); });

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
          reloj = setInterval(function () { leerTodo().then(function () { pintar(false); }); }, 30000);
        } else if (!e.isIntersecting && reloj) {
          clearInterval(reloj); reloj = null;
        }
      });
    }, { threshold: 0 }).observe(seccion);
  }

  window.__nereum = { estado: estado, sesion: function () { return sesion; }, leer: leerTodo };
})();
