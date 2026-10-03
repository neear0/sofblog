(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;
  const hasGsap = !!window.gsap;

  // ---- subscription form (prototype: validates, never sends) ----
  const form = document.querySelector('.sub');
  if (form) {
    const input = form.querySelector('input');
    const msg = form.querySelector('.sub__msg');
    const btn = form.querySelector('button');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      msg.className = 'sub__msg mono';
      if (!input.value || !input.checkValidity()) {
        input.setAttribute('aria-invalid', 'true');
        msg.classList.add('is-error');
        msg.textContent = 'Hm, toto nevyzerá ako e‑mailová adresa.';
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

  // ---- the drawer: pull out a random text ----
  const drawer = document.querySelector('[data-drawer]');
  if (drawer) {
    const cards = [...drawer.querySelectorAll('.card')];
    const btn = drawer.querySelector('.pull');
    const status = drawer.querySelector('[data-drawer-status]');
    let current = -1;
    btn.hidden = false;
    btn.addEventListener('click', () => {
      let next;
      do { next = Math.floor(Math.random() * cards.length); } while (next === current && cards.length > 1);
      cards.forEach((c, i) => {
        const out = i === next;
        c.style.zIndex = out ? 3 : 1;
        c.classList.toggle('is-out', out);
      });
      current = next;
      status.textContent = `Vytiahnutý text: ${cards[next].querySelector('.card__t').textContent}`;
    });
  }

  if (reduced || !hasGsap) return;
  const { gsap } = window;
  gsap.registerPlugin(window.ScrollTrigger);
  const ST = window.ScrollTrigger;

  // ---- smooth scroll ----
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

  // ---- the signature: scroll velocity pulls the pink pass off register ----
  const base = { x: 3, y: 2 };
  const reg = { x: base.x, y: base.y };
  let lastX = '', lastY = '';
  gsap.ticker.add(() => {
    const v = gsap.utils.clamp(-60, 60, lenis.velocity || 0);
    const tx = base.x + v * 0.12;
    const ty = base.y + v * 0.45;
    reg.x += (tx - reg.x) * 0.14;
    reg.y += (ty - reg.y) * 0.14;
    const sx = reg.x.toFixed(1) + 'px', sy = reg.y.toFixed(1) + 'px';
    if (sx !== lastX) { root.style.setProperty('--mx', sx); lastX = sx; }
    if (sy !== lastY) { root.style.setProperty('--my', sy); lastY = sy; }
  });

  // ---- entrance: the sheet goes through the drum twice, blue pass then pink ----
  const blue = document.querySelector('.cover .mast__ink--blue');
  const pink = document.querySelector('.cover .mast__ink--pink');
  if (blue && pink) {
    gsap.timeline({ defaults: { ease: 'expo.inOut' } })
      .from(blue, { clipPath: 'inset(0 0 100% 0)', duration: 1.0 })
      .from(pink, { clipPath: 'inset(0 0 100% 0)', duration: 1.0 }, '<0.35')
      .from(pink, { x: 60, y: -36, duration: 1.4, ease: 'expo.out', clearProps: 'transform' }, '<')
      .from('.cover__lead, .cover__note', { y: 24, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }, '<0.5')
      .from('.card', { y: 120, duration: 1.1, ease: 'expo.out', stagger: 0.07, clearProps: 'transform' }, '<0.1')
      .from('.drawer .pull', { autoAlpha: 0, y: 12, duration: 0.8, ease: 'expo.out' }, '<0.4');
  }

  // ---- section heads print in; contents slide in row by row ----
  gsap.utils.toArray('.sec-head, .foot__grid').forEach((el) => {
    gsap.from(el, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut', scrollTrigger: { trigger: el, start: 'top 85%', once: true } });
  });
  if (document.querySelector('.toc__list')) {
    gsap.from('.toc__list li', { y: 30, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: '.toc__list', start: 'top 85%', once: true } });
  }
  if (document.querySelector('.archive__grid')) {
    gsap.from('.archive__grid li', { y: 60, rotate: (i) => (i % 2 ? 2 : -2), autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.archive__grid', start: 'top 85%', once: true } });
  }
  const artTitle = document.querySelector('.art__title');
  if (artTitle) {
    gsap.from(artTitle, { clipPath: 'inset(0 0 100% 0)', y: 30, duration: 1.2, ease: 'expo.inOut' });
  }

  document.fonts && document.fonts.ready.then(() => ST.refresh());
  window.addEventListener('load', () => ST.refresh());
})();
