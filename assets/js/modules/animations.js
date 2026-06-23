/* ================================================================
   ANIMATIONS.JS — GSAP entrance · ScrollTrigger reveals ·
                   Stats counter · Section stagger
   MIROWSKI BARBERSHOP
================================================================ */
const AnimationsModule = (() => {
  const EASE    = 'cubic-bezier(0.22,1,0.36,1)';
  const EASE_G  = 'power4.out';           // GSAP equivalent
  const DUR     = 0.9;
  const DUR_S   = 1.15;

  /* ── Manual char splitter (no paid SplitText needed) ── */
  const splitChars = el => {
    const original = el.textContent;
    el.setAttribute('aria-label', original);
    el.innerHTML = [...original].map(ch =>
      `<span class="split-char" aria-hidden="true" style="display:inline-block">${ch === ' ' ? '&nbsp;' : ch}</span>`
    ).join('');
    return [...el.querySelectorAll('.split-char')];
  };

  /* ── Hero entrance timeline ── */
  const heroEntrance = () => {
    const tl = gsap.timeline({ delay: 0.2 });

    /* Title — split each line into chars and stagger */
    const titleLines = [...document.querySelectorAll('.hero__title-line')];
    titleLines.forEach(line => {
      const chars = splitChars(line);
      tl.from(chars, {
        y:        90,
        opacity:  0,
        duration: DUR_S,
        stagger:  0.028,
        ease:     EASE_G,
      }, '<0.12');
    });

    /* Eyebrow */
    tl.from('.hero__eyebrow', { y: 24, opacity: 0, duration: DUR, ease: EASE_G }, '-=0.7');

    /* Slogan */
    tl.from('.hero__slogan', { y: 20, opacity: 0, duration: DUR, ease: EASE_G }, '-=0.75');

    /* CTAs */
    tl.from('.hero__cta .btn', {
      y:       20,
      opacity: 0,
      duration: DUR,
      stagger: 0.1,
      ease:    EASE_G,
    }, '-=0.7');

    /* Scroll indicator + meta */
    tl.from(['.hero__scroll', '.hero__meta'], {
      opacity:  0,
      y:        12,
      duration: DUR,
      stagger:  0.1,
      ease:     EASE_G,
    }, '-=0.5');

    /* Watermark */
    tl.from('.hero__watermark', { opacity: 0, x: 40, duration: 1.4, ease: EASE_G }, '<');
  };

  /* ── Section headers ── */
  const revealHeaders = () => {
    document.querySelectorAll('.section__eyebrow, .section__title, .section__subtitle').forEach(el => {
      gsap.from(el, {
        scrollTrigger: {
          trigger:  el.closest('.section__header') || el,
          start:    'top 85%',
          once:     true,
        },
        y:        36,
        opacity:  0,
        duration: DUR,
        ease:     EASE_G,
        delay:    el.classList.contains('section__subtitle') ? 0.15 : 0,
      });
    });
  };

  /* ── Benefit cards stagger ── */
  const revealBenefits = () => {
    const cards = document.querySelectorAll('.benefit-card');
    if (!cards.length) return;
    gsap.from(cards, {
      scrollTrigger: { trigger: '.benefits__grid', start: 'top 82%', once: true },
      y:        48,
      opacity:  0,
      duration: DUR,
      stagger:  0.1,
      ease:     EASE_G,
    });
  };

  /* ── Service cards stagger ── */
  const revealServices = () => {
    const cards = document.querySelectorAll('.service-card');
    if (!cards.length) return;
    gsap.from(cards, {
      scrollTrigger: { trigger: '.services__grid', start: 'top 82%', once: true },
      y:        52,
      opacity:  0,
      duration: DUR,
      stagger:  0.08,
      ease:     EASE_G,
    });
  };

  /* ── About section ── */
  const revealAbout = () => {
    gsap.from('.about__media', {
      scrollTrigger: { trigger: '.about__layout', start: 'top 78%', once: true },
      x: -60, opacity: 0, duration: DUR_S, ease: EASE_G,
    });
    gsap.from('.about__body > *', {
      scrollTrigger: { trigger: '.about__layout', start: 'top 78%', once: true },
      x: 40, opacity: 0, duration: DUR, stagger: 0.1, ease: EASE_G,
    });
  };

  /* ── Gallery items ── */
  const revealGallery = () => {
    const items = document.querySelectorAll('.gallery__item');
    if (!items.length) return;
    gsap.from(items, {
      scrollTrigger: { trigger: '.gallery__grid', start: 'top 85%', once: true },
      scale:   0.92,
      opacity: 0,
      duration: DUR,
      stagger:  0.07,
      ease:     EASE_G,
    });
  };

  /* ── Contact section ── */
  const revealContact = () => {
    gsap.from('.contact__info', {
      scrollTrigger: { trigger: '.contact__layout', start: 'top 80%', once: true },
      x: -50, opacity: 0, duration: DUR, ease: EASE_G,
    });
    gsap.from('.contact__map', {
      scrollTrigger: { trigger: '.contact__layout', start: 'top 80%', once: true },
      x: 50, opacity: 0, duration: DUR, ease: EASE_G, delay: 0.1,
    });
  };

  /* ── Stats counter ── */
  const setupCounters = () => {
    document.querySelectorAll('.stat__num[data-count]').forEach(el => {
      const target  = parseInt(el.dataset.count, 10);
      const suffix  = el.dataset.suffix || '';
      const proxy   = { val: 0 };

      gsap.to(proxy, {
        scrollTrigger: { trigger: el, start: 'top 85%', once: true },
        val:      target,
        duration: 1.6,
        ease:     'power2.out',
        onUpdate: () => { el.textContent = Math.round(proxy.val) + suffix; },
        onComplete: () => { el.textContent = target + suffix; },
      });
    });
  };

  /* ── Reduced-motion fallback ── */
  const revealAll = () => {
    document.querySelectorAll(
      '.animate-fade-up, .animate-fade-left, .animate-fade-right, .animate-scale-in, .animate-split'
    ).forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });

    document.querySelectorAll('.stat__num[data-count]').forEach(el => {
      el.textContent = el.dataset.count + (el.dataset.suffix || '');
    });
  };

  const init = () => {
    if (State.prefersReducedMotion) { revealAll(); return; }

    if (typeof gsap === 'undefined') {
      console.warn('[Mirowski] GSAP not loaded — using CSS fallbacks');
      revealAll();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    ScrollTrigger.defaults({ markers: false });

    heroEntrance();
    revealHeaders();
    revealBenefits();
    revealServices();
    revealAbout();
    revealGallery();
    revealContact();
    setupCounters();
  };

  return { init };
})();
