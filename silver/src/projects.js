/* Filtro por categoría de la pestaña Proyectos */
(function () {
  var bar = document.getElementById('pFilter'), T = window.T;
  if (!bar) return;
  var cards = document.querySelectorAll('.pcard'), count = document.getElementById('pCount');
  function apply(cat) {
    var n = 0;
    cards.forEach(function (c) { var show = cat === 'all' || c.dataset.cat === cat; c.hidden = !show; if (show) n++; });
    if (count) count.textContent = n + (n === 1 ? T(' proyecto') : T(' proyectos'));
  }
  bar.querySelectorAll('button').forEach(function (b) {
    b.addEventListener('click', function () {
      bar.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); });
      apply(b.dataset.c);
    });
  });
  apply('all');
})();

/* Tarjetas de Portafolio → herramienta: abre Proyectos > Herramientas en la herramienta indicada */
(function () {
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-tool]'); if (!b) return;
    e.preventDefault();
    show('tools');
    setTimeout(function () {
      var t = document.querySelector('#toolSel button[data-v="' + b.dataset.tool + '"]');
      if (t) t.click();
      var sec = document.getElementById('tools');
      if (sec) window.scrollTo({ top: sec.getBoundingClientRect().top + window.scrollY - 60, behavior: 'smooth' });
    }, 30);
  });
})();
