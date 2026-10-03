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
      msg.className = 'sub__msg';
      if (!input.value || !input.checkValidity()) {
        input.setAttribute('aria-invalid', 'true');
        msg.classList.add('is-error');
        msg.textContent = 'Táto adresa nevyzerá ako e‑mail. Skús ju prosím skontrolovať.';
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      btn.disabled = true;
      msg.textContent = 'Zapisujem…';
      setTimeout(() => {
        btn.disabled = false;
        msg.classList.add('is-ok');
        msg.textContent = 'Zapísané. (Toto je návrh dizajnu, adresa sa zatiaľ nikam neodosiela.)';
        form.reset();
      }, 700);
    });
  }

  if (reduced || !window.gsap) return;
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
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
  });

  // ---- hero copy continues the lantern's swing ----
  const heroSub = document.querySelector('.hero__sub');
  const heroHint = document.querySelector('.hero__hint');
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: 0.5 });
  if (heroSub) {
    tl.from(heroSub, { yPercent: 40, autoAlpha: 0, filter: 'blur(8px)', duration: 1.4 })
      .from(heroHint, { autoAlpha: 0, duration: 1.2 }, '<0.5');
  }

  // lantern sinks toward the slab as it scrolls away: the light grazes, then goes out
  if (document.querySelector('.hero')) ST.create({
    trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true,
    onUpdate: (self) => {
      const l = window.lomLight;
      if (!l) return;
      l.z = 190 - self.progress * 120;
      l.radius = 430 - self.progress * 160;
    },
  });
  if (document.querySelector('.hero')) gsap.to('.hero__inner', { yPercent: 18, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  // ---- manifesto: words are uncovered like an inscription under a brush ----
  const m = document.querySelector('[data-words]');
  if (m) {
    const words = m.innerHTML.split(/(\s+|&nbsp;)/).map((w) => (/^\s+$|^&nbsp;$/.test(w) ? w : `<span class="w">${w}</span>`)).join('');
    m.innerHTML = words;
    gsap.fromTo(m.querySelectorAll('.w'), { opacity: 0.14 }, {
      opacity: 1, stagger: 0.06, ease: 'none',
      scrollTrigger: { trigger: m, start: 'top 80%', end: 'bottom 45%', scrub: 1 },
    });
  }

  // ---- strata settle one on another ----
  if (document.querySelector('.stratum')) gsap.from('.stratum', {
    yPercent: 30, autoAlpha: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08,
    scrollTrigger: { trigger: '.strata__list', start: 'top 85%', once: true },
  });

  const art = document.querySelector('.article__head');
  if (art) {
    gsap.timeline({ defaults: { ease: 'expo.out' } })
      .from('.article__title', { yPercent: 30, autoAlpha: 0, filter: 'blur(8px)', duration: 1.4 })
      .from('.article__kicker, .article__info', { autoAlpha: 0, y: 16, duration: 1, stagger: 0.08 }, '<0.3');
  }

  document.fonts && document.fonts.ready.then(() => ST.refresh());
  window.addEventListener('load', () => ST.refresh());
})();
