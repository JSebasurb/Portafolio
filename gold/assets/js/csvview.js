/* Visor de CSV: carga un archivo, muestra estadísticas por columna y una gráfica por categoría. Todo en el navegador. */
(function () {
  var T = window.T || function (s) { return s; };
  var root = document.getElementById('t7'); if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var EN = window.LANG === 'en';
  var SAMPLE = 'region,producto,cantidad,precio\nNorte,Llavero,3,8000\nSur,Estuche aluminio,1,35000\nNorte,Estuche vidrio,2,40000\nCentro,Llavero,5,8000\nSur,Llavero,4,8000\nCentro,Estuche aluminio,2,35000\nNorte,Llavero,6,8000\nSur,Estuche vidrio,1,40000';
  function parse(txt) {
    if (window.ETL && window.ETL.parseCSV) return window.ETL.parseCSV(txt);
    var lines = String(txt || '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (!lines.length) return { header: [], rows: [] };
    var header = lines[0].split(',').map(function (h) { return h.trim(); });
    return { header: header, rows: lines.slice(1).map(function (l) { var c = l.split(','), o = {}; header.forEach(function (h, i) { o[h] = (c[i] == null ? '' : c[i]).trim(); }); return o; }) };
  }
  function num(s) {
    s = String(s == null ? '' : s).trim(); if (!s) return NaN;
    if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    s = s.replace(',', '.'); var n = Number(s); return isFinite(n) ? n : NaN;
  }
  /* Estadísticas por columna: tipo (número si al menos 80 % de valores lo son), vacíos, mínimo, máximo, promedio, suma */
  function stats(rows, header) {
    return header.map(function (h) {
      var vals = rows.map(function (r) { return r[h]; }), filled = vals.filter(function (v) { return String(v || '').trim() !== ''; });
      var nums = filled.map(num).filter(isFinite), isNum = filled.length > 0 && nums.length / filled.length >= 0.8;
      var distinct = {}; filled.forEach(function (v) { distinct[v] = 1; });
      var o = { col: h, tipo: isNum ? 'número' : 'texto', vacios: vals.length - filled.length, distintos: Object.keys(distinct).length };
      if (isNum && nums.length) {
        var sum = nums.reduce(function (a, b) { return a + b; }, 0);
        o.min = Math.min.apply(null, nums); o.max = Math.max.apply(null, nums); o.suma = sum; o.promedio = sum / nums.length;
      }
      return o;
    });
  }
  /* Agregación por categoría: conteo, suma o promedio de una columna numérica */
  function aggregate(rows, cat, val, agg) {
    var g = {};
    rows.forEach(function (r) {
      var k = String(r[cat] || '').trim() || '—', v = num(r[val]);
      g[k] = g[k] || { k: k, n: 0, s: 0, c: 0 };
      g[k].n++; if (isFinite(v)) { g[k].s += v; g[k].c++; }
    });
    return Object.keys(g).map(function (k) {
      var x = g[k], v = agg === 'count' ? x.n : agg === 'avg' ? (x.c ? x.s / x.c : 0) : x.s;
      return { label: x.k, value: v };
    }).sort(function (a, b) { return b.value - a.value; });
  }
  var DATA = null;
  function fmt(n) { if (!isFinite(n)) return '—'; var r = Math.round(n * 100) / 100; return new Intl.NumberFormat(EN ? 'en-US' : 'es-CO', { maximumFractionDigits: 2 }).format(r); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function load(txt) {
    var p = parse(txt);
    DATA = { header: p.header, rows: p.rows, stats: stats(p.rows, p.header) };
    render();
  }
  function render() {
    if (!DATA) return;
    var s = DATA.stats, nums = s.filter(function (x) { return x.tipo === 'número'; }), texts = s.filter(function (x) { return x.tipo === 'texto'; });
    $('cvKpi').innerHTML = '<div><span>' + T('Filas') + '</span><b>' + DATA.rows.length + '</b></div><div><span>' + T('Columnas') + '</span><b>' + DATA.header.length + '</b></div><div><span>' + T('Numéricas') + '</span><b>' + nums.length + '</b></div><div><span>' + T('Vacíos') + '</span><b>' + s.reduce(function (a, x) { return a + x.vacios; }, 0) + '</b></div>';
    $('cvStats').innerHTML = '<div class="etltbl"><table><thead><tr><th>' + T('Columna') + '</th><th>' + T('Tipo') + '</th><th>' + T('Vacíos') + '</th><th>' + T('Distintos') + '</th><th>' + T('Mín') + '</th><th>' + T('Máx') + '</th><th>' + T('Promedio') + '</th></tr></thead><tbody>' +
      s.map(function (x) { return '<tr><td>' + esc(x.col) + '</td><td>' + T(x.tipo === 'número' ? 'número' : 'texto') + '</td><td>' + x.vacios + '</td><td>' + x.distintos + '</td><td>' + (x.min == null ? '' : fmt(x.min)) + '</td><td>' + (x.max == null ? '' : fmt(x.max)) + '</td><td>' + (x.promedio == null ? '' : fmt(x.promedio)) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    $('cvPrev').innerHTML = '<div class="etltbl"><table><thead><tr>' + DATA.header.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      DATA.rows.slice(0, 6).map(function (r) { return '<tr>' + DATA.header.map(function (h) { return '<td>' + esc(r[h] || '') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>' +
      (DATA.rows.length > 6 ? '<small class="etlmuted">… +' + (DATA.rows.length - 6) + ' ' + T('filas') + '</small>' : '');
    fillSel($('cvCat'), texts.length ? texts : s, 0); fillSel($('cvVal'), nums, 0);
    $('cvAgg').disabled = !nums.length; $('cvVal').disabled = !nums.length;
    chart();
  }
  function fillSel(sel, list, pick) {
    var prev = sel.value; sel.innerHTML = list.map(function (x) { return '<option value="' + esc(x.col) + '">' + esc(x.col) + '</option>'; }).join('');
    if (prev && list.some(function (x) { return x.col === prev; })) sel.value = prev;
  }
  function chart() {
    var box = $('cvChart');
    if (!DATA || !$('cvCat').value) { box.innerHTML = ''; return; }
    var cat = $('cvCat').value, val = $('cvVal').value, agg = $('cvAgg').value;
    var data = aggregate(DATA.rows, cat, val, agg).slice(0, 10);
    if (!data.length) { box.innerHTML = ''; return; }
    var max = Math.max.apply(null, data.map(function (d) { return Math.abs(d.value); })) || 1, W = 360, rowH = 30, H = data.length * rowH + 10, L = 150;
    var bars = data.map(function (d, i) {
      var w = Math.max(2, (W - L - 60) * Math.abs(d.value) / max), y = i * rowH + 6;
      return '<text x="0" y="' + (y + 14) + '" class="cvlab">' + esc(d.label.length > 22 ? d.label.slice(0, 21) + '…' : d.label) + '</text>' +
        '<rect x="' + L + '" y="' + y + '" width="' + w + '" height="16" rx="6" class="cvbar"></rect>' +
        '<text x="' + (L + w + 6) + '" y="' + (y + 13) + '" class="cvval">' + fmt(d.value) + '</text>';
    }).join('');
    var title = (agg === 'count' ? T('Conteo de') : agg === 'avg' ? T('Promedio de') : T('Suma de')) + ' ' + val + ' ' + T('por') + ' ' + cat;
    box.innerHTML = '<p class="cvtitle">' + esc(title) + '</p><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(title) + '" class="cvsvg">' + bars + '</svg>';
  }
  $('cvRun').addEventListener('click', function () { load($('cvIn').value); });
  $('cvSample').addEventListener('click', function () { $('cvIn').value = SAMPLE; load(SAMPLE); });
  $('cvFile').addEventListener('change', function (e) {
    var f = e.target.files[0]; e.target.value = ''; if (!f) return;
    var r = new FileReader(); r.onload = function () { $('cvIn').value = r.result; load(r.result); }; r.readAsText(f);
  });
  ['cvCat', 'cvVal', 'cvAgg'].forEach(function (id) { $(id).addEventListener('change', chart); });
  $('cvIn').value = SAMPLE; load(SAMPLE);
  window.CSVVIEW = { parse: parse, stats: stats, aggregate: aggregate, num: num };
})();
