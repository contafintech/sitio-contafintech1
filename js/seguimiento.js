/* ============================================================================
 * seguimiento.js — "¿Dónde está mi pedido?" público, sin login.
 * ----------------------------------------------------------------------------
 * Llama a la acción "seguimiento.obtener" (backend/29_Seguimiento.gs), que ya
 * verifica que quien pregunta es el dueño real del número (correo o RUT), y
 * devuelve el estado de la cotización/preventa + el link real de seguimiento
 * del courier (si el pedido ya se despachó). Mismo patrón de montaje que
 * diagnostico.js/formulario.js: el HTML solo deja el contenedor, esto arma
 * el formulario adentro.
 * ========================================================================== */

window.Seguimiento = (function () {
  function montar(raiz) {
    var contenedor = (raiz || document).querySelector('#seguimiento-pedido');
    if (!contenedor) { return; }
    contenedor.innerHTML =
      '<form id="form-seguimiento" class="form-seguimiento">' +
      '<div class="campo"><label for="seg-id">' + I18n.t('seguimiento_campo_id') + '</label>' +
      '<input type="text" id="seg-id" placeholder="' + I18n.t('seguimiento_id_placeholder') + '" required autocomplete="off"></div>' +
      '<div class="campo"><label for="seg-verificador">' + I18n.t('seguimiento_campo_verificador') + '</label>' +
      '<input type="text" id="seg-verificador" placeholder="' + I18n.t('seguimiento_verificador_placeholder') + '" required autocomplete="off"></div>' +
      '<button type="submit" class="btn btn-primario btn-bloque">' + I18n.t('seguimiento_boton') + '</button>' +
      '</form>' +
      '<div id="seguimiento-resultado" aria-live="polite"></div>';

    contenedor.querySelector('#form-seguimiento').addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var boton = ev.target.querySelector('button[type="submit"]');
      var resultadoNodo = contenedor.querySelector('#seguimiento-resultado');
      var id = contenedor.querySelector('#seg-id').value.trim();
      var verificador = contenedor.querySelector('#seg-verificador').value.trim();
      boton.disabled = true;
      resultadoNodo.innerHTML = '<p class="seguimiento-cargando">' + I18n.t('seguimiento_buscando') + '</p>';
      try {
        var r = await window.Sitio.llamarApi('seguimiento.obtener', { id: id, verificador: verificador });
        resultadoNodo.innerHTML = pintarResultado_(r);
      } catch (e) {
        resultadoNodo.innerHTML = '<p class="seguimiento-error">' + I18n.t('seguimiento_error', { error: e.message }) + '</p>';
      } finally {
        boton.disabled = false;
      }
    });
  }

  function esc_(s) { var d = document.createElement('div'); d.textContent = (s === undefined || s === null) ? '' : String(s); return d.innerHTML; }

  function pintarResultado_(r) {
    var filas = '<div class="seguimiento-tarjeta">';
    filas += '<p><strong>' + I18n.t('seguimiento_numero') + ':</strong> ' + esc_(r.id) + '</p>';
    if (r.estado_cotizacion) { filas += '<p><strong>' + I18n.t('seguimiento_estado_cotizacion') + ':</strong> ' + esc_(r.estado_cotizacion) + '</p>'; }
    if (r.estado_preventa) { filas += '<p><strong>' + I18n.t('seguimiento_estado_pedido') + ':</strong> ' + esc_(r.estado_preventa) + '</p>'; }
    if (r.despacho) {
      filas += '<p><strong>' + I18n.t('seguimiento_estado_despacho') + ':</strong> ' + esc_(r.despacho.estado || I18n.t('seguimiento_sin_despachar')) + '</p>';
      if (r.despacho.courier) { filas += '<p><strong>' + I18n.t('seguimiento_courier') + ':</strong> ' + esc_(r.despacho.courier) + (r.despacho.tracking ? ' — ' + esc_(r.despacho.tracking) : '') + '</p>'; }
      if (r.despacho.url_seguimiento) { filas += '<a class="btn btn-secundario btn-bloque" href="' + esc_(r.despacho.url_seguimiento) + '" target="_blank" rel="noopener">' + I18n.t('seguimiento_ver_tracking') + '</a>'; }
    } else if (!r.estado_cotizacion || r.estado_cotizacion === 'aceptada' || r.estado_preventa) {
      filas += '<p class="seguimiento-sin-despacho">' + I18n.t('seguimiento_sin_despacho') + '</p>';
    }
    filas += '</div>';
    return filas;
  }

  return { montar: montar };
})();
