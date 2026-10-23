(() => {
  const M = window.Modro;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- generated covers for posts without a picture ----
  if (M) {
    const covers = [...document.querySelectorAll('.cover')];
    const ro = new ResizeObserver((es) => es.forEach((e) => M.cover(e.target, e.target.dataset.seed)));
    covers.forEach((c) => ro.observe(c));
  }

  // ---- read stamps: kept in this browser only ----
  const KEY = 'softprint.read';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; } };
  const save = (list) => { try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) { /* storage blocked: stamps just won't persist */ } };
  const markRead = (id) => { const l = load(); if (!l.includes(id)) { l.push(id); save(l); } };
  const read = load();
  document.querySelectorAll('[data-post]:not(a)').forEach((t) => {
    if (read.includes(t.dataset.post)) t.classList.add('is-read');
  });
  // opening a post from the index counts as reading it
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[data-post]');
    if (a) markRead(a.dataset.post);
  });

  // ---- post: contents follow the reader ----
  const toc = [...document.querySelectorAll('.toc a')];
  if (toc.length) {
    const targets = toc.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
    const set = (id) => toc.forEach((a) => a.classList.toggle('is-on', a.getAttribute('href') === '#' + id));
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) set(e.target.id); });
    }, { rootMargin: '-30% 0px -60% 0px' });
    targets.forEach((t) => io.observe(t));
    set(targets[0] && targets[0].id);
  }

  // ---- post: reaching the end prints a stamp and marks the post as read ----
  const end = document.querySelector('.endstamp');
  const post = document.querySelector('.post2[data-post]');
  if (end && post) {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      end.classList.add('is-stamped');
      if (reduced) end.querySelector('.endstamp__mark').style.cssText = 'opacity:1;transform:none';
      markRead(post.dataset.post);
    }, { threshold: 0.6 });
    io.observe(end);
  }
})();
