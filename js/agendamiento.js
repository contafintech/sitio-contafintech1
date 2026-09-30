/* ============================================================================
 * agendamiento.js — Asistente de agendamiento ("Agendar hora"), un paso a la
 * vez, pensado para que lo pueda usar cualquier persona sin experiencia con
 * sitios web (botones grandes, un solo paso visible por pantalla, texto claro,
 * siempre se puede volver atrás), incluidas personas mayores de 50 años.
 *
 * Fecha y hora: TODA la interfaz muestra las horas en huso horario de Chile
 * (America/Santiago) usando la API nativa Intl del navegador (timeZone:
 * 'America/Santiago'), nunca la hora local del dispositivo de quien visita —
 * así el horario que ve un cliente agendando desde el extranjero es siempre
 * el mismo que ve el profesional en Chile, sin cálculos manuales de horario
 * de verano ni depender de ningún servicio externo (solución nativa, costo
 * cero). El backend hace exactamente lo mismo con Utilities (09_Reservas.gs).
 * ========================================================================== */

window.Agendamiento = (function () {
  var estadoPaso = {
    paso: 1, servicio: null, sede: null, fecha: '', hora: null,
    nombre: '', email: '', telefono: '', rut: '',
    mesVisto: null, diasConAtencion: null
  };

  var ZONA_CL = 'America/Santiago';

  function esc_(s) { var d = document.createElement('div'); d.textContent = (s === undefined || s === null) ? '' : String(s); return d.innerHTML; }
  function localeActual_() { return I18n.idioma() === 'en' ? 'en-US' : (I18n.idioma() === 'zh' ? 'zh-CN' : 'es-CL'); }
  function serviciosAgendables_() { return (window.Sitio.estado.servicios.servicios || []).filter(function (s) { return s.requiere_agenda === true || s.requiere_agenda === 'TRUE'; }); }
  function sedesActivas_() { return window.Sitio.estado.servicios.sedes || []; }
  function totalPasos_() { return sedesActivas_().length > 1 ? 5 : 4; }
  function numeroVisible_(paso) {
    // Si solo hay 0-1 sede, el paso "elegir sede" se salta — pero seguimos contando en
    // estadoPaso.paso con 5 posiciones internas fijas, así el resto del código no cambia.
    if (sedesActivas_().length > 1) { return paso; }
    return paso > 2 ? paso - 1 : paso;
  }

  // YYYY-MM-DD de una fecha en huso de Chile, sin pasar por el huso local del navegador.
  function fechaLocalCL_(date) {
    var partes = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_CL, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
      .reduce(function (a, p) { a[p.type] = p.value; return a; }, {});
    return partes.year + '-' + partes.month + '-' + partes.day;
  }
  // Nombre de día en español (domingo..sabado), igual que el backend, a partir de una fecha
  // "de calendario" (sin componente horario relevante) usando su día en huso de Chile.
  var DIAS_ = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
  function diaSemanaCL_(date) {
    var nombre = new Intl.DateTimeFormat('en-US', { timeZone: ZONA_CL, weekday: 'long' }).format(date).toLowerCase();
    var mapa = { sunday: 'domingo', monday: 'lunes', tuesday: 'martes', wednesday: 'miercoles', thursday: 'jueves', friday: 'viernes', saturday: 'sabado' };
    return mapa[nombre] || DIAS_[date.getDay()];
  }
  function nombresDiaCorto_() {
    // Lunes a domingo (convención chilena), en el idioma activo — generado con Intl, no hardcodeado.
    var base = Date.UTC(2024, 0, 1); // lunes 1/1/2024 UTC, para no depender del huso del navegador
    var out = [];
    for (var i = 0; i < 7; i++) { out.push(new Intl.DateTimeFormat(localeActual_(), { weekday: 'short', timeZone: 'UTC' }).format(new Date(base + i * 86400000))); }
    return out;
  }

  function montar(raiz) {
    var contenedor = (raiz || document).querySelector('#agendamiento-widget');
    if (!contenedor) { return; }
    estadoPaso = {
      paso: 1, servicio: null, sede: sedesActivas_().length === 1 ? sedesActivas_()[0] : null,
      fecha: '', hora: null, nombre: '', email: '', telefono: '', rut: '',
      mesVisto: new Date(), diasConAtencion: null
    };
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

  // Antes: si CUALQUIER paso lanzaba una excepción al construir su HTML (un dato inesperado,
  // un elemento del DOM que no aparece todavía, etc.), esa excepción se propagaba sin capturar y
  // el widget quedaba en blanco —o con el contenido del paso anterior— sin ninguna pista de qué
  // pasó, ni para quien agenda ni para quien administra el sitio. Ahora cualquier error al pintar
  // un paso se muestra como un mensaje claro con un botón para reintentar o volver a partir del
  // paso 1, en vez de una pantalla en blanco silenciosa.
  function pintar_(contenedor) {
    try {
      var html = '';
      if (estadoPaso.paso === 1) { html = pasoServicio_(); }
      else if (estadoPaso.paso === 2 && sedesActivas_().length > 1) { html = pasoSede_(); }
      else if (estadoPaso.paso === 3) { html = pasoFechaHora_(); }
      else if (estadoPaso.paso === 4) { html = pasoDatos_(); }
      else if (estadoPaso.paso === 5) { html = pasoConfirmar_(); }
      contenedor.innerHTML = html;
      enlazarEventos_(contenedor);
      if (estadoPaso.paso === 3) { prepararPasoFechaHora_(contenedor); }
    } catch (e) {
      if (window.console && console.error) { console.error('Agendamiento: error al pintar el paso ' + estadoPaso.paso + ':', e); }
      pintarError_(contenedor);
    }
  }

  function pintarError_(contenedor) {
    contenedor.innerHTML = (
      '<p class="agenda-vacio">' + I18n.t('agenda_error_paso') + '</p>' +
      '<button type="button" class="btn btn-secundario agenda-btn-grande" id="agenda-reintentar">' + I18n.t('agenda_reintentar') + '</button>' +
      '<button type="button" class="btn btn-primario btn-bloque agenda-btn-grande" id="agenda-empezar-de-nuevo">' + I18n.t('agenda_empezar_de_nuevo') + '</button>'
    );
    var btnReintentar = contenedor.querySelector('#agenda-reintentar');
    if (btnReintentar) { btnReintentar.addEventListener('click', function () { pintar_(contenedor); }); }
    var btnEmpezar = contenedor.querySelector('#agenda-empezar-de-nuevo');
    if (btnEmpezar) { btnEmpezar.addEventListener('click', function () { montar(contenedor.closest('#contenido-pagina') || document); }); }
  }

  function avanzar_(contenedor) {
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

  // ---- Paso 3: calendario visual + horas del día elegido, en un solo paso (estilo agenda
  // profesional moderna: se ve el mes completo, los días cerrados quedan apagados de una, y al
  // tocar un día aparecen sus horas debajo sin recargar nada). ----
  function pasoFechaHora_() {
    return (
      encabezadoPaso_('agenda_paso3_titulo') +
      '<div class="agenda-calendario" id="agenda-calendario">' +
      '<p class="agenda-cargando">' + I18n.t('agenda_buscando_horas') + '</p>' +
      '</div>' +
      '<div id="agenda-horas-resultado" class="agenda-horas-panel"></div>' +
      botonAtras_()
    );
  }

  async function prepararPasoFechaHora_(contenedor) {
    if (!estadoPaso.diasConAtencion) {
      try {
        estadoPaso.diasConAtencion = await window.Sitio.llamarApi('reserva.diasConAtencion', {
          id_servicio: estadoPaso.servicio.id_servicio, id_sede: estadoPaso.sede ? estadoPaso.sede.id_sede : ''
        });
      } catch (e) { estadoPaso.diasConAtencion = []; }
    }
    dibujarCalendario_(contenedor);
    if (estadoPaso.fecha) { cargarHoras_(contenedor); }
  }

  function dibujarCalendario_(contenedor) {
    var nodo = contenedor.querySelector('#agenda-calendario');
    if (!nodo) { return; }
    if (!estadoPaso.diasConAtencion || !estadoPaso.diasConAtencion.length) {
      nodo.innerHTML = '<p class="agenda-vacio">' + I18n.t('agenda_sin_horario') + '</p>';
      return;
    }
    var mes = estadoPaso.mesVisto;
    var primerDiaMes = new Date(mes.getFullYear(), mes.getMonth(), 1);
    var ultimoDiaMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
    // Lunes = 0 ... domingo = 6 (convención chilena de calendario)
    var offsetInicial = (primerDiaMes.getDay() + 6) % 7;
    var hoyStr = fechaLocalCL_(new Date());
    var celdas = '';
    for (var i = 0; i < offsetInicial; i++) { celdas += '<span class="agenda-cal-dia agenda-cal-vacio" aria-hidden="true"></span>'; }
    for (var d = 1; d <= ultimoDiaMes.getDate(); d++) {
      var fechaCelda = new Date(mes.getFullYear(), mes.getMonth(), d);
      var fechaStr = fechaLocalCL_(fechaCelda);
      var cerrado = estadoPaso.diasConAtencion.indexOf(diaSemanaCL_(fechaCelda)) === -1;
      var pasado = fechaStr < hoyStr;
      var deshabilitado = cerrado || pasado;
      var clases = 'agenda-cal-dia' + (deshabilitado ? ' agenda-cal-dia-deshabilitado' : '') + (fechaStr === estadoPaso.fecha ? ' agenda-cal-dia-elegido' : '') + (fechaStr === hoyStr ? ' agenda-cal-dia-hoy' : '');
      celdas += '<button type="button" class="' + clases + '" data-fecha="' + fechaStr + '"' + (deshabilitado ? ' disabled aria-disabled="true"' : '') + '>' + d + '</button>';
    }
    var tituloMes = new Intl.DateTimeFormat(localeActual_(), { month: 'long', year: 'numeric', timeZone: ZONA_CL }).format(mes);
    var hoy = new Date();
    var esMesActual = mes.getFullYear() === hoy.getFullYear() && mes.getMonth() === hoy.getMonth();
    nodo.innerHTML = (
      '<div class="agenda-cal-header">' +
      '<button type="button" id="agenda-mes-atras" class="agenda-cal-nav" aria-label="' + esc_(I18n.t('agenda_mes_anterior')) + '"' + (esMesActual ? ' disabled' : '') + '>‹</button>' +
      '<span class="agenda-cal-titulo">' + esc_(tituloMes.charAt(0).toUpperCase() + tituloMes.slice(1)) + '</span>' +
      '<button type="button" id="agenda-mes-adelante" class="agenda-cal-nav" aria-label="' + esc_(I18n.t('agenda_mes_siguiente')) + '">›</button>' +
      '</div>' +
      '<div class="agenda-cal-dias-semana">' + nombresDiaCorto_().map(function (n) { return '<span>' + esc_(n) + '</span>'; }).join('') + '</div>' +
      '<div class="agenda-cal-grid">' + celdas + '</div>'
    );
  }

  async function cargarHoras_(contenedor) {
    var nodo = contenedor.querySelector('#agenda-horas-resultado');
    nodo.innerHTML = '<p class="agenda-cargando">' + I18n.t('agenda_buscando_horas') + '</p>';
    try {
      var horas = await window.Sitio.llamarApi('reserva.disponibilidad', {
        id_servicio: estadoPaso.servicio.id_servicio, fecha: estadoPaso.fecha, id_sede: estadoPaso.sede ? estadoPaso.sede.id_sede : ''
      });
      if (!horas.length) { nodo.innerHTML = '<p class="agenda-vacio">' + I18n.t('agenda_sin_horas') + '</p>'; return; }
      function grupo(titulo, lista) {
        if (!lista.length) { return ''; }
        var botones = lista.map(function (h) {
          var etiqueta = new Date(h.inicio).toLocaleTimeString(localeActual_(), { hour: '2-digit', minute: '2-digit', timeZone: ZONA_CL });
          return '<button type="button" class="agenda-hora-boton" data-inicio="' + esc_(h.inicio) + '" data-fin="' + esc_(h.fin) + '" data-profesional="' + esc_(h.id_profesional) + '">' + esc_(etiqueta) + '</button>';
        }).join('');
        return '<p class="agenda-horas-grupo-titulo">' + esc_(titulo) + '</p><div class="agenda-horas-grid">' + botones + '</div>';
      }
      // Mañana/tarde según la hora LOCAL DE CHILE del inicio (nunca la del dispositivo).
      var manana = [], tarde = [];
      horas.forEach(function (h) {
        var horaCL = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: ZONA_CL }).format(new Date(h.inicio)));
        (horaCL < 14 ? manana : tarde).push(h);
      });
      nodo.innerHTML = grupo(I18n.t('agenda_manana'), manana) + grupo(I18n.t('agenda_tarde'), tarde);
    } catch (e) {
      nodo.innerHTML = '<p class="seguimiento-error">' + I18n.t('agenda_error', { error: e.message }) + '</p>';
    }
  }

  // ---- Paso 4: datos de contacto ----
  function pasoDatos_() {
    return (
      encabezadoPaso_('agenda_paso4_titulo') +
      '<form id="agenda-form-datos" class="agenda-form-datos">' +
      '<div class="campo agenda-campo-grande"><label for="agenda-nombre">' + I18n.t('agenda_campo_nombre') + '</label><input type="text" id="agenda-nombre" value="' + esc_(estadoPaso.nombre) + '" autocomplete="name" required></div>' +
      '<div class="campo agenda-campo-grande"><label for="agenda-email">' + I18n.t('agenda_campo_email') + '</label><input type="email" id="agenda-email" value="' + esc_(estadoPaso.email) + '" autocomplete="email" required></div>' +
      '<div class="campo agenda-campo-grande"><label for="agenda-telefono">' + I18n.t('agenda_campo_telefono') + '</label><input type="tel" id="agenda-telefono" value="' + esc_(estadoPaso.telefono) + '" autocomplete="tel"></div>' +
      '<div class="campo agenda-campo-grande"><label for="agenda-rut">' + I18n.t('agenda_campo_rut') + '</label><input type="text" id="agenda-rut" value="' + esc_(estadoPaso.rut) + '" placeholder="12345678-9" autocomplete="off" required></div>' +
      '<button type="submit" class="btn btn-primario btn-bloque agenda-btn-grande">' + I18n.t('agenda_continuar') + '</button>' +
      '</form>' + botonAtras_()
    );
  }

  // ---- Paso 5: confirmar ----
  function pasoConfirmar_() {
    var depositoActivo = window.Sitio.estado.config.agenda_deposito_activo === true || window.Sitio.estado.config.agenda_deposito_activo === 'TRUE';
    var pct = Number(window.Sitio.estado.config.agenda_deposito_pct || 0.2);
    var s = estadoPaso.servicio;
    var moneda = s.unidad_precio === 'UF' ? 'UF' : 'CLP';
    var monto = moneda === 'UF' ? Math.round(Number(s.precio || 0) * pct * 100) / 100 : Math.round(Number(s.precio || 0) * pct);
    var montoTxt = moneda === 'UF' ? monto.toLocaleString('es-CL') + ' UF' : '$' + monto.toLocaleString('es-CL');
    var fechaTxt = new Date(estadoPaso.hora.inicio).toLocaleString(localeActual_(), { dateStyle: 'full', timeStyle: 'short', timeZone: ZONA_CL });
    return (
      encabezadoPaso_('agenda_paso5_titulo') +
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
        estadoPaso.diasConAtencion = null; // depende del servicio elegido, se vuelve a pedir
        estadoPaso.fecha = ''; estadoPaso.hora = null;
        // Si solo hay 0-1 sede activa, el paso "elegir sede" no existe: hay que saltar directo al
        // paso 3 (fecha y hora), nunca dejar estadoPaso.paso en 2 o la pantalla queda en blanco.
        estadoPaso.paso = sedesActivas_().length > 1 ? 2 : 3;
        pintar_(contenedor);
      });
    });
    contenedor.querySelectorAll('[data-sede]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        estadoPaso.sede = sedesActivas_().filter(function (s) { return s.id_sede === btn.getAttribute('data-sede'); })[0];
        estadoPaso.diasConAtencion = null; // depende de la sede elegida, se vuelve a pedir
        estadoPaso.fecha = ''; estadoPaso.hora = null;
        estadoPaso.paso = 3;
        pintar_(contenedor);
      });
    });

    // El calendario se redibuja solo (dibujarCalendario_), sin volver a pasar por pintar_/
    // enlazarEventos_ — por eso su navegación y sus días usan delegación de eventos sobre
    // "contenedor" en vez de listeners directos en cada botón, que quedarían huérfanos apenas el
    // calendario se vuelve a dibujar. OJO: enlazarEventos_() se llama en CADA pintar_() (paso 1,
    // 2, 3, 4, 5), así que sin esta guarda el listener delegado de abajo se registraba una vez
    // más por cada paso — al llegar al calendario ya había 2-3 copias apiladas sobre el mismo
    // "contenedor" (nunca se destruye entre pasos), y cada clic en un día/hora disparaba la
    // acción esa cantidad de veces (varias llamadas a la API de disponibilidad por un solo clic,
    // el paso avanzando de más). Se registra una única vez por "contenedor" real.
    if (!contenedor.dataset.agendaEventosDelegadosListos) {
      contenedor.dataset.agendaEventosDelegadosListos = '1';
      contenedor.addEventListener('click', function (ev) {
      var horaBtn = ev.target.closest('.agenda-hora-boton');
      if (horaBtn) {
        estadoPaso.hora = { inicio: horaBtn.getAttribute('data-inicio'), fin: horaBtn.getAttribute('data-fin'), id_profesional: horaBtn.getAttribute('data-profesional') };
        estadoPaso.paso = 4;
        pintar_(contenedor);
        return;
      }
      var diaBtn = ev.target.closest('.agenda-cal-dia[data-fecha]');
      if (diaBtn && !diaBtn.disabled) {
        estadoPaso.fecha = diaBtn.getAttribute('data-fecha');
        estadoPaso.hora = null;
        dibujarCalendario_(contenedor);
        cargarHoras_(contenedor);
        return;
      }
      if (ev.target.closest('#agenda-mes-atras')) {
        estadoPaso.mesVisto = new Date(estadoPaso.mesVisto.getFullYear(), estadoPaso.mesVisto.getMonth() - 1, 1);
        dibujarCalendario_(contenedor);
        return;
      }
      if (ev.target.closest('#agenda-mes-adelante')) {
        estadoPaso.mesVisto = new Date(estadoPaso.mesVisto.getFullYear(), estadoPaso.mesVisto.getMonth() + 1, 1);
        dibujarCalendario_(contenedor);
      }
      });
    }
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
        estadoPaso.paso = 5;
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
