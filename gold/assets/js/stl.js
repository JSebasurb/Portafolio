/* Visor 3D de archivos STL: gira, mide, verifica si cabe en la Dremel 3D20 y estima el PLA. Todo en el navegador. */
(function () {
  var T = window.T, CFG = window.CFG, cv = document.getElementById('sCanvas');
  if (!cv) return;
  var ctx = cv.getContext('2d'), $ = function (id) { return document.getElementById(id); };
  var BED = [230, 150, 140], DENSITY = 1.24, MAXMB = 40;
  var mesh = null, name = '', dims = [0, 0, 0], vol = 0, rotZ = 0.7, tilt = 0.55, zoom = 1, auto = true, drag = null, dpr = window.devicePixelRatio || 1;

  /* ---------- geometría de ejemplo ---------- */
  function quad(o, a, b, c, d) { o.push.apply(o, a.concat(b, c, a, c, d)); }
  function lathe(profile, seg) {
    var o = [];
    for (var i = 0; i < seg; i++) {
      var a0 = i / seg * 6.2832, a1 = (i + 1) / seg * 6.2832;
      for (var j = 0; j < profile.length; j++) {
        var p = profile[j], q = profile[(j + 1) % profile.length];
        var A = [p[0] * Math.cos(a0), p[0] * Math.sin(a0), p[1]], B = [q[0] * Math.cos(a0), q[0] * Math.sin(a0), q[1]];
        var C = [q[0] * Math.cos(a1), q[0] * Math.sin(a1), q[1]], D = [p[0] * Math.cos(a1), p[0] * Math.sin(a1), p[1]];
        quad(o, A, B, C, D);
      }
    }
    return o;
  }
  function torus(R, r, cx, cy, cz, n, m) {
    var o = [], P = function (u, v) { var a = u / n * 6.2832, b = v / m * 6.2832; return [cx + (R + r * Math.cos(b)) * Math.cos(a), cy + (R + r * Math.cos(b)) * Math.sin(a), cz + r * Math.sin(b)]; };
    for (var u = 0; u < n; u++) for (var v = 0; v < m; v++) quad(o, P(u, v), P(u + 1, v), P(u + 1, v + 1), P(u, v + 1));
    return o;
  }
  function gear() {
    var teeth = 12, out = [], hole = [], o = [], h = 8, shape = [[20, 0], [25, .22], [25, .5], [20, .72]];
    for (var t = 0; t < teeth; t++) shape.forEach(function (s) { var a = (t + s[1]) / teeth * 6.2832; out.push([s[0] * Math.cos(a), s[0] * Math.sin(a)]); hole.push([6 * Math.cos(a), 6 * Math.sin(a)]); });
    var M = out.length;
    for (var i = 0; i < M; i++) {
      var j = (i + 1) % M, P = out[i], Q = out[j], H = hole[i], G = hole[j];
      quad(o, [P[0], P[1], h], [Q[0], Q[1], h], [G[0], G[1], h], [H[0], H[1], h]);
      quad(o, [P[0], P[1], 0], [H[0], H[1], 0], [G[0], G[1], 0], [Q[0], Q[1], 0]);
      quad(o, [P[0], P[1], 0], [Q[0], Q[1], 0], [Q[0], Q[1], h], [P[0], P[1], h]);
      quad(o, [H[0], H[1], 0], [H[0], H[1], h], [G[0], G[1], h], [G[0], G[1], 0]);
    }
    return o;
  }
  var DEMOS = {
    gear: gear,
    key: function () { return lathe([[0, 0], [20, 0], [20, 3], [0, 3]], 56).concat(torus(6, 1.8, 0, 25, 1.5, 28, 12)); },
    pawn: function () { return lathe([[0, 0], [11, 0], [11, 2.5], [8, 4.6], [4.6, 13], [7, 14.5], [7, 16.5], [4.2, 17.5], [6, 19.5], [7, 22], [6, 25], [3.5, 27], [0, 27.8]], 56); },
    vase: function () { return lathe([[0, 0], [14, 0], [26, 28], [16, 70], [21, 100], [19.4, 100], [14.5, 70], [24.4, 28], [12.5, 2], [0, 2]], 56); }
  };

  /* ---------- lectura de STL (binario y ASCII) ---------- */
  function parse(buf) {
    var dv = new DataView(buf), n = buf.byteLength >= 84 ? dv.getUint32(80, true) : 0, out;
    if (buf.byteLength >= 84 && 84 + n * 50 === buf.byteLength) {
      out = new Float32Array(n * 9);
      for (var i = 0; i < n; i++) for (var k = 0; k < 3; k++) for (var c = 0; c < 3; c++) out[i * 9 + k * 3 + c] = dv.getFloat32(84 + i * 50 + 12 + k * 12 + c * 4, true);
      return out;
    }
    var txt = new TextDecoder().decode(buf), re = /vertex\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)\s+([-+0-9.eE]+)/g, m, arr = [];
    while ((m = re.exec(txt))) arr.push(+m[1], +m[2], +m[3]);
    if (arr.length < 9 || arr.length % 9) return null;
    return new Float32Array(arr);
  }

  /* ---------- estadísticas ---------- */
  function load(arr, nm) {
    var lo = [1e30, 1e30, 1e30], hi = [-1e30, -1e30, -1e30], v = 0;
    for (var i = 0; i < arr.length; i += 9) {
      for (var k = 0; k < 3; k++) for (var c = 0; c < 3; c++) { var x = arr[i + k * 3 + c]; if (x < lo[c]) lo[c] = x; if (x > hi[c]) hi[c] = x; }
      var ax = arr[i], ay = arr[i + 1], az = arr[i + 2], bx = arr[i + 3], by = arr[i + 4], bz = arr[i + 5], cx = arr[i + 6], cy = arr[i + 7], cz = arr[i + 8];
      v += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
    }
    var ctr = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, (lo[2] + hi[2]) / 2];
    for (var j = 0; j < arr.length; j += 3) { arr[j] -= ctr[0]; arr[j + 1] -= ctr[1]; arr[j + 2] -= ctr[2]; }
    mesh = arr; name = nm; dims = [hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]]; vol = Math.abs(v) / 6; zoom = 1;
    info();
  }
  function fmt(n) { return (Math.round(n * 10) / 10).toLocaleString(window.LANG === 'en' ? 'en-US' : 'es-CO'); }
  function mass() { var f = +$('sInfill').value / 100; return vol / 1000 * DENSITY * (0.25 + 0.75 * f); }
  function info() {
    $('sName').textContent = name; $('sDims').textContent = dims.map(fmt).join(' × ');
    $('sVol').textContent = fmt(vol / 1000) + T(' cm³'); $('sPct').textContent = $('sInfill').value + '%';
    $('sMass').textContent = '≈ ' + fmt(mass()) + ' g';
    var a = dims.slice().sort(function (x, y) { return y - x; }), b = BED.slice().sort(function (x, y) { return y - x; });
    var ok = a[0] <= b[0] && a[1] <= b[1] && a[2] <= b[2], el = $('sFit');
    el.textContent = ok ? T('Cabe en la Dremel 3D20') : T('Supera el volumen de la 3D20 (230 × 150 × 140 mm): se puede dividir en partes');
    el.className = ok ? 'ok' : 'bad';
  }

  /* ---------- dibujo (algoritmo del pintor, sombreado plano) ---------- */
  function size() {
    var w = cv.clientWidth || 360, h = Math.round(w * 0.78);
    cv.style.height = h + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  }
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
    if (!mesh) return;
    var n = mesh.length / 9, step = Math.max(1, Math.ceil(n / (drag ? 5000 : 14000)));
    var cz = Math.cos(rotZ), sz = Math.sin(rotZ), ct = Math.cos(tilt), st = Math.sin(tilt);
    var s = Math.min(cv.width, cv.height) * 0.82 * zoom / Math.max(dims[0], dims[1], dims[2]), ox = cv.width / 2, oy = cv.height / 2;
    var tris = [], P = new Array(3);
    for (var i = 0; i < n; i += step) {
      var base = i * 9, X = [0, 0, 0], Y = [0, 0, 0], Z = [0, 0, 0];
      for (var k = 0; k < 3; k++) {
        var x = mesh[base + k * 3], y = mesh[base + k * 3 + 1], z = mesh[base + k * 3 + 2];
        var x1 = x * cz - y * sz, y1 = x * sz + y * cz;
        X[k] = x1; Y[k] = y1 * ct - z * st; Z[k] = y1 * st + z * ct;
      }
      var ux = X[1] - X[0], uy = Y[1] - Y[0], uz = Z[1] - Z[0], vx = X[2] - X[0], vy = Y[2] - Y[0], vz = Z[2] - Z[0];
      var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      nx /= l; ny /= l; nz /= l; if (ny > 0) { nx = -nx; ny = -ny; nz = -nz; }
      var shade = 0.28 + 0.72 * Math.max(0, nx * -0.35 + ny * -0.55 + nz * 0.76);
      tris.push([(Y[0] + Y[1] + Y[2]) / 3, X[0], Z[0], X[1], Z[1], X[2], Z[2], shade]);
    }
    tris.sort(function (a, b) { return b[0] - a[0]; });
    for (var t = 0; t < tris.length; t++) {
      var q = tris[t], g = q[7], r = Math.round(30 + 40 * g), gg = Math.round(90 + 110 * g), b = Math.round(150 + 105 * g), col = 'rgb(' + r + ',' + gg + ',' + b + ')';
      ctx.beginPath(); ctx.moveTo(ox + q[1] * s, oy - q[2] * s); ctx.lineTo(ox + q[3] * s, oy - q[4] * s); ctx.lineTo(ox + q[5] * s, oy - q[6] * s); ctx.closePath();
      ctx.fillStyle = col; ctx.strokeStyle = col; ctx.lineWidth = 0.6; ctx.fill(); ctx.stroke();
    }
  }
  function frame() {
    if (cv.offsetParent !== null && !document.hidden) {
      if (cv.width !== Math.round((cv.clientWidth || 360) * dpr)) size();
      if (auto && !drag) rotZ += 0.008;
      draw();
    }
    requestAnimationFrame(frame);
  }

  /* ---------- interacción ---------- */
  cv.style.touchAction = 'none';
  cv.addEventListener('pointerdown', function (e) { drag = { x: e.clientX, y: e.clientY }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', function (e) {
    if (!drag) return;
    rotZ += (e.clientX - drag.x) * 0.012; tilt = Math.max(-1.4, Math.min(1.4, tilt + (e.clientY - drag.y) * 0.01)); drag = { x: e.clientX, y: e.clientY };
  });
  ['pointerup', 'pointercancel'].forEach(function (ev) { cv.addEventListener(ev, function () { drag = null; }); });
  cv.addEventListener('wheel', function (e) { e.preventDefault(); zoom = Math.max(0.3, Math.min(4, zoom * (e.deltaY < 0 ? 1.1 : 0.9))); }, { passive: false });
  $('sZin').addEventListener('click', function () { zoom = Math.min(4, zoom * 1.2); });
  $('sZout').addEventListener('click', function () { zoom = Math.max(0.3, zoom / 1.2); });
  $('sAuto').addEventListener('click', function () { auto = !auto; this.classList.toggle('on', auto); });
  document.querySelectorAll('[data-demo]').forEach(function (b) {
    b.addEventListener('click', function () { load(new Float32Array(DEMOS[b.dataset.demo]()), T(b.dataset.name)); });
  });
  $('sInfill').addEventListener('input', info);
  $('sFile').addEventListener('change', function (e) {
    var f = e.target.files[0]; e.target.value = ''; if (!f) return;
    if (f.size > MAXMB * 1048576) { $('sFit').textContent = T('El archivo es muy grande (máximo 40 MB).'); $('sFit').className = 'bad'; return; }
    var r = new FileReader();
    r.onload = function () {
      var arr = null; try { arr = parse(r.result); } catch (x) { }
      if (!arr) { $('sFit').textContent = T('No pude leer el archivo. Usa un STL válido.'); $('sFit').className = 'bad'; return; }
      load(arr, f.name);
    };
    r.readAsArrayBuffer(f);
  });
  $('sQuote').addEventListener('click', function () {
    var m = T('Hola, quiero cotizar la pieza «{n}» ({d} mm, ≈{g} g de PLA). Te envío el archivo por este chat.')
      .replace('{n}', function () { return name; }).replace('{d}', function () { return dims.map(fmt).join(' × '); }).replace('{g}', function () { return fmt(mass()); });
    window.open('https://wa.me/' + CFG.wa + '?text=' + encodeURIComponent(m), '_blank');
  });
  size(); load(new Float32Array(DEMOS.gear()), T('Engranaje')); $('sAuto').classList.add('on'); requestAnimationFrame(frame);
})();
