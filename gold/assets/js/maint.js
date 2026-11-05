/* Mantenimiento predictivo (demo): genera vibraciones simuladas de un rodamiento, extrae características
   y aplica el modelo de regresión logística entrenado en Python (scripts/ml/predictive_maintenance.py). */
(function () {
  var T = window.T || function (s) { return s; };
  var M = window.PMMODEL; if (!M) return;
  var TAU = Math.PI * 2;
  /* ---- generador (espejo del script de Python) ---- */
  function gauss(sd) { var u = 1 - Math.random(), v = Math.random(); return sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
  function signal(cond, sev) {
    var N = M.n, fs = M.fs, fr = M.fr, t = new Array(N), x = new Array(N), i;
    for (i = 0; i < N; i++) t[i] = i / fs;
    var p1 = Math.random() * 6.28, p2 = Math.random() * 6.28;
    for (i = 0; i < N; i++) x[i] = 0.5 * Math.sin(TAU * fr * t[i] + p1) + 0.2 * Math.sin(TAU * 2 * fr * t[i] + p2) + gauss(0.3);
    if (cond === 'sano') return x;
    var fd = { interior: M.bpfi, exterior: M.bpfo, bola: M.bsf }[cond];
    var amp = M.sev[sev] * (cond === 'bola' ? 0.7 : 1.0), period = 1 / fd, k = 0;
    while (k * period < N / fs) {
      var tk = k * period + gauss(0.01 * period);
      for (i = 0; i < N; i++) {
        if (t[i] < tk) continue;
        var dt = t[i] - tk, mod = cond === 'interior' ? 1 + 0.5 * Math.sin(TAU * fr * t[i]) : 1;
        x[i] += amp * mod * Math.exp(-1500 * dt) * Math.sin(TAU * 3000 * dt);
      }
      k++;
    }
    return x;
  }
  /* ---- características (idénticas a Python) ---- */
  function amp(x, f) {
    var N = x.length, fs = M.fs, re = 0, im = 0;
    for (var n = 0; n < N; n++) { var a = -TAU * f * n / fs; re += x[n] * Math.cos(a); im += x[n] * Math.sin(a); }
    return 2 / N * Math.sqrt(re * re + im * im);
  }
  function features(x) {
    var N = x.length, mean = 0, i;
    for (i = 0; i < N; i++) mean += x[i]; mean /= N;
    var sq = 0, pk = 0; for (i = 0; i < N; i++) { sq += x[i] * x[i]; if (Math.abs(x[i]) > pk) pk = Math.abs(x[i]); }
    var rms = Math.sqrt(sq / N), v = 0, m4 = 0, d;
    for (i = 0; i < N; i++) { d = x[i] - mean; v += d * d; m4 += d * d * d * d; }
    v /= N; m4 /= N; var s = Math.sqrt(v), kurt = m4 / (s * s * s * s);
    var env = new Array(N); for (i = 0; i < N; i++) env[i] = Math.abs(x[i] - mean);
    return [rms, pk, pk / rms, kurt, amp(env, M.fr), amp(env, M.bpfi), amp(env, M.bpfo), amp(env, M.bsf)];
  }
  function predict(f) {
    var z = f.map(function (v, j) { return (v - M.scaler_mean[j]) / M.scaler_scale[j]; });
    var logits = M.coef.map(function (w, k) { var s = M.intercept[k]; for (var j = 0; j < z.length; j++) s += w[j] * z[j]; return s; });
    var mx = Math.max.apply(null, logits), e = logits.map(function (l) { return Math.exp(l - mx); }), sum = e.reduce(function (a, b) { return a + b; }, 0);
    return e.map(function (q) { return q / sum; });
  }
  window.PM = { signal: signal, features: features, predict: predict, amp: amp };

  /* ---- interfaz ---- */
  var root = document.getElementById('t8'); if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var NAMES = { sano: 'Sano', interior: 'Pista interior', exterior: 'Pista exterior', bola: 'Bola' };
  var FNAMES = ['RMS', 'Pico', 'Factor de cresta', 'Curtosis', 'Envolvente 1x', 'Envolvente BPFI', 'Envolvente BPFO', 'Envolvente BSF'];
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pct(v) { return Math.round(v * 100) + ' %'; }
  function drawWave(x) {
    var c = $('pmCanvas'), ctx = c.getContext('2d'), dpr = window.devicePixelRatio || 1, W = c.clientWidth || 340, H = 150;
    c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); c.style.height = H + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H); ctx.strokeStyle = 'rgba(125,125,140,.25)'; ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
    var max = 0; for (var i = 0; i < x.length; i++) max = Math.max(max, Math.abs(x[i])); max = max || 1;
    ctx.strokeStyle = '#0a84ff'; ctx.lineWidth = 1.2; ctx.beginPath();
    for (i = 0; i < x.length; i++) { var px = i / (x.length - 1) * W, py = H / 2 - x[i] / max * (H / 2 - 8); if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
    ctx.stroke();
  }
  function measure() {
    var cond = $('pmCond').value, sev = cond === 'sano' ? null : $('pmSev').value;
    var x = signal(cond, sev || 'media'), f = features(x), p = predict(f);
    var best = 0; for (var k = 1; k < p.length; k++) if (p[k] > p[best]) best = k;
    var pred = M.classes[best];
    drawWave(x);
    $('pmFeat').innerHTML = FNAMES.map(function (n, j) { return '<dt>' + T(n) + '</dt><dd>' + f[j].toFixed(3) + '</dd>'; }).join('');
    $('pmProb').innerHTML = M.classes.map(function (c, k) {
      return '<div class="pmrow"><span>' + T(NAMES[c]) + '</span><span class="pmbar"><i style="width:' + Math.round(p[k] * 100) + '%"></i></span><b>' + pct(p[k]) + '</b></div>';
    }).join('');
    var real = NAMES[cond], ok = pred === cond;
    $('pmRes').innerHTML = '<b>' + T('Diagnóstico') + ': ' + T(NAMES[pred]) + '</b><p>' + T('Condición real de esta simulación') + ': ' + T(real) + (sev ? ' (' + T('severidad') + ' ' + T(sev) + ')' : '') + '.</p>' +
      '<p class="' + (ok ? 'pmok' : 'pmmiss') + '">' + (ok ? T('El modelo acierta esta medición.') : T('El modelo se equivoca en esta medición. Esto ocurre sobre todo con fallas leves.')) + '</p>';
  }
  function metrics() {
    var m = M.metrics, rows = m.labels.map(function (l, i) {
      return '<tr><td>' + T(NAMES[l]) + '</td>' + m.confusion[i].map(function (v, j) { return '<td class="' + (i === j ? 'pmdiag' : '') + '">' + v + '</td>'; }).join('') + '</tr>';
    }).join('');
    $('pmMet').innerHTML = '<div class="etlkpi">' +
      '<div><span>' + T('Exactitud en prueba') + '</span><b>' + pct(m.accuracy_test) + '</b></div>' +
      '<div><span>' + T('Validación cruzada (5)') + '</span><b>' + pct(m.cv5_mean) + ' ± ' + Math.round(m.cv5_std * 100) + '</b></div>' +
      '<div><span>' + T('Señales') + '</span><b>' + m.n_total + '</b></div></div>' +
      '<p class="pmsev">' + T('Por severidad') + ': ' + ['alta', 'media', 'baja'].map(function (s) { return T(s) + ' ' + pct(m.accuracy_by_severity[s]); }).join(' · ') + '</p>' +
      '<div class="etltbl"><table><thead><tr><th>' + T('Real \\ Predicho') + '</th>' + m.labels.map(function (l) { return '<th>' + T(NAMES[l]) + '</th>'; }).join('') + '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }
  $('pmCond').addEventListener('change', function () { $('pmSev').disabled = this.value === 'sano'; });
  $('pmGen').addEventListener('click', measure);
  $('pmSev').disabled = $('pmCond').value === 'sano';
  metrics(); measure();
})();
