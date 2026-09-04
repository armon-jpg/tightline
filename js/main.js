/* =========================================================
   Tightline — main.js
   ========================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const ARROW = '<svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  /* ------------------------------------------------------
     Nav
  ------------------------------------------------------ */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 24);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  const navLinks = $$('.nav__links a');
  const secObs = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  ['how', 'features', 'results', 'pricing', 'faq'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) secObs.observe(el);
  });

  const burger = $('#burger');
  const menu = $('#menu');
  const setMenu = (open) => {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('open', open);
    menu.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('no-scroll', open);
    if (open) nav.classList.add('is-scrolled'); else onScroll();
  };
  burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));

  // dead links in this preview shouldn't jump to the top
  $$('a[href="#"], a[aria-disabled="true"]').forEach((a) => {
    if (a.dataset.open) return;
    a.addEventListener('click', (e) => e.preventDefault());
  });

  /* ------------------------------------------------------
     Reveal on scroll
  ------------------------------------------------------ */
  const rv = $$('.rv');
  if (reduced || !('IntersectionObserver' in window)) {
    rv.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    rv.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------
     Counters
  ------------------------------------------------------ */
  const fmtInt = (n) => Math.round(n).toLocaleString('en-US');
  const cObs = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    cObs.unobserve(e.target);
    const el = e.target;
    const target = +el.dataset.count;
    const prefix = el.dataset.prefix || '';
    if (reduced) { el.textContent = prefix + fmtInt(target); return; }
    const dur = 1400;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = prefix + fmtInt(target * ease);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.5 });
  $$('[data-count]').forEach((c) => cObs.observe(c));

  /* ------------------------------------------------------
     Contour field (bathymetry / topo lines)
     3D simplex noise + marching squares on a coarse grid
  ------------------------------------------------------ */
  function makeNoise(seed) {
    const grad3 = new Float32Array([1,1,0,-1,1,0,1,-1,0,-1,-1,0,1,0,1,-1,0,1,1,0,-1,-1,0,-1,0,1,1,0,-1,1,0,1,-1,0,-1,-1]);
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    let s = (seed >>> 0) || 1;
    const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
    const perm = new Uint8Array(512), perm12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; perm12[i] = perm[i] % 12; }
    const F3 = 1 / 3, G3 = 1 / 6;
    return function noise3(xin, yin, zin) {
      let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
      const sk = (xin + yin + zin) * F3;
      const i = Math.floor(xin + sk), j = Math.floor(yin + sk), k = Math.floor(zin + sk);
      const t = (i + j + k) * G3;
      const x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);
      let i1, j1, k1, i2, j2, k2;
      if (x0 >= y0) {
        if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
        else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
        else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
      } else {
        if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
        else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
        else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      }
      const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
      const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
      const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
      const ii = i & 255, jj = j & 255, kk = k & 255;
      let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
      if (t0 > 0) { const g = perm12[ii + perm[jj + perm[kk]]] * 3; t0 *= t0; n0 = t0 * t0 * (grad3[g] * x0 + grad3[g + 1] * y0 + grad3[g + 2] * z0); }
      let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
      if (t1 > 0) { const g = perm12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3; t1 *= t1; n1 = t1 * t1 * (grad3[g] * x1 + grad3[g + 1] * y1 + grad3[g + 2] * z1); }
      let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
      if (t2 > 0) { const g = perm12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3; t2 *= t2; n2 = t2 * t2 * (grad3[g] * x2 + grad3[g + 1] * y2 + grad3[g + 2] * z2); }
      let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
      if (t3 > 0) { const g = perm12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3; t3 *= t3; n3 = t3 * t3 * (grad3[g] * x3 + grad3[g + 1] * y3 + grad3[g + 2] * z3); }
      return 32 * (n0 + n1 + n2 + n3);
    };
  }

  function contours(canvas, opts = {}) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    const noise = makeNoise(opts.seed || 7);
    const cell = opts.cell || 16;
    const levels = opts.levels || [-0.55, -0.4, -0.25, -0.1, 0.05, 0.2, 0.35, 0.5];
    const speed = opts.speed || 0.00011;
    const scale = opts.scale || 0.0026;
    const color = opts.color || 'rgba(143,208,199,.11)';
    const accentColor = opts.accentColor || 'rgba(244,88,28,.3)';
    const accentIdx = typeof opts.accent === 'number' ? opts.accent : 4;
    let w = 0, h = 0, cols = 0, rows = 0, field = null, raf = 0, last = 0, t = opts.t0 || 0, visible = false;

    const sample = (x, y, z) =>
      noise(x * scale, y * scale, z) * 0.74 +
      noise(x * scale * 2.7 + 31.7, y * scale * 2.7 + 11.3, z * 1.35 + 5) * 0.26;

    const lerp = (a, b, va, vb, L) => a + (b - a) * ((L - va) / (vb - va));

    function draw() {
      if (!field) return;
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) field[j * cols + i] = sample(i * cell, j * cell, t);
      }
      ctx.clearRect(0, 0, w, h);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (let li = 0; li < levels.length; li++) {
        const L = levels[li];
        const accent = li === accentIdx;
        ctx.strokeStyle = accent ? accentColor : color;
        ctx.lineWidth = accent ? 1.25 : 1;
        ctx.beginPath();
        for (let j = 0; j < rows - 1; j++) {
          for (let i = 0; i < cols - 1; i++) {
            const a = field[j * cols + i], b = field[j * cols + i + 1];
            const c = field[(j + 1) * cols + i + 1], d = field[(j + 1) * cols + i];
            let idx = 0;
            if (a > L) idx |= 8; if (b > L) idx |= 4; if (c > L) idx |= 2; if (d > L) idx |= 1;
            if (idx === 0 || idx === 15) continue;
            const x = i * cell, y = j * cell;
            const top = [lerp(x, x + cell, a, b, L), y];
            const right = [x + cell, lerp(y, y + cell, b, c, L)];
            const bottom = [lerp(x + cell, x, c, d, L), y + cell];
            const left = [x, lerp(y + cell, y, d, a, L)];
            const seg = (p, q) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
            switch (idx) {
              case 1: case 14: seg(left, bottom); break;
              case 2: case 13: seg(bottom, right); break;
              case 3: case 12: seg(left, right); break;
              case 4: case 11: seg(top, right); break;
              case 6: case 9: seg(top, bottom); break;
              case 7: case 8: seg(top, left); break;
              case 5: { const cen = (a + b + c + d) / 4 > L; if (cen) { seg(top, left); seg(bottom, right); } else { seg(top, right); seg(left, bottom); } break; }
              case 10: { const cen = (a + b + c + d) / 4 > L; if (cen) { seg(top, right); seg(left, bottom); } else { seg(top, left); seg(bottom, right); } break; }
            }
          }
        }
        ctx.stroke();
      }
    }

    function resize() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(1, Math.round(r.width)); h = Math.max(1, Math.round(r.height));
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / cell) + 1; rows = Math.ceil(h / cell) + 1;
      field = new Float32Array(cols * rows);
      draw();
    }

    function frame(now) {
      raf = 0;
      if (!visible) return;
      if (now - last >= 32) {
        const dt = last ? Math.min(now - last, 100) : 16;
        t += dt * speed; last = now; draw();
      }
      raf = requestAnimationFrame(frame);
    }
    const start = () => { if (!raf && !reduced) raf = requestAnimationFrame(frame); };
    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; };

    new IntersectionObserver((es) => { visible = es[0].isIntersecting; if (visible) start(); else stop(); }).observe(canvas);
    let rt;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(resize, 100); };
    if ('ResizeObserver' in window) new ResizeObserver(onResize).observe(canvas);
    else addEventListener('resize', onResize);
    resize();
  }

  contours($('#contours'), { seed: 7, cell: 16, t0: 3.2 });
  contours($('#ctaContours'), { seed: 19, cell: 18, t0: 1.1, color: 'rgba(244,239,228,.09)', accentColor: 'rgba(244,88,28,.35)', accent: 3, speed: 0.00009 });

  /* ------------------------------------------------------
     Message rendering helpers
  ------------------------------------------------------ */
  function msgEl(m) {
    const d = document.createElement('div');
    if (m.side === 'sys') { d.className = 'msg msg--sys'; d.textContent = m.text; return d; }
    d.className = 'msg msg--' + m.side;
    if (m.text) d.appendChild(document.createTextNode(m.text));
    if (m.att) {
      const g = document.createElement('div'); g.className = 'msg__att';
      ['ph--1', 'ph--4', 'ph--2'].forEach((c) => { const p = document.createElement('div'); p.className = 'ph ' + c; g.appendChild(p); });
      d.appendChild(g);
    }
    if (m.link) {
      if (m.text || m.att) d.appendChild(document.createElement('br'));
      const a = document.createElement('span'); a.className = 'msg__link';
      a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>';
      a.appendChild(document.createTextNode(m.link));
      d.appendChild(a);
    }
    return d;
  }
  const chipEl = (text) => { const d = document.createElement('div'); d.className = 'msg msg--chip'; d.textContent = text; return d; };
  const typingEl = () => { const d = document.createElement('div'); d.className = 'msg msg--in msg--typing'; d.innerHTML = '<i></i><i></i><i></i>'; return d; };
  const scrollThread = (el) => { el.scrollTop = el.scrollHeight; };

  /* ------------------------------------------------------
     Hero thread — one guest, one trip, one year
  ------------------------------------------------------ */
  const HERO = [
    { chip: 'Trip ends · 2:47 PM', time: '2:47', side: 'in', text: 'Great day, Mike. Six keeper snook on a north wind — that’s a good day.' },
    { side: 'in', text: 'Your photos from today:', att: true, link: 'tl.ink/rt-0912 · 14 photos' },
    { side: 'out', text: 'Those are awesome. Thank you!!' },
    { chip: '+2 hours · 4:47 PM', time: '4:47', side: 'in', text: 'If you’ve got 30 seconds, a Google review makes a real difference for a one-boat operation.', link: 'g.page/reel-therapy/review' },
    { side: 'in', text: 'And if anything was off today, text me back here. I read every one.' },
    { side: 'out', text: 'Done. Best day my kid’s had all summer.' },
    { chip: '+3 days', time: '9:12', side: 'in', text: 'That’s what it’s about. If a buddy wants to get out this fall, this takes $50 off for both of you:', link: 'tl.ink/mike-50' },
    { chip: 'Next August', time: '10:30', side: 'in', text: 'Snook season opens next month. Your date from last year — Sat, Sept 12 — is open again. Reply YES and I’ll hold it.' },
    { side: 'out', text: 'YES' },
    { side: 'in', text: 'Held. Deposit link’s on the way. Tight lines. — Dana' }
  ];

  const heroThread = $('#heroThread');
  const heroChip = $('#heroChip');
  const heroTime = $('#heroPhone .phone__time');
  let heroVisible = false, heroRunning = false;

  const bumpChip = (text) => {
    heroChip.textContent = text;
    heroChip.classList.remove('bump'); void heroChip.offsetWidth; heroChip.classList.add('bump');
  };

  async function playHero() {
    if (heroRunning) return;
    heroRunning = true;
    while (heroVisible) {
      heroThread.innerHTML = '';
      for (const m of HERO) {
        if (!heroVisible) break;
        if (m.chip) {
          heroThread.appendChild(chipEl(m.chip));
          bumpChip(m.chip);
          if (m.time) heroTime.textContent = m.time;
          scrollThread(heroThread);
          await sleep(550);
        }
        if (m.side === 'in') {
          const ty = typingEl(); heroThread.appendChild(ty); scrollThread(heroThread);
          await sleep(800 + Math.min((m.text || '').length, 120) * 4);
          ty.remove();
        } else {
          await sleep(1000);
        }
        heroThread.appendChild(msgEl(m)); scrollThread(heroThread);
        await sleep(m.side === 'out' ? 800 : 1400);
      }
      await sleep(5000);
    }
    heroRunning = false;
  }

  if (reduced) {
    HERO.forEach((m) => { if (m.chip) heroThread.appendChild(chipEl(m.chip)); heroThread.appendChild(msgEl(m)); });
    heroChip.textContent = 'One guest · one year';
    heroThread.style.overflowY = 'auto';
  } else {
    new IntersectionObserver((es) => {
      heroVisible = es[0].isIntersecting;
      if (heroVisible) playHero();
    }, { threshold: 0.15 }).observe(heroThread);
  }

  /* ------------------------------------------------------
     Flow — sticky phone follows the steps
  ------------------------------------------------------ */
  const DANA = { name: 'Capt. Dana', sub: 'Reel Therapy Charters', av: 'DR' };
  const FLOW = [
    { who: { name: 'Tightline', sub: '(305) 555-0199', av: 'TL', label: 'Your phone' }, time: '2:47', msgs: [
      { side: 'sys', text: 'Sat, Sep 12 · 2:47 PM' },
      { side: 'in', text: 'Trip with Mike Adams (party of 4) just closed in FareHarbor. Follow-up starts in 15 min. Text me photos, or SKIP to hold it.' },
      { side: 'out', text: 'Here you go', att: true },
      { side: 'in', text: 'Got 3. Building the gallery — going to Mike and 3 guests at 3:02.' }
    ] },
    { who: { ...DANA, label: 'Mike’s phone' }, time: '3:02', msgs: [
      { side: 'sys', text: '3:02 PM · 15 minutes after the dock' },
      { side: 'in', text: 'Great day, Mike. Six keeper snook on a north wind — that’s a good day. Your photos:', att: true, link: 'tl.ink/rt-0912 · 14 photos' },
      { side: 'out', text: 'Those are awesome. Thank you!!' }
    ] },
    { who: { ...DANA, label: 'Mike’s phone' }, time: '4:47', msgs: [
      { side: 'sys', text: '4:47 PM · 2 hours after the dock' },
      { side: 'in', text: 'If you’ve got 30 seconds, a Google review makes a real difference for a one-boat operation.', link: 'g.page/reel-therapy/review' },
      { side: 'in', text: 'And if anything was off today, text me back here. I read every one.' },
      { side: 'out', text: 'Done. Best day my kid’s had all summer.' }
    ] },
    { who: { ...DANA, label: 'Mike’s phone' }, time: '9:12', msgs: [
      { side: 'sys', text: 'Tue, Sep 15 · 3 days later' },
      { side: 'in', text: 'That’s what it’s about. If a buddy wants to get out this fall, this takes $50 off for both of you:', link: 'tl.ink/mike-50' },
      { side: 'out', text: 'Sending it to Chris now' }
    ] },
    { who: { ...DANA, label: 'Mike’s phone' }, time: '10:30', msgs: [
      { side: 'sys', text: 'Thu, Aug 6 · next season' },
      { side: 'in', text: 'Snook season opens next month. Your date from last year — Sat, Sept 12 — is open again. Reply YES and I’ll hold it.' },
      { side: 'out', text: 'YES' },
      { side: 'in', text: 'Held. Deposit link’s on the way. Tight lines. — Dana' }
    ] },
    { who: { ...DANA, label: 'Chris’s phone' }, time: '2:15', msgs: [
      { side: 'sys', text: 'Tue, Sep 30 · a cancellation' },
      { side: 'in', text: 'Chris — Sat, Oct 4 just opened up. 6am, half day, $650. You’re one of six I’m texting. First YES gets it.' },
      { side: 'out', text: 'YES' },
      { side: 'in', text: 'It’s yours. Deposit link below — see you at Ramp 3.', link: 'tl.ink/hold/oct4' }
    ] }
  ];

  const steps = $$('.step');
  const flowThread = $('#flowThread');
  const flowAvatar = $('#flowAvatar');
  function renderFlow(i) {
    const f = FLOW[i];
    flowAvatar.textContent = f.who.av;
    flowAvatar.style.background = f.who.av === 'TL' ? 'linear-gradient(135deg, #FF7A3D, #C93F0E)' : '';
    $('#flowName').textContent = f.who.name;
    $('#flowSub').textContent = f.who.sub;
    $('#flowLabel').textContent = f.who.label;
    $('#flowTime').textContent = f.time;
    flowThread.innerHTML = '';
    f.msgs.forEach((m, k) => {
      const el = msgEl(m);
      el.style.animationDelay = reduced ? '0ms' : (k * 140) + 'ms';
      flowThread.appendChild(el);
    });
  }
  // static previews for mobile
  steps.forEach((s, i) => {
    const pv = $('.step__preview', s);
    if (pv) FLOW[i].msgs.forEach((m) => { const el = msgEl(m); el.style.animation = 'none'; pv.appendChild(el); });
  });
  let activeStep = -1;
  const setActive = (i) => {
    if (i === activeStep) return;
    activeStep = i;
    steps.forEach((s) => s.classList.toggle('is-active', +s.dataset.step === i));
    renderFlow(i);
  };
  setActive(0);

  const rail = $('#flowRail');
  const stepsWrap = $('#flowSteps');
  let railRaf = 0;
  function railTick() {
    railRaf = 0;
    const r = stepsWrap.getBoundingClientRect();
    const mid = window.innerHeight * 0.5;
    const p = Math.max(0, Math.min(1, (mid - r.top) / r.height));
    rail.style.height = (p * 100).toFixed(2) + '%';
    // active step = last step whose top has passed 58% of the viewport
    const line = window.innerHeight * 0.58;
    let idx = 0;
    for (let i = 0; i < steps.length; i++) {
      if (steps[i].getBoundingClientRect().top < line) idx = i;
    }
    setActive(idx);
  }
  addEventListener('scroll', () => { if (!railRaf) railRaf = requestAnimationFrame(railTick); }, { passive: true });
  addEventListener('resize', railTick);
  railTick();

  /* ------------------------------------------------------
     Pricing toggle
  ------------------------------------------------------ */
  const bill = $('#billing');
  const applyBilling = (annual) => {
    bill.setAttribute('aria-checked', String(annual));
    $$('.tier__price b').forEach((b) => { b.textContent = '$' + b.dataset[annual ? 'y' : 'm']; });
    $$('.tier__per').forEach((p) => { p.textContent = p.dataset[annual ? 'y' : 'm'] || ''; });
  };
  bill.addEventListener('click', () => applyBilling(bill.getAttribute('aria-checked') !== 'true'));
  $('#billMonthly').addEventListener('click', () => applyBilling(false));
  $('#billAnnual').addEventListener('click', () => applyBilling(true));

  /* ------------------------------------------------------
     Calculator
  ------------------------------------------------------ */
  const R = { trips: $('#trips'), price: $('#price'), months: $('#months') };
  const money = (n) => (n < 0 ? '−' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
  const fill = (inp) => { const p = ((inp.value - inp.min) / (inp.max - inp.min)) * 100; inp.style.setProperty('--p', p.toFixed(1) + '%'); };
  function calc() {
    const trips = +R.trips.value, price = +R.price.value, months = +R.months.value;
    $('#tripsOut').textContent = trips;
    $('#priceOut').textContent = money(price);
    $('#monthsOut').textContent = months;
    Object.values(R).forEach(fill);

    const season = trips * months;
    const rebookN = season * 0.06;
    const refN = season * 0.03;
    const openN = (season * 0.05) / 3;
    const rebook = rebookN * price, ref = refN * price, open = openN * price;

    let plan = 'Solo', rate = 59;
    if (trips > 45) { plan = 'Outfit'; rate = 129; }
    if (trips > 100) { plan = 'Lodge'; rate = 299; }
    const cost = rate * months + 19 * (12 - months);
    const total = rebook + ref + open;

    $('#calcTotal').textContent = money(total);
    $('#calcRebook').textContent = money(rebook);
    $('#calcRebookN').textContent = '(' + Math.max(1, Math.round(rebookN)) + ')';
    $('#calcRef').textContent = money(ref);
    $('#calcRefN').textContent = '(' + Math.max(1, Math.round(refN)) + ')';
    $('#calcOpen').textContent = money(open);
    $('#calcOpenN').textContent = '(' + Math.max(1, Math.round(openN)) + ')';
    $('#calcCost').textContent = '−' + money(cost);
    $('#calcPlan').textContent = '(' + plan + (months < 12 ? ' + off-season' : '') + ')';
    $('#calcNet').textContent = money(total - cost);
  }
  Object.values(R).forEach((r) => r.addEventListener('input', calc));
  calc();

  /* ------------------------------------------------------
     Voice picker (setup section + modal)
  ------------------------------------------------------ */
  const VOICES = {
    straight: 'Mike — thanks for coming out today. If you’ve got 30 seconds, a Google review makes a real difference for a one-boat operation: g.page/reel-therapy/review. Anything off, text me here. — Dana',
    friendly: 'Mike! What a day — that last snook was the one. If you’ve got a sec, would you leave us a quick Google review? g.page/reel-therapy/review. It means a lot to a small outfit. And if anything wasn’t right, tell me first. — Dana',
    salty: 'Mike. Six keepers and nobody went in the water — good day. Do an old captain a favor and drop a Google review: g.page/reel-therapy/review. If something bugged you, gripe at me here, not there. — Dana'
  };
  $$('.seg').forEach((seg) => {
    const scope = seg.closest('.voice, .mstep') || document;
    const msg = $('.voice__preview .msg--in', scope);
    $$('button', seg).forEach((b) => b.addEventListener('click', () => {
      $$('button', seg).forEach((x) => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      if (!msg) return;
      msg.style.animation = 'none'; void msg.offsetWidth; msg.style.animation = '';
      msg.textContent = VOICES[b.dataset.voice] || msg.textContent;
    }));
  });

  /* ------------------------------------------------------
     Live clock in the closing CTA
  ------------------------------------------------------ */
  const ctaTime = $('#ctaTime'), ctaPlus = $('#ctaPlus');
  function clock() {
    const now = new Date();
    const f = (d) => ((d.getHours() % 12) || 12) + ':' + String(d.getMinutes()).padStart(2, '0');
    ctaTime.textContent = f(now);
    ctaPlus.textContent = f(new Date(now.getTime() + 60000));
  }
  clock();
  setInterval(clock, 10000);

  /* ------------------------------------------------------
     Signup modal — onboarding preview
  ------------------------------------------------------ */
  const modal = $('#signup');
  const mSteps = $$('.mstep', modal);
  const prog = $$('.modal__prog i', modal);
  const mNext = $('#mNext'), mBack = $('#mBack'), mFine = $('#mFine'), mFoot = $('#mFoot');
  const LABELS = ['Step 1 of 4 · Your outfit', 'Step 2 of 4 · Your calendar', 'Step 3 of 4 · Reviews', 'Step 4 of 4 · Your voice', 'You’re live'];
  const TITLES = ['Let’s get you live before the next trip.', 'Where do your trips live today?', 'Where should reviews go?', 'How do you talk to guests?', 'Welcome aboard.'];
  let mStep = 0, lastFocus = null;

  function setMStep(i) {
    mStep = i;
    mSteps.forEach((s) => s.classList.toggle('on', +s.dataset.mstep === i));
    prog.forEach((p, k) => p.classList.toggle('on', k <= Math.min(i, 3)));
    $('#mStepLbl').textContent = LABELS[i];
    $('#mTitle').textContent = TITLES[i];
    mBack.hidden = i === 0 || i === 4;
    mNext.innerHTML = i === 3 ? 'Finish setup ' + ARROW : i === 4 ? 'Close' : 'Continue ' + ARROW;
    mFine.textContent = i === 4 ? 'Text HELP anytime' : 'No card required';
    mFoot.style.justifyContent = i === 4 ? 'center' : '';
    $('.modal__panel', modal).scrollTop = 0;
  }
  function openModal() {
    lastFocus = document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    setMStep(0);
    setTimeout(() => { const f = $('#fOutfit'); if (f) f.focus({ preventScroll: true }); }, 380);
  }
  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    if (!menu.classList.contains('open')) document.body.classList.remove('no-scroll');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  $$('[data-open="signup"]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); setMenu(false); openModal(); }));
  $$('[data-close]', modal).forEach((b) => b.addEventListener('click', closeModal));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (modal.classList.contains('open')) closeModal(); else if (menu.classList.contains('open')) setMenu(false); }
  });
  mNext.addEventListener('click', () => { if (mStep === 4) closeModal(); else setMStep(mStep + 1); });
  mBack.addEventListener('click', () => setMStep(Math.max(0, mStep - 1)));
  $('#mForm').addEventListener('submit', (e) => { e.preventDefault(); if (mStep < 4) setMStep(mStep + 1); else closeModal(); });
  $$('.picks button', modal).forEach((b) => b.addEventListener('click', () => {
    $$('.picks button', modal).forEach((x) => x.setAttribute('aria-pressed', 'false'));
    b.setAttribute('aria-pressed', 'true');
  }));
  // simple focus trap
  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    const f = $$('button:not([hidden]), input, [href]', modal).filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* ------------------------------------------------------
     Sign-off
  ------------------------------------------------------ */
  try { console.log('%cTight lines.', 'color:#F4581C;font:700 16px Archivo,sans-serif'); } catch (_) {}
})();
