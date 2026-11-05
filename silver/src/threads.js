/* Calculadora de roscas: métrico, UNC y UNF. Ficha técnica, conversiones y broca aproximada. Todo en el navegador. */
(function () {
  var T = window.T || function (s) { return s; };
  var root = document.getElementById('t4'); if (!root) return;
  var $ = function (id) { return document.getElementById(id); };
  var MM = 25.4;
  /* Datos: nombre, diámetro mayor (in para UNC/UNF; mm para métrico), paso (mm o TPI) */
  var DATA = {
    metric: [['M3', 3, 0.5], ['M4', 4, 0.7], ['M5', 5, 0.8], ['M6', 6, 1], ['M8', 8, 1.25], ['M10', 10, 1.5], ['M12', 12, 1.75], ['M14', 14, 2], ['M16', 16, 2], ['M20', 20, 2.5], ['M24', 24, 3]],
    unc: [['#4-40', 0.112, 40], ['#6-32', 0.138, 32], ['#8-32', 0.164, 32], ['#10-24', 0.19, 24], ['1/4-20', 0.25, 20], ['5/16-18', 0.3125, 18], ['3/8-16', 0.375, 16], ['7/16-14', 0.4375, 14], ['1/2-13', 0.5, 13], ['5/8-11', 0.625, 11], ['3/4-10', 0.75, 10], ['7/8-9', 0.875, 9], ['1-8', 1, 8]],
    unf: [['#4-48', 0.112, 48], ['#6-40', 0.138, 40], ['#8-36', 0.164, 36], ['#10-32', 0.19, 32], ['1/4-28', 0.25, 28], ['5/16-24', 0.3125, 24], ['3/8-24', 0.375, 24], ['7/16-20', 0.4375, 20], ['1/2-20', 0.5, 20], ['9/16-18', 0.5625, 18], ['5/8-18', 0.625, 18], ['3/4-16', 0.75, 16]]
  };
  var sys = 'metric';
  function fmt(n, d) { return (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toString().replace('.', ','); }
  function fraction(inch) {                      /* a fracción de 1/64 */
    var f = Math.round(inch * 64), w = Math.floor(f / 64), r = f % 64;
    if (r === 0) return w + '"';
    var g = r, d = 64; while (g % 2 === 0) { g /= 2; d /= 2; }
    return (w ? w + ' ' : '') + g + '/' + d + '"';
  }
  function list() { return DATA[sys]; }
  function fill() {
    var sel = $('thSize'), prev = sel.value;
    sel.innerHTML = list().map(function (r, i) { return '<option value="' + i + '">' + r[0] + '</option>'; }).join('');
    sel.value = prev && +prev < list().length ? prev : '0';
    info();
  }
  /* Ficha técnica de una rosca */
  function info() {
    var r = list()[+$('thSize').value];
    var major, pitchMM, tpi;
    if (sys === 'metric') { major = r[1]; pitchMM = r[2]; tpi = MM / pitchMM; }
    else { major = r[1] * MM; tpi = r[2]; pitchMM = MM / tpi; }
    var minor = major - 1.082532 * pitchMM;      /* diámetro menor interno aprox. */
    var drill = major - pitchMM;                 /* broca aprox. (~75-80 % de rosca) */
    var rows = [
      [T('Diámetro mayor'), fmt(major, 2) + ' mm · ' + fraction(major / MM)],
      [T('Paso'), sys === 'metric' ? fmt(pitchMM, 2) + ' mm' : fmt(tpi, 0) + ' TPI · ' + fmt(pitchMM, 3) + ' mm'],
      [T('Diámetro menor (interno)'), fmt(minor, 2) + ' mm'],
      [T('Broca aproximada'), fmt(drill, 2) + ' mm · ' + fraction(drill / MM)]
    ];
    $('thInfo').innerHTML = rows.map(function (o) { return '<dt>' + o[0] + '</dt><dd>' + o[1] + '</dd>'; }).join('');
    $('thName').textContent = r[0];
  }
  /* Conversor de paso: mm ↔ TPI */
  function convPitch(from) {
    var v = parseFloat(from === 'mm' ? $('thMM').value : $('thTPI').value);
    if (!isFinite(v) || v <= 0) { $('thPitchOut').textContent = ''; return; }
    if (from === 'mm') { $('thTPI').value = fmt(MM / v, 1); $('thPitchOut').textContent = T('Paso') + ': ' + fmt(MM / v, 1) + ' TPI'; }
    else { $('thMM').value = fmt(MM / v, 3); $('thPitchOut').textContent = T('Paso') + ': ' + fmt(MM / v, 3) + ' mm'; }
  }
  /* Conversor de longitud: mm ↔ pulgadas (fracción) */
  function convLen() {
    var mm = parseFloat($('thLen').value);
    if (!isFinite(mm)) { $('thLenOut').textContent = ''; return; }
    $('thLenOut').textContent = fmt(mm / MM, 3) + ' in · ' + fraction(mm / MM);
  }
  /* Eventos */
  root.querySelectorAll('[data-th]').forEach(function (b) {
    b.addEventListener('click', function () {
      sys = b.dataset.th;
      root.querySelectorAll('[data-th]').forEach(function (x) { x.classList.toggle('on', x === b); });
      fill();
    });
  });
  $('thSize').addEventListener('change', info);
  $('thMM').addEventListener('input', function () { convPitch('mm'); });
  $('thTPI').addEventListener('input', function () { convPitch('tpi'); });
  $('thLen').addEventListener('input', convLen);
  fill(); convLen();
})();
