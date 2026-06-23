/* ================================================================
   HERO.JS — Three.js particle field + mouse parallax
   Degrades gracefully if Three.js unavailable or mobile
   MIROWSKI BARBERSHOP
================================================================ */
const HeroModule = (() => {
  const GOLD   = 0xC6A769;
  const COUNT  = 1600;
  const SPREAD = 12;

  let scene, camera, renderer, particles;
  let targetRX = 0, targetRY = 0;
  let currentRX = 0, currentRY = 0;
  let raf = null;
  let running = false;

  /* ── Build particle geometry ── */
  const buildParticles = () => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);

    const gold = new THREE.Color(GOLD);
    const white = new THREE.Color(0xF5F5F5);

    for (let i = 0; i < COUNT; i++) {
      const r = Math.random() * SPREAD - SPREAD / 2;
      pos[i * 3]     = (Math.random() - 0.5) * SPREAD * 2.5;
      pos[i * 3 + 1] = (Math.random() - 0.5) * SPREAD * 1.8;
      pos[i * 3 + 2] = (Math.random() - 0.5) * SPREAD * 1.2;

      /* Mix gold and white for depth variation */
      const c = Math.random() > 0.6 ? gold : white;
      col[i * 3]     = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(col, 3));

    const mat = new THREE.PointsMaterial({
      size:         0.045,
      vertexColors: true,
      transparent:  true,
      opacity:      0.6,
      sizeAttenuation: true,
    });

    return new THREE.Points(geo, mat);
  };

  /* ── Init scene ── */
  const initScene = canvas => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;

    scene    = new THREE.Scene();
    camera   = new THREE.PerspectiveCamera(60, w / h, 0.1, 100);
    camera.position.z = 8;

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(w, h, false);
    renderer.setClearColor(0x000000, 0);

    particles = buildParticles();
    scene.add(particles);

    /* Resize */
    const ro = new ResizeObserver(() => {
      const nw = canvas.clientWidth;
      const nh = canvas.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh, false);
    });
    ro.observe(canvas);

    /* Mouse parallax */
    document.addEventListener('mousemove', e => {
      targetRY = (e.clientX / window.innerWidth  - 0.5) * 0.3;
      targetRX = (e.clientY / window.innerHeight - 0.5) * -0.15;
    });

    running = true;
    render();
  };

  /* ── Render loop ── */
  const render = () => {
    if (!running) return;
    raf = requestAnimationFrame(render);

    /* Slow auto-rotation + mouse parallax */
    particles.rotation.y += 0.0006;
    particles.rotation.x += 0.0002;

    /* Lerp camera tilt toward mouse */
    currentRX += (targetRX - currentRX) * 0.04;
    currentRY += (targetRY - currentRY) * 0.04;
    camera.rotation.x = currentRX;
    camera.rotation.y = currentRY;

    renderer.render(scene, camera);
  };

  const init = () => {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    /* Skip on low-end / mobile to preserve performance */
    if (State.isMobile() && window.devicePixelRatio < 2) return;

    /* Wait for full page load — don't block initial render */
    window.addEventListener('load', () => initScene(canvas), { once: true });

    /* Pause when tab hidden */
    document.addEventListener('visibilitychange', () => {
      running = !document.hidden;
      if (running) render();
    });
  };

  return { init };
})();
