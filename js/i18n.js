/* ============================================================================
 * i18n.js — Diccionario de textos de INTERFAZ fijos (botones, mensajes de
 * estado, aria-labels...). Esto es distinto del contenido de negocio (Config,
 * Paginas/Secciones/Elementos, Productos, Blog), que se traduce directo en el
 * Sheet con columnas _en/_zh (ver render.js: campo_()/datosIdioma_()).
 * Acá van los textos que están escritos en el código, no en una hoja — el
 * administrador no los edita, así que viven en este archivo estático.
 * ========================================================================== */

window.I18n = (function () {
  var CLAVE = 'idioma_v1';
  var DISPONIBLES = ['es', 'en', 'zh'];

  var DICCIONARIO = {
    cargando: { es: 'Cargando…', en: 'Loading…', zh: '正在加载…' },
    abrir_menu: { es: 'Abrir menú', en: 'Open menu', zh: '打开菜单' },
    tu_carrito: { es: 'Tu carrito', en: 'Your cart', zh: '您的购物车' },
    total: { es: 'Total', en: 'Total', zh: '总计' },
    solicitar_cotizacion: { es: 'Solicitar cotización', en: 'Request a quote', zh: '申请报价' },
    cerrar: { es: 'Cerrar', en: 'Close', zh: '关闭' },
    agregar_al_carrito: { es: 'Agregar al carrito', en: 'Add to cart', zh: '加入购物车' },
    quitar: { es: 'Quitar', en: 'Remove', zh: '移除' },
    carrito_vacio: { es: 'Tu carrito está vacío.', en: 'Your cart is empty.', zh: '您的购物车是空的。' },
    ingresa_rut: { es: 'Ingresa tu RUT para generar la cotización.', en: 'Enter your tax ID to generate the quote.', zh: '请输入您的税号以生成报价。' },
    rut_invalido: { es: 'El RUT ingresado no es válido.', en: 'The tax ID entered is not valid.', zh: '输入的税号无效。' },
    nombre_invalido: { es: 'Ingresa un nombre válido.', en: 'Enter a valid name.', zh: '请输入有效的姓名。' },
    email_invalido: { es: 'El correo ingresado no es válido.', en: 'The email entered is not valid.', zh: '输入的邮箱无效。' },
    telefono_invalido: { es: 'El teléfono ingresado no es válido.', en: 'The phone number entered is not valid.', zh: '输入的电话号码无效。' },
    generando_cotizacion: { es: 'Generando cotización…', en: 'Generating quote…', zh: '正在生成报价…' },
    cotizacion_enviada: { es: '¡Listo! Cotización {id} enviada a tu correo.', en: 'Done! Quote {id} was sent to your email.', zh: '完成！报价单 {id} 已发送至您的邮箱。' },
    ver_pdf: { es: 'Ver PDF', en: 'View PDF', zh: '查看PDF' },
    error_cotizacion: { es: 'No se pudo generar la cotización: {error} (¿tu RUT ya está registrado como cliente?)', en: 'The quote could not be generated: {error} (is your tax ID already registered as a client?)', zh: '无法生成报价：{error}（您的税号是否已注册为客户？）' },
    envio_gratis: { es: '🚚 Envío gratis', en: '🚚 Free shipping', zh: '🚚 免运费' },
    envio_estimado: { es: '🚚 Envío estimado desde ${monto}', en: '🚚 Estimated shipping from ${monto}', zh: '🚚 预计运费低至 ${monto}' },
    envio_gratis_sobre: { es: ' (gratis sobre ${monto})', en: ' (free over ${monto})', zh: '（满 ${monto} 免运费）' },
    todavia_sin_productos: { es: 'Todavía no hay productos publicados.', en: 'No products published yet.', zh: '暂无已发布的产品。' },
    // ---- Tarjetas de plan (planesServicio_ en render.js) ----
    plan_por_mes: { es: '/mes', en: '/mo', zh: '/月' },
    plan_por_anio: { es: '/año', en: '/yr', zh: '/年' },
    plan_mas_elegido: { es: 'Más elegido', en: 'Most popular', zh: '最受欢迎' },
    cotizar_plan: { es: 'Cotizar', en: 'Get a quote', zh: '获取报价' },
    contratar_plan: { es: 'Contratar', en: 'Get started', zh: '立即办理' },
    suscribir_plan: { es: 'Suscribir', en: 'Subscribe', zh: '订阅' },
    ver_detalle_plan: { es: 'Ver detalle completo', en: 'See full details', zh: '查看完整详情' },
    elige_que_quieres_hacer: { es: '¿Qué quieres hacer?', en: 'What do you want to do?', zh: '您想做什么？' },
    solo_cotizar: { es: 'Solo cotizar', en: 'Just get a quote', zh: '仅获取报价' },
    quiero_contratar: { es: 'Quiero contratar', en: 'I want to sign up', zh: '我想办理' },
    plan_agregado: { es: '✓ Agregado — abriendo tu carrito…', en: '✓ Added — opening your cart…', zh: '✓ 已添加——正在打开购物车…' },
    // ---- Estimado del carrito (antes decía "Total: $0" fijo, sin actualizarse nunca) ----
    estimado_carrito: { es: 'Estimado: {monto}', en: 'Estimated: {monto}', zh: '预计：{monto}' },
    estimado_a_cotizar: { es: 'Precio a cotizar directamente.', en: 'Price to be quoted directly.', zh: '价格待直接报价。' },
    estimado_incluye_a_medida: { es: '+ ítem(s) a medida (se cotizan directamente).', en: '+ custom item(s) (quoted directly).', zh: '+ 定制项目（直接报价）。' },
    carrito_explicacion_flujo: { es: 'Al aceptar tu cotización, tu contrato se genera automáticamente con estos mismos datos — sin volver a escribir nada.', en: 'Once you accept your quote, your contract is generated automatically with this same data — no re-entering anything.', zh: '接受报价后，系统会自动用相同的数据生成您的合同——无需重新填写任何信息。' },
    // ---- Migas de pan (orientación en páginas de servicios/planes) ----
    inicio_miga: { es: 'Inicio', en: 'Home', zh: '首页' },
    // ---- CTA de la cabecera ----
    // "Cotizar ahora" pasó a ser el último ítem del menú "Servicios" (hoja Menu) — este botón de
    // la cabecera (siempre visible, cabecera "sticky") ahora es "Acceso de clientes" en vez de
    // duplicar un acceso a Servicios que ya está un clic más allá en el menú. Lleva a la página
    // "Acceso Clientes" (ya existente, "próximamente" hasta que se construya el login real).
    cotizar_ahora_cabecera: { es: 'Cotizar ahora', en: 'Get a quote', zh: '立即报价' },
    acceso_clientes_cabecera: { es: 'Acceso de clientes', en: 'Client access', zh: '客户登录' },
    contenido_actualizado: { es: '✓ Contenido actualizado', en: '✓ Content updated', zh: '✓ 内容已更新' },
    pagina_no_encontrada: { es: 'Página no encontrada.', en: 'Page not found.', zh: '页面未找到。' },
    volvemos_pronto_titulo: { es: 'Volvemos pronto', en: 'Back soon', zh: '即将回归' },
    volvemos_pronto_texto: { es: 'Estamos actualizando el sitio. Gracias por tu paciencia.', en: 'We are updating the site. Thanks for your patience.', zh: '网站正在更新中，感谢您的耐心等待。' },
    politica_privacidad: { es: 'Política de privacidad', en: 'Privacy policy', zh: '隐私政策' },
    // ---- Pie de página (3 columnas, ver pintarPie_ en index.html) ----
    pie_titulo_ayuda: { es: 'Ayuda', en: 'Help', zh: '帮助' },
    pie_titulo_menu: { es: 'Menú principal', en: 'Main menu', zh: '主菜单' },
    pie_titulo_contacto: { es: 'Contáctanos', en: 'Contact us', zh: '联系我们' },
    pie_canal_youtube: { es: 'Canal de YouTube', en: 'YouTube channel', zh: 'YouTube 频道' },
    pie_generado: { es: 'Sitio generado y administrado 100% desde Google Sheets.', en: 'Site generated and managed 100% from Google Sheets.', zh: '网站100%通过 Google Sheets 生成与管理。' },
    menu_tienda: { es: 'Tienda', en: 'Shop', zh: '商店' },
    menu_blog: { es: 'Blog', en: 'Blog', zh: '博客' },
    articulo_no_encontrado: { es: 'Artículo no encontrado.', en: 'Article not found.', zh: '未找到该文章。' },
    // ---- cotizacion.html ----
    falta_id_cotizacion: { es: 'Falta el número de cotización en el enlace.', en: 'The quote number is missing from the link.', zh: '链接中缺少报价单编号。' },
    cargando_cotizacion: { es: 'Cargando tu cotización…', en: 'Loading your quote…', zh: '正在加载您的报价单…' },
    cotizacion_titulo: { es: 'Cotización {id}', en: 'Quote {id}', zh: '报价单 {id}' },
    cotizacion_para: { es: 'Para: {nombre} — Estado: {estado}', en: 'For: {nombre} — Status: {estado}', zh: '客户：{nombre} — 状态：{estado}' },
    col_item: { es: 'Ítem', en: 'Item', zh: '项目' },
    col_cantidad: { es: 'Cant.', en: 'Qty.', zh: '数量' },
    col_precio: { es: 'Precio', en: 'Price', zh: '价格' },
    subtotal: { es: 'Subtotal', en: 'Subtotal', zh: '小计' },
    descuento: { es: 'Descuento', en: 'Discount', zh: '折扣' },
    iva: { es: 'IVA', en: 'Tax', zh: '税额' },
    total_pagar: { es: 'Total', en: 'Total', zh: '总计' },
    ver_pdf_cotizacion: { es: 'Ver PDF de la cotización', en: 'View quote PDF', zh: '查看报价单PDF' },
    aceptar_cotizacion: { es: 'Aceptar cotización', en: 'Accept quote', zh: '接受报价' },
    rechazar_cotizacion: { es: 'Rechazar', en: 'Decline', zh: '拒绝' },
    enviando_respuesta: { es: 'Enviando tu respuesta…', en: 'Sending your response…', zh: '正在提交您的回复…' },
    contrato_generando: { es: '¡Gracias! Tu contrato se está generando y llegará a tu correo.', en: 'Thank you! Your contract is being generated and will arrive in your email.', zh: '谢谢！您的合同正在生成，稍后将发送至您的邮箱。' },
    cotizacion_rechazada: { es: 'Cotización rechazada. Si cambias de opinión, contáctanos.', en: 'Quote declined. If you change your mind, contact us.', zh: '报价已拒绝。如改变主意，请随时联系我们。' },
    no_se_pudo_cargar_cotizacion: { es: 'No se pudo cargar la cotización: {error}', en: 'The quote could not be loaded: {error}', zh: '无法加载报价单：{error}' },
    como_pagar: { es: 'Cómo pagar', en: 'How to pay', zh: '付款方式' },
    // ---- verificacion.html ----
    falta_codigo_documento: { es: 'Falta el código del documento en el enlace.', en: 'The document code is missing from the link.', zh: '链接中缺少文件验证码。' },
    documento_invalido: { es: 'Este documento no es válido o fue revocado.', en: 'This document is not valid or has been revoked.', zh: '该文件无效或已被撤销。' },
    no_se_pudo_verificar: { es: 'No se pudo verificar el documento: {error}', en: 'The document could not be verified: {error}', zh: '无法验证该文件：{error}' },
    verificando_documento: { es: 'Verificando documento…', en: 'Verifying document…', zh: '正在验证文件…' },
    documento_valido: { es: 'Documento válido', en: 'Valid document', zh: '文件有效' },
    verificacion_titulo: { es: 'Verificación de documento', en: 'Document verification', zh: '文件验证' },
    verificacion_intro: { es: 'Todo documento (cotización o contrato) que emitimos lleva un código QR con un hash único. Esta página confirma si el documento que tienes en tus manos es el mismo que emitimos, sin alteraciones.', en: 'Every document (quote or contract) we issue carries a QR code with a unique hash. This page confirms whether the document you have is the same one we issued, unaltered.', zh: '我们出具的每份文件（报价单或合同）都带有含唯一哈希值的二维码。此页面用于确认您手中的文件与我们出具的原件是否一致、未被篡改。' },
    documento_valido_sin_alterar: { es: '✔ Documento válido y sin alteraciones.', en: '✔ Valid document, unaltered.', zh: '✔ 文件有效，未被篡改。' },
    tipo_documento: { es: 'Tipo', en: 'Type', zh: '类型' },
    numero_documento: { es: 'Número', en: 'Number', zh: '编号' },
    fecha_documento: { es: 'Fecha', en: 'Date', zh: '日期' },
    nota_firma: { es: 'Esta es una verificación propia del sistema (hash + QR), no una Firma Electrónica Avanzada según la Ley 19.799.', en: 'This is an in-house verification (hash + QR), not an Advanced Electronic Signature under Chilean Law 19.799.', zh: '此为系统内部验证（哈希+二维码），并非依据智利第19.799号法律的高级电子签名。' },
    documento_invalido_revocado: { es: '✘ Este documento no es válido o fue revocado. Si tienes dudas, contáctanos directamente.', en: '✘ This document is not valid or has been revoked. If in doubt, contact us directly.', zh: '✘ 该文件无效或已被撤销。如有疑问，请直接联系我们。' },
    // ---- Tienda: buscador, filtro de categoría y orden (renderTienda_ en index.html) ----
    tienda_buscar_placeholder: { es: 'Buscar productos…', en: 'Search products…', zh: '搜索产品…' },
    tienda_categoria_todas: { es: 'Todas las categorías', en: 'All categories', zh: '所有分类' },
    tienda_ordenar: { es: 'Ordenar', en: 'Sort', zh: '排序' },
    tienda_orden_relevancia: { es: 'Relevancia', en: 'Relevance', zh: '相关性' },
    tienda_orden_precio_asc: { es: 'Precio: menor a mayor', en: 'Price: low to high', zh: '价格：从低到高' },
    tienda_orden_precio_desc: { es: 'Precio: mayor a menor', en: 'Price: high to low', zh: '价格：从高到低' },
    tienda_orden_nombre: { es: 'Nombre (A-Z)', en: 'Name (A-Z)', zh: '名称（A-Z）' },
    tienda_sin_resultados: { es: 'Ningún producto coincide con tu búsqueda.', en: 'No products match your search.', zh: '没有符合搜索条件的产品。' },
    // ---- Confianza cerca del botón de cotizar (reduce el abandono del carrito) ----
    carrito_confianza_msg: { es: '🔒 Sin compromiso — respuesta dentro de 1 día hábil.', en: '🔒 No commitment — we reply within 1 business day.', zh: '🔒 无需承诺——1个工作日内回复。' },
    // ---- Seguimiento de pedido (seguimiento.js) ----
    menu_seguimiento: { es: 'Seguimiento de pedido', en: 'Track my order', zh: '订单跟踪' },
    seguimiento_titulo: { es: 'Seguimiento de pedido', en: 'Track my order', zh: '订单跟踪' },
    seguimiento_intro: { es: 'Ingresa el número de tu cotización o pedido y el correo o RUT con el que compraste.', en: 'Enter your quote or order number and the email or tax ID you purchased with.', zh: '请输入您的报价单或订单编号，以及购买时使用的邮箱或税号。' },
    seguimiento_campo_id: { es: 'Número de cotización o pedido', en: 'Quote or order number', zh: '报价单或订单编号' },
    seguimiento_id_placeholder: { es: 'Ej: COT-000123 o PRV-000045', en: 'E.g. COT-000123 or PRV-000045', zh: '例如：COT-000123 或 PRV-000045' },
    seguimiento_campo_verificador: { es: 'Tu correo o RUT', en: 'Your email or tax ID', zh: '您的邮箱或税号' },
    seguimiento_verificador_placeholder: { es: 'correo@ejemplo.com o 12345678-9', en: 'email@example.com or tax ID', zh: 'email@example.com 或税号' },
    seguimiento_boton: { es: 'Consultar', en: 'Track', zh: '查询' },
    seguimiento_buscando: { es: 'Buscando tu pedido…', en: 'Looking up your order…', zh: '正在查询您的订单…' },
    seguimiento_error: { es: 'No se pudo consultar: {error}', en: 'Could not look this up: {error}', zh: '查询失败：{error}' },
    seguimiento_numero: { es: 'Número', en: 'Number', zh: '编号' },
    seguimiento_estado_cotizacion: { es: 'Estado de la cotización', en: 'Quote status', zh: '报价单状态' },
    seguimiento_estado_pedido: { es: 'Estado del pedido', en: 'Order status', zh: '订单状态' },
    seguimiento_estado_despacho: { es: 'Estado del despacho', en: 'Shipment status', zh: '发货状态' },
    seguimiento_sin_despachar: { es: 'preparando', en: 'preparing', zh: '准备中' },
    seguimiento_courier: { es: 'Empresa de despacho', en: 'Courier', zh: '快递公司' },
    seguimiento_ver_tracking: { es: 'Ver seguimiento del courier', en: 'Track with courier', zh: '查看快递跟踪' },
    seguimiento_sin_despacho: { es: 'Este pedido no incluye productos físicos para despachar.', en: 'This order has no physical products to ship.', zh: '此订单不含需要配送的实体商品。' },
    // ---- Agendamiento (agendamiento.js) — pensado para ser fácil de usar a cualquier edad ----
    menu_agendar: { es: 'Agendar hora', en: 'Book an appointment', zh: '预约' },
    agenda_titulo: { es: 'Agendar tu hora', en: 'Book your appointment', zh: '预约时间' },
    agenda_intro: { es: 'Sigue estos pasos simples. Puedes volver atrás en cualquier momento.', en: 'Follow these simple steps. You can go back at any time.', zh: '请按以下简单步骤操作。您可以随时返回上一步。' },
    agenda_paso_de: { es: 'Paso {actual} de {total}', en: 'Step {actual} of {total}', zh: '第 {actual} 步，共 {total} 步' },
    agenda_paso1_titulo: { es: '¿Qué necesitas agendar?', en: 'What do you need to book?', zh: '您需要预约什么？' },
    agenda_paso2_titulo: { es: '¿En qué oficina?', en: 'Which office?', zh: '哪个办公室？' },
    agenda_paso3_titulo: { es: 'Elige el día y la hora', en: 'Choose the day and time', zh: '选择日期和时间' },
    agenda_paso4_titulo: { es: 'Tus datos de contacto', en: 'Your contact details', zh: '您的联系方式' },
    agenda_paso5_titulo: { es: 'Confirma tu hora', en: 'Confirm your appointment', zh: '确认预约' },
    agenda_sin_servicios: { es: 'No hay servicios disponibles para agendar en este momento.', en: 'No services are available to book right now.', zh: '目前没有可预约的服务。' },
    agenda_duracion: { es: '{min} minutos', en: '{min} minutes', zh: '{min} 分钟' },
    agenda_mes_anterior: { es: 'Mes anterior', en: 'Previous month', zh: '上个月' },
    agenda_mes_siguiente: { es: 'Mes siguiente', en: 'Next month', zh: '下个月' },
    agenda_manana: { es: 'Mañana', en: 'Morning', zh: '上午' },
    agenda_tarde: { es: 'Tarde', en: 'Afternoon', zh: '下午' },
    agenda_sin_horario: { es: 'Este servicio no tiene horario de atención configurado todavía. Contáctanos directamente para coordinar.', en: 'This service has no availability configured yet. Please contact us directly to coordinate.', zh: '该服务暂未设置可预约时间，请直接联系我们。' },
    agenda_buscando_horas: { es: 'Buscando horas disponibles…', en: 'Looking for available times…', zh: '正在查找可用时间…' },
    agenda_sin_horas: { es: 'No hay horas disponibles ese día. Prueba con otro día en el calendario.', en: 'No times available that day. Try another day on the calendar.', zh: '当天没有可用时间，请在日历中尝试其他日期。' },
    agenda_campo_nombre: { es: 'Tu nombre completo', en: 'Your full name', zh: '您的全名' },
    agenda_campo_email: { es: 'Tu correo electrónico', en: 'Your email', zh: '您的电子邮箱' },
    agenda_campo_telefono: { es: 'Tu teléfono', en: 'Your phone', zh: '您的电话' },
    agenda_campo_rut: { es: 'Tu RUT', en: 'Your tax ID (RUT)', zh: '您的税号（RUT）' },
    agenda_continuar: { es: 'Continuar', en: 'Continue', zh: '继续' },
    agenda_atras: { es: '← Volver', en: '← Back', zh: '← 返回' },
    agenda_resumen_servicio: { es: 'Servicio', en: 'Service', zh: '服务' },
    agenda_resumen_sede: { es: 'Oficina', en: 'Office', zh: '办公室' },
    agenda_resumen_fecha_hora: { es: 'Fecha y hora', en: 'Date and time', zh: '日期和时间' },
    agenda_resumen_abono: { es: 'Para confirmar tu hora, se requiere un abono de {monto}. Te enviaremos por correo los datos para pagarlo.', en: 'To confirm your appointment, a deposit of {monto} is required. We will email you the payment details.', zh: '为确认您的预约，需支付定金 {monto}。我们会通过邮件发送付款信息。' },
    agenda_resumen_sin_costo: { es: 'Esta hora no tiene costo de reserva — quedará confirmada de inmediato.', en: "This appointment has no booking fee — it will be confirmed right away.", zh: '此预约无需预订费——将立即确认。' },
    agenda_confirmar_boton: { es: 'Confirmar hora', en: 'Confirm appointment', zh: '确认预约' },
    agenda_confirmando: { es: 'Agendando tu hora…', en: 'Booking your appointment…', zh: '正在预约…' },
    agenda_exito_confirmada: { es: '✓ ¡Listo! Tu hora quedó confirmada. Te enviamos los detalles a tu correo.', en: "✓ Done! Your appointment is confirmed. We've sent the details to your email.", zh: '✓ 完成！您的预约已确认，详情已发送至您的邮箱。' },
    agenda_exito_pendiente: { es: '✓ Tu hora quedó reservada. Te enviamos por correo cómo pagar el abono de {monto} para confirmarla.', en: "✓ Your appointment is reserved. We've emailed you how to pay the {monto} deposit to confirm it.", zh: '✓ 您的预约已保留。我们已通过邮件告知如何支付 {monto} 定金以确认预约。' },
    agenda_error: { es: 'No se pudo agendar: {error}', en: 'Could not book: {error}', zh: '预约失败：{error}' },
    agenda_agendar_otra: { es: 'Agendar otra hora', en: 'Book another appointment', zh: '预约其他时间' },
    agenda_error_paso: { es: 'Ocurrió un problema al mostrar este paso. Puedes volver a intentarlo o partir de nuevo.', en: 'Something went wrong showing this step. You can try again or start over.', zh: '显示此步骤时出现问题。您可以重试或重新开始。' },
    agenda_reintentar: { es: 'Volver a intentar', en: 'Try again', zh: '重试' },
    agenda_empezar_de_nuevo: { es: 'Empezar de nuevo', en: 'Start over', zh: '重新开始' }
  };

  function obtener() {
    try { var v = localStorage.getItem(CLAVE); if (DISPONIBLES.indexOf(v) !== -1) { return v; } } catch (e) { /* sin storage: se usa el idioma por defecto */ }
    return 'es';
  }

  function establecer(codigo) {
    if (DISPONIBLES.indexOf(codigo) === -1) { return; }
    try { localStorage.setItem(CLAVE, codigo); } catch (e) { /* no persiste, pero sigue funcionando en esta carga */ }
    document.documentElement.setAttribute('lang', codigo);
    document.dispatchEvent(new CustomEvent('idioma:cambio', { detail: { idioma: codigo } }));
  }

  // t('clave', {marcador: valor}) — reemplaza {marcador} en el texto del idioma actual.
  function t(clave, valores) {
    var entrada = DICCIONARIO[clave];
    if (!entrada) { console.warn('i18n: falta la clave', clave); return clave; }
    var texto = entrada[obtener()] || entrada.es || clave;
    if (valores) { Object.keys(valores).forEach(function (k) { texto = texto.replace('{' + k + '}', valores[k]); }); }
    return texto;
  }

  return { t: t, idioma: obtener, setIdioma: establecer, disponibles: DISPONIBLES };
})();
