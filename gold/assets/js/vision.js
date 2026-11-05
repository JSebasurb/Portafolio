/* Visión por computador (demo): genera imágenes simuladas de cabezas de tornillo, calcula el descriptor físico
   y aplica la regresión logística entrenada en Python (scripts/ml/vision_screws.py). */
(function () {
  var T = window.T || function (s) { return s; };
  var M = window.VMODEL; if (!M) return;
  var S = M.s, TAU = Math.PI * 2;
  function gauss(sd) { var u = 1 - Math.random(), v = Math.random(); return sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
  function unif(a, b) { return a + (b - a) * Math.random(); }
  /* ---- generador (espejo de make() en Python) ---- */
  function make(cls) {
    var img = new Array(S * S), i, x, y;
    var cx = 32 + unif(-3, 3), cy = 32 + unif(-3, 3), R = unif(17, 20);
    var d = new Array(S * S), head = new Array(S * S);
    for (y = 0; y < S; y++) for (x = 0; x < S; x++) {
      i = y * S + x; d[i] = Math.hypot(x - cx, y - cy); head[i] = d[i] <= R; img[i] = 0.80;
    }
    for (i = 0; i < S * S; i++) if (head[i]) { img[i] = 0.40 + 0.12 * (1 - d[i] / R); if (d[i] >= R - 2.2) img[i] = 0.62; }
    var th = unif(0, Math.PI), sn = Math.sin(th), cs = Math.cos(th);
    for (y = 0; y < S; y++) for (x = 0; x < S; x++) {
      i = y * S + x; var dl = Math.abs((x - cx) * sn - (y - cy) * cs), al = (x - cx) * cs + (y - cy) * sn;
      if (head[i] && dl <= 1.6 && Math.abs(al) <= R * 0.85) img[i] = 0.12;
    }
    if (cls === 'rajado') {
      var a = unif(0, TAU), L = unif(0.45, 0.7) * R, x0 = cx + (R - 1) * Math.cos(a), y0 = cy + (R - 1) * Math.sin(a), ang = a + Math.PI + gauss(0.15);
      var steps = Math.floor(L * 4);
      for (var st = 0; st < steps; st++) {
        ang += gauss(0.08); x0 -= 0.25 * Math.cos(ang); y0 -= 0.25 * Math.sin(ang);
        for (y = 0; y < S; y++) for (x = 0; x < S; x++) { i = y * S + x; if (head[i] && Math.hypot(x - x0, y - y0) <= 0.9) img[i] = 0.12; }
      }
    }
    if (cls === 'golpeado') {
      var a2 = unif(0, TAU), r = unif(3, 6), gx = cx + (R - 1) * Math.cos(a2), gy = cy + (R - 1) * Math.sin(a2);
      for (y = 0; y < S; y++) for (x = 0; x < S; x++) { i = y * S + x; if (Math.hypot(x - gx, y - gy) <= r) img[i] = 0.80; }
    }
    var k = unif(0.88, 1.12), b = unif(-0.04, 0.04);
    for (i = 0; i < S * S; i++) img[i] = Math.min(1, Math.max(0, img[i] * k + b + gauss(0.03)));
    return img;
  }
  /* ---- descriptor físico (idéntico a Python) ---- */
  function otsu(img) {
    var h = new Array(64).fill(0), n = img.length;
    for (var i = 0; i < n; i++) { var bi = Math.min(63, Math.floor(img[i] * 64)); h[bi]++; }
    var p = h.map(function (v) { return v / n; }), c = []; for (var j = 0; j < 64; j++) c.push((j + 0.5) / 64);
    var bestV = -1, bestT = 0.5;
    for (var k = 1; k < 64; k++) {
      var w0 = 0, m0 = 0, w1 = 0, m1 = 0;
      for (var q = 0; q < k; q++) { w0 += p[q]; m0 += p[q] * c[q]; }
      for (var q2 = k; q2 < 64; q2++) { w1 += p[q2]; m1 += p[q2] * c[q2]; }
      if (w0 <= 0 || w1 <= 0) continue;
      m0 /= w0; m1 /= w1; var v = w0 * w1 * (m0 - m1) * (m0 - m1);
      if (v > bestV) { bestV = v; bestT = k / 64; }
    }
    return bestT;
  }
  function desc(img) {
    var t = otsu(img), head = img.map(function (v) { return v < t; }), i, x, y;
    var cnt = 0, sx = 0, sy = 0;
    for (y = 0; y < S; y++) for (x = 0; x < S; x++) if (head[y * S + x]) { cnt++; sx += x; sy += y; }
    if (cnt < 20) return [0, 0, 0, 0, 0, 0];
    var cx = sx / cnt, cy = sy / cnt, area = cnt, rs = [];
    for (var a = 0; a < 360; a += 5) {
      var ca = Math.cos(a * Math.PI / 180), sa = Math.sin(a * Math.PI / 180), r = 0;
      for (var st = 0.5; st < 45 - 1e-9; st += 0.5) {
        var xi = Math.floor(cx + ca * st + 0.5), yi = Math.floor(cy + sa * st + 0.5);
        if (xi < 0 || yi < 0 || xi >= S || yi >= S || !head[yi * S + xi]) break;
        r = st;
      }
      rs.push(r);
    }
    var mr = rs.reduce(function (p, q) { return p + q; }, 0) / rs.length + 1e-9, sd = 0;
    rs.forEach(function (v) { sd += (v - mr + 1e-9) * (v - mr + 1e-9); });
    sd = Math.sqrt(sd / rs.length);
    var rmin = Math.min.apply(null, rs), nd = 0, nb = 0;
    var dark = new Array(S * S).fill(false), band = new Array(S * S).fill(false);
    for (i = 0; i < S * S; i++) { if (head[i] && img[i] < 0.3) { dark[i] = true; nd++; } }
    for (y = 0; y < S; y++) for (x = 0; x < S; x++) {
      if (!head[y * S + x]) continue;
      var y0 = Math.max(0, y - 3), y1 = Math.min(S, y + 4), x0 = Math.max(0, x - 3), x1 = Math.min(S, x + 4), edge = false;
      for (var yy = y0; yy < y1 && !edge; yy++) for (var xx = x0; xx < x1; xx++) if (!head[yy * S + xx]) { edge = true; break; }
      if (edge) band[y * S + x] = true;
    }
    var darkBand = 0; for (i = 0; i < S * S; i++) if (dark[i] && band[i]) darkBand++;
    var meanHead = 0; for (i = 0; i < S * S; i++) if (head[i]) meanHead += img[i]; meanHead /= area;
    return [sd / mr, rmin / mr, area / (Math.PI * mr * mr), darkBand / (nd + 1), nd / area, meanHead];
  }
  function predict(f) {
    var z = f.map(function (v, j) { return (v - M.scaler_mean[j]) / M.scaler_scale[j]; });
    var logits = M.coef.map(function (w, k) { var s = M.intercept[k]; for (var j = 0; j < z.length; j++) s += w[j] * z[j]; return s; });
    var mx = Math.max.apply(null, logits), e = logits.map(function (l) { return Math.exp(l - mx); }), sum = e.reduce(function (a, b) { return a + b; }, 0);
    return e.map(function (q) { return q / sum; });
  }
  window.VIS = { make: make, desc: desc, predict: predict, otsu: otsu };

  /* ---- interfaz ---- */
  var root = document.getElementById('t9'); if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var NAMES = { sano: 'Sano', rajado: 'Rajado', golpeado: 'Cabeza golpeada' };
  var FN = ['Irregularidad del radio', 'Radio mínimo relativo', 'Área relativa', 'Oscuro en el borde', 'Oscuro total', 'Brillo de la cabeza'];
  function pct(v) { return Math.round(v * 100) + ' %'; }
  function draw(img) {
    var c = $('vsCanvas'), ctx = c.getContext('2d'), k = 4;
    c.width = S * k; c.height = S * k; c.style.width = Math.min(260, S * k) + 'px'; c.style.height = Math.min(260, S * k) + 'px';
    var im = ctx.createImageData(S * k, S * k);
    for (var y = 0; y < S * k; y++) for (var x = 0; x < S * k; x++) {
      var v = Math.round(img[Math.floor(y / k) * S + Math.floor(x / k)] * 255), o = (y * S * k + x) * 4;
      im.data[o] = v; im.data[o + 1] = v; im.data[o + 2] = v; im.data[o + 3] = 255;
    }
    ctx.putImageData(im, 0, 0);
  }
  function measure() {
    var cond = $('vsCond').value, img = make(cond), f = desc(img), p = predict(f);
    var best = 0; for (var q = 1; q < p.length; q++) if (p[q] > p[best]) best = q;
    var pred = M.classes[best];
    draw(img);
    $('vsFeat').innerHTML = FN.map(function (n, j) { return '<dt>' + T(n) + '</dt><dd>' + f[j].toFixed(3) + '</dd>'; }).join('');
    $('vsProb').innerHTML = M.classes.map(function (c, k) {
      return '<div class="pmrow"><span>' + T(NAMES[c]) + '</span><span class="pmbar"><i style="width:' + Math.round(p[k] * 100) + '%"></i></span><b>' + pct(p[k]) + '</b></div>';
    }).join('');
    var ok = pred === cond;
    $('vsRes').innerHTML = '<b>' + T('Diagnóstico') + ': ' + T(NAMES[pred]) + '</b><p>' + T('Condición real de esta imagen') + ': ' + T(NAMES[cond]) + '.</p>' +
      '<p class="' + (ok ? 'pmok' : 'pmmiss') + '">' + (ok ? T('El modelo acierta esta imagen.') : T('El modelo se equivoca en esta imagen. Las grietas finas son lo más difícil de detectar.')) + '</p>';
  }
  function metrics() {
    var m = M.metrics;
    var rows = m.labels.map(function (l, i) { return '<tr><td>' + T(NAMES[l]) + '</td>' + m.confusion[i].map(function (v, j) { return '<td class="' + (i === j ? 'pmdiag' : '') + '">' + v + '</td>'; }).join('') + '</tr>'; }).join('');
    $('vsMet').innerHTML = '<div class="etlkpi">' +
      '<div><span>' + T('Exactitud en prueba') + '</span><b>' + pct(m.accuracy_test) + '</b></div>' +
      '<div><span>' + T('Validación cruzada (5)') + '</span><b>' + pct(m.cv5_mean) + ' ± ' + Math.round(m.cv5_std * 100) + '</b></div>' +
      '<div><span>' + T('Imágenes') + '</span><b>' + m.n_total + '</b></div></div>' +
      '<p class="pmsev">' + T('Por clase') + ': ' + m.labels.map(function (l) { return T(NAMES[l]) + ' ' + pct(m.accuracy_by_class[l]); }).join(' · ') + '</p>' +
      '<div class="etltbl"><table><thead><tr><th>' + T('Real \\ Predicho') + '</th>' + m.labels.map(function (l) { return '<th>' + T(NAMES[l]) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  $('vsGen').addEventListener('click', measure);
  metrics(); measure();
})();
