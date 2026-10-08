(() => {
  const M = window.Modro;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // the masthead fills the screen below the sticky header
  const siteHead = document.querySelector('.site-head');
  const setHeadH = () => siteHead && document.documentElement.style.setProperty('--head-h', siteHead.offsetHeight + 'px');
  setHeadH();
  addEventListener('resize', setHeadH);

  // ---- newsletter form (prototype: validates, never sends) ----
  document.querySelectorAll('.sub').forEach((form) => {
    const input = form.querySelector('input');
    const msg = form.querySelector('.sub__msg');
    const btn = form.querySelector('button');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      msg.className = 'sub__msg';
      if (!input.value || !input.checkValidity()) {
        input.setAttribute('aria-invalid', 'true');
        msg.classList.add('is-error');
        msg.textContent = 'That doesn’t look like an email address.';
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      btn.disabled = true;
      msg.textContent = 'Sending…';
      setTimeout(() => {
        btn.disabled = false;
        msg.textContent = 'Done. (This is a design prototype, nothing was sent.)';
        form.reset();
      }, 700);
    });
  });

  // ---- reading progress on article pages ----
  const bar = document.querySelector('.progress span');
  const article = document.querySelector('.article');
  if (bar && article) {
    const update = () => {
      const r = article.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - innerHeight)));
      bar.style.transform = `scaleX(${p})`;
    };
    addEventListener('scroll', update, { passive: true });
    update();
  }

  if (!M) return;

  // ---- post thumbnails: white prints, deterministic per title ----
  const swatches = [...document.querySelectorAll('.swatch')];
  if (swatches.length) {
    const ro = new ResizeObserver((es) => es.forEach((e) => M.swatch(e.target, e.target.dataset.seed)));
    swatches.forEach((s) => ro.observe(s));
  }

  // ---- printed bands (posts without a picture) ----
  const bands = [...document.querySelectorAll('.printband')];
  if (bands.length) {
    const ro = new ResizeObserver((es) => es.forEach((e) => M.band(e.target)));
    bands.forEach((b) => ro.observe(b));
  }

  // ---- masthead: the cloth prints itself on load, and again on request ----
  const head = document.querySelector('.masthead');
  const cloth = head && head.querySelector('.cloth');
  if (!cloth) return;
  const ctx = cloth.getContext('2d');
  const label = head.querySelector('.masthead__label');
  const btn = head.querySelector('.reprint');
  let dpr = 1, size = 100, stamps = [], job = 0;

  function measure() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cloth.width = Math.round(head.clientWidth * dpr);
    cloth.height = Math.round(head.clientHeight * dpr);
    size = Math.max(64, Math.min(120, head.clientWidth * 0.07));
  }
  const paint = (s) => M.stamp(ctx, s.x * dpr, s.y * dpr, 'hviezda', s.size * dpr, s.seed, s.rot, s.scale);
  const redraw = () => { ctx.clearRect(0, 0, cloth.width, cloth.height); stamps.forEach(paint); };

  function layout() {
    const hr = head.getBoundingClientRect();
    const keep = [label, btn, head.querySelector('.scroll-cue')].filter((el) => el && el.offsetParent !== null).map((el) => {
      const r = el.getBoundingClientRect();
      return { l: r.left - hr.left, t: r.top - hr.top, r: r.right - hr.left, b: r.bottom - hr.top };
    });
    const skip = (x, y, s) => keep.some((q) => x > q.l - s * 0.5 && x < q.r + s * 0.5 && y > q.t - s * 0.5 && y < q.b + s * 0.5);
    return M.repeat(head.clientWidth, head.clientHeight, size, 1.22, ['hviezda'], (Math.random() * 1e9) | 0, skip)
      .map((s) => ({ ...s, size }))
      .sort((a, b) => (a.x + a.y * 0.5) - (b.x + b.y * 0.5));
  }

  // prints sweep in diagonally, from top-left to bottom-right
  function print(animated) {
    const id = ++job;
    stamps = [];
    redraw();
    const list = layout();
    if (!animated) { stamps = list; redraw(); return Promise.resolve(); }
    return new Promise((done) => {
      const t0 = performance.now(), dur = 1500;
      const span = list.length ? (list[list.length - 1].x + list[list.length - 1].y * 0.5) || 1 : 1;
      let i = 0;
      const tick = (now) => {
        if (id !== job) return done();
        const p = Math.min(1, (now - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 2);
        while (i < list.length && (p === 1 || (list[i].x + list[i].y * 0.5) / span <= eased)) { stamps.push(list[i]); paint(list[i++]); }
        if (p < 1) requestAnimationFrame(tick); else done();
      };
      requestAnimationFrame(tick);
    });
  }

  // reprint: the cloth is washed (fades out), then printed again
  function reprint() {
    btn.disabled = true;
    const fade = reduced ? Promise.resolve() : cloth.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450, easing: 'ease-in', fill: 'forwards' }).finished;
    fade.then(() => {
      stamps = []; redraw();
      cloth.getAnimations().forEach((a) => a.cancel());
      return print(!reduced);
    }).then(() => { btn.disabled = false; });
  }
  btn && btn.addEventListener('click', reprint);

  measure();
  let rT, lastW = head.clientWidth;
  addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(() => { if (head.clientWidth === lastW) return; lastW = head.clientWidth; measure(); print(false); }, 150);
  });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => print(!reduced));
})();
