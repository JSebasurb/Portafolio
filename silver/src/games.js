/* Minijuegos para celular (canvas, sin librerías): Bolt Runner, Capas 3D, Órbita y Serpiente de datos */
(function () {
  'use strict';
  var T = window.T || function (s) { return s; };
  var GAMES = {}, soundOn = true, ac = null;
  var lsGet = function (k) { try { return +localStorage.getItem(k) || 0; } catch (e) { return 0; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } };
  var rnd = Math.random, TAU = Math.PI * 2, DBGD = +((location.search.match(/gmdur=(\d+)/) || [])[1] || 0);
  function beep(f, d, type, vol) {
    if (!soundOn) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      var o = ac.createOscillator(), g = ac.createGain();
      o.type = type || 'square'; o.frequency.value = f; g.gain.value = vol || 0.035;
      o.connect(g); g.connect(ac.destination); o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + d); o.stop(ac.currentTime + d);
    } catch (e) { }
  }

  function actx() { try { ac = ac || new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); return ac; } catch (e) { return null; } }
  function tone(f, when, dur, type, vol) {
    if (!soundOn) return; var a = actx(); if (!a) return;
    try { var o = a.createOscillator(), g = a.createGain(); o.type = type || 'sine'; o.frequency.value = f; g.gain.setValueAtTime(vol || 0.05, when); g.gain.exponentialRampToValueAtTime(0.0001, when + dur); o.connect(g); g.connect(a.destination); o.start(when); o.stop(when + dur + 0.02); } catch (e) { }
  }
  var noiseBuf = null;
  function noise(when, dur, vol, hp) {
    if (!soundOn) return; var a = actx(); if (!a) return;
    try {
      if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate); var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      var src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(); src.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp || 4000;
      g.gain.setValueAtTime(vol || 0.04, when); g.gain.exponentialRampToValueAtTime(0.0001, when + dur); src.connect(f); f.connect(g); g.connect(a.destination); src.start(when); src.stop(when + dur + 0.02);
    } catch (e) { }
  }
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function hit(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }
  function txt(c, s, x, y, size, col, align, alpha) {
    c.globalAlpha = alpha == null ? 1 : alpha; c.fillStyle = col || '#fff'; c.textAlign = align || 'center';
    c.font = '800 ' + size + 'px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'; c.fillText(s, x, y); c.globalAlpha = 1;
  }

  /* ================= 1) BOLT RUNNER ================= */
  GAMES.runner = function (E) {
    var G = {}, S = 1, gy = 0, P, obs, parts, bg, speed, dist, since, gap, score, level, lvlT, shake, t, holds, jumpHeld, duckHeld, wantJump, buf;
    function calc() { S = Math.max(0.72, Math.min(1.25, Math.min(E.h / 640, E.w / 360))); gy = Math.round(E.h * 0.78); }
    G.resize = function () { calc(); if (P) { P.x = E.w * 0.2; if (P.on) P.y = gy; } makeBg(); };
    function makeBg() {
      bg = { stars: [], city: [] };
      for (var i = 0; i < 40; i++) bg.stars.push({ x: rnd() * E.w, y: rnd() * gy * 0.6, r: 0.6 + rnd() * 1.4, s: 0.05 + rnd() * 0.1 });
      var x = -40; while (x < E.w + 200) { var w = (40 + rnd() * 60) * S; bg.city.push({ x: x, w: w, h: (50 + rnd() * 110) * S, ch: rnd() < 0.4 }); x += w + 6 * S; }
    }
    G.reset = function () {
      calc(); P = { x: E.w * 0.2, y: gy, vy: 0, on: true, duck: false, step: 0 };
      obs = []; parts = []; speed = 330 * S; dist = 0; since = 0; gap = 520 * S; score = 0; level = 1; lvlT = 0; shake = 0; t = 0;
      holds = {}; jumpHeld = false; duckHeld = false; wantJump = false; buf = 0; makeBg(); E.setScore(0);
    };
    function spark(x, y, n, col) { for (var i = 0; i < n; i++) parts.push({ x: x, y: y, vx: (rnd() - 0.5) * 160, vy: -rnd() * 140, l: 0.4 + rnd() * 0.3, c: col || '#9be7ff' }); }
    function spawn() {
      var r = rnd(), o;
      if (score > 45 && r < 0.24) o = { k: 'drone', x: E.w + 40, y: gy - 62 * S, w: 46 * S, h: 22 * S, ph: rnd() * 6 };
      else if (r < 0.62) { var n = rnd() < 0.35 ? 2 : 1, hh = (30 + rnd() * 26) * S; o = { k: 'bolt', x: E.w + 40, n: n, w: (18 * n + (n - 1) * 8) * S, h: hh, y: gy - hh }; }
      else { var rad = (18 + rnd() * 10) * S; o = { k: 'gear', x: E.w + 40, r: rad, w: rad * 1.6, h: rad * 1.45, y: gy - rad * 1.45, a: rnd() * 6 }; }
      obs.push(o);
    }
    G.pointerDown = function (x, y, id) {
      if (y > E.h * 0.72) { holds[id] = 'd'; duckHeld = true; if (!P.on) P.vy = Math.max(P.vy, 600 * S); }
      else { holds[id] = 'j'; jumpHeld = true; buf = 0.12; wantJump = true; }
    };
    G.pointerUp = function (x, y, id) {
      var h = holds[id]; delete holds[id];
      var vals = Object.keys(holds).map(function (k) { return holds[k]; });
      if (h === 'd' && vals.indexOf('d') < 0) duckHeld = false;
      if (h === 'j' && vals.indexOf('j') < 0) jumpHeld = false;
    };
    G.keyDown = function (k) {
      if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') { if (!jumpHeld) { buf = 0.12; wantJump = true; } jumpHeld = true; }
      if (k === 'ArrowDown' || k === 's' || k === 'S') { duckHeld = true; if (!P.on) P.vy = Math.max(P.vy, 600 * S); }
    };
    G.keyUp = function (k) {
      if (k === ' ' || k === 'ArrowUp' || k === 'w' || k === 'W') jumpHeld = false;
      if (k === 'ArrowDown' || k === 's' || k === 'S') duckHeld = false;
    };
    G.update = function (dt) {
      t += dt; speed = (330 + Math.min(330, score * 0.65)) * S; dist += speed * dt; since += speed * dt;
      var ns = Math.floor(dist / (14 * S)); if (ns !== score) { score = ns; E.setScore(score); }
      var lv = 1 + Math.floor(score / 300); if (lv !== level) { level = lv; lvlT = 1.6; beep(880, 0.15, 'triangle', 0.05); }
      if (lvlT > 0) lvlT -= dt; if (shake > 0) shake -= dt;
      if (since >= gap) { spawn(); since = 0; gap = speed * (0.74 + rnd() * 0.55) + 40 * S; }
      /* jugador */
      P.duck = duckHeld && P.on;
      if (buf > 0) buf -= dt; else wantJump = false;
      if (P.on && wantJump && !P.duck) { P.vy = -820 * S; P.on = false; wantJump = false; beep(520, 0.09, 'square'); spark(P.x, gy, 5); }
      if (!P.on) {
        var g = (jumpHeld && P.vy < 0) ? 1700 * S : 3000 * S; if (duckHeld) g *= 1.5;
        P.vy += g * dt; P.y += P.vy * dt;
        if (P.y >= gy) { P.y = gy; P.vy = 0; P.on = true; spark(P.x, gy, 6); if (jumpHeld && !duckHeld) { buf = 0; } }
      } else { P.step += dt * speed * 0.03; if (rnd() < 0.3) parts.push({ x: P.x - 10 * S, y: gy - 2, vx: -speed * 0.2, vy: -rnd() * 30, l: 0.25, c: '#6d7a99' }); }
      /* obstáculos */
      var ph = (P.duck ? 26 : 46) * S, pb = { x: P.x - 10 * S, y: P.y - ph + 4, w: 20 * S, h: ph - 6 };
      for (var i = obs.length - 1; i >= 0; i--) {
        var o = obs[i]; o.x -= speed * dt; if (o.k === 'gear') o.a += dt * 3; if (o.k === 'drone') o.ph += dt * 6;
        if (o.x + o.w < -20) { obs.splice(i, 1); continue; }
        var oy = o.k === 'drone' ? o.y + Math.sin(o.ph) * 3 : o.y;
        if (hit(pb, { x: o.x + 3, y: oy + 3, w: o.w - 6, h: o.h - 5 })) { shake = 0.3; spark(P.x, P.y - 20 * S, 16, '#ff6b6b'); E.die(); return; }
      }
      for (var j = parts.length - 1; j >= 0; j--) { var q = parts[j]; q.l -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 400 * dt; if (q.l <= 0) parts.splice(j, 1); }
      bg.stars.forEach(function (s) { s.x -= speed * s.s * dt; if (s.x < 0) s.x = E.w; });
      bg.city.forEach(function (b) { b.x -= speed * 0.22 * dt; });
      var last = bg.city[bg.city.length - 1]; if (bg.city[0].x + bg.city[0].w < 0) { bg.city.shift(); bg.city.push({ x: last.x + last.w + 6 * S, w: (40 + rnd() * 60) * S, h: (50 + rnd() * 110) * S, ch: rnd() < 0.4 }); }
    };
    G.draw = function () {
      var c = E.ctx, w = E.w, h = E.h, hue = (232 + dist * 0.012) % 360;
      c.save(); if (shake > 0) c.translate((rnd() - 0.5) * 8, (rnd() - 0.5) * 8);
      var gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'hsl(' + hue + ',55%,9%)'); gr.addColorStop(1, 'hsl(' + ((hue + 40) % 360) + ',55%,24%)');
      c.fillStyle = gr; c.fillRect(-10, -10, w + 20, h + 20);
      c.fillStyle = '#ffffff'; bg.stars.forEach(function (s) { c.globalAlpha = 0.35 + 0.4 * s.r / 2; c.beginPath(); c.arc(s.x, s.y, s.r, 0, TAU); c.fill(); }); c.globalAlpha = 1;
      /* fábrica de fondo */
      c.fillStyle = 'hsl(' + hue + ',40%,12%)';
      bg.city.forEach(function (b) { c.fillRect(b.x, gy - b.h, b.w, b.h); if (b.ch) { c.fillRect(b.x + b.w * 0.6, gy - b.h - 26 * S, 9 * S, 26 * S); } });
      c.fillStyle = 'hsl(' + ((hue + 60) % 360) + ',90%,65%)'; bg.city.forEach(function (b, i) { if (i % 2) { c.globalAlpha = 0.6; c.fillRect(b.x + 6 * S, gy - b.h + 10 * S, 5 * S, 5 * S); c.globalAlpha = 1; } });
      /* piso */
      c.fillStyle = 'hsl(' + hue + ',45%,16%)'; c.fillRect(0, gy, w, h - gy);
      c.fillStyle = 'hsl(' + ((hue + 60) % 360) + ',80%,60%)'; c.fillRect(0, gy, w, 3);
      c.fillStyle = 'rgba(255,255,255,.12)'; var off = -(dist % (60 * S)); for (var x = off; x < w; x += 60 * S) c.fillRect(x, gy + 14 * S, 26 * S, 3);
      txt(c, '⬇ ' + T('Agacharse'), w / 2, h - 18, Math.max(12, 13 * S), '#fff', 'center', 0.28);
      /* obstáculos */
      obs.forEach(function (o) {
        if (o.k === 'bolt') {
          for (var i = 0; i < o.n; i++) {
            var bx = o.x + i * 26 * S, bw = 18 * S, top = o.y;
            c.fillStyle = '#c7ced9'; c.fillRect(bx + 3 * S, top + 9 * S, bw - 6 * S, o.h - 9 * S);
            c.fillStyle = '#8791a3'; for (var k = top + 14 * S; k < gy - 2; k += 6 * S) c.fillRect(bx + 3 * S, k, bw - 6 * S, 2);
            c.fillStyle = '#e8edf5'; rr(c, bx, top, bw, 11 * S, 3 * S); c.fill();
            c.fillStyle = '#9aa5b8'; c.fillRect(bx + bw / 2 - 1, top + 2, 2, 7 * S);
          }
        } else if (o.k === 'gear') {
          var cx = o.x + o.w / 2, cy = gy - o.r * 0.55; c.save(); c.translate(cx, cy); c.rotate(o.a); c.fillStyle = '#ffb13b';
          c.beginPath(); for (var a = 0; a < 10; a++) { var a0 = a / 10 * TAU, a1 = (a + 0.5) / 10 * TAU; c.lineTo(Math.cos(a0) * o.r, Math.sin(a0) * o.r); c.lineTo(Math.cos(a0 + 0.14) * o.r * 1.2, Math.sin(a0 + 0.14) * o.r * 1.2); c.lineTo(Math.cos(a1) * o.r * 1.2, Math.sin(a1) * o.r * 1.2); c.lineTo(Math.cos(a1 + 0.14) * o.r, Math.sin(a1 + 0.14) * o.r); }
          c.closePath(); c.fill(); c.fillStyle = '#7a4a00'; c.beginPath(); c.arc(0, 0, o.r * 0.38, 0, TAU); c.fill(); c.restore();
        } else {
          var dy = o.y + Math.sin(o.ph) * 3; c.fillStyle = '#ff4d6d'; rr(c, o.x, dy + 4 * S, o.w, o.h - 6 * S, 8 * S); c.fill();
          c.fillStyle = '#2b1030'; c.fillRect(o.x + 8 * S, dy + 9 * S, o.w - 16 * S, 5 * S); c.fillStyle = '#ffe66d'; c.fillRect(o.x + 10 * S + ((t * 30) % (o.w - 24 * S)), dy + 10 * S, 6 * S, 3 * S);
          c.fillStyle = '#dfe6f3'; c.fillRect(o.x + o.w / 2 - 14 * S, dy, 28 * S, 3); c.fillRect(o.x + o.w / 2 - 1, dy - 1, 2, 5);
        }
      });
      /* robot */
      var px = P.x, py = P.y, run = P.on ? Math.sin(P.step) : 0.6, ph = P.duck ? 26 * S : 46 * S;
      c.fillStyle = '#7de2ff'; c.globalAlpha = 0.12; c.beginPath(); c.ellipse(px, gy + 3, 16 * S, 4 * S, 0, 0, TAU); c.fill(); c.globalAlpha = 1;
      c.fillStyle = '#3a4a6b'; c.fillRect(px - 8 * S, py - 12 * S * (P.duck ? 0.6 : 1), 6 * S, 12 * S * (P.duck ? 0.6 : 1) + run * 3); c.fillRect(px + 2 * S, py - 12 * S * (P.duck ? 0.6 : 1), 6 * S, 12 * S * (P.duck ? 0.6 : 1) - run * 3);
      c.fillStyle = '#5ac8fa'; rr(c, px - 12 * S, py - ph + 14 * S * (P.duck ? 0.3 : 1), 24 * S, ph * (P.duck ? 0.65 : 0.55), 6 * S); c.fill();
      c.fillStyle = '#e8f6ff'; rr(c, px - 10 * S, py - ph - 2 * S + (P.duck ? 8 * S : 0), 20 * S, 16 * S, 5 * S); c.fill();
      c.fillStyle = '#10243a'; c.fillRect(px - 2 * S, py - ph + 2 * S + (P.duck ? 8 * S : 0), 11 * S, 7 * S); c.fillStyle = '#ff375f'; c.fillRect(px + 4 * S, py - ph + 4 * S + (P.duck ? 8 * S : 0), 4 * S, 3 * S);
      c.fillStyle = '#ffb13b'; c.fillRect(px - 1 * S, py - ph - 8 * S + (P.duck ? 8 * S : 0), 2 * S, 7 * S);
      parts.forEach(function (q) { c.globalAlpha = Math.max(0, q.l * 2); c.fillStyle = q.c; c.fillRect(q.x, q.y, 3, 3); }); c.globalAlpha = 1;
      if (lvlT > 0) txt(c, T('¡Nivel {n}!').replace('{n}', level), w / 2, h * 0.3, 30 * S, '#ffe66d', 'center', Math.min(1, lvlT));
      c.restore();
    };
    G._dbg = function () { return { P: P, obs: obs, gy: gy, speed: speed, S: S, score: score }; };
    return G;
  };

  /* ================= 2) CAPAS 3D (apilar) ================= */
  GAMES.stack = function (E) {
    var G = {}, bh, base, layers, cur, falling, pops, cam, camT, combo, speed, score, flash, nozzle;
    function colr(i, l) { return 'hsl(' + ((i * 9 + 190) % 360) + ',85%,' + (l || 58) + '%)'; }
    G.resize = function () { bh = Math.max(20, Math.round(Math.min(E.w, E.h) * 0.065)); };
    G.reset = function () {
      G.resize(); base = E.w * 0.56; layers = [{ x: (E.w - base) / 2, w: base, i: 0 }]; falling = []; pops = []; cam = 0; camT = 0; combo = 0; score = 0; flash = 0;
      speed = E.w * 0.5; E.setScore(0); next();
    };
    function next() { var top = layers[layers.length - 1], w = top.w, left = layers.length % 2 === 0; cur = { x: left ? -w * 0.55 : E.w - w * 0.45, w: w, dir: left ? 1 : -1, i: layers.length }; }
    G.pointerDown = function () { drop(); };
    G.keyDown = function (k) { if (k === ' ' || k === 'ArrowDown' || k === 'Enter') drop(); };
    function drop() {
      if (!cur) return;
      var top = layers[layers.length - 1], l = Math.max(cur.x, top.x), r = Math.min(cur.x + cur.w, top.x + top.w), ov = r - l;
      if (ov <= 2) { falling.push({ x: cur.x, w: cur.w, i: cur.i, y: 0, vy: 0, rot: 0 }); cur = null; beep(140, 0.35, 'sawtooth', 0.05); E.die(); return; }
      if (Math.abs(cur.x - top.x) < 7) {
        combo++; cur.x = top.x; if (combo >= 3 && cur.w < base) cur.w = Math.min(base, cur.w + bh * 0.4);
        pops.push({ t: 0, x: cur.x + cur.w / 2, i: layers.length }); flash = 0.25; beep(520 + combo * 70, 0.12, 'triangle', 0.05);
      } else {
        combo = 0; if (cur.x < top.x) falling.push({ x: cur.x, w: top.x - cur.x, i: cur.i, y: 0, vy: 0, rot: -1 });
        else falling.push({ x: top.x + top.w, w: cur.x + cur.w - (top.x + top.w), i: cur.i, y: 0, vy: 0, rot: 1 });
        cur.x = l; cur.w = ov; beep(300, 0.08, 'square', 0.04);
      }
      layers.push({ x: cur.x, w: cur.w, i: cur.i }); score = layers.length - 1; E.setScore(score);
      speed = Math.min(E.w * 1.5, E.w * (0.5 + score * 0.014)); camT = Math.max(0, (layers.length - 5) * bh); next();
    }
    G.update = function (dt) {
      cam += (camT - cam) * Math.min(1, dt * 6); if (flash > 0) flash -= dt;
      if (cur) { cur.x += cur.dir * speed * dt; if (cur.x + cur.w > E.w + 20) cur.dir = -1; if (cur.x < -20) cur.dir = 1; }
      for (var i = falling.length - 1; i >= 0; i--) { var f = falling[i]; f.vy += 1800 * dt; f.y += f.vy * dt; f.x += f.rot * 60 * dt; if (f.y > E.h + 200) falling.splice(i, 1); }
      for (var j = pops.length - 1; j >= 0; j--) { pops[j].t += dt; if (pops[j].t > 0.9) pops.splice(j, 1); }
    };
    G.draw = function () {
      var c = E.ctx, w = E.w, h = E.h, bedY = h - bh * 2.2, top = layers[layers.length - 1];
      var gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0a0f2c'); gr.addColorStop(1, flash > 0 ? '#3a1d5c' : '#1b2250'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 1; for (var gx = 0; gx < w; gx += bh * 1.5) { c.beginPath(); c.moveTo(gx, 0); c.lineTo(gx, h); c.stroke(); }
      c.save(); c.translate(0, cam);
      c.fillStyle = '#2c3566'; c.fillRect(0, bedY, w, h); c.fillStyle = '#6f7fe0'; c.fillRect(0, bedY, w, 3);
      layers.forEach(function (L, i) { var y = bedY - (i + 1) * bh; c.fillStyle = colr(L.i); rr(c, L.x, y, L.w, bh - 1, 4); c.fill(); c.fillStyle = 'rgba(255,255,255,.22)'; c.fillRect(L.x + 3, y + 2, L.w - 6, 3); });
      var yc = bedY - (layers.length + 1) * bh;
      if (cur) { c.fillStyle = colr(cur.i); rr(c, cur.x, yc, cur.w, bh - 1, 4); c.fill(); c.fillStyle = 'rgba(255,255,255,.3)'; c.fillRect(cur.x + 3, yc + 2, cur.w - 6, 3);
        c.fillStyle = '#d7dcff'; var nx = cur.x + cur.w / 2; c.beginPath(); c.moveTo(nx - 9, yc - 16); c.lineTo(nx + 9, yc - 16); c.lineTo(nx + 3, yc - 2); c.lineTo(nx - 3, yc - 2); c.closePath(); c.fill(); c.fillRect(nx - 14, yc - 28, 28, 12);
        c.strokeStyle = 'rgba(255,255,255,.18)'; c.setLineDash([4, 5]); c.beginPath(); c.moveTo(top.x, yc + bh); c.lineTo(top.x, yc + bh * 2); c.moveTo(top.x + top.w, yc + bh); c.lineTo(top.x + top.w, yc + bh * 2); c.stroke(); c.setLineDash([]); }
      falling.forEach(function (f) { c.globalAlpha = Math.max(0, 1 - f.y / (h * 0.8)); c.fillStyle = colr(f.i, 50); c.fillRect(f.x, yc + f.y + bh, f.w, bh - 1); }); c.globalAlpha = 1;
      pops.forEach(function (p) { txt(c, T('¡Perfecto!'), p.x, bedY - (p.i + 1) * bh - 10 - p.t * 50, 18, '#ffe66d', 'center', 1 - p.t / 0.9); });
      c.restore();
      txt(c, String(score), w / 2, h * 0.2, Math.min(w, h) * 0.2, '#ffffff', 'center', 0.16);
      if (combo >= 2) txt(c, 'x' + combo, w / 2, h * 0.2 + 34, 22, '#ffe66d', 'center', 0.9);
    };
    G._dbg = function () { return { cur: cur, top: layers[layers.length - 1], score: score }; };
    return G;
  };

  /* ================= 3) ÓRBITA ================= */
  GAMES.orbit = function (E) {
    var G = {}, cx, cy, R, th, rad, ring, om, obs, coins, spawnTh, score, trail, t, lastSpawn, stars, switching;
    G.resize = function () { cx = E.w / 2; cy = E.h * 0.52; var m = Math.min(E.w, E.h * 0.9); R = [m * 0.21, m * 0.38]; if (rad != null) rad = R[ring]; stars = []; for (var i = 0; i < 60; i++) stars.push({ x: rnd() * E.w, y: rnd() * E.h, r: rnd() * 1.4 + 0.3 }); };
    G.reset = function () { G.resize(); th = -Math.PI / 2; ring = 1; rad = R[1]; om = 1.9; obs = []; coins = []; score = 0; trail = []; t = 0; spawnTh = th + 1.8; lastSpawn = -9; E.setScore(0); };
    G.pointerDown = function () { ring = 1 - ring; beep(ring ? 420 : 640, 0.06, 'triangle'); };
    G.keyDown = function (k) { if (k === ' ' || k === 'ArrowUp' || k === 'ArrowDown' || k === 'Enter') G.pointerDown(); };
    function norm(a) { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; }
    G.update = function (dt) {
      t += dt; om = Math.min(3.3, 1.9 + score * 0.012); th += om * dt;
      rad += (R[ring] - rad) * Math.min(1, dt * 16);
      while (spawnTh < th + 2.5) {
        var gapA = Math.max(0.68, 1.05 - score * 0.006) + rnd() * 0.55, rg = rnd() < 0.5 ? 0 : 1;
        spawnTh += gapA; obs.push({ a: spawnTh, ring: rg, hw: 0.15, done: false });
        if (rnd() < 0.55) coins.push({ a: spawnTh + gapA * 0.5 * (rnd() < 0.5 ? 0.6 : 0.4), ring: 1 - rg, got: false });
      }
      var pr = 9;
      for (var i = obs.length - 1; i >= 0; i--) {
        var o = obs[i];
        if (Math.abs(rad - R[o.ring]) < 15 && Math.abs(norm(th - o.a)) < o.hw + pr / R[o.ring]) { beep(130, 0.4, 'sawtooth', 0.05); E.die(); return; }
        if (!o.done && th - o.a > o.hw + 0.1) { o.done = true; score++; E.setScore(score); }
        if (th - o.a > 1.2) obs.splice(i, 1);
      }
      for (var j = coins.length - 1; j >= 0; j--) {
        var k = coins[j];
        if (!k.got && Math.abs(rad - R[k.ring]) < 16 && Math.abs(norm(th - k.a)) < 0.17) { k.got = true; score += 3; E.setScore(score); beep(900, 0.1, 'sine', 0.06); }
        if (th - k.a > 1.2 || k.got) coins.splice(j, 1);
      }
      trail.push({ x: cx + Math.cos(th) * rad, y: cy + Math.sin(th) * rad }); if (trail.length > 22) trail.shift();
    };
    G.draw = function () {
      var c = E.ctx, w = E.w, h = E.h;
      var gr = c.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w, h)); gr.addColorStop(0, '#1a1050'); gr.addColorStop(1, '#04020f'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = '#fff'; stars.forEach(function (s, i) { c.globalAlpha = 0.25 + 0.35 * Math.abs(Math.sin(t * 0.8 + i)); c.fillRect(s.x, s.y, s.r, s.r); }); c.globalAlpha = 1;
      c.lineWidth = 2; R.forEach(function (r, i) { c.strokeStyle = i ? 'rgba(125,226,255,.35)' : 'rgba(191,90,242,.4)'; c.shadowColor = i ? '#7de2ff' : '#bf5af2'; c.shadowBlur = 12; c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke(); }); c.shadowBlur = 0;
      txt(c, String(score), cx, cy + Math.min(w, h) * 0.07, Math.min(w, h) * 0.2, '#fff', 'center', 0.12);
      obs.forEach(function (o) { c.strokeStyle = '#ff4d6d'; c.shadowColor = '#ff4d6d'; c.shadowBlur = 14; c.lineWidth = 15; c.lineCap = 'round'; c.beginPath(); c.arc(cx, cy, R[o.ring], o.a - o.hw + 0.05, o.a + o.hw - 0.05); c.stroke(); }); c.shadowBlur = 0; c.lineCap = 'butt';
      coins.forEach(function (k) { var x = cx + Math.cos(k.a) * R[k.ring], y = cy + Math.sin(k.a) * R[k.ring], s = 7 + Math.sin(t * 6) * 1.5; c.fillStyle = '#ffe66d'; c.shadowColor = '#ffe66d'; c.shadowBlur = 14; c.beginPath(); c.arc(x, y, s, 0, TAU); c.fill(); }); c.shadowBlur = 0;
      trail.forEach(function (p, i) { c.globalAlpha = i / trail.length * 0.6; c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x, p.y, 2 + i * 0.28, 0, TAU); c.fill(); }); c.globalAlpha = 1;
      var px = cx + Math.cos(th) * rad, py = cy + Math.sin(th) * rad; c.fillStyle = '#fff'; c.shadowColor = '#7de2ff'; c.shadowBlur = 18; c.beginPath(); c.arc(px, py, 9, 0, TAU); c.fill(); c.shadowBlur = 0;
    };
    G._dbg = function () { return { th: th, ring: ring, obs: obs, coins: coins, score: score }; };
    return G;
  };

  /* ================= 4) SERPIENTE DE DATOS ================= */
  GAMES.snake = function (E) {
    var G = {}, cols = 16, rows, cs, ox, oy, body, dir, q, food, bonus, acc, step, score, eaten, t, sx, sy, sid, flash;
    G.resize = function () { cs = Math.floor(E.w / cols); rows = Math.max(10, Math.floor(E.h / cs)); ox = Math.floor((E.w - cols * cs) / 2); oy = Math.floor((E.h - rows * cs) / 2); };
    G.reset = function () {
      G.resize(); var cy = Math.floor(rows / 2); body = [{ x: 5, y: cy }, { x: 4, y: cy }, { x: 3, y: cy }]; dir = { x: 1, y: 0 }; q = [];
      acc = 0; step = 0.15; score = 0; eaten = 0; t = 0; bonus = null; flash = 0; sid = null; E.setScore(0); place();
    };
    function free() { var x, y, n = 0; do { x = Math.floor(rnd() * cols); y = Math.floor(rnd() * rows); n++; } while (n < 200 && body.some(function (b) { return b.x === x && b.y === y; })); return { x: x, y: y }; }
    function place() { food = free(); }
    function turn(nx, ny) { var last = q.length ? q[q.length - 1] : dir; if (last.x === -nx && last.y === -ny) return; if (last.x === nx && last.y === ny) return; if (q.length < 3) q.push({ x: nx, y: ny }); }
    G.pointerDown = function (x, y, id) { sx = x; sy = y; sid = id; };
    G.pointerMove = function (x, y, id) {
      if (sid !== id) return; var dx = x - sx, dy = y - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 24) { if (Math.abs(dx) > Math.abs(dy)) turn(dx > 0 ? 1 : -1, 0); else turn(0, dy > 0 ? 1 : -1); sx = x; sy = y; }
    };
    G.pointerUp = function () { sid = null; };
    G.keyDown = function (k) { var m = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] }[k]; if (m) turn(m[0], m[1]); };
    G.update = function (dt) {
      t += dt; if (flash > 0) flash -= dt; acc += dt;
      if (bonus && (bonus.ttl -= dt) <= 0) bonus = null;
      while (acc >= step) {
        acc -= step; if (q.length) dir = q.shift();
        var h = body[0], nx = (h.x + dir.x + cols) % cols, ny = (h.y + dir.y + rows) % rows;
        if (body.some(function (b, i) { return i < body.length - 1 && b.x === nx && b.y === ny; })) { beep(130, 0.4, 'sawtooth', 0.05); E.die(); return; }
        body.unshift({ x: nx, y: ny }); var grew = false;
        if (nx === food.x && ny === food.y) { score++; eaten++; grew = true; flash = 0.12; beep(700, 0.07, 'triangle', 0.05); step = Math.max(0.075, 0.15 - eaten * 0.0032); place(); if (eaten % 5 === 0) bonus = Object.assign(free(), { ttl: 6 }); }
        else if (bonus && nx === bonus.x && ny === bonus.y) { score += 3; grew = true; flash = 0.2; bonus = null; beep(980, 0.14, 'sine', 0.06); }
        if (grew) E.setScore(score); else body.pop();
      }
    };
    G.draw = function () {
      var c = E.ctx, w = E.w, h = E.h; c.fillStyle = flash > 0 ? '#0f2a35' : '#07121f'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(125,226,255,.07)'; for (var gx = 0; gx < cols; gx++) for (var gy = 0; gy < rows; gy++) if ((gx + gy) % 2) c.fillRect(ox + gx * cs, oy + gy * cs, cs, cs);
      c.strokeStyle = 'rgba(125,226,255,.25)'; c.lineWidth = 2; c.strokeRect(ox, oy, cols * cs, rows * cs);
      var pul = 1 + Math.sin(t * 8) * 0.08;
      c.shadowColor = '#7de2ff'; c.shadowBlur = 14; c.fillStyle = '#7de2ff'; rr(c, ox + food.x * cs + cs * 0.2 / pul, oy + food.y * cs + cs * 0.2 / pul, cs * 0.6 * pul, cs * 0.6 * pul, 4); c.fill();
      c.fillStyle = '#0a2a3a'; c.fillRect(ox + food.x * cs + cs * 0.4, oy + food.y * cs + cs * 0.4, cs * 0.2, cs * 0.2);
      if (bonus) { c.shadowColor = '#ffe66d'; c.fillStyle = '#ffe66d'; c.globalAlpha = bonus.ttl < 2 ? 0.4 + 0.6 * Math.abs(Math.sin(t * 12)) : 1; c.beginPath(); c.arc(ox + bonus.x * cs + cs / 2, oy + bonus.y * cs + cs / 2, cs * 0.36 * pul, 0, TAU); c.fill(); c.globalAlpha = 1; }
      body.forEach(function (b, i) { var k = 1 - i / body.length; c.shadowColor = 'hsl(' + (150 + i * 4) + ',90%,60%)'; c.shadowBlur = i ? 6 : 14; c.fillStyle = 'hsl(' + (150 + i * 4) + ',80%,' + (42 + 16 * k) + '%)'; rr(c, ox + b.x * cs + 1.5, oy + b.y * cs + 1.5, cs - 3, cs - 3, 5); c.fill(); });
      c.shadowBlur = 0; var hd = body[0], ex = dir.x, ey = dir.y; c.fillStyle = '#04121c';
      [[-1, 1]].concat([[1, 1]]).forEach(function (s) { var px = ox + hd.x * cs + cs / 2 + (ey ? s[0] * cs * 0.2 : ex * cs * 0.16), py = oy + hd.y * cs + cs / 2 + (ex ? s[0] * cs * 0.2 : ey * cs * 0.16); c.beginPath(); c.arc(px, py, cs * 0.09, 0, TAU); c.fill(); });
    };
    G._dbg = function () { return { body: body, food: food, dir: dir, cols: cols, rows: rows, score: score }; };
    return G;
  };


  /* ================= 5) RODAMIENTO (sensores: inclina el celular) ================= */
  GAMES.balance = function (E) {
    var G = {}, cols, rows, cs, ox, oy, r, th, walls, holes, coins, goal, startC, pathC, ball, vel, level, timeLeft, score, fall, t, t0, bannerT;
    var ori = { g: 0, b: 0 }, zero = null, mode = 'wait', got = false, keys = {}, drag = null, over = null, calib = { x: 0, y: 0, w: 96, h: 34 }, listening = false, tiltN = { x: 0, y: 0 };
    var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
    function haptic(p) { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { } }

    /* --- sensores --- */
    function onOri(e) { if (e.gamma == null || e.beta == null) return; got = true; mode = 'tilt'; ori.g = e.gamma; ori.b = e.beta; if (!zero) zero = { g: e.gamma, b: e.beta }; }
    G.start = function () {
      if (listening) return; var D = window.DeviceOrientationEvent;
      var go = function () { window.addEventListener('deviceorientation', onOri, true); listening = true; };
      if (D && typeof D.requestPermission === 'function') { try { D.requestPermission().then(function (res) { if (res === 'granted') go(); else mode = 'kbd'; }).catch(function () { mode = 'kbd'; }); } catch (e) { mode = 'kbd'; } }
      else if (D) go(); else mode = 'kbd';
    };
    G.destroy = function () { window.removeEventListener('deviceorientation', onOri, true); listening = false; };
    function tilt() {
      if (over) return over;
      if (mode === 'tilt' && zero) {
        var dg = ori.g - zero.g, db = ori.b - zero.b, a = (window.screen && screen.orientation && screen.orientation.angle) || window.orientation || 0, x, y;
        if (a === 90) { x = db; y = -dg; } else if (a === 270 || a === -90) { x = -db; y = dg; } else if (a === 180) { x = -dg; y = -db; } else { x = dg; y = db; }
        var f = function (v) { var n = clamp(v / 26, -1, 1); return Math.abs(n) < 0.06 ? 0 : n; };
        return { x: f(x), y: f(y) };
      }
      var kx = (keys.ArrowRight || keys.d || keys.D ? 1 : 0) - (keys.ArrowLeft || keys.a || keys.A ? 1 : 0), ky = (keys.ArrowDown || keys.s || keys.S ? 1 : 0) - (keys.ArrowUp || keys.w || keys.W ? 1 : 0);
      if (drag && drag.dx != null) return { x: clamp(drag.dx / (cs * 2.2), -1, 1), y: clamp(drag.dy / (cs * 2.2), -1, 1) };
      return { x: kx, y: ky };
    }
    G.keyDown = function (k) { keys[k] = true; if (k === 'c' || k === 'C') zero = got ? { g: ori.g, b: ori.b } : null; };
    G.keyUp = function (k) { keys[k] = false; };
    G.pointerDown = function (x, y) {
      if (x > calib.x && x < calib.x + calib.w && y > calib.y && y < calib.y + calib.h) { zero = got ? { g: ori.g, b: ori.b } : null; haptic(20); return; }
      drag = { x: x, y: y, dx: 0, dy: 0 };
    };
    G.pointerMove = function (x, y) { if (drag && mode !== 'tilt') { drag.dx = x - drag.x; drag.dy = y - drag.y; } };
    G.pointerUp = function () { drag = null; };

    /* --- laberinto --- */
    function maze(c, rr) {
      var R = [], D = [], vis = [], st = [0], i; for (i = 0; i < c * rr; i++) { R[i] = true; D[i] = true; } vis[0] = 1;
      while (st.length) {
        var cur = st[st.length - 1], x = cur % c, y = (cur / c) | 0, nb = [];
        if (x > 0 && !vis[cur - 1]) nb.push(0); if (x < c - 1 && !vis[cur + 1]) nb.push(1); if (y > 0 && !vis[cur - c]) nb.push(2); if (y < rr - 1 && !vis[cur + c]) nb.push(3);
        if (!nb.length) { st.pop(); continue; }
        var d = nb[Math.floor(rnd() * nb.length)], nx;
        if (d === 0) { nx = cur - 1; R[nx] = false; } else if (d === 1) { nx = cur + 1; R[cur] = false; } else if (d === 2) { nx = cur - c; D[nx] = false; } else { nx = cur + c; D[cur] = false; }
        vis[nx] = 1; st.push(nx);
      }
      return { R: R, D: D };
    }
    function build() {
      cols = Math.min(10, 5 + level); var top = 64, bottom = 52, availH = E.h - top - bottom;
      cs = Math.floor(Math.min(E.w - 36, 560) / cols); rows = Math.max(6, Math.floor(availH / cs)); cs = Math.floor(Math.min(cs, availH / rows));
      ox = Math.floor((E.w - cols * cs) / 2); oy = Math.floor(top + (availH - rows * cs) / 2); th = Math.max(5, cs * 0.14); r = cs * 0.19;
      var m = maze(cols, rows), i, x, y; walls = [];
      for (i = 0; i < cols * rows; i++) {
        x = i % cols; y = (i / cols) | 0;
        if (m.R[i]) walls.push({ x: ox + (x + 1) * cs - th / 2, y: oy + y * cs - th / 2, w: th, h: cs + th });
        if (m.D[i]) walls.push({ x: ox + x * cs - th / 2, y: oy + (y + 1) * cs - th / 2, w: cs + th, h: th });
        if (x === 0) walls.push({ x: ox - th / 2, y: oy + y * cs - th / 2, w: th, h: cs + th });
        if (y === 0) walls.push({ x: ox + x * cs - th / 2, y: oy - th / 2, w: cs + th, h: th });
      }
      /* BFS desde la salida (0) para ubicar la meta lejos y marcar el camino */
      var par = [], dist = [0], q = [0], head = 0; par[0] = -1;
      while (head < q.length) {
        var c0 = q[head++], cx = c0 % cols, cy = (c0 / cols) | 0, nbs = [];
        if (cx < cols - 1 && !m.R[c0]) nbs.push(c0 + 1); if (cx > 0 && !m.R[c0 - 1]) nbs.push(c0 - 1); if (cy < rows - 1 && !m.D[c0]) nbs.push(c0 + cols); if (cy > 0 && !m.D[c0 - cols]) nbs.push(c0 - cols);
        nbs.forEach(function (n) { if (dist[n] == null) { dist[n] = dist[c0] + 1; par[n] = c0; q.push(n); } });
      }
      var far = 0; for (i = 0; i < dist.length; i++) if (dist[i] != null && dist[i] > dist[far]) far = i;
      startC = 0; pathC = []; for (var k = far; k !== -1; k = par[k]) pathC.unshift(k);
      var cc = function (n) { return { x: ox + (n % cols + 0.5) * cs, y: oy + (((n / cols) | 0) + 0.5) * cs, n: n }; };
      goal = cc(far); var onPath = {}; pathC.forEach(function (n) { onPath[n] = 1; });
      var cand = []; for (i = 0; i < cols * rows; i++) if (!onPath[i]) cand.push(i);
      for (i = cand.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), tmp = cand[i]; cand[i] = cand[j]; cand[j] = tmp; }
      var nh = Math.min(level + 1, 8, Math.floor(cand.length * 0.2)); holes = cand.splice(0, nh).map(cc);
      var pool = []; for (i = 1; i < cols * rows; i++) if (i !== far && holes.every(function (h) { return h.n !== i; })) pool.push(i);
      for (i = pool.length - 1; i > 0; i--) { var j2 = Math.floor(rnd() * (i + 1)), t2 = pool[i]; pool[i] = pool[j2]; pool[j2] = t2; }
      coins = pool.slice(0, 3).map(cc).map(function (c) { c.got = false; return c; });
      var s0 = cc(0); ball = { x: s0.x, y: s0.y }; vel = { x: 0, y: 0 }; fall = null; bannerT = 1.4; calib.x = E.w - calib.w - 10; calib.y = E.h - calib.h - 8;
    }
    G.resize = function () { if (walls) { var keep = ball ? { fx: (ball.x - ox) / cs, fy: (ball.y - oy) / cs } : null; build(); if (keep) { ball.x = ox + keep.fx * cs; ball.y = oy + keep.fy * cs; } } };
    G.reset = function () { level = 1; score = 0; timeLeft = 40; t = 0; t0 = 0; zero = null; keys = {}; drag = null; over = null; build(); E.setScore(0); };

    function nextLevel() {
      score += 100 + level * 20; E.setScore(score); level++; timeLeft = Math.min(60, timeLeft + 16 + Math.min(10, level)); beep(660, 0.12, 'triangle', 0.05); setTimeout(function () { beep(990, 0.18, 'triangle', 0.05); }, 110); haptic([20, 30, 20]); build();
    }
    function collide() {
      for (var i = 0; i < walls.length; i++) {
        var w = walls[i], px = clamp(ball.x, w.x, w.x + w.w), py = clamp(ball.y, w.y, w.y + w.h), dx = ball.x - px, dy = ball.y - py, d2 = dx * dx + dy * dy;
        if (d2 >= r * r) continue;
        var nx, ny, d = Math.sqrt(d2), pen;
        if (d > 0.0001) { nx = dx / d; ny = dy / d; pen = r - d; }
        else { var l = ball.x - w.x, rt = w.x + w.w - ball.x, tp = ball.y - w.y, bt = w.y + w.h - ball.y, mn = Math.min(l, rt, tp, bt); nx = mn === l ? -1 : mn === rt ? 1 : 0; ny = mn === tp ? -1 : mn === bt ? 1 : 0; if (!nx && !ny) ny = 1; pen = r + mn; }
        ball.x += nx * pen; ball.y += ny * pen; var vn = vel.x * nx + vel.y * ny;
        if (vn < 0) { vel.x -= 1.28 * vn * nx; vel.y -= 1.28 * vn * ny; if (-vn > cs * 2.4) { haptic(12); beep(170 + rnd() * 40, 0.04, 'square', 0.025); } }
      }
    }
    G.update = function (dt) {
      t += dt; if (bannerT > 0) bannerT -= dt;
      if (mode === 'wait' && t > 1.0 && !got) mode = 'kbd';
      if (fall) {
        fall.t += dt; ball.x += (fall.h.x - ball.x) * Math.min(1, dt * 12); ball.y += (fall.h.y - ball.y) * Math.min(1, dt * 12);
        if (fall.t > 0.55) { var s0 = { x: ox + 0.5 * cs, y: oy + 0.5 * cs }; ball.x = s0.x; ball.y = s0.y; vel.x = vel.y = 0; fall = null; timeLeft -= 3; if (timeLeft <= 0) { timeLeft = 0; E.die(); } }
        return;
      }
      timeLeft -= dt; if (timeLeft <= 0) { timeLeft = 0; haptic(150); beep(140, 0.4, 'sawtooth', 0.05); E.die(); return; }
      var a = tilt(); tiltN = a; var A = cs * 24, vmax = cs * 9;
      for (var s = 0; s < 3; s++) {
        var h = dt / 3; vel.x += a.x * A * h; vel.y += a.y * A * h; var f = Math.exp(-1.5 * h); vel.x *= f; vel.y *= f;
        var sp = Math.hypot(vel.x, vel.y); if (sp > vmax) { vel.x *= vmax / sp; vel.y *= vmax / sp; }
        ball.x += vel.x * h; ball.y += vel.y * h; collide();
      }
      for (var i = 0; i < holes.length; i++) { var hd = Math.hypot(ball.x - holes[i].x, ball.y - holes[i].y); if (hd < cs * 0.2) { fall = { t: 0, h: holes[i] }; haptic([40, 40, 60]); beep(120, 0.4, 'sawtooth', 0.05); return; } }
      coins.forEach(function (c) { if (!c.got && Math.hypot(ball.x - c.x, ball.y - c.y) < cs * 0.3) { c.got = true; score += 25; timeLeft = Math.min(60, timeLeft + 2); E.setScore(score); beep(1000, 0.1, 'sine', 0.06); haptic(15); } });
      if (Math.hypot(ball.x - goal.x, ball.y - goal.y) < cs * 0.24 && Math.hypot(vel.x, vel.y) < cs * 7.5) nextLevel();
    };
    G.draw = function () {
      var c = E.ctx, w = E.w, h = E.h, i;
      var bg = c.createLinearGradient(0, 0, 0, h); bg.addColorStop(0, '#10131f'); bg.addColorStop(1, '#1a2133'); c.fillStyle = bg; c.fillRect(0, 0, w, h);
      /* placa metálica */
      var px = ox - th, py = oy - th, pw = cols * cs + th * 2, ph = rows * cs + th * 2;
      c.shadowColor = '#000'; c.shadowBlur = 24; c.shadowOffsetY = 8; c.fillStyle = '#2a3347'; rr(c, px - 8, py - 8, pw + 16, ph + 16, 18); c.fill(); c.shadowBlur = 0; c.shadowOffsetY = 0;
      var pl = c.createLinearGradient(px, py, px + pw, py + ph); pl.addColorStop(0, '#3a4560'); pl.addColorStop(0.5, '#4b5878'); pl.addColorStop(1, '#343e57'); c.fillStyle = pl; rr(c, px, py, pw, ph, 12); c.fill();
      c.strokeStyle = 'rgba(255,255,255,.05)'; c.lineWidth = 1; for (i = 0; i < cols; i++) for (var j = 0; j < rows; j++) c.strokeRect(ox + i * cs + 0.5, oy + j * cs + 0.5, cs, cs);
      /* meta */
      var pul = 1 + Math.sin(t * 5) * 0.06;
      c.shadowColor = '#30d158'; c.shadowBlur = 20; c.strokeStyle = '#30d158'; c.lineWidth = 3; c.beginPath(); c.arc(goal.x, goal.y, cs * 0.3 * pul, 0, TAU); c.stroke();
      c.fillStyle = '#0c3a1c'; c.beginPath(); c.arc(goal.x, goal.y, cs * 0.24, 0, TAU); c.fill(); c.shadowBlur = 0; txt(c, '★', goal.x, goal.y + cs * 0.09, cs * 0.3, '#30d158');
      /* agujeros */
      holes.forEach(function (o) { var g = c.createRadialGradient(o.x, o.y, 2, o.x, o.y, cs * 0.27); g.addColorStop(0, '#000'); g.addColorStop(0.75, '#05070d'); g.addColorStop(1, '#2a3040'); c.fillStyle = g; c.beginPath(); c.arc(o.x, o.y, cs * 0.27, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 2; c.stroke(); });
      /* tornillos (monedas) */
      coins.forEach(function (o) { if (o.got) return; var rad = cs * 0.15 + Math.sin(t * 6 + o.n) * 1.2; c.fillStyle = '#ffd76a'; c.shadowColor = '#ffd76a'; c.shadowBlur = 10; c.beginPath(); for (var k = 0; k < 6; k++) { var an = k / 6 * TAU + t; c.lineTo(o.x + Math.cos(an) * rad, o.y + Math.sin(an) * rad); } c.closePath(); c.fill(); c.shadowBlur = 0; c.fillStyle = '#9a6b00'; c.beginPath(); c.arc(o.x, o.y, rad * 0.4, 0, TAU); c.fill(); });
      /* paredes */
      walls.forEach(function (wl) { c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(wl.x + 3, wl.y + 4, wl.w, wl.h); });
      walls.forEach(function (wl) { var g = c.createLinearGradient(wl.x, wl.y, wl.x + wl.w, wl.y + wl.h); g.addColorStop(0, '#c9d4ec'); g.addColorStop(1, '#6f82ab'); c.fillStyle = g; c.fillRect(wl.x, wl.y, wl.w, wl.h); });
      /* balín */
      var bx = ball.x, by = ball.y, sc = fall ? Math.max(0.05, 1 - fall.t / 0.55) : 1, rr2 = r * sc;
      c.fillStyle = 'rgba(0,0,0,.4)'; c.beginPath(); c.ellipse(bx + r * 0.25 * sc, by + r * 0.4 * sc, rr2 * 1.02, rr2 * 0.9, 0, 0, TAU); c.fill();
      var bg2 = c.createRadialGradient(bx - rr2 * (0.35 + tiltN.x * 0.1), by - rr2 * (0.4 + tiltN.y * 0.1), rr2 * 0.1, bx, by, rr2 * 1.05); bg2.addColorStop(0, '#ffffff'); bg2.addColorStop(0.35, '#cfd8e8'); bg2.addColorStop(0.75, '#6a778f'); bg2.addColorStop(1, '#262e40');
      c.fillStyle = bg2; c.beginPath(); c.arc(bx, by, rr2, 0, TAU); c.fill();
      /* HUD */
      var tw = w - 32, frac = clamp(timeLeft / 60, 0, 1); c.fillStyle = 'rgba(255,255,255,.12)'; rr(c, 16, 20, tw, 10, 5); c.fill();
      c.fillStyle = frac < 0.25 ? '#ff453a' : '#30d158'; rr(c, 16, 20, Math.max(8, tw * frac), 10, 5); c.fill();
      txt(c, T('Nivel {n}').replace('{n}', level), 16, 52, 16, '#fff', 'left'); txt(c, Math.ceil(timeLeft) + ' s', w - 16, 52, 16, frac < 0.25 ? '#ff453a' : '#fff', 'right');
      txt(c, mode === 'tilt' ? '📱 ' + T('Inclina tu celular') : '⌨️ ' + T('Flechas o arrastra'), 16, h - 18, 13, '#fff', 'left', 0.65);
      c.fillStyle = 'rgba(255,255,255,.14)'; rr(c, calib.x, calib.y, calib.w, calib.h, 17); c.fill(); txt(c, '↺ ' + T('Calibrar'), calib.x + calib.w / 2, calib.y + 22, 14, '#fff');
      if (bannerT > 0) txt(c, T('Nivel {n}').replace('{n}', level), w / 2, h * 0.5, 40, '#ffe66d', 'center', Math.min(1, bannerT));
    };
    G._dbg = function () { return { ball: ball, goal: goal, path: pathC.map(function (n) { return { x: ox + (n % cols + 0.5) * cs, y: oy + (((n / cols) | 0) + 0.5) * cs }; }), level: level, score: score, time: timeLeft, mode: mode, holes: holes.length, cs: cs, setInput: function (x, y) { over = x == null ? null : { x: x, y: y }; } }; };
    return G;
  };


  /* ================= 6) AKAZU DANCE (ritmo) ================= */
  GAMES.akazu = function (E) {
    var G = {}, TT = 1.55, BPM = 116, SPB = 60 / BPM, LEAD = 2.2, GOAL = 500, LANE = ['#7de2ff', '#ff6bd6', '#ffe66d'], PITCH = [523.25, 659.25, 783.99];
    var KEYS = { ArrowLeft: 0, a: 0, A: 0, ArrowDown: 1, s: 1, S: 1, ArrowRight: 2, d: 2, D: 2 };
    var t, notes, genI, sch, score, combo, energy, pops, pulse, goalDone, goalT, joy, flash, img = null, imgOk = false, hitY, topY, u;
    if (window.CFG && window.CFG.akazu) { img = new Image(); img.onload = function () { imgOk = true; }; img.src = (window.CFG.root || '') + window.CFG.akazu; }
    G.resize = function () { hitY = E.h * 0.86; topY = E.h * 0.4; u = Math.min(E.w, E.h * 0.62) / 12.5; };
    G.reset = function () { G.resize(); t = 0; notes = []; genI = 4; sch = 0; score = 0; combo = 0; energy = 100; pops = []; pulse = [0, 0, 0]; goalDone = false; goalT = 0; joy = 0; flash = 0; E.setScore(0); };
    function gen() {
      var at = LEAD + genI * SPB / 2, on = genI % 2 === 0, p = on ? Math.min(0.95, 0.55 + genI / 300) : Math.min(0.55, 0.12 + genI / 260), last = notes.length ? notes[notes.length - 1] : null;
      if (rnd() < p) {
        var lane = Math.floor(rnd() * 3); if (last && Math.abs(last.at - at) < SPB * 0.6 && last.lane === lane) lane = (lane + 1 + Math.floor(rnd() * 2)) % 3;
        notes.push({ lane: lane, at: at, hit: false, miss: false });
        if (genI > 64 && on && genI % 8 === 0 && rnd() < 0.3) notes.push({ lane: (lane + 1 + Math.floor(rnd() * 2)) % 3, at: at, hit: false, miss: false });
      }
      genI++;
    }
    function music(i8, when) {
      var b8 = i8 % 8, bass = [110, 110, 130.81, 98, 110, 146.83, 130.81, 98];
      if (b8 % 2 === 0) { tone(120, when, 0.16, 'sine', 0.13); tone(55, when, 0.18, 'sine', 0.1); tone(bass[(i8 / 2) % 8 | 0], when, 0.22, 'sawtooth', 0.025); }
      if (b8 === 2 || b8 === 6) { noise(when, 0.14, 0.05, 1800); tone(190, when, 0.08, 'triangle', 0.05); }
      noise(when, b8 % 2 ? 0.05 : 0.025, b8 % 2 ? 0.022 : 0.012, 7000);
    }
    function pop(txt, col, x) { pops.push({ t: 0, s: txt, c: col, x: x }); }
    function tap(lane) {
      var best = null, bd = 9;
      notes.forEach(function (n) { if (n.lane === lane && !n.hit && !n.miss) { var d = Math.abs(n.at - t); if (d <= 0.16 && d < bd) { best = n; bd = d; } } });
      pulse[lane] = 1;
      if (!best) { energy -= 3; combo = Math.max(0, combo - 0); return; }
      best.hit = true; combo++; var mult = 1 + Math.min(3, Math.floor(combo / 10)), pts = bd <= 0.06 ? 3 : bd <= 0.11 ? 2 : 1;
      score += pts * mult; E.setScore(score); energy = Math.min(100, energy + 2); joy = 0.35; flash = pts === 3 ? 0.18 : 0;
      pop(pts === 3 ? T('¡Perfecto!') : pts === 2 ? T('Bien') : T('Ok'), pts === 3 ? '#ffe66d' : pts === 2 ? '#7de2ff' : '#ffffff', (lane + 0.5) * E.w / 3);
      var a = actx(); if (a) tone(PITCH[lane] * (pts === 3 ? 2 : 1), a.currentTime, 0.18, 'triangle', 0.07);
      try { if (navigator.vibrate && pts === 3) navigator.vibrate(8); } catch (e) { }
      if (!goalDone && score >= GOAL) { goalDone = true; goalT = 3; var a2 = actx(); if (a2) [523, 659, 784, 1047].forEach(function (f, i) { tone(f, a2.currentTime + i * 0.09, 0.3, 'triangle', 0.07); }); }
    }
    G.pointerDown = function (x) { tap(Math.max(0, Math.min(2, Math.floor(x / (E.w / 3))))); };
    G.keyDown = function (k) { if (KEYS[k] != null) tap(KEYS[k]); };
    G.update = function (dt) {
      t += dt; if (joy > 0) joy -= dt; if (flash > 0) flash -= dt; if (goalT > 0) goalT -= dt;
      while (LEAD + genI * SPB / 2 < t + TT + 0.3) gen();
      while (LEAD + sch * SPB / 2 < t + 0.18) { var a = actx(); if (a) music(sch, a.currentTime + Math.max(0, LEAD + sch * SPB / 2 - t)); sch++; }
      for (var i = notes.length - 1; i >= 0; i--) {
        var n = notes[i];
        if (!n.hit && !n.miss && t - n.at > 0.16) { n.miss = true; combo = 0; energy -= 12; pop(T('Fallo'), '#ff6b6b', (n.lane + 0.5) * E.w / 3); try { if (navigator.vibrate) navigator.vibrate(20); } catch (e) { } }
        if (t - n.at > 0.7) notes.splice(i, 1);
      }
      for (var j = 0; j < 3; j++) if (pulse[j] > 0) pulse[j] = Math.max(0, pulse[j] - dt * 5);
      for (var k = pops.length - 1; k >= 0; k--) { pops[k].t += dt; if (pops[k].t > 0.7) pops.splice(k, 1); }
      if (energy <= 0) { energy = 0; beep(130, 0.4, 'sawtooth', 0.05); E.die(); }
    };
    function avatar(c, cx, cy, ph, pose, up) {
      var bob = Math.abs(Math.sin(ph * Math.PI)) * u * 0.4, lean = (pose % 2 ? 1 : -1) * 0.09 * (t > LEAD ? 1 : 0.3);
      c.fillStyle = 'rgba(0,0,0,.35)'; c.beginPath(); c.ellipse(cx, cy + u * 3.9, u * 1.9, u * 0.35, 0, 0, TAU); c.fill();
      if (imgOk) { var sz = u * 5.4, ar = img.width / img.height; c.save(); c.translate(cx, cy + u * 1.4 - bob); c.rotate(lean); c.drawImage(img, -sz * ar / 2, -sz / 2, sz * ar, sz); c.restore(); return; }
      c.save(); c.translate(cx, cy - bob); c.rotate(lean);
      c.fillStyle = '#2a3a8c'; rr(c, -u * 0.95, u * 3, u * 0.8, u * 0.9, u * 0.25); c.fill(); rr(c, u * 0.15, u * 3, u * 0.8, u * 0.9, u * 0.25); c.fill();
      c.fillStyle = '#ff3b4a'; rr(c, -u * 1.25, u * 0.9, u * 2.5, u * 2.4, u * 0.7); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(-u * 0.08, u * 1.3, u * 0.16, u * 1.4);
      c.strokeStyle = '#ff3b4a'; c.lineWidth = u * 0.62; c.lineCap = 'round';
      var L = up ? [-2.5, -0.9] : pose % 2 ? [-2.4, -0.7] : [-1.9, 2.4], R = up ? [2.5, -0.9] : pose % 2 ? [1.9, 2.4] : [2.4, -0.7];
      c.beginPath(); c.moveTo(-u * 1.1, u * 1.4); c.lineTo(u * L[0], u * L[1] + u * 1.2); c.moveTo(u * 1.1, u * 1.4); c.lineTo(u * R[0], u * R[1] + u * 1.2); c.stroke();
      c.fillStyle = '#ffe0cf'; c.beginPath(); c.arc(u * L[0], u * L[1] + u * 1.2, u * 0.4, 0, TAU); c.arc(u * R[0], u * R[1] + u * 1.2, u * 0.4, 0, TAU); c.fill();
      c.fillStyle = '#ffe0cf'; c.beginPath(); c.arc(0, -u * 0.3, u * 1.7, 0, TAU); c.fill();
      c.fillStyle = '#ff2d3d'; c.beginPath(); c.moveTo(-u * 1.8, -u * 0.2); c.lineTo(-u * 1.6, -u * 1.7); c.lineTo(-u * 0.9, -u * 1.2); c.lineTo(-u * 0.5, -u * 2.4); c.lineTo(u * 0.1, -u * 1.5); c.lineTo(u * 0.8, -u * 2.3); c.lineTo(u * 1.0, -u * 1.2); c.lineTo(u * 1.7, -u * 1.6); c.lineTo(u * 1.8, -u * 0.2); c.lineTo(u * 1.1, -u * 0.8); c.lineTo(-u * 1.1, -u * 0.8); c.closePath(); c.fill();
      c.strokeStyle = '#7de2ff'; c.lineWidth = u * 0.28; c.beginPath(); c.arc(0, -u * 0.35, u * 1.9, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
      c.fillStyle = '#7de2ff'; rr(c, -u * 2.15, -u * 0.5, u * 0.55, u * 1.1, u * 0.2); c.fill(); rr(c, u * 1.6, -u * 0.5, u * 0.55, u * 1.1, u * 0.2); c.fill();
      c.fillStyle = 'rgba(125,226,255,.45)'; rr(c, -u * 1.35, -u * 0.55, u * 2.7, u * 0.85, u * 0.4); c.fill();
      c.fillStyle = '#101a38'; c.beginPath(); c.ellipse(-u * 0.6, -u * 0.12, u * 0.2, u * 0.3, 0, 0, TAU); c.ellipse(u * 0.6, -u * 0.12, u * 0.2, u * 0.3, 0, 0, TAU); c.fill();
      c.fillStyle = '#fff'; c.fillRect(-u * 0.66, -u * 0.25, u * 0.1, u * 0.1); c.fillRect(u * 0.54, -u * 0.25, u * 0.1, u * 0.1);
      c.strokeStyle = '#8a2a3a'; c.lineWidth = u * 0.14; c.beginPath(); if (up) c.ellipse(0, u * 0.65, u * 0.3, u * 0.22, 0, 0, TAU); else c.arc(0, u * 0.45, u * 0.35, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
      c.restore();
    }
    G.draw = function () {
      var c = E.ctx, w = E.w, h = E.h, ph = t > LEAD ? ((t - LEAD) / SPB) % 1 : 0, pose = t > LEAD ? Math.floor((t - LEAD) / SPB) : 0, beat = Math.max(0, 1 - ph * 3);
      var gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, flash > 0 ? '#3a1060' : '#190a3a'); gr.addColorStop(1, '#07031a'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      var sp = c.createRadialGradient(w / 2, 0, 10, w / 2, h * 0.3, h * 0.5); sp.addColorStop(0, 'rgba(255,107,214,' + (0.28 + beat * 0.2) + ')'); sp.addColorStop(1, 'rgba(255,107,214,0)'); c.fillStyle = sp; c.fillRect(0, 0, w, h * 0.6);
      for (var i = 0; i < 18; i++) { var bh = (0.25 + 0.75 * Math.abs(Math.sin(t * 2.6 + i * 0.8))) * (h * 0.14) * (0.6 + beat * 0.6); c.fillStyle = 'hsla(' + (290 + i * 6) + ',90%,65%,.35)'; c.fillRect(i * w / 18 + 2, h * 0.36 - bh, w / 18 - 4, bh); }
      avatar(c, w / 2, 70 + u * 2.55, ph, pose, joy > 0);
      for (var l = 0; l < 3; l++) { var x0 = l * w / 3; c.fillStyle = 'rgba(255,255,255,' + (0.04 + pulse[l] * 0.2) + ')'; c.fillRect(x0 + 2, topY, w / 3 - 4, h - topY); c.fillStyle = LANE[l]; c.globalAlpha = 0.3 + pulse[l] * 0.5; c.fillRect(x0 + 2, hitY - 3, w / 3 - 4, 6); c.globalAlpha = 1; }
      c.shadowBlur = 18; var sp2 = (hitY - topY) / TT;
      notes.forEach(function (n) {
        if (n.hit) return; var y = hitY - (n.at - t) * sp2; if (y < topY - 30 || y > h + 30) return; var nw = w / 3 * 0.62, x = (n.lane + 0.5) * w / 3 - nw / 2;
        c.globalAlpha = n.miss ? 0.25 : Math.min(1, (y - topY) / 50 + 0.2); c.shadowColor = LANE[n.lane]; c.fillStyle = LANE[n.lane]; rr(c, x, y - 13, nw, 26, 13); c.fill(); c.fillStyle = 'rgba(255,255,255,.55)'; rr(c, x + 6, y - 9, nw - 12, 6, 3); c.fill();
      }); c.shadowBlur = 0; c.globalAlpha = 1;
      for (var q = 0; q < 3; q++) txt(c, ['A', 'S', 'D'][q], (q + 0.5) * w / 3, h - 12, 14, '#fff', 'center', 0.4);
      pops.forEach(function (p) { txt(c, p.s, p.x, hitY - 34 - p.t * 60, 22, p.c, 'center', 1 - p.t / 0.7); });
      /* HUD */
      c.fillStyle = 'rgba(255,255,255,.14)'; rr(c, 14, 14, w - 28, 9, 4.5); c.fill(); c.fillStyle = energy < 30 ? '#ff453a' : '#30d158'; rr(c, 14, 14, Math.max(8, (w - 28) * energy / 100), 9, 4.5); c.fill();
      txt(c, '👥 ' + Math.min(score, GOAL) + ' / ' + GOAL, 14, 44, 14, '#fff', 'left', 0.9);
      c.fillStyle = 'rgba(255,255,255,.14)'; rr(c, 14, 52, w - 28, 5, 2.5); c.fill(); c.fillStyle = '#ff6bd6'; rr(c, 14, 52, Math.max(5, (w - 28) * Math.min(1, score / GOAL)), 5, 2.5); c.fill();
      if (combo >= 5) txt(c, 'x' + (1 + Math.min(3, Math.floor(combo / 10))) + '  ·  ' + T('Combo') + ' ' + combo, w - 14, 44, 14, '#ffe66d', 'right');
      if (goalT > 0) txt(c, T('¡Meta de 500 seguidores!'), w / 2, h * 0.46, 24, '#ffe66d', 'center', Math.min(1, goalT));
      if (t < LEAD - 0.3) txt(c, T('¡Prepárate!'), w / 2, h * 0.5, 34, '#fff', 'center', 0.9);
    };
    G._dbg = function () { return { t: t, notes: notes.filter(function (n) { return !n.hit && !n.miss; }), energy: energy, score: score, combo: combo }; };
    return G;
  };

  /* ================= 7) CONTROL DE TORNILLOS ================= */
  GAMES.screws = function (E) {
    var G = {}, K = 1, cy, rule, cur, fly, t, lives, score, streak, count, level, crossT, spawnIn, banner, shake, red, pops, press, lastWhy;
    var HEADS = ['hex', 'dome', 'flat'], HN = { hex: 'hexagonal', dome: 'redonda', flat: 'plana' }, LN = { short: 'corto', long: 'largo' };
    function newRule() { var h = HEADS[Math.floor(rnd() * 3)], l = rnd() < 0.5 ? 'short' : 'long'; if (rule && rule.head === h && rule.len === l) l = l === 'short' ? 'long' : 'short'; rule = { head: h, len: l }; }
    function other(arr, x) { var o = arr.filter(function (v) { return v !== x; }); return o[Math.floor(rnd() * o.length)]; }
    function make() {
      var s = { head: rule.head, len: rule.len, flaw: null, why: '', valid: true };
      if (rnd() < 0.5) return s; s.valid = false; var r = rnd();
      if (r < 0.26) { s.head = other(HEADS, rule.head); s.why = 'Cabeza equivocada'; }
      else if (r < 0.48) { s.len = rule.len === 'long' ? 'short' : 'long'; s.why = 'Largo equivocado'; }
      else { s.flaw = ['bent', 'nothread', 'crack'][Math.floor(rnd() * 3)]; s.why = { bent: 'Doblado', nothread: 'Sin rosca', crack: 'Rajado' }[s.flaw]; if (rnd() < 0.4) { s.head = HEADS[Math.floor(rnd() * 3)]; s.len = rnd() < 0.5 ? 'long' : 'short'; } }
      return s;
    }
    G.resize = function () { K = Math.max(0.6, Math.min(E.w / 400, E.h / 760)); cy = E.h * 0.47; };
    G.reset = function () { G.resize(); rule = null; newRule(); cur = null; fly = []; t = 0; lives = 3; score = 0; streak = 0; count = 0; level = 1; crossT = 3.4; spawnIn = 0.6; banner = 1.6; shake = 0; red = 0; pops = []; press = [0, 0]; E.setScore(0); };
    function pop(s, c) { pops.push({ t: 0, s: T(s), c: c || '#fff' }); }
    function lose(why) {
      lives--; streak = 0; shake = 0.3; red = 0.35; pop(why, '#ff6b6b'); beep(140, 0.3, 'sawtooth', 0.05); try { if (navigator.vibrate) navigator.vibrate(80); } catch (e) { }
      if (lives <= 0) E.die();
    }
    function decide(approve) {
      if (!cur) return; press[approve ? 1 : 0] = 1; var ok = approve === cur.s.valid, s = cur.s, x = pos(cur);
      fly.push({ s: s, x: x, y: cy, a: approve, t: 0, x0: x, y0: cy }); cur = null; spawnIn = 0.28; count++;
      if (ok) { streak++; score += 10 + Math.floor(streak / 5) * 5; E.setScore(score); pop(streak >= 5 ? '¡Racha!' : '¡Bien!', '#30d158'); beep(approve ? 760 : 520, 0.08, 'triangle', 0.05); }
      else lose(approve ? s.why : 'Estaba perfecto');
      if (lives > 0) { if (count % 8 === 0) { newRule(); banner = 1.8; beep(300, 0.1, 'square', 0.04); } if (count % 10 === 0) { level++; crossT = Math.max(1.2, 3.4 - level * 0.28); } }
    }
    G.pointerDown = function (x) { decide(x > E.w / 2); };
    G.keyDown = function (k) { if (k === 'ArrowRight' || k === 'd' || k === 'D') decide(true); if (k === 'ArrowLeft' || k === 'a' || k === 'A') decide(false); };
    function pos(o) { var L = 130 * K; return -L + (o.age / crossT) * (E.w + 2 * L); }
    G.update = function (dt) {
      t += dt; if (shake > 0) shake -= dt; if (red > 0) red -= dt; if (banner > 0) banner -= dt; press[0] = Math.max(0, press[0] - dt * 4); press[1] = Math.max(0, press[1] - dt * 4);
      if (cur) { cur.age += dt; if (cur.age >= crossT) { var w = cur.s; cur = null; spawnIn = 0.3; lose('Se te pasó'); } }
      else { spawnIn -= dt; if (spawnIn <= 0 && lives > 0) cur = { s: make(), age: 0 }; }
      for (var i = fly.length - 1; i >= 0; i--) { fly[i].t += dt / 0.4; if (fly[i].t >= 1) fly.splice(i, 1); }
      for (var j = pops.length - 1; j >= 0; j--) { pops[j].t += dt; if (pops[j].t > 0.9) pops.splice(j, 1); }
    };
    function shaft(c, len, sd, thr, tip) {
      var g = c.createLinearGradient(0, -sd / 2, 0, sd / 2); g.addColorStop(0, '#f4f7fc'); g.addColorStop(0.5, '#a9b4c8'); g.addColorStop(1, '#55617a'); c.fillStyle = g; c.fillRect(0, -sd / 2, len, sd);
      if (tip) { c.beginPath(); c.moveTo(len, -sd / 2); c.lineTo(len + 20, 0); c.lineTo(len, sd / 2); c.closePath(); c.fill(); }
      if (thr) { c.strokeStyle = 'rgba(40,50,70,.55)'; c.lineWidth = 2.5; for (var x = 8; x < len; x += 9) { c.beginPath(); c.moveTo(x, -sd / 2); c.lineTo(x + 6, sd / 2); c.stroke(); } }
    }
    function drawScrew(c, s, x, y, k, rot) {
      var Ls = s.len === 'long' ? 150 : 90, hw = 28, hh = 58, sd = 24, total = hw + Ls + 20;
      c.save(); c.translate(x, y); c.rotate(rot || 0); c.scale(k, k); c.translate(-total / 2, 0);
      var hg = c.createLinearGradient(0, -hh / 2, 0, hh / 2); hg.addColorStop(0, '#d9e0ee'); hg.addColorStop(0.5, '#8f9bb3'); hg.addColorStop(1, '#434e66');
      c.save(); c.translate(hw, 0);
      if (s.flaw === 'bent') { shaft(c, Ls * 0.42, sd, true, false); c.translate(Ls * 0.42, 0); c.rotate(0.3); shaft(c, Ls * 0.62, sd, true, true); } else shaft(c, Ls, sd, s.flaw !== 'nothread', true);
      c.restore();
      c.fillStyle = hg;
      if (s.head === 'hex') { rr(c, 0, -hh / 2, hw, hh, 5); c.fill(); c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2; c.beginPath(); c.moveTo(hw * 0.5, -hh / 2 + 4); c.lineTo(hw * 0.5, hh / 2 - 4); c.stroke(); }
      else if (s.head === 'dome') { c.beginPath(); c.ellipse(hw, 0, hw, hh / 2, 0, Math.PI / 2, Math.PI * 1.5, false); c.closePath(); c.fill(); c.strokeStyle = 'rgba(30,40,60,.6)'; c.lineWidth = 3; c.beginPath(); c.moveTo(hw * 0.35, -hh * 0.3); c.lineTo(hw * 0.35, hh * 0.3); c.stroke(); }
      else { c.beginPath(); c.moveTo(0, -hh / 2); c.lineTo(hw, -sd / 2 - 3); c.lineTo(hw, sd / 2 + 3); c.lineTo(0, hh / 2); c.closePath(); c.fill(); c.strokeStyle = 'rgba(30,40,60,.6)'; c.lineWidth = 3; c.beginPath(); c.moveTo(6, 0); c.lineTo(hw * 0.7, 0); c.stroke(); }
      if (s.flaw === 'crack') { c.strokeStyle = '#1b2030'; c.lineWidth = 3.2; c.beginPath(); c.moveTo(hw * 0.2, -hh / 2); c.lineTo(hw * 0.7, -hh * 0.18); c.lineTo(hw * 0.25, 0); c.lineTo(hw * 0.75, hh * 0.2); c.lineTo(hw * 0.4, hh / 2); c.stroke(); }
      c.restore();
    }
    G.draw = function () {
      var c = E.ctx, w = E.w, h = E.h; c.save(); if (shake > 0) c.translate((rnd() - 0.5) * 9, (rnd() - 0.5) * 9);
      var gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, red > 0 ? '#3a1218' : '#0f1d26'); gr.addColorStop(1, '#18303a'); c.fillStyle = gr; c.fillRect(-10, -10, w + 20, h + 20);
      c.fillStyle = 'rgba(255,255,255,.04)'; for (var i = 0; i < 6; i++) c.fillRect(0, h * 0.12 + i * 38 * K, w, 10 * K);
      /* contenedores */
      var gb = { x: w - 90 * K, y: cy - 150 * K }, rb = { x: 14 * K, y: cy + 100 * K };
      c.fillStyle = '#143d27'; rr(c, gb.x, gb.y, 78 * K, 62 * K, 12); c.fill(); c.strokeStyle = '#30d158'; c.lineWidth = 3; c.stroke(); txt(c, '✔', gb.x + 39 * K, gb.y + 42 * K, 34 * K, '#30d158');
      c.fillStyle = '#411820'; rr(c, rb.x, rb.y, 78 * K, 62 * K, 12); c.fill(); c.strokeStyle = '#ff453a'; c.stroke(); txt(c, '✖', rb.x + 39 * K, rb.y + 42 * K, 34 * K, '#ff453a');
      /* banda */
      var by = cy - 52 * K, bh = 104 * K; c.fillStyle = '#222b36'; c.fillRect(0, by, w, bh); c.fillStyle = '#10161d'; c.fillRect(0, by, w, 8 * K); c.fillRect(0, by + bh - 8 * K, w, 8 * K);
      c.fillStyle = 'rgba(255,255,255,.08)'; var off = (t * 120 * K) % (40 * K); for (var x = -40 * K + off; x < w; x += 40 * K) c.fillRect(x, by + 8 * K, 6 * K, bh - 16 * K);
      /* orden del jefe */
      c.fillStyle = 'rgba(255,255,255,.08)'; rr(c, 12, 14, w - 24, 78 * K + 14, 16); c.fill();
      txt(c, T('Orden del jefe'), 24, 38, 13, '#ffe66d', 'left'); var ln = T('Cabeza {h} · Tornillo {l}').replace('{h}', T(HN[rule.head])).replace('{l}', T(LN[rule.len]));
      txt(c, ln, 24, 66, Math.max(14, 17 * K), '#fff', 'left'); drawScrew(c, { head: rule.head, len: rule.len, flaw: null }, w - 80 * K, 52, 0.34 * K * 1.1, 0);
      for (var hh = 0; hh < 3; hh++) txt(c, hh < lives ? '❤' : '♡', 24 + hh * 24, 88 + 14 * K - 4, 20, hh < lives ? '#ff453a' : '#ffffff55', 'left');
      txt(c, T('Nivel {n}').replace('{n}', level), w - 24, 38, 13, '#fff', 'right', 0.8);
      /* tornillos */
      fly.forEach(function (o) { var p = Math.min(1, o.t), e = p * p * (3 - 2 * p), tx = o.a ? gb.x + 39 * K : rb.x + 39 * K, ty = o.a ? gb.y + 30 * K : rb.y + 30 * K; drawScrew(c, o.s, o.x0 + (tx - o.x0) * e, o.y0 + (ty - o.y0) * e, K * (1 - e * 0.75), e * (o.a ? -0.6 : 0.6)); });
      if (cur) drawScrew(c, cur.s, pos(cur), cy, K * 1.05, 0);
      /* botones */
      var bhh = Math.max(64, h * 0.12), bt = h - bhh - 10; c.globalAlpha = 0.5 + press[0] * 0.5; c.fillStyle = '#5a1b24'; rr(c, 10, bt, w / 2 - 15, bhh, 18); c.fill(); c.globalAlpha = 0.5 + press[1] * 0.5; c.fillStyle = '#17503a'; rr(c, w / 2 + 5, bt, w / 2 - 15, bhh, 18); c.fill(); c.globalAlpha = 1;
      txt(c, '✖ ' + T('Rechazar'), w / 4, bt + bhh / 2 + 7, 19, '#ffd7d4'); txt(c, '✔ ' + T('Aprobar'), w * 0.75, bt + bhh / 2 + 7, 19, '#d4ffe6');
      pops.forEach(function (p) { txt(c, p.s, w / 2, cy - 100 * K - p.t * 40, 24, p.c, 'center', 1 - p.t / 0.9); });
      if (banner > 0) { c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(0, h * 0.7 - 36, w, 56); txt(c, T('¡Nueva orden!') + '  ' + ln, w / 2, h * 0.7, 18, '#ffe66d', 'center', Math.min(1, banner)); }
      c.restore();
    };
    G._dbg = function () { return { cur: cur ? cur.s : null, age: cur ? cur.age : 0, crossT: crossT, lives: lives, score: score, count: count, level: level }; };
    return G;
  };


  /* ================= JUEGOS DE AGILIDAD MENTAL (tipo entrevista) ================= */
  function ri(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function inR(x, y, r) { return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h; }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function fit(c, s, maxW, size, weight) { do { c.font = (weight || 800) + ' ' + size + 'px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'; size -= 2; } while (c.measureText(s).width > maxW && size > 12); return size + 2; }
  function mindBg(c, w, h, flash, fcol) {
    var g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0d1230'); g.addColorStop(1, '#161d46'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    if (flash > 0) { c.globalAlpha = Math.min(0.28, flash * 1.4); c.fillStyle = fcol; c.fillRect(0, 0, w, h); c.globalAlpha = 1; }
  }
  function timeBar(c, w, left, dur) { var f = clamp01(left / dur); c.fillStyle = 'rgba(255,255,255,.14)'; rr(c, 16, 14, w - 32, 10, 5); c.fill(); c.fillStyle = f < 0.2 ? '#ff453a' : '#7de2ff'; rr(c, 16, 14, Math.max(10, (w - 32) * f), 10, 5); c.fill(); txt(c, Math.ceil(left) + ' s', w - 16, 46, 14, '#fff', 'right', 0.8); }
  function btn(c, r, label, fill, tcol, size, glow) {
    c.save(); if (glow) { c.shadowColor = fill; c.shadowBlur = 16; } c.fillStyle = fill; rr(c, r.x, r.y, r.w, r.h, 18); c.fill(); c.restore();
    if (label != null) { var f = fit(c, String(label), r.w - 20, size || 34); txt(c, String(label), r.x + r.w / 2, r.y + r.h / 2 + f * 0.35, f, tcol || '#fff'); }
  }
  function grid4(E) { var top = E.h * 0.56, hh = (E.h - top - 22) / 2, ww = (E.w - 36 - 12) / 2, R = []; for (var i = 0; i < 4; i++) R.push({ x: 18 + (i % 2) * (ww + 12), y: top + Math.floor(i / 2) * (hh + 12), w: ww, h: hh }); return R; }

  /* ----- análisis de resultados: consejos por habilidad ----- */
  var SK = {
    calc:   { err: 'Cometes errores por apuro: revisa el orden de magnitud antes de responder y practica la descomposición (47 + 38 = 47 + 40 − 2).', slow: 'Gana ritmo con las tablas del 6 al 9 y con el redondeo (49 × 6 = 50 × 6 − 6).' },
    stroop: { err: 'Haz una pausa mental de medio segundo para identificar la regla antes de tocar, y léela en voz baja.', slow: 'Practica ignorando el significado de la palabra: fija la vista en el color y responde por reflejo.', flex: 'Te cuesta cambiar de regla: cuando cambie, repite mentalmente la nueva regla y responde con calma las dos primeras.' },
    series: { err: 'Antes de responder comprueba la regla con todos los términos, no solo con los dos primeros.', slow: 'Calcula siempre las diferencias entre términos; si no ves patrón, prueba las razones (×2, ×3) y los cuadrados.' },
    memory: { err: 'Agrupa los bloques en pares o tríos y recuerda el recorrido como un camino o una figura.', slow: 'Agrupa los bloques en pares o tríos y recuerda el recorrido como un camino o una figura.' },
    hanoi:  { err: 'Piensa por etapas: para mover N discos, lleva primero N−1 a la torre auxiliar. El disco más pequeño siempre se mueve en el mismo sentido.', slow: 'Memoriza el ritmo: el disco pequeño se mueve cada dos jugadas y la otra jugada casi siempre es la única legal.' },
    slide:  { err: 'Ordena primero la fila de arriba y luego la columna izquierda, sin deshacer lo que ya colocaste.', slow: 'Planifica tres movimientos antes de tocar y evita dar vueltas sin avanzar.' },
    trail:  { err: 'Mira la siguiente ficha mientras tocas la actual y confirma si toca número o letra.', slow: 'Haz un barrido visual ordenado y localiza la siguiente ficha antes de mover el dedo.' },
    gonogo: { err: 'Antes de tocar, espera a reconocer la figura: círculo verde es SÍ, cuadrado rojo es NO.', slow: 'Confía en tu primer reconocimiento y toca sin dudar cuando veas el círculo verde.' },
    rotation: { err: 'Gira la figura mentalmente por partes: fija una esquina de referencia y recuerda que un espejo no es lo mismo que una rotación.', slow: 'Compara primero el número de bloques y las esquinas para descartar opciones rápido.' },
    nback:  { err: 'Repite en voz baja la última figura (y en 2-back, las dos últimas) para mantenerlas activas en la mente.', slow: 'Decide con tu primer impulso: si dudas, se acaba el tiempo. Entrena el ritmo con rondas cortas.' }
  };
  function coach(id, r) {
    if (id === 'memory') return r.ok >= 6 ? T('Vas muy bien. Sube la dificultad o reduce el tiempo para seguir mejorando.') : T(SK.memory.err);
    if (id === 'stroop' && r.flex) return T(SK.stroop.flex);
    if (r.n >= 4 && r.acc < 0.8) return T(SK[id].err);
    if (r.n >= 4 && r.speed < 0.5) return T(SK[id].slow);
    return T('Vas muy bien. Sube la dificultad o reduce el tiempo para seguir mejorando.');
  }
  function lineOf(id, r) {
    if (id === 'memory') return T('Secuencia máxima') + ': ' + r.ok;
    if (id === 'hanoi' || id === 'slide') return T('Resueltos') + ': ' + r.ok + ' · ' + T('Eficiencia') + ' ' + Math.round(r.acc * 100) + '%';
    return T('Precisión') + ' ' + Math.round(r.acc * 100) + '% · ' + Math.round(r.rate) + ' ' + T('resp/min');
  }
  function metr(ok, wr, el, targetRate, pct, extra) {
    var n = ok + wr, rate = el > 0 ? n / (el / 60) : 0, o = { pct: pct, ok: ok, wr: wr, n: n, acc: n ? ok / n : 0, rate: rate, speed: clamp01(rate / targetRate), ar: true };
    for (var k in extra) o[k] = extra[k]; return o;
  }
  function good(E, st) { st.flash = 0.18; st.fcol = '#30d158'; }
  function bad(E, st) { st.flash = 0.25; st.fcol = '#ff453a'; try { if (navigator.vibrate) navigator.vibrate(40); } catch (e) { } }

  /* ----- 1) CÁLCULO RELÁMPAGO ----- */
  GAMES.calc = function (E) {
    var G = {}, dur, left, q, score, ok, wr, streak, el, st = { flash: 0, fcol: '#fff' }, R;
    G.resize = function () { R = grid4(E); };
    function lvl() { return Math.min(8, 1 + Math.floor(ok / 4)); }
    function mk() {
      var l = lvl(), k = ri(0, l < 3 ? 1 : l < 6 ? 2 : 3), a, b, c, ans, tx;
      if (k === 0) { a = ri(10 + l * 6, 50 + l * 25); b = ri(6, 30 + l * 8); ans = a + b; tx = a + ' + ' + b; }
      else if (k === 1) { a = ri(30 + l * 8, 100 + l * 18); b = ri(6, Math.min(a - 5, 40 + l * 8)); ans = a - b; tx = a + ' − ' + b; }
      else if (k === 2) { a = ri(3, Math.min(12, 6 + l)); b = ri(3, Math.min(12, 6 + l)); ans = a * b; tx = a + ' × ' + b; }
      else { a = ri(5, 40); b = ri(2, 9); c = ri(2, 9); ans = a + b * c; tx = a + ' + ' + b + ' × ' + c; }
      var pool = [ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10, ans + ri(3, 9), ans - ri(3, 9)].filter(function (v, i, arr) { return v > 0 && v !== ans && arr.indexOf(v) === i; });
      var opts = shuffle(shuffle(pool).slice(0, 3).concat([ans]));
      return { tx: tx, ans: ans, opts: opts };
    }
    G.reset = function () { G.resize(); dur = E.dur || 60; left = dur; score = ok = wr = streak = el = 0; st.flash = 0; q = mk(); E.setScore(0); };
    function pick(i) {
      if (i < 0 || i > 3) return;
      if (q.opts[i] === q.ans) { ok++; streak++; score += 10 + Math.min(10, streak * 2); E.setScore(score); good(E, st); beep(700 + Math.min(streak, 8) * 40, 0.07, 'triangle', 0.05); }
      else { wr++; streak = 0; left -= 3; bad(E, st); beep(160, 0.2, 'sawtooth', 0.05); }
      q = mk();
    }
    G.pointerDown = function (x, y) { for (var i = 0; i < 4; i++) if (inR(x, y, R[i])) { pick(i); return; } };
    G.keyDown = function (k) { pick('1234'.indexOf(k)); };
    G.update = function (dt) { el += dt; left -= dt; if (st.flash > 0) st.flash -= dt; if (left <= 0) { left = 0; E.die(); } };
    G.draw = function () {
      var c = E.ctx, w = E.w, h = E.h; mindBg(c, w, h, st.flash, st.fcol); timeBar(c, w, left, dur);
      txt(c, T('Nivel {n}').replace('{n}', lvl()), 16, 46, 14, '#fff', 'left', 0.8); if (streak >= 3) txt(c, '🔥 x' + streak, w / 2, 46, 15, '#ffe66d');
      var f = fit(c, q.tx, w - 40, Math.min(w * 0.2, 84)); txt(c, q.tx, w / 2, h * 0.3 + f * 0.3, f, '#fff'); txt(c, '= ?', w / 2, h * 0.3 + f * 0.3 + 52, 26, '#7de2ff', 'center', 0.8);
      for (var i = 0; i < 4; i++) btn(c, R[i], q.opts[i], ['#3a4a9e', '#2e7d8f', '#7b3f9e', '#9e5a3a'][i], '#fff', 38);
    };
    G._res = function () { return metr(ok, wr, el, 26, clamp01((ok - wr * 0.5) / (14 * dur / 40)), {}); };
    G._tip = function () { var r = G._res(); return lineOf('calc', r) + '\n' + coach('calc', r); };
    G._dbg = function () { return { q: q, ok: ok, wr: wr, left: left }; };
    return G;
  };

  /* ----- 2) STROOP: atención y flexibilidad ----- */
  GAMES.stroop = function (E) {
    var COL = [{ n: 'ROJO', c: '#ff453a' }, { n: 'AZUL', c: '#0a84ff' }, { n: 'VERDE', c: '#30d158' }, { n: 'AMARILLO', c: '#ffd60a' }];
    var G = {}, dur, left, q, score, ok, wr, streak, n, rule, banner, el, sw, swN, swWr, nN, nWr, st = { flash: 0, fcol: '#fff' }, R;
    G.resize = function () { R = grid4(E); };
    function mk() { var wi = ri(0, 3), ii = rnd() < 0.8 ? (wi + ri(1, 3)) % 4 : wi; return { w: wi, i: ii, ans: rule === 'ink' ? ii : wi }; }
    G.reset = function () { G.resize(); dur = E.dur || 60; left = dur; score = ok = wr = streak = n = el = sw = swN = swWr = nN = nWr = 0; rule = 'ink'; banner = 1.6; st.flash = 0; q = mk(); E.setScore(0); };
    function pick(i) {
      if (i < 0 || i > 3) return;
      var hit = i === q.ans; if (sw > 0) { swN++; if (!hit) swWr++; sw--; } else { nN++; if (!hit) nWr++; }
      if (hit) { ok++; streak++; score += 10 + Math.min(10, streak * 2); E.setScore(score); good(E, st); beep(700 + Math.min(streak, 8) * 40, 0.07, 'triangle', 0.05); }
      else { wr++; streak = 0; left -= 3; bad(E, st); beep(160, 0.2, 'sawtooth', 0.05); }
      n++; if (n % 8 === 0) { rule = rule === 'ink' ? 'word' : 'ink'; sw = 2; banner = 1.6; beep(420, 0.12, 'square', 0.04); } q = mk();
    }
    G.pointerDown = function (x, y) { for (var i = 0; i < 4; i++) if (inR(x, y, R[i])) { pick(i); return; } };
    G.keyDown = function (k) { pick('1234'.indexOf(k)); };
    G.update = function (dt) { el += dt; left -= dt; if (banner > 0) banner -= dt; if (st.flash > 0) st.flash -= dt; if (left <= 0) { left = 0; E.die(); } };
    G.draw = function () {
      var c = E.ctx, w = E.w, h = E.h; mindBg(c, w, h, st.flash, st.fcol); timeBar(c, w, left, dur);
      var rt = rule === 'ink' ? T('Toca el COLOR de la tinta') : T('Toca lo que DICE la palabra');
      c.fillStyle = rule === 'ink' ? 'rgba(125,226,255,.18)' : 'rgba(255,107,214,.2)'; rr(c, 16, h * 0.14, w - 32, 46, 14); c.fill();
      var f0 = fit(c, rt, w - 56, 19, 700); txt(c, rt, w / 2, h * 0.14 + 30, f0, rule === 'ink' ? '#7de2ff' : '#ff9be6', 'center', 1);
      var word = T(COL[q.w].n), f = fit(c, word, w - 40, Math.min(w * 0.2, 86)); txt(c, word, w / 2, h * 0.38, f, COL[q.i].c);
      if (streak >= 3) txt(c, '🔥 x' + streak, w / 2, 46, 15, '#ffe66d');
      for (var i = 0; i < 4; i++) { btn(c, R[i], null, COL[i].c, '#fff', 30, true); txt(c, String(i + 1), R[i].x + 16, R[i].y + 26, 15, '#000', 'left', 0.35); }
      if (banner > 0) txt(c, T('¡Cambió la regla!'), w / 2, h * 0.49, 22, '#ffe66d', 'center', Math.min(1, banner));
    };
    G._res = function () { return metr(ok, wr, el, 26, clamp01((ok - wr * 0.5) / (14 * dur / 40)), { flex: swN >= 3 && swWr / swN - nWr / Math.max(1, nN) > 0.2 }); };
    G._tip = function () { var r = G._res(); return lineOf('stroop', r) + '\n' + coach('stroop', r); };
    G._dbg = function () { return { q: q, ok: ok, wr: wr, rule: rule }; };
    return G;
  };

  /* ----- 3) SERIES LÓGICAS ----- */
  GAMES.series = function (E) {
    var G = {}, dur, left, q, score, ok, wr, streak, el, st = { flash: 0, fcol: '#fff' }, R;
    G.resize = function () { R = grid4(E); };
    function lvl() { return Math.min(8, 1 + Math.floor(ok / 3)); }
    function gen() {
      var l = lvl(), k = ri(0, l < 2 ? 1 : l < 4 ? 3 : l < 6 ? 5 : 6), s = [], a, d, r, i, x, y, ans;
      if (k === 0) { a = ri(1, 30); d = ri(2, 9 + l); for (i = 0; i < 6; i++) s.push(a + d * i); }
      else if (k === 1) { a = ri(1, 4); r = ri(2, 3); for (i = 0; i < 6; i++) s.push(a * Math.pow(r, i)); if (s[5] > 900) s = s.slice(0, 5).concat([s[5]]); }
      else if (k === 2) { a = ri(1, 9); d = ri(1, 3); x = a; for (i = 0; i < 6; i++) { s.push(x); x += d + i; } }
      else if (k === 3) { a = ri(8, 40); var p = ri(4, 10), qq = ri(1, p - 2); x = a; for (i = 0; i < 6; i++) { s.push(x); x += i % 2 ? -qq : p; } }
      else if (k === 4) { a = ri(1, 6); for (i = 0; i < 6; i++) s.push((a + i) * (a + i)); }
      else if (k === 5) { x = ri(1, 5); y = ri(2, 7); s.push(x, y); for (i = 2; i < 6; i++) s.push(s[i - 1] + s[i - 2]); }
      else { a = ri(1, 20); var b = ri(30, 60), d1 = ri(2, 6), d2 = ri(2, 8); s = [a, b, a + d1, b + d2, a + 2 * d1, b + 2 * d2]; }
      ans = s[5]; s = s.slice(0, 5);
      var pool = [ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10, ans + ri(3, 9), ans - ri(3, 9), ans * 2].filter(function (v, j, arr) { return v > 0 && v !== ans && arr.indexOf(v) === j; });
      return { s: s, ans: ans, opts: shuffle(shuffle(pool).slice(0, 3).concat([ans])) };
    }
    G.reset = function () { G.resize(); dur = E.dur || 60; left = dur; score = ok = wr = streak = el = 0; st.flash = 0; q = gen(); E.setScore(0); };
    function pick(i) {
      if (i < 0 || i > 3) return;
      if (q.opts[i] === q.ans) { ok++; streak++; score += 15 + Math.min(10, streak * 2); E.setScore(score); good(E, st); beep(700 + Math.min(streak, 8) * 40, 0.07, 'triangle', 0.05); }
      else { wr++; streak = 0; left -= 3; bad(E, st); beep(160, 0.2, 'sawtooth', 0.05); }
      q = gen();
    }
    G.pointerDown = function (x, y) { for (var i = 0; i < 4; i++) if (inR(x, y, R[i])) { pick(i); return; } };
    G.keyDown = function (k) { pick('1234'.indexOf(k)); };
    G.update = function (dt) { el += dt; left -= dt; if (st.flash > 0) st.flash -= dt; if (left <= 0) { left = 0; E.die(); } };
    G.draw = function () {
      var c = E.ctx, w = E.w, h = E.h; mindBg(c, w, h, st.flash, st.fcol); timeBar(c, w, left, dur);
      txt(c, T('Nivel {n}').replace('{n}', lvl()), 16, 46, 14, '#fff', 'left', 0.8); if (streak >= 3) txt(c, '🔥 x' + streak, w / 2, 46, 15, '#ffe66d');
      txt(c, T('¿Qué número sigue?'), w / 2, h * 0.16, 18, '#7de2ff', 'center', 0.9);
      var line = q.s.join('  ·  ') + '  ·  ?', f = fit(c, line, w - 28, Math.min(w * 0.1, 44)); txt(c, line, w / 2, h * 0.34, f, '#fff');
      for (var i = 0; i < 4; i++) btn(c, R[i], q.opts[i], ['#3a4a9e', '#2e7d8f', '#7b3f9e', '#9e5a3a'][i], '#fff', 38);
    };
    G._res = function () { return metr(ok, wr, el, 15, clamp01((ok - wr * 0.5) / (9 * dur / 40)), {}); };
    G._tip = function () { var r = G._res(); return lineOf('series', r) + '\n' + coach('series', r); };
    G._dbg = function () { return { q: q, ok: ok, wr: wr }; };
    return G;
  };

  /* ----- 4) MEMORIA DE SECUENCIA (bloques de Corsi) ----- */
  GAMES.memory = function (E) {
    var G = {}, dur, left, seq, len, phase, pt, pos, lit, litT, lives, best, score, msg, msgT, st = { flash: 0, fcol: '#fff' }, R;
    G.resize = function () {
      var s = Math.min(E.w - 44, E.h * 0.5) / 3 - 10, ox = (E.w - (s * 3 + 20)) / 2, oy = E.h * 0.26; R = [];
      for (var i = 0; i < 9; i++) R.push({ x: ox + (i % 3) * (s + 10), y: oy + Math.floor(i / 3) * (s + 10), w: s, h: s });
    };
    function newSeq() { seq = []; var last = -1; for (var i = 0; i < len; i++) { var t; do { t = ri(0, 8); } while (t === last); seq.push(t); last = t; } phase = 'wait'; pt = 0.9; pos = 0; lit = -1; }
    G.reset = function () { G.resize(); dur = E.dur || 75; left = dur; len = 3; lives = 2; best = 0; score = 0; msg = ''; msgT = 0; st.flash = 0; litT = 0; newSeq(); E.setScore(0); };
    function tile(i) {
      if (phase !== 'input') return; lit = i; litT = 0.22; beep(300 + i * 70, 0.12, 'triangle', 0.06);
      if (i === seq[pos]) {
        pos++; if (pos === len) { best = Math.max(best, len); score = best * 10; E.setScore(score); good(E, st); msg = T('¡Bien!'); msgT = 1; len++; phase = 'ok'; pt = 0.9; beep(880, 0.15, 'sine', 0.06); }
      } else { lives--; bad(E, st); msg = lives > 0 ? T('Otra vez') : T('Fin'); msgT = 1; phase = 'bad'; pt = 1; beep(150, 0.3, 'sawtooth', 0.05); }
    }
    G.pointerDown = function (x, y) { for (var i = 0; i < 9; i++) if (inR(x, y, R[i])) { tile(i); return; } };
    G.keyDown = function (k) { var i = '123456789'.indexOf(k); if (i > -1) tile(i); };
    G.update = function (dt) {
      left -= dt; if (st.flash > 0) st.flash -= dt; if (msgT > 0) msgT -= dt; if (litT > 0) { litT -= dt; if (litT <= 0) lit = -1; }
      if (left <= 0) { left = 0; E.die(); return; }
      if (phase === 'wait') { pt -= dt; if (pt <= 0) { phase = 'show'; pt = 0; pos = 0; } }
      else if (phase === 'show') { pt += dt; var step = Math.floor(pt / 0.75); if (step >= len) { phase = 'input'; pos = 0; lit = -1; } else { lit = (pt % 0.75) < 0.55 ? seq[step] : -1; } }
      else if (phase === 'ok') { pt -= dt; if (pt <= 0) newSeq(); }
      else if (phase === 'bad') { pt -= dt; if (pt <= 0) { if (lives <= 0) { E.die(); return; } newSeq(); } }
    };
    G.draw = function () {
      var c = E.ctx, w = E.w, h = E.h; mindBg(c, w, h, st.flash, st.fcol); timeBar(c, w, left, dur);
      txt(c, T('Largo') + ': ' + len, 16, 46, 14, '#fff', 'left', 0.85); txt(c, '❤'.repeat(Math.max(0, lives)) || '—', w / 2, 46, 16, '#ff453a');
      txt(c, phase === 'input' ? T('Repite la secuencia') : phase === 'show' ? T('Memoriza el orden') : '', w / 2, h * 0.17, 20, '#7de2ff', 'center', 0.95);
      for (var i = 0; i < 9; i++) {
        var on = lit === i; c.save(); if (on) { c.shadowColor = '#7de2ff'; c.shadowBlur = 24; } c.fillStyle = on ? '#9be7ff' : 'rgba(255,255,255,.1)'; rr(c, R[i].x, R[i].y, R[i].w, R[i].h, 16); c.fill(); c.restore();
      }
      if (msgT > 0) txt(c, msg, w / 2, h * 0.82, 30, '#ffe66d', 'center', Math.min(1, msgT));
    };
    G._res = function () { return { pct: clamp01((best - 2) / 6), ok: best, wr: 0, n: best, acc: 1, rate: 0, speed: 1, ar: false }; };
    G._tip = function () { var r = G._res(); return lineOf('memory', r) + '\n' + coach('memory', r); };
    G._dbg = function () { return { seq: seq, phase: phase, pos: pos, R: R, len: len, best: best }; };
    return G;
  };

  /* ----- 5) N-BACK: memoria de trabajo ----- */
  GAMES.nback = function (E) {
    var SH = [{ k: 0, c: '#ff453a' }, { k: 1, c: '#0a84ff' }, { k: 2, c: '#30d158' }, { k: 3, c: '#ffd60a' }, { k: 4, c: '#bf5af2' }, { k: 5, c: '#ff9f0a' }];
    var G = {}, dur, left, hist, N, cur, tl, free, fb, fbT, score, ok, wr, done, banner, el, st = { flash: 0, fcol: '#fff' }, RS;
    G.resize = function () { var bh = Math.max(80, E.h * 0.16), y = E.h - bh - 22, ww = (E.w - 36 - 12) / 2; RS = [{ x: 18, y: y, w: ww, h: bh }, { x: 18 + ww + 12, y: y, w: ww, h: bh }]; };
    function shape(c, k, cx, cy, r, col) {
      c.fillStyle = col; c.shadowColor = col; c.shadowBlur = 20; c.beginPath();
      if (k === 0) c.arc(cx, cy, r, 0, TAU);
      else if (k === 1) c.rect(cx - r * 0.85, cy - r * 0.85, r * 1.7, r * 1.7);
      else if (k === 2) { c.moveTo(cx, cy - r); c.lineTo(cx + r, cy + r * 0.8); c.lineTo(cx - r, cy + r * 0.8); c.closePath(); }
      else if (k === 3) { for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr2 = i % 2 ? r * 0.45 : r; c.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); } c.closePath(); }
      else if (k === 4) { c.moveTo(cx, cy - r * 1.1); c.lineTo(cx + r * 0.8, cy); c.lineTo(cx, cy + r * 1.1); c.lineTo(cx - r * 0.8, cy); c.closePath(); }
      else { for (var j = 0; j < 6; j++) { var b = j * Math.PI / 3; c.lineTo(cx + Math.cos(b) * r, cy + Math.sin(b) * r); } c.closePath(); }
      c.fill(); c.shadowBlur = 0;
    }
    function next() {
      var base = hist.length >= N ? hist[hist.length - N] : null, s;
      if (base != null && rnd() < 0.35) s = base; else { do { s = ri(0, 5); } while (s === base || (hist.length && s === hist[hist.length - 1] && rnd() < 0.5)); }
      hist.push(s); cur = s; free = hist.length <= N; tl = free ? 1.3 : 3.4; fb = 0;
    }
    G.reset = function () { G.resize(); dur = E.dur || 60; left = dur; hist = []; N = 1; score = ok = wr = done = el = 0; banner = 1.8; st.flash = 0; fbT = 0; E.setScore(0); next(); };
    function answer(same) {
      if (free || fb) return; var truth = hist[hist.length - 1] === hist[hist.length - 1 - N];
      if (same === truth) { ok++; score += 10; E.setScore(score); fb = 1; good(E, st); beep(760, 0.07, 'triangle', 0.05); } else { wr++; fb = -1; bad(E, st); beep(160, 0.2, 'sawtooth', 0.05); }
      fbT = 0.32; done++;
    }
    function advance() {
      if (N === 1 && done >= 12) { N = 2; hist = []; banner = 1.8; beep(420, 0.12, 'square', 0.04); }
      next();
    }
    G.pointerDown = function (x, y) { if (inR(x, y, RS[0])) answer(false); else if (inR(x, y, RS[1])) answer(true); };
    G.keyDown = function (k) { if (k === 'ArrowLeft' || k === '1') answer(false); if (k === 'ArrowRight' || k === '2') answer(true); };
    G.update = function (dt) {
      el += dt; left -= dt; if (banner > 0) banner -= dt; if (st.flash > 0) st.flash -= dt; if (left <= 0) { left = 0; E.die(); return; }
      if (fb) { fbT -= dt; if (fbT <= 0) advance(); return; }
      tl -= dt; if (tl <= 0) { if (free) { advance(); } else { wr++; fb = -1; bad(E, st); fbT = 0.32; done++; } }
    };
    G.draw = function () {
      var c = E.ctx, w = E.w, h = E.h; mindBg(c, w, h, st.flash, st.fcol); timeBar(c, w, left, dur);
      txt(c, N + '-back', 16, 46, 15, '#ffe66d', 'left');
      var q = free ? T('Memoriza esta figura') : N === 1 ? T('¿Es igual a la figura anterior?') : T('¿Es igual a la de hace 2 figuras?'), f = fit(c, q, w - 36, 20, 700); txt(c, q, w / 2, h * 0.17, f, '#7de2ff', 'center', 0.95);
      var sh = SH[cur]; shape(c, sh.k, w / 2, h * 0.4, Math.min(w, h) * 0.17, sh.c);
      if (!free && !fb) { c.fillStyle = 'rgba(255,255,255,.12)'; rr(c, 40, h * 0.62, w - 80, 6, 3); c.fill(); c.fillStyle = '#7de2ff'; rr(c, 40, h * 0.62, Math.max(6, (w - 80) * clamp01(tl / 3.4)), 6, 3); c.fill(); }
      if (fb) txt(c, fb > 0 ? '✔' : '✖', w / 2, h * 0.57, 40, fb > 0 ? '#30d158' : '#ff453a');
      btn(c, RS[0], '≠ ' + T('Diferente'), '#7b2f3a', '#ffd7d4', 22); btn(c, RS[1], '= ' + T('Igual'), '#1f6b46', '#d4ffe6', 22);
      if (banner > 0) txt(c, N === 1 ? T('Nivel 1: compara con la anterior') : T('Nivel 2: compara con la de hace 2'), w / 2, h * 0.52, 18, '#ffe66d', 'center', Math.min(1, banner));
    };
    G._res = function () { return metr(ok, wr, el, 22, clamp01((ok - wr * 0.5) / (0.2 * dur)), {}); };
    G._tip = function () { var r = G._res(); return lineOf('nback', r) + '\n' + coach('nback', r); };
    G._dbg = function () { return { hist: hist, N: N, free: free, fb: fb, ok: ok, wr: wr }; };
    return G;
  };


  /* ----- 6) TORRE DE HANOI: planificación ----- */
  GAMES.hanoi = function (E) {
    var G = {}, dur, left, el, n, pegs, sel, moves, tot, solved, err, pts, effs, firstT, banner, shake, bx, st = { flash: 0, fcol: '#fff' };
    function setup(k) { n = k; pegs = [[], [], []]; for (var i = k - 1; i >= 0; i--) pegs[0].push(i); sel = -1; moves = 0; }
    G.resize = function () { bx = [E.w * 0.18, E.w * 0.5, E.w * 0.82]; };
    G.reset = function () { G.resize(); dur = E.dur || 90; left = dur; el = 0; solved = err = tot = 0; pts = 0; effs = []; firstT = 0; shake = 0; banner = 0; st.flash = 0; setup(3); E.setScore(0); };
    function peg(i) {
      if (i < 0 || i > 2) return;
      if (sel < 0) { if (pegs[i].length) { sel = i; beep(500, 0.05, 'triangle', 0.04); } return; }
      if (i === sel) { sel = -1; return; }
      var d = pegs[sel][pegs[sel].length - 1], to = pegs[i];
      if (!to.length || to[to.length - 1] > d) {
        pegs[sel].pop(); to.push(d); moves++; tot++; sel = -1; beep(420 + d * 60, 0.06, 'triangle', 0.05);
        if (pegs[2].length === n) { var eff = Math.min(1, (Math.pow(2, n) - 1) / moves); effs.push(eff); pts += (n - 2) * eff; solved++; if (!firstT) firstT = el; E.setScore(Math.round(pts * 100)); good(E, st); banner = 1.4; beep(880, 0.2, 'sine', 0.06); setup(Math.min(6, n + 1)); }
      } else { err++; shake = 0.25; bad(E, st); beep(150, 0.2, 'sawtooth', 0.05); sel = -1; }
    }
    G.pointerDown = function (x) { peg(x < E.w / 3 ? 0 : x < E.w * 2 / 3 ? 1 : 2); };
    G.keyDown = function (k) { peg('123'.indexOf(k)); };
    G.update = function (dt) { el += dt; left -= dt; if (shake > 0) shake -= dt; if (banner > 0) banner -= dt; if (st.flash > 0) st.flash -= dt; if (left <= 0) { left = 0; E.die(); } };
    G.draw = function () {
      var c = E.ctx, w = E.w, h = E.h, y0 = h * 0.66, dh = Math.min(30, h * 0.05), rod = (n + 1.6) * dh; mindBg(c, w, h, st.flash, st.fcol); timeBar(c, w, left, dur);
      c.save(); if (shake > 0) c.translate((rnd() - 0.5) * 8, 0);
      txt(c, T('Discos') + ': ' + n + '  ·  ' + T('Movimientos') + ': ' + moves + ' (' + T('mín.') + ' ' + (Math.pow(2, n) - 1) + ')', w / 2, h * 0.16, 15, '#7de2ff', 'center', 0.95);
      c.fillStyle = '#2b3568'; rr(c, 14, y0, w - 28, 14, 7); c.fill();
      for (var i = 0; i < 3; i++) {
        c.fillStyle = sel === i ? '#7de2ff' : '#4a5690'; rr(c, bx[i] - 5, y0 - rod, 10, rod, 5); c.fill();
        if (i === 2) txt(c, '★ ' + T('Meta'), bx[i], y0 - rod - 10, 13, '#ffe66d', 'center', 0.9);
        txt(c, String(i + 1), bx[i], y0 + 36, 14, '#fff', 'center', 0.5);
        pegs[i].forEach(function (d, j) {
          var wd = w * 0.09 + (w * 0.2) * (n > 1 ? d / (n - 1) : 1), lift = sel === i && j === pegs[i].length - 1, y = lift ? y0 - rod - dh * 1.2 : y0 - (j + 1) * dh;
          c.save(); if (lift) { c.shadowColor = '#7de2ff'; c.shadowBlur = 16; } c.fillStyle = 'hsl(' + ((d * 48 + 190) % 360) + ',80%,58%)'; rr(c, bx[i] - wd / 2, y, wd, dh - 3, 7); c.fill(); c.restore();
          c.fillStyle = 'rgba(255,255,255,.28)'; rr(c, bx[i] - wd / 2 + 4, y + 2, wd - 8, 5, 3); c.fill();
        });
      }
      c.restore();
      txt(c, T('Mueve toda la torre al poste ★'), w / 2, h * 0.86, 15, '#c7cde8', 'center', 0.85);
      if (banner > 0) txt(c, T('¡Torre resuelta!'), w / 2, h * 0.27, 28, '#ffe66d', 'center', Math.min(1, banner));
    };
    G._res = function () {
      var eff = effs.length ? effs.reduce(function (a, b) { return a + b; }, 0) / effs.length : 0, sp = solved ? clamp01(1.25 - firstT / (dur * 0.8)) : 0;
      return { pct: clamp01(pts / (2.2 * dur / 40)), ok: solved, wr: err, n: tot, acc: eff, rate: el > 0 ? tot / (el / 60) : 0, speed: sp, ar: true };
    };
    G._tip = function () { var r = G._res(); return lineOf('hanoi', r) + '\n' + coach('hanoi', r); };
    G._dbg = function () { return { n: n, pegs: pegs, sel: sel, solved: solved, err: err, moves: moves }; };
    return G;
  };

  /* ----- 7) PUZZLE DESLIZANTE 3×3: planificación y visión espacial ----- */
  GAMES.slide = function (E) {
    var GOAL = [1, 2, 3, 4, 5, 6, 7, 8, 0], G = {}, dur, left, el, b, opt, moves, tot, solved, effs, level, size, ox, oy, banner, sol, st = { flash: 0, fcol: '#fff' };
    function nbrs(z) { var r = (z / 3) | 0, c = z % 3, o = []; if (r > 0) o.push(z - 3); if (r < 2) o.push(z + 3); if (c > 0) o.push(z - 1); if (c < 2) o.push(z + 1); return o; }
    function done(a) { for (var i = 0; i < 9; i++) if (a[i] !== GOAL[i]) return false; return true; }
    function manh(a) { var d = 0; for (var i = 0; i < 9; i++) { var v = a[i]; if (v) d += Math.abs(((v - 1) / 3 | 0) - ((i / 3) | 0)) + Math.abs((v - 1) % 3 - i % 3); } return d; }
    function solve(start) {            /* IDA* con distancia Manhattan: devuelve la lista de casillas a tocar */
      var a = start.slice(), path = [], nodes = 0, LIM = 400000;
      function dfs(g, bound, z, prev) {
        var f = g + manh(a); if (f > bound) return f; if (done(a)) return -1; if (++nodes > LIM) return 999; var mn = 1e9, nb = nbrs(z);
        for (var i = 0; i < nb.length; i++) { var m = nb[i]; if (m === prev) continue; a[z] = a[m]; a[m] = 0; path.push(m); var t = dfs(g + 1, bound, m, z); if (t === -1) return -1; if (t < mn) mn = t; path.pop(); a[m] = a[z]; a[z] = 0; }
        return mn;
      }
      var bound = manh(a), z = a.indexOf(0);
      for (var k = 0; k < 40; k++) { var t = dfs(0, bound, z, -1); if (t === -1) return path.slice(); if (t >= 999 || t === 1e9) break; bound = t; }
      return null;
    }
    function scramble() {
      var k = Math.min(30, 10 + level * 3), z, prev, i, nb, m;
      do { b = GOAL.slice(); z = 8; prev = -1; for (i = 0; i < k; i++) { nb = nbrs(z).filter(function (v) { return v !== prev; }); m = nb[Math.floor(rnd() * nb.length)]; b[z] = b[m]; b[m] = 0; prev = z; z = m; } } while (done(b));
      sol = solve(b); opt = sol ? sol.length : manh(b); moves = 0;
    }
    G.resize = function () { size = Math.min(E.w - 40, E.h * 0.5); ox = (E.w - size) / 2; oy = E.h * 0.24; };
    G.reset = function () { G.resize(); dur = E.dur || 90; left = dur; el = 0; solved = tot = 0; effs = []; level = 1; banner = 0; st.flash = 0; scramble(); E.setScore(0); };
    function tile(i) {
      if (i < 0 || i > 8 || b[i] === 0) return; var z = b.indexOf(0); if (nbrs(z).indexOf(i) < 0) { bad(E, st); return; }
      b[z] = b[i]; b[i] = 0; moves++; tot++; beep(380 + b[z] * 25, 0.05, 'triangle', 0.045);
      if (done(b)) { var eff = Math.min(1, opt / moves); effs.push(eff); solved++; level++; E.setScore(solved * 100 + Math.round(eff * 50)); good(E, st); banner = 1.4; beep(880, 0.2, 'sine', 0.06); scramble(); }
    }
    G.pointerDown = function (x, y) { var s3 = size / 3, c = Math.floor((x - ox) / s3), r = Math.floor((y - oy) / s3); if (c >= 0 && c < 3 && r >= 0 && r < 3) tile(r * 3 + c); };
    G.keyDown = function (k) { var z = b.indexOf(0), r = (z / 3) | 0, c = z % 3, t = -1; if (k === 'ArrowLeft' && c < 2) t = z + 1; else if (k === 'ArrowRight' && c > 0) t = z - 1; else if (k === 'ArrowUp' && r < 2) t = z + 3; else if (k === 'ArrowDown' && r > 0) t = z - 3; if (t > -1) tile(t); };
    G.update = function (dt) { el += dt; left -= dt; if (banner > 0) banner -= dt; if (st.flash > 0) st.flash -= dt; if (left <= 0) { left = 0; E.die(); } };
    G.draw = function () {
      var c = E.ctx, w = E.w, h = E.h, s3 = size / 3; mindBg(c, w, h, st.flash, st.fcol); timeBar(c, w, left, dur);
      txt(c, T('Movimientos') + ': ' + moves + '  ·  ' + T('mín.') + ' ' + opt, w / 2, h * 0.16, 15, '#7de2ff', 'center', 0.95);
      c.fillStyle = '#222b5c'; rr(c, ox - 8, oy - 8, size + 16, size + 16, 20); c.fill();
      for (var i = 0; i < 9; i++) {
        if (!b[i]) continue; var x = ox + (i % 3) * s3 + 4, y = oy + ((i / 3) | 0) * s3 + 4; c.fillStyle = 'hsl(' + (b[i] * 40 + 200) % 360 + ',70%,55%)'; rr(c, x, y, s3 - 8, s3 - 8, 14); c.fill();
        c.fillStyle = 'rgba(255,255,255,.22)'; rr(c, x + 5, y + 4, s3 - 18, 8, 4); c.fill(); txt(c, String(b[i]), x + (s3 - 8) / 2, y + (s3 - 8) / 2 + s3 * 0.12, s3 * 0.4, '#fff');
      }
      txt(c, T('Ordena las fichas del 1 al 8'), w / 2, oy + size + 44, 15, '#c7cde8', 'center', 0.85);
      if (banner > 0) txt(c, T('¡Resuelto!'), w / 2, h * 0.2, 28, '#ffe66d', 'center', Math.min(1, banner));
    };
    G._res = function () {
      var eff = effs.length ? effs.reduce(function (a, b2) { return a + b2; }, 0) / effs.length : 0;
      return { pct: clamp01(solved * eff / (1.6 * dur / 50)), ok: solved, wr: Math.max(0, tot - effs.length), n: tot, acc: eff, rate: el > 0 ? tot / (el / 60) : 0, speed: clamp01(solved / (dur / 25)), ar: true };
    };
    G._tip = function () { var r = G._res(); return lineOf('slide', r) + '\n' + coach('slide', r); };
    G._dbg = function () { return { sol: sol, b: b, opt: opt, solved: solved, moves: moves }; };
    return G;
  };

  /* ----- 8) SENDERO 1‑A‑2‑B: flexibilidad y búsqueda visual ----- */
  GAMES.trail = function (E) {
    var G = {}, dur, left, el, nodes, nx, rounds, hits, errs, flashN, banner, st = { flash: 0, fcol: '#fff' }, LAB = ['1', 'A', '2', 'B', '3', 'C', '4', 'D', '5', 'E', '6', 'F'];
    function layout() {
      var r = Math.max(20, Math.min(E.w, E.h) * 0.058), top = E.h * 0.15 + r, bot = E.h - r - 14, pts = [], tries = 0;
      while (pts.length < 12 && tries < 4000) { tries++; var x = r + 10 + rnd() * (E.w - 2 * r - 20), y = top + rnd() * (bot - top); if (pts.every(function (p) { return Math.hypot(p.x - x, p.y - y) > r * 2.5; })) pts.push({ x: x, y: y }); }
      for (var i = 0; pts.length < 12; i++) pts.push({ x: r + 10 + (i % 4) * (E.w - 2 * r - 20) / 3, y: top + Math.floor(i / 4) * (bot - top) / 2 });
      nodes = pts.map(function (p, i) { return { x: p.x, y: p.y, r: r, l: LAB[i], done: false }; }); nx = 0;
    }
    G.resize = function () { layout(); };
    G.reset = function () { dur = E.dur || 60; left = dur; el = 0; rounds = hits = errs = 0; flashN = -1; banner = 0; st.flash = 0; layout(); E.setScore(0); };
    G.pointerDown = function (x, y) {
      for (var i = 0; i < nodes.length; i++) { var n = nodes[i]; if (!n.done && Math.hypot(n.x - x, n.y - y) <= n.r + 8) {
        if (i === nx) { n.done = true; nx++; hits++; E.setScore(hits * 10 + rounds * 20); beep(500 + nx * 40, 0.05, 'triangle', 0.05); if (nx === 12) { rounds++; banner = 1; good(E, st); beep(880, 0.15, 'sine', 0.06); layout(); } }
        else { errs++; flashN = i; st.flash = 0.2; st.fcol = '#ff453a'; left -= 1; beep(160, 0.15, 'sawtooth', 0.05); try { if (navigator.vibrate) navigator.vibrate(30); } catch (e) { } }
        return;
      } }
    };
    G.update = function (dt) { el += dt; left -= dt; if (banner > 0) banner -= dt; if (st.flash > 0) st.flash -= dt; if (left <= 0) { left = 0; E.die(); } };
    G.draw = function () {
      var c = E.ctx, w = E.w, h = E.h; mindBg(c, w, h, st.flash, st.fcol); timeBar(c, w, left, dur);
      txt(c, T('Toca en orden: 1 · A · 2 · B…') + '   ' + nx + '/12', w / 2, h * 0.115, 15, '#7de2ff', 'center', 0.95);
      c.strokeStyle = 'rgba(125,226,255,.5)'; c.lineWidth = 3; c.beginPath(); for (var i = 0; i < nx; i++) { if (i) c.lineTo(nodes[i].x, nodes[i].y); else c.moveTo(nodes[i].x, nodes[i].y); } c.stroke();
      nodes.forEach(function (n, i) {
        var isL = isNaN(+n.l); c.save(); if (n.done) { c.globalAlpha = 0.45; } c.fillStyle = isL ? '#7b3f9e' : '#2e7d8f'; if (flashN === i && st.flash > 0) c.fillStyle = '#9e2a2a'; c.beginPath(); c.arc(n.x, n.y, n.r, 0, TAU); c.fill(); c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 2; c.stroke(); c.restore();
        txt(c, n.l, n.x, n.y + n.r * 0.35, n.r * 0.95, '#fff', 'center', n.done ? 0.5 : 1);
      });
      if (banner > 0) txt(c, T('¡Ronda completa!'), w / 2, h * 0.5, 30, '#ffe66d', 'center', Math.min(1, banner));
    };
    G._res = function () { return metr(hits, errs, el, 40, clamp01((hits - errs * 0.8) / (30 * dur / 40)), {}); };
    G._tip = function () { var r = G._res(); return lineOf('trail', r) + '\n' + coach('trail', r); };
    G._dbg = function () { return { nodes: nodes, nx: nx, rounds: rounds, hits: hits, errs: errs }; };
    return G;
  };

  /* ----- 9) CONTROL DE IMPULSOS (go / no-go) ----- */
  GAMES.gonogo = function (E) {
    var G = {}, dur, left, el, phase, pt, kind, shown, resp, rts, okN, wrN, miss, fa, rt0, st = { flash: 0, fcol: '#fff' }, expo;
    function next() { phase = 'gap'; pt = 0.45 + rnd() * 0.5; }
    G.reset = function () { dur = E.dur || 45; left = dur; el = 0; rts = []; okN = wrN = miss = fa = 0; expo = 0.95; st.flash = 0; resp = false; kind = 'go'; next(); E.setScore(0); };
    function tap() {
      if (phase !== 'show' || resp) return; resp = true;
      if (kind === 'go') { okN++; rts.push(el - rt0); E.setScore(okN * 10); good(E, st); beep(760, 0.06, 'triangle', 0.05); } else { wrN++; fa++; left -= 2; bad(E, st); beep(150, 0.25, 'sawtooth', 0.05); }
    }
    G.pointerDown = function () { tap(); }; G.keyDown = function (k) { if (k === ' ' || k === 'Enter' || k === 'ArrowDown') tap(); };
    G.update = function (dt) {
      el += dt; left -= dt; if (st.flash > 0) st.flash -= dt; if (left <= 0) { left = 0; E.die(); return; }
      pt -= dt;
      if (phase === 'gap' && pt <= 0) { phase = 'show'; kind = rnd() < 0.68 ? 'go' : 'nogo'; pt = expo; resp = false; rt0 = el; }
      else if (phase === 'show' && pt <= 0) { if (kind === 'go' && !resp) { wrN++; miss++; st.flash = 0.2; st.fcol = '#ff9f0a'; } else if (kind === 'nogo' && !resp) { okN++; E.setScore(okN * 10); } expo = Math.max(0.6, expo - 0.012); next(); }
    };
    G.draw = function () {
      var c = E.ctx, w = E.w, h = E.h; mindBg(c, w, h, st.flash, st.fcol); timeBar(c, w, left, dur);
      txt(c, T('Círculo verde: TOCA · Cuadrado rojo: NO TOQUES'), w / 2, h * 0.14, 15, '#7de2ff', 'center', 0.95);
      var s = Math.min(w, h) * 0.2, cx = w / 2, cy = h * 0.42;
      if (phase === 'show') { c.save(); c.shadowBlur = 26; if (kind === 'go') { c.shadowColor = '#30d158'; c.fillStyle = '#30d158'; c.beginPath(); c.arc(cx, cy, s, 0, TAU); c.fill(); } else { c.shadowColor = '#ff453a'; c.fillStyle = '#ff453a'; rr(c, cx - s, cy - s, s * 2, s * 2, 16); c.fill(); } c.restore(); }
      else { c.strokeStyle = 'rgba(255,255,255,.18)'; c.lineWidth = 3; c.beginPath(); c.arc(cx, cy, s * 0.15, 0, TAU); c.stroke(); }
      c.fillStyle = 'rgba(255,255,255,.1)'; rr(c, 24, h * 0.7, w - 48, h * 0.2, 24); c.fill(); txt(c, T('TOCA'), w / 2, h * 0.8 + 12, 38, '#fff', 'center', 0.8);
    };
    G._res = function () {
      var avg = rts.length ? rts.reduce(function (a, b2) { return a + b2; }, 0) / rts.length : 1, n = okN + wrN;
      return { pct: clamp01((okN - wrN * 0.8) / (0.55 * dur)), ok: okN, wr: wrN, n: n, acc: n ? okN / n : 0, rate: el > 0 ? n / (el / 60) : 0, speed: clamp01((0.9 - avg) / 0.45), rt: avg, miss: miss, fa: fa, ar: true };
    };
    G._tip = function () { var r = G._res(); return lineOf('gonogo', r) + (r.rt < 1 ? ' · ' + Math.round(r.rt * 1000) + ' ms' : '') + '\n' + coach('gonogo', r); };
    G._dbg = function () { return { phase: phase, kind: kind, resp: resp, since: el - rt0 }; };
    return G;
  };

  /* ----- 10) ROTACIÓN MENTAL: razonamiento visuoespacial ----- */
  GAMES.rotation = function (E) {
    var G = {}, dur, left, el, q, ok, wr, streak, st = { flash: 0, fcol: '#fff' }, R;
    var norm = function (c) { var mx = 1e9, my = 1e9; c.forEach(function (p) { mx = Math.min(mx, p[0]); my = Math.min(my, p[1]); }); return c.map(function (p) { return [p[0] - mx, p[1] - my]; }); };
    var rot = function (c) { return norm(c.map(function (p) { return [-p[1], p[0]]; })); }, mir = function (c) { return norm(c.map(function (p) { return [-p[0], p[1]]; })); };
    var key = function (c) { return c.map(function (p) { return p[0] + ',' + p[1]; }).sort().join(';'); };
    var canon = function (c) { var k = [], cur = c; for (var i = 0; i < 4; i++) { k.push(key(cur)); cur = rot(cur); } return k.sort()[0]; };
    function conn(c) { var seen = [c[0]], q2 = [c[0]]; while (q2.length) { var p = q2.pop(); c.forEach(function (o) { if (Math.abs(o[0] - p[0]) + Math.abs(o[1] - p[1]) === 1 && seen.indexOf(o) < 0) { seen.push(o); q2.push(o); } }); } return seen.length === c.length; }
    function shape(n) { var c = [[0, 0]], D = [[1, 0], [-1, 0], [0, 1], [0, -1]]; while (c.length < n) { var b = c[Math.floor(rnd() * c.length)], d = D[Math.floor(rnd() * 4)], p = [b[0] + d[0], b[1] + d[1]]; if (!c.some(function (o) { return o[0] === p[0] && o[1] === p[1]; })) c.push(p); } return norm(c); }
    function modify(c) { var D = [[1, 0], [-1, 0], [0, 1], [0, -1]]; for (var t = 0; t < 80; t++) { var i = Math.floor(rnd() * c.length), rest = c.filter(function (_, j) { return j !== i; }), b = rest[Math.floor(rnd() * rest.length)], d = D[Math.floor(rnd() * 4)], p = [b[0] + d[0], b[1] + d[1]]; if (rest.some(function (o) { return o[0] === p[0] && o[1] === p[1]; })) continue; var nc = norm(rest.concat([p])); if (conn(nc)) return nc; } return null; }
    function spin(c) { var k = ri(1, 3); for (var i = 0; i < k; i++) c = rot(c); return c; }
    function lvl() { return Math.min(5, 1 + Math.floor(ok / 3)); }
    function mk() {
      var base, n = 4 + lvl(); do { base = shape(n); } while (canon(base) === canon(mir(base)));
      var cor = spin(base), used = {}, ds = []; used[canon(base)] = 1; var m = spin(mir(base)); ds.push(m); used[canon(m)] = 1;
      for (var t = 0; ds.length < 3 && t < 40; t++) { var mo = modify(base); if (!mo) continue; var k2 = canon(mo); if (used[k2]) continue; used[k2] = 1; ds.push(spin(mo)); }
      while (ds.length < 3) ds.push(spin(shape(n)));
      var all = shuffle(ds.map(function (d) { return { c: d, ok: false }; }).concat([{ c: cor, ok: true }]));
      return { base: base, opts: all, ans: all.findIndex(function (o) { return o.ok; }) };
    }
    G.resize = function () { R = grid4(E); };
    G.reset = function () { G.resize(); dur = E.dur || 60; left = dur; el = 0; ok = wr = streak = 0; st.flash = 0; q = mk(); E.setScore(0); };
    function pick(i) {
      if (i < 0 || i > 3) return;
      if (i === q.ans) { ok++; streak++; E.setScore(ok * 15 + Math.min(10, streak * 2) * ok); good(E, st); beep(700 + Math.min(streak, 8) * 40, 0.07, 'triangle', 0.05); } else { wr++; streak = 0; left -= 3; bad(E, st); beep(160, 0.2, 'sawtooth', 0.05); }
      q = mk();
    }
    G.pointerDown = function (x, y) { for (var i = 0; i < 4; i++) if (inR(x, y, R[i])) { pick(i); return; } };
    G.keyDown = function (k) { pick('1234'.indexOf(k)); };
    G.update = function (dt) { el += dt; left -= dt; if (st.flash > 0) st.flash -= dt; if (left <= 0) { left = 0; E.die(); } };
    function drawShape(c, cells, rect, col) {
      var bw = 0, bh = 0; cells.forEach(function (p) { bw = Math.max(bw, p[0] + 1); bh = Math.max(bh, p[1] + 1); });
      var cs = Math.min(rect.w * 0.8 / bw, rect.h * 0.8 / bh, 46), ox = rect.x + (rect.w - bw * cs) / 2, oy = rect.y + (rect.h - bh * cs) / 2;
      cells.forEach(function (p) { c.fillStyle = col; rr(c, ox + p[0] * cs + 1.5, oy + p[1] * cs + 1.5, cs - 3, cs - 3, 5); c.fill(); });
    }
    G.draw = function () {
      var c = E.ctx, w = E.w, h = E.h; mindBg(c, w, h, st.flash, st.fcol); timeBar(c, w, left, dur);
      txt(c, T('Nivel {n}').replace('{n}', lvl()), 16, 46, 14, '#fff', 'left', 0.8);
      txt(c, T('¿Cuál es la MISMA figura girada? (no su espejo)'), w / 2, h * 0.14, 16, '#7de2ff', 'center', 0.95);
      c.fillStyle = 'rgba(255,255,255,.08)'; rr(c, w * 0.25, h * 0.18, w * 0.5, h * 0.3, 22); c.fill(); drawShape(c, q.base, { x: w * 0.25, y: h * 0.18, w: w * 0.5, h: h * 0.3 }, '#ffe66d');
      for (var i = 0; i < 4; i++) { btn(c, R[i], null, '#2a3380', '#fff', 30); drawShape(c, q.opts[i].c, R[i], '#9be7ff'); txt(c, String(i + 1), R[i].x + 16, R[i].y + 24, 14, '#fff', 'left', 0.5); }
    };
    G._res = function () { return metr(ok, wr, el, 14, clamp01((ok - wr * 0.5) / (9 * dur / 40)), {}); };
    G._tip = function () { var r = G._res(); return lineOf('rotation', r) + '\n' + coach('rotation', r); };
    G._dbg = function () { return { rotAns: q.ans, ok: ok, wr: wr }; };
    return G;
  };

  /* ----- RETO DE ENTREVISTA: perfil con gráfica radar, análisis, plan y exportación ----- */
  GAMES.interview = function (E) {
    var TESTS = {
      calc: ['Cálculo mental', 'Resuelve operaciones lo más rápido que puedas. Cada error te quita 3 segundos.', 40], stroop: ['Atención y flexibilidad', 'Toca el color de la tinta o lo que dice la palabra. La regla cambia cada 8 respuestas.', 40],
      series: ['Razonamiento lógico', 'Descubre la regla de cada serie y elige el número que sigue.', 40], memory: ['Memoria visual', 'Mira el orden en que se iluminan los bloques y repítelo. Cada acierto alarga la secuencia.', 60],
      nback: ['Memoria de trabajo', 'Di si la figura es igual a la anterior (y luego a la de hace 2).', 40], hanoi: ['Planificación: Torre de Hanoi', 'Pasa toda la torre al poste ★ con el menor número de movimientos. Nunca pongas un disco grande sobre uno pequeño.', 50],
      slide: ['Planificación: puzzle deslizante', 'Ordena las fichas del 1 al 8 deslizándolas hacia el hueco, con el menor número de movimientos.', 50], trail: ['Flexibilidad: sendero 1‑A‑2‑B', 'Toca en orden alterno: 1, A, 2, B, 3, C… lo más rápido que puedas, sin errores.', 40],
      gonogo: ['Control de impulsos', 'Toca cuando veas el círculo verde. Si aparece el cuadrado rojo, no toques.', 35], rotation: ['Rotación mental', 'Encuentra la figura que es la misma girada. Ojo: el espejo es una figura distinta.', 40]
    };
    var MODES = { quick: ['calc', 'series', 'stroop', 'memory', 'hanoi', 'rotation'], full: ['calc', 'series', 'stroop', 'gonogo', 'memory', 'nback', 'hanoi', 'slide', 'trail', 'rotation'] };
    var COMP = [['num', 'Numérico', ['calc']], ['logic', 'Lógica', ['series']], ['att', 'Atención', ['stroop', 'gonogo']], ['mem', 'Memoria', ['memory', 'nback']], ['plan', 'Planificación', ['hanoi', 'slide']], ['vis', 'Visuoespacial', ['rotation', 'trail']]];
    var CTX = { num: 'resolver problemas numéricos con rapidez', logic: 'detectar patrones y razonar con lógica', att: 'mantener la concentración, controlar impulsos y adaptarte a cambios de reglas', mem: 'recordar instrucciones, nombres y secuencias y seguir varias cosas a la vez', plan: 'planificar pasos y resolver problemas por etapas', vis: 'interpretar planos, mapas y diagramas y cambiar de tarea con rapidez' };
    var TYPES = { agil: ['Ágil y preciso', 'Resuelves rápido y casi sin errores. Mantén el nivel subiendo la dificultad y practicando bajo presión.'], preciso: ['Preciso y reflexivo', 'Prefieres asegurar la respuesta. Tu punto de mejora es el ritmo: practica con tiempo límite para ganar velocidad sin perder precisión.'],
      veloz: ['Veloz e intuitivo', 'Respondes rápido, pero cometes errores. Frena un instante para verificar antes de contestar: en una entrevista pesa más acertar que ser el primero.'], desarrollo: ['En desarrollo', 'Todavía hay mucho por ganar: entrena unos minutos al día y verás mejoras rápidas.'], poco: ['Pocos datos', 'Respondiste muy pocas preguntas para sacar conclusiones fiables. Repite el reto con calma y vuelve a revisar tu perfil.'] };
    var G = { endInteractive: true }, ORDER, mode, idx, inner, ie, phase, res, total, tt, page, hist, prevRec, A, comps, sw0, toast, toastT, HK = 'gm-interview-hist2';
    function mkEnv(dur) { ie = Object.create(E); ie.dur = DBGD || dur; ie.setScore = function () { }; ie.die = function () { res[ORDER[idx]] = inner._res(); idx++; inner = null; phase = idx >= ORDER.length ? 'report' : 'intro'; tt = 0; if (phase === 'report') finish(); }; return ie; }
    function label(p) { return p >= 0.8 ? 'Excelente' : p >= 0.6 ? 'Muy bien' : p >= 0.4 ? 'Bien' : 'A practicar'; }
    function col(p) { return p >= 0.6 ? '#30d158' : p >= 0.4 ? '#ffe66d' : '#ff9f0a'; }
    function loadHist() { try { var h = JSON.parse(localStorage.getItem(HK) || '[]'); return Array.isArray(h) ? h : []; } catch (e) { return []; } }
    function compute() {
      comps = COMP.map(function (c) { var v = c[2].filter(function (id) { return res[id]; }).map(function (id) { return res[id].pct; }); return { id: c[0], name: c[1], tests: c[2], pct: v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : 0, has: v.length > 0 }; });
      var present = comps.filter(function (c) { return c.has; }); total = Math.round(present.reduce(function (a, c) { return a + c.pct; }, 0) / Math.max(1, present.length) * 100);
      var ids = ORDER.filter(function (id) { return res[id] && res[id].ar; }), nS = 0, aw = 0, sp = 0; ids.forEach(function (id) { var r = res[id]; nS += r.n; aw += r.acc * r.n; sp += r.speed; });
      var acc = nS ? aw / nS : 0, speed = ids.length ? sp / ids.length : 0, type = nS < 14 ? 'poco' : acc >= 0.85 ? (speed >= 0.6 ? 'agil' : 'preciso') : (speed >= 0.6 ? 'veloz' : 'desarrollo');
      var rk = present.slice().sort(function (a, b) { return b.pct - a.pct; });
      A = { acc: acc, speed: speed, type: type, top: rk.slice(0, 2), low: rk.slice(-2).reverse() };
    }
    function finish() {
      compute(); var h = loadHist(), same = h.filter(function (r) { return r.mode === mode; }); prevRec = same.length ? same[same.length - 1] : null;
      var rec = { t: Date.now(), mode: mode, total: total, c: {} }; comps.forEach(function (c) { rec.c[c.id] = Math.round(c.pct * 100); });
      h.push(rec); h = h.slice(-16); try { localStorage.setItem(HK, JSON.stringify(h)); } catch (e) { } hist = h.filter(function (r) { return r.mode === mode; }); page = 0;
      E.setScore(total); beep(660, 0.12, 'triangle', 0.05); setTimeout(function () { beep(990, 0.2, 'triangle', 0.05); }, 120); E.die(true);
    }
    G.resize = function () { if (inner && inner.resize) inner.resize(); };
    G.reset = function () { ORDER = null; mode = null; idx = 0; inner = null; phase = 'menu'; res = {}; total = 0; tt = 0; page = 0; A = null; toastT = 0; E.setScore(0); };
    function startInner() { var id = ORDER[idx]; inner = GAMES[id](mkEnv(TESTS[id][2])); inner.reset(); phase = 'play'; }
    var CH = function () { var n = 5, g = 6, cw = (E.w - 24 - g * (n - 1)) / n, r = []; for (var i = 0; i < n; i++) r.push({ x: 12 + i * (cw + g), y: 10, w: cw, h: 28 }); return r; };
    var MB = function () { var w = E.w, h = E.h, bh = Math.min(120, h * 0.17); return [{ x: 20, y: h * 0.44, w: w - 40, h: bh }, { x: 20, y: h * 0.44 + bh + 16, w: w - 40, h: bh }]; };
    function exportBtns() { var w = E.w, h = E.h, y = 130, bh = 54, arr = [['copy', '📋 ' + T('Copiar texto')], ['png', '🖼 ' + T('Descargar imagen')], ['txt', '📄 ' + T('Descargar texto')]]; if (navigator.share) arr.push(['share', '📤 ' + T('Compartir')]); return arr.map(function (a, i) { return { id: a[0], label: a[1], x: 24, y: y + i * (bh + 12), w: w - 48, h: bh }; }); }
    G.pointerDown = function (x, y, id) {
      if (phase === 'menu' && tt > 0.3) { var m = MB(); for (var i = 0; i < 2; i++) if (inR(x, y, m[i])) { mode = i ? 'full' : 'quick'; ORDER = MODES[mode]; idx = 0; phase = 'intro'; tt = 0; return; } }
      else if (phase === 'intro' && tt > 0.35) startInner();
      else if (phase === 'play' && inner && inner.pointerDown) inner.pointerDown(x, y, id);
      else if (phase === 'report') { var r = CH(); for (var j = 0; j < 5; j++) if (inR(x, y, r[j])) { page = j; return; } if (page === 4) { exportBtns().forEach(function (b) { if (inR(x, y, b)) doExport(b.id); }); return; } sw0 = x; }
    };
    G.pointerUp = function (x, y, id) {
      if (phase === 'play' && inner && inner.pointerUp) inner.pointerUp(x, y, id);
      else if (phase === 'report' && sw0 != null) { var dx = x - sw0; if (dx < -50) page = Math.min(4, page + 1); else if (dx > 50) page = Math.max(0, page - 1); sw0 = null; }
    };
    G.keyDown = function (k) {
      if (phase === 'menu' && tt > 0.3) { if (k === '1' || k === 'q') G.pointerDown(30, MB()[0].y + 10); else if (k === '2' || k === 'f') G.pointerDown(30, MB()[1].y + 10); }
      else if (phase === 'intro' && tt > 0.35 && (k === ' ' || k === 'Enter')) startInner();
      else if (phase === 'play' && inner && inner.keyDown) inner.keyDown(k);
      else if (phase === 'report') { if (k === 'ArrowRight') page = Math.min(4, page + 1); else if (k === 'ArrowLeft') page = Math.max(0, page - 1); else if ('12345'.indexOf(k) > -1 && k) page = +k - 1; }
    };
    G.update = function (dt) { tt += dt; if (toastT > 0) toastT -= dt; if (phase === 'play' && inner) inner.update(dt); };

    /* ---------- texto del informe ---------- */
    function reportText() {
      var L = [], d = new Date(), nm = function (id) { return T(TESTS[id][0]); }, pr = function (v) { return Math.round(v * 100) + '%'; };
      L.push(T('Mi perfil de agilidad mental')); L.push(d.toLocaleDateString(window.LANG === 'en' ? 'en-US' : 'es-CO') + ' · ' + (mode === 'full' ? T('Reto completo') : T('Reto rápido'))); L.push('');
      L.push(T('Índice de agilidad mental') + ': ' + total + ' / 100' + (prevRec ? '  (' + (total - prevRec.total >= 0 ? '+' : '') + (total - prevRec.total) + ' ' + T('frente a tu intento anterior') + ')' : ''));
      L.push(T('Perfil') + ': ' + T(TYPES[A.type][0]) + ' — ' + T(TYPES[A.type][1])); L.push(T('Precisión') + ': ' + pr(A.acc) + ' · ' + T('Velocidad') + ': ' + pr(A.speed)); L.push('');
      L.push(T('Competencias') + ':'); comps.forEach(function (c) { if (c.has) L.push('• ' + T(c.name) + ': ' + Math.round(c.pct * 100) + '% (' + T(label(c.pct)) + ')'); }); L.push('');
      L.push(T('Detalle por prueba') + ':'); ORDER.forEach(function (id) { var r = res[id]; L.push('• ' + nm(id) + ' — ' + Math.round(r.pct * 100) + '% · ' + lineOf(id, r)); }); L.push('');
      L.push(T('Tus fortalezas') + ':'); A.top.forEach(function (c) { if (c.pct >= 0.4) L.push('✔ ' + T(c.name) + ' (' + Math.round(c.pct * 100) + '%): ' + T('Se nota en: ') + T(CTX[c.id]) + '.'); }); L.push('');
      L.push(T('A mejorar') + ':'); A.low.forEach(function (c) { if (c.pct < 0.8) L.push('↗ ' + T(c.name) + ' (' + Math.round(c.pct * 100) + '%): ' + coach(weakTest(c), res[weakTest(c)])); }); L.push('');
      L.push(T('Rutina sugerida: 10 minutos al día, 3 veces por semana. Repite el reto en 7 días y compara tu índice.')); L.push(''); L.push(T('Es un ejercicio de práctica: no es una prueba psicométrica oficial.')); L.push('https://jsebasurb.github.io/Portafolio/');
      return L.join('\n');
    }
    function weakTest(c) { var ids = c.tests.filter(function (id) { return res[id]; }); ids.sort(function (a, b) { return res[a].pct - res[b].pct; }); return ids[0]; }
    function notify(m) { toast = m; toastT = 2; }
    function fallbackCopy(t) { try { var ta = document.createElement('textarea'); ta.value = t; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); var ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; } }
    function save(name, blob) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000); }
    function cardBlob(cb) { var cn = document.createElement('canvas'); cn.width = 1080; cn.height = 1350; drawCard(cn.getContext('2d'), 1080, 1350); cn.toBlob(cb, 'image/png'); }
    function doExport(id) {
      var text = reportText();
      if (id === 'copy') { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { notify(T('¡Copiado!')); }).catch(function () { notify(fallbackCopy(text) ? T('¡Copiado!') : T('No se pudo copiar')); }); else notify(fallbackCopy(text) ? T('¡Copiado!') : T('No se pudo copiar')); }
      else if (id === 'txt') { save('perfil-agilidad-mental.txt', new Blob([text], { type: 'text/plain;charset=utf-8' })); notify(T('Descargado')); }
      else if (id === 'png') { cardBlob(function (b) { if (b) { save('perfil-agilidad-mental.png', b); notify(T('Descargado')); } }); }
      else if (id === 'share') { cardBlob(function (b) { try { var f = new File([b], 'perfil-agilidad-mental.png', { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) navigator.share({ files: [f], text: T('Mi perfil de agilidad mental') + ': ' + total + '/100' }).catch(function () { }); else navigator.share({ text: text }).catch(function () { }); } catch (e) { navigator.share({ text: text }).catch(function () { }); } }); }
    }

    /* ---------- dibujo ---------- */
    function wrap(c, s2, x, y, maxW, lh, size, col2, align, weight) {
      c.font = (weight || 600) + ' ' + size + 'px -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'; c.fillStyle = col2; c.textAlign = align || 'center'; var words = String(s2).split(' '), line = '';
      words.forEach(function (wd) { var t2 = line ? line + ' ' + wd : wd; if (c.measureText(t2).width > maxW && line) { c.fillText(line, x, y); line = wd; y += lh; } else line = t2; }); c.fillText(line, x, y); return y + lh;
    }
    function radar(c, cx, cy, R, fs, prev) {
      var n = comps.length, ang = function (i) { return -Math.PI / 2 + i * TAU / n; }, pt = function (i, v) { return [cx + Math.cos(ang(i)) * R * v, cy + Math.sin(ang(i)) * R * v]; };
      c.lineWidth = Math.max(1, fs / 12); c.strokeStyle = 'rgba(255,255,255,.16)';
      [0.25, 0.5, 0.75, 1].forEach(function (k) { c.beginPath(); for (var i = 0; i < n; i++) { var p = pt(i, k); if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); } c.closePath(); c.stroke(); });
      for (var i = 0; i < n; i++) { var e2 = pt(i, 1); c.beginPath(); c.moveTo(cx, cy); c.lineTo(e2[0], e2[1]); c.stroke(); }
      if (prev) { c.setLineDash([fs * 0.4, fs * 0.3]); c.strokeStyle = 'rgba(255,230,109,.7)'; c.beginPath(); comps.forEach(function (cm, i) { var v = (prev.c && prev.c[cm.id] != null ? prev.c[cm.id] : 0) / 100, p = pt(i, v); if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath(); c.stroke(); c.setLineDash([]); }
      c.beginPath(); comps.forEach(function (cm, i) { var p = pt(i, Math.max(0.04, cm.pct)); if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath(); c.fillStyle = 'rgba(125,226,255,.28)'; c.fill(); c.strokeStyle = '#7de2ff'; c.lineWidth = Math.max(2, fs / 6); c.stroke();
      comps.forEach(function (cm, i) { var p = pt(i, Math.max(0.04, cm.pct)); c.fillStyle = col(cm.pct); c.beginPath(); c.arc(p[0], p[1], fs * 0.28, 0, TAU); c.fill();
        var lp = pt(i, 1.0), cs = Math.cos(ang(i)), sn = Math.sin(ang(i)), al = cs > 0.3 ? 'left' : cs < -0.3 ? 'right' : 'center', lx = lp[0] + cs * fs * 0.9, ly = lp[1] + sn * fs * 1.05 + fs * 0.35;
        txt(c, T(cm.name), lx, ly, fs, '#fff', al); txt(c, Math.round(cm.pct * 100) + '%', lx, ly + fs * 1.15, fs * 0.95, col(cm.pct), al); });
    }
    function pageSummary(c, w, h) {
      var y0 = 56; txt(c, T('Índice de agilidad mental'), w / 2, y0 + 14, 15, '#7de2ff'); txt(c, total + ' / 100', w / 2, y0 + 62, 48, '#ffe66d');
      if (prevRec) { var d = total - prevRec.total; txt(c, (d > 0 ? '▲ +' : d < 0 ? '▼ ' : '= ') + d + '  ' + T('frente a tu intento anterior'), w / 2, y0 + 86, 13, d > 0 ? '#30d158' : d < 0 ? '#ff9f0a' : '#c7cde8'); }
      var R = Math.min(w * 0.24, (h - y0 - 250) / 2, 105); radar(c, w / 2, y0 + 120 + R + 26, R, 12, prevRec);
      var yy = y0 + 120 + 2 * R + 76; txt(c, T(TYPES[A.type][0]), w / 2, yy, 22, '#ffe66d'); if (prevRec) txt(c, '┄ ' + T('intento anterior'), w / 2, yy + 22, 12, '#ffe66d', 'center', 0.7);
      wrap(c, T('Es un ejercicio de práctica: no es una prueba psicométrica oficial.'), w / 2, yy + 44, w - 50, 15, 11, '#7f89b0');
    }
    function pageDetail(c, w, h) {
      var n = ORDER.length, y = 58, rh = Math.min(54, (h - y - 90) / n); txt(c, T('Detalle por prueba'), w / 2, y + 8, 17, '#fff');
      ORDER.forEach(function (id, i) {
        var r = res[id], yy = y + 26 + i * rh, cc = col(r.pct);
        txt(c, T(TESTS[id][0]), 16, yy + 10, 13, '#fff', 'left'); txt(c, Math.round(r.pct * 100) + '% · ' + T(label(r.pct)), w - 16, yy + 10, 12, cc, 'right');
        c.fillStyle = 'rgba(255,255,255,.12)'; rr(c, 16, yy + 16, w - 32, 8, 4); c.fill(); c.fillStyle = cc; rr(c, 16, yy + 16, Math.max(8, (w - 32) * r.pct), 8, 4); c.fill();
        txt(c, lineOf(id, r), 16, yy + 38, 11, '#9aa3c7', 'left', 0.95);
      });
    }
    function pageAnalysis(c, w, h) {
      var ty = TYPES[A.type], y = 62; txt(c, T(ty[0]), w / 2, y + 22, Math.min(28, w / 13), '#ffe66d'); y = wrap(c, T(ty[1]), w / 2, y + 48, w - 44, 19, 14, '#d9def5') + 2;
      [['Precisión', A.acc, '#30d158'], ['Velocidad', A.speed, '#7de2ff']].forEach(function (b) { txt(c, T(b[0]), 20, y + 12, 13, '#fff', 'left'); txt(c, Math.round(b[1] * 100) + '%', w - 20, y + 12, 13, b[2], 'right'); c.fillStyle = 'rgba(255,255,255,.12)'; rr(c, 20, y + 18, w - 40, 9, 4.5); c.fill(); c.fillStyle = b[2]; rr(c, 20, y + 18, Math.max(9, (w - 40) * clamp01(b[1])), 9, 4.5); c.fill(); y += 38; });
      txt(c, '✔ ' + T('Tus fortalezas'), 20, y + 12, 15, '#30d158', 'left'); y += 24;
      A.top.slice(0, 2).forEach(function (t) { if (t.pct < 0.4) return; y = wrap(c, T(t.name) + ' · ' + Math.round(t.pct * 100) + '%', 28, y + 2, w - 56, 17, 14, '#fff', 'left', 700); y = wrap(c, T('Se nota en: ') + T(CTX[t.id]) + '.', 28, y - 2, w - 56, 16, 12, '#9aa3c7', 'left'); });
      y += 4; txt(c, '↗ ' + T('A mejorar'), 20, y + 12, 15, '#ff9f0a', 'left'); y += 24;
      A.low.slice(0, 2).forEach(function (t) { if (t.pct >= 0.8) return; y = wrap(c, T(t.name) + ' · ' + Math.round(t.pct * 100) + '%', 28, y + 2, w - 56, 17, 14, '#fff', 'left', 700); y = wrap(c, T('Importa para: ') + T(CTX[t.id]) + '.', 28, y - 2, w - 56, 16, 12, '#9aa3c7', 'left'); });
    }
    function pagePlan(c, w, h) {
      var y = 62; txt(c, T('Tu plan de práctica'), w / 2, y + 16, 22, '#ffe66d'); y += 36; var shown = 0;
      A.low.forEach(function (t) { if (shown >= 2 || t.pct >= 0.8) return; shown++; var id = weakTest(t); txt(c, T(t.name) + ' · ' + T(TESTS[id][0]), 20, y + 12, 14, '#fff', 'left'); y = wrap(c, coach(id, res[id]), 20, y + 34, w - 40, 18, 13, '#c7cde8', 'left') + 4; });
      if (!shown) y = wrap(c, T('Vas muy bien. Sube la dificultad o reduce el tiempo para seguir mejorando.'), 20, y + 14, w - 40, 18, 13, '#c7cde8', 'left') + 4;
      y = wrap(c, '🗓 ' + T('Rutina sugerida: 10 minutos al día, 3 veces por semana. Repite el reto en 7 días y compara tu índice.'), 20, y + 8, w - 40, 18, 13, '#7de2ff', 'left') + 4;
      txt(c, T('Tus últimos intentos'), 20, y + 12, 14, '#fff', 'left'); var last = hist.slice(-8), bw = (w - 40) / 8, base = Math.min(h - 56, y + 125), ch = Math.min(78, base - y - 38);
      last.forEach(function (r, i) { var x = 20 + (8 - last.length + i) * bw, bh = Math.max(4, ch * r.total / 100), cur = i === last.length - 1; c.fillStyle = cur ? '#ffe66d' : 'rgba(125,226,255,.55)'; rr(c, x + 4, base - bh, bw - 8, bh, 4); c.fill(); txt(c, String(r.total), x + bw / 2, base - bh - 4, 11, '#fff', 'center', 0.9); });
      var best = hist.reduce(function (m, r) { return Math.max(m, r.total); }, 0); txt(c, T('Mejor') + ': ' + best + '  ·  ' + T('Intentos') + ': ' + hist.length, w / 2, base + 20, 12, '#9aa3c7');
    }
    function pageExport(c, w, h) {
      txt(c, T('Llévate tu perfil'), w / 2, 76, 22, '#ffe66d'); wrap(c, T('Copia el texto, descarga la imagen con tu gráfica o compártela.'), w / 2, 100, w - 50, 18, 13, '#c7cde8');
      exportBtns().forEach(function (b) { btn(c, b, null, 'rgba(125,226,255,.16)', '#fff', 20); c.strokeStyle = 'rgba(125,226,255,.5)'; c.lineWidth = 2; rr(c, b.x, b.y, b.w, b.h, 18); c.stroke(); txt(c, b.label, b.x + b.w / 2, b.y + b.h / 2 + 7, 18, '#fff'); });
      if (toastT > 0) { c.fillStyle = 'rgba(48,209,88,.95)'; rr(c, w / 2 - 110, h - 190, 220, 40, 20); c.fill(); txt(c, toast, w / 2, h - 164, 16, '#04200f', 'center', Math.min(1, toastT)); }
    }
    function drawCard(c, W, H) {
      var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0d1230'); g.addColorStop(1, '#241a5e'); c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(125,226,255,.07)'; c.beginPath(); c.arc(W * 0.9, H * 0.08, 340, 0, TAU); c.fill();
      txt(c, T('Mi perfil de agilidad mental'), W / 2, 110, 58, '#fff'); txt(c, (mode === 'full' ? T('Reto completo') : T('Reto rápido')) + ' · ' + new Date().toLocaleDateString(window.LANG === 'en' ? 'en-US' : 'es-CO'), W / 2, 162, 28, '#9aa3c7');
      txt(c, total + ' / 100', W / 2, 340, 170, '#ffe66d'); txt(c, T(TYPES[A.type][0]), W / 2, 410, 52, '#fff');
      radar(c, W / 2, 735, 250, 30, null);
      var y = 1090; txt(c, '✔ ' + T('Tus fortalezas'), 80, y, 34, '#30d158', 'left'); y += 46;
      A.top.slice(0, 2).forEach(function (t) { if (t.pct >= 0.4) { txt(c, T(t.name) + ' · ' + Math.round(t.pct * 100) + '%', 100, y, 30, '#fff', 'left'); y += 42; } });
      var y2 = 1090; txt(c, '↗ ' + T('A mejorar'), W / 2 + 40, y2, 34, '#ff9f0a', 'left'); y2 += 46;
      A.low.slice(0, 2).forEach(function (t) { if (t.pct < 0.8) { txt(c, T(t.name) + ' · ' + Math.round(t.pct * 100) + '%', W / 2 + 60, y2, 30, '#fff', 'left'); y2 += 42; } });
      txt(c, 'jsebasurb.github.io/Portafolio', W / 2, H - 78, 30, '#7de2ff'); txt(c, T('Es un ejercicio de práctica: no es una prueba psicométrica oficial.'), W / 2, H - 38, 22, '#7f89b0');
    }
    G.draw = function () {
      var c = E.ctx, w = E.w, h = E.h;
      if (phase === 'play' && inner) { inner.draw(); txt(c, (idx + 1) + '/' + ORDER.length, w / 2, 46, 14, '#ffe66d', 'center', 0.9); return; }
      mindBg(c, w, h, 0, '#fff');
      if (phase === 'menu') {
        txt(c, T('Reto de entrevista'), w / 2, h * 0.17, Math.min(34, w / 11), '#fff'); wrap(c, T('Elige cuántas pruebas quieres hacer. Al final recibirás tu perfil con gráfica, análisis y plan de práctica.'), w / 2, h * 0.24, w - 60, 22, 15, '#c7cde8');
        var m = MB(); [['Reto rápido', '6 pruebas · unos 5 minutos', '#3a4a9e'], ['Reto completo', '10 pruebas · unos 9 minutos', '#7b3f9e']].forEach(function (b, i) { btn(c, m[i], null, b[2], '#fff', 20, true); txt(c, T(b[0]), m[i].x + m[i].w / 2, m[i].y + m[i].h * 0.42, 24, '#fff'); txt(c, T(b[1]), m[i].x + m[i].w / 2, m[i].y + m[i].h * 0.72, 15, '#e6e9ff', 'center', 0.9); });
        return;
      }
      if (phase === 'intro') {
        var id = ORDER[idx], o = TESTS[id]; txt(c, T('Prueba') + ' ' + (idx + 1) + ' / ' + ORDER.length, w / 2, h * 0.2, 16, '#7de2ff', 'center', 0.9);
        var f = fit(c, T(o[0]), w - 40, 36); txt(c, T(o[0]), w / 2, h * 0.32, f, '#fff'); wrap(c, T(o[1]), w / 2, h * 0.41, w - 60, 25, 17, '#c7cde8');
        txt(c, (DBGD || o[2]) + ' s', w / 2, h * 0.64, 54, '#ffe66d'); c.globalAlpha = 0.6 + 0.4 * Math.sin(tt * 4); txt(c, T('Toca para empezar'), w / 2, h * 0.8, 22, '#fff'); c.globalAlpha = 1;
        var gap = Math.min(26, (w - 60) / ORDER.length); for (var i = 0; i < ORDER.length; i++) { c.fillStyle = i < idx ? '#30d158' : i === idx ? '#ffe66d' : 'rgba(255,255,255,.2)'; c.beginPath(); c.arc(w / 2 + (i - (ORDER.length - 1) / 2) * gap, h * 0.9, 6, 0, TAU); c.fill(); }
        return;
      }
      var R = CH(), names = [T('Resumen'), T('Detalle'), T('Análisis'), T('Plan'), T('Exportar')];
      R.forEach(function (r, i) { c.fillStyle = i === page ? '#7de2ff' : 'rgba(255,255,255,.1)'; rr(c, r.x, r.y, r.w, r.h, 14); c.fill(); txt(c, names[i], r.x + r.w / 2, r.y + 19, 11.5, i === page ? '#062030' : '#fff'); });
      [pageSummary, pageDetail, pageAnalysis, pagePlan, pageExport][page](c, w, h);
    };
    G._dbg = function () { return { phase: phase, idx: idx, inner: inner && inner._dbg ? inner._dbg() : null, res: res, total: total, A: A, comps: comps, page: page, hist: hist, text: A ? reportText() : null, mode: mode }; };
    return G;
  };


  /* ================= CUBEHEAD: corredor 3D de carriles con la música «Final Boss Pursuit» ================= */
  GAMES.cubehead = function (E) {
    var G = {}, camH = 2.6, camD = 4.2, FAR = 66, TRACK = 'assets/audio/final_boss_pursuit.mp3';
    var cx, hy, F, lane, px, py, vy, onG, v, dist, score, coins, lives, inv, obs, cns, gapLeft, t, shake, hintT, flash, pyl, stars, sky, music = null, an = null, freq = null, bassAvg, pulse, sw, fade, sinceHit, pop, popT, beatT;
    function P(x, y, z) { var k = F / (z + camD); return [cx + x * k, hy + (camH - y) * k, k]; }
    G.resize = function () { cx = E.w / 2; hy = E.h * 0.34; F = Math.min(1.134 * E.w, 0.8 * E.h); sky = null; };
    function initScene() {
      pyl = []; for (var i = 0; i < 9; i++) pyl.push({ z: -2 + i * 8, s: i % 2 ? 1 : -1, c: i % 3 });
      stars = []; for (var j = 0; j < 50; j++) stars.push({ x: rnd(), y: rnd() * 0.3, r: rnd() * 1.4 + 0.3 });
    }
    function setupMusic() {
      if (music) return;
      try {
        music = new Audio((window.CFG && window.CFG.root || '') + TRACK); music.loop = true; music.preload = 'auto'; music.volume = 0.85;
        var a = actx(); if (a) { var src = a.createMediaElementSource(music); an = a.createAnalyser(); an.fftSize = 256; freq = new Uint8Array(an.frequencyBinCount); src.connect(an); an.connect(a.destination); }
      } catch (e) { an = null; }
    }
    G.start = function () {
      setupMusic(); if (!music) return; clearInterval(fade); music.volume = 0.85; try { music.currentTime = 0; } catch (e) { }
      var pr = music.play(); if (pr && pr.catch) pr.catch(function () { });
    };
    G.onPause = function (on) { if (!music) return; if (on) music.pause(); else { var pr = music.play(); if (pr && pr.catch) pr.catch(function () { }); } };
    G.onEnd = function () { if (!music) return; clearInterval(fade); fade = setInterval(function () { if (!music) return clearInterval(fade); music.volume = Math.max(0, music.volume - 0.06); if (music.volume <= 0.02) { music.pause(); clearInterval(fade); } }, 60); };
    G.destroy = function () { clearInterval(fade); if (music) { music.pause(); music.removeAttribute('src'); try { music.load(); } catch (e) { } music = null; an = null; } };
    G.reset = function () {
      G.resize(); lane = 0; px = 0; py = 0; vy = 0; onG = true; v = 11; dist = 0; score = 0; coins = 0; lives = 3; inv = 0; obs = []; cns = []; gapLeft = 24; t = 0; shake = 0; hintT = 5; flash = 0;
      bassAvg = 0.3; pulse = 0; sw = null; sinceHit = 0; pop = ''; popT = 0; beatT = 0; initScene(); E.setScore(0);
    };
    function jump() { if (onG) { vy = 9.8; onG = false; beep(520, 0.08, 'square', 0.03); } }
    function go(d) { var n = Math.max(-1, Math.min(1, lane + d)); if (n !== lane) { lane = n; beep(380 + n * 40, 0.05, 'triangle', 0.03); } }
    G.pointerDown = function (x, y, id) { sw = { x: x, y: y, t: performance.now(), id: id, done: false }; };
    G.pointerMove = function (x, y, id) {
      if (!sw || sw.done || sw.id !== id) return; var dx = x - sw.x, dy = y - sw.y;
      if (Math.abs(dx) > 26 && Math.abs(dx) > Math.abs(dy)) { go(dx > 0 ? 1 : -1); sw.done = true; }
      else if (dy < -26 && Math.abs(dy) > Math.abs(dx)) { jump(); sw.done = true; }
      else if (dy > 26 && Math.abs(dy) > Math.abs(dx)) { if (!onG) vy = Math.min(vy, -15); sw.done = true; }
    };
    G.pointerUp = function (x, y, id) {
      if (sw && !sw.done && performance.now() - sw.t < 280) { if (x < E.w * 0.33) go(-1); else if (x > E.w * 0.67) go(1); else jump(); } sw = null;
    };
    G.keyDown = function (k) {
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') go(-1); else if (k === 'ArrowRight' || k === 'd' || k === 'D') go(1);
      else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === ' ') jump(); else if ((k === 'ArrowDown' || k === 's' || k === 'S') && !onG) vy = Math.min(vy, -15);
    };
    function spawnRow() {
      var r = rnd(), a = shuffle([0, 1, 2]), z = FAR, used = [];
      if (r < 0.4) { var n = rnd() < 0.4 ? 2 : 1; for (var i = 0; i < n; i++) { obs.push({ l: a[i] - 1, z: z, h: 0.55, d: 1.2, k: 'low' }); used.push(a[i]); } }
      else if (r < 0.75) { var m = rnd() < 0.5 ? 2 : 1; for (var j = 0; j < m; j++) { obs.push({ l: a[j] - 1, z: z, h: 1.7, d: 1.2, k: 'tall' }); used.push(a[j]); } }
      else { obs.push({ l: a[0] - 1, z: z, h: 1.7, d: 1.2, k: 'tall' }); obs.push({ l: a[1] - 1, z: z, h: 0.55, d: 1.2, k: 'low' }); used.push(a[0], a[1]); }
      var free = [0, 1, 2].filter(function (q) { return used.indexOf(q) < 0; });
      if (free.length && rnd() < 0.8) { var cl = free[Math.floor(rnd() * free.length)] - 1; for (var q = 0; q < 4; q++) cns.push({ l: cl, z: z - 2 + q * 1.7, y: 0.5, got: false }); }
      else { var lw = obs[obs.length - 1].l; for (var q2 = 0; q2 < 3; q2++) cns.push({ l: lw, z: z - 0.8 + q2 * 1.1, y: 1.5 + (q2 === 1 ? 0.35 : 0), got: false }); }
    }
    G.update = function (dt) {
      t += dt; sinceHit += dt; if (hintT > 0) hintT -= dt; if (shake > 0) shake -= dt; if (inv > 0) inv -= dt; if (flash > 0) flash -= dt; if (popT > 0) popT -= dt;
      v = Math.min(25, v + dt * 0.16); dist += v * dt; var ns = Math.floor(dist / 3) + coins * 10; if (ns !== score) { score = ns; E.setScore(score); }
      if (music) music.muted = !soundOn;
      if (an) { an.getByteFrequencyData(freq); var b = 0; for (var i = 0; i < 6; i++) b += freq[i]; b /= 6 * 255; bassAvg += (b - bassAvg) * 0.02; if (b > bassAvg * 1.25 && b > 0.35 && pulse < 0.5) pulse = 1; } else { beatT += dt; if (beatT > 0.5) { beatT = 0; pulse = 1; } }
      pulse = Math.max(0, pulse - dt * 3.2);
      px += (lane - px) * Math.min(1, dt * 14);
      if (!onG) { vy -= 28 * dt; py += vy * dt; if (py <= 0) { py = 0; vy = 0; onG = true; } }
      gapLeft -= v * dt; if (gapLeft <= 0) { spawnRow(); gapLeft = Math.max(9, v * 0.62) + rnd() * 5; }
      for (var j = obs.length - 1; j >= 0; j--) {
        var o = obs[j]; o.z -= v * dt; if (o.z + o.d < -3) { obs.splice(j, 1); continue; }
        if (inv <= 0 && o.z < 0.4 && o.z + o.d > -0.4 && Math.abs(px - o.l) < 0.62 && py < o.h - 0.06) {
          lives--; inv = 1.5; shake = 0.4; flash = 0.5; v = Math.max(11, v * 0.82); sinceHit = 0; obs.splice(j, 1); beep(120, 0.35, 'sawtooth', 0.06); try { if (navigator.vibrate) navigator.vibrate(90); } catch (e) { }
          if (lives <= 0) { E.die(); return; }
        }
      }
      for (var k = cns.length - 1; k >= 0; k--) {
        var c = cns[k]; c.z -= v * dt; if (c.z < -3) { cns.splice(k, 1); continue; }
        if (!c.got && Math.abs(c.z) < 0.7 && Math.abs(px - c.l) < 0.7 && Math.abs(py + 0.3 - c.y) < 0.95) { c.got = true; coins++; pop = '+10'; popT = 0.6; beep(1000 + coins % 5 * 60, 0.07, 'sine', 0.05); cns.splice(k, 1); }
      }
      if (lives < 3 && sinceHit > 20) { lives++; sinceHit = 0; pop = '+❤'; popT = 1.2; beep(780, 0.18, 'triangle', 0.05); }
      pyl.forEach(function (p) { p.z -= v * dt; if (p.z < -3) p.z += 72; });
    };
    /* ---------- dibujo ---------- */
    function quad(c, a, b, d, e, fill) { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.lineTo(e[0], e[1]); c.closePath(); c.fillStyle = fill; c.fill(); }
    function box(c, x, y0, y1, z0, z1, hw, col, glow) {
      if (z0 + camD < 0.35) return; var n = [P(x - hw, y0, z0), P(x + hw, y0, z0), P(x + hw, y1, z0), P(x - hw, y1, z0)], f = [P(x - hw, y0, z1), P(x + hw, y0, z1), P(x + hw, y1, z1), P(x - hw, y1, z1)];
      c.save(); if (glow) { c.shadowColor = col[0]; c.shadowBlur = 14; }
      if (x > hw * 0.5) quad(c, n[0], n[3], f[3], f[0], col[2]); else if (x < -hw * 0.5) quad(c, n[1], n[2], f[2], f[1], col[2]);
      if (y1 < camH) quad(c, n[3], n[2], f[2], f[3], col[1]);
      quad(c, n[0], n[1], n[2], n[3], col[0]); c.shadowBlur = 0; c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(n[0][0], n[0][1]); c.lineTo(n[1][0], n[1][1]); c.lineTo(n[2][0], n[2][1]); c.lineTo(n[3][0], n[3][1]); c.closePath(); c.stroke(); c.restore();
    }
    var LOW = ['#ff2d92', '#ff8cc6', '#a8105a'], TALL = ['#7a4dff', '#b79cff', '#4a22b8'], PYL = [['#00e5ff', '#9ff6ff', '#0097a8'], ['#ff2d92', '#ff8cc6', '#a8105a'], ['#bf5af2', '#e1b5ff', '#7a2fb0']];
    function vortex(c, x, y, r) {
      var s = c.createRadialGradient(x, y, r * 0.2, x, y, r * 2.6); s.addColorStop(0, 'rgba(255,45,146,' + (0.55 + pulse * 0.25) + ')'); s.addColorStop(1, 'rgba(255,45,146,0)'); c.fillStyle = s; c.beginPath(); c.arc(x, y, r * 2.6, 0, TAU); c.fill();
      c.save(); c.translate(x, y); c.rotate(t * 0.6); c.strokeStyle = flash > 0 ? '#ff453a' : '#ff5fb0'; c.shadowColor = '#ff2d92'; c.shadowBlur = 16; c.lineWidth = 3;
      for (var i = 0; i < 2; i++) { c.beginPath(); for (var j = 0; j < 16; j++) { var a = j / 16 * TAU, rr2 = j % 2 ? r * 0.7 : r * (1.05 + pulse * 0.1); c.lineTo(Math.cos(a + i * 0.2) * rr2, Math.sin(a + i * 0.2) * rr2); } c.closePath(); c.stroke(); c.rotate(0.35); }
      c.shadowBlur = 0; c.fillStyle = '#12002b'; c.beginPath(); c.arc(0, 0, r * 0.42, 0, TAU); c.fill(); c.restore();
    }
    G.draw = function () {
      var c = E.ctx, w = E.w, h = E.h; if (music) music.muted = !soundOn;
      c.save(); if (shake > 0) c.translate((rnd() - 0.5) * 10, (rnd() - 0.5) * 8);
      if (!sky) { sky = c.createLinearGradient(0, 0, 0, hy); sky.addColorStop(0, '#07001a'); sky.addColorStop(0.7, '#2b0a5e'); sky.addColorStop(1, '#a3135f'); }
      c.fillStyle = sky; c.fillRect(-10, -10, w + 20, hy + 12);
      c.fillStyle = '#fff'; stars.forEach(function (s, i) { c.globalAlpha = 0.35 + 0.4 * Math.abs(Math.sin(t + i)); c.fillRect(s.x * w, s.y * h, s.r, s.r); }); c.globalAlpha = 1;
      vortex(c, cx, hy - h * 0.11, Math.min(w, h) * 0.1 * (1 + pulse * 0.06));
      c.fillStyle = '#16032e'; for (var i = 0; i < 22; i++) { var bw = w / 22, bh = (0.025 + 0.05 * Math.abs(Math.sin(i * 12.9898))) * h; c.fillRect(i * bw, hy - bh, bw + 1, bh); }
      /* suelo */
      var gr = c.createLinearGradient(0, hy, 0, h); gr.addColorStop(0, '#2a0a52'); gr.addColorStop(1, '#0b0220'); c.fillStyle = gr; c.fillRect(-10, hy, w + 20, h - hy + 10);
      var zn = -3.2, off = dist % 3; c.lineWidth = 1.3;
      for (var zz = zn - off + 3; zz < FAR; zz += 3) { if (zz + camD < 0.5) continue; var a = P(-26, 0, zz), b = P(26, 0, zz), al = 0.1 + 0.45 * (1 - zz / FAR) + pulse * 0.2; c.strokeStyle = 'rgba(255,60,200,' + al + ')'; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
      for (var xx = -24; xx <= 24; xx += 3) { var n0 = P(xx, 0, zn), f0 = P(xx, 0, FAR); c.strokeStyle = 'rgba(150,80,255,' + (0.2 + pulse * 0.15) + ')'; c.beginPath(); c.moveTo(n0[0], n0[1]); c.lineTo(f0[0], f0[1]); c.stroke(); }
      /* carretera */
      var r0 = P(-1.5, 0, zn), r1 = P(1.5, 0, zn), r2 = P(1.5, 0, FAR), r3 = P(-1.5, 0, FAR); quad(c, r0, r1, r2, r3, 'rgba(8,0,24,.78)');
      c.save(); c.shadowColor = '#00e5ff'; c.shadowBlur = 12 + pulse * 10; c.strokeStyle = '#00e5ff'; c.lineWidth = 2.5; [-1.5, 1.5].forEach(function (x) { var q0 = P(x, 0, zn), q1 = P(x, 0, FAR); c.beginPath(); c.moveTo(q0[0], q0[1]); c.lineTo(q1[0], q1[1]); c.stroke(); }); c.restore();
      c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 1.5; c.setLineDash([10, 14]); [-0.5, 0.5].forEach(function (x) { var q0 = P(x, 0, zn), q1 = P(x, 0, FAR); c.beginPath(); c.moveTo(q0[0], q0[1]); c.lineTo(q1[0], q1[1]); c.stroke(); }); c.setLineDash([]);
      /* objetos ordenados por profundidad */
      var items = []; pyl.forEach(function (p) { items.push({ z: p.z, f: function () { box(c, p.s * 2.45, 0, 2.6, p.z, p.z + 0.35, 0.16, PYL[p.c], true); } }); });
      obs.forEach(function (o) { items.push({ z: o.z + o.d, f: function () { box(c, o.l, 0, o.h, o.z, o.z + o.d, 0.42, o.k === 'low' ? LOW : TALL, true); } }); });
      cns.forEach(function (k) { items.push({ z: k.z, f: function () { var p = P(k.l, k.y + Math.sin(t * 5 + k.z) * 0.08, k.z); if (p[2] < 6) return; c.save(); c.translate(p[0], p[1]); c.shadowColor = '#00e5ff'; c.shadowBlur = 12; c.fillStyle = '#00e5ff'; c.beginPath(); for (var q = 0; q < 6; q++) { var an2 = q / 6 * TAU + t * 3; c.lineTo(Math.cos(an2) * p[2] * 0.2 * Math.abs(Math.cos(t * 3 + k.z)) + Math.cos(an2) * p[2] * 0.06, Math.sin(an2) * p[2] * 0.2); } c.closePath(); c.fill(); c.restore(); } }); });
      items.push({ z: 0, f: function () {
        var vis = inv <= 0 || Math.floor(t * 14) % 2 === 0; if (!vis) return;
        c.fillStyle = 'rgba(0,229,255,' + (0.18 + 0.1 * pulse) + ')'; var sh = P(px, 0, 0); c.beginPath(); c.ellipse(sh[0], sh[1], sh[2] * 0.4, sh[2] * 0.1, 0, 0, TAU); c.fill();
        box(c, px, py, py + 0.64, -0.32, 0.32, 0.32, ['#e8fbff', '#ffffff', '#7fd3e6'], true);
        var f = P(px, py + 0.32, -0.32), s = f[2] * 0.09; c.fillStyle = '#10243a'; c.fillRect(f[0] - f[2] * 0.15 - s / 2, f[1] - s * 1.2, s, s * 1.8); c.fillRect(f[0] + f[2] * 0.15 - s / 2, f[1] - s * 1.2, s, s * 1.8); c.fillStyle = '#ff2d92'; c.fillRect(f[0] - f[2] * 0.12, f[1] + s * 1.0, f[2] * 0.24, s * 0.4);
      } });
      items.sort(function (a, b) { return b.z - a.z; }); items.forEach(function (it) { it.f(); });
      c.restore();
      /* jefe y HUD */
      if (lives < 3) { var bz = (3 - lives) / 3; c.fillStyle = 'rgba(255,40,80,' + (0.1 + 0.18 * bz + pulse * 0.1) + ')'; var gb = c.createRadialGradient(w / 2, h, 10, w / 2, h, h * 0.55); gb.addColorStop(0, 'rgba(255,40,80,' + (0.5 * bz) + ')'); gb.addColorStop(1, 'rgba(255,40,80,0)'); c.fillStyle = gb; c.fillRect(0, h * 0.45, w, h * 0.55); }
      if (flash > 0) { c.fillStyle = 'rgba(255,40,80,' + Math.min(0.35, flash) + ')'; c.fillRect(0, 0, w, h); }
      txt(c, '❤'.repeat(Math.max(0, lives)), 14, 28, 20, '#ff2d92', 'left'); txt(c, '◈ ' + coins, w - 14, 28, 18, '#00e5ff', 'right');
      if (popT > 0) txt(c, pop, w / 2, h * 0.58 - (0.6 - Math.min(0.6, popT)) * 40, 24, '#ffe66d', 'center', Math.min(1, popT * 2));
      if (hintT > 0) { txt(c, T('Desliza ← → para cambiar de carril'), w / 2, h * 0.86, 15, '#fff', 'center', Math.min(0.9, hintT)); txt(c, T('Toca o desliza ↑ para saltar'), w / 2, h * 0.86 + 22, 15, '#fff', 'center', Math.min(0.9, hintT)); }
    };
    G._dbg = function () { return { lane: lane, px: px, py: py, onG: onG, lives: lives, score: score, v: v, obs: obs.map(function (o) { return { l: o.l, z: o.z, h: o.h, d: o.d }; }), coins: coins, music: music ? { muted: music.muted, paused: music.paused, t: music.currentTime, rs: music.readyState, err: music.error && music.error.code } : null, an: !!an }; };
    return G;
  };

  /* ================= marco común: ventana de juego ================= */
  var ov = document.createElement('div'); ov.className = 'gm'; ov.hidden = true; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
  ov.innerHTML = '<div class="gm-in"><div class="gm-top"><button type="button" class="gm-b" data-a="x"></button><b class="gm-t"></b><span class="gm-s"></span><button type="button" class="gm-b" data-a="p"></button><button type="button" class="gm-b" data-a="m"></button></div><div class="gm-cv"><canvas></canvas><div class="gm-msg" hidden><b></b><p></p><button type="button" class="pill sm"></button></div></div></div>';
  document.body.appendChild(ov);
  var cv = ov.querySelector('canvas'), ctx = cv.getContext('2d'), msg = ov.querySelector('.gm-msg'), mB = msg.querySelector('b'), mP = msg.querySelector('p'), mBtn = msg.querySelector('button');
  var bX = ov.querySelector('[data-a=x]'), bP = ov.querySelector('[data-a=p]'), bM = ov.querySelector('[data-a=m]'), tt = ov.querySelector('.gm-t'), ss = ov.querySelector('.gm-s');
  bX.textContent = '✕'; bX.setAttribute('aria-label', T('Cerrar juego')); bP.textContent = '❚❚'; bP.setAttribute('aria-label', T('Pausar')); bM.textContent = '🔊'; bM.setAttribute('aria-label', T('Sonido'));
  var env = { ctx: ctx, w: 0, h: 0, dur: DBGD, setScore: setScore, die: die }, g = null, gid = '', hint = '', state = 'ready', raf = 0, last = 0, score = 0, bestScore = 0, dpr = 1, ids = {};

  function setScore(n) { score = n; ss.textContent = '⭐ ' + n + '  🏆 ' + Math.max(bestScore, n); }
  function show(title, text, btn, fn, low) { mB.textContent = title; mP.textContent = text; mBtn.textContent = btn; mBtn.onclick = fn; msg.classList.toggle('low', !!low); msg.hidden = false; mBtn.focus(); }
  function size() {
    var box = cv.parentNode; dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.max(200, box.clientWidth), h = Math.max(200, box.clientHeight);
    cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); env.w = w; env.h = h;
    if (g && g.resize) g.resize();
  }
  function begin() { msg.hidden = true; if (g.start) g.start(); g.reset(); state = 'play'; setScore(0); bP.disabled = false; last = performance.now(); }
  function die(low) {
    if (state !== 'play') return; state = 'over'; bP.disabled = true; low = low === true; try { if (g && g.onEnd) g.onEnd(); } catch (e) { }
    var rec = score > bestScore; if (rec) { bestScore = score; lsSet('gm-' + gid, score); } setScore(score);
    try { if (navigator.vibrate) navigator.vibrate(120); } catch (e) { }
    setTimeout(function () { if (state === 'over' && !ov.hidden) var tip = ''; try { if (!low && g && g._tip) tip = '\n' + g._tip(); } catch (e) { } show(rec && score > 0 ? T('Nuevo récord') : T('Fin del juego'), T('Puntos') + ': ' + score + '  ·  ' + T('Mejor') + ': ' + bestScore + tip, T('Reintentar'), begin, low); }, low ? 1100 : 650);
  }
  function pause(on) {
    if (g && g.onPause && ((state === 'play' && on) || (state === 'paused' && !on))) g.onPause(on);
    if (state === 'play' && on) { state = 'paused'; show(T('Pausa'), hint, T('Continuar'), function () { if (g && g.onPause) g.onPause(false); msg.hidden = true; state = 'play'; last = performance.now(); }); }
    else if (state === 'paused' && !on) { msg.hidden = true; state = 'play'; last = performance.now(); }
  }
  function frame(now) {
    raf = requestAnimationFrame(frame); var dt = Math.min(0.033, (now - last) / 1000 || 0); last = now;
    if (!g) return; if (state === 'play') g.update(dt);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); g.draw();
  }
  function openGame(id, title, h) {
    gid = id; hint = h; bestScore = lsGet('gm-' + id); ov.hidden = false; document.body.classList.add('noscroll'); tt.textContent = title; ids = {};
    if (g && g.destroy) g.destroy(); size(); g = GAMES[id](env); g.reset(); state = 'ready'; bP.disabled = true; setScore(0);
    show(title, hint, T('Jugar'), begin); cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(frame);
  }
  function closeGame() { cancelAnimationFrame(raf); if (g && g.destroy) g.destroy(); ov.hidden = true; document.body.classList.remove('noscroll'); g = null; state = 'ready'; }
  bX.addEventListener('click', closeGame); bP.addEventListener('click', function () { pause(state === 'play'); });
  bM.addEventListener('click', function () { soundOn = !soundOn; bM.textContent = soundOn ? '🔊' : '🔇'; });
  function pos(e) { var r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  cv.style.touchAction = 'none';
  function live() { return state === 'play' || (state === 'over' && g && g.endInteractive); }
  cv.addEventListener('pointerdown', function (e) { if (!live() || !g) return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) { } var p = pos(e); if (g.pointerDown) g.pointerDown(p[0], p[1], e.pointerId); });
  cv.addEventListener('pointermove', function (e) { if (!live() || !g || !g.pointerMove) return; var p = pos(e); g.pointerMove(p[0], p[1], e.pointerId); });
  ['pointerup', 'pointercancel'].forEach(function (n) { cv.addEventListener(n, function (e) { if (g && g.pointerUp) { var p = pos(e); g.pointerUp(p[0], p[1], e.pointerId); } }); });
  document.addEventListener('keydown', function (e) {
    if (ov.hidden) return;
    if (e.key === 'Escape') { closeGame(); return; }
    if (e.key === 'p' || e.key === 'P') { pause(state === 'play'); return; }
    if (!msg.hidden && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); mBtn.click(); return; }
    if (live() && g && g.keyDown) { if (/^(Arrow|\s)/.test(e.key) || e.key === ' ') e.preventDefault(); g.keyDown(e.key); }
  });
  document.addEventListener('keyup', function (e) { if (!ov.hidden && state === 'play' && g && g.keyUp) g.keyUp(e.key); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && !ov.hidden) pause(true); });
  window.addEventListener('resize', function () { if (!ov.hidden) size(); });
  window.addEventListener('orientationchange', function () { setTimeout(function () { if (!ov.hidden) size(); }, 250); });
  document.querySelectorAll('[data-game]').forEach(function (b) {
    var best = lsGet('gm-' + b.dataset.game), tag = b.parentNode.querySelector('.gbest'); if (tag && best) tag.textContent = '🏆 ' + best;
    b.addEventListener('click', function () { openGame(b.dataset.game, b.dataset.title, b.dataset.hint); });
  });
  if (/gmdebug/.test(location.search)) window.__gm = { dbg: function () { return g && g._dbg ? g._dbg() : null; }, state: function () { return state; } };
})();
