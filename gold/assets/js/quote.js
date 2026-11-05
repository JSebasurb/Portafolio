/* Simulador de cotizaciones: precio por unidad, descuento por cantidad y recargo urgente. Estimación; se confirma por WhatsApp. */
(function () {
  var T = window.T || function (s) { return s; };
  var root = document.getElementById('t5'); if (!root) return;
  var Q = window.QUOTE, CFG = window.CFG || {};
  var $ = function (id) { return document.getElementById(id); };
  var EN = window.LANG === 'en';
  var money = function (n) { return new Intl.NumberFormat(EN ? 'en-US' : 'es-CO', { style: 'currency', currency: Q.currency, maximumFractionDigits: 0 }).format(Math.round(n)); };
  function prod(id) { for (var i = 0; i < Q.products.length; i++) if (Q.products[i].id === id) return Q.products[i]; return null; }
  function tier(q) { var off = 0; Q.tiers.forEach(function (t) { if (q >= t.min) off = t.off; }); return off; }
  function fillSelect() {
    var sel = $('qProd');
    sel.innerHTML = Q.products.map(function (p) { return '<option value="' + p.id + '">' + (EN ? p.name_en : p.name) + '</option>'; }).join('');
  }
  function qty() { var n = Math.floor(parseFloat($('qQty').value)); if (!isFinite(n) || n < 1) n = 1; if (n > 999) n = 999; return n; }
  function calc() {
    var p = prod($('qProd').value), n = qty(), out = $('qOut');
    if (!p) return;
    $('qRushRow').hidden = !!p.quote;
    if (p.quote) {
      out.innerHTML = '<b>' + T('Cotización personalizada') + '</b><p>' + T('Las piezas en 3D dependen del tamaño y el material. Escríbeme con el archivo o la idea y te cotizo.') + '</p>';
      $('qWa').dataset.msg = (EN ? 'Hi, I would like a quote for ' : 'Hola, quiero cotizar ') + (EN ? p.name_en : p.name) + ' × ' + n + '.';
      return;
    }
    var off = tier(n), unitAfter = p.unit * (1 - off), subtotal = unitAfter * n;
    var rush = $('qRush').checked, extra = rush ? subtotal * Q.urgent : 0, total = subtotal + extra;
    var lines = [
      '<div class="qline"><span>' + T('Precio por unidad') + '</span><b>' + money(p.unit) + '</b></div>',
      off ? '<div class="qline"><span>' + T('Descuento por cantidad') + '</span><b>−' + Math.round(off * 100) + '%</b></div>' : '',
      '<div class="qline"><span>' + T('Subtotal') + ' (' + n + ' × ' + money(unitAfter) + ')</span><b>' + money(subtotal) + '</b></div>',
      rush ? '<div class="qline"><span>' + T('Entrega urgente') + ' (+' + Math.round(Q.urgent * 100) + '%)</span><b>' + money(extra) + '</b></div>' : ''
    ].join('');
    out.innerHTML = lines + '<div class="qtotal"><span>' + T('Total estimado') + '</span><b>' + money(total) + '</b></div>' +
      '<p class="qnote">' + T('Estimación. Sebas confirma el precio final, el modelo de celular y la entrega por WhatsApp.') + '</p>';
    $('qWa').dataset.msg = (EN ? 'Hi, I would like a quote: ' : 'Hola, quiero cotizar: ') + n + ' × ' + (EN ? p.name_en : p.name) +
      (EN ? '. Estimated total: ' : '. Total estimado: ') + money(total) + (rush ? (EN ? ' (urgent)' : ' (urgente)') : '') + '.';
  }
  $('qProd').addEventListener('change', calc);
  $('qQty').addEventListener('input', calc);
  $('qRush').addEventListener('change', calc);
  $('qWa').addEventListener('click', function (e) {
    e.preventDefault(); var m = this.dataset.msg || '';
    window.open('https://wa.me/' + CFG.wa + '?text=' + encodeURIComponent(m), '_blank');
  });
  fillSelect(); calc();
})();
