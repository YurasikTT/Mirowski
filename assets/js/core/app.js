/* ================================================================
   APP.JS — Initialization orchestrator
   Calls all modules in dependency order after DOM is ready.
   MIROWSKI BARBERSHOP
================================================================ */
document.addEventListener('DOMContentLoaded', () => {

  /* ── 1. Smooth scroll (must be first — others may need lenis) ── */
  ScrollModule.init();

  /* ── 2. Navigation ── */
  NavModule.init();

  /* ── 3. Animations (GSAP + ScrollTrigger) ── */
  AnimationsModule.init();

  /* ── 4. Custom cursor — desktop only ── */
  if (!State.isTouch) CursorModule.init();

  /* ── 5. Section interactions ── */
  ServicesModule.init();
  GalleryModule.init();
  TestimonialsModule.init();

  /* ── 6. Booking wizard ── */
  BookingModule.init();

  /* ── 7. Hero particles — deferred to window.load inside module ── */
  HeroModule.init();

  /* ── Site loader ── */
  const loader = document.getElementById('site-loader');
  if (loader) {
    const hideLoader = () => {
      loader.classList.add('is-done');
      document.body.classList.remove('is-loading');
    };

    if (document.readyState === 'complete') {
      setTimeout(hideLoader, 300);
    } else {
      window.addEventListener('load', () => setTimeout(hideLoader, 300), { once: true });
    }
  }

  /* ── Footer: current year ── */
  const yr = document.getElementById('footer-year');
  if (yr) yr.textContent = new Date().getFullYear();

  /* ── Global: close modal on Escape (backup) ── */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelector('.modal.is-open')
              ?.dispatchEvent(new CustomEvent('modal:close'));
    }
  });

  /* ── Intersection Observer fallback for scroll reveals ── */
  if (typeof gsap === 'undefined') {
    const io = new IntersectionObserver(
      entries => entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('is-visible');
          io.unobserve(en.target);
        }
      }),
      { threshold: 0.15 }
    );
    document.querySelectorAll('.reveal, .animate-fade-up').forEach(el => io.observe(el));
  }

});
