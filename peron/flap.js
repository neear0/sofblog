/* Perón: split-flap board. Every [data-flap] becomes a row of flaps that spin
   through the drum before settling, like a Solari board updating. */
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DRUM = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789:.-';
  const STEP = 70; // ms per flap turn

  // ---- form ----
  const form = document.querySelector('.sub');
  if (form) {
    const input = form.querySelector('input');
    const msg = form.querySelector('.sub__msg');
    const btn = form.querySelector('button');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!input.value || !input.checkValidity()) {
        input.setAttribute('aria-invalid', 'true');
        msg.textContent = 'Neplatná adresa. Skontroluj ju prosím.';
        input.focus();
        return;
      }
      input.removeAttribute('aria-invalid');
      btn.disabled = true;
      msg.textContent = 'Odosielam…';
      setTimeout(() => { btn.disabled = false; msg.textContent = 'Hotovo. (Návrh dizajnu, adresa sa nikam neodoslala.)'; form.reset(); }, 600);
    });
  }

  // ---- one flap ----
  function makeCell(ch = ' ') {
    const c = document.createElement('span');
    c.className = 'flap';
    c.dataset.ch = ch; c.dataset.prev = ch;
    c.textContent = ch;
    return c;
  }
  function setChar(c, ch) {
    if (c.dataset.ch === ch) return;
    c.dataset.prev = c.dataset.ch;
    c.dataset.ch = ch;
    c.textContent = ch;
    c.classList.remove('is-flip');
    void c.offsetWidth; // restart the flip
    c.classList.add('is-flip');
  }

  // ---- the drum: a single ticker drives every flap on the page ----
  const queue = new Set();
  let raf = 0;
  function tick(now) {
    queue.forEach((job) => {
      if (now < job.next) return;
      setChar(job.cell, job.seq.shift());
      job.next = now + STEP;
      if (!job.seq.length) queue.delete(job);
    });
    raf = queue.size ? requestAnimationFrame(tick) : 0;
  }
  function spin(cells, finals, delay = 0) {
    const now = performance.now();
    cells.forEach((cell, i) => {
      const final = finals[i];
      if (reduced) { cell.dataset.prev = final; cell.dataset.ch = final; cell.textContent = final; return; }
      const turns = 3 + Math.floor(Math.random() * 6);
      const seq = [];
      for (let t = 0; t < turns; t++) seq.push(DRUM[1 + Math.floor(Math.random() * (DRUM.length - 1))]);
      seq.push(final);
      queue.add({ cell, seq, next: now + delay + i * 28 });
    });
    if (!raf && queue.size) raf = requestAnimationFrame(tick);
  }

  // ---- build boards from the markup ----
  const narrow = () => innerWidth < 760;
  function wrap(text, n) {
    const words = text.split(/\s+/); const lines = []; let line = '';
    words.forEach((w) => {
      if (!line) line = w.slice(0, n);
      else if ((line + ' ' + w).length <= n) line += ' ' + w;
      else { lines.push(line); line = w.slice(0, n); }
    });
    if (line) lines.push(line);
    return lines.map((l) => l.padEnd(n, ' '));
  }
  const boards = [];
  function build(el) {
    const text = el.dataset.flap.toUpperCase();
    const label = el.textContent.trim();
    el.textContent = '';
    if (!el.closest('[aria-hidden="true"]')) {
      const sr = document.createElement('span'); sr.className = 'sr-only'; sr.textContent = label; el.appendChild(sr);
    }
    let cells = [], finals = [];
    if (el.classList.contains('c-dest')) {
      const n = narrow() ? 14 : 22;
      const box = document.createElement('span');
      box.className = 'flaps flaps--wrap'; box.setAttribute('aria-hidden', 'true'); box.style.setProperty('--n', n);
      wrap(text, n).forEach((ln) => {
        const row = document.createElement('span'); row.className = 'flaps__line';
        [...ln].forEach((ch) => { const c = makeCell(' '); row.appendChild(c); cells.push(c); finals.push(ch); });
        box.appendChild(row);
      });
      el.appendChild(box);
      el.parentElement && (el.parentElement.style.setProperty('--n', n));
    } else {
      const box = document.createElement('span');
      box.className = 'flaps'; box.setAttribute('aria-hidden', 'true');
      [...text].forEach((ch) => { const c = makeCell(' '); box.appendChild(c); cells.push(c); finals.push(ch); });
      el.appendChild(box);
    }
    const b = { el, cells, finals, label, text };
    boards.push(b);
    return b;
  }
  const els = [...document.querySelectorAll('[data-flap]')];
  const built = els.map(build);

  // first update: the board rolls row by row; below-the-fold boards roll when seen
  const io = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    io.unobserve(e.target);
    const b = built.find((x) => x.el === e.target);
    const row = e.target.closest('.row');
    const rowIndex = row ? [...row.parentElement.children].indexOf(row) : 0;
    b && spin(b.cells, b.finals, 150 + rowIndex * 160);
  }), { rootMargin: '0px 0px -5% 0px' });
  built.forEach((b) => io.observe(b.el));

  // hovering a service makes its row update again
  document.querySelectorAll('a.row').forEach((row) => {
    let last = 0;
    const again = () => {
      if (performance.now() - last < 1200) return;
      last = performance.now();
      built.filter((b) => row.contains(b.el)).forEach((b) => spin(b.cells, b.finals));
    };
    row.addEventListener('pointerenter', again);
    row.addEventListener('focus', again);
  });

  // rebuild the destination column when the board changes width class
  let wasNarrow = narrow(), rT;
  addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(() => {
      if (narrow() === wasNarrow) return;
      wasNarrow = narrow();
      built.filter((b) => b.el.classList.contains('c-dest')).forEach((b) => {
        b.el.textContent = b.label; b.el.dataset.flap = b.text;
        const nb = build(b.el);
        Object.assign(b, nb);
        spin(b.cells, b.finals);
      });
    }, 150);
  });

  // ---- live clock: only the digits that change turn over ----
  const clock = document.querySelector('.clock');
  if (clock) {
    clock.textContent = '';
    const box = document.createElement('span'); box.className = 'flaps'; box.setAttribute('aria-hidden', 'true');
    const cells = [...'00:00:00'].map((ch) => { const c = makeCell(ch); box.appendChild(c); return c; });
    const sr = document.createElement('time'); sr.className = 'sr-only';
    clock.append(sr, box);
    const fmt = (d) => [d.getHours(), d.getMinutes(), d.getSeconds()].map((v) => String(v).padStart(2, '0')).join(':');
    const update = () => {
      const s = fmt(new Date());
      [...s].forEach((ch, i) => (reduced ? (cells[i].textContent = cells[i].dataset.ch = ch) : setChar(cells[i], ch)));
      sr.textContent = s.slice(0, 5);
    };
    update();
    setInterval(update, 1000);
  }
})();
