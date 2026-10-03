(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(pointer: fine)').matches;

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
        msg.textContent = 'CHYBA: zadaj platnú e‑mailovú adresu.';
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      btn.disabled = true;
      msg.textContent = 'ODOSIELAM…';
      setTimeout(() => { btn.disabled = false; msg.textContent = 'OK. (Návrh dizajnu, adresa sa nikam neodoslala.)'; form.reset(); }, 600);
    });
  }

  // ---- lift: which floor are we on ----
  const floors = [...document.querySelectorAll('.lift a')];
  if (floors.length) {
    const map = new Map(floors.map((a) => [document.querySelector(a.getAttribute('href')), a]));
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => {
        if (!e.isIntersecting) return;
        floors.forEach((a) => a.classList.remove('is-here'));
        const a = map.get(e.target);
        if (a) { a.classList.add('is-here'); }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    map.forEach((_, sec) => sec && io.observe(sec));
  }

  // ---- the signature: the five panels of the word share the width ----
  // Archivo's wdth axis runs 62-125. Letters near the pointer widen, the rest give way,
  // and the row always fills the measure exactly, like prefab panels in a frame.
  const word = document.querySelector('[data-breathe]');
  if (word) {
    const letters = [...word.querySelectorAll('span[aria-hidden]')];
    let adv = [], avail = 0;
    const LO = 62, HI = 125;
    const widthOf = (i, w) => adv[i][0] + (adv[i][1] - adv[i][0]) * ((w - LO) / (HI - LO));

    function measure() {
      word.style.fontSize = '';
      const cs = getComputedStyle(word);
      avail = word.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const probe = (w) => letters.map((l) => { l.style.setProperty('--w', w + '%'); return l.getBoundingClientRect().width; });
      let lo = probe(LO), hi = probe(HI);
      // fit the font size so the row can fill the width somewhere between the two extremes
      const target = (lo.reduce((a, b) => a + b) * 0.55 + hi.reduce((a, b) => a + b) * 0.45);
      const fs = parseFloat(cs.fontSize) * (avail / target);
      word.style.fontSize = fs + 'px';
      lo = probe(LO); hi = probe(HI);
      adv = letters.map((_, i) => [lo[i], hi[i]]);
    }
    function solve(shape) {
      // find k so that the widened row fills the available width
      const total = (k) => shape.reduce((s, v, i) => s + widthOf(i, LO + (HI - LO) * Math.min(1, v * k)), 0);
      let a = 0, b = 40;
      for (let n = 0; n < 24; n++) { const m = (a + b) / 2; total(m) > avail ? (b = m) : (a = m); }
      return shape.map((v) => LO + (HI - LO) * Math.min(1, v * a));
    }
    const cur = letters.map(() => 88);
    let target = cur.slice();
    function shapeAt(x) {
      const r = word.getBoundingClientRect();
      return letters.map((l) => {
        const lr = l.getBoundingClientRect();
        const d = (lr.left + lr.width / 2 - (r.left + x)) / r.width;
        return 0.18 + Math.exp(-(d * d) / 0.02);
      });
    }
    function setTarget(x) { target = solve(shapeAt(x)); }
    function apply() { letters.forEach((l, i) => l.style.setProperty('--w', cur[i].toFixed(2) + '%')); }

    measure();
    target = solve(letters.map(() => 1));
    target.forEach((v, i) => { cur[i] = v; });
    apply();

    if (!reduced) {
      let raf = 0;
      const tick = () => {
        let moving = false;
        cur.forEach((v, i) => { const d = target[i] - v; if (Math.abs(d) > 0.05) moving = true; cur[i] = v + d * 0.16; });
        apply();
        raf = moving ? requestAnimationFrame(tick) : 0;
      };
      const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
      if (fine) {
        word.addEventListener('pointermove', (e) => { setTarget(e.clientX - word.getBoundingClientRect().left); kick(); });
        word.addEventListener('pointerleave', () => { target = solve(letters.map(() => 1)); kick(); });
      } else {
        // touch: the wide panel travels with the scroll position
        const onScroll = () => {
          const r = word.getBoundingClientRect();
          const p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height)));
          setTarget(r.width * (0.1 + p * 0.8)); kick();
        };
        addEventListener('scroll', onScroll, { passive: true });
        onScroll();
      }
    }
    let rT;
    addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { measure(); target = solve(letters.map(() => 1)); target.forEach((v, i) => { cur[i] = v; }); apply(); }, 120); });
    document.fonts && document.fonts.ready.then(() => { measure(); target = solve(letters.map(() => 1)); target.forEach((v, i) => { cur[i] = v; }); apply(); });
  }

  if (reduced || !window.gsap) return;
  gsap.registerPlugin(window.ScrollTrigger);

  // entrance: the panels are craned in, in hard steps
  if (word) {
    gsap.from(word.querySelectorAll('span[aria-hidden]'), { yPercent: -110, duration: 0.6, ease: 'steps(5)', stagger: 0.09 });
    gsap.from('.hero__grid .cell', { clipPath: 'inset(0 0 100% 0)', duration: 0.5, ease: 'steps(4)', stagger: 0.08, delay: 0.5 });
  }
  gsap.utils.toArray('.sec__title').forEach((el) => {
    gsap.from(el, { clipPath: 'inset(0 100% 0 0)', duration: 0.6, ease: 'steps(6)', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
  });
  if (document.querySelector('.table')) {
    gsap.from('.table .tr:not(.th)', { xPercent: -6, autoAlpha: 0, duration: 0.4, ease: 'steps(3)', stagger: 0.06, scrollTrigger: { trigger: '.table', start: 'top 85%', once: true } });
  }
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
