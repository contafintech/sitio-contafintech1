/* ============================================================================
 * formulario.js — Formulario de contacto internacional/nacional bilingüe, con
 * antispam numérico de dos dígitos (reto firmado por el servidor). El servidor
 * (07_Antispam.gs) es la única autoridad: esto solo arma la interfaz.
 * ========================================================================== */

window.Formulario = (function () {
  var TEXTOS = {
    es: { titulo: 'Conversemos', nombre: 'Nombre', email: 'Correo', telefono: 'Teléfono (opcional)', mensaje: 'Mensaje', enviar: 'Enviar mensaje', enviando: 'Enviando…', ok: '¡Gracias! Te responderemos a la brevedad.', reto: '¿Cuánto es', esperaVerificacion: 'Espera un segundo, aún estamos preparando el formulario.', errorVerificacion: 'No se pudo cargar la verificación; inténtalo de nuevo en unos segundos.' },
    en: { titulo: "Let's talk", nombre: 'Name', email: 'Email', telefono: 'Phone (optional)', mensaje: 'Message', enviar: 'Send message', enviando: 'Sending…', ok: 'Thanks! We will get back to you soon.', reto: 'What is', esperaVerificacion: 'Please wait a moment, the form is still loading.', errorVerificacion: 'The verification could not be loaded; try again in a few seconds.' },
    zh: { titulo: '联系我们', nombre: '姓名', email: '邮箱', telefono: '电话（可选）', mensaje: '留言', enviar: '发送消息', enviando: '正在发送…', ok: '谢谢！我们会尽快回复您。', reto: '等于多少：', esperaVerificacion: '请稍候，表单仍在加载中。', errorVerificacion: '无法加载验证，请几秒后重试。' }
  };

  async function obtenerReto_() {
    // Preferimos pedir el reto a la propia API (misma que recibe el envío);
    // si la Web App de Apps Script no está disponible, seguimos igual: el
    // servidor validará el reto al recibir el formulario.
    try {
      var resp = await fetch(window.Sitio.urlApi() + '?accion=antispam.emitir');
      var json = await resp.json();
      return json.datos;
    } catch (e) { return null; }
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
    obtenerReto_().then(function (r) {
      reto = r;
      envoltorio.querySelector('#reto-antispam').textContent = reto ? (t.reto + ' ' + reto.a + ' + ' + reto.b + '?') : t.errorVerificacion;
    });

    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var estadoDiv = envoltorio.querySelector('#estado-formulario');
      if (!reto) { estadoDiv.innerHTML = '<p class="mensaje-estado error">' + t.esperaVerificacion + '</p>'; return; }
      var fd = new FormData(form);
      estadoDiv.innerHTML = '<p class="mensaje-estado">' + t.enviando + '</p>';
      try {
        await window.Sitio.llamarApi('contacto.enviar', {
          nombre: fd.get('nombre'), email: fd.get('email'), telefono: fd.get('telefono'), mensaje: fd.get('mensaje'),
          idioma: idioma, honeypot: fd.get('empresa_web'), token: reto.token, respuesta: Number(fd.get('respuesta'))
        });
        estadoDiv.innerHTML = '<p class="mensaje-estado ok">' + t.ok + '</p>';
        form.reset();
        obtenerReto_().then(function (r) { reto = r; envoltorio.querySelector('#reto-antispam').textContent = reto ? (t.reto + ' ' + reto.a + ' + ' + reto.b + '?') : ''; });
      } catch (e) {
        estadoDiv.innerHTML = '<p class="mensaje-estado error">' + e.message + '</p>';
      }
    });
  }

  return { montar: montar };
})();
