/* ================================================================
   SCROLL.JS — Lenis smooth scroll + ScrollTrigger bridge
   MIROWSKI BARBERSHOP
================================================================ */
const ScrollModule = (() => {
  const init = () => {
    if (typeof Lenis === 'undefined') {
      console.warn('[Mirowski] Lenis not available — native scroll active');
      return;
    }

    const lenis = new Lenis({
      duration:         1.4,
      easing:           t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction:        'vertical',
      gestureDirection: 'vertical',
      smooth:           true,
      smoothTouch:      false,
      touchMultiplier:  2,
    });

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(time => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })();
    }

    window.lenis = lenis;
  };

  return { init };
})();
