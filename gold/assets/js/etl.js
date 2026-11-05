/* Pipeline ETL medallón: Bronze (datos crudos) → Silver (limpios y validados) → Gold (indicadores). Todo en el navegador. */
(function () {
  var T = window.T || function (s) { return s; };
  var REG = { norte: 'Norte', sur: 'Sur', centro: 'Centro' };
  var SAMPLE = [
    'order_id,fecha,region,producto,cantidad,precio',
    '1001,2026-01-05,norte,Llavero,3,8000',
    '1002,05/01/2026,Norte ,Estuche aluminio,1,35000',
    '1003,2026-01-07,SUR,Llavero,5,8000',
    '1001,2026-01-05,norte,Llavero,3,8000',
    '1004,2026-01-09,Centro,Estuche vidrio,2,40000',
    '1005,2026-01-10,Centro,Impresion 3D,,',
    '1006,2026-02-02,sur,Estuche aluminio,4,35000',
    '1007,2026-02-03,Norte,Llavero,-2,8000',
    '1008,2026-02-10,centro,Llavero,10,8000',
    '1009,2026-02-14,Sur,Estuche vidrio,1,40000',
    '1010,2026-03-01,norte,Llavero,6,8.000',
    '1011,01/03/2026,Centro,Estuche aluminio,2,35000',
    '1012,2026-03-05,Sur,Llavero,,8000',
    '1013,2026-03-09,NORTE,Estuche vidrio,3,40000',
    '1014,2026-13-40,Centro,Llavero,4,8000',
    '1015,2026-03-12,Centro,Llavero,4,8000'
  ].join('\n');

  /* ---------- funciones puras (se pueden probar sin pantalla) ---------- */
  function parseCSV(txt) {
    var lines = String(txt || '').split(/\r?\n/).filter(function (l) { return l.trim(); });
    if (!lines.length) return { header: [], rows: [] };
    var header = lines[0].split(',').map(function (h) { return h.trim(); });
    var rows = lines.slice(1).map(function (l) { var c = l.split(','); var o = {}; header.forEach(function (h, i) { o[h] = (c[i] == null ? '' : c[i]).trim(); }); return o; });
    return { header: header, rows: rows };
  }
  function parseNum(s) {
    s = String(s == null ? '' : s).trim(); if (!s) return NaN;
    if (/^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');   /* 8.000 → 8000 */
    s = s.replace(',', '.'); var n = Number(s); return isFinite(n) ? n : NaN;
  }
  function parseDate(s) {
    var m, y, mo, d;
    s = String(s || '').trim();
    if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
    else return null;
    var dt = new Date(y, mo - 1, d);
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  }
  function region(s) { return REG[String(s || '').trim().toLowerCase()] || null; }
  function run(txt) {
    var p = parseCSV(txt), bronze = p.rows, silver = [], rej = [], seen = {};
    bronze.forEach(function (r) {
      var id = r.order_id, why = null, f = parseDate(r.fecha), rg = region(r.region), q = parseNum(r.cantidad), pr = parseNum(r.precio);
      if (!id) why = 'sin order_id';
      else if (!f) why = 'fecha inválida';
      else if (!rg) why = 'región desconocida';
      else if (!isFinite(q) || q <= 0) why = 'cantidad inválida';
      else if (!isFinite(pr) || pr < 0) why = 'precio inválido';
      else if (seen[id]) why = 'duplicado';
      if (why) { rej.push({ id: id || '—', motivo: why }); return; }
      seen[id] = 1;
      silver.push({ order_id: id, fecha: f, mes: f.slice(0, 7), region: rg, producto: r.producto, cantidad: q, precio: pr, total: q * pr });
    });
    silver.sort(function (a, b) { return a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0; });
    var reg = {}, mes = {}, total = 0;
    silver.forEach(function (r) {
      total += r.total;
      reg[r.region] = reg[r.region] || { region: r.region, pedidos: 0, unidades: 0, ventas: 0 };
      reg[r.region].pedidos++; reg[r.region].unidades += r.cantidad; reg[r.region].ventas += r.total;
      mes[r.mes] = mes[r.mes] || { mes: r.mes, pedidos: 0, ventas: 0 };
      mes[r.mes].pedidos++; mes[r.mes].ventas += r.total;
    });
    var regiones = Object.keys(reg).map(function (k) { return reg[k]; }).sort(function (a, b) { return b.ventas - a.ventas; });
    var meses = Object.keys(mes).sort().map(function (k) { return mes[k]; });
    return { header: p.header, bronze: bronze, silver: silver, rej: rej, gold: { total: total, pedidos: silver.length, ticket: silver.length ? total / silver.length : 0, regiones: regiones, meses: meses } };
  }
  function csv(rows, cols) {
    return [cols.join(',')].concat(rows.map(function (r) { return cols.map(function (c) { return r[c] == null ? '' : r[c]; }).join(','); })).join('\n');
  }
  var api = { parseCSV: parseCSV, parseNum: parseNum, parseDate: parseDate, region: region, run: run, csv: csv, SAMPLE: SAMPLE };
  window.ETL = api;

  /* ---------- interfaz ---------- */
  var root = document.getElementById('t6'); if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var money = function (n) { return new Intl.NumberFormat(window.LANG === 'en' ? 'en-US' : 'es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Math.round(n)); };
  var last = null, step = 0;
  var LAYER = ['bronze', 'silver', 'gold'];
  function table(rows, cols, max) {
    if (!rows.length) return '<p class="etlmuted">' + T('Sin filas') + '</p>';
    var shown = rows.slice(0, max || 6);
    return '<div class="etltbl"><table><thead><tr>' + cols.map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' +
      shown.map(function (r) { return '<tr>' + cols.map(function (c) { return '<td>' + (r[c] == null ? '' : String(r[c]).replace(/</g, '&lt;')) + '</td>'; }).join('') + '</tr>'; }).join('') +
      '</tbody></table>' + (rows.length > shown.length ? '<small class="etlmuted">… +' + (rows.length - shown.length) + ' ' + T('filas') + '</small>' : '') + '</div>';
  }
  function show() {
    if (!last) return;
    var out = [];
    for (var i = 0; i <= step; i++) out.push(section(LAYER[i]));
    $('etlOut').innerHTML = out.join('');
    $('etlNext').hidden = step >= 2;
    $('etlNext').textContent = step === 0 ? T('Limpiar → Silver ›') : T('Agregar → Gold ›');
    $('etlStep').textContent = (step + 1) + ' / 3';
    $('etlPos').innerHTML = [['bronze', 'Bronze'], ['silver', 'Silver'], ['gold', 'Gold']].map(function (x, i) { return '<span class="' + (i <= step ? 'on' : '') + '">' + x[1] + '</span>'; }).join('');
  }
  function section(layer) {
    var l = last;
    if (layer === 'bronze') return '<div class="etlsec bz"><h3>🥉 Bronze · ' + T('datos crudos') + '</h3><p>' + l.bronze.length + ' ' + T('filas tal como llegaron. No se modifican.') + '</p>' +
      table(l.bronze, l.header, 6) + '<button class="mini" data-dl="bronze">⬇ CSV</button></div>';
    if (layer === 'silver') return '<div class="etlsec sv"><h3>🥈 Silver · ' + T('limpios y validados') + '</h3><p>' + l.silver.length + ' ' + T('válidas') + ' · ' + l.rej.length + ' ' + T('rechazadas') + '</p>' +
      table(l.silver, ['order_id', 'fecha', 'region', 'producto', 'cantidad', 'precio', 'total'], 6) +
      (l.rej.length ? '<div class="etlrej"><b>' + T('Rechazadas') + ':</b> ' + l.rej.map(function (r) { return '#' + r.id + ' (' + T(r.motivo) + ')'; }).join(' · ') + '</div>' : '') +
      '<button class="mini" data-dl="silver">⬇ CSV</button></div>';
    var g = l.gold;
    return '<div class="etlsec gd"><h3>🥇 Gold · ' + T('indicadores') + '</h3>' +
      '<div class="etlkpi"><div><span>' + T('Ventas') + '</span><b>' + money(g.total) + '</b></div><div><span>' + T('Pedidos') + '</span><b>' + g.pedidos + '</b></div><div><span>' + T('Ticket promedio') + '</span><b>' + money(g.ticket) + '</b></div></div>' +
      table(g.regiones, ['region', 'pedidos', 'unidades', 'ventas'], 5) +
      '<button class="mini" data-dl="gold">⬇ CSV</button></div>';
  }
  function download(layer) {
    var name, body;
    if (layer === 'bronze') { name = 'bronze.csv'; body = csv(last.bronze, last.header); }
    else if (layer === 'silver') { name = 'silver.csv'; body = csv(last.silver, ['order_id', 'fecha', 'mes', 'region', 'producto', 'cantidad', 'precio', 'total']); }
    else { name = 'gold_regiones.csv'; body = csv(last.gold.regiones, ['region', 'pedidos', 'unidades', 'ventas']); }
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([body], { type: 'text/csv;charset=utf-8' })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
  }
  $('etlRun').addEventListener('click', function () { last = ETL.run($('etlIn').value); step = 0; show(); });
  $('etlNext').addEventListener('click', function () { if (step < 2) { step++; show(); } });
  $('etlReset').addEventListener('click', function () { $('etlIn').value = SAMPLE_TEXT; last = ETL.run(SAMPLE_TEXT); step = 0; show(); });
  $('etlOut').addEventListener('click', function (e) { var b = e.target.closest('[data-dl]'); if (b && last) download(b.dataset.dl); });
  var SAMPLE_TEXT = ETL.SAMPLE;
  $('etlIn').value = SAMPLE_TEXT; last = ETL.run(SAMPLE_TEXT); show();
})();
