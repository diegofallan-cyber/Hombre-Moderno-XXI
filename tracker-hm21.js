/**
 * Tracker Hombre Moderno XXI → n8n
 * Sitio: https://diegofallan-cyber.github.io/Hombre-Moderno-XXI/
 *
 * Instalación: sube este archivo al repositorio (junto a index.html) y agrega
 * antes de </body>:   <script src="tracker-hm21.js" defer></script>
 *
 * No requiere tocar el HTML del catálogo: lee la estructura existente
 * (article.product, .cat, h3, p, .badge, img[data-img], .wa-link[data-msg]).
 *
 * Eventos que registra:
 *   visita               carga de la página
 *   vista_prenda         la tarjeta estuvo ≥50% visible durante ≥1.5 s (1 vez por sesión)
 *   clic_prenda          clic en la foto o el texto de una tarjeta
 *   consulta_whatsapp    clic en "Consultar por WhatsApp" de una prenda  ← conversión
 *   contacto_whatsapp    clic en otros botones de WhatsApp (menú, flotante, CTA, footer)
 *   filtro_catalogo      uso de filtros (Todo, Formal, Casual, Nuevo, Seminuevo) o links de colección
 *   clic_instagram       clic en enlaces a Instagram
 *   seccion_vista        primera vez que se ve cada sección (colecciones, catálogo, nosotros…)
 *   chat_abierto         el visitante abre el chat del asesor virtual (1 vez por sesión)
 *
 * Los eventos se envían en lotes (cada 8 s, al juntar 10, o al salir de la página),
 * así cada visita consume pocas ejecuciones de n8n.
 */
