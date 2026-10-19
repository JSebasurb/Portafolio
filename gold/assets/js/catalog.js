/* Catálogo de la tienda: filtro por categoría y visor ampliado (lightbox) */
(function () {
  var T = window.T, bar = document.getElementById('kFilter');
  if (!bar) return;
  var cards = document.querySelectorAll('.ccard');
  bar.querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () {
      bar.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
      cards.forEach(function (c) { c.hidden = !(b.dataset.c === 'all' || c.dataset.cat === b.dataset.c); });
    });
  });
  var lb = document.createElement('div'); lb.className = 'lb'; lb.hidden = true; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true');
  lb.innerHTML = '<div class="lb-in"><button class="lb-x" type="button"></button><img alt=""><div class="lb-t"><b></b><p></p><a class="pill sm" target="_blank" rel="noopener"></a></div></div>';
  document.body.append(lb);
  var img = lb.querySelector('img'), x = lb.querySelector('.lb-x'), b = lb.querySelector('b'), p = lb.querySelector('p'), a = lb.querySelector('a');
  x.textContent = '✕'; x.setAttribute('aria-label', T('Cerrar'));
  function close() { lb.hidden = true; document.body.classList.remove('noscroll'); }
  document.querySelectorAll('.ccard .cthumb').forEach(function (t) {
    t.addEventListener('click', function () {
      var c = t.closest('.ccard'), i = c.querySelector('img'), o = c.querySelector('.repo');
      img.src = i.src; img.alt = i.alt; b.textContent = c.querySelector('h3').textContent; p.textContent = c.querySelector('p').textContent;
      a.href = o.href; a.textContent = o.textContent.replace(' ›', '');
      lb.hidden = false; document.body.classList.add('noscroll'); x.focus();
    });
  });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  x.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !lb.hidden) close(); });
})();
