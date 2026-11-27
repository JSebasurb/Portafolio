/* Constructor de CV: arma el CV con lo que el usuario elige y lo imprime como PDF (Guardar como PDF). */
(function () {
  var raw = document.getElementById('cvData');
  var dlg = document.getElementById('cvDlg');
  if (!raw || !dlg) return;
  var D = JSON.parse(raw.textContent);
  var L = D.labels, list = document.getElementById('cvList');
  var SECTIONS = [
    { key: 'education', title: L.edu },
    { key: 'experience', title: L.exp },
    { key: 'skills', title: L.skills },
    { key: 'projects', title: L.proj }
  ];
  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function labelFor(sec, it) {
    if (sec === 'education') return it.title + (it.meta ? ' · ' + it.meta : '');
    if (sec === 'experience') return it.role + ' — ' + it.company;
    if (sec === 'skills') return it.title;
    return it.title;
  }
  function build() {
    list.textContent = '';
    SECTIONS.forEach(function (s) {
      var f = el('fieldset', { class: 'cvsec' });
      f.appendChild(el('legend', null, s.title));
      D[s.key].forEach(function (it) {
        var lab = el('label', { class: 'cvchk' });
        var cb = el('input', { type: 'checkbox', 'data-sec': s.key, 'data-id': it.id });
        if (it.checked) cb.checked = true;
        lab.appendChild(cb);
        lab.appendChild(el('span', null, labelFor(s.key, it)));
        f.appendChild(lab);
      });
      list.appendChild(f);
    });
  }
  function picked(sec) {
    return Array.prototype.filter.call(list.querySelectorAll('input[data-sec="' + sec + '"]'), function (c) { return c.checked; })
      .map(function (c) { return c.getAttribute('data-id'); });
  }
  function item(sec, id) { return D[sec].filter(function (x) { return x.id === id; })[0]; }
  function linkOf(v) {
    v = String(v || '').trim();
    if (!v) return '';
    if (/^https?:\/\//.test(v)) return '<a href="' + esc(v) + '">' + esc(v.replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</a>';
    if (/@/.test(v)) return '<a href="mailto:' + esc(v) + '">' + esc(v) + '</a>';
    if (/^\+?[\d ]{7,}$/.test(v)) return '<a href="tel:' + esc(v.replace(/ /g, '')) + '">' + esc(v) + '</a>';
    return esc(v);
  }
  function sectionHtml(title, body) {
    return body ? '<section><h2>' + esc(title) + '</h2>' + body + '</section>' : '';
  }
  function documentHtml() {
    var ch = {};
    SECTIONS.forEach(function (s) { ch[s.key] = picked(s.key); });
    var contact = D.contact.filter(function (x) { return x; }).map(linkOf).join(' · ');
    var edu = ch.education.map(function (id) { var x = item('education', id);
      return '<div class="it"><b>' + esc(x.title) + '</b>' + (x.meta ? ' <span class="m">· ' + esc(x.meta) + '</span>' : '') + '</div>';
    }).join('');
    var exp = ch.experience.map(function (id) { var x = item('experience', id);
      return '<div class="it"><b>' + esc(x.role) + '</b><div class="m">' + esc(x.company) + (x.period ? ' · ' + esc(x.period) : '') + '</div>'
        + (x.text ? '<p>' + esc(x.text) + '</p>' : '')
        + (x.achievement ? '<p><i>' + esc(x.achievement) + '</i></p>' : '') + '</div>';
    }).join('');
    var skills = ch.skills.map(function (id) { var x = item('skills', id);
      return '<div class="it"><b>' + esc(x.title) + ':</b> ' + x.items.map(esc).join(', ') + '</div>';
    }).join('');
    var proj = ch.projects.map(function (id) { var x = item('projects', id);
      return '<div class="it"><b>' + esc(x.title) + '</b>' + (x.link ? ' · <a href="' + esc(x.link) + '">' + esc(x.link.replace(/^https?:\/\//, '').replace(/\/$/, '')) + '</a>' : '') + (x.description ? '<p>' + esc(x.description) + '</p>' : '') + '</div>';
    }).join('');
    return '<!DOCTYPE html><html lang="' + esc(D.lang) + '"><head><meta charset="UTF-8"><title>' + esc(D.name) + ' · CV</title><style>'
      + '@page{size:A4;margin:10mm}body{font-family:Arial,Helvetica,sans-serif;font-size:9.2pt;color:#111;line-height:1.28;margin:0}'
      + 'h1{font-size:16pt;margin:0 0 1px}.hl{font-size:10pt;margin:0 0 2px;color:#222}.ct{font-size:8.6pt;color:#333;margin:0 0 4px}'
      + 'h2{font-size:9.6pt;border-bottom:1px solid #999;margin:7px 0 3px;text-transform:uppercase;letter-spacing:.04em;break-after:avoid}'
      + '.it{margin:0 0 3px;break-inside:avoid}.m{color:#555;font-size:8.6pt}p{margin:1px 0}a{color:#0b4f9c;text-decoration:none}'
      + '.edu .it{margin:0 0 1px}</style></head><body>'
      + '<h1>' + esc(D.name) + '</h1><p class="hl">' + esc(D.headline) + '</p><p class="ct">' + contact + '</p>'
      + sectionHtml(L.profile, '<p>' + esc(D.summary) + '</p>')
      + sectionHtml(L.exp, exp) + sectionHtml(L.edu, '<div class="edu">' + edu + '</div>') + sectionHtml(L.skills, skills) + sectionHtml(L.proj, proj)
      + '</body></html>';
  }
  function generate() {
    var w = window.open('', '_blank');
    if (!w) { alert(L.blocked); return; }
    w.document.open(); w.document.write(documentHtml()); w.document.close();
    setTimeout(function () { try { w.focus(); w.print(); } catch (e) {} }, 400);
  }
  build();
  var open = document.getElementById('cvOpen');
  if (open) open.addEventListener('click', function () {
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
  });
  document.getElementById('cvX').addEventListener('click', function () { dlg.close(); });
  document.getElementById('cvCancel').addEventListener('click', function () { dlg.close(); });
  document.getElementById('cvGen').addEventListener('click', generate);
  var adv = document.getElementById('cvAdv'), advT = document.getElementById('cvAdvT');
  if (advT && adv) advT.addEventListener('change', function () { adv.hidden = !advT.checked; });
})();
