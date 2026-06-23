/* ================================================================
   CURSOR.JS — Custom cursor + magnetic buttons
   Desktop only — auto-disabled on touch devices
   MIROWSKI BARBERSHOP
================================================================ */
const CursorModule = (() => {
  const HOVERABLES = 'a, button, .service-card, .benefit-card, .gallery__item, .filter-btn, .lang-btn, .lightbox__close, .lightbox__prev, .lightbox__next';
  const EASE       = 0.10;   // ring lag factor
  const MAGNETIC_STRENGTH = 0.38;

  let mx = -200, my = -200;  // real mouse
  let rx = -200, ry = -200;  // ring (lagged)
  let rafId = null;
  let hidden = true;

  const wrap  = document.getElementById('cursor');
  const dot   = document.querySelector('.cursor__dot');
  const ring  = document.querySelector('.cursor__ring');

  /* ── Lerp helper ── */
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ── RAF loop ── */
  const loop = () => {
    rx = lerp(rx, mx, EASE);
    ry = lerp(ry, my, EASE);

    dot.style.left  = mx + 'px';
    dot.style.top   = my + 'px';
    ring.style.left = rx + 'px';
    ring.style.top  = ry + 'px';

    rafId = requestAnimationFrame(loop);
  };

  /* ── Mouse tracking ── */
  const onMove = e => {
    mx = e.clientX;
    my = e.clientY;
    if (hidden) {
      hidden = false;
      wrap.style.opacity = '1';
    }
  };

  /* ── Hover state ── */
  const onOver = e => {
    if (e.target.closest(HOVERABLES)) wrap.classList.add('cursor--hover');
  };
  const onOut = e => {
    if (e.target.closest(HOVERABLES)) wrap.classList.remove('cursor--hover');
  };

  /* ── Click flash ── */
  const onDown = () => dot.classList.add('is-clicking');
  const onUp   = () => dot.classList.remove('is-clicking');

  /* ── Magnetic buttons ── */
  const setupMagnetic = () => {
    document.querySelectorAll('.magnetic').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r  = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width  / 2)) * MAGNETIC_STRENGTH;
        const dy = (e.clientY - (r.top  + r.height / 2)) * MAGNETIC_STRENGTH;

        if (typeof gsap !== 'undefined') {
          gsap.to(el, { x: dx, y: dy, duration: 0.4, ease: 'power2.out' });
        } else {
          el.style.transform = `translate(${dx}px,${dy}px)`;
        }
      });

      el.addEventListener('mouseleave', () => {
        if (typeof gsap !== 'undefined') {
          gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1,0.45)' });
        } else {
          el.style.transform = '';
        }
      });
    });
  };

  const init = () => {
    if (!wrap || !dot || !ring) return;

    /* Start hidden, reveal on first mouse move */
    wrap.style.opacity    = '0';
    wrap.style.transition = 'opacity 0.3s';

    document.addEventListener('mousemove',   onMove);
    document.addEventListener('mouseover',   onOver);
    document.addEventListener('mouseout',    onOut);
    document.addEventListener('mousedown',   onDown);
    document.addEventListener('mouseup',     onUp);

    /* Pause RAF when tab hidden */
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { cancelAnimationFrame(rafId); rafId = null; }
      else loop();
    });

    loop();
    setupMagnetic();
  };

  return { init };
})();
