/* Formulario de contacto: valida, envía a un webhook (n8n / Apps Script / Formspree) o abre WhatsApp */
(function () {
  var CFG = window.CFG, T = window.T;
  var f = document.getElementById('cForm');
  if (!f) return;
  var out = document.getElementById('cOut'), btn = document.getElementById('cSend');
  var v = function (n) { return f.elements[n].value.trim(); };
  function err(n, t) { var el = f.querySelector('[data-err="' + n + '"]'); if (el) el.textContent = t || ''; }

  function validate() {
    var ok = true, tel = v('telefono').replace(/[^\d]/g, '');
    err('nombre', v('nombre').length < 2 ? (ok = false, T('Escribe tu nombre')) : '');
    err('correo', /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v('correo')) ? '' : (ok = false, T('Escribe un correo válido')));
    err('telefono', tel.length >= 7 && tel.length <= 15 ? '' : (ok = false, T('Escribe un número válido (7 a 15 dígitos)')));
    err('mensaje', v('mensaje').length < 5 ? (ok = false, T('Cuéntame un poco más')) : '');
    err('acepto', f.elements.acepto.checked ? '' : (ok = false, T('Debes autorizar el tratamiento de tus datos')));
    return ok;
  }
  function waUrl(d) {
    var t = T('Hola, soy {n}. Mi correo es {c} y mi teléfono {t}. {m}')
      .replace('{n}', function () { return d.nombre; }).replace('{c}', function () { return d.correo; })
      .replace('{t}', function () { return d.telefono; }).replace('{m}', function () { return d.mensaje; });
    return 'https://wa.me/' + CFG.wa + '?text=' + encodeURIComponent(t);
  }
  function say(t, cls) { out.textContent = t; out.className = 'cout ' + (cls || ''); }

  f.addEventListener('submit', function (e) {
    e.preventDefault();
    if (f.elements.web.value) return;            // honeypot anti-spam
    if (!validate()) { say(T('Revisa los campos marcados.'), 'bad'); return; }
    var d = { nombre: v('nombre'), correo: v('correo'), telefono: v('telefono'), mensaje: v('mensaje'),
      consentimiento: 'si', idioma: window.LANG, fecha: new Date().toISOString(), origen: location.href };
    if (!CFG.form) {                              // sin webhook: entrega por WhatsApp
      window.open(waUrl(d), '_blank');
      say(T('Se abrió WhatsApp con tus datos. Solo falta que pulses enviar.'), 'ok');
      return;
    }
    btn.disabled = true; btn.textContent = T('Enviando…');
    fetch(CFG.form, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(d) })
      .then(function () { f.reset(); say(T('¡Gracias, {n}! Recibí tu mensaje y te responderé pronto.').replace('{n}', function () { return d.nombre; }), 'ok'); })
      .catch(function () { say(T('No pude enviar el formulario. Escríbeme por WhatsApp:') + ' ' + waUrl(d), 'bad'); })
      .then(function () { btn.disabled = false; btn.textContent = T('Enviar mensaje'); });
  });
})();
