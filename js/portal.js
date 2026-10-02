/* ============================================================================
 * portal.js — Portal de clientes: activar cuenta, iniciar sesión y ver tus
 * propias cotizaciones/contratos/pedidos/reservas.
 * ----------------------------------------------------------------------------
 * El token de sesión (backend/34_PortalClientes.gs, HMAC firmado con
 * expiración corta) se guarda en localStorage SOLO en este navegador — el
 * servidor no guarda sesiones, así que "cerrar sesión" es simplemente borrarlo
 * acá. Si expira, la próxima llamada a "portal.misDatos" falla con un mensaje
 * claro y el portal vuelve a pedir iniciar sesión sin que se caiga nada más.
 * ========================================================================== */

window.Portal = (function () {
  var CLAVE_TOKEN = 'econta_portal_token';

  function leerToken_() { try { return localStorage.getItem(CLAVE_TOKEN) || ''; } catch (e) { return ''; } }
  function guardarToken_(t) { try { localStorage.setItem(CLAVE_TOKEN, t); } catch (e) { /* no persiste, pero sigue funcionando en esta carga */ } }
  function borrarToken_() { try { localStorage.removeItem(CLAVE_TOKEN); } catch (e) { /* nada que borrar */ } }
  function esc_(s) { var d = document.createElement('div'); d.textContent = (s === undefined || s === null) ? '' : String(s); return d.innerHTML; }
  function fmtFecha_(iso) { if (!iso) { return ''; } try { return new Date(iso).toLocaleDateString('es-CL'); } catch (e) { return String(iso); } }
  function fmtMonto_(monto, unidad) { if (monto === undefined || monto === null || monto === '') { return ''; } return (unidad === 'UF' ? Number(monto).toLocaleString('es-CL') + ' UF' : '$' + Math.round(Number(monto)).toLocaleString('es-CL')); }

  function montar(raiz) {
    var contenedor = (raiz || document).querySelector('#portal-widget');
    if (!contenedor) { return; }
    var token = leerToken_();
    if (token) { pintarCargando_(contenedor); cargarDatos_(contenedor, token); }
    else { pintarLogin_(contenedor); }
  }

  function pintarCargando_(contenedor) {
    contenedor.innerHTML = '<p class="portal-cargando">' + I18n.t('portal_cargando') + '</p>';
  }

  // ---- Pantalla de login + link a "activar cuenta" ----
  function pintarLogin_(contenedor) {
    contenedor.innerHTML =
      '<div class="portal-tabs" role="tablist">' +
      '<button type="button" class="portal-tab activa" data-tab="login">' + I18n.t('portal_tab_login') + '</button>' +
      '<button type="button" class="portal-tab" data-tab="activar">' + I18n.t('portal_tab_activar') + '</button>' +
      '</div>' +
      '<form id="portal-form-login" class="portal-form">' +
      '<div class="campo"><label for="portal-login-rut">' + I18n.t('portal_campo_rut') + '</label><input type="text" id="portal-login-rut" required autocomplete="username"></div>' +
      '<div class="campo"><label for="portal-login-password">' + I18n.t('portal_campo_password') + '</label><input type="password" id="portal-login-password" required autocomplete="current-password"></div>' +
      '<button type="submit" class="btn btn-primario btn-bloque">' + I18n.t('portal_boton_login') + '</button>' +
      '</form>' +
      '<form id="portal-form-activar" class="portal-form oculto">' +
      '<p class="portal-nota">' + I18n.t('portal_nota_activar') + '</p>' +
      '<div class="campo"><label for="portal-act-rut">' + I18n.t('portal_campo_rut') + '</label><input type="text" id="portal-act-rut" required autocomplete="off"></div>' +
      '<div class="campo"><label for="portal-act-email">' + I18n.t('portal_campo_email') + '</label><input type="email" id="portal-act-email" required autocomplete="email"></div>' +
      '<div class="campo"><label for="portal-act-password">' + I18n.t('portal_campo_password_nueva') + '</label><input type="password" id="portal-act-password" required minlength="8" autocomplete="new-password"></div>' +
      '<button type="submit" class="btn btn-primario btn-bloque">' + I18n.t('portal_boton_activar') + '</button>' +
      '</form>' +
      '<div id="portal-mensaje" aria-live="polite"></div>';

    contenedor.querySelectorAll('.portal-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        contenedor.querySelectorAll('.portal-tab').forEach(function (t) { t.classList.remove('activa'); });
        tab.classList.add('activa');
        contenedor.querySelector('#portal-form-login').classList.toggle('oculto', tab.dataset.tab !== 'login');
        contenedor.querySelector('#portal-form-activar').classList.toggle('oculto', tab.dataset.tab !== 'activar');
        contenedor.querySelector('#portal-mensaje').innerHTML = '';
      });
    });

    contenedor.querySelector('#portal-form-login').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var msg = contenedor.querySelector('#portal-mensaje');
      var boton = ev.target.querySelector('button[type="submit"]');
      boton.disabled = true;
      msg.innerHTML = '';
      try {
        var r = await window.Sitio.llamarApi('portal.login', {
          rut: contenedor.querySelector('#portal-login-rut').value.trim(),
          password: contenedor.querySelector('#portal-login-password').value
        });
        guardarToken_(r.token);
        pintarCargando_(contenedor);
        cargarDatos_(contenedor, r.token);
      } catch (e) {
        msg.innerHTML = '<p class="portal-error">' + esc_(e.message) + '</p>';
      } finally { boton.disabled = false; }
    });

    contenedor.querySelector('#portal-form-activar').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var msg = contenedor.querySelector('#portal-mensaje');
      var boton = ev.target.querySelector('button[type="submit"]');
      boton.disabled = true;
      msg.innerHTML = '';
      try {
        var r = await window.Sitio.llamarApi('portal.activarCuenta', {
          rut: contenedor.querySelector('#portal-act-rut').value.trim(),
          email: contenedor.querySelector('#portal-act-email').value.trim(),
          password: contenedor.querySelector('#portal-act-password').value
        });
        guardarToken_(r.token);
        pintarCargando_(contenedor);
        cargarDatos_(contenedor, r.token);
      } catch (e) {
        msg.innerHTML = '<p class="portal-error">' + esc_(e.message) + '</p>';
      } finally { boton.disabled = false; }
    });
  }

  async function cargarDatos_(contenedor, token) {
    try {
      var datos = await window.Sitio.llamarApi('portal.misDatos', { token: token });
      pintarDatos_(contenedor, datos);
    } catch (e) {
      // Token vencido/ inválido: no queda una pantalla rota, vuelve a pedir login con el motivo.
      borrarToken_();
      pintarLogin_(contenedor);
      var msg = contenedor.querySelector('#portal-mensaje');
      if (msg) { msg.innerHTML = '<p class="portal-error">' + esc_(e.message) + '</p>'; }
    }
  }

  function seccion_(titulo, filas, vacio) {
    if (!filas.length) { return '<section class="portal-seccion"><h3>' + esc_(titulo) + '</h3><p class="portal-vacio">' + esc_(vacio) + '</p></section>'; }
    return '<section class="portal-seccion"><h3>' + esc_(titulo) + '</h3><div class="portal-lista">' + filas.join('') + '</div></section>';
  }

  function pintarDatos_(contenedor, datos) {
    var cotizaciones = datos.cotizaciones.map(function (c) {
      return '<div class="portal-item"><strong>' + esc_(c.id_cotizacion) + '</strong> — ' + esc_(fmtFecha_(c.fecha)) + ' — ' + esc_(c.estado) + ' — ' + esc_(fmtMonto_(c.total, c.unidad_precio)) +
        (c.url_pdf ? ' — <a href="' + esc_(c.url_pdf) + '" target="_blank" rel="noopener">' + I18n.t('portal_ver_pdf') + '</a>' : '') + '</div>';
    });
    var contratos = datos.contratos.map(function (c) {
      return '<div class="portal-item"><strong>' + esc_(c.id_contrato) + '</strong> — ' + esc_(fmtFecha_(c.fecha)) + ' — ' + esc_(c.estado) +
        (c.url_pdf ? ' — <a href="' + esc_(c.url_pdf) + '" target="_blank" rel="noopener">' + I18n.t('portal_ver_pdf') + '</a>' : '') +
        (c.url_verificacion ? ' — <a href="' + esc_(c.url_verificacion) + '" target="_blank" rel="noopener">' + I18n.t('portal_verificar') + '</a>' : '') + '</div>';
    });
    var pedidos = datos.pedidos.map(function (p) {
      return '<div class="portal-item"><strong>' + esc_(p.id_pedido) + '</strong> — ' + esc_(fmtFecha_(p.fecha)) + ' — ' + esc_(p.estado_pago) + ' / ' + esc_(p.estado_despacho) + ' — ' + esc_(fmtMonto_(p.total, 'CLP')) + '</div>';
    });
    var reservas = datos.reservas.map(function (r) {
      return '<div class="portal-item"><strong>' + esc_(r.id_reserva) + '</strong> — ' + esc_(fmtFecha_(r.inicio)) + ' — ' + esc_(r.estado) + '</div>';
    });

    contenedor.innerHTML =
      '<div class="portal-cabecera"><p>' + I18n.t('portal_hola', { nombre: datos.nombre }) + '</p><button type="button" class="btn btn-secundario" id="portal-cerrar-sesion">' + I18n.t('portal_cerrar_sesion') + '</button></div>' +
      seccion_(I18n.t('portal_seccion_cotizaciones'), cotizaciones, I18n.t('portal_vacio_cotizaciones')) +
      seccion_(I18n.t('portal_seccion_contratos'), contratos, I18n.t('portal_vacio_contratos')) +
      seccion_(I18n.t('portal_seccion_pedidos'), pedidos, I18n.t('portal_vacio_pedidos')) +
      seccion_(I18n.t('portal_seccion_reservas'), reservas, I18n.t('portal_vacio_reservas'));

    contenedor.querySelector('#portal-cerrar-sesion').addEventListener('click', function () {
      borrarToken_();
      pintarLogin_(contenedor);
    });
  }

  return { montar: montar };
})();
