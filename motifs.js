/* modro: printing blocks. Each motif is drawn once as a clean block face,
   then every impression gets its own imperfections: a little rotation,
   uneven pressure and specks where the resist did not take. */
(() => {
  const INKS = { white: '#ecebe6', violet: '#a77dff' };
  const TAU = Math.PI * 2;

  const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

  // ---- block faces, drawn in a unit circle of radius R around (0,0) ----
  const FACES = {
    kvet(c, R) {
      for (let i = 0; i < 8; i++) {
        c.save(); c.rotate((i * TAU) / 8);
        c.beginPath(); c.ellipse(0, -R * 0.47, R * 0.15, R * 0.29, 0, 0, TAU); c.fill();
        c.restore();
        c.save(); c.rotate((i * TAU) / 8 + TAU / 16);
        c.beginPath(); c.arc(0, -R * 0.64, R * 0.05, 0, TAU); c.fill();
        c.restore();
      }
      for (let i = 0; i < 16; i++) {
        const a = (i * TAU) / 16;
        c.beginPath(); c.arc(Math.sin(a) * R * 0.88, -Math.cos(a) * R * 0.88, R * 0.06, 0, TAU); c.fill();
      }
      c.beginPath(); c.arc(0, 0, R * 0.19, 0, TAU); c.fill();
      c.globalCompositeOperation = 'destination-out';
      c.beginPath(); c.arc(0, 0, R * 0.08, 0, TAU); c.fill();
      c.globalCompositeOperation = 'source-over';
    },
    listok(c, R) {
      c.lineCap = 'round';
      c.lineWidth = R * 0.06;
      c.beginPath(); c.moveTo(0, R * 0.95); c.bezierCurveTo(R * 0.12, R * 0.3, -R * 0.12, -R * 0.3, 0, -R * 0.8); c.stroke();
      const leaf = (x, y, dir, len) => {
        const tx = x + dir * len, ty = y - len * 0.55;
        c.beginPath();
        c.moveTo(x, y);
        c.quadraticCurveTo(x + dir * len * 0.2, ty - len * 0.25, tx, ty);
        c.quadraticCurveTo(x + dir * len * 0.85, y + len * 0.1, x, y);
        c.fill();
        c.save();
        c.globalCompositeOperation = 'destination-out';
        c.lineWidth = R * 0.028;
        c.beginPath(); c.moveTo(x + dir * len * 0.12, y - len * 0.05); c.quadraticCurveTo(x + dir * len * 0.5, y - len * 0.25, tx - dir * len * 0.12, ty + len * 0.05); c.stroke();
        c.restore();
      };
      [[0.5, 0.62], [0.05, 0.56], [-0.4, 0.46]].forEach(([y, l]) => { leaf(0, y * R, 1, l * R); leaf(0, y * R - R * 0.08, -1, l * R); });
      c.beginPath(); c.ellipse(0, -R * 0.86, R * 0.1, R * 0.14, 0, 0, TAU); c.fill();
    },
    hviezda(c, R) {
      // octagram: eight spikes, each ending in a separate dot
      c.beginPath();
      for (let i = 0; i < 16; i++) {
        const a = (i * TAU) / 16 - TAU / 4;
        const r = i % 2 ? R * 0.44 : R * 0.8;
        i ? c.lineTo(Math.cos(a) * r, Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      c.closePath(); c.fill();
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8 - TAU / 4;
        c.beginPath(); c.arc(Math.cos(a) * R * 0.94, Math.sin(a) * R * 0.94, R * 0.065, 0, TAU); c.fill();
      }
      c.globalCompositeOperation = 'destination-out';
      c.beginPath(); c.arc(0, 0, R * 0.28, 0, TAU); c.fill();
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8 - TAU / 4;
        c.beginPath(); c.arc(Math.cos(a) * R * 0.56, Math.sin(a) * R * 0.56, R * 0.045, 0, TAU); c.fill();
      }
      c.globalCompositeOperation = 'source-over';
      c.beginPath(); c.arc(0, 0, R * 0.12, 0, TAU); c.fill();
    },
    hrasok(c, R) {
      c.beginPath(); c.arc(0, 0, R * 0.2, 0, TAU); c.fill();
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6;
        c.beginPath(); c.arc(Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5, R * 0.14, 0, TAU); c.fill();
      }
      for (let i = 0; i < 12; i++) {
        const a = (i * TAU) / 12 + TAU / 24;
        c.beginPath(); c.arc(Math.cos(a) * R * 0.84, Math.sin(a) * R * 0.84, R * 0.075, 0, TAU); c.fill();
      }
    },
  };
  const TYPES = ['hviezda'];

  // cached clean faces per type/size
  const cache = new Map();
  function face(type, px, ink = 'white') {
    const key = type + px + ink;
    if (cache.has(key)) return cache.get(key);
    const cv = document.createElement('canvas');
    cv.width = cv.height = px;
    const c = cv.getContext('2d');
    c.translate(px / 2, px / 2);
    c.fillStyle = INKS[ink] || ink; c.strokeStyle = INKS[ink] || ink;
    FACES[type](c, px / 2 * 0.96);
    cache.set(key, cv);
    return cv;
  }

  // one impression: pressure, specks, slight bleed
  const tmp = document.createElement('canvas');
  function impression(type, px, seed, ink = 'white') {
    const r = rng(seed);
    tmp.width = tmp.height = px;
    const c = tmp.getContext('2d');
    c.clearRect(0, 0, px, px);
    c.globalAlpha = 0.92 + r() * 0.08;
    c.shadowColor = ink === 'violet' ? 'rgba(167,125,255,0.5)' : 'rgba(236,235,230,0.5)';
    c.shadowBlur = px * 0.008;
    c.drawImage(face(type, px, ink), 0, 0);
    c.shadowBlur = 0;
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'destination-out';
    // uneven pressure: one side of the block lighter
    const ang = r() * TAU;
    const g = c.createLinearGradient(px / 2 + Math.cos(ang) * px / 2, px / 2 + Math.sin(ang) * px / 2, px / 2 - Math.cos(ang) * px / 2, px / 2 - Math.sin(ang) * px / 2);
    g.addColorStop(0, `rgba(0,0,0,${0.05 + r() * 0.14})`);
    g.addColorStop(0.6, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, px, px);
    // specks where the resist did not take
    const n = Math.round(px * 0.9);
    for (let i = 0; i < n; i++) {
      c.globalAlpha = 0.35 + r() * 0.65;
      c.beginPath();
      c.arc(r() * px, r() * px, 0.4 + r() * px * 0.012, 0, TAU);
      c.fill();
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    return tmp;
  }

  function stamp(ctx, x, y, type, px, seed, rot = 0, scale = 1, ink = 'white') {
    const im = impression(type, Math.round(px), seed, ink);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    ctx.drawImage(im, -px / 2, -px / 2, px, px);
    ctx.restore();
  }

  // a half-drop repeat filling a rect, with an optional exclusion test
  function repeat(w, h, size, gap, motifs, seed, skip) {
    const r = rng(seed);
    const step = size * gap;
    const out = [];
    for (let col = -1, x = step / 2 - step; x < w + step; col++, x += step) {
      const drop = col % 2 ? step / 2 : 0;
      for (let row = 0, y = step / 2 - step + drop; y < h + step; row++, y += step) {
        if (skip && skip(x, y, size)) continue;
        out.push({ x, y, type: motifs[(Math.abs(col) + row) % motifs.length], seed: (r() * 1e9) | 0, rot: (r() - 0.5) * 0.06, scale: 0.97 + r() * 0.06 });
      }
    }
    return out;
  }

  // a swatch for a blog post, deterministic from its title: violet octagrams on black cloth
  function swatch(canvas, title) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    canvas.width = w; canvas.height = h;
    const c = canvas.getContext('2d');
    const r = rng(hashStr(title));
    const size = Math.min(w, h * 1.33) * (0.2 + r() * 0.12);
    const gap = 1.15 + r() * 0.35;
    repeat(w, h, size, gap, ['hviezda'], hashStr(title) ^ 0x9e37).forEach((s) => {
      stamp(c, s.x, s.y, 'hviezda', size, s.seed, s.rot, s.scale, 'violet');
    });
  }


  // a narrow printed band: one row of octagrams, used where a post has no picture
  function band(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    canvas.width = w; canvas.height = h;
    const c = canvas.getContext('2d');
    const size = h * 0.72, step = size * 1.35;
    const r = rng(7);
    for (let x = size * 0.6, i = 0; x < w + size; x += step, i++) {
      stamp(c, x, h / 2, 'hviezda', i % 2 ? size * 0.62 : size, (r() * 1e9) | 0, (r() - 0.5) * 0.06, 1, 'violet');
    }
  }


  // a cover for a post without a picture: one large violet print, cropped and turned
  // differently for every title, with a few small white ones as overspray
  function cover(canvas, title) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
    if (!w || !h) return;
    canvas.width = w; canvas.height = h;
    const c = canvas.getContext('2d');
    const r = rng(hashStr(title));
    const big = Math.max(w, h) * (0.62 + r() * 0.3);
    const x = w * (0.62 + r() * 0.3), y = h * (0.3 + r() * 0.5);
    stamp(c, x, y, 'hviezda', big, hashStr(title), r() * Math.PI, 1, 'violet');
    const n = 2 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const s = Math.min(w, h) * (0.08 + r() * 0.08);
      stamp(c, w * (0.6 + r() * 0.34), h * (0.08 + r() * 0.3), 'hviezda', s, (r() * 1e9) | 0, r() * Math.PI, 1, 'white');
    }
  }

  window.Modro = { TYPES, INKS, stamp, face, repeat, swatch, band, cover, rng, hashStr };
})();
