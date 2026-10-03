(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- subscription form (prototype: validates, never sends) ----
  const form = document.querySelector('.sub');
  if (form) {
    const input = form.querySelector('input');
    const msg = form.querySelector('.sub__msg');
    const btn = form.querySelector('button');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!input.value || !input.checkValidity()) {
        input.setAttribute('aria-invalid', 'true');
        msg.textContent = 'Zadaj prosím platnú e‑mailovú adresu.';
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      btn.disabled = true;
      msg.textContent = 'Odosielam…';
      setTimeout(() => { btn.disabled = false; msg.textContent = 'Hotovo. (Návrh dizajnu, adresa sa nikam neodoslala.)'; form.reset(); }, 600);
    });
  }

  // ---- lines that draw when they enter the view ----
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  document.querySelectorAll('.rule, .posts, .foot__word').forEach((el) => io.observe(el));
  document.querySelectorAll('.posts li').forEach((li, i) => li.style.setProperty('--d', `${i * 0.08}s`));

  // ---- the thread: one line from the top of the page to the footer ----
  const svg = document.querySelector('.thread');
  const path = svg && svg.querySelector('.thread__path');
  const pen = svg && svg.querySelector('.thread__pen');
  const anchors = [...document.querySelectorAll('[data-anchor]')];
  let table = [], total = 0;

  function build() {
    if (!svg || anchors.length < 2) return;
    const doc = document.documentElement;
    svg.style.height = doc.scrollHeight + 'px';
    const W = doc.clientWidth;
    const pts = anchors.map((a) => {
      const r = a.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 + scrollY };
    });
    // start at the logo's pen dot, so the line begins where the brand ends
    const mark = document.querySelector('.brand__mark');
    if (mark) { const r = mark.getBoundingClientRect(); pts.unshift({ x: r.left + r.width * 0.79, y: r.top + r.height * 0.83 + scrollY }); }
    // route like a tram line: run down a margin lane, hop sideways only at a stop
    const gut = parseFloat(getComputedStyle(document.body).getPropertyValue('--gutter')) || 40;
    const laneL = Math.max(6, gut * 0.42), laneR = W - Math.max(6, gut * 0.42);
    const sides = ['left'].concat(anchors.map((a) => a.dataset.anchor));
    const poly = [pts[0]];
    let lane = laneL;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const side = sides[i];
      if (side === 'right') lane = laneR; else if (side === 'left' || side === 'here') lane = laneL;
      const hopY = b.y - Math.min(56, (b.y - a.y) / 3);
      poly.push({ x: lane, y: a.y }, { x: lane, y: hopY }, { x: b.x, y: hopY }, b);
    }
    // drop zero-length legs, then round every corner
    const P = poly.filter((p, i) => i === 0 || Math.hypot(p.x - poly[i - 1].x, p.y - poly[i - 1].y) > 0.5);
    const R = 22;
    let d = `M${P[0].x},${P[0].y}`;
    for (let i = 1; i < P.length - 1; i++) {
      const p0 = P[i - 1], p1 = P[i], p2 = P[i + 1];
      const l1 = Math.hypot(p1.x - p0.x, p1.y - p0.y), l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const r = Math.min(R, l1 / 2, l2 / 2);
      const s1 = { x: p1.x - ((p1.x - p0.x) / l1) * r, y: p1.y - ((p1.y - p0.y) / l1) * r };
      const s2 = { x: p1.x + ((p2.x - p1.x) / l2) * r, y: p1.y + ((p2.y - p1.y) / l2) * r };
      d += ` L${s1.x},${s1.y} Q${p1.x},${p1.y} ${s2.x},${s2.y}`;
    }
    d += ` L${P[P.length - 1].x},${P[P.length - 1].y}`;
    path.setAttribute('d', d);
    total = path.getTotalLength();
    path.style.strokeDasharray = `${total}`;
    // y -> length lookup, so the tip can follow the reader's eye line
    table = [];
    const N = 400;
    for (let i = 0; i <= N; i++) { const l = (total * i) / N; table.push([path.getPointAtLength(l).y, l]); }
    update();
  }
  function lengthAtY(y) {
    let best = 0;
    for (let i = 0; i < table.length; i++) { if (table[i][0] <= y) best = Math.max(best, table[i][1]); }
    return best;
  }
  function update() {
    if (!total) return;
    if (reduced) { path.style.strokeDashoffset = '0'; pen.style.display = 'none'; return; }
    const atBottom = innerHeight + scrollY >= document.documentElement.scrollHeight - 2;
    const l = atBottom ? total : lengthAtY(scrollY + innerHeight * 0.62);
    path.style.strokeDashoffset = `${total - l}`;
    const p = path.getPointAtLength(Math.max(0.01, l));
    pen.setAttribute('cx', p.x); pen.setAttribute('cy', p.y);
  }

  // ---- the construction drawing in "about", drawn by scroll ----
  const construct = document.querySelector('.construct');
  const layers = construct ? [
    [...construct.querySelectorAll('.construct__grid path')],
    [...construct.querySelectorAll('.construct__aux > *')],
    [construct.querySelector('.construct__main')],
  ] : [];
  const dot = construct && construct.querySelector('.construct__dot');
  function drawConstruct() {
    if (!construct) return;
    if (reduced) return;
    const r = construct.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (innerHeight * 0.55 + r.height * 0.5)));
    layers.forEach((els, i) => {
      const t = Math.min(1, Math.max(0, p * layers.length - i * 0.8));
      els.forEach((el) => { el.style.strokeDashoffset = `${1 - t}`; });
    });
    if (dot) { dot.style.transformOrigin = '320px 360px'; dot.style.transform = `scale(${p > 0.92 ? 1 : 0})`; dot.style.transition = 'transform .5s cubic-bezier(.16,1,.3,1)'; }
  }

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); drawConstruct(); ticking = false; });
  }, { passive: true });
  let rT;
  addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(build, 150); });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { build(); drawConstruct(); });
  addEventListener('load', build);
  if (construct && !reduced) drawConstruct();
})();
