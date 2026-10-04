(() => {
  const M = window.Modro;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const hasGsap = !!window.gsap;

  // ---- subscription form (prototype: validates, never sends) ----
  const form = document.querySelector('.sub');
  if (form) {
    const input = form.querySelector('input');
    const msg = form.querySelector('.sub__msg');
    const btn = form.querySelector('button');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      msg.className = 'sub__msg';
      if (!input.value || !input.checkValidity()) {
        input.setAttribute('aria-invalid', 'true');
        msg.classList.add('is-error');
        msg.textContent = 'Táto adresa nevyzerá ako e‑mail.';
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      btn.disabled = true;
      msg.textContent = 'Tlačím…';
      setTimeout(() => {
        btn.disabled = false;
        msg.textContent = 'Hotovo. (Toto je návrh dizajnu, adresa sa nikam neodoslala.)';
        form.reset();
      }, 700);
    });
  }

  if (!M) return;

  // ---- footer wordmark is cut from printed cloth ----
  const word = document.querySelector('.foot__word');
  if (word) {
    const px = 280, c = document.createElement('canvas');
    c.width = c.height = px;
    const x = c.getContext('2d');
    M.stamp(x, px * 0.25, px * 0.25, 'hviezda', px * 0.42, 11, 0, 1, 'white');
    M.stamp(x, px * 0.75, px * 0.75, 'hviezda', px * 0.42, 12, 0, 1, 'white');
    M.stamp(x, px * 0.75, px * 0.25, 'hviezda', px * 0.22, 13, 0, 1, 'violet');
    M.stamp(x, px * 0.25, px * 0.75, 'hviezda', px * 0.22, 14, 0, 1, 'violet');
    word.style.backgroundColor = 'var(--bg-3)';
    word.style.backgroundImage = `url(${c.toDataURL()})`;
  }

  // ---- post swatches ----
  const swatches = [...document.querySelectorAll('.swatch')];
  if (swatches.length) {
    const ro = new ResizeObserver((es) => es.forEach((e) => M.swatch(e.target, e.target.dataset.seed)));
    swatches.forEach((s) => ro.observe(s));
  }

  // ---- the cloth: you hold the block ----
  const hero = document.querySelector('.hero');
  const cloth = hero && hero.querySelector('.cloth');
  if (cloth) {
    const ctx = cloth.getContext('2d');
    const ghost = hero.querySelector('.ghost');
    const inks = [...hero.querySelectorAll('.block')];
    const motif = 'hviezda';
    let ink = 'white';
    let stamps = [];
    let dpr = 1, size = 100;
    let seedN = 1;

    function measure() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cloth.width = Math.round(hero.clientWidth * dpr);
      cloth.height = Math.round(hero.clientHeight * dpr);
      size = Math.max(72, Math.min(132, hero.clientWidth * 0.075));
      ghost.style.width = ghost.style.height = size + 'px';
      ghost.style.margin = `${-size / 2}px 0 0 ${-size / 2}px`;
      drawGhost();
    }
    function paint(s) {
      M.stamp(ctx, s.x * dpr, s.y * dpr, s.type, s.size * dpr, s.seed, s.rot, s.scale, s.ink || 'white');
    }
    function redraw() { ctx.clearRect(0, 0, cloth.width, cloth.height); stamps.forEach(paint); }
    function add(x, y, type, sz = size, extra = {}) {
      const s = { x, y, type, size: sz, ink, seed: seedN++ * 7919, rot: (Math.random() - 0.5) * 0.08, scale: 0.97 + Math.random() * 0.06, ...extra };
      stamps.push(s); paint(s);
      return s;
    }

    // ink picker: the octagram in each ink
    inks.forEach((b) => {
      const cv = b.querySelector('canvas');
      cv.width = cv.height = 88;
      cv.getContext('2d').drawImage(M.face(motif, 88, b.dataset.ink), 0, 0);
    });
    function select(b) {
      inks.forEach((o) => { const on = o === b; o.classList.toggle('is-on', on); o.setAttribute('aria-checked', on); o.tabIndex = on ? 0 : -1; });
      ink = b.dataset.ink; drawGhost();
    }
    inks.forEach((b, i) => {
      b.tabIndex = i ? -1 : 0;
      b.addEventListener('click', () => select(b));
      b.addEventListener('keydown', (e) => {
        const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!d) return;
        e.preventDefault();
        const n = inks[(i + d + inks.length) % inks.length];
        select(n); n.focus();
      });
    });

    // ghost: an outline of the block you hold, only for fine pointers
    const ghostCanvas = document.createElement('canvas');
    ghost.appendChild(ghostCanvas);
    function drawGhost() {
      const px = Math.round(size * dpr);
      ghostCanvas.width = ghostCanvas.height = px;
      ghostCanvas.getContext('2d').drawImage(M.face(motif, px, ink), 0, 0);
    }
    const g = { x: 0, y: 0, tx: 0, ty: 0, on: false, raf: 0 };
    function ghostLoop() {
      g.x += (g.tx - g.x) * (reduced ? 1 : 0.22);
      g.y += (g.ty - g.y) * (reduced ? 1 : 0.22);
      ghost.style.transform = `translate(${g.x}px, ${g.y}px)`;
      g.raf = g.on ? requestAnimationFrame(ghostLoop) : 0;
    }
    if (fine) {
      cloth.classList.add('has-ghost');
      cloth.addEventListener('pointerenter', (e) => { g.on = true; g.x = g.tx = e.offsetX; g.y = g.ty = e.offsetY; ghost.classList.add('is-on'); if (!g.raf) ghostLoop(); });
      cloth.addEventListener('pointerleave', () => { g.on = false; ghost.classList.remove('is-on'); });
    }

    // printing
    let last = null, down = null;
    const pos = (e) => { const r = cloth.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    function press(p) {
      add(p.x, p.y, motif);
      last = p;
      if (hasGsap && !reduced && fine) gsap.fromTo(ghost, { scale: 0.86 }, { scale: 1, duration: 0.5, ease: 'expo.out' });
    }
    cloth.addEventListener('pointerdown', (e) => {
      const p = pos(e);
      if (e.pointerType === 'touch') { down = p; return; }
      cloth.setPointerCapture(e.pointerId);
      press(p);
    });
    cloth.addEventListener('pointermove', (e) => {
      const p = pos(e);
      g.tx = p.x; g.ty = p.y;
      if (e.pointerType === 'touch' || !(e.buttons & 1) || !last) return;
      if (Math.hypot(p.x - last.x, p.y - last.y) >= size * 1.02) press(p);
    });
    cloth.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch' && down) { const p = pos(e); if (Math.hypot(p.x - down.x, p.y - down.y) < 10) press(p); }
      down = null; last = null;
    });

    // auto repeat, avoiding the label and the press
    function blockedBy() {
      const hr = hero.getBoundingClientRect();
      return [hero.querySelector('.label'), hero.querySelector('.press')].filter(Boolean).map((el) => {
        const r = el.getBoundingClientRect();
        return { l: r.left - hr.left, t: r.top - hr.top, r: r.right - hr.left, b: r.bottom - hr.top };
      });
    }
    function printRepeat(animated) {
      const rects = blockedBy();
      const w = hero.clientWidth, h = hero.clientHeight;
      const skip = (x, y, s) => rects.some((q) => x > q.l - s * 0.55 && x < q.r + s * 0.55 && y > q.t - s * 0.55 && y < q.b + s * 0.55);
      // big white octagrams with small violet ones dropped between them
      const list = M.repeat(w, h, size, 1.16, ['big', 'small'], (Math.random() * 1e9) | 0, skip)
        .map((s) => (s.type === 'small' ? { ...s, type: motif, size: size * 0.5, ink: 'violet' } : { ...s, type: motif, size, ink: 'white' }))
        .sort((a, b) => (a.x + a.y * 0.5) - (b.x + b.y * 0.5));
      if (!animated) { list.forEach((s) => add(s.x, s.y, s.type, s.size, s)); return Promise.resolve(); }
      return new Promise((done) => {
        const t0 = performance.now(), dur = 1500;
        const span = list.length ? (list[list.length - 1].x + list[list.length - 1].y * 0.5) || 1 : 1;
        let i = 0;
        const tick = (now) => {
          const p = Math.min(1, (now - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 2);
          while (i < list.length && (list[i].x + list[i].y * 0.5) / span <= eased) { const s = list[i++]; add(s.x, s.y, s.type, s.size, s); }
          if (p < 1) requestAnimationFrame(tick); else { while (i < list.length) { const s = list[i++]; add(s.x, s.y, s.type, s.size, s); } done(); }
        };
        requestAnimationFrame(tick);
      });
    }

    const repeatBtn = hero.querySelector('[data-act="repeat"]');
    const washBtn = hero.querySelector('[data-act="wash"]');
    repeatBtn && repeatBtn.addEventListener('click', () => { repeatBtn.disabled = true; printRepeat(!reduced).then(() => { repeatBtn.disabled = false; }); });
    washBtn && washBtn.addEventListener('click', () => {
      if (reduced || !hasGsap) { stamps = []; redraw(); return; }
      gsap.to(cloth, { opacity: 0, duration: 0.6, ease: 'power2.inOut', onComplete: () => { stamps = []; redraw(); gsap.set(cloth, { opacity: 1 }); } });
    });

    measure();
    let rT, lastW = hero.clientWidth;
    window.addEventListener('resize', () => {
      clearTimeout(rT);
      rT = setTimeout(() => { if (hero.clientWidth === lastW && Math.abs(cloth.height / dpr - hero.clientHeight) < 2) return; lastW = hero.clientWidth; measure(); redraw(); }, 150);
    });

    // entrance: the first repeat is printed while the label settles
    const start = () => printRepeat(!reduced);
    if (document.fonts) document.fonts.ready.then(start); else start();
  }

  if (reduced || !hasGsap) return;
  gsap.registerPlugin(window.ScrollTrigger);
  const ST = window.ScrollTrigger;

  const lenis = new window.Lenis({ lerp: 0.09 });
  lenis.on('scroll', ST.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2) return;
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { duration: 1.3, easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) });
  });

  if (document.querySelector('.label')) {
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .from('.label', { clipPath: 'inset(100% 0 0 0)', duration: 1.2, ease: 'expo.inOut' })
      .from('.label > *', { y: 24, autoAlpha: 0, duration: 1, stagger: 0.08 }, '<0.5')
      .from('.press', { y: 24, autoAlpha: 0, duration: 1 }, '<0.2');
  }
  const artHead = document.querySelector('.art__head');
  if (artHead) gsap.from('.art__head > *', { y: 30, autoAlpha: 0, duration: 1.2, ease: 'expo.out', stagger: 0.08 });

  const q = document.querySelector('.quote__text');
  if (q) gsap.from(q, { y: 40, autoAlpha: 0, filter: 'blur(8px)', duration: 1.3, ease: 'power3.out', scrollTrigger: { trigger: q, start: 'top 85%', once: true } });
  if (document.querySelector('.posts__grid')) {
    gsap.from('.posts__grid li', { y: 50, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.posts__grid', start: 'top 85%', once: true } });
  }

  // horizontal act: the four steps of the craft, in order
  const proc = document.querySelector('.process');
  if (proc) {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 900px)', () => {
      proc.classList.add('is-h');
      const track = proc.querySelector('.process__track');
      const pin = proc.querySelector('.process__pin');
      const dist = () => Math.max(0, track.scrollWidth - pin.clientWidth + parseFloat(getComputedStyle(pin).paddingLeft) * 2);
      const tw = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true },
      });
      gsap.to('.process__bar span', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), scrub: true } });
      return () => { proc.classList.remove('is-h'); tw.kill(); };
    });
  }

  document.fonts && document.fonts.ready.then(() => ST.refresh());
  window.addEventListener('load', () => ST.refresh());
})();
