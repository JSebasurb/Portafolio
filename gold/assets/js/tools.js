/* Herramientas del portafolio: Lector HTML, Generador de enlace WhatsApp y Formateador JSON */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var toast = function (el, msg) { el.textContent = msg; clearTimeout(el._t); el._t = setTimeout(function () { el.textContent = ''; }, 2400); };

  /* ---------- selector de herramienta ---------- */
  var tbtn = document.querySelectorAll('#toolSel button');
  tbtn.forEach(function (b) {
    b.addEventListener('click', function () {
      tbtn.forEach(function (x) { x.classList.toggle('on', x === b); });
      document.querySelectorAll('.tool').forEach(function (p) { p.classList.toggle('on', p.id === b.dataset.v); });
    });
  });

  /* ---------- 1) Lector HTML ---------- */
  var src = $('hSrc'), frame = $('hFrame'), code = $('hCode'), stat = $('hStat'), msg = $('hMsg'), timer;
  var SAMPLE = '<!DOCTYPE html>\n<html lang="es">\n<head>\n<meta charset="UTF-8">\n<style>\n  body{font-family:system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#111;color:#fff}\n  button{padding:12px 22px;border:0;border-radius:99px;background:#0a84ff;color:#fff;font-size:1rem;cursor:pointer}\n</style>\n</head>\n<body>\n  <div style="text-align:center">\n    <h1>Hola, mundo 👋</h1>\n    <button onclick="this.textContent=\'¡Funciona!\'">Pruébame</button>\n  </div>\n</body>\n</html>';

  function hl(line) {
    return esc(line)
      .replace(/(&lt;!--.*?--&gt;)/g, '<i class="c">$1</i>')
      .replace(/(&lt;\/?)([\w-]+)/g, '$1<i class="t">$2</i>')
      .replace(/([\w:-]+)=(&quot;.*?&quot;)/g, '<i class="a">$1</i>=<i class="s">$2</i>');
  }
  function render() {
    var v = src.value;
    frame.srcdoc = v;
    code.innerHTML = v.split('\n').map(function (l) { return '<span class="ln">' + (hl(l) || ' ') + '</span>'; }).join('');
    var lines = v ? v.split('\n').length : 0;
    stat.textContent = lines + ' líneas · ' + v.length + ' caracteres · ' + (new Blob([v]).size / 1024).toFixed(1) + ' KB';
  }
  function later() { clearTimeout(timer); timer = setTimeout(render, 250); }
  src.addEventListener('input', later);

  var vseg = document.querySelectorAll('#hView button');
  vseg.forEach(function (b) {
    b.addEventListener('click', function () {
      vseg.forEach(function (x) { x.classList.toggle('on', x === b); });
      $('hPrev').style.display = b.dataset.v === 'prev' ? 'block' : 'none';
      $('hCodeWrap').style.display = b.dataset.v === 'code' ? 'block' : 'none';
    });
  });
  var dseg = document.querySelectorAll('#hDev button');
  dseg.forEach(function (b) {
    b.addEventListener('click', function () {
      dseg.forEach(function (x) { x.classList.toggle('on', x === b); });
      $('hFrameBox').style.maxWidth = b.dataset.w;
    });
  });

  function readFile(f) {
    if (!f) return;
    var r = new FileReader();
    r.onload = function () { src.value = r.result; render(); toast(msg, 'Cargado: ' + f.name); };
    r.readAsText(f);
  }
  $('hFile').addEventListener('change', function (e) { readFile(e.target.files[0]); e.target.value = ''; });
  ['dragover', 'drop'].forEach(function (ev) {
    src.addEventListener(ev, function (e) {
      e.preventDefault();
      if (ev === 'drop' && e.dataTransfer.files.length) readFile(e.dataTransfer.files[0]);
    });
  });
  $('hSample').addEventListener('click', function () { src.value = SAMPLE; render(); });
  $('hClear').addEventListener('click', function () { src.value = ''; render(); });
  $('hCopy').addEventListener('click', function () {
    (navigator.clipboard ? navigator.clipboard.writeText(src.value) : Promise.reject())
      .then(function () { toast(msg, 'Código copiado'); })
      .catch(function () { src.select(); toast(msg, 'Selecciona y copia manualmente'); });
  });
  $('hDown').addEventListener('click', function () {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([src.value], { type: 'text/html' }));
    a.download = 'pagina.html'; a.click(); URL.revokeObjectURL(a.href);
  });
  $('hOpen').addEventListener('click', function () {
    var u = URL.createObjectURL(new Blob([src.value], { type: 'text/html' }));
    window.open(u, '_blank');
  });
  src.value = SAMPLE; render();

  /* ---------- 2) Generador de enlace WhatsApp ---------- */
  var wn = $('wNum'), wm = $('wMsg'), wo = $('wOut');
  function wlink() {
    var n = wn.value.replace(/\D/g, '');
    wo.value = n ? 'https://wa.me/' + n + (wm.value ? '?text=' + encodeURIComponent(wm.value) : '') : '';
  }
  wn.addEventListener('input', wlink); wm.addEventListener('input', wlink);
  $('wCopy').addEventListener('click', function () {
    if (!wo.value) return toast($('wTip'), 'Escribe un número primero');
    (navigator.clipboard ? navigator.clipboard.writeText(wo.value) : Promise.reject())
      .then(function () { toast($('wTip'), 'Enlace copiado'); })
      .catch(function () { wo.select(); });
  });
  $('wTest').addEventListener('click', function () { if (wo.value) window.open(wo.value, '_blank'); else toast($('wTip'), 'Escribe un número primero'); });

  /* ---------- 3) Formateador JSON ---------- */
  var jin = $('jIn'), jout = $('jOut'), jerr = $('jErr');
  function jrun(space) {
    try {
      var o = JSON.parse(jin.value);
      jout.value = JSON.stringify(o, null, space);
      jerr.textContent = '✓ JSON válido'; jerr.className = 'ok';
    } catch (e) { jout.value = ''; jerr.textContent = '✗ ' + e.message; jerr.className = 'bad'; }
  }
  $('jFmt').addEventListener('click', function () { jrun(2); });
  $('jMin').addEventListener('click', function () { jrun(0); });
  $('jCopy').addEventListener('click', function () {
    if (jout.value && navigator.clipboard) navigator.clipboard.writeText(jout.value).then(function () { toast(jerr, 'Copiado'); });
  });
})();
