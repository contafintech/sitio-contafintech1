/* ============================================================================
 * agendamiento.js — Asistente de agendamiento ("Agendar hora"), un paso a la
 * vez, pensado para que lo pueda usar cualquier persona sin experiencia con
 * sitios web (botones grandes, un solo paso visible por pantalla, texto claro,
 * siempre se puede volver atrás). Llama a las mismas acciones que ya existían
 * en el backend (reserva.disponibilidad, reserva.crear) — esto es la primera
 * interfaz que las usa; antes no tenían ningún consumidor en el sitio.
 * ========================================================================== */

window.Agendamiento = (function () {
  var estadoPaso = {
    paso: 1, servicio: null, sede: null, fecha: '', hora: null,
    nombre: '', email: '', telefono: '', rut: ''
  };

  function esc_(s) { var d = document.createElement('div'); d.textContent = (s === undefined || s === null) ? '' : String(s); return d.innerHTML; }
  function serviciosAgendables_() { return (window.Sitio.estado.servicios.servicios || []).filter(function (s) { return s.requiere_agenda === true || s.requiere_agenda === 'TRUE'; }); }
  function sedesActivas_() { return window.Sitio.estado.servicios.sedes || []; }
  function totalPasos_() { return sedesActivas_().length > 1 ? 6 : 5; }
  function numeroVisible_(paso) {
    // Si solo hay 0-1 sede, el paso "elegir sede" se salta — pero seguimos contando en
    // estadoPaso.paso con 6 posiciones internas fijas, así el resto del código no cambia.
    if (sedesActivas_().length > 1) { return paso; }
    return paso > 2 ? paso - 1 : paso;
  }

  function montar(raiz) {
    var contenedor = (raiz || document).querySelector('#agendamiento-widget');
    if (!contenedor) { return; }
    estadoPaso = { paso: 1, servicio: null, sede: sedesActivas_().length === 1 ? sedesActivas_()[0] : null, fecha: '', hora: null, nombre: '', email: '', telefono: '', rut: '' };
    pintar_(contenedor);
  }

  function encabezadoPaso_(tituloClave) {
    return (
      '<p class="agenda-paso-indicador">' + I18n.t('agenda_paso_de', { actual: numeroVisible_(estadoPaso.paso), total: totalPasos_() }) + '</p>' +
      '<h3 class="agenda-paso-titulo">' + I18n.t(tituloClave) + '</h3>'
    );
  }

  function botonAtras_() {
    return '<button type="button" class="btn btn-secundario agenda-btn-atras" id="agenda-atras">' + I18n.t('agenda_atras') + '</button>';
  }

  function pintar_(contenedor) {
    var html = '';
    if (estadoPaso.paso === 1) { html = pasoServicio_(); }
    else if (estadoPaso.paso === 2 && sedesActivas_().length > 1) { html = pasoSede_(); }
    else if (estadoPaso.paso === 3) { html = pasoFecha_(); }
    else if (estadoPaso.paso === 4) { html = pasoHora_(); }
    else if (estadoPaso.paso === 5) { html = pasoDatos_(); }
    else if (estadoPaso.paso === 6) { html = pasoConfirmar_(); }
    contenedor.innerHTML = html;
    enlazarEventos_(contenedor);
  }

  function avanzar_(contenedor, saltarSede) {
    if (estadoPaso.paso === 1 && sedesActivas_().length <= 1) { estadoPaso.paso = 3; }
    else { estadoPaso.paso++; }
    pintar_(contenedor);
  }
  function retroceder_(contenedor) {
    if (estadoPaso.paso === 3 && sedesActivas_().length <= 1) { estadoPaso.paso = 1; }
    else { estadoPaso.paso--; }
    pintar_(contenedor);
  }

  // ---- Paso 1: servicio ----
  function pasoServicio_() {
    var servicios = serviciosAgendables_();
    if (!servicios.length) { return '<p class="agenda-vacio">' + I18n.t('agenda_sin_servicios') + '</p>'; }
    var tarjetas = servicios.map(function (s) {
      return (
        '<button type="button" class="agenda-opcion-grande" data-servicio="' + esc_(s.id_servicio) + '">' +
        '<span class="agenda-opcion-titulo">' + esc_(s.nombre) + '</span>' +
        '<span class="agenda-opcion-detalle">' + esc_(I18n.t('agenda_duracion', { min: s.duracion_min })) + '</span>' +
        '</button>'
      );
    }).join('');
    return encabezadoPaso_('agenda_paso1_titulo') + '<div class="agenda-opciones-grid">' + tarjetas + '</div>';
  }

  // ---- Paso 2: sede ----
  function pasoSede_() {
    var tarjetas = sedesActivas_().map(function (s) {
      return (
        '<button type="button" class="agenda-opcion-grande" data-sede="' + esc_(s.id_sede) + '">' +
        '<span class="agenda-opcion-titulo">' + esc_(s.nombre) + '</span>' +
        (s.direccion ? '<span class="agenda-opcion-detalle">' + esc_(s.direccion) + '</span>' : '') +
        '</button>'
      );
    }).join('');
    return encabezadoPaso_('agenda_paso2_titulo') + '<div class="agenda-opciones-grid">' + tarjetas + '</div>' + botonAtras_();
  }

  // ---- Paso 3: fecha ----
  function pasoFecha_() {
    var hoy = new Date().toISOString().slice(0, 10);
    return (
      encabezadoPaso_('agenda_paso3_titulo') +
      '<div class="campo agenda-campo-grande">' +
      '<label for="agenda-fecha">' + I18n.t('agenda_elegir_fecha') + '</label>' +
      '<input type="date" id="agenda-fecha" min="' + hoy + '" value="' + esc_(estadoPaso.fecha || hoy) + '">' +
      '</div>' +
      '<button type="button" class="btn btn-primario btn-bloque agenda-btn-grande" id="agenda-buscar-horas">' + I18n.t('agenda_buscar_horas') + '</button>' +
      botonAtras_()
    );
  }

  // ---- Paso 4: hora ----
  function pasoHora_() {
    return encabezadoPaso_('agenda_paso4_titulo') + '<div id="agenda-horas-resultado"><p class="agenda-cargando">' + I18n.t('agenda_buscando_horas') + '</p></div>' + botonAtras_();
  }

  async function cargarHoras_(contenedor) {
    var nodo = contenedor.querySelector('#agenda-horas-resultado');
    try {
      var horas = await window.Sitio.llamarApi('reserva.disponibilidad', {
        id_servicio: estadoPaso.servicio.id_servicio, fecha: estadoPaso.fecha, id_sede: estadoPaso.sede ? estadoPaso.sede.id_sede : ''
      });
      if (!horas.length) { nodo.innerHTML = '<p class="agenda-vacio">' + I18n.t('agenda_sin_horas') + '</p>'; return; }
      var botones = horas.map(function (h) {
        var fecha = new Date(h.inicio);
        var etiqueta = fecha.toLocaleTimeString(I18n.idioma() === 'en' ? 'en-US' : 'es-CL', { hour: '2-digit', minute: '2-digit' });
        return '<button type="button" class="agenda-hora-boton" data-inicio="' + esc_(h.inicio) + '" data-fin="' + esc_(h.fin) + '" data-profesional="' + esc_(h.id_profesional) + '">' + esc_(etiqueta) + '</button>';
      }).join('');
      nodo.innerHTML = '<div class="agenda-horas-grid">' + botones + '</div>';
    } catch (e) {
      nodo.innerHTML = '<p class="seguimiento-error">' + I18n.t('agenda_error', { error: e.message }) + '</p>';
    }
  }

  // ---- Paso 5: datos de contacto ----
  function pasoDatos_() {
    return (
      encabezadoPaso_('agenda_paso5_titulo') +
      '<form id="agenda-form-datos" class="agenda-form-datos">' +
      '<div class="campo agenda-campo-grande"><label for="agenda-nombre">' + I18n.t('agenda_campo_nombre') + '</label><input type="text" id="agenda-nombre" value="' + esc_(estadoPaso.nombre) + '" autocomplete="name" required></div>' +
      '<div class="campo agenda-campo-grande"><label for="agenda-email">' + I18n.t('agenda_campo_email') + '</label><input type="email" id="agenda-email" value="' + esc_(estadoPaso.email) + '" autocomplete="email" required></div>' +
      '<div class="campo agenda-campo-grande"><label for="agenda-telefono">' + I18n.t('agenda_campo_telefono') + '</label><input type="tel" id="agenda-telefono" value="' + esc_(estadoPaso.telefono) + '" autocomplete="tel"></div>' +
      '<div class="campo agenda-campo-grande"><label for="agenda-rut">' + I18n.t('agenda_campo_rut') + '</label><input type="text" id="agenda-rut" value="' + esc_(estadoPaso.rut) + '" placeholder="12345678-9" autocomplete="off" required></div>' +
      '<button type="submit" class="btn btn-primario btn-bloque agenda-btn-grande">' + I18n.t('agenda_continuar') + '</button>' +
      '</form>' + botonAtras_()
    );
  }

  // ---- Paso 6: confirmar ----
  function pasoConfirmar_() {
    var depositoActivo = window.Sitio.estado.config.agenda_deposito_activo === true || window.Sitio.estado.config.agenda_deposito_activo === 'TRUE';
    var pct = Number(window.Sitio.estado.config.agenda_deposito_pct || 0.2);
    var s = estadoPaso.servicio;
    var moneda = s.unidad_precio === 'UF' ? 'UF' : 'CLP';
    var monto = moneda === 'UF' ? Math.round(Number(s.precio || 0) * pct * 100) / 100 : Math.round(Number(s.precio || 0) * pct);
    var montoTxt = moneda === 'UF' ? monto.toLocaleString('es-CL') + ' UF' : '$' + monto.toLocaleString('es-CL');
    var fechaTxt = new Date(estadoPaso.hora.inicio).toLocaleString(I18n.idioma() === 'en' ? 'en-US' : 'es-CL', { dateStyle: 'full', timeStyle: 'short' });
    return (
      encabezadoPaso_('agenda_paso6_titulo') +
      '<div class="agenda-resumen">' +
      '<p><strong>' + I18n.t('agenda_resumen_servicio') + ':</strong> ' + esc_(s.nombre) + '</p>' +
      (estadoPaso.sede ? '<p><strong>' + I18n.t('agenda_resumen_sede') + ':</strong> ' + esc_(estadoPaso.sede.nombre) + '</p>' : '') +
      '<p><strong>' + I18n.t('agenda_resumen_fecha_hora') + ':</strong> ' + esc_(fechaTxt) + '</p>' +
      '<p class="agenda-resumen-abono">' + (depositoActivo ? esc_(I18n.t('agenda_resumen_abono', { monto: montoTxt })) : esc_(I18n.t('agenda_resumen_sin_costo'))) + '</p>' +
      '</div>' +
      '<button type="button" class="btn btn-primario btn-bloque agenda-btn-grande" id="agenda-confirmar">' + I18n.t('agenda_confirmar_boton') + '</button>' +
      '<div id="agenda-resultado" aria-live="polite"></div>' +
      botonAtras_()
    );
  }

  function enlazarEventos_(contenedor) {
    var atras = contenedor.querySelector('#agenda-atras');
    if (atras) { atras.addEventListener('click', function () { retroceder_(contenedor); }); }

    contenedor.querySelectorAll('[data-servicio]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        estadoPaso.servicio = serviciosAgendables_().filter(function (s) { return s.id_servicio === btn.getAttribute('data-servicio'); })[0];
        estadoPaso.paso = 2;
        pintar_(contenedor);
      });
    });
    contenedor.querySelectorAll('[data-sede]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        estadoPaso.sede = sedesActivas_().filter(function (s) { return s.id_sede === btn.getAttribute('data-sede'); })[0];
        estadoPaso.paso = 3;
        pintar_(contenedor);
      });
    });
    var buscarHoras = contenedor.querySelector('#agenda-buscar-horas');
    if (buscarHoras) {
      buscarHoras.addEventListener('click', function () {
        estadoPaso.fecha = contenedor.querySelector('#agenda-fecha').value;
        if (!estadoPaso.fecha) { return; }
        estadoPaso.paso = 4;
        pintar_(contenedor);
        cargarHoras_(contenedor);
      });
    }
    contenedor.addEventListener('click', function (ev) {
      var btn = ev.target.closest('.agenda-hora-boton');
      if (!btn) { return; }
      estadoPaso.hora = { inicio: btn.getAttribute('data-inicio'), fin: btn.getAttribute('data-fin'), id_profesional: btn.getAttribute('data-profesional') };
      estadoPaso.paso = 5;
      pintar_(contenedor);
    });
    var formDatos = contenedor.querySelector('#agenda-form-datos');
    if (formDatos) {
      formDatos.addEventListener('submit', function (ev) {
        ev.preventDefault();
        estadoPaso.nombre = contenedor.querySelector('#agenda-nombre').value.trim();
        estadoPaso.email = contenedor.querySelector('#agenda-email').value.trim();
        estadoPaso.telefono = contenedor.querySelector('#agenda-telefono').value.trim();
        estadoPaso.rut = contenedor.querySelector('#agenda-rut').value.trim();
        if (!window.Validacion.nombreValido(estadoPaso.nombre) || !window.Validacion.emailValido(estadoPaso.email) || !window.Validacion.rutValido(estadoPaso.rut)) {
          // Reutiliza el mismo mecanismo de mensaje inline que el resto del sitio en vez de un alert().
          [['#agenda-nombre', window.Validacion.nombreValido(estadoPaso.nombre)], ['#agenda-email', window.Validacion.emailValido(estadoPaso.email)], ['#agenda-rut', window.Validacion.rutValido(estadoPaso.rut)]]
            .forEach(function (par) { contenedor.querySelector(par[0]).classList.toggle('campo-invalido', !par[1]); });
          return;
        }
        estadoPaso.paso = 6;
        pintar_(contenedor);
      });
    }
    var confirmar = contenedor.querySelector('#agenda-confirmar');
    if (confirmar) {
      confirmar.addEventListener('click', async function () {
        var resultadoNodo = contenedor.querySelector('#agenda-resultado');
        confirmar.disabled = true;
        resultadoNodo.innerHTML = '<p class="agenda-cargando">' + I18n.t('agenda_confirmando') + '</p>';
        try {
          var r = await window.Sitio.llamarApi('reserva.crear', {
            id_servicio: estadoPaso.servicio.id_servicio, id_profesional: estadoPaso.hora.id_profesional,
            id_sede: estadoPaso.sede ? estadoPaso.sede.id_sede : '', inicio: estadoPaso.hora.inicio,
            id_cliente: estadoPaso.rut, nombre: estadoPaso.nombre, email: estadoPaso.email, telefono: estadoPaso.telefono
          });
          var moneda = r.moneda_abono === 'UF' ? 'UF' : 'CLP';
          var montoTxt = r.monto_abono ? (moneda === 'UF' ? Number(r.monto_abono).toLocaleString('es-CL') + ' UF' : '$' + Number(r.monto_abono).toLocaleString('es-CL')) : '';
          resultadoNodo.innerHTML = '<p class="agenda-exito">' + (r.requiere_abono ? esc_(I18n.t('agenda_exito_pendiente', { monto: montoTxt })) : esc_(I18n.t('agenda_exito_confirmada'))) + '</p>' +
            '<button type="button" class="btn btn-secundario btn-bloque" id="agenda-otra">' + I18n.t('agenda_agendar_otra') + '</button>';
          contenedor.querySelector('#agenda-otra').addEventListener('click', function () { montar(contenedor.closest('#contenido-pagina') || document); });
        } catch (e) {
          resultadoNodo.innerHTML = '<p class="seguimiento-error">' + I18n.t('agenda_error', { error: e.message }) + '</p>';
          confirmar.disabled = false;
        }
      });
    }
  }

  return { montar: montar };
})();
