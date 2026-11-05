/* Asistente de fichas técnicas: recuperación TF-IDF con similitud coseno. No genera texto: muestra la ficha más relevante. */
(function () {
  var T = window.T || function (s) { return s; };
  var F = window.FICHAS; if (!F) return;
  var STOP = {}; "a al con de del el en es la las lo los o para por que se si su sus un una y e u como cual cuando donde son ser hay no mas muy tambien tiene tienen que cuanto cuanta cuantos cuantas".split(" ").forEach(function (w) { STOP[w] = 1; });
  var THRESH = 0.05;
  function tokens(s) {
    s = String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    var m = s.match(/[a-z0-9]+(?:\.[0-9]+)?/g) || [];
    return m.filter(function (t) { return !STOP[t]; });
  }
  var idf = {}, vecs = [], ids = F.map(function (f) { return f.id; });
  (function build() {
    var docs = F.map(function (f) { return tokens(f.titulo + ' ' + f.texto); }), N = docs.length, df = {};
    docs.forEach(function (d) { var seen = {}; d.forEach(function (t) { if (!seen[t]) { seen[t] = 1; df[t] = (df[t] || 0) + 1; } }); });
    Object.keys(df).forEach(function (t) { idf[t] = Math.log((N + 1) / (df[t] + 1)) + 1; });
    vecs = docs.map(function (d) {
      var tf = {}; d.forEach(function (t) { tf[t] = (tf[t] || 0) + 1; });
      var v = {}, n2 = 0; Object.keys(tf).forEach(function (t) { v[t] = (tf[t] / d.length) * idf[t]; n2 += v[t] * v[t]; });
      var norm = Math.sqrt(n2) || 1; Object.keys(v).forEach(function (t) { v[t] /= norm; }); return v;
    });
  })();
  function search(q) {
    var tf = {}; tokens(q).forEach(function (t) { if (idf[t]) tf[t] = (tf[t] || 0) + 1; });
    var qv = {}, n2 = 0; Object.keys(tf).forEach(function (t) { qv[t] = tf[t] * idf[t]; n2 += qv[t] * qv[t]; });
    var norm = Math.sqrt(n2) || 1; Object.keys(qv).forEach(function (t) { qv[t] /= norm; });
    var scores = vecs.map(function (d) { var s = 0; Object.keys(qv).forEach(function (t) { if (d[t]) s += qv[t] * d[t]; }); return s; });
    return ids.map(function (id, i) { return { id: id, score: scores[i], i: i }; }).sort(function (a, b) { return b.score - a.score; });
  }
  window.FICHAS_SEARCH = search;

  var root = document.getElementById('t11'); if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ask(q) {
    var out = $('faOut');
    if (!q.trim()) { out.innerHTML = ''; return; }
    var r = search(q).slice(0, 2).filter(function (x) { return x.score >= THRESH; });
    if (!r.length) { out.innerHTML = '<p class="pmmiss">' + T('No encontré una ficha que responda esa pregunta. Prueba con otros términos, por ejemplo el tipo de rosca, la cabeza o el material.') + '</p>'; return; }
    out.innerHTML = r.map(function (x, k) {
      var f = F[x.i];
      return '<article class="fares' + (k === 0 ? ' top' : '') + '"><b class="ftitle">' + esc(f.titulo) + '</b><span class="frel">' + T('relevancia') + ' ' + Math.round(x.score * 100) + '%</span><p>' + esc(f.texto) + '</p></article>';
    }).join('') + '<p class="etlmuted" style="margin-top:10px">' + T('Respuesta tomada de las fichas técnicas. No genera texto nuevo.') + '</p>';
  }
  $('faIn').addEventListener('input', function () { ask(this.value); });
  root.querySelectorAll('[data-fa]').forEach(function (b) { b.addEventListener('click', function () { $('faIn').value = b.dataset.fa; ask(b.dataset.fa); }); });
  ask('');
})();
