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

  function itemDe_(idItem) {
    var estado = window.Sitio.estado;
    var todos = [].concat(estado.catalogo.productos || [], estado.servicios.servicios || [], estado.servicios.planes || [], estado.servicios.packs || []);
    // Un Plan trae TANTO id_plan (su propia PK) COMO id_servicio (el servicio al que pertenece,
    // solo una referencia). Por eso id_plan/id_pack se comprueban antes que id_servicio acá — si
    // no, un id_plan como "PLN-000004" nunca calzaba porque el OR se quedaba en el id_servicio
    // de ESE plan (verdadero pero irrelevante) antes de llegar a compararlo con su propio id_plan.
    return todos.filter(function (x) { return (x.id_producto || x.id_plan || x.id_pack || x.id_servicio) === idItem; })[0] || null;
  }

  function nombreDe_(idItem) {
    var f = itemDe_(idItem);
    return f ? Render.campo(f, 'nombre', window.I18n ? I18n.idioma() : 'es') : idItem;
  }

  // Precio de REFERENCIA (el mismo dato ya publicado que ven las tarjetas de plan/producto) —
  // nunca el precio final: ese solo lo calcula el servidor al emitir la cotización (UF del día,
  // descuentos). Cada tipo de ítem guarda su precio en un campo distinto: producto → precio_base,
  // pack → precio_pack, servicio/plan → precio. Si el ítem no tiene precio publicado (p. ej. un
  // servicio "a medida" que siempre se cotiza a mano), se omite en vez de mostrar "$0".
  function precioDe_(idItem) {
    var f = itemDe_(idItem);
    if (!f) { return null; }
    var monto = f.id_producto ? f.precio_base : (f.id_pack ? f.precio_pack : f.precio);
    monto = Number(monto);
    if (!monto) { return null; }
    return { monto: monto, unidad: f.unidad_precio || 'CLP' };
  }

  function render_() {
    var cont = document.getElementById('lineas-carrito');
    if (!cont) { return; }
    var items = leer();
    cont.innerHTML = items.map(function (i) {
      var precio = precioDe_(i.id_item);
      var precioTxt = precio ? '<span class="fila-carrito-precio">' + Render.esc(Render.formatoPrecio(precio.monto, precio.unidad)) + '</span>' : '';
      return '<div class="fila-carrito"><span class="fila-carrito-nombre">' + Render.esc(nombreDe_(i.id_item)) + ' x' + i.cantidad + precioTxt + '</span>' +
        '<button class="btn btn-secundario" data-quitar="' + Render.esc(i.id_item) + '" style="padding:6px 12px">' + I18n.t('quitar') + '</button></div>';
    }).join('') || '<p>' + I18n.t('carrito_vacio') + '</p>';
    cont.querySelectorAll('[data-quitar]').forEach(function (b) { b.addEventListener('click', function () { quitar(b.getAttribute('data-quitar')); }); });
    mostrarEstimadoTotal_(items);
    mostrarEstimadoEnvio_(items);
  }

  // Antes esto era un "Total: $0" fijo en el HTML que NUNCA se actualizaba (ver index.html) —
  // el visitante agregaba un plan de $85.000 al carrito y el panel seguía mostrando $0 justo en
  // el momento de decidir si cotizar, lo peor posible para la conversión. Ahora se suma el precio
  // de referencia de cada línea, agrupado por moneda (nunca se mezclan CLP y UF en una sola suma),
  // y se deja clarísimo que es un estimado — el monto y la UF del día definitivos van en el PDF.
  function mostrarEstimadoTotal_(items) {
    var nodo = document.getElementById('total-carrito-estimado');
    if (!nodo) { return; }
    if (!items.length) { nodo.textContent = ''; return; }
    var porMoneda = {};
    var faltaAlguno = false;
    items.forEach(function (i) {
      var precio = precioDe_(i.id_item);
      if (!precio) { faltaAlguno = true; return; }
      porMoneda[precio.unidad] = (porMoneda[precio.unidad] || 0) + precio.monto * i.cantidad;
    });
    var partes = Object.keys(porMoneda).map(function (unidad) { return Render.formatoPrecio(porMoneda[unidad], unidad); });
    if (!partes.length) { nodo.textContent = I18n.t('estimado_a_cotizar'); return; }
    nodo.textContent = I18n.t('estimado_carrito', { monto: partes.join(' + ') }) + (faltaAlguno ? ' ' + I18n.t('estimado_incluye_a_medida') : '');
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

  // ANTES este panel solo pedía el RUT y el servidor exigía que ese RUT YA existiera como
  // Cliente — cualquier visitante nuevo (la gran mayoría) recibía "Cliente no encontrado" y el
  // flujo quedaba trabado ahí, sin explicación clara. Ahora se piden también nombre/correo/
  // teléfono (backend/13_Cotizaciones.gs crea el Cliente en el momento si el RUT es válido y
  // aún no existe) y se valida todo ANTES de llamar a la API, con el mismo criterio que el
  // servidor, para no descubrir el error recién al final.
  async function solicitarCotizacion_() {
    var campoNombre = document.getElementById('nombre-cotizacion');
    var campoEmail = document.getElementById('email-cotizacion');
    var campoTelefono = document.getElementById('telefono-cotizacion');
    var campoRut = document.getElementById('rut-cotizacion');
    var nombre = campoNombre.value.trim(), email = campoEmail.value.trim(), telefono = campoTelefono.value.trim();
    var rut = campoRut.value.trim();
    var msj = document.getElementById('mensaje-carrito');
    var items = leer();
    if (!items.length) { msj.textContent = I18n.t('carrito_vacio'); return; }
    var V = window.Validacion;
    if (!V.nombreValido(nombre)) { msj.textContent = I18n.t('nombre_invalido'); campoNombre.focus(); return; }
    if (!V.emailValido(email)) { msj.textContent = I18n.t('email_invalido'); campoEmail.focus(); return; }
    if (!V.telefonoValido(telefono)) { msj.textContent = I18n.t('telefono_invalido'); campoTelefono.focus(); return; }
    if (!rut) { msj.textContent = I18n.t('ingresa_rut'); campoRut.focus(); return; }
    if (!V.rutValido(rut)) { msj.textContent = I18n.t('rut_invalido'); campoRut.focus(); return; }
    msj.textContent = I18n.t('generando_cotizacion');
    try {
      var datos = await window.Sitio.llamarApi('cotizacion.crear', { id_cliente: rut, nombre: nombre, email: email, telefono: telefono, items: items });
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
    if (window.Validacion) {
      window.Validacion.enlazarValidacion(document.getElementById('nombre-cotizacion'), window.Validacion.nombreValido, I18n.t('nombre_invalido'));
      window.Validacion.enlazarValidacion(document.getElementById('email-cotizacion'), window.Validacion.emailValido, I18n.t('email_invalido'));
      window.Validacion.enlazarValidacion(document.getElementById('telefono-cotizacion'), window.Validacion.telefonoValido, I18n.t('telefono_invalido'));
      window.Validacion.enlazarValidacion(document.getElementById('rut-cotizacion'), window.Validacion.rutValido, I18n.t('rut_invalido'));
    }
  }

  // Se llama después de pintar una grilla de productos con botones [data-agregar="ID"].
  function enlazarBotonesAgregar() {
    document.querySelectorAll('[data-agregar]').forEach(function (b) {
      b.addEventListener('click', function () { agregar(b.getAttribute('data-agregar'), 1); });
    });
  }

  return { iniciar: iniciar, agregar: agregar, enlazarBotonesAgregar: enlazarBotonesAgregar, render: render_ };
})();
