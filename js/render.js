/* ============================================================================
 * render.js — Convierte Paginas/Secciones/Elementos (data/paginas.json) en HTML.
 * ----------------------------------------------------------------------------
 * Modelo de contenido (tal como sale de la hoja, vía 16_Publicador.gs):
 *   Sección: { tipo, titulo, texto, elementos: [Elemento] }  — titulo/texto son
 *            el encabezado de la sección (p.ej. el título del hero).
 *   Elemento: { tipo, titulo, texto, enlace, datos, medio_url, medio_tipo }
 *            — una fila repetible dentro de la sección (una tarjeta, un
 *            testimonio, un botón, una pregunta...). "datos" es JSON libre
 *            para lo que no calza en una columna (precio, características,
 *            estrellas, columnas de una tabla), editable desde Elementos.datos_json.
 *
 * Cada tipo de sección tiene una función renderizadora; agregar un tipo nuevo
 * en el Sheet solo necesita una función más acá, nunca tocar index.html.
 * ========================================================================== */

window.Render = (function () {
  function esc(s) { var d = document.createElement('div'); d.textContent = (s === undefined || s === null) ? '' : String(s); return d.innerHTML; }
  function porTipo_(s, tipo) { return s.elementos.filter(function (e) { return e.tipo === tipo; }); }

  // ---- idioma: cada Sección/Elemento trae, además de titulo/texto (base, en español),
  // titulo_en/texto_en y titulo_zh/texto_zh (traducción manual, editada en el Sheet).
  // Si la celda de traducción está vacía, se usa el valor en español — el sitio NUNCA
  // queda en blanco por una traducción faltante. idioma 'es' (o vacío) usa el base directo.
  function campo_(obj, base, idioma) {
    if (!obj) { return ''; }
    if (idioma && idioma !== 'es') {
      var v = obj[base + '_' + idioma];
      if (v) { return v; }
    }
    return obj[base] || '';
  }
  // "datos"/"datos_json" es JSON libre (precio, características, columnas de tabla...);
  // su traducción es un objeto parcial (datos_en/datos_zh) que solo trae las claves que
  // cambian de un idioma a otro — se combina sobre "datos" para no repetir lo que no cambia.
  function datosIdioma_(el, idioma) {
    var base = el.datos || {};
    if (!idioma || idioma === 'es') { return base; }
    var override = el['datos_' + idioma];
    if (!override || !Object.keys(override).length) { return base; }
    return Object.assign({}, base, override);
  }

  // ---- hero: medio (video/gif/imagen/3d) + insignia + título + subtítulo + bullets +
  // botones + línea de confianza ----
  // Prioridad del medio: Config.hero_video_url > hero_gif_url > hero_imagen_url (edición
  // rápida, un solo lugar, pensada para el hero principal) — si las tres están vacías, usa
  // el elemento tipo "medio" de esta sección (más flexible: permite un hero distinto por
  // página vía Elementos/Medios). Así ambos mecanismos quedan realmente conectados.
  //
  // Copywriting (elementos opcionales — si no existen, el hero sigue funcionando igual):
  //  - tipo='insignia' (uno solo): pequeña etiqueta encima del título (ej. "100% digital").
  //  - tipo='bullet' (varios): quita objeciones ("sin costo", "sin compromiso"...), bajo el subtítulo.
  //  - tipo='confianza' (uno solo): línea de prueba social/confianza bajo los botones.
  // Un video de YouTube (youtu.be/... o youtube.com/watch?v=...) no sirve como
  // src de <video>: esa etiqueta necesita un archivo de video real (mp4/webm),
  // no la URL de la página de YouTube. Si detectamos un link de YouTube lo
  // convertimos automáticamente en un iframe embebido (autoplay, mudo, loop),
  // para que un dato mal cargado en el Sheet no deje el hero roto o en blanco.
  function idYoutube_(url) {
    var m = /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{6,})/.exec(String(url || ''));
    return m ? m[1] : null;
  }
  function embedYoutube_(idVideo) {
    var src = 'https://www.youtube-nocookie.com/embed/' + idVideo +
      '?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&rel=0&playlist=' + idVideo;
    return '<iframe src="' + esc(src) + '" title="video" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>';
  }
  function hero_(s, i, cfg, idioma) {
    cfg = cfg || {};
    var medioHtml = '';
    var idYt = cfg.hero_video_url ? idYoutube_(cfg.hero_video_url) : (cfg.hero_gif_url ? idYoutube_(cfg.hero_gif_url) : null);
    if (idYt) {
      medioHtml = embedYoutube_(idYt);
    } else if (cfg.hero_video_url) {
      medioHtml = '<video src="' + esc(cfg.hero_video_url) + '" autoplay muted loop playsinline></video>';
    } else if (cfg.hero_gif_url) {
      medioHtml = '<img src="' + esc(cfg.hero_gif_url) + '" alt="">';
    } else if (cfg.hero_imagen_url) {
      medioHtml = '<img src="' + esc(cfg.hero_imagen_url) + '" alt="">';
    } else {
      var medio = porTipo_(s, 'medio')[0];
      if (medio && medio.medio_url) {
        if (medio.medio_tipo === 'video') { medioHtml = '<video src="' + esc(medio.medio_url) + '" autoplay muted loop playsinline></video>'; }
        else if (medio.medio_tipo === '3d') { medioHtml = '<model-viewer src="' + esc(medio.medio_url) + '" auto-rotate camera-controls></model-viewer>'; }
        else { medioHtml = '<img src="' + esc(medio.medio_url) + '" alt="' + esc(medio.medio_alt || '') + '">'; }
      }
    }
    var insignia = porTipo_(s, 'insignia')[0];
    var bullets = porTipo_(s, 'bullet');
    var confianza = porTipo_(s, 'confianza')[0];
    var botones = porTipo_(s, 'boton').map(function (b, i2) {
      return '<a class="btn ' + (i2 === 0 ? 'btn-primario' : 'btn-secundario') + '" href="' + esc(b.enlace || '#') + '">' + esc(campo_(b, 'titulo', idioma)) + '</a>';
    }).join('');
    var bulletsHtml = bullets.length
      ? '<ul class="hero-bullets">' + bullets.map(function (bl) { return '<li>' + esc(campo_(bl, 'titulo', idioma)) + '</li>'; }).join('') + '</ul>'
      : '';
    return (
      '<section class="seccion-hero reveal"><div class="fondo-decorativo" aria-hidden="true"></div><div class="contenedor">' +
      '<div class="contenido">' +
      (insignia ? '<span class="hero-insignia">' + esc(campo_(insignia, 'titulo', idioma)) + '</span>' : '') +
      '<h1>' + esc(campo_(s, 'titulo', idioma)) + '</h1>' +
      '<p class="subtitulo">' + esc(campo_(s, 'texto', idioma)) + '</p>' +
      // Descripción meta bajo el título/subtítulo: la propia de esta página si la tiene
      // (Paginas.meta_descripcion), o si no, la descripción general del sitio (Config.seo_descripcion)
      // — así el banner siempre queda con título + subtítulo + descripción, nunca solo los dos primeros.
      (function () {
        var desc = cfg._meta_descripcion_pagina || cfg.seo_descripcion || '';
        return desc ? '<p class="hero-descripcion">' + esc(desc) + '</p>' : '';
      })() +
      bulletsHtml +
      '<div class="acciones">' + botones + '</div>' +
      (confianza ? '<p class="hero-confianza">' + esc(campo_(confianza, 'titulo', idioma)) + '</p>' : '') +
      '</div>' +
      '<div class="medio">' + medioHtml + '</div>' +
      '</div></section>'
    );
  }

  function textoImagen_(s, i, cfg, idioma) {
    var medio = porTipo_(s, 'medio')[0];
    return (
      '<section class="seccion-texto-imagen reveal' + (i % 2 ? ' invertido' : '') + '"><div class="contenedor">' +
      '<div class="contenido"><h2>' + esc(campo_(s, 'titulo', idioma)) + '</h2><p>' + esc(campo_(s, 'texto', idioma)) + '</p></div>' +
      '<div>' + (medio && medio.medio_url ? '<img src="' + esc(medio.medio_url) + '" alt="' + esc(medio.medio_alt || '') + '">' : '') + '</div>' +
      '</div></section>'
    );
  }

  // slugificar_: "Plan Emprendedores" -> "plan-emprendedores" — usado para darle a cada
  // tarjeta un id ancla estable (permite enlazar directo a un plan puntual, ej. desde el
  // mega-menú de "Planes", sin depender de a qué posición quedó en la grilla).
  function slugificar_(texto) {
    return String(texto || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  // Elemento tipo='tarjeta': titulo/texto = nombre/descripción; datos = { precio, unidad,
  // caracteristicas: [...], icono, destacada, boton_texto }; enlace = link del botón.
  // Factorizado de tarjetas_() para que categoriaPlanes_() (acordeón de la página "Planes")
  // pinte exactamente las mismas tarjetas dentro de su propio contenedor colapsable.
  function tarjetasGridHtml_(s, idioma) {
    return porTipo_(s, 'tarjeta').map(function (t) {
      var d = datosIdioma_(t, idioma);
      var lista = (d.caracteristicas || []).map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('');
      return (
        '<div class="tarjeta' + (d.destacada ? ' destacada' : '') + '" id="plan-' + esc(slugificar_(t.titulo)) + '">' +
        (d.icono ? '<div class="icono">' + esc(d.icono) + '</div>' : '') +
        '<h3>' + esc(campo_(t, 'titulo', idioma)) + '</h3><p>' + esc(campo_(t, 'texto', idioma)) + '</p>' +
        (d.precio ? '<div class="precio">' + esc(d.precio) + ' <small>' + esc(d.unidad || '') + '</small></div>' : '') +
        '<ul>' + lista + '</ul>' +
        (t.enlace ? '<a class="btn btn-primario btn-bloque" href="' + esc(t.enlace) + '">' + esc(d.boton_texto || 'Elegir') + '</a>' : '') +
        '</div>'
      );
    }).join('');
  }
  function tarjetas_(s, i, cfg, idioma) {
    return seccionConEncabezado_(s, '<div class="grid-tarjetas">' + tarjetasGridHtml_(s, idioma) + '</div>', idioma);
  }

  // Elemento tipo='categoria_planes' (una Sección = una categoría, ej. "Contabilidad Digital"):
  // se pinta como un acordeón — el encabezado (título+texto de la Sección) es un botón que
  // despliega/colapsa sus tarjetas (mismas Elementos tipo='tarjeta' que usa tarjetas_()). La
  // primera categoría de la página parte abierta (mejor primera impresión); el resto colapsado,
  // así varias categorías caben en una sola página sin abrumar. El id="categoria-<slug>" permite
  // enlazar directo desde el mega-menú ("#planes/contabilidad-digital") — ver reubicarBarra... y
  // abrirYDesplazarCategoria_ en index.html. El toggle real (clic) se delega en index.html.
  function categoriaPlanes_(s, i, cfg, idioma) {
    var slug = slugificar_(campo_(s, 'titulo', idioma) || s.titulo);
    var titulo = campo_(s, 'titulo', idioma), texto = campo_(s, 'texto', idioma);
    var abierta = i === 0;
    return (
      '<section class="reveal categoria-planes' + (abierta ? ' abierta' : '') + '" id="categoria-' + esc(slug) + '">' +
      '<div class="contenedor">' +
      '<button type="button" class="categoria-planes-cabecera" aria-expanded="' + (abierta ? 'true' : 'false') + '">' +
      '<span class="categoria-planes-titulo"><h2>' + esc(titulo) + '</h2>' + (texto ? '<p>' + esc(texto) + '</p>' : '') + '</span>' +
      '<span class="categoria-planes-icono" aria-hidden="true">▾</span>' +
      '</button>' +
      '<div class="categoria-planes-cuerpo"><div class="grid-tarjetas">' + tarjetasGridHtml_(s, idioma) + '</div></div>' +
      '</div></section>'
    );
  }

  // Elemento tipo='testimonio': titulo = nombre, texto = cita; datos = { cargo, estrellas }.
  function testimonios_(s, i, cfg, idioma) {
    var items = porTipo_(s, 'testimonio').map(function (t) {
      var d = datosIdioma_(t, idioma);
      return (
        '<div class="testimonio"><div class="estrellas">' + '★'.repeat(Number(d.estrellas || 5)) + '</div>' +
        '<p>“' + esc(campo_(t, 'texto', idioma)) + '”</p>' +
        '<div class="autor">' + (t.medio_url ? '<img src="' + esc(t.medio_url) + '" alt="">' : '') +
        '<div><strong>' + esc(campo_(t, 'titulo', idioma)) + '</strong><span>' + esc(d.cargo || '') + '</span></div></div></div>'
      );
    }).join('');
    return seccionConEncabezado_(s, '<div class="grid-testimonios">' + items + '</div>', idioma);
  }

  function llamadoAccion_(s, i, cfg, idioma) {
    var boton = porTipo_(s, 'boton')[0];
    return (
      '<section class="reveal"><div class="contenedor"><div class="seccion-cta">' +
      '<h2>' + esc(campo_(s, 'titulo', idioma)) + '</h2><p>' + esc(campo_(s, 'texto', idioma)) + '</p>' +
      (boton ? '<a class="btn btn-acento" href="' + esc(boton.enlace || '#') + '">' + esc(campo_(boton, 'titulo', idioma)) + '</a>' : '') +
      '</div></div></section>'
    );
  }

  // Elemento tipo='pregunta': titulo = pregunta, texto = respuesta.
  function preguntasFrecuentes_(s, i, cfg, idioma) {
    var items = porTipo_(s, 'pregunta').map(function (p) {
      return '<details><summary>' + esc(campo_(p, 'titulo', idioma)) + '</summary><p>' + esc(campo_(p, 'texto', idioma)) + '</p></details>';
    }).join('');
    return seccionConEncabezado_(s, '<div class="faq">' + items + '</div>', idioma);
  }

  // Elemento tipo='tabla' (uno solo): datos = { columnas: [...], filas: [[...], ...] }.
  function tablaComparativa_(s, i, cfg, idioma) {
    var e = porTipo_(s, 'tabla')[0];
    var d = e ? datosIdioma_(e, idioma) : { columnas: [], filas: [] };
    var thead = '<tr>' + (d.columnas || []).map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr>';
    var tbody = (d.filas || []).map(function (f) { return '<tr>' + f.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('');
    // Envuelta en su propio contenedor con scroll horizontal (mismo patrón que la barra de
    // indicadores y las migas de pan): en móvil, 4 columnas de texto no caben en el ancho de
    // pantalla, y sin este contenedor la tabla forzaba el ancho de TODA la página en vez de
    // desplazarse solo ella — bug real encontrado al probar responsive, no solo teórico.
    return seccionConEncabezado_(s, '<div class="tabla-comparativa-scroll"><table class="comparativa"><thead>' + thead + '</thead><tbody>' + tbody + '</tbody></table></div>', idioma);
  }

  function seccionConEncabezado_(s, cuerpo, idioma) {
    var titulo = campo_(s, 'titulo', idioma), texto = campo_(s, 'texto', idioma);
    return (
      '<section class="reveal"><div class="contenedor">' +
      (titulo ? '<div class="seccion-encabezado"><h2>' + esc(titulo) + '</h2>' + (texto ? '<p>' + esc(texto) + '</p>' : '') + '</div>' : '') +
      cuerpo + '</div></section>'
    );
  }

  // Elemento tipo='calculadora': datos = { motor: 'sueldo'|'honorarios'|'finiquito'|'f29' }.
  // El HTML de cada motor es fijo (cada calculadora tiene campos propios que no calzan en un
  // formato genérico), pero CUÁLES calculadoras se ofrecen y en qué orden sí es 100% editable
  // desde Elementos — agregar/quitar filas ahí agrega/quita calculadoras sin tocar código.
  // El cálculo real corre en el navegador (js/herramientas.js), con los parámetros publicados
  // en data/herramientas.json (vienen del Libro de Herramientas — Sheet separado del comercial).
  var FORMULARIOS_MOTOR_ = {
    sueldo: function (idioma) {
      return (
        '<div class="fila-campos">' +
        '<label>Calcular <select data-campo="modo"><option value="bruto_a_liquido">Sueldo bruto → líquido</option><option value="liquido_a_bruto">Sueldo líquido → bruto</option></select></label>' +
        '<label>Monto (CLP) <input type="number" data-campo="monto" min="0" placeholder="Ej: 1200000"></label>' +
        '<label>Contrato <select data-campo="tipo_contrato"><option value="indefinido">Indefinido</option><option value="plazo_fijo">Plazo fijo / por obra</option></select></label>' +
        '</div>'
      );
    },
    honorarios: function () {
      return (
        '<div class="fila-campos">' +
        '<label>Calcular <select data-campo="modo"><option value="bruto_a_liquido">Honorario bruto → líquido</option><option value="liquido_a_bruto">Honorario líquido → bruto</option></select></label>' +
        '<label>Monto (CLP) <input type="number" data-campo="monto" min="0" placeholder="Ej: 800000"></label>' +
        '</div>'
      );
    },
    finiquito: function () {
      return (
        '<div class="fila-campos">' +
        '<label>Sueldo base (CLP) <input type="number" data-campo="sueldo_base" min="0" placeholder="Ej: 900000"></label>' +
        '<label>Años de servicio <input type="number" data-campo="anios_servicio" min="0" step="0.1" placeholder="Ej: 3.5"></label>' +
        '<label>Meses trabajados este año <input type="number" data-campo="meses_anio_actual" min="0" max="12" placeholder="Ej: 8"></label>' +
        '<label>¿La causal da derecho a indemnización? <select data-campo="con_indemnizacion"><option value="si">Sí (ej: necesidades de la empresa)</option><option value="no">No (ej: renuncia voluntaria)</option></select></label>' +
        '</div>'
      );
    },
    f29: function () {
      return (
        '<div class="fila-campos">' +
        '<label>Ventas netas del mes (CLP) <input type="number" data-campo="ventas_netas" min="0" placeholder="Ej: 5000000"></label>' +
        '<label>Compras netas del mes (CLP) <input type="number" data-campo="compras_netas" min="0" placeholder="Ej: 2000000"></label>' +
        '<label>Tasa PPM (%) <input type="number" data-campo="tasa_ppm_pct" min="0" step="0.01" placeholder="se rellena sola si hay datos"></label>' +
        '</div>'
      );
    }
  };
  function calculadoras_(s, i, cfg, idioma) {
    var items = porTipo_(s, 'calculadora').map(function (el) {
      var d = datosIdioma_(el, idioma);
      var motor = d.motor;
      var form = FORMULARIOS_MOTOR_[motor];
      if (!form) { console.warn('Calculadora con motor desconocido:', motor); return ''; }
      return (
        '<div class="calculadora" data-motor="' + esc(motor) + '">' +
        '<h3>' + esc(campo_(el, 'titulo', idioma)) + '</h3>' +
        (campo_(el, 'texto', idioma) ? '<p>' + esc(campo_(el, 'texto', idioma)) + '</p>' : '') +
        '<form class="form-calculadora" data-motor="' + esc(motor) + '">' + form(idioma) +
        '<button type="submit" class="btn btn-primario">Calcular</button></form>' +
        '<div class="resultado-calculadora" aria-live="polite"></div>' +
        '</div>'
      );
    }).join('');
    var avisoNoDisponible = (window.Sitio && window.Sitio.estado.herramientas && window.Sitio.estado.herramientas.disponible === false)
      ? '<p class="aviso-config" style="color:#b45309; background:#fffbeb; border:1px solid #fde68a; padding:12px 16px; border-radius:10px; margin-bottom:20px;">' +
        'Las calculadoras todavía no están disponibles: falta configurar el Libro de Herramientas en el panel de administración.</p>'
      : '';
    return seccionConEncabezado_(s, avisoNoDisponible + '<div class="grid-calculadoras">' + items + '</div>', idioma);
  }

  // Elemento tipo='estadistica': titulo = etiqueta ("Años de experiencia"); datos = { numero,
  // sufijo }. Franja de confianza reutilizable en cualquier página (hero, landing de servicio...).
  function franjaConfianza_(s, i, cfg, idioma) {
    var items = porTipo_(s, 'estadistica').map(function (e) {
      var d = datosIdioma_(e, idioma);
      return (
        '<div class="estadistica-item"><div class="estadistica-numero">' + esc(d.numero) + esc(d.sufijo || '') + '</div>' +
        '<div class="estadistica-etiqueta">' + esc(campo_(e, 'titulo', idioma)) + '</div></div>'
      );
    }).join('');
    return '<section class="franja-confianza reveal"><div class="contenedor"><div class="grid-estadisticas">' + items + '</div></div></section>';
  }

  // Elemento tipo='paso': titulo/texto = título/descripción del paso; el número (1, 2, 3...) es
  // simplemente su posición (orden) — agregar/quitar pasos en el Sheet no requiere renumerar nada.
  function pasosProceso_(s, i, cfg, idioma) {
    var pasos = porTipo_(s, 'paso').map(function (p, idx) {
      return (
        '<div class="paso-proceso"><div class="paso-numero">' + (idx + 1) + '</div>' +
        '<h4>' + esc(campo_(p, 'titulo', idioma)) + '</h4><p>' + esc(campo_(p, 'texto', idioma)) + '</p></div>'
      );
    }).join('');
    return seccionConEncabezado_(s, '<div class="grid-pasos-proceso">' + pasos + '</div>', idioma);
  }

  // ---- Planes reales del catálogo (estilo Google Workspace) --------------------------------
  // Elemento tipo='plan_ref': datos = { id_plan, accion: 'cotizar'|'contratar'|'suscribir' };
  // enlace (opcional) = link "Ver el detalle completo" hacia la landing propia del plan.
  // A propósito, la tarjeta NO trae nombre/precio/características escritas en el Elemento: se
  // resuelven en vivo contra el catálogo real (data/servicios.json → estado.servicios.planes,
  // data/catalogo.json → estado.catalogo.caracteristicas), el mismo que usa el backend
  // (Catalogo.item/precio/caracteristicas en 11_Catalogo.gs) para armar una Cotización. Así lo
  // que el cliente ve, cotiza y — al aceptar la cotización — termina en su Contrato es siempre
  // exactamente el mismo dato: nunca un texto suelto que se pueda desincronizar del precio real.
  function planDe_(idPlan) {
    var estado = window.Sitio.estado;
    return (estado.servicios.planes || []).filter(function (p) { return p.id_plan === idPlan; })[0] || null;
  }
  function caracteristicasDePlan_(idPlan) {
    var estado = window.Sitio.estado;
    return (estado.catalogo.caracteristicas || []).filter(function (c) { return c.id_item === idPlan; })
      .sort(function (a, b) { return Number(a.orden || 0) - Number(b.orden || 0); });
  }
  function formatoPrecioPlan_(monto, unidad) {
    monto = Number(monto || 0);
    if (unidad === 'UF') { return monto.toLocaleString('es-CL', { minimumFractionDigits: monto % 1 ? 1 : 0, maximumFractionDigits: 2 }) + ' UF'; }
    if (unidad === 'USD') { return 'US$' + monto.toLocaleString('en-US'); }
    if (unidad === 'EUR') { return '€' + monto.toLocaleString('es-CL'); }
    return '$' + Math.round(monto).toLocaleString('es-CL');
  }
  function sufijoPeriodoPlan_(periodicidad) {
    if (periodicidad === 'mensual') { return I18n.t('plan_por_mes'); }
    if (periodicidad === 'anual') { return I18n.t('plan_por_anio'); }
    return '';
  }
  function etiquetaAccionPlan_(accion, periodicidad) {
    if (accion === 'contratar') { return periodicidad === 'mensual' || periodicidad === 'anual' ? I18n.t('suscribir_plan') : I18n.t('contratar_plan'); }
    if (accion === 'suscribir') { return I18n.t('suscribir_plan'); }
    return I18n.t('cotizar_plan');
  }
  // El selector "¿Qué quieres hacer?" es un filtro puramente de interfaz (ver index.html, evento
  // delegado en #contenido-pagina): cambia en vivo la etiqueta y la acción de cada botón de plan
  // visible en la sección, sin recargar la página — el clic real siempre agrega el id_plan real
  // al carrito y abre el panel, así el camino hacia cotizar/contratar es siempre el mismo, agible.
  function selectorIntencionPlanes_() {
    return (
      '<div class="selector-intencion-planes" role="group" aria-label="' + esc(I18n.t('elige_que_quieres_hacer')) + '">' +
      '<button type="button" class="selector-intencion-opcion activa" data-intencion-plan="cotizar">' + esc(I18n.t('solo_cotizar')) + '</button>' +
      '<button type="button" class="selector-intencion-opcion" data-intencion-plan="contratar">' + esc(I18n.t('quiero_contratar')) + '</button>' +
      '</div>'
    );
  }
  function planesServicio_(s, i, cfg, idioma) {
    var refs = porTipo_(s, 'plan_ref');
    var tarjetas = refs.map(function (ref) {
      var d = datosIdioma_(ref, idioma);
      var plan = planDe_(d.id_plan);
      if (!plan) { console.warn('planesServicio_: no existe el plan', d.id_plan, '(revisa la hoja Planes)'); return ''; }
      var caract = caracteristicasDePlan_(d.id_plan);
      var listaHtml = caract.map(function (c) { return '<li>' + esc(c.nombre + (c.valor ? ': ' + c.valor : '')) + '</li>'; }).join('');
      var accion = d.accion || 'cotizar';
      var destacado = plan.destacado === true || plan.destacado === 'true';
      var precioTxt = formatoPrecioPlan_(plan.precio, plan.unidad_precio);
      var sufijo = sufijoPeriodoPlan_(plan.periodicidad);
      return (
        '<div class="tarjeta-plan' + (destacado ? ' destacado' : '') + '" id="plan-' + esc(slugificar_(plan.nombre)) + '">' +
        (destacado ? '<span class="tarjeta-plan-badge">' + esc(I18n.t('plan_mas_elegido')) + '</span>' : '') +
        '<h3>' + esc(plan.nombre) + '</h3>' +
        '<div class="tarjeta-plan-precio">' + esc(precioTxt) + (sufijo ? ' <small>' + esc(sufijo) + '</small>' : '') + '</div>' +
        '<ul class="tarjeta-plan-caracteristicas">' + listaHtml + '</ul>' +
        '<button type="button" class="btn btn-primario btn-bloque" data-agregar-plan="' + esc(d.id_plan) + '" data-accion-plan="' + esc(accion) + '" data-periodicidad-plan="' + esc(plan.periodicidad || '') + '">' +
        esc(etiquetaAccionPlan_(accion, plan.periodicidad)) + '</button>' +
        (ref.enlace ? '<a class="tarjeta-plan-detalle" href="' + esc(ref.enlace) + '">' + esc(I18n.t('ver_detalle_plan')) + '</a>' : '') +
        '</div>'
      );
    }).join('');
    var selector = refs.length > 1 ? selectorIntencionPlanes_() : '';
    return seccionConEncabezado_(s, selector + '<div class="grid-planes-servicio">' + tarjetas + '</div>', idioma);
  }

  // Elemento tipo='diagnostico' (uno solo, o ninguno): el formulario real (con carga de archivo
  // y antispam) lo arma js/diagnostico.js dentro de este contenedor — acá solo se deja el marco
  // con encabezado editable, igual que el resto de las secciones.
  function diagnostico_(s, i, cfg, idioma) {
    return seccionConEncabezado_(s, '<div class="diagnostico-tributario" id="diagnostico-tributario"></div>', idioma);
  }

  var RENDERIZADORES_ = {
    hero: hero_, texto_imagen: textoImagen_, tarjetas: tarjetas_, categoria_planes: categoriaPlanes_, testimonios: testimonios_,
    llamado_accion: llamadoAccion_, preguntas_frecuentes: preguntasFrecuentes_, tabla_comparativa: tablaComparativa_,
    calculadoras: calculadoras_, diagnostico: diagnostico_, franja_confianza: franjaConfianza_, pasos_proceso: pasosProceso_,
    planes_servicio: planesServicio_
  };

  // cfg = estado.config (data/config.json) — permite que un tipo de sección (hoy solo el
  // hero) lea directamente valores de Config además de su propio contenido en Elementos.
  // idioma = 'es' (default) | 'en' | 'zh' — ver campo_()/datosIdioma_() más arriba.
  function renderPagina(pagina, cfg, idioma) {
    if (!pagina) { return '<div class="cargando">' + (window.I18n ? I18n.t('pagina_no_encontrada') : 'Página no encontrada.') + '</div>'; }
    // Copia superficial de cfg con la descripción META de ESTA página (si la tiene) para que el
    // hero pueda mostrarla debajo del título/subtítulo — si la página no tiene la suya propia,
    // el hero cae de vuelta a la descripción general del sitio (cfg.seo_descripcion).
    var cfgPagina = Object.assign({}, cfg, { _meta_descripcion_pagina: campo_(pagina, 'meta_descripcion', idioma) });
    return pagina.secciones.map(function (s, i) {
      var fn = RENDERIZADORES_[s.tipo];
      if (!fn) { console.warn('Tipo de sección sin renderizador:', s.tipo); return ''; }
      try { return fn(s, i, cfgPagina, idioma); } catch (e) { console.error('Error renderizando sección', s.id_seccion, e); return ''; }
    }).join('');
  }

  // Revela con una animación suave (ver .reveal en estilo.css) cada elemento marcado
  // apenas entra en pantalla. Genérico: no sabe qué contenido hay adentro, solo observa
  // la clase — así cualquier sección o tarjeta nueva queda animada sin tocar este archivo.
  function activarReveal(raiz) {
    var nodos = (raiz || document).querySelectorAll('.reveal:not(.reveal-listo)');
    if (!('IntersectionObserver' in window)) {
      nodos.forEach(function (n) { n.classList.add('reveal-visible', 'reveal-listo'); });
      return;
    }
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('reveal-visible'); obs.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    nodos.forEach(function (n) { n.classList.add('reveal-listo'); obs.observe(n); });
  }

  // Mega-menú anidado: "menu" viene de data/menu.json (hoja "Menu" — árbol de cualquier
  // profundidad vía padre>Menu, ver 16_Publicador.gs → construirMenu_). Si aún no hay datos
  // ahí (sitio recién instalado, sin publicar de nuevo todavía), cae de vuelta al menú plano
  // clásico construido a partir de Paginas, así el sitio nunca se queda sin navegación.
  // Cada ítem con hijos agrega un botón ▾ (independiente del enlace, para que un toque en
  // móvil pueda abrir el submenú sin forzar la navegación) — el CSS abre el submenú tanto al
  // pasar el mouse (escritorio) como con la clase "abierta" que alterna ese botón (móvil/touch).
  function renderMenu(menu, paginasONiveL, idiomaSiFallback) {
    var idioma, items;
    if (Array.isArray(menu) && menu.length && menu[0] && ('id_menu' in menu[0])) {
      idioma = paginasONiveL; items = menu; // firma nueva: renderMenu(estado.menu, idioma)
    } else if (Array.isArray(menu) && menu.length) {
      // firma vieja renderMenu(paginas, idioma), por compatibilidad con llamadas existentes
      idioma = paginasONiveL;
      items = menu.map(function (p, i) {
        return { id_menu: 'pag-' + p.id_pagina, padre: '', orden: p.orden_menu || i, url: '#' + p.slug, etiqueta: p.titulo, etiqueta_en: p.titulo_en, etiqueta_zh: p.titulo_zh };
      });
    } else {
      idioma = paginasONiveL || idiomaSiFallback; items = [];
    }
    function etiquetaMenu_(m) {
      if (idioma === 'en' && m.etiqueta_en) { return m.etiqueta_en; }
      if (idioma === 'zh' && m.etiqueta_zh) { return m.etiqueta_zh; }
      return m.etiqueta || '';
    }
    function hijosDe_(idPadre) {
      return items.filter(function (m) { return (m.padre || '') === idPadre; })
        .sort(function (a, b) { return Number(a.orden || 0) - Number(b.orden || 0); });
    }
    function nivel_(lista, profundidad) {
      return lista.map(function (m) {
        var hijos = hijosDe_(m.id_menu);
        var tieneHijos = hijos.length > 0;
        return (
          '<li class="' + (tieneHijos ? 'tiene-submenu' : '') + '">' +
          '<a href="' + esc(m.url || '#') + '">' + esc(etiquetaMenu_(m)) + '</a>' +
          (tieneHijos ? '<button type="button" class="abrir-submenu" aria-expanded="false" aria-label="Mostrar opciones de ' + esc(etiquetaMenu_(m)) + '">▾</button>' : '') +
          (tieneHijos ? '<ul class="submenu submenu-nivel' + profundidad + '">' + nivel_(hijos, profundidad + 1) + '</ul>' : '') +
          '</li>'
        );
      }).join('');
    }
    return nivel_(hijosDe_(''), 1);
  }

  function renderBlog(posts, idioma) {
    return posts.map(function (p) {
      return (
        '<a class="tarjeta-blog" href="#blog/' + esc(p.slug) + '">' +
        '<div class="cuerpo"><div class="fecha">' + esc(new Date(p.fecha_pub).toLocaleDateString('es-CL')) + '</div>' +
        '<h3>' + esc(campo_(p, 'titulo', idioma)) + '</h3><p>' + esc(p.resumen || '') + '</p></div></a>'
      );
    }).join('');
  }

  function renderPostBlog(post, idioma) {
    if (!post) { return '<div class="cargando">' + (window.I18n ? I18n.t('articulo_no_encontrado') : 'Artículo no encontrado.') + '</div>'; }
    var parrafos = String(post.contenido || '').split('\n').filter(Boolean).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    return (
      '<section><div class="contenedor" style="max-width:760px">' +
      '<p class="fecha">' + esc(new Date(post.fecha_pub).toLocaleDateString('es-CL')) + '</p>' +
      '<h1>' + esc(campo_(post, 'titulo', idioma)) + '</h1>' + parrafos +
      '</div></section>'
    );
  }

  return {
    renderPagina: renderPagina, renderMenu: renderMenu, renderBlog: renderBlog, renderPostBlog: renderPostBlog,
    activarReveal: activarReveal, esc: esc, campo: campo_,
    // Expuestas para que carrito.js pueda mostrar un precio de referencia por línea con el
    // mismo formato exacto que ya ven en las tarjetas de plan/producto — nunca un segundo
    // formateador que pueda mostrar un número distinto para el mismo dato.
    formatoPrecio: formatoPrecioPlan_, planDe: planDe_
  };
})();