(function () {
  'use strict';

  var WEBHOOK_URL = 'https://TU-INSTANCIA-N8N/webhook/hm21-eventos';
  var FLUSH_MS = 8000;
  var MAX_LOTE = 10;

  if (navigator.webdriver) return; // ignora navegadores automatizados

  // ---------- Identificadores anónimos ----------
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 10); }
  function getId(store, key) {
    try {
      var v = store.getItem(key);
      if (!v) { v = uid(); store.setItem(key, v); }
      return v;
    } catch (e) { return uid(); }
  }
  var visitorId = getId(window.localStorage, 'hm21_vid');
  var sessionId = getId(window.sessionStorage, 'hm21_sid');

  function unaVezPorSesion(clave) {
    try {
      var k = 'hm21_once', l = JSON.parse(sessionStorage.getItem(k) || '[]');
      if (l.indexOf(clave) !== -1) return false;
      l.push(clave); sessionStorage.setItem(k, JSON.stringify(l.slice(-100)));
    } catch (e) {}
    return true;
  }

  var qs = new URLSearchParams(location.search);
  var contexto = {
    url: location.origin + location.pathname,
    titulo_pagina: document.title,
    referrer: document.referrer,
    idioma: navigator.language,
    pantalla: window.screen ? screen.width + 'x' + screen.height : '',
    user_agent: navigator.userAgent,
    utm: { source: qs.get('utm_source') || '', medium: qs.get('utm_medium') || '', campaign: qs.get('utm_campaign') || '' }
  };

  // ---------- Cola y envío por lotes ----------
  var cola = [];
  function registrar(evento, datos) {
    var e = { evento: evento, ts: Date.now() };
    for (var k in datos) e[k] = datos[k];
    cola.push(e);
    if (cola.length >= MAX_LOTE) enviar(false);
  }
  function enviar(saliendo) {
    if (!cola.length) return;
    var lote = cola.splice(0, cola.length);
    var body = JSON.stringify({ visitor_id: visitorId, session_id: sessionId, contexto: contexto, eventos: lote });
    try {
      fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        keepalive: true,
        mode: 'cors'
      }).catch(function () { if (!saliendo) cola = lote.concat(cola); });
    } catch (e) {}
  }
  setInterval(function () { enviar(false); }, FLUSH_MS);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') enviar(true); });
  window.addEventListener('pagehide', function () { enviar(true); });

  // ---------- Lectura de una prenda del catálogo ----------
  var productos = Array.prototype.slice.call(document.querySelectorAll('#catalogo article.product'));
  function txt(el, sel) { var n = el.querySelector(sel); return n ? n.textContent.replace(/\s+/g, ' ').trim() : ''; }
  function slug(s) {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function filtroActivo() { var b = document.querySelector('.filters button.on'); return b ? b.dataset.filter : 'all'; }

  function leerPrenda(card) {
    var nombre = txt(card, 'h3');
    var img = card.querySelector('img[data-img]');
    var imgId = img ? img.dataset.img : String(productos.indexOf(card) + 1);
    var tags = (card.dataset.tags || '').split(/\s+/).filter(Boolean);
    var wa = card.querySelector('.wa-link[data-msg]');
    var msg = wa ? wa.dataset.msg : '';
    // data-msg: ...la prenda "Nombre" (Color, estado nuevo)...
    var color = '', m = msg.match(/\(([^)]*)\)/);
    if (m) color = m[1].replace(/,?\s*estado\s+\S+\s*$/i, '').replace(/^color\s+/i, '').trim();
    color = color.charAt(0).toUpperCase() + color.slice(1);
    return {
      producto_id: slug(nombre) + '-' + imgId,
      nombre: nombre,
      coleccion: txt(card, '.cat') || (tags.indexOf('formal') !== -1 ? 'Formal' : tags.indexOf('casual') !== -1 ? 'Casual' : ''),
      estado: tags.indexOf('seminuevo') !== -1 ? 'Seminuevo' : tags.indexOf('nuevo') !== -1 ? 'Nuevo' : txt(card, '.badge'),
      color: color,
      descripcion: txt(card, '.info p'),
      posicion: productos.indexOf(card) + 1,
      filtro_activo: filtroActivo()
    };
  }

  // ---------- 1) Visita ----------
  if (unaVezPorSesion('visita')) registrar('visita', { ancla: location.hash || '' });

  // ---------- 2) Vista real de prendas y secciones ----------
  if ('IntersectionObserver' in window) {
    var timers = new WeakMap();
    var ioProd = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var card = en.target;
        if (en.isIntersecting && !card.classList.contains('hide')) {
          if (!timers.has(card)) {
            timers.set(card, setTimeout(function () {
              var p = leerPrenda(card);
              if (unaVezPorSesion('vista|' + p.producto_id)) registrar('vista_prenda', { prenda: p });
              ioProd.unobserve(card);
            }, 1500));
          }
        } else if (timers.has(card)) {
          clearTimeout(timers.get(card)); timers.delete(card);
        }
      });
    }, { threshold: 0.5 });
    productos.forEach(function (c) { ioProd.observe(c); });

    var ioSec = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var id = en.target.id || 'cta';
          if (unaVezPorSesion('sec|' + id)) registrar('seccion_vista', { detalle: id });
          ioSec.unobserve(en.target);
        }
      });
    }, { threshold: 0.35 });
    document.querySelectorAll('section').forEach(function (s) { ioSec.observe(s); });
  }

  // ---------- 3) Clics ----------
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t || !t.closest) return;

    if (t.closest('.chat-window-toggle')) {
      if (unaVezPorSesion('chat')) registrar('chat_abierto', { detalle: location.hash || '#inicio' });
      return;
    }

    var wa = t.closest('.wa-link');
    if (wa) {
      var card = wa.closest('article.product');
      if (card) registrar('consulta_whatsapp', { prenda: leerPrenda(card) });
      else {
        var ubic = wa.classList.contains('wa-float') ? 'boton_flotante'
          : wa.closest('header') ? 'menu'
          : wa.closest('footer') ? 'footer'
          : wa.closest('.cta') ? 'cta_final' : 'otro';
        registrar('contacto_whatsapp', { detalle: ubic });
      }
      enviar(false); // la conversión se manda al instante
      return;
    }

    var f = t.closest('.filters button[data-filter], [data-filter-link]');
    if (f) { registrar('filtro_catalogo', { detalle: f.dataset.filter || f.dataset.filterLink }); return; }

    var ig = t.closest('a[href*="instagram.com"]');
    if (ig) { registrar('clic_instagram', { detalle: ig.closest('.ig-grid') ? 'galeria' : ig.closest('footer') ? 'footer' : 'boton' }); return; }

    var prod = t.closest('article.product');
    if (prod) registrar('clic_prenda', { prenda: leerPrenda(prod) });
  }, true);
})();
