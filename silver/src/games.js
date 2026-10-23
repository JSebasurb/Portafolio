/* Minijuegos para celular (canvas, sin librerías): Bolt Runner, Capas 3D, Órbita y Serpiente de datos */
(function () {
  'use strict';
  var T = window.T || function (s) { return s; };
  var GAMES = {}, soundOn = true, ac = null;
  var lsGet = function (k) { try { return +localStorage.getItem(k) || 0; } catch (e) { return 0; } };
  var lsSet = function (k, v) { try { localStorage.setItem(k, v); } catch (e) { } };
  var rnd = Math.random, TAU = Math.PI * 2;
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

  /* ================= marco común: ventana de juego ================= */
  var ov = document.createElement('div'); ov.className = 'gm'; ov.hidden = true; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
  ov.innerHTML = '<div class="gm-in"><div class="gm-top"><button type="button" class="gm-b" data-a="x"></button><b class="gm-t"></b><span class="gm-s"></span><button type="button" class="gm-b" data-a="p"></button><button type="button" class="gm-b" data-a="m"></button></div><div class="gm-cv"><canvas></canvas><div class="gm-msg" hidden><b></b><p></p><button type="button" class="pill sm"></button></div></div></div>';
  document.body.appendChild(ov);
  var cv = ov.querySelector('canvas'), ctx = cv.getContext('2d'), msg = ov.querySelector('.gm-msg'), mB = msg.querySelector('b'), mP = msg.querySelector('p'), mBtn = msg.querySelector('button');
  var bX = ov.querySelector('[data-a=x]'), bP = ov.querySelector('[data-a=p]'), bM = ov.querySelector('[data-a=m]'), tt = ov.querySelector('.gm-t'), ss = ov.querySelector('.gm-s');
  bX.textContent = '✕'; bX.setAttribute('aria-label', T('Cerrar juego')); bP.textContent = '❚❚'; bP.setAttribute('aria-label', T('Pausar')); bM.textContent = '🔊'; bM.setAttribute('aria-label', T('Sonido'));
  var env = { ctx: ctx, w: 0, h: 0, setScore: setScore, die: die }, g = null, gid = '', hint = '', state = 'ready', raf = 0, last = 0, score = 0, bestScore = 0, dpr = 1, ids = {};

  function setScore(n) { score = n; ss.textContent = '⭐ ' + n + '  🏆 ' + Math.max(bestScore, n); }
  function show(title, text, btn, fn) { mB.textContent = title; mP.textContent = text; mBtn.textContent = btn; mBtn.onclick = fn; msg.hidden = false; mBtn.focus(); }
  function size() {
    var box = cv.parentNode; dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = Math.max(200, box.clientWidth), h = Math.max(200, box.clientHeight);
    cv.style.width = w + 'px'; cv.style.height = h + 'px'; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); env.w = w; env.h = h;
    if (g && g.resize) g.resize();
  }
  function begin() { msg.hidden = true; if (g.start) g.start(); g.reset(); state = 'play'; setScore(0); bP.disabled = false; last = performance.now(); }
  function die() {
    if (state !== 'play') return; state = 'over'; bP.disabled = true;
    var rec = score > bestScore; if (rec) { bestScore = score; lsSet('gm-' + gid, score); } setScore(score);
    try { if (navigator.vibrate) navigator.vibrate(120); } catch (e) { }
    setTimeout(function () { if (state === 'over' && !ov.hidden) show(rec && score > 0 ? T('Nuevo récord') : T('Fin del juego'), T('Puntos') + ': ' + score + '  ·  ' + T('Mejor') + ': ' + bestScore, T('Reintentar'), begin); }, 650);
  }
  function pause(on) {
    if (state === 'play' && on) { state = 'paused'; show(T('Pausa'), hint, T('Continuar'), function () { msg.hidden = true; state = 'play'; last = performance.now(); }); }
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
  cv.addEventListener('pointerdown', function (e) { if (state !== 'play' || !g) return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) { } var p = pos(e); if (g.pointerDown) g.pointerDown(p[0], p[1], e.pointerId); });
  cv.addEventListener('pointermove', function (e) { if (state !== 'play' || !g || !g.pointerMove) return; var p = pos(e); g.pointerMove(p[0], p[1], e.pointerId); });
  ['pointerup', 'pointercancel'].forEach(function (n) { cv.addEventListener(n, function (e) { if (g && g.pointerUp) { var p = pos(e); g.pointerUp(p[0], p[1], e.pointerId); } }); });
  document.addEventListener('keydown', function (e) {
    if (ov.hidden) return;
    if (e.key === 'Escape') { closeGame(); return; }
    if (e.key === 'p' || e.key === 'P') { pause(state === 'play'); return; }
    if (!msg.hidden && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); mBtn.click(); return; }
    if (state === 'play' && g && g.keyDown) { if (/^(Arrow|\s)/.test(e.key) || e.key === ' ') e.preventDefault(); g.keyDown(e.key); }
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
