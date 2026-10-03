/* LOM hero: the word is carved into a stone slab, the pointer is a lantern.
   Plain WebGL1, two photographic textures (albedo + normal) and one height map
   rasterised from the real <h1> so the carving sits exactly where the text is. */
(() => {
  const hero = document.querySelector('.hero');
  const canvas = hero && hero.querySelector('.hero__gl');
  const title = hero && hero.querySelector('[data-carve]');
  if (!canvas || !title) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
  if (!gl) return; // CSS fallback stays

  const VERT = `
    attribute vec2 aPos;
    void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FRAG = `
    precision highp float;
    uniform sampler2D uAlb, uNor, uTxt;
    uniform vec2 uRes;
    uniform vec3 uLight;
    uniform float uIntensity, uDpr, uRadius, uTime;

    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1,0)), u.x), mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x), u.y);
    }
    float fbm(vec2 p){
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
      return v;
    }
    vec3 toLin(vec3 c){ return pow(c, vec3(2.2)); }

    void main(){
      vec2 p = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);   // px, top-left origin
      vec2 tuv = p / (420.0 * uDpr);

      // stone body: photographic gravel/limestone, pushed toward cool grey
      vec3 alb = toLin(texture2D(uAlb, tuv).rgb);
      float lum = dot(alb, vec3(0.299, 0.587, 0.114));
      vec3 stone = mix(vec3(lum) * vec3(0.97, 0.98, 1.0), alb, 0.28);
      stone = mix(vec3(0.42), stone, 0.62);          // calm the gravel into a slab
      float big = fbm(p / (620.0 * uDpr));
      stone *= 0.7 + 0.55 * big;

      vec3 nd = texture2D(uNor, tuv).rgb * 2.0 - 1.0;
      nd.y = -nd.y;

      // carving: height from the blurred text raster, gradient -> normal
      vec2 suv = p / uRes;
      vec2 px = vec2(1.5) / uRes;
      float h  = texture2D(uTxt, suv).r;
      float hx = texture2D(uTxt, suv + vec2(px.x, 0.0)).r - texture2D(uTxt, suv - vec2(px.x, 0.0)).r;
      float hy = texture2D(uTxt, suv + vec2(0.0, px.y)).r - texture2D(uTxt, suv - vec2(0.0, px.y)).r;
      float depth = 3.8;
      vec2 carve = clamp(vec2(hx, hy) * depth, -1.1, 1.1);
      stone = mix(stone, vec3(0.5) * vec3(0.98, 0.97, 0.95), h * 0.45); // fresh cut: smoother, paler
      float detail = mix(0.38, 0.1, h);           // chiselled floor is smoother
      vec3 N = normalize(vec3(carve + nd.xy * detail, 1.0));

      vec3 pos = vec3(p, -h * 18.0 * uDpr);
      vec3 Lv = uLight - pos;
      float d = length(Lv);
      vec3 L = Lv / d;
      float diff = max(dot(N, L), 0.0);
      float fill = 0.5 + 0.5 * N.z;                 // soft sky fill keeps shadowed walls from going black
      float r = d / (uRadius * uDpr);
      float att = exp(-r * r * 1.1) + 0.06 / (1.0 + r * r);
      vec3 H = normalize(L + vec3(0.0, 0.0, 1.0));
      float spec = pow(max(dot(N, H), 0.0), 36.0) * 0.12;

      float ao = 1.0 - h * 0.4;
      vec3 lamp = vec3(1.0, 0.9, 0.76);
      vec3 col = stone * (0.05 * ao * fill) + stone * (1.0 - N.z) * 0.06 * att * uIntensity + (stone * diff + spec) * att * lamp * uIntensity * 1.9;

      // vignette into the page colour, then dither to kill banding
      vec2 q = gl_FragCoord.xy / uRes - 0.5;
      col *= 1.0 - dot(q, q) * 0.9;
      col = pow(max(col, 0.0), vec3(1.0 / 2.2));
      col = max(col, vec3(0.071, 0.075, 0.078) * (1.0 - dot(q, q) * 0.6));
      col += (hash(gl_FragCoord.xy + uTime) - 0.5) / 255.0 * 2.0;
      gl_FragColor = vec4(col, 1.0);
    }`;

  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  }
  const vs = shader(gl.VERTEX_SHADER, VERT);
  const fs = shader(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ['uAlb', 'uNor', 'uTxt', 'uRes', 'uLight', 'uIntensity', 'uDpr', 'uRadius', 'uTime']
    .forEach((n) => { U[n] = gl.getUniformLocation(prog, n); });

  function texture(unit, repeat) {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    const wrap = repeat ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, repeat ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    return t;
  }
  function loadImage(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }

  const tAlb = texture(0, true), tNor = texture(1, true), tTxt = texture(2, false);
  gl.uniform1i(U.uAlb, 0); gl.uniform1i(U.uNor, 1); gl.uniform1i(U.uTxt, 2);

  // height map of the carved word, rasterised from the live <h1>
  const txt = document.createElement('canvas');
  const sharp = document.createElement('canvas');
  let dpr = 1, W = 0, H = 0;

  function drawText() {
    const r = title.getBoundingClientRect();
    const hr = hero.getBoundingClientRect();
    const cs = getComputedStyle(title);
    const size = parseFloat(cs.fontSize) * dpr;
    [txt, sharp].forEach((c) => { c.width = W; c.height = H; });
    const sc = sharp.getContext('2d');
    sc.fillStyle = '#000'; sc.fillRect(0, 0, W, H);
    sc.fillStyle = '#fff';
    sc.font = `400 ${size}px ${cs.fontFamily}`;
    sc.textAlign = 'center';
    sc.textBaseline = 'alphabetic';
    // letter-spacing on canvas where supported, so the carving matches the DOM glyphs
    if ('letterSpacing' in sc) sc.letterSpacing = cs.letterSpacing === 'normal' ? '0px' : `${parseFloat(cs.letterSpacing) * dpr}px`;
    const m = sc.measureText(title.textContent);
    const cx = (r.left - hr.left + r.width / 2) * dpr;
    const glyphH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    const contentTop = (r.top - hr.top) * dpr + parseFloat(cs.paddingTop) * dpr;
    const contentH = (r.height - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)) * dpr;
    const baseline = contentTop + (contentH - glyphH) / 2 + m.actualBoundingBoxAscent;
    sc.fillText(title.textContent, cx, baseline);
    // Marcellus is a light face; widen the cut so the chisel has something to bite
    sc.strokeStyle = '#fff';
    sc.lineJoin = 'round';
    sc.lineWidth = size * 0.035;
    sc.strokeText(title.textContent, cx, baseline);

    const tc = txt.getContext('2d');
    tc.fillStyle = '#000'; tc.fillRect(0, 0, W, H);
    // wide soft bevel plus a tighter one: a V-ish chisel profile without a hard cliff
    tc.globalAlpha = 0.7;
    tc.filter = `blur(${Math.max(3, size * 0.019)}px)`;
    tc.drawImage(sharp, 0, 0);
    tc.globalCompositeOperation = 'lighter';
    tc.globalAlpha = 0.3;
    tc.filter = `blur(${Math.max(2, size * 0.011)}px)`;
    tc.drawImage(sharp, 0, 0);
    tc.filter = 'none';
    tc.globalCompositeOperation = 'source-over';
    tc.globalAlpha = 1;

    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, tTxt);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, txt);
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = Math.round(hero.clientWidth * dpr);
    H = Math.round(hero.clientHeight * dpr);
    canvas.width = W; canvas.height = H;
    gl.viewport(0, 0, W, H);
    gl.uniform2f(U.uRes, W, H);
    gl.uniform1f(U.uDpr, dpr);
    drawText();
  }

  // ---- light state ----
  const light = { x: 0, y: 0, z: 190, tx: 0, ty: 0, intensity: 0, radius: 430 };
  let pointerActive = false;
  let visible = true;
  let raf = 0;
  let t0 = performance.now();

  function idleTarget(t) {
    const w = hero.clientWidth, h = hero.clientHeight;
    return { x: w * (0.5 + 0.32 * Math.sin(t * 0.00023)), y: h * (0.42 + 0.18 * Math.sin(t * 0.00041 + 1.3)) };
  }

  function render(now) {
    const t = now - t0;
    if (!pointerActive && !reduced) {
      const it = idleTarget(t);
      light.tx = it.x; light.ty = it.y;
    }
    const k = reduced ? 1 : 0.12;
    light.x += (light.tx - light.x) * k;
    light.y += (light.ty - light.y) * k;

    gl.uniform3f(U.uLight, light.x * dpr, light.y * dpr, light.z * dpr);
    gl.uniform1f(U.uIntensity, light.intensity);
    gl.uniform1f(U.uRadius, light.radius);
    gl.uniform1f(U.uTime, reduced ? 0 : (t % 1000));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function loop(now) {
    render(now);
    raf = visible && !document.hidden ? requestAnimationFrame(loop) : 0;
  }
  function wake() { if (!raf && !reduced) raf = requestAnimationFrame(loop); }

  function onPointer(e) {
    const r = hero.getBoundingClientRect();
    pointerActive = true;
    light.tx = e.clientX - r.left;
    light.ty = e.clientY - r.top;
    if (reduced) render(performance.now());
  }
  hero.addEventListener('pointermove', onPointer, { passive: true });
  hero.addEventListener('pointerdown', onPointer, { passive: true });
  hero.addEventListener('pointerleave', () => { pointerActive = false; t0 = performance.now() - 0; }, { passive: true });

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); }).observe(hero);
  document.addEventListener('visibilitychange', wake);

  // light sinks and dims as the slab scrolls away — exposed for main.js
  window.lomLight = light;

  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); cancelAnimationFrame(raf); raf = 0; hero.classList.remove('gl-on'); });

  Promise.all([
    loadImage('assets/stone-albedo.jpg'),
    loadImage('assets/stone-normal.jpg'),
    document.fonts ? document.fonts.load(`400 100px Marcellus`).catch(() => {}) : Promise.resolve(),
  ]).then(([alb, nor]) => {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    [[tAlb, alb, 0], [tNor, nor, 1]].forEach(([t, img, unit]) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
    });
    resize();
    let rT;
    window.addEventListener('resize', () => { clearTimeout(rT); rT = setTimeout(() => { resize(); if (reduced) render(performance.now()); }, 120); });

    const w = hero.clientWidth, h = hero.clientHeight;
    if (reduced) {
      light.x = light.tx = w * 0.28; light.y = light.ty = h * 0.3; light.intensity = 1;
      hero.classList.add('gl-on');
      render(performance.now());
      return;
    }
    // entrance: the lantern is lit at the left edge and swings in over the slab
    light.x = -w * 0.15; light.y = h * 0.62;
    hero.classList.add('gl-on');
    const start = performance.now();
    const ignite = (now) => {
      const p = Math.min(1, (now - start) / 1800);
      light.intensity = 1 - Math.pow(1 - p, 3);
      if (p < 1) requestAnimationFrame(ignite);
    };
    requestAnimationFrame(ignite);
    window.dispatchEvent(new CustomEvent('lom:lit'));
    wake();
  }).catch(() => { /* textures failed: CSS fallback stays */ });
})();
