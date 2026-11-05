/* Dashboard de producción y calidad: OEE por máquina, Pareto de defectos y tendencia diaria.
   Lee cualquier CSV con las columnas: fecha,turno,maquina,piezas,rosca,cabeza,longitud,rebaba,ciclo_s,paro_min */
(function () {
  var T = window.T || function (s) { return s; };
  var COLS = ['fecha', 'turno', 'maquina', 'piezas', 'rosca', 'cabeza', 'longitud', 'rebaba', 'ciclo_s', 'paro_min'];
  var DEF = ['rosca', 'cabeza', 'longitud', 'rebaba'];
  var PLAN = 480; /* minutos planeados por turno */
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  /* Datos de ejemplo: 30 días, 3 turnos, 3 máquinas. Torno 1 empeora sus defectos en la última semana. */
  function sample() {
    var r = rng(20261001), M = [['Torno 1', 180, 40, 0.010], ['Fresadora 2', 150, 58, 0.008], ['Roscadora 3', 220, 33, 0.022]], TUR = ['M', 'T', 'N'];
    var lines = [COLS.join(',')], base = Date.UTC(2026, 9, 1);
    for (var d = 0; d < 30; d++) {
      var fecha = new Date(base + d * 864e5).toISOString().slice(0, 10);
      TUR.forEach(function (t) {
        M.forEach(function (m) {
          var ciclo = +(m[2] + (r() - 0.5) * 6).toFixed(1);
          var paro = Math.round(r() * (m[0] === 'Fresadora 2' ? 90 : 60));
          var piezas = Math.round((PLAN - paro) / (ciclo / 60) * (0.8 + 0.15 * r()));   /* piezas según el tiempo real de operación */
          var drift = (m[0] === 'Torno 1' && d >= 23) ? 2.5 : 1;
          var rates = [m[3] * 1.5, m[3], m[3] * 0.8, m[3] * 0.5].map(function (x) { return x * drift * (0.7 + 0.6 * r()); });
          var c = rates.map(function (x) { return Math.round(piezas * x); });
          lines.push([fecha, t, m[0], piezas, c[0], c[1], c[2], c[3], ciclo, paro].join(','));
        });
      });
    }
    return lines.join('\n');
  }
  /* Análisis (funciones puras) */
  function analyze(txt) {
    var lines = String(txt || '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (lines.length < 2) return { error: 'empty' };
    var h = lines[0].split(',').map(function (x) { return x.trim(); });
    var miss = COLS.filter(function (c) { return h.indexOf(c) < 0; });
    if (miss.length) return { error: 'missing', cols: miss };
    var rows = lines.slice(1).map(function (l) { var c = l.split(','), o = {}; h.forEach(function (k, i) { o[k] = (c[i] || '').trim(); }); return o; });
    rows = rows.filter(function (o) { return o.maquina && isFinite(+o.piezas) && +o.piezas > 0; }).map(function (o) {
      return { fecha: o.fecha, maquina: o.maquina, piezas: +o.piezas, rosca: +o.rosca || 0, cabeza: +o.cabeza || 0, longitud: +o.longitud || 0, rebaba: +o.rebaba || 0, ciclo: +o.ciclo_s || 0, paro: +o.paro_min || 0 };
    });
    if (!rows.length) return { error: 'empty' };
    /* tiempo de ciclo ideal por máquina = el menor observado (dato, no supuesto) */
    var ideal = {}; rows.forEach(function (r) { if (r.ciclo > 0 && (ideal[r.maquina] == null || r.ciclo < ideal[r.maquina])) ideal[r.maquina] = r.ciclo; });
    function agg(list) {
      var pz = 0, def = 0, run = 0, plan = 0, idealMin = 0, cyc = 0, nc = 0;
      list.forEach(function (r) {
        var d = DEF.reduce(function (a, k) { return a + r[k]; }, 0);
        pz += r.piezas; def += d; plan += PLAN; run += PLAN - r.paro;
        idealMin += r.piezas * (ideal[r.maquina] || 0) / 60; if (r.ciclo > 0) { cyc += r.ciclo; nc++; }
      });
      var A = run / plan, P = run > 0 ? Math.min(1, idealMin / run) : 0, Q = pz ? (pz - def) / pz : 0;
      return { piezas: pz, defectos: def, calidad: Q, disponibilidad: A, rendimiento: P, oee: A * P * Q, ciclo: nc ? cyc / nc : 0, paro: list.reduce(function (a, r) { return a + r.paro; }, 0) };
    }
    var machines = {}; rows.forEach(function (r) { (machines[r.maquina] = machines[r.maquina] || []).push(r); });
    var maq = Object.keys(machines).sort().map(function (k) { var a = agg(machines[k]); a.nombre = k; return a; });
    var total = agg(rows);
    var pareto = DEF.map(function (k) { return { tipo: k, n: rows.reduce(function (a, r) { return a + r[k]; }, 0) }; }).sort(function (a, b) { return b.n - a.n; });
    var dias = {}; rows.forEach(function (r) { var o = dias[r.fecha] = dias[r.fecha] || { fecha: r.fecha, piezas: 0, def: 0 }; o.piezas += r.piezas; o.def += DEF.reduce(function (a, k) { return a + r[k]; }, 0); });
    var tendencia = Object.keys(dias).sort().map(function (k) { return { fecha: k, tasa: dias[k].def / dias[k].piezas }; });
    var cuello = maq.slice().sort(function (a, b) { return b.ciclo - a.ciclo; })[0];
    return { total: total, maquinas: maq, pareto: pareto, tendencia: tendencia, cuello: cuello, n: rows.length };
  }
  window.PROD = { sample: sample, analyze: analyze, COLS: COLS };

  /* ---- interfaz ---- */
  var root = document.getElementById('t10'); if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var pct = function (v) { return (Math.round(v * 1000) / 10).toString().replace('.', ',') + ' %'; };
  var num = function (v) { return new Intl.NumberFormat(window.LANG === 'en' ? 'en-US' : 'es-CO', { maximumFractionDigits: 0 }).format(v); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function run() {
    var a = analyze($('pdIn').value);
    if (a.error === 'missing') { $('pdOut').innerHTML = '<p class="pmmiss">' + T('Faltan columnas') + ': ' + a.cols.map(esc).join(', ') + '</p>'; return; }
    if (a.error) { $('pdOut').innerHTML = '<p class="pmmiss">' + T('No hay datos válidos. Revisa el CSV.') + '</p>'; return; }
    var t = a.total, cu = a.cuello;
    var kpi = '<div class="etlkpi">' +
      '<div><span>OEE</span><b>' + pct(t.oee) + '</b></div>' +
      '<div><span>' + T('Calidad') + '</span><b>' + pct(t.calidad) + '</b></div>' +
      '<div><span>' + T('Disponibilidad') + '</span><b>' + pct(t.disponibilidad) + '</b></div>' +
      '<div><span>' + T('Piezas') + '</span><b>' + num(t.piezas) + '</b></div></div>';
    var mt = '<div class="etltbl"><table><thead><tr><th>' + T('Máquina') + '</th><th>OEE</th><th>' + T('Calidad') + '</th><th>' + T('Disponibilidad') + '</th><th>' + T('Ciclo prom. (s)') + '</th><th>' + T('Paro (min)') + '</th></tr></thead><tbody>' +
      a.maquinas.map(function (m) { var c = m === cu ? ' class="pmdiag"' : ''; return '<tr><td' + c + '>' + esc(m.nombre) + (m === cu ? ' ⚠' : '') + '</td><td>' + pct(m.oee) + '</td><td>' + pct(m.calidad) + '</td><td>' + pct(m.disponibilidad) + '</td><td>' + m.ciclo.toFixed(1) + '</td><td>' + num(m.paro) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    var mx = Math.max.apply(null, a.pareto.map(function (p) { return p.n; })) || 1, W = 360, L = 90, rh = 30;
    var par = '<svg viewBox="0 0 ' + W + ' ' + (a.pareto.length * rh + 6) + '" class="cvsvg" role="img" aria-label="Pareto de defectos">' + a.pareto.map(function (p, i) {
      var w = Math.max(2, (W - L - 60) * p.n / mx), y = i * rh + 6;
      return '<text x="0" y="' + (y + 14) + '" class="cvlab">' + T(p.tipo) + '</text><rect x="' + L + '" y="' + y + '" width="' + w + '" height="16" rx="6" class="cvbar"></rect><text x="' + (L + w + 6) + '" y="' + (y + 13) + '" class="cvval">' + num(p.n) + '</text>';
    }).join('') + '</svg>';
    var tr = a.tendencia, tmax = Math.max.apply(null, tr.map(function (p) { return p.tasa; })) || 1, TW = 360, TH = 140, pts = tr.map(function (p, i) { return (i / Math.max(1, tr.length - 1) * (TW - 20) + 10).toFixed(1) + ',' + (TH - 18 - p.tasa / tmax * (TH - 40)).toFixed(1); }).join(' ');
    var trend = '<svg viewBox="0 0 ' + TW + ' ' + TH + '" class="cvsvg" role="img" aria-label="Tendencia de defectos">' +
      '<polyline points="' + pts + '" fill="none" stroke="#ff9f0a" stroke-width="2.4" stroke-linejoin="round"></polyline>' +
      '<text x="10" y="' + (TH - 4) + '" class="cvval">' + esc(tr[0].fecha) + '</text><text x="' + (TW - 10) + '" y="' + (TH - 4) + '" text-anchor="end" class="cvval">' + esc(tr[tr.length - 1].fecha) + '</text>' +
      '<text x="10" y="14" class="cvval">' + T('Máx') + ' ' + pct(tmax) + '</text></svg>';
    $('pdOut').innerHTML = kpi +
      '<p class="pmres" style="margin:14px 0">⚠ <b>' + T('Cuello de botella') + ': ' + esc(cu.nombre) + '</b> — ' + T('ciclo promedio más alto') + ' (' + cu.ciclo.toFixed(1) + ' s). ' + T('Con más paro acumulado, se ve primero en el OEE.') + '</p>' +
      '<h3 class="cvh">' + T('Por máquina') + '</h3>' + mt +
      '<div class="pmgrid" style="margin-top:14px"><div><h3 class="cvh">' + T('Defectos (Pareto)') + '</h3><div class="cvchart">' + par + '</div></div>' +
      '<div><h3 class="cvh">' + T('Tasa de defectos por día') + '</h3><div class="cvchart">' + trend + '</div></div></div>' +
      '<p class="etlmuted" style="margin-top:12px">' + T('Registros válidos') + ': ' + a.n + '. OEE = ' + T('disponibilidad') + ' × ' + T('rendimiento') + ' × ' + T('calidad') + '.</p>';
  }
  $('pdRun').addEventListener('click', run);
  $('pdSample').addEventListener('click', function () { $('pdIn').value = sample(); run(); });
  $('pdFile').addEventListener('change', function (e) { var f = e.target.files[0]; e.target.value = ''; if (!f) return; var r = new FileReader(); r.onload = function () { $('pdIn').value = r.result; run(); }; r.readAsText(f); });
  $('pdIn').value = sample(); run();
})();
