/* ============================================================================
 * carrito.js — Carrito simple en localStorage; al pedir cotización, llama a la
 * API (accion: cotizacion.crear) para que el servidor haga los cálculos reales
 * (precio, UF del día, descuentos): el carrito nunca calcula el total final,
 * solo junta los ítems.
 * ========================================================================== */

window.Carrito = (function () {
  var CLAVE = 'carrito_v1';

  function leer() { try { return JSON.parse(localStorage.getItem(CLAVE) || '[]'); } catch (e) { return []; } }
  function guardar(items) { try { localStorage.setItem(CLAVE, JSON.stringify(items)); } catch (e) { /* almacenamiento no disponible: el carrito no persiste, pero la sesión sigue funcionando */ } }

  function agregar(idItem, cantidad) {
    var items = leer();
    var fila = items.filter(function (i) { return i.id_item === idItem; })[0];
    if (fila) { fila.cantidad += (cantidad || 1); } else { items.push({ id_item: idItem, cantidad: cantidad || 1 }); }
    guardar(items);
    actualizarContador_();
  }

  function quitar(idItem) { guardar(leer().filter(function (i) { return i.id_item !== idItem; })); actualizarContador_(); render_(); }

  function actualizarContador_() {
    var n = leer().reduce(function (s, i) { return s + i.cantidad; }, 0);
    var badge = document.getElementById('contador-carrito');
    var barra = document.getElementById('barra-carrito');
    if (badge) { badge.textContent = n; }
    if (barra) { barra.classList.toggle('oculto', n === 0); }
  }

  function nombreDe_(idItem) {
    var estado = window.Sitio.estado;
    var todos = [].concat(estado.catalogo.productos || [], estado.servicios.servicios || [], estado.servicios.planes || [], estado.servicios.packs || []);
    var f = todos.filter(function (x) { return (x.id_producto || x.id_servicio || x.id_plan || x.id_pack) === idItem; })[0];
    return f ? Render.campo(f, 'nombre', window.I18n ? I18n.idioma() : 'es') : idItem;
  }

  function render_() {
    var cont = document.getElementById('lineas-carrito');
    if (!cont) { return; }
    var items = leer();
    cont.innerHTML = items.map(function (i) {
      return '<div class="fila-carrito"><span>' + Render.esc(nombreDe_(i.id_item)) + ' x' + i.cantidad + '</span>' +
        '<button class="btn btn-secundario" data-quitar="' + Render.esc(i.id_item) + '" style="padding:6px 12px">' + I18n.t('quitar') + '</button></div>';
    }).join('') || '<p>' + I18n.t('carrito_vacio') + '</p>';
    cont.querySelectorAll('[data-quitar]').forEach(function (b) { b.addEventListener('click', function () { quitar(b.getAttribute('data-quitar')); }); });
    mostrarEstimadoEnvio_(items);
  }

  // Estimado informativo (el monto real y definitivo siempre lo calcula el servidor
  // al emitir la cotización/pedido). Solo aplica si hay algún producto físico en el carrito.
  function mostrarEstimadoEnvio_(items) {
    var nodo = document.getElementById('estimado-envio');
    if (!nodo) { return; }
    var c = window.Sitio.estado.config;
    var productos = window.Sitio.estado.catalogo.productos || [];
    var tieneFisico = items.some(function (i) {
      var p = productos.filter(function (x) { return x.id_producto === i.id_item; })[0];
      return p && p.tipo === 'fisico';
    });
    if (!tieneFisico) { nodo.textContent = ''; return; }
    var subtotalAprox = items.reduce(function (s, i) {
      var p = productos.filter(function (x) { return x.id_producto === i.id_item; })[0];
      return s + (p ? Number(p.precio_base) * i.cantidad : 0);
    }, 0);
    var gratisDesde = Number(c.envio_gratis_desde || 0);
    if (gratisDesde && subtotalAprox >= gratisDesde) { nodo.textContent = I18n.t('envio_gratis'); }
    else if (c.envio_costo_base) { nodo.textContent = I18n.t('envio_estimado', { monto: Number(c.envio_costo_base).toLocaleString('es-CL') }) + (gratisDesde ? I18n.t('envio_gratis_sobre', { monto: gratisDesde.toLocaleString('es-CL') }) : ''); }
    else { nodo.textContent = ''; }
  }

  async function solicitarCotizacion_() {
    var rut = document.getElementById('rut-cotizacion').value.trim();
    var msj = document.getElementById('mensaje-carrito');
    var items = leer();
    if (!rut) { msj.textContent = I18n.t('ingresa_rut'); return; }
    if (!items.length) { msj.textContent = I18n.t('carrito_vacio'); return; }
    msj.textContent = I18n.t('generando_cotizacion');
    try {
      var datos = await window.Sitio.llamarApi('cotizacion.crear', { id_cliente: rut, items: items });
      msj.innerHTML = I18n.t('cotizacion_enviada', { id: '<strong>' + Render.esc(datos.id_cotizacion) + '</strong>' }) + ' <a href="' + datos.url_pdf + '" target="_blank">' + I18n.t('ver_pdf') + '</a>.';
      guardar([]); actualizarContador_(); render_();
    } catch (e) {
      msj.textContent = I18n.t('error_cotizacion', { error: e.message });
    }
  }

  function iniciar() {
    actualizarContador_();
    var barra = document.getElementById('barra-carrito'), panel = document.getElementById('panel-carrito');
    if (barra) { barra.addEventListener('click', function () { render_(); panel.classList.add('abierto'); }); }
    var cerrar = document.getElementById('btn-cerrar-carrito');
    if (cerrar) { cerrar.addEventListener('click', function () { panel.classList.remove('abierto'); }); }
    var btnCotizar = document.getElementById('btn-cotizar');
    if (btnCotizar) { btnCotizar.addEventListener('click', solicitarCotizacion_); }
  }

  // Se llama después de pintar una grilla de productos con botones [data-agregar="ID"].
  function enlazarBotonesAgregar() {
    document.querySelectorAll('[data-agregar]').forEach(function (b) {
      b.addEventListener('click', function () { agregar(b.getAttribute('data-agregar'), 1); });
    });
  }

  return { iniciar: iniciar, agregar: agregar, enlazarBotonesAgregar: enlazarBotonesAgregar };
})();
