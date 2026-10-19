/* Mini chatbot: respuestas locales (chatbot.json), flujo de cotización guiado, y IA vía n8n si hay chat_endpoint */
(function () {
  var CFG = window.CFG, KB = window.KB, T = window.T, Q = KB.qualifier;
  var session = Math.random().toString(36).slice(2), history = [], open = false, lead = null;
  var norm = function (s) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); };
  var el = function (tag, cls, txt) { var n = document.createElement(tag); if (cls) n.className = cls; if (txt) n.textContent = txt; return n; };
  var waUrl = function (t) { return 'https://wa.me/' + CFG.wa + '?text=' + encodeURIComponent(t); };

  /* ---- interfaz ---- */
  var launcher = el('button', 'chat-btn'); launcher.type = 'button';
  launcher.setAttribute('aria-label', T('Abrir asistente virtual')); launcher.append('🤖 ', el('span', '', T('Asistente')));
  var panel = el('section', 'chat'); panel.hidden = true; panel.setAttribute('aria-label', KB.name);
  var head = el('div', 'chat-h'), title = el('div'), close = el('button', 'chat-x', '✕');
  title.append(el('b', '', KB.name), el('small', '', CFG.chat ? T('Con inteligencia artificial') : T('Respuestas automáticas')));
  close.type = 'button'; close.setAttribute('aria-label', T('Cerrar')); head.append(title, close);
  var log = el('div', 'chat-log'); log.setAttribute('aria-live', 'polite');
  var quick = el('div', 'chat-q');
  var form = el('form', 'chat-f'), input = el('input'), send = el('button', '', T('Enviar'));
  input.placeholder = T('Escribe tu pregunta…'); input.maxLength = 300; input.autocomplete = 'off'; input.setAttribute('aria-label', T('Tu mensaje'));
  send.type = 'submit'; form.append(input, send);
  panel.append(head, log, quick, form);
  document.body.append(panel, launcher);

  function scroll() { log.scrollTop = log.scrollHeight; }
  function btn(x, holder) {
    var a;
    if (x.go || x.fn) { a = el('button', 'msg-b', x.l); a.type = 'button'; a.addEventListener('click', function () { if (x.fn) x.fn(); else { show(x.go); window.scrollTo({ top: 0, behavior: 'smooth' }); toggle(false); } }); }
    else {
      var href = x.wa ? waUrl(x.wa) : (/^http/.test(x.href) ? x.href : window.CFG.root + x.href);
      a = el('a', 'msg-b', x.l); a.href = href;
      if (x.wa || /^http/.test(x.href)) { a.target = '_blank'; a.rel = 'noopener'; } else a.setAttribute('download', '');
    }
    holder.append(a);
  }
  function bubble(text, who, buttons) {
    var b = el('div', 'msg ' + who);
    if (text) b.append(el('div', 'msg-t', text));
    (buttons || []).forEach(function (x) { btn(x, b); });
    log.append(b); scroll(); return b;
  }
  function toggle(on) {
    open = on === undefined ? !open : on; panel.hidden = !open; launcher.classList.toggle('hide', open);
    if (open) { if (!log.children.length) bubble(KB.start, 'bot'); input.focus(); }
  }
  launcher.addEventListener('click', function () { toggle(true); });
  close.addEventListener('click', function () { toggle(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && open) toggle(false); });
  KB.quick.forEach(function (q) {
    var c = el('button', '', q.l); c.type = 'button';
    c.addEventListener('click', function () { bubble(q.l, 'me'); if (q.id === 'qualify') startQ(); else local(q.id); });
    quick.append(c);
  });

  /* ---- flujo de cotización (califica al cliente) ---- */
  function choices(opts, fn) {
    var b = el('div', 'msg bot'), wrap = el('div', 'msg-opts');
    opts.forEach(function (o) {
      var a = el('button', 'msg-b', o); a.type = 'button';
      a.addEventListener('click', function () { wrap.querySelectorAll('button').forEach(function (x) { x.disabled = true; }); bubble(o, 'me'); fn(o); });
      wrap.append(a);
    });
    b.append(wrap); log.append(b); scroll();
  }
  function startQ() {
    lead = { step: 'need' }; bubble(Q.intro, 'bot'); bubble(Q.need.q, 'bot');
    choices(Q.need.opts, function (o) { lead.need = o; lead.step = 'when'; bubble(Q.when.q, 'bot'); choices(Q.when.opts, function (w) { lead.when = w; lead.step = 'name'; bubble(Q.name.q, 'bot'); }); });
  }
  function handleLead(text) {
    if (Q.cancelWords.indexOf(norm(text)) > -1) { lead = null; bubble(Q.cancelled, 'bot'); return; }
    if (lead.step === 'name') {
      if (text.length < 2) { bubble(Q.name.bad, 'bot'); return; }
      lead.name = text.slice(0, 80); lead.step = 'contact'; bubble(Q.contact.q, 'bot');
    } else if (lead.step === 'contact') {
      var em = /[^\s@]+@[^\s@]+\.[^\s@]{2,}/.exec(text), rest = em ? text.replace(em[0], '') : text, digits = rest.replace(/\D/g, '');
      var phone = digits.length >= 7 && digits.length <= 15;
      if (!em && !phone) { bubble(Q.contact.bad, 'bot'); return; }
      lead.email = em ? em[0] : ''; lead.phone = phone ? rest.trim().slice(0, 20) : ''; lead.step = 'done'; finish();
    }
  }
  function finish() {
    var contact = [lead.email, lead.phone].filter(Boolean).join(' · ');
    var summary = Q.summary.replace('{name}', function () { return lead.name; }).replace('{need}', function () { return lead.need; })
      .replace('{when}', function () { return lead.when; }).replace('{contact}', function () { return contact; });
    var L = lead; lead = null;
    bubble(Q.done.replace('{name}', function () { return L.name; }), 'bot', [
      { l: Q.btnWa, wa: summary },
      { l: Q.btnForm, fn: function () {
        var set = function (id, val) { var n = document.getElementById(id); if (n) n.value = val; };
        set('cNombre', L.name); set('cCorreo', L.email); set('cTel', L.phone); set('cMsj', summary);
        show('contacto'); window.scrollTo({ top: 0, behavior: 'smooth' }); toggle(false);
      } }]);
  }

  /* ---- respuestas locales ---- */
  function local(id, text) {
    var best = null, score = 0, t = ' ' + norm(text || '') + ' ';
    KB.entries.forEach(function (e) {
      if (id) { if (e.id === id) { best = e; score = 99; } return; }
      var s = 0; e.k.forEach(function (k) { if (t.indexOf(' ' + norm(k)) > -1) s += Math.max(1, Math.round(k.length / 3)); });
      if (s > score) { score = s; best = e; }
    });
    if (best && best.id === 'qualify' && score > 0) { startQ(); return; }
    var r = best && score > 0 ? best : KB.fallback;
    bubble(r.a, 'bot', r.b); history.push({ r: 'assistant', t: r.a });
  }
  function wantsQuote(text) {
    var q = KB.entries[0], t = ' ' + norm(text) + ' ';
    return q.id === 'qualify' && q.k.some(function (k) { return t.indexOf(' ' + norm(k)) > -1; });
  }

  /* ---- IA vía n8n (opcional) ---- */
  function ai(text) {
    var wait = bubble(T('Escribiendo…'), 'bot'), ctrl = new AbortController(), to = setTimeout(function () { ctrl.abort(); }, 25000);
    fetch(CFG.chat, { method: 'POST', signal: ctrl.signal, body: new URLSearchParams({ message: text, session: session, lang: window.LANG, history: JSON.stringify(history.slice(-8)) }) })
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) {
        var reply = (j && (j.reply || j.output || j.text || j.message)) || '';
        if (!reply) throw 0;
        wait.remove(); bubble(String(reply).slice(0, 1500), 'bot'); history.push({ r: 'assistant', t: reply });
      })
      .catch(function () { wait.remove(); local(null, text); })
      .then(function () { clearTimeout(to); });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var t = input.value.trim(); if (!t) return;
    input.value = ''; bubble(t, 'me'); history.push({ r: 'user', t: t });
    if (lead && (lead.step === 'name' || lead.step === 'contact')) { setTimeout(function () { handleLead(t); }, 250); return; }
    if (wantsQuote(t)) { setTimeout(startQ, 250); return; }
    CFG.chat ? ai(t) : setTimeout(function () { local(null, t); }, 350);
  });
})();
