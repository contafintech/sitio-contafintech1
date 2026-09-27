/* ============================================================================
 * herramientas.js — Motor de cálculo de la página "Herramientas" (calculadoras)
 * ----------------------------------------------------------------------------
 * El sitio sigue siendo estático: todo el cálculo corre acá, en el navegador,
 * usando los parámetros publicados en data/herramientas.json (que a su vez
 * vienen del Libro de Herramientas — un Google Sheet separado del comercial,
 * ver backend/10_Herramientas.gs). No hay ida y vuelta al servidor por cada
 * cálculo — mismo criterio de costo/velocidad que el resto del sitio.
 *
 * IMPORTANTE: estas calculadoras son una ESTIMACIÓN de apoyo comercial (para
 * conversar con el cliente y cotizar), no un cálculo tributario/legal
 * definitivo — los parámetros de ejemplo del Libro de Herramientas deben
 * reemplazarse por valores vigentes, y casos particulares (gratificación,
 * causales especiales de despido, rentas variables, etc.) pueden requerir
 * revisión profesional caso a caso.
 * ========================================================================== */

window.Herramientas = (function () {
  function datos_() { return (window.Sitio && window.Sitio.estado.herramientas) || { disponible: false }; }
  function parametros_() { return datos_().parametros || {}; }
  function numParam_(clave, porDefecto) { var v = Number(parametros_()[clave]); return isNaN(v) ? porDefecto : v; }
  function uf_() { return (window.Sitio && window.Sitio.indicador('UF')) || 0; }
  function utm_() { return (window.Sitio && window.Sitio.indicador('UTM')) || numParam_('utm_referencia', 0); }
  function clp_(n) { return Number(n || 0).toLocaleString('es-CL', { maximumFractionDigits: 0 }); }

  // ---- Impuesto único de 2ª categoría (tabla progresiva por tramos, en UTM) ----
  function impuestoUnico_(baseTributable) {
    var utm = utm_();
    if (!utm || baseTributable <= 0) { return 0; }
    var baseUtm = baseTributable / utm;
    var tramos = datos_().tramos_impuesto_unico || [];
    var tramo = tramos.filter(function (t) { return baseUtm > t.desde_utm && (t.hasta_utm === null || baseUtm <= t.hasta_utm); })[0];
    if (!tramo) { return 0; }
    var impuestoUtm = baseUtm * tramo.factor - tramo.rebaja_utm;
    return Math.max(0, impuestoUtm) * utm;
  }

  // ---- Sueldo bruto -> líquido (siempre calculable en un solo paso) ----
  function sueldoBrutoALiquido_(bruto, tipoContrato) {
    // Si no hay UF disponible todavía (Indicadores sin actualizar), NO se debe aplicar un tope
    // de $0 — eso dejaría la renta imponible en 0 y arrastraría todo el cálculo a cero. Sin UF,
    // se calcula sin tope (mejor una estimación algo optimista que un resultado roto en $0).
    var topeUf = numParam_('tope_imponible_uf', 0);
    var tope = (topeUf && uf_()) ? topeUf * uf_() : Infinity;
    var rentaImponible = Math.min(bruto, tope);
    var afp = rentaImponible * (numParam_('afp_tasa_pct', 0) / 100);
    var salud = rentaImponible * (numParam_('salud_tasa_pct', 0) / 100);
    var cesantia = tipoContrato === 'indefinido' ? rentaImponible * (numParam_('seguro_cesantia_trabajador_pct', 0) / 100) : 0;
    var baseTributable = bruto - afp - salud - cesantia;
    var impuesto = impuestoUnico_(baseTributable);
    var liquido = baseTributable - impuesto;
    return { bruto: bruto, renta_imponible: rentaImponible, afp: afp, salud: salud, cesantia: cesantia, impuesto: impuesto, liquido: liquido };
  }

  // ---- Sueldo líquido -> bruto: el impuesto no es lineal (tabla por tramos), así que se
  // resuelve por bisección (converge en ~40 iteraciones) en vez de una fórmula cerrada —
  // funciona igual sin importar cuántos tramos tenga la tabla del Libro de Herramientas.
  function sueldoLiquidoABruto_(liquidoObjetivo, tipoContrato) {
    var bajo = liquidoObjetivo, alto = liquidoObjetivo * 2.2;
    for (var i = 0; i < 60; i++) {
      var medio = (bajo + alto) / 2;
      var resultado = sueldoBrutoALiquido_(medio, tipoContrato);
      if (Math.abs(resultado.liquido - liquidoObjetivo) < 1) { return resultado; }
      if (resultado.liquido > liquidoObjetivo) { alto = medio; } else { bajo = medio; }
    }
    return sueldoBrutoALiquido_((bajo + alto) / 2, tipoContrato);
  }

  function calcularSueldo_(campos) {
    var monto = Number(campos.monto || 0);
    var resultado = campos.modo === 'liquido_a_bruto' ? sueldoLiquidoABruto_(monto, campos.tipo_contrato) : sueldoBrutoALiquido_(monto, campos.tipo_contrato);
    return [
      ['Renta imponible', clp_(resultado.renta_imponible)],
      ['Descuento AFP', clp_(resultado.afp)],
      ['Descuento salud', clp_(resultado.salud)],
      ['Descuento seguro de cesantía', clp_(resultado.cesantia)],
      ['Impuesto único', clp_(resultado.impuesto)],
      ['Sueldo bruto', clp_(resultado.bruto)],
      ['Sueldo líquido', clp_(resultado.liquido)]
    ];
  }

  function calcularHonorarios_(campos) {
    var monto = Number(campos.monto || 0);
    var retPct = numParam_('retencion_pct_honorarios', 0) / 100;
    var bruto, liquido, retencion;
    if (campos.modo === 'liquido_a_bruto') {
      liquido = monto; bruto = retPct < 1 ? liquido / (1 - retPct) : liquido; retencion = bruto - liquido;
    } else {
      bruto = monto; retencion = bruto * retPct; liquido = bruto - retencion;
    }
    return [
      ['Honorario bruto (boleta)', clp_(bruto)],
      ['Retención (' + (retPct * 100).toFixed(1) + '%)', clp_(retencion)],
      ['Honorario líquido a recibir', clp_(liquido)]
    ];
  }

  function calcularFiniquito_(campos) {
    var sueldoBase = Number(campos.sueldo_base || 0);
    var aniosServicio = Number(campos.anios_servicio || 0);
    var mesesAnioActual = Number(campos.meses_anio_actual || 0);
    var conIndemnizacion = campos.con_indemnizacion === 'si';
    var topeMeses = numParam_('tope_meses_indemnizacion', 11);
    var topeUf = numParam_('tope_imponible_indemnizacion_uf', 0);
    var sueldoTope = (topeUf && uf_()) ? Math.min(sueldoBase, topeUf * uf_()) : sueldoBase; // sin UF disponible: sin tope, no $0
    var mesesIndemnizacion = conIndemnizacion ? Math.min(aniosServicio, topeMeses) : 0;
    var indemnizacionAnios = mesesIndemnizacion * sueldoTope;
    var diasFeriado = numParam_('dias_feriado_anual', 15);
    var feriadoProporcional = (diasFeriado / 12) * mesesAnioActual * (sueldoBase / 30);
    var total = indemnizacionAnios + feriadoProporcional;
    return [
      ['Indemnización por años de servicio (' + mesesIndemnizacion.toFixed(1) + ' meses, con tope)', clp_(indemnizacionAnios)],
      ['Feriado proporcional estimado', clp_(feriadoProporcional)],
      ['Total estimado del finiquito', clp_(total)],
      ['Nota', 'Estimación de apoyo comercial — no incluye gratificación, aviso previo ni causales especiales; revisa el caso puntual antes de comprometer un monto final.']
    ];
  }

  function calcularF29_(campos) {
    var ventas = Number(campos.ventas_netas || 0), compras = Number(campos.compras_netas || 0);
    var ivaTasa = numParam_('tasa_iva_pct', 19) / 100;
    var ivaDebito = ventas * ivaTasa, ivaCredito = compras * ivaTasa, ivaNeto = ivaDebito - ivaCredito;
    var ppmPct = (campos.tasa_ppm_pct !== '' && campos.tasa_ppm_pct !== undefined && !isNaN(Number(campos.tasa_ppm_pct)))
      ? Number(campos.tasa_ppm_pct) / 100 : numParam_('tasa_ppm_default_pct', 0) / 100;
    var ppm = ventas * ppmPct;
    var aPagar = Math.max(0, ivaNeto) + ppm;
    var remanente = ivaNeto < 0 ? -ivaNeto : 0;
    return [
      ['IVA débito fiscal', clp_(ivaDebito)],
      ['IVA crédito fiscal', clp_(ivaCredito)],
      ['IVA a pagar', clp_(Math.max(0, ivaNeto))],
      ['Remanente de crédito fiscal (si aplica)', clp_(remanente)],
      ['PPM (' + (ppmPct * 100).toFixed(2) + '%)', clp_(ppm)],
      ['Total estimado a pagar en el F29', clp_(aPagar)]
    ];
  }

  var MOTORES_ = { sueldo: calcularSueldo_, honorarios: calcularHonorarios_, finiquito: calcularFiniquito_, f29: calcularF29_ };

  function leerCampos_(form) {
    var campos = {};
    form.querySelectorAll('[data-campo]').forEach(function (el) { campos[el.getAttribute('data-campo')] = el.value; });
    return campos;
  }

  function pintarResultado_(cont, filas) {
    cont.innerHTML = '<table class="tabla-resultado-calculadora">' +
      filas.map(function (f) { return '<tr><th>' + window.Render.esc(f[0]) + '</th><td>' + window.Render.esc(f[1]) + '</td></tr>'; }).join('') +
      '</table>';
  }

  // Se llama después de pintar la sección (ver index.html) — busca todos los formularios de
  // calculadora dentro de la raíz dada y les engancha el cálculo al enviar.
  function montar(raiz) {
    (raiz || document).querySelectorAll('.form-calculadora').forEach(function (form) {
      if (form.dataset.montado) { return; } // evita enganchar el mismo formulario dos veces si render() se llama de nuevo
      form.dataset.montado = '1';
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var cont = form.parentElement.querySelector('.resultado-calculadora');
        if (!datos_().disponible) {
          cont.innerHTML = '<p style="color:#b45309">Todavía no hay parámetros tributarios configurados — avisa al administrador del sitio.</p>';
          return;
        }
        var motor = form.getAttribute('data-motor');
        var fn = MOTORES_[motor];
        if (!fn) { return; }
        try { pintarResultado_(cont, fn(leerCampos_(form))); }
        catch (err) { cont.innerHTML = '<p style="color:#b45309">No se pudo calcular: revisa los montos ingresados.</p>'; console.error(err); }
      });
    });
  }

  return { montar: montar };
})();
