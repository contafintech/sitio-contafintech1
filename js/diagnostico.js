/* ============================================================================
 * diagnostico.js — Formulario de "Diagnóstico tributario inicial" (carga de
 * PDF/Excel), mismo patrón de antispam firmado que formulario.js.
 * ----------------------------------------------------------------------------
 * IMPORTANTE (seguridad, decisión explícita del proyecto): esto SOLO sube un
 * archivo que el propio cliente descarga del sitio del SII — NUNCA pide su
 * clave del SII ni ninguna otra credencial. Si alguna vez alguien propone
 * "conectar directo con el SII" pidiendo usuario/clave acá, la respuesta es
 * no: se rompe esa garantía y expone al cliente y al negocio a un riesgo real.
 * ========================================================================== */

window.Diagnostico = (function () {
  var TEXTOS = {
    es: {
      titulo: 'Diagnóstico tributario inicial', nombre: 'Nombre', email: 'Correo', telefono: 'Teléfono (opcional)',
      tipoDocumento: 'Tipo de documento', archivo: 'Archivo (PDF, Excel o imagen)', enviar: 'Enviar documento', enviando: 'Enviando…',
      ok: '¡Listo! Recibimos tu documento — un asesor lo revisará y te contactará con un diagnóstico.',
      ayuda: 'Sube el F29, F22 o libro de compra/venta que ya descargaste desde el sitio del SII. Nunca te pediremos tu clave del SII.',
      reto: '¿Cuánto es', esperaVerificacion: 'Espera un segundo, aún estamos preparando el formulario.', errorVerificacion: 'No se pudo cargar la verificación; inténtalo de nuevo en unos segundos.',
      errorConfig: 'El formulario todavía no está conectado al sistema (falta un paso de configuración pendiente en el panel de administración). Escríbenos directamente mientras se resuelve.',
      f29: 'Formulario F29', f22: 'Formulario F22 (Renta anual)', libro: 'Libro de compra/venta', otro: 'Otro documento tributario'
    },
    en: {
      titulo: 'Initial tax diagnosis', nombre: 'Name', email: 'Email', telefono: 'Phone (optional)',
      tipoDocumento: 'Document type', archivo: 'File (PDF, Excel or image)', enviar: 'Send document', enviando: 'Sending…',
      ok: "Done! We received your document — an advisor will review it and contact you with a diagnosis.",
      ayuda: 'Upload the F29, F22 or purchase/sales ledger you already downloaded from the tax authority site. We will never ask for your tax authority password.',
      reto: 'What is', esperaVerificacion: 'Please wait a moment, the form is still loading.', errorVerificacion: 'The verification could not be loaded; try again in a few seconds.',
      errorConfig: 'The form is not connected to the system yet (a setup step is still pending in the admin panel). Please contact us directly in the meantime.',
      f29: 'F29 form', f22: 'F22 form (annual return)', libro: 'Purchase/sales ledger', otro: 'Other tax document'
    },
    zh: {
      titulo: '初步税务诊断', nombre: '姓名', email: '邮箱', telefono: '电话（可选）',
      tipoDocumento: '文件类型', archivo: '文件（PDF、Excel 或图片）', enviar: '发送文件', enviando: '正在发送…',
      ok: '完成！我们已收到您的文件——顾问将审核后与您联系并给出诊断。',
      ayuda: '上传您已从税务局网站下载的 F29、F22 或购销账簿。我们绝不会向您索要税务局密码。',
      reto: '等于多少：', esperaVerificacion: '请稍候，表单仍在加载中。', errorVerificacion: '无法加载验证，请几秒后重试。',
      errorConfig: '表单尚未连接到系统（管理面板中还有一项配置未完成）。请在此期间直接联系我们。',
      f29: 'F29 表', f22: 'F22 表（年度申报）', libro: '购销账簿', otro: '其他税务文件'
    }
  };

  // Mismo diagnóstico que formulario.js: distingue "falta un paso de configuración" (URL de la
  // API sin publicar, o el servidor rechazando la petición) de un problema de red pasajero, en
  // vez de mostrar siempre el mismo "inténtalo de nuevo" aunque reintentar nunca vaya a arreglarlo.
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

  // Lee el archivo elegido y lo deja en base64 puro (sin el prefijo "data:...;base64,").
  function archivoABase64_(file) {
    return new Promise(function (resolve, reject) {
      var lector = new FileReader();
      lector.onload = function () { resolve(String(lector.result).split(',')[1] || ''); };
      lector.onerror = reject;
      lector.readAsDataURL(file);
    });
  }

  function construirFormulario_(cont, idioma) {
    var t = TEXTOS[idioma] || TEXTOS.es;
    cont.innerHTML =
      '<p>' + t.ayuda + '</p>' +
      '<form class="formulario" id="form-diagnostico">' +
      '<input type="text" name="empresa_web" class="hp" tabindex="-1" autocomplete="off">' +
      '<div class="campo"><label>' + t.nombre + '</label><input required name="nombre" type="text"></div>' +
      '<div class="campo"><label>' + t.email + '</label><input required name="email" type="email"></div>' +
      '<div class="campo"><label>' + t.telefono + '</label><input name="telefono" type="tel"></div>' +
      '<div class="campo"><label>' + t.tipoDocumento + '</label><select name="tipo_documento">' +
      '<option value="f29">' + t.f29 + '</option><option value="f22">' + t.f22 + '</option>' +
      '<option value="libro_compraventa">' + t.libro + '</option><option value="otro">' + t.otro + '</option></select></div>' +
      '<div class="campo"><label>' + t.archivo + '</label><input required name="archivo" type="file" accept=".pdf,.xls,.xlsx,.jpg,.jpeg,.png"></div>' +
      '<div class="reto-antispam" id="reto-antispam-diag">…</div>' +
      '<div class="campo"><input required name="respuesta" type="number" placeholder="0"></div>' +
      '<button class="btn btn-primario" type="submit">' + t.enviar + '</button>' +
      '<div id="estado-diagnostico"></div>' +
      '</form>';

    var form = cont.querySelector('#form-diagnostico');
    var reto = null;
    var validarNombre_, validarEmail_, validarTelefono_;
    if (window.Validacion) {
      validarNombre_ = window.Validacion.enlazarValidacion(form.querySelector('[name="nombre"]'), window.Validacion.nombreValido, I18n.t('nombre_invalido'));
      validarEmail_ = window.Validacion.enlazarValidacion(form.querySelector('[name="email"]'), window.Validacion.emailValido, I18n.t('email_invalido'));
      validarTelefono_ = window.Validacion.enlazarValidacion(form.querySelector('[name="telefono"]'), window.Validacion.telefonoValido, I18n.t('telefono_invalido'));
    }
    function pedirReto() {
      obtenerReto_().then(function (r) {
        reto = (r && !r.error) ? r : null;
        var el = cont.querySelector('#reto-antispam-diag');
        if (!el) { return; }
        if (reto) { el.textContent = t.reto + ' ' + reto.a + ' + ' + reto.b + '?'; return; }
        el.innerHTML = (r && r.config ? t.errorConfig : t.errorVerificacion) + ' <button type="button" class="reto-antispam-reintentar">↻</button>';
        var boton = el.querySelector('.reto-antispam-reintentar');
        if (boton) { boton.addEventListener('click', function () { el.textContent = '…'; pedirReto(); }); }
      });
    }
    pedirReto();

    // Mapa MIME por extensión — el <input accept> ya filtra en el navegador, pero el valor real
    // que se manda es file.type (a veces vacío en navegadores raros); si viene vacío se infiere
    // por extensión para no rechazar de más en el servidor.
    function mimePorExtension_(nombre) {
      var ext = (nombre.split('.').pop() || '').toLowerCase();
      var mapa = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
      return mapa[ext] || 'application/octet-stream';
    }

    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      var estadoDiv = cont.querySelector('#estado-diagnostico');
      if (!reto) { estadoDiv.innerHTML = '<p class="mensaje-estado error">' + t.esperaVerificacion + '</p>'; return; }
      if ((validarNombre_ && !validarNombre_()) || (validarEmail_ && !validarEmail_()) || (validarTelefono_ && !validarTelefono_())) { return; }
      var fd = new FormData(form);
      var archivo = fd.get('archivo');
      if (!archivo || !archivo.size) { return; }
      estadoDiv.innerHTML = '<p class="mensaje-estado">' + t.enviando + '</p>';
      try {
        var base64 = await archivoABase64_(archivo);
        await window.Sitio.llamarApi('diagnostico.subir', {
          nombre: fd.get('nombre'), email: fd.get('email'), telefono: fd.get('telefono'),
          tipo_documento: fd.get('tipo_documento'), archivo_nombre: archivo.name, mime_type: archivo.type || mimePorExtension_(archivo.name),
          archivo_base64: base64, honeypot: fd.get('empresa_web'), token: reto.token, respuesta: Number(fd.get('respuesta'))
        });
        estadoDiv.innerHTML = '<p class="mensaje-estado ok">' + t.ok + '</p>';
        form.reset();
        pedirReto();
      } catch (e) {
        estadoDiv.innerHTML = '<p class="mensaje-estado error">' + e.message + '</p>';
      }
    });
  }

  function montar(raiz) {
    (raiz || document).querySelectorAll('.diagnostico-tributario').forEach(function (cont) {
      if (cont.dataset.montado) { return; }
      cont.dataset.montado = '1';
      construirFormulario_(cont, window.I18n ? I18n.idioma() : 'es');
    });
  }

  return { montar: montar };
})();
