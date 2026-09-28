/* ============================================================================
 * formulario.js — Formulario de contacto internacional/nacional bilingüe, con
 * antispam numérico de dos dígitos (reto firmado por el servidor). El servidor
 * (07_Antispam.gs) es la única autoridad: esto solo arma la interfaz.
 * ========================================================================== */

window.Formulario = (function () {
  var TEXTOS = {
    es: { titulo: 'Conversemos', nombre: 'Nombre', email: 'Correo', telefono: 'Teléfono (opcional)', mensaje: 'Mensaje', enviar: 'Enviar mensaje', enviando: 'Enviando…', ok: '¡Gracias! Te responderemos a la brevedad.', reto: '¿Cuánto es', esperaVerificacion: 'Espera un segundo, aún estamos preparando el formulario.', errorVerificacion: 'No se pudo cargar la verificación; inténtalo de nuevo en unos segundos.', errorConfig: 'El formulario todavía no está conectado al sistema (falta un paso de configuración pendiente en el panel de administración). Escríbenos directamente mientras se resuelve.' },
    en: { titulo: "Let's talk", nombre: 'Name', email: 'Email', telefono: 'Phone (optional)', mensaje: 'Message', enviar: 'Send message', enviando: 'Sending…', ok: 'Thanks! We will get back to you soon.', reto: 'What is', esperaVerificacion: 'Please wait a moment, the form is still loading.', errorVerificacion: 'The verification could not be loaded; try again in a few seconds.', errorConfig: 'The form is not connected to the system yet (a setup step is still pending in the admin panel). Please contact us directly in the meantime.' },
    zh: { titulo: '联系我们', nombre: '姓名', email: '邮箱', telefono: '电话（可选）', mensaje: '留言', enviar: '发送消息', enviando: '正在发送…', ok: '谢谢！我们会尽快回复您。', reto: '等于多少：', esperaVerificacion: '请稍候，表单仍在加载中。', errorVerificacion: '无法加载验证，请几秒后重试。', errorConfig: '表单尚未连接到系统（管理面板中还有一项配置未完成）。请在此期间直接联系我们。' }
  };

  // Antes, cualquier falla (red, o el propio servidor rechazando la petición) se tragaba en
  // silencio y mostraba siempre "no se pudo cargar la verificación, inténtalo de nuevo" — un
  // mensaje que sugiere un problema pasajero, aunque la causa real fuera permanente (falta
  // configurar Config.url_api tras publicar la Web App, o falta el Script Property
  // ANTISPAM_SECRETO). Ahora se distingue: si la URL de la API sigue siendo el valor de
  // ejemplo, o el servidor responde con un error explícito, se avisa que es un paso de
  // configuración pendiente — no algo que resolver reintentando.
  function urlApiSinConfigurar_() {
    return String(window.Sitio.urlApi() || '').indexOf('REEMPLAZAR_CON_EL_ID_DEL_DEPLOY') >= 0;
  }
  async function obtenerReto_() {
    if (urlApiSinConfigurar_()) { return { error: true, config: true }; }
    try {
      var resp = await fetch(window.Sitio.urlApi() + '?accion=antispam.emitir');
      var json = await resp.json();
      if (!json.ok) { console.warn('antispam.emitir:', json.error); return { error: true, config: true, detalle: json.error }; }
      return json.datos;
    } catch (e) { return { error: true, config: false, detalle: e.message }; }
  }

  function montar(contenedor, idioma) {
    idioma = idioma || (window.I18n ? I18n.idioma() : (navigator.language || 'es').slice(0, 2));
    var t = TEXTOS[idioma] || TEXTOS.es;
    var envoltorio = document.createElement('section');
    envoltorio.innerHTML =
      '<div class="contenedor"><div class="seccion-encabezado"><h2>' + t.titulo + '</h2></div>' +
      '<form class="formulario" id="form-contacto">' +
      '<input type="text" name="empresa_web" class="hp" tabindex="-1" autocomplete="off">' +
      '<div class="campo"><label>' + t.nombre + '</label><input required name="nombre" type="text"></div>' +
      '<div class="campo"><label>' + t.email + '</label><input required name="email" type="email"></div>' +
      '<div class="campo"><label>' + t.telefono + '</label><input name="telefono" type="tel"></div>' +
      '<div class="campo"><label>' + t.mensaje + '</label><textarea required name="mensaje" rows="4"></textarea></div>' +
      '<div class="reto-antispam" id="reto-antispam">…</div>' +
      '<div class="campo"><input required name="respuesta" type="number" placeholder="0"></div>' +
      '<button class="btn btn-primario" type="submit">' + t.enviar + '</button>' +
      '<div id="estado-formulario"></div>' +
      '</form></div>';
    contenedor.innerHTML = '';
    contenedor.appendChild(envoltorio);

    var form = envoltorio.querySelector('#form-contacto');
    var reto = null;
    var validarNombre_, validarEmail_, validarTelefono_;
    if (window.Validacion) {
      validarNombre_ = window.Validacion.enlazarValidacion(form.querySelector('[name="nombre"]'), window.Validacion.nombreValido, I18n.t('nombre_invalido'));
      validarEmail_ = window.Validacion.enlazarValidacion(form.querySelector('[name="email"]'), window.Validacion.emailValido, I18n.t('email_invalido'));
      validarTelefono_ = window.Validacion.enlazarValidacion(form.querySelector('[name="telefono"]'), window.Validacion.telefonoValido, I18n.t('telefono_invalido'));
    }
    function pintarReto_(r) {
      reto = (r && !r.error) ? r : null;
      var nodo = envoltorio.querySelector('#reto-antispam');
      if (reto) { nodo.textContent = t.reto + ' ' + reto.a + ' + ' + reto.b + '?'; return; }
      // config:true = paso de configuración pendiente (no se resuelve reintentando solo);
      // config:false = problema de red pasajero — ahí sí vale la pena reintentar.
      nodo.innerHTML = (r && r.config ? t.errorConfig : t.errorVerificacion) +
        ' <button type="button" class="reto-antispam-reintentar">↻</button>';
      var boton = nodo.querySelector('.reto-antispam-reintentar');
      if (boton) { boton.addEventListener('click', function () { nodo.textContent = '…'; obtenerReto_().then(pintarReto_); }); }
    }
    obtenerReto_().then(pintarReto_);

    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var estadoDiv = envoltorio.querySelector('#estado-formulario');
      if (!reto) { estadoDiv.innerHTML = '<p class="mensaje-estado error">' + t.esperaVerificacion + '</p>'; return; }
      if ((validarNombre_ && !validarNombre_()) || (validarEmail_ && !validarEmail_()) || (validarTelefono_ && !validarTelefono_())) { return; }
      var fd = new FormData(form);
      estadoDiv.innerHTML = '<p class="mensaje-estado">' + t.enviando + '</p>';
      try {
        await window.Sitio.llamarApi('contacto.enviar', {
          nombre: fd.get('nombre'), email: fd.get('email'), telefono: fd.get('telefono'), mensaje: fd.get('mensaje'),
          idioma: idioma, honeypot: fd.get('empresa_web'), token: reto.token, respuesta: Number(fd.get('respuesta'))
        });
        estadoDiv.innerHTML = '<p class="mensaje-estado ok">' + t.ok + '</p>';
        form.reset();
        obtenerReto_().then(pintarReto_);
      } catch (e) {
        estadoDiv.innerHTML = '<p class="mensaje-estado error">' + e.message + '</p>';
      }
    });
  }

  return { montar: montar };
})();
