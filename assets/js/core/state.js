/* ================================================================
   STATE.JS — Global application state
   MIROWSKI BARBERSHOP
================================================================ */
const State = {
  lang:                 localStorage.getItem('mirowski_lang') || 'pl',
  prefersReducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  isTouch:              'ontouchstart' in window || navigator.maxTouchPoints > 0,
  isMobile:             () => window.innerWidth < 768,

  booking: {
    step:      1,
    serviceId: null,
    barberId:  null,
    date:      null,
    time:      null,
    client:    {}
  },

  admin: { authenticated: false, token: null }
};

window.MirowskiState = State;
