/* softprint: every illustration is a two-pass halftone, rendered live.
   Pink and blue are screened at different angles, like a real riso drum,
   and the second pass is printed slightly off register. */
(() => {
  const PINK = '#ff48b0';
  const BLUE = '#3255a4';

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  // ---- tone fields: (x, y) in canvas-width units -> ink 0..1 ----
  const sphere = (cx, cy, r, lx = -0.6, ly = -0.7, base = 0.18) => (x, y) => {
    const dx = (x - cx) / r, dy = (y - cy) / r, d2 = dx * dx + dy * dy;
    if (d2 > 1) return 0;
    const nz = Math.sqrt(1 - d2);
    const lit = clamp(dx * lx + dy * ly + nz * 0.55);
    return clamp(base + (1 - lit) * 0.95);
  };
  const box = (x0, y0, x1, y1, t0, t1 = t0) => (x, y) =>
    (x >= x0 && x <= x1 && y >= y0 && y <= y1 ? t0 + (t1 - t0) * ((y - y0) / (y1 - y0)) : 0);
  const rotBox = (cx, cy, w, h, ang, tone) => (x, y) => {
    const c = Math.cos(-ang), s = Math.sin(-ang);
    const dx = x - cx, dy = y - cy;
    const u = dx * c - dy * s, v = dx * s + dy * c;
    return Math.abs(u) <= w / 2 && Math.abs(v) <= h / 2 ? tone(u / w + 0.5, v / h + 0.5) : 0;
  };
  const sum = (...fs) => (x, y) => clamp(fs.reduce((a, f) => Math.max(a, f(x, y)), 0));

  function screen(ctx, w, h, color, angleDeg, cell, tone, ox = 0, oy = 0) {
    ctx.fillStyle = color;
    const a = (angleDeg * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
    const R = Math.hypot(w, h) / 2 + cell;
    for (let i = -R; i < R; i += cell) {
      for (let j = -R; j < R; j += cell) {
        const x = w / 2 + i * ca - j * sa, y = h / 2 + i * sa + j * ca;
        if (x < -cell || y < -cell || x > w + cell || y > h + cell) continue;
        const t = tone(x / w, y / w);
        if (t <= 0.03) continue;
        const r = cell * 0.5 * Math.sqrt(t) * 1.3;
        ctx.beginPath();
        ctx.arc(x + ox, y + oy, r, 0, 6.2832);
        ctx.fill();
      }
    }
  }
  function solid(ctx, color, draw, ox = 0, oy = 0) {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.fillStyle = color; ctx.strokeStyle = color;
    draw(ctx);
    ctx.restore();
  }

  // ---- the plates ----
  const ART = {
    sun(ctx, w, h, k, mis) {
      screen(ctx, w, h, BLUE, 45, 7 * k, (x, y) => (y > 0.98 ? clamp((y - 0.98) * 3.2) : 0));
      ctx.globalCompositeOperation = 'multiply';
      screen(ctx, w, h, PINK, 15, 7 * k, sphere(0.52, 0.66, 0.34, -0.5, -0.8, 0.22), mis, mis * 0.6);
      solid(ctx, BLUE, (c) => { c.beginPath(); c.arc(w * 0.8, w * 0.34, w * 0.06, 0, 6.2832); c.fill(); });
    },
    waves(ctx, w, h, k, mis) {
      screen(ctx, w, h, BLUE, 45, 6 * k, (x, y) => clamp(0.95 - y * 0.55));
      ctx.globalCompositeOperation = 'multiply';
      screen(ctx, w, h, PINK, 15, 6 * k, box(0.1, 0.78, 0.92, 1.02, 0.9, 0.55), mis, mis * 0.6);
      solid(ctx, BLUE, (c) => {
        for (let i = 0; i < 5; i++) c.fillRect(w * (0.15 + i * 0.15), w * 0.83, w * 0.1, w * 0.07);
      }, mis * 0.4, 0);
    },
    moon(ctx, w, h, k, mis) {
      screen(ctx, w, h, BLUE, 45, 6.5 * k, sphere(0.56, 0.56, 0.34, -0.7, -0.6, 0.12));
      ctx.globalCompositeOperation = 'multiply';
      screen(ctx, w, h, PINK, 15, 6.5 * k, sphere(0.3, 0.98, 0.2, 0.4, -0.8, 0.5), mis, mis * 0.6);
    },
    blocks(ctx, w, h, k, mis) {
      const r = rng(4);
      const fields = [];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) {
        const t = 0.2 + r() * 0.8;
        fields.push(box(0.08 + i * 0.29, 0.1 + j * 0.31, 0.32 + i * 0.29, 0.36 + j * 0.31, t, t * 0.5));
      }
      screen(ctx, w, h, PINK, 15, 7 * k, sum(...fields));
      ctx.globalCompositeOperation = 'multiply';
      solid(ctx, BLUE, (c) => { c.lineWidth = w * 0.02; c.beginPath(); c.moveTo(w * 0.05, h * 0.95); c.lineTo(w * 0.95, h * 0.08); c.stroke(); }, mis, mis * 0.6);
    },
    rings(ctx, w, h, k, mis) {
      screen(ctx, w, h, BLUE, 45, 6 * k, box(0.14, 0.18, 0.86, 1.4, 0.75, 0.95));
      ctx.globalCompositeOperation = 'multiply';
      const r = rng(11);
      solid(ctx, PINK, (c) => {
        for (let i = 0; i < 4; i++) for (let j = 0; j < 6; j++) {
          if (r() < 0.45) c.fillRect(w * (0.2 + i * 0.165), w * (0.25 + j * 0.18), w * 0.1, w * 0.11);
        }
      }, mis, mis * 0.6);
    },
    hill(ctx, w, h, k, mis) {
      screen(ctx, w, h, PINK, 15, 7 * k, sphere(0.62, 0.48, 0.2, -0.4, -0.8, 0.35));
      ctx.globalCompositeOperation = 'multiply';
      const ridge = (x) => 0.86 + Math.sin(x * 5.2 + 0.6) * 0.08 + Math.sin(x * 13) * 0.02;
      screen(ctx, w, h, BLUE, 45, 6 * k, (x, y) => (y > ridge(x) ? clamp(0.55 + (y - ridge(x)) * 1.4) : 0), mis, mis * 0.6);
    },
    tickets(ctx, w, h, k, mis) {
      const r = rng(9);
      const pinks = [], blues = [];
      for (let i = 0; i < 9; i++) {
        const cx = 0.18 + (i % 3) * 0.32 + (r() - 0.5) * 0.08;
        const cy = (h / w) * (0.2 + Math.floor(i / 3) * 0.3 + (r() - 0.5) * 0.06);
        const ang = (r() - 0.5) * 0.7;
        const f = rotBox(cx, cy, 0.28, 0.14, ang, (u, v) => 0.35 + 0.6 * u);
        (i % 2 ? blues : pinks).push(f);
      }
      screen(ctx, w, h, BLUE, 45, 5.5 * k, sum(...blues));
      ctx.globalCompositeOperation = 'multiply';
      screen(ctx, w, h, PINK, 15, 5.5 * k, sum(...pinks), mis, mis * 0.6);
    },
  };

  function render(canvas) {
    const art = ART[canvas.dataset.art];
    if (!art) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    const k = (dpr * Math.max(1, canvas.clientWidth / 420));
    art(ctx, w, h, k, 3 * dpr);
  }

  const canvases = [...document.querySelectorAll('canvas.ht')];
  const ro = new ResizeObserver((entries) => entries.forEach((e) => render(e.target)));
  canvases.forEach((c) => ro.observe(c));
})();
