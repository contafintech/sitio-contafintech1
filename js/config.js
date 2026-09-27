/* ============================================================================
 * config.js — Carga los JSON publicados por Apps Script (16_Publicador.gs) y
 * expone un objeto Sitio con todo lo que el resto del JS necesita. Nada aquí
 * está escrito a mano: todo sale de data/*.json, que a su vez sale del Sheet.
 * ========================================================================== */

window.Sitio = (function () {
  // URL de la Web App de Apps Script (doPost/doGet). Se fija una sola vez al
  // desplegar, y viene también dentro de config.json como url_api por si se
  // quiere cambiar sin tocar este archivo.
  var URL_API_POR_DEFECTO = 'https://script.google.com/macros/s/REEMPLAZAR_CON_EL_ID_DEL_DEPLOY/exec';

  var estado = {
    config: {}, paginas: [], menu: [], catalogo: {}, servicios: {}, blog: [], indicadores: [],
    mercado: { usa: [], chile: [], cripto: [], yen: null }, herramientas: { disponible: false }
  };

  function rutaDatos_(nombre) { return 'data/' + nombre + '.json?_=' + Date.now(); }

  async function cargarJson_(nombre, porDefecto) {
    try {
      var resp = await fetch(rutaDatos_(nombre));
      if (!resp.ok) { throw new Error('HTTP ' + resp.status); }
      return await resp.json();
    } catch (e) {
      console.warn('No se pudo cargar data/' + nombre + '.json:', e.message);
      return porDefecto;
    }
  }

  function aplicarMarca_() {
    var raiz = document.documentElement, c = estado.config;
    var colores = {
      color_primario: '--color-primario', color_secundario: '--color-secundario', color_acento: '--color-acento',
      color_terciario: '--color-terciario', color_fondo: '--color-fondo', color_texto: '--color-texto'
    };
    Object.keys(colores).forEach(function (clave) { if (c[clave]) { raiz.style.setProperty(colores[clave], c[clave]); } });

    aplicarTipografia_(c.tipografia_titulos, '--fuente-titulos');
    aplicarTipografia_(c.tipografia_texto, '--fuente-texto');
    if (c.tipografia_escala) { raiz.style.setProperty('--escala-texto', c.tipografia_escala); }
    raiz.setAttribute('data-theme', c.tema_default === 'dark' ? 'dark' : (c.tema_default === 'light' ? 'light' : 'auto'));

    document.title = c.empresa_nombre || document.title;
    var favicon = document.querySelector('link[rel="icon"]');
    if (favicon) { favicon.href = c.favicon_url || c.logo_url || favicon.href; }

    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && c.seo_descripcion) { metaDesc.setAttribute('content', c.seo_descripcion); }
    if (c.seo_keywords) {
      var metaKw = document.querySelector('meta[name="keywords"]') || document.head.appendChild(Object.assign(document.createElement('meta'), { name: 'keywords' }));
      metaKw.setAttribute('content', c.seo_keywords);
    }
    aplicarJsonLd_(c);
  }

  // Carga la fuente elegida desde Google Fonts (si no está ya cargada) y la deja
  // lista para usar en la variable CSS correspondiente. Nombre de fuente = como
  // aparece en fonts.google.com (ej: "Barlow Condensed", "Oswald", "Poppins").
  var fuentesCargadas_ = {};
  function aplicarTipografia_(nombre, variableCss) {
    if (!nombre) { return; }
    document.documentElement.style.setProperty(variableCss, '"' + nombre + '", system-ui, sans-serif');
    if (fuentesCargadas_[nombre]) { return; }
    fuentesCargadas_[nombre] = true;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(nombre).replace(/%20/g, '+') + ':wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }

  function aplicarJsonLd_(c) {
    var nodo = document.getElementById('jsonld-organizacion');
    if (!nodo || !c.empresa_nombre) { return; }
    var redes = ['redes_facebook', 'redes_instagram', 'redes_linkedin', 'redes_youtube', 'redes_tiktok'].map(function (k) { return c[k]; }).filter(Boolean);
    var datos = {
      '@context': 'https://schema.org', '@type': 'Organization',
      name: c.empresa_nombre, url: c.sitio_url || '', logo: c.logo_url || '', description: c.seo_descripcion || '',
      email: c.empresa_correo || '', telephone: c.empresa_telefono || ''
    };
    if (c.empresa_direccion || c.ciudad) {
      datos.address = { '@type': 'PostalAddress', streetAddress: c.empresa_direccion || '', addressLocality: c.ciudad || '', addressRegion: c.region || '', addressCountry: c.pais || 'CL' };
    }
    if (c.latitud && c.longitud) { datos.geo = { '@type': 'GeoCoordinates', latitude: c.latitud, longitude: c.longitud }; }
    if (redes.length) { datos.sameAs = redes; }
    nodo.textContent = JSON.stringify(datos);
  }

  // Los módulos (tienda/servicios/blog) y el interruptor general del sitio se
  // consultan desde aquí para que index.html no tenga que repetir Config.get.
  function moduloActivo(nombre) { return estado.config['modulo_' + nombre] !== 'FALSE' && estado.config['modulo_' + nombre] !== false; }
  function sitioActivo() { return estado.config.sitio_activo !== 'FALSE' && estado.config.sitio_activo !== false; }

  async function cargarTodo_() {
    var resultados = await Promise.all([
      cargarJson_('config', {}), cargarJson_('paginas', []), cargarJson_('catalogo', { productos: [], variantes: [], categorias: [], caracteristicas: [], descuentos: [] }),
      cargarJson_('servicios', { servicios: [], planes: [], packs: [], pack_items: [] }), cargarJson_('blog', []), cargarJson_('indicadores', []),
      cargarJson_('mercado', { usa: [], chile: [], cripto: [], yen: null }), cargarJson_('herramientas', { disponible: false }), cargarJson_('menu', [])
    ]);
    return {
      config: resultados[0], paginas: resultados[1], catalogo: resultados[2], servicios: resultados[3], blog: resultados[4],
      indicadores: resultados[5], mercado: resultados[6], herramientas: resultados[7], menu: resultados[8]
    };
  }

  async function iniciar() {
    var datos = await cargarTodo_();
    Object.assign(estado, datos);
    aplicarMarca_();
    document.dispatchEvent(new CustomEvent('sitio:listo'));
    return estado;
  }

  // ---- Actualización casi en vivo -------------------------------------------
  // El sitio sigue siendo estático (así se mantiene el costo casi cero) — esto NO abre una
  // conexión en vivo al Sheet, sino que vuelve a pedir los mismos data/*.json cada cierto
  // tiempo. Junto con la publicación automática al editar (backend, ~1 minuto de debounce),
  // el resultado práctico es que una pestaña ya abierta refleja un cambio del Sheet sin que
  // nadie tenga que recargar la página a mano. Compara por contenido (no por fecha) antes de
  // avisar, así una pestaña abierta toda la tarde no repinta nada si nadie cambió el Sheet.
  var ultimoJson_ = null;
  async function recargar() {
    var datos = await cargarTodo_();
    var huella = JSON.stringify(datos);
    if (huella === ultimoJson_) { return false; } // nada cambió desde la última vez — no repinta
    ultimoJson_ = huella;
    Object.assign(estado, datos);
    aplicarMarca_();
    document.dispatchEvent(new CustomEvent('sitio:actualizado'));
    return true;
  }

  var intervaloActualizacion_ = null;
  // segundos: cada cuánto revisar. Se detiene solo si la pestaña queda en segundo plano
  // (document.hidden) y retoma al volver, para no gastar cuota de lectura sin necesidad.
  function activarActualizacionAutomatica(segundos) {
    if (intervaloActualizacion_) { clearInterval(intervaloActualizacion_); }
    ultimoJson_ = JSON.stringify({ config: estado.config, paginas: estado.paginas, menu: estado.menu, catalogo: estado.catalogo, servicios: estado.servicios, blog: estado.blog, indicadores: estado.indicadores, mercado: estado.mercado, herramientas: estado.herramientas });
    intervaloActualizacion_ = setInterval(function () {
      if (document.hidden) { return; }
      recargar().catch(function (e) { console.warn('No se pudo revisar actualizaciones del sitio:', e.message); });
    }, (segundos || 60) * 1000);
  }

  function urlApi() { return estado.config.url_api || URL_API_POR_DEFECTO; }

  // Todas las escrituras (formulario, cotización, reserva) van con text/plain
  // para que el navegador NO dispare un preflight OPTIONS, que Apps Script no
  // sabe responder con las cabeceras CORS correctas.
  //
  // BUG REAL corregido: esto hacía `await resp.json()` directo, sin mirar antes qué devolvió el
  // servidor. Cuando el despliegue de la Web App NO está configurado con "Quién tiene acceso:
  // Cualquier usuario" (ej. quedó en "Cualquier usuario con cuenta de Google" o "Solo yo"), Google
  // intercepta la petición y devuelve SU PROPIA página HTML de acceso/login en vez de ejecutar
  // doPost() — el navegador recibe "<!DOCTYPE html>..." con status 200, y `.json()` explota con
  // "Unexpected token '<'", un error que no dice nada sobre la causa real. Como CADA acción
  // comercial (contacto, cotización, reserva, diagnóstico) pasa por esta misma función, un
  // despliegue mal configurado rompe TODOS los botones esenciales a la vez con el mismo síntoma.
  // Ahora se lee el texto crudo primero y, si no es JSON, se avisa exactamente cuál es el problema.
  async function llamarApi(accion, datos) {
    var resp = await fetch(urlApi(), {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ accion: accion, datos: datos || {} })
    });
    var texto = await resp.text();
    var json;
    try { json = JSON.parse(texto); } catch (e) {
      throw new Error('El servidor no respondió JSON (posible causa: el despliegue de la Web App no está configurado con "Quién tiene acceso: Cualquier usuario" — revisa Implementar > Gestionar implementaciones en el editor de Apps Script). Respuesta recibida: ' + texto.slice(0, 200));
    }
    if (!json.ok) { throw new Error(json.error || 'Error desconocido del servidor.'); }
    return json.datos;
  }

  function indicador(codigo) {
    var fila = estado.indicadores.filter(function (i) { return i.codigo === codigo; })[0];
    return fila ? Number(fila.valor) : null;
  }

  function paginaPorSlug(slug) {
    return estado.paginas.filter(function (p) { return p.slug === (slug || 'home'); })[0] || estado.paginas[0];
  }

  return {
    estado: estado, iniciar: iniciar, urlApi: urlApi, llamarApi: llamarApi, indicador: indicador,
    paginaPorSlug: paginaPorSlug, moduloActivo: moduloActivo, sitioActivo: sitioActivo,
    recargar: recargar, activarActualizacionAutomatica: activarActualizacionAutomatica
  };
})();
