/* ================================================================
   TESTIMONIALS.JS — Infinite marquee via DOM clone
   CSS animation handles motion; JS only clones for continuity
   MIROWSKI BARBERSHOP
================================================================ */
const TestimonialsModule = (() => {
  const init = () => {
    const track = document.getElementById('testimonials-track');
    if (!track) return;

    /* Clone the inner content once — CSS marquee uses -50% translate */
    const clone = track.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    clone.id = 'testimonials-track-clone';
    track.parentElement.appendChild(clone);

    /* Pause on reduced motion */
    if (State.prefersReducedMotion) {
      track.style.animationPlayState  = 'paused';
      clone.style.animationPlayState  = 'paused';
    }

    /* Drag-to-scroll on desktop for manual control */
    setupDrag(track.parentElement);
  };

  /* ── Click-drag scrub ── */
  const setupDrag = container => {
    let isDown = false, startX = 0, scrollLeft = 0;

    container.style.cursor = 'grab';

    container.addEventListener('mousedown', e => {
      isDown = true;
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
      container.style.cursor = 'grabbing';

      /* Pause auto-scroll while dragging */
      container.querySelectorAll('.testimonials__track').forEach(t => {
        t.style.animationPlayState = 'paused';
      });
    });

    container.addEventListener('mouseleave', () => { isDown = false; container.style.cursor = 'grab'; });
    container.addEventListener('mouseup', () => {
      isDown = false;
      container.style.cursor = 'grab';
      container.querySelectorAll('.testimonials__track').forEach(t => {
        t.style.animationPlayState = 'running';
      });
    });

    container.addEventListener('mousemove', e => {
      if (!isDown) return;
      e.preventDefault();
      const x    = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 1.5;
      container.scrollLeft = scrollLeft - walk;
    });
  };

  return { init };
})();
