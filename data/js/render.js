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

  // ---- hero: medio (video/gif/imagen/3d) + título + subtítulo + botones ----
  // Prioridad del medio: Config.hero_video_url > hero_gif_url > hero_imagen_url (edición
  // rápida, un solo lugar, pensada para el hero principal) — si las tres están vacías, usa
  // el elemento tipo "medio" de esta sección (más flexible: permite un hero distinto por
  // página vía Elementos/Medios). Así ambos mecanismos quedan realmente conectados.
  function hero_(s, i, cfg, idioma) {
    cfg = cfg || {};
    var medioHtml = '';
    if (cfg.hero_video_url) {
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
    var botones = porTipo_(s, 'boton').map(function (b, i2) {
      return '<a class="btn ' + (i2 === 0 ? 'btn-primario' : 'btn-secundario') + '" href="' + esc(b.enlace || '#') + '">' + esc(campo_(b, 'titulo', idioma)) + '</a>';
    }).join('');
    return (
      '<section class="seccion-hero reveal"><div class="fondo-decorativo" aria-hidden="true"></div><div class="contenedor">' +
      '<div class="contenido"><h1>' + esc(campo_(s, 'titulo', idioma)) + '</h1>' +
      '<p class="subtitulo">' + esc(campo_(s, 'texto', idioma)) + '</p>' +
      '<div class="acciones">' + botones + '</div></div>' +
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

  // Elemento tipo='tarjeta': titulo/texto = nombre/descripción; datos = { precio, unidad,
  // caracteristicas: [...], icono, destacada, boton_texto }; enlace = link del botón.
  function tarjetas_(s, i, cfg, idioma) {
    var html = porTipo_(s, 'tarjeta').map(function (t) {
      var d = datosIdioma_(t, idioma);
      var lista = (d.caracteristicas || []).map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('');
      return (
        '<div class="tarjeta' + (d.destacada ? ' destacada' : '') + '">' +
        (d.icono ? '<div class="icono">' + esc(d.icono) + '</div>' : '') +
        '<h3>' + esc(campo_(t, 'titulo', idioma)) + '</h3><p>' + esc(campo_(t, 'texto', idioma)) + '</p>' +
        (d.precio ? '<div class="precio">' + esc(d.precio) + ' <small>' + esc(d.unidad || '') + '</small></div>' : '') +
        '<ul>' + lista + '</ul>' +
        (t.enlace ? '<a class="btn btn-primario btn-bloque" href="' + esc(t.enlace) + '">' + esc(d.boton_texto || 'Elegir') + '</a>' : '') +
        '</div>'
      );
    }).join('');
    return seccionConEncabezado_(s, '<div class="grid-tarjetas">' + html + '</div>', idioma);
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
    return seccionConEncabezado_(s, '<table class="comparativa"><thead>' + thead + '</thead><tbody>' + tbody + '</tbody></table>', idioma);
  }

  function seccionConEncabezado_(s, cuerpo, idioma) {
    var titulo = campo_(s, 'titulo', idioma), texto = campo_(s, 'texto', idioma);
    return (
      '<section class="reveal"><div class="contenedor">' +
      (titulo ? '<div class="seccion-encabezado"><h2>' + esc(titulo) + '</h2>' + (texto ? '<p>' + esc(texto) + '</p>' : '') + '</div>' : '') +
      cuerpo + '</div></section>'
    );
  }

  var RENDERIZADORES_ = {
    hero: hero_, texto_imagen: textoImagen_, tarjetas: tarjetas_, testimonios: testimonios_,
    llamado_accion: llamadoAccion_, preguntas_frecuentes: preguntasFrecuentes_, tabla_comparativa: tablaComparativa_
  };

  // cfg = estado.config (data/config.json) — permite que un tipo de sección (hoy solo el
  // hero) lea directamente valores de Config además de su propio contenido en Elementos.
  // idioma = 'es' (default) | 'en' | 'zh' — ver campo_()/datosIdioma_() más arriba.
  function renderPagina(pagina, cfg, idioma) {
    if (!pagina) { return '<div class="cargando">' + (window.I18n ? I18n.t('pagina_no_encontrada') : 'Página no encontrada.') + '</div>'; }
    return pagina.secciones.map(function (s, i) {
      var fn = RENDERIZADORES_[s.tipo];
      if (!fn) { console.warn('Tipo de sección sin renderizador:', s.tipo); return ''; }
      try { return fn(s, i, cfg, idioma); } catch (e) { console.error('Error renderizando sección', s.id_seccion, e); return ''; }
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

  function renderMenu(paginas, idioma) {
    return paginas.map(function (p) { return '<li><a href="#' + esc(p.slug) + '">' + esc(campo_(p, 'titulo', idioma)) + '</a></li>'; }).join('');
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
    activarReveal: activarReveal, esc: esc, campo: campo_
  };
})();
