/* ================================================================
   NAV.JS — Sticky header · Mobile menu · Scroll spy
   MIROWSKI BARBERSHOP
================================================================ */
const NavModule = (() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];

  const header    = document.getElementById('header');
  const hamburger = $('.nav__hamburger');
  const mobileNav = document.getElementById('nav-mobile');
  const navLinks  = $$('.nav__link');
  const sections  = $$('main section[id]');

  /* ── Scrolled glass effect ── */
  const tick = () => {
    header?.classList.toggle('is-scrolled', window.scrollY > 50);
    updateActiveLink();
  };

  /* ── Active link via scroll position ── */
  const updateActiveLink = () => {
    const mid = window.scrollY + window.innerHeight * 0.45;
    let current = sections[0]?.id || '';
    sections.forEach(sec => { if (mid >= sec.offsetTop) current = sec.id; });
    navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === `#${current}`));
  };

  /* ── Mobile menu ── */
  const openMenu = () => {
    hamburger?.setAttribute('aria-expanded', 'true');
    hamburger?.classList.add('is-open');
    mobileNav?.classList.add('is-open');
    mobileNav?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('menu-open');
  };

  const closeMenu = () => {
    hamburger?.setAttribute('aria-expanded', 'false');
    hamburger?.classList.remove('is-open');
    mobileNav?.classList.remove('is-open');
    mobileNav?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('menu-open');
  };

  /* ── Smooth-scroll all internal hash links ── */
  const setupLinks = () => {
    $$('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        const target = document.getElementById(link.getAttribute('href').slice(1));
        if (!target) return;
        e.preventDefault();
        closeMenu();
        window.lenis
          ? window.lenis.scrollTo(target, { offset: -72, duration: 1.4 })
          : target.scrollIntoView({ behavior: 'smooth' });
      });
    });
  };

  const init = () => {
    tick();
    window.addEventListener('scroll', tick, { passive: true });

    hamburger?.addEventListener('click', () => {
      hamburger.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
    });

    $$('.nav-mobile__link').forEach(l => l.addEventListener('click', closeMenu));

    document.addEventListener('click', e => {
      if (mobileNav?.classList.contains('is-open') && !header?.contains(e.target)) closeMenu();
    });

    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

    setupLinks();
  };

  return { init, closeMenu };
})();
