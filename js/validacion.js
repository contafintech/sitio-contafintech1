/* ============================================================================
 * validacion.js — Validación de RUT/correo/teléfono EN EL NAVEGADOR, mismo
 * criterio que el servidor (02_Rut.gs / 25_Validacion.gs backend) para que el
 * visitante vea el error al tipear, en vez de recién al enviar. El servidor
 * sigue siendo la única autoridad real — esto es solo para mejor experiencia,
 * nunca reemplaza la validación del backend.
 * ========================================================================== */

window.Validacion = (function () {
  var RE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var RE_TEL = /^[0-9]{7,15}$/;

  // Mismo algoritmo módulo 11 que backend/02_Rut.gs — si acá se ajusta, ajustar allá también.
  function dvRut_(cuerpo) {
    var suma = 0, mult = 2;
    for (var i = cuerpo.length - 1; i >= 0; i--) {
      suma += parseInt(cuerpo.charAt(i), 10) * mult;
      mult = (mult === 7) ? 2 : mult + 1;
    }
    var r = 11 - (suma % 11);
    return r === 11 ? '0' : (r === 10 ? 'K' : String(r));
  }

  function rutValido(texto) {
    var soloDigitos = String(texto || '').replace(/[^\dkK]/g, '');
    if (soloDigitos.length < 8) { return false; }
    var cuerpo = soloDigitos.slice(0, -1);
    var dv = soloDigitos.slice(-1).toUpperCase();
    return dvRut_(cuerpo) === dv;
  }

  function nombreValido(s) { return String(s || '').trim().length >= 2; }
  function emailValido(s) { return RE_EMAIL.test(String(s || '').trim()); }
  function telefonoValido(s) {
    var limpio = String(s || '').replace(/[\s()+-]/g, '');
    return !limpio || RE_TEL.test(limpio);
  }

  // Marca/desmarca un input con .campo-invalido y muestra un mensaje bajo el campo
  // (crea el <small> si no existe). validador: función(valor) -> bool.
  function enlazarValidacion(input, validador, mensaje) {
    if (!input) { return function () { return true; }; }
    var small = input.parentElement.querySelector('.campo-error');
    if (!small) {
      small = document.createElement('small');
      small.className = 'campo-error';
      input.insertAdjacentElement('afterend', small);
    }
    function chequear() {
      var ok = validador(input.value);
      input.classList.toggle('campo-invalido', input.value.length > 0 && !ok);
      small.textContent = (input.value.length > 0 && !ok) ? mensaje : '';
      return ok;
    }
    input.addEventListener('input', chequear);
    input.addEventListener('blur', chequear);
    return chequear;
  }

  return {
    rutValido: rutValido, nombreValido: nombreValido, emailValido: emailValido, telefonoValido: telefonoValido,
    enlazarValidacion: enlazarValidacion
  };
})();
