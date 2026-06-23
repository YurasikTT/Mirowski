/* ================================================================
   APP.JS — MIROWSKI BARBERSHOP
================================================================ */

/* ================================================================
   §1 STATE
================================================================ */
const State = (() => {
  const _s = {
    lang: 'pl', service: null, barber: null,
    date: null, time: null,
    clientName: '', clientPhone: '', clientEmail: '', notes: '',
  };
  const _listeners = {};
  const get = k => k ? _s[k] : { ..._s };
  const set = (k, v) => {
    if (_s[k] === v) return;
    _s[k] = v;
    (_listeners[k] || []).forEach(fn => fn(v));
  };
  const reset = keys => (keys || Object.keys(_s)).forEach(k => set(k, k === 'lang' ? _s.lang : null));
  const on = (k, fn) => { (_listeners[k] = _listeners[k] || []).push(fn); };
  return { get, set, reset, on };
})();

/* ================================================================
   §2 SHEETS API
================================================================ */
const SheetsAPI = (() => {
  const API_URL = 'https://script.google.com/macros/s/AKfycbwxP6ouOnpLDH4luOUiqeZ_cK2yP8o41uEki-l8yJ8Nt1iCi5YVNlHEutve0WwTGnLVLg/exec';   // ← вставь URL Apps Script после деплоя

  const MOCK_BOOKED = {};

  const request = async (action, data = {}) => {
    if (!API_URL) return mock(action, data);
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action, ...data }),
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return JSON.parse(await res.text());
  };

  const mock = async (action, data) => {
    await new Promise(r => setTimeout(r, 550));
    if (action === 'getSlots')      return MOCK_BOOKED[data.date] || [];
    if (action === 'createBooking') {
      const pool = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 6; i++) code += pool[Math.floor(Math.random() * pool.length)];
      if (!MOCK_BOOKED[data.date]) MOCK_BOOKED[data.date] = [];
      MOCK_BOOKED[data.date].push(data.time);
      return { success: true, confirmationCode: code };
    }
    return { success: true };
  };

  return {
    /* Returns string[] — handles both mock (returns array) and live backend (returns {taken:[]}) */
    getSlots: async (date, barberId) => {
      const res = await request('getSlots', { date, barberId });
      return Array.isArray(res) ? res : (res?.taken || []);
    },
    createBooking: payload         => request('createBooking', payload),
    updateStatus:  (token, id, st) => request('updateStatus', { token, id, status: st }),
    /* Returns barber array from backend, or null if unavailable */
    getBarbers: async () => {
      const res = await request('getBarbers', {});
      return Array.isArray(res?.barbers) ? res.barbers : null;
    },
  };
})();

/* ================================================================
   §3 SMOOTH SCROLL
================================================================ */
const ScrollModule = (() => {
  function init() {
    if (typeof Lenis === 'undefined') return;
    const lenis = new Lenis({
      duration: 1.3,
      easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothTouch: false,
    });
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    window.lenis = lenis;
  }
  return { init };
})();

/* ================================================================
   §4 CURSOR
================================================================ */
const CursorModule = (() => {
  function init() {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    const wrap = document.getElementById('cursor');
    if (!wrap) return;
    const dot  = wrap.querySelector('.cursor__dot');
    const ring = wrap.querySelector('.cursor__ring');
    let mx = 0, my = 0, rx = 0, ry = 0;

    document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
    document.addEventListener('mousedown', () => dot.classList.add('is-clicking'));
    document.addEventListener('mouseup',   () => dot.classList.remove('is-clicking'));

    const hover = 'cursor--hover';
    document.querySelectorAll('a,button,[role="button"],.gallery__item,.service-card').forEach(el => {
      el.addEventListener('mouseenter', () => wrap.classList.add(hover));
      el.addEventListener('mouseleave', () => wrap.classList.remove(hover));
    });

    (function loop() {
      rx += (mx - rx) * .07; ry += (my - ry) * .07;
      dot.style.cssText  = `left:${mx}px;top:${my}px`;
      ring.style.cssText = `left:${rx}px;top:${ry}px`;
      requestAnimationFrame(loop);
    })();
  }
  return { init };
})();

/* ================================================================
   §5 NAV
================================================================ */
const NavModule = (() => {
  function init() {
    const header    = document.querySelector('.header');
    const hamburger = document.querySelector('.nav__hamburger');
    const drawer    = document.querySelector('.nav-mobile');
    const sections  = document.querySelectorAll('section[id]');
    const navLinks  = document.querySelectorAll('.nav__link');

    if (!header) return;

    window.addEventListener('scroll', () => {
      header.classList.toggle('is-scrolled', window.scrollY > 60);
      let active = '';
      sections.forEach(s => { if (s.offsetTop <= window.scrollY + window.innerHeight * .45) active = s.id; });
      navLinks.forEach(a => a.classList.toggle('is-active', (a.getAttribute('href') || '') === '#' + active));
    }, { passive: true });

    hamburger && drawer && hamburger.addEventListener('click', () => {
      const open = drawer.classList.toggle('is-open');
      hamburger.setAttribute('aria-expanded', open);
      document.body.classList.toggle('menu-open', open);
    });

    drawer && drawer.querySelectorAll('.nav-mobile__link').forEach(l =>
      l.addEventListener('click', () => {
        drawer.classList.remove('is-open');
        hamburger && hamburger.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('menu-open');
      })
    );

    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const t = document.querySelector(a.getAttribute('href'));
        if (!t) return;
        e.preventDefault();
        window.lenis ? window.lenis.scrollTo(t, { offset: -72, duration: 1.4 }) : t.scrollIntoView({ behavior: 'smooth' });
      });
    });

    document.querySelectorAll('.magnetic').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * .3, y: (e.clientY - r.top - r.height / 2) * .3, duration: .35, ease: 'power2.out' });
      });
      el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: .6, ease: 'elastic.out(1,.6)' }));
    });
  }
  return { init };
})();

/* ================================================================
   §6 ANIMATIONS
================================================================ */
const AnimationsModule = (() => {
  function init() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    /* Global GSAP defaults — smoother everywhere */
    gsap.defaults({ ease: 'expo.out' });

    gsap.utils.toArray('.animate-fade-up').forEach(el =>
      gsap.fromTo(el,
        { opacity: 0, y: 64 },
        { opacity: 1, y: 0, duration: 1.15, ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 92%', once: true } }
      )
    );
    gsap.utils.toArray('.animate-fade-left').forEach(el =>
      gsap.fromTo(el,
        { opacity: 0, x: -56 },
        { opacity: 1, x: 0, duration: 1.15, ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true } }
      )
    );
    gsap.utils.toArray('.animate-fade-right').forEach(el =>
      gsap.fromTo(el,
        { opacity: 0, x: 56 },
        { opacity: 1, x: 0, duration: 1.15, ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true } }
      )
    );
    gsap.utils.toArray('.animate-scale-in').forEach(el =>
      gsap.fromTo(el,
        { opacity: 0, scale: .86 },
        { opacity: 1, scale: 1, duration: 1.1, ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 90%', once: true } }
      )
    );

    document.querySelectorAll('[data-stagger]').forEach(parent => {
      const items = parent.querySelectorAll(parent.dataset.stagger);
      if (!items.length) return;
      gsap.fromTo(items,
        { opacity: 0, y: 44 },
        { opacity: 1, y: 0, duration: 1.0, ease: 'expo.out',
          stagger: { amount: 0.55, ease: 'power1.inOut' },
          scrollTrigger: { trigger: parent, start: 'top 87%', once: true } }
      );
    });

    /* Parallax — elements with [data-parallax="0.15"] etc. */
    gsap.utils.toArray('[data-parallax]').forEach(el => {
      const speed = parseFloat(el.dataset.parallax || .25);
      gsap.to(el, {
        yPercent: -speed * 55,
        ease: 'none',
        scrollTrigger: {
          trigger: el.closest('section') || el.parentElement,
          start: 'top bottom', end: 'bottom top',
          scrub: 1.4,
        },
      });
    });

    /* Counter — cinematic count-up */
    document.querySelectorAll('.stat__num[data-count]').forEach(el => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      ScrollTrigger.create({
        trigger: el, start: 'top 90%', once: true,
        onEnter() {
          gsap.fromTo({ n: 0 }, { n: target }, {
            duration: 2.4, ease: 'expo.out',
            onUpdate() { el.textContent = Math.round(this.targets()[0].n) + suffix; },
          });
        },
      });
    });
  }
  return { init };
})();

/* ================================================================
   §7 HERO (Three.js particles)
================================================================ */
const HeroModule = (() => {
  let particles, renderer, scene, camera, clock;
  let mx = 0, my = 0;

  function init() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const W = window.innerWidth, H = window.innerHeight;
    clock = new THREE.Clock();
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(65, W / H, .1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    renderer.setSize(W, H);

    const N = 1400;
    const pos   = new Float32Array(N * 3);
    const color = new Float32Array(N * 3);
    const COLS  = [[.776,.655,.412],[.831,.726,.498],[.659,.537,.306],[.961,.961,.961]];

    for (let i = 0; i < N; i++) {
      pos[i*3]   = (Math.random()-.5)*14;
      pos[i*3+1] = (Math.random()-.5)*9;
      pos[i*3+2] = (Math.random()-.5)*8;
      const c = COLS[Math.floor(Math.random()*COLS.length)];
      color[i*3] = c[0]; color[i*3+1] = c[1]; color[i*3+2] = c[2];
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos,   3));
    geo.setAttribute('color',    new THREE.BufferAttribute(color, 3));

    particles = new THREE.Points(geo, new THREE.PointsMaterial({ size: .048, vertexColors: true, transparent: true, opacity: .72, depthWrite: false }));
    scene.add(particles);

    document.addEventListener('mousemove', e => { mx = (e.clientX/W-.5)*2; my = -(e.clientY/H-.5)*2; }, { passive: true });
    window.addEventListener('resize', () => {
      const nW = window.innerWidth, nH = window.innerHeight;
      camera.aspect = nW/nH; camera.updateProjectionMatrix();
      renderer.setSize(nW, nH);
    }, { passive: true });

    (function loop() {
      requestAnimationFrame(loop);
      const t = clock.getElapsedTime();
      particles.rotation.y  = t * .03;
      particles.rotation.x  = t * .01;
      particles.rotation.y += (mx * .12 - particles.rotation.y) * .025;
      particles.rotation.x += (my * .07 - particles.rotation.x) * .025;
      renderer.render(scene, camera);
    })();
  }

  function animateEntrance() {
    if (typeof gsap === 'undefined') {
      document.querySelectorAll('.hero__eyebrow,.hero__title-line,.hero__slogan,.hero__cta > *,.hero__scroll,.hero__meta').forEach(el => { el.style.opacity = '1'; });
      return;
    }
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo('.hero__eyebrow',   { opacity:0, x:-22 },  { opacity:1, x:0,   duration:.8 })
      .fromTo('.hero__title-line',{ opacity:0, y:52  },  { opacity:1, y:0,   duration:.95, stagger:.13 }, '-=.4')
      .fromTo('.hero__slogan',    { opacity:0, y:24  },  { opacity:1, y:0,   duration:.7  }, '-=.5')
      .fromTo('.hero__cta > *',   { opacity:0, y:20  },  { opacity:1, y:0,   duration:.6, stagger:.1 }, '-=.45')
      .fromTo('.hero__scroll',    { opacity:0        },  { opacity:1,        duration:.5  }, '-=.3')
      .fromTo('.hero__meta',      { opacity:0, x:14  },  { opacity:1, x:0,   duration:.6  }, '-=.4');
  }

  return { init, animateEntrance };
})();

/* ================================================================
   §8 SERVICES FILTERS
================================================================ */
const ServicesModule = (() => {
  function init() {
    const filters = document.querySelectorAll('.filter-btn[data-filter]');
    const cards   = document.querySelectorAll('.service-card[data-category]');
    if (!filters.length) return;

    filters.forEach(btn => btn.addEventListener('click', () => {
      filters.forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const f = btn.dataset.filter;
      cards.forEach(c => c.classList.toggle('is-hidden-filter', f !== 'all' && c.dataset.category !== f));
    }));
  }
  return { init };
})();

/* ================================================================
   §9 GALLERY SLIDER + LIGHTBOX  (GSAP-powered transitions)
================================================================ */
const GalleryModule = (() => {
  function init() {
    const track    = document.getElementById('gallery-track');
    const dotsEl   = document.getElementById('gallery-dots');
    const prevBtn  = document.getElementById('gallery-prev');
    const nextBtn  = document.getElementById('gallery-next');
    const lightbox = document.getElementById('lightbox');
    if (!track || typeof gsap === 'undefined') return;

    const slides = [...track.querySelectorAll('.gallery__slide')];
    const total  = slides.length;
    let cur = 0;
    let busy = false;

    // Center all slides via GSAP (replaces CSS translate(-50%,-50%))
    gsap.set(slides, { xPercent: -50, yPercent: -50, scale: 0.5, opacity: 0 });

    // Build dots
    if (dotsEl) {
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'gallery__dot';
        dot.setAttribute('aria-label', `Zdjęcie ${i + 1}`);
        dot.addEventListener('click', () => goTo(i));
        dotsEl.appendChild(dot);
      });
    }

    function sideOffset() {
      return window.innerWidth <= 960 ? 290 : 340;
    }

    // Update CSS classes (z-index, cursor, box-shadow, pointer-events)
    function applyClasses() {
      const dots = dotsEl ? [...dotsEl.querySelectorAll('.gallery__dot')] : [];
      slides.forEach((slide, i) => {
        slide.classList.remove('is-active', 'is-prev', 'is-next');
        const diff = ((i - cur) % total + total) % total;
        if (diff === 0)              slide.classList.add('is-active');
        else if (diff === 1)         slide.classList.add('is-next');
        else if (diff === total - 1) slide.classList.add('is-prev');
      });
      dots.forEach((d, i) => d.classList.toggle('is-active', i === cur));
    }

    // GSAP animates every slide to its correct position/state
    function animateSlides(instant) {
      const ox = sideOffset();
      const mobile = window.innerWidth <= 600;

      slides.forEach((slide, i) => {
        const diff = ((i - cur) % total + total) % total;
        gsap.killTweensOf(slide);

        if (diff === 0) {
          // ── Incoming active: spring-pop with brightness flash ──
          gsap.to(slide, {
            x: 0, y: 0, scale: 1, opacity: 1, rotateY: 0,
            duration: instant ? 0 : 0.95,
            ease: instant ? 'none' : 'elastic.out(1, 0.7)',
          });
          if (!instant) {
            gsap.fromTo(slide,
              { filter: 'brightness(2.4) blur(12px)' },
              { filter: 'brightness(1) blur(0px)', duration: 0.9, ease: 'power3.out', clearProps: 'filter' }
            );
          }

        } else if (diff === 1) {
          // ── Next slide (right) ──
          gsap.to(slide, {
            x: mobile ? window.innerWidth + 60 : ox,
            y: mobile ? 0 : 28,
            scale: mobile ? 0.85 : 0.72,
            opacity: mobile ? 0 : 0.38,
            rotateY: mobile ? 0 : -20,
            duration: instant ? 0 : 0.78,
            ease: instant ? 'none' : 'expo.out',
          });

        } else if (diff === total - 1) {
          // ── Prev slide (left) ──
          gsap.to(slide, {
            x: mobile ? -(window.innerWidth + 60) : -ox,
            y: mobile ? 0 : 28,
            scale: mobile ? 0.85 : 0.72,
            opacity: mobile ? 0 : 0.38,
            rotateY: mobile ? 0 : 20,
            duration: instant ? 0 : 0.78,
            ease: instant ? 'none' : 'expo.out',
          });

        } else {
          // ── Hidden: tuck behind center ──
          gsap.to(slide, {
            x: 0, y: 0, scale: 0.5, opacity: 0, rotateY: 0,
            duration: instant ? 0 : 0.42,
            ease: instant ? 'none' : 'expo.in',
          });
        }
      });
    }

    function goTo(idx) {
      if (busy) return;
      busy = true;
      cur = ((idx % total) + total) % total;
      applyClasses();
      animateSlides(false);
      setTimeout(() => { busy = false; }, 680);
    }

    prevBtn?.addEventListener('click', () => goTo(cur - 1));
    nextBtn?.addEventListener('click', () => goTo(cur + 1));

    slides.forEach(slide => {
      slide.addEventListener('click', () => {
        if (slide.classList.contains('is-prev'))   { goTo(cur - 1); return; }
        if (slide.classList.contains('is-next'))   { goTo(cur + 1); return; }
        if (slide.classList.contains('is-active') && lightbox) openLb();
      });
    });

    // Swipe
    let tx = 0, ty = 0;
    track.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
    track.addEventListener('touchend',   e => {
      const dx = e.changedTouches[0].clientX - tx;
      const dy = e.changedTouches[0].clientY - ty;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 44) goTo(cur + (dx > 0 ? -1 : 1));
    }, { passive: true });

    document.addEventListener('keydown', e => {
      if (lightbox?.classList.contains('is-open')) return;
      if (e.key === 'ArrowLeft')  goTo(cur - 1);
      if (e.key === 'ArrowRight') goTo(cur + 1);
    });

    // ─── Lightbox ───
    let _lbScrollY = 0;

    function openLb() {
      if (!lightbox) return;
      const slide = slides[cur];
      const lbImg = lightbox.querySelector('.lightbox__img');
      const lbCap = lightbox.querySelector('.lightbox__caption');
      const src = slide.querySelector('img')?.src || '';
      const alt = slide.querySelector('img')?.alt || '';
      if (lbImg) { lbImg.style.opacity = '0'; lbImg.src = src; lbImg.alt = alt; lbImg.addEventListener('load', () => { lbImg.style.opacity = '1'; }, { once: true }); }
      if (lbCap) lbCap.textContent = slide.dataset.caption || alt;
      _lbScrollY = window.scrollY;
      document.body.style.top = `-${_lbScrollY}px`;
      document.body.style.width = '100%';
      lightbox.classList.add('is-open');
      document.body.classList.add('modal-open');
      if (window.lenis) window.lenis.stop();
    }
    function closeLb() {
      if (!lightbox) return;
      lightbox.classList.remove('is-open');
      document.body.classList.remove('modal-open');
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo({ top: _lbScrollY, behavior: 'instant' });
      if (window.lenis) window.lenis.start();
    }

    if (lightbox) {
      lightbox.querySelector('.lightbox__close')?.addEventListener('click', closeLb);
      lightbox.querySelector('.lightbox__prev') ?.addEventListener('click', () => { goTo(cur - 1); setTimeout(openLb, 50); });
      lightbox.querySelector('.lightbox__next') ?.addEventListener('click', () => { goTo(cur + 1); setTimeout(openLb, 50); });
      lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLb(); });
      document.addEventListener('keydown', e => {
        if (!lightbox.classList.contains('is-open')) return;
        if (e.key === 'Escape')     closeLb();
        if (e.key === 'ArrowLeft')  { goTo(cur - 1); setTimeout(openLb, 50); }
        if (e.key === 'ArrowRight') { goTo(cur + 1); setTimeout(openLb, 50); }
      });
    }

    // Initial positioning (instant, no animation)
    applyClasses();
    animateSlides(true);
  }

  return { init };
})();

/* ================================================================
   §10 TESTIMONIALS MARQUEE
================================================================ */
const TestimonialsModule = (() => {
  function init() {
    const track = document.getElementById('testimonials-track');
    if (!track || track.dataset.duped) return;
    track.dataset.duped = '1';
    /* Clone children INSIDE the track so translateX(-50%) loops seamlessly.
       Two sibling tracks would stack vertically in block layout = two rows bug. */
    [...track.children].forEach(c => track.appendChild(c.cloneNode(true)));
  }
  return { init };
})();

/* ================================================================
   §11 CALENDAR
================================================================ */
const CalendarModule = (() => {
  const HOURS = { 0:null, 1:{o:9,c:20}, 2:{o:9,c:20}, 3:{o:9,c:20}, 4:{o:9,c:20}, 5:{o:9,c:20}, 6:{o:9,c:17} };
  const MAX_AHEAD = 30;
  const INTERVAL  = 30;
  const MONTHS_PL = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'];

  let viewY, viewM;
  let daysEl, monthEl;

  let _calReady = false;
  let _realBarberIds = ['b1', 'b2']; // updated by BookingModule when live barbers load

  function setBarbers(ids) { if (ids && ids.length) _realBarberIds = ids; }

  function refreshSlots() {
    const ds = State.get('date');
    if (!ds) return;
    loadSlots(new Date(ds + 'T12:00:00'));
  }

  function init() {
    daysEl  = document.getElementById('cal-days');
    monthEl = document.getElementById('cal-month');
    if (!daysEl || !monthEl) return;

    /* Only reset view date on first open, not on back-navigation */
    if (!_calReady) {
      const now = new Date();
      viewY = now.getFullYear();
      viewM = now.getMonth();
      _calReady = true;
    }

    /* Clone to strip stale listeners, then re-attach */
    const prev = document.getElementById('cal-prev');
    const next = document.getElementById('cal-next');
    if (prev) { const c = prev.cloneNode(true); prev.replaceWith(c); c.addEventListener('click', () => navigate(-1)); }
    if (next) { const c = next.cloneNode(true); next.replaceWith(c); c.addEventListener('click', () => navigate(1)); }

    renderCalendar();
  }

  function navigate(dir) {
    viewM += dir;
    if (viewM < 0)  { viewM = 11; viewY--; }
    if (viewM > 11) { viewM = 0;  viewY++; }
    renderCalendar();
  }

  function renderCalendar() {
    if (!daysEl) return;
    monthEl.textContent = MONTHS_PL[viewM] + ' ' + viewY;

    const today   = new Date(); today.setHours(0,0,0,0);
    const maxDate = new Date(today); maxDate.setDate(today.getDate() + MAX_AHEAD);
    const first   = new Date(viewY, viewM, 1);
    const total   = new Date(viewY, viewM+1, 0).getDate();
    const offset  = (first.getDay() + 6) % 7; /* Monday-first */

    daysEl.innerHTML = '';

    for (let i = 0; i < offset; i++) {
      const el = document.createElement('div');
      el.className = 'cal-day is-empty';
      daysEl.appendChild(el);
    }

    for (let d = 1; d <= total; d++) {
      const date = new Date(viewY, viewM, d);
      const dow  = date.getDay();
      const past    = date < today;
      const future  = date > maxDate;
      const blocked = !HOURS[dow] || future;
      const isToday = date.getTime() === today.getTime();
      const ds      = fmtDate(date);
      const active  = State.get('date') === ds;

      const el = document.createElement('div');
      el.className = 'cal-day' + (past||blocked?' is-past':'') + (isToday?' is-today':'') + (active?' is-active':'');
      el.setAttribute('role', 'button');
      el.setAttribute('tabindex', past||blocked?'-1':'0');
      el.textContent = d;

      if (!past && !blocked) {
        const pick = () => {
          State.set('date', ds);
          State.set('time', null);
          renderCalendar();
          loadSlots(date);
        };
        el.addEventListener('click', pick);
        el.addEventListener('keydown', e => (e.key==='Enter'||e.key===' ') && pick());
      }
      daysEl.appendChild(el);
    }
  }

  async function loadSlots(date) {
    const prompt  = document.getElementById('timeslots-prompt');
    const grid    = document.getElementById('timeslots-grid');
    if (!grid) return;
    if (prompt) prompt.style.display = 'none';
    grid.innerHTML = '<div class="step__loading">ładowanie...</div>';

    let taken = [];
    try {
      const bid = State.get('barber')?.id;
      if (!bid || bid === 'any') {
        /* "Any barber" — slot is unavailable only if ALL barbers are busy */
        const results = await Promise.all(
          _realBarberIds.map(id => SheetsAPI.getSlots(fmtDate(date), id).catch(() => []))
        );
        taken = results.reduce((acc, slots) => acc.filter(t => slots.includes(t)), results[0] || []);
      } else {
        taken = await SheetsAPI.getSlots(fmtDate(date), bid);
      }
    } catch {}

    const h     = HOURS[date.getDay()];
    const slots = genSlots(h.o, h.c);
    grid.innerHTML = '';

    if (!slots.length) {
      grid.innerHTML = '<p style="color:var(--muted);font-size:var(--text-sm);padding:var(--sp-4) 0">Brak slotów tego dnia.</p>';
      return;
    }

    slots.forEach(s => {
      const booked = taken.includes(s);
      const active = State.get('time') === s;
      const btn = document.createElement('button');
      btn.className  = 'time-slot' + (booked?' is-booked':'') + (active?' is-active':'');
      btn.textContent = s;
      btn.disabled   = booked;
      if (!booked) btn.addEventListener('click', () => {
        State.set('time', s);
        grid.querySelectorAll('.time-slot').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
      });
      grid.appendChild(btn);
    });
  }

  function genSlots(openH, closeH) {
    const slots = [];
    for (let t = openH*60; t < closeH*60; t += INTERVAL) {
      slots.push(String(Math.floor(t/60)).padStart(2,'0') + ':' + String(t%60).padStart(2,'0'));
    }
    return slots;
  }

  function fmtDate(d) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }

  function reset() { _calReady = false; }

  return { init, reset, setBarbers, refreshSlots };
})();

/* ================================================================
   §12 BOOKING WIZARD
================================================================ */
const BookingModule = (() => {

  const SERVICES = [
    { id:'s1', dur:45,  price:80,  cat:'hair',
      name:{ pl:'Strzyżenie klasyczne',   en:'Classic Haircut',       uk:'Класичне стрижіння' },
      desc:{ pl:'Precyzyjne strzyżenie dopasowane do kształtu twarzy.', en:'Precise cut tailored to your face shape.', uk:'Точна стрижка під форму обличчя.' } },
    { id:'s2', dur:30,  price:60,  cat:'beard',
      name:{ pl:'Stylizacja brody',       en:'Beard Styling',          uk:'Стилізація бороди' },
      desc:{ pl:'Kształtowanie i pielęgnacja brody.', en:'Expert beard shaping and grooming.', uk:'Формування та догляд за бородою.' } },
    { id:'s3', dur:75,  price:130, cat:'combo',
      name:{ pl:'Strzyżenie + Broda',     en:'Haircut + Beard',        uk:'Стрижка + Борода' },
      desc:{ pl:'Kompleksowa pielęgnacja w jednej wizycie.', en:'Complete grooming in one visit.', uk:'Комплексний догляд за один візит.' } },
    { id:'s4', dur:45,  price:90,  cat:'beard',
      name:{ pl:'Golenie brzytwą',        en:'Straight Razor Shave',   uk:'Гоління бритвою' },
      desc:{ pl:'Tradycyjne golenie z gorącym ręcznikiem.', en:'Traditional hot-towel straight razor shave.', uk:'Традиційне гоління з гарячим рушником.' } },
    { id:'s5', dur:30,  price:60,  cat:'hair',
      name:{ pl:'Strzyżenie maszynką',    en:'Clipper Cut',            uk:'Стрижка машинкою' },
      desc:{ pl:'Szybkie precyzyjne strzyżenie maszynką.', en:'Fast and precise clipper cut.', uk:'Швидка та точна стрижка машинкою.' } },
    { id:'s6', dur:90,  price:180, cat:'combo',
      name:{ pl:'Full Package',           en:'Full Package',           uk:'Повний пакет' },
      desc:{ pl:'Strzyżenie, broda, golenie — luksusowy pakiet.', en:'Haircut, beard, shave — luxury package.', uk:'Стрижка, борода, гоління — люксовий пакет.' } },
  ];

  const BARBERS = [
    { id:'any',
      name:{ pl:'Dowolny barber',  en:'Any barber',   uk:'Будь-який барбер' },
      spec:{ pl:'Pierwszy dostępny', en:'First available', uk:'Перший доступний' }, avatar:null },
    { id:'b1',
      name:{ pl:'Mirowski',        en:'Mirowski',     uk:'Міровський' },
      spec:{ pl:'Master Barber',   en:'Master Barber', uk:'Майстер Барбер' }, avatar:'Photos/ЛОГО.jpeg' },
    { id:'b2',
      name:{ pl:'Aleksander',      en:'Aleksander',   uk:'Олександр' },
      spec:{ pl:'Senior Barber',   en:'Senior Barber', uk:'Старший Барбер' }, avatar:null },
  ];

  let modal, currentStep = 1, busy = false;
  let btnBack, btnNext, btnSubmit;
  let progressFill, progressSteps;
  let modalTitle;
  let s1, s2, s3, s4, sSuccess, sError;
  let _liveBarbers = null; /* fetched from backend, replaces hardcoded list */

  const TITLES = {
    pl: ['Wybierz usługę','Wybierz barbera','Data i godzina','Twoje dane'],
    en: ['Choose a service','Choose a barber','Date & time','Your details'],
    uk: ['Оберіть послугу','Оберіть барбера','Дата і час','Ваші дані'],
  };

  let _savedScrollY = 0;
  let _modalWheelBlock = null;
  let _submitting = false;

  function openModal() {
    if (!modal) return;
    State.reset(['service','barber','date','time','clientName','clientPhone','clientEmail','notes']);
    CalendarModule.reset();
    /* iOS scroll-lock: save position, fix body */
    _savedScrollY = window.scrollY;
    document.body.style.top   = `-${_savedScrollY}px`;
    document.body.style.width = '100%';
    modal.classList.add('is-open');
    modal.removeAttribute('aria-hidden');
    document.body.classList.add('modal-open');
    if (window.lenis) window.lenis.stop();
    /* Lenis intercepts wheel events even when stopped — capture them first
       and manually scroll the active step so the modal scrolls normally */
    _modalWheelBlock = (e) => {
      if (!modal.classList.contains('is-open') || !modal.contains(e.target)) return;
      e.stopImmediatePropagation();
      let el = e.target;
      while (el && el !== modal.parentElement) {
        if (el.scrollHeight > el.clientHeight + 1) { el.scrollTop += e.deltaY; return; }
        el = el.parentElement;
      }
    };
    window.addEventListener('wheel', _modalWheelBlock, { capture: true, passive: true });
    showStep(1);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    /* iOS scroll-lock: restore position */
    document.body.style.top   = '';
    document.body.style.width = '';
    window.scrollTo({ top: _savedScrollY, behavior: 'instant' });
    if (_modalWheelBlock) {
      window.removeEventListener('wheel', _modalWheelBlock, { capture: true });
      _modalWheelBlock = null;
    }
    if (window.lenis) window.lenis.start();
  }

  /* ── show/hide step divs ── */
  function showStep(n, dir) {
    if (busy && n !== currentStep) return;
    busy = true;
    currentStep = n;

    const all = [s1,s2,s3,s4,sSuccess,sError];
    const stepMap = [null,s1,s2,s3,s4];

    all.forEach(el => el && el.classList.add('is-hidden'));

    const target = stepMap[n];
    if (target) {
      target.classList.remove('is-hidden');
      /* entrance animation */
      if (typeof gsap !== 'undefined') {
        gsap.fromTo(target, { opacity:0, x: dir==='back'?-22:22 }, { opacity:1, x:0, duration:.32, ease:'power2.out' });
      }
    }

    updateChrome(n);
    populate(n);
    busy = false;
  }

  function updateChrome(n) {
    const lang = State.get('lang') || 'pl';
    const t = TITLES[lang] || TITLES.pl;
    if (modalTitle) modalTitle.textContent = t[n-1] || '';
    if (progressFill) progressFill.style.width = (n/4*100)+'%';
    const stepLabels = { pl:['Usługa','Barber','Termin','Dane'], en:['Service','Barber','Date','Details'], uk:['Послуга','Барбер','Дата','Дані'] };
    const sl = stepLabels[lang] || stepLabels.pl;
    progressSteps && progressSteps.forEach((el,i) => {
      el.classList.toggle('is-active', i+1===n);
      el.classList.toggle('is-done',   i+1<n);
      el.textContent = sl[i];
    });
    if (btnBack)   btnBack.style.display   = n>1 && n<5 ? '' : 'none';
    if (btnNext)   btnNext.style.display   = n<4        ? '' : 'none';
    /* classList because the button may carry is-hidden (which has !important) */
    if (btnSubmit) btnSubmit.classList.toggle('is-hidden', n!==4);
  }

  function populate(n) {
    if (n===1) renderServices();
    if (n===2) renderBarbers();
    if (n===3) { CalendarModule.init(); }
    if (n===4) renderSummary();
  }

  /* — Services — */
  function renderServices() {
    const grid = document.getElementById('modal-services');
    if (!grid) return;
    const lang = State.get('lang') || 'pl';
    grid.innerHTML = '';
    SERVICES.forEach(svc => {
      const sel = State.get('service')?.id === svc.id;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'modal-service-card' + (sel?' is-selected':'');
      btn.innerHTML = `<div class="modal-service-card__name">${svc.name[lang]||svc.name.pl}</div>
        <div class="modal-service-card__meta">
          <span class="modal-service-card__price">${svc.price} <abbr title="złoty">zł</abbr></span>
          <span class="modal-service-card__duration">${svc.dur} min</span>
        </div>`;
      btn.addEventListener('click', () => {
        State.set('service', svc);
        grid.querySelectorAll('.modal-service-card').forEach(c => c.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        setTimeout(() => showStep(2,'forward'), 320);
      });
      grid.appendChild(btn);
    });
  }

  /* — Barbers — */
  /* Resolves name/spec from both string (live backend) and {pl,en,uk} object (hardcoded) */
  function localize(val, lang) {
    if (!val) return '';
    return typeof val === 'object' ? (val[lang] || val.pl || '') : String(val);
  }

  function renderBarbers() {
    const grid = document.getElementById('modal-barbers');
    if (!grid) return;
    const lang = State.get('lang') || 'pl';

    /* Build display list: always include "any barber" first */
    const ANY = BARBERS[0];
    const realBarbers = _liveBarbers
      ? _liveBarbers.filter(b => b.active !== false)
      : BARBERS.slice(1);
    const list = [ANY, ...realBarbers];

    grid.innerHTML = '';
    list.forEach(b => {
      const sel = State.get('barber')?.id === b.id;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'modal-barber-card' + (sel ? ' is-selected' : '');
      const nm = localize(b.name, lang);
      const sp = localize(b.spec, lang);
      const av = b.avatar
        ? `<img src="${b.avatar}" alt="${nm}" class="modal-barber-card__avatar" loading="lazy">`
        : `<div class="modal-barber-card__avatar">&#9986;</div>`;
      btn.innerHTML = `${av}<div class="modal-barber-card__name">${nm}</div><div class="modal-barber-card__spec">${sp}</div>`;
      btn.addEventListener('click', () => {
        State.set('barber', b);
        grid.querySelectorAll('.modal-barber-card').forEach(c => c.classList.remove('is-selected'));
        btn.classList.add('is-selected');
      });
      grid.appendChild(btn);
    });
  }

  /* — Summary — */
  function renderSummary() {
    const el = document.getElementById('booking-summary');
    if (!el) return;
    const svc = State.get('service');
    const bar = State.get('barber');
    const lang = State.get('lang') || 'pl';
    const L = {
      pl:{ svc:'Usługa', bar:'Barber', date:'Data', time:'Godzina', price:'Cena' },
      en:{ svc:'Service', bar:'Barber', date:'Date', time:'Time', price:'Price' },
      uk:{ svc:'Послуга', bar:'Барбер', date:'Дата', time:'Час', price:'Ціна' },
    }[lang] || { svc:'Usługa', bar:'Barber', date:'Data', time:'Godzina', price:'Cena' };
    const svcName = svc?.name?.[lang] || svc?.name?.pl || '—';
    const barName = bar?.name?.[lang] || bar?.name?.pl || '—';
    el.innerHTML = `
      <div class="booking-summary__row"><span class="booking-summary__label">${L.svc}</span><span class="booking-summary__val">${svcName}</span></div>
      <div class="booking-summary__row"><span class="booking-summary__label">${L.bar}</span><span class="booking-summary__val">${barName}</span></div>
      <div class="booking-summary__row"><span class="booking-summary__label">${L.date}</span><span class="booking-summary__val">${State.get('date')||'—'}</span></div>
      <div class="booking-summary__row"><span class="booking-summary__label">${L.time}</span><span class="booking-summary__val">${State.get('time')||'—'}</span></div>
      <div class="booking-summary__row"><span class="booking-summary__label">${L.price}</span><span class="booking-summary__val booking-summary__val--gold">${svc?.price||'—'} zł</span></div>`;
  }

  /* — Validate — */
  function validate() {
    if (currentStep===1 && !State.get('service'))  return shake('Proszę wybrać usługę.');
    if (currentStep===2 && !State.get('barber'))   return shake('Proszę wybrać barbera.');
    if (currentStep===3 && (!State.get('date')||!State.get('time'))) return shake('Proszę wybrać datę i godzinę.');
    if (currentStep===4) {
      const name  = document.getElementById('f-name');
      const phone = document.getElementById('f-phone');
      const terms = document.getElementById('f-terms');
      let ok = true;

      const nv = name?.value.trim();
      setErr('err-name', !nv||nv.length<2 ? 'Minimum 2 znaki.' : '');
      if (!nv||nv.length<2) { name?.classList.add('is-error'); ok=false; }
      else { name?.classList.remove('is-error'); State.set('clientName', nv); }

      const pv = phone?.value.trim();
      const pr = /^[+]?[\d\s\-()]{7,18}$/.test(pv||'');
      setErr('err-phone', !pr ? 'Nieprawidłowy numer.' : '');
      if (!pr) { phone?.classList.add('is-error'); ok=false; }
      else { phone?.classList.remove('is-error'); State.set('clientPhone', pv); }

      const termsOk = terms?.checked;
      setErr('err-terms', !termsOk ? 'Zaakceptuj regulamin.' : '');
      if (!termsOk) ok = false;

      State.set('clientEmail', document.getElementById('f-email')?.value.trim()||'');
      State.set('notes',       document.getElementById('f-notes')?.value.trim()||'');
      if (!ok) {
        const msg = (!nv||nv.length<2) ? 'Wprowadź imię i nazwisko.'
                  : !pr                ? 'Podaj prawidłowy numer telefonu.'
                  :                      'Zaakceptuj regulamin i politykę prywatności.';
        return shake(msg);
      }
    }
    return true;
  }

  /* — Submit — */
  async function submit() {
    if (_submitting || !validate()) return;
    _submitting = true;

    const svc  = State.get('service');
    const bar  = State.get('barber');
    const lang = State.get('lang') || 'pl';

    if (btnSubmit) { btnSubmit.classList.add('is-loading'); btnSubmit.disabled=true; }

    try {
      /* Re-check slot availability right before booking to prevent duplicates */
      const taken = await SheetsAPI.getSlots(State.get('date'), bar?.id || null);
      if (taken.includes(State.get('time'))) {
        shake('Ten termin jest już zajęty. Wybierz inny czas.');
        State.set('time', null);
        showStep(3, 'back');
        return;
      }

      const res = await SheetsAPI.createBooking({
        serviceId:   svc?.id,
        serviceName: localize(svc?.name, lang),
        barberId:    bar?.id,
        barberName:  localize(bar?.name, lang),
        date: State.get('date'), time: State.get('time'),
        duration: svc?.dur, price: svc?.price,
        clientName: State.get('clientName'), clientPhone: State.get('clientPhone'),
        clientEmail: State.get('clientEmail'), notes: State.get('notes'),
      });

      if (res.success) {
        const codeEl = document.getElementById('booking-code');
        if (codeEl) codeEl.textContent = 'Kod: ' + res.confirmationCode;
        showResult('success');
      } else {
        showResult('error');
      }
    } catch {
      showResult('error');
    } finally {
      _submitting = false;
      if (btnSubmit) { btnSubmit.classList.remove('is-loading'); btnSubmit.disabled=false; }
    }
  }

  function showResult(type) {
    [s1,s2,s3,s4].forEach(el => el && el.classList.add('is-hidden'));
    if (type==='success' && sSuccess) sSuccess.classList.remove('is-hidden');
    if (type==='error'   && sError)   sError.classList.remove('is-hidden');
    if (btnBack)   btnBack.style.display = 'none';
    if (btnNext)   btnNext.style.display = 'none';
    if (btnSubmit) btnSubmit.classList.add('is-hidden');
  }

  /* — Helpers — */
  function shake(msg) {
    const panel = modal?.querySelector('.modal__panel');
    if (panel) {
      panel.style.animation='none'; panel.offsetWidth;
      panel.style.animation='shake .4s ease';
      panel.addEventListener('animationend',()=>panel.style.animation='',{once:true});
    }
    if (msg) {
      let toast = modal?.querySelector('.modal__toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.className='modal__toast';
        modal?.querySelector('.modal__title')?.after(toast);
      }
      toast.textContent = msg;
      toast.classList.add('is-visible');
      setTimeout(()=>toast.classList.remove('is-visible'), 3200);
    }
    return false;
  }

  function setErr(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
  }

  /* — Init — */
  function init() {
    modal = document.getElementById('booking-modal');
    if (!modal) return;

    s1       = document.getElementById('step-1');
    s2       = document.getElementById('step-2');
    s3       = document.getElementById('step-3');
    s4       = document.getElementById('step-4');
    sSuccess = document.getElementById('step-success');
    sError   = document.getElementById('step-error');

    btnBack      = document.getElementById('modal-back');
    btnNext      = document.getElementById('modal-next');
    btnSubmit    = document.getElementById('modal-submit');
    progressFill = document.getElementById('progress-fill');
    progressSteps= [...document.querySelectorAll('.progress__step')];
    modalTitle   = document.getElementById('booking-modal-title');

    /* Prefetch barbers from backend so step 2 is ready by the time user opens modal */
    SheetsAPI.getBarbers().then(bs => {
      if (bs && bs.length) {
        _liveBarbers = bs;
        CalendarModule.setBarbers(bs.filter(b => b.active !== false).map(b => b.id));
      }
    }).catch(() => {});

    document.querySelectorAll('[data-booking-open]').forEach(el => el.addEventListener('click', openModal));
    document.querySelectorAll('[data-booking-close]').forEach(el => el.addEventListener('click', closeModal));
    modal.querySelector('.modal__backdrop')?.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key==='Escape' && modal.classList.contains('is-open')) closeModal(); });

    btnBack?.addEventListener('click', () => { if (currentStep>1) showStep(currentStep-1,'back'); });
    btnNext?.addEventListener('click', async () => {
      if (currentStep === 3) {
        if (!State.get('date') || !State.get('time')) {
          shake('Proszę wybrać datę i godzinę.');
          return;
        }
        btnNext.disabled = true; btnNext.classList.add('is-loading');
        try {
          const bid   = State.get('barber')?.id;
          const taken = await SheetsAPI.getSlots(State.get('date'), (!bid || bid === 'any') ? null : bid);
          if (taken.includes(State.get('time'))) {
            shake('Ten termin właśnie został zajęty. Wybierz inny czas.');
            State.set('time', null);
            CalendarModule.refreshSlots();
            return;
          }
        } catch { /* proceed if check fails */ }
        finally { btnNext.disabled = false; btnNext.classList.remove('is-loading'); }
        showStep(4, 'forward');
      } else {
        if (validate() && currentStep < 4) showStep(currentStep + 1, 'forward');
      }
    });
    btnSubmit?.addEventListener('click', submit);
  }

  return { init };
})();

/* ================================================================
   §13 I18N — translations for all data-i18n elements
================================================================ */
const I18nModule = (() => {
  const T = {
    pl: {
      nav_about:'O nas', nav_services:'Usługi', nav_gallery:'Galeria',
      nav_reviews:'Opinie', nav_contact:'Kontakt', nav_book:'Zarezerwuj',
      hero_eyebrow:'Łódź, Poland', hero_slogan:'Twoja broda w najlepszych rękach.',
      hero_cta_book:'Zarezerwuj wizytę', hero_cta_services:'Nasze usługi',
      benefit_1_title:'10+ lat doświadczenia', benefit_1_text:'Profesjonaliści z pasją do rzemiosła barberskiego.',
      benefit_2_title:'Premium produkty', benefit_2_text:'Wyłącznie sprawdzone, luksusowe marki.',
      benefit_3_title:'Rezerwacja online 24/7', benefit_3_text:'Wygodna rezerwacja o każdej porze.',
      benefit_4_title:'500+ zadowolonych klientów', benefit_4_text:'Zaufanie budowane przez lata w Łodzi.',
      services_eyebrow:'Co oferujemy', services_title:'Nasze usługi', services_subtitle:'Każda wizyta to wyjątkowe doświadczenie.',
      filter_all:'Wszystkie', filter_beard:'Broda', filter_hair:'Włosy', filter_combo:'Combo',
      service_1_name:'Strzyżenie klasyczne', service_1_desc:'Precyzyjne strzyżenie dopasowane do kształtu twarzy i stylu życia.',
      service_2_name:'Stylizacja brody', service_2_desc:'Kształtowanie i pielęgnacja brody na najwyższym poziomie.',
      service_3_name:'Strzyżenie + Broda', service_3_desc:'Kompleksowa pielęgnacja włosów i brody w jednej wizycie.',
      service_4_name:'Golenie brzytwą', service_4_desc:'Tradycyjne golenie na gorący ręcznik z użyciem brzytwy.',
      service_5_name:'Strzyżenie maszynką', service_5_desc:'Szybkie i precyzyjne strzyżenie maszynką z wykończeniem.',
      service_6_name:'Full Package', service_6_desc:'Strzyżenie, broda, golenie i pielęgnacja — luksusowy pakiet.',
      service_popular:'Najpopularniejszy', service_book:'Zarezerwuj',
      about_eyebrow:'Nasza historia', 'about_title':'Rzemiosło<br>to nasz styl życia', about_badge:'lat doświadczenia',
      about_p1:'MIROWSKI BARBERSHOP to miejsce, gdzie tradycja spotyka nowoczesny styl. Każda wizyta to rytuał — od pierwszego cięcia po ostatni szlif brzytwą.',
      about_p2:'Znajdziesz nas w sercu Łodzi. Nasz zespół to pasjonaci, dla których każdy klient zasługuje na wyjątkową uwagę i najwyższy poziom obsługi.',
      about_cta:'Poznaj nasze usługi', stat_years:'Lat doświadczenia', stat_clients:'Klientów miesięcznie', stat_rating:'Ocena Google',
      gallery_eyebrow:'Nasze prace', gallery_title:'Galeria',
      reviews_eyebrow:'Opinie klientów', reviews_title:'Co mówią o nas',
      review_1:'"Najlepszy barbershop w Łodzi. Zawsze wychodzę zadowolony!"',
      review_2:'"Profesjonalizm na najwyższym poziomie. Polecam każdemu!"',
      review_3:'"Świetna atmosfera i mistrzowskie strzyżenie. Wracam co miesiąc."',
      review_4:'"Рекомендую! Найкраща перукарня в місті. Чудові результати."',
      review_5:'"Exceptional service. Worth every złoty. Best barbers in Lodz."',
      contact_eyebrow:'Znajdź nas', contact_title:'Kontakt',
      contact_addr_label:'Adres', contact_addr:'ul. Piotrkowska, 90-001 Łódź',
      contact_phone_label:'Telefon', contact_hours_label:'Godziny otwarcia',
      contact_hours_week:'Pon–Pt: 9:00–20:00', contact_hours_sat:'Sob: 9:00–17:00',
      contact_cta_call:'Zadzwoń teraz', contact_cta_wa:'WhatsApp',
      footer_nav_title:'Nawigacja', footer_social_title:'Śledź nas', footer_rights:'Wszelkie prawa zastrzeżone.',
      step_service:'Usługa', step_barber:'Barber', step_date:'Termin', step_details:'Dane',
      step1_title:'Wybierz usługę', btn_back:'Wstecz', btn_next:'Dalej', btn_confirm:'Potwierdź rezerwację',
      form_name:'Imię i nazwisko *', form_phone:'Telefon *', form_optional:'(opcjonalnie)',
      form_terms:'Akceptuję regulamin i politykę prywatności.',
      select_date_prompt:'Wybierz datę, aby zobaczyć dostępne godziny.',
      success_title:'Rezerwacja potwierdzona!', success_text:'Potwierdzenie wysłano na Twój telefon.', success_close:'Zamknij',
      error_title:'Coś poszło nie tak', error_text:'Spróbuj ponownie lub zadzwoń do nas.',
    },
    en: {
      nav_about:'About', nav_services:'Services', nav_gallery:'Gallery',
      nav_reviews:'Reviews', nav_contact:'Contact', nav_book:'Book now',
      hero_eyebrow:'Łódź, Poland', hero_slogan:'Your beard in the best hands.',
      hero_cta_book:'Book an appointment', hero_cta_services:'Our services',
      benefit_1_title:'10+ years of experience', benefit_1_text:'Professionals with a passion for barbering.',
      benefit_2_title:'Premium products', benefit_2_text:'Only trusted, luxury brands.',
      benefit_3_title:'Online booking 24/7', benefit_3_text:'Book at any time of day or night.',
      benefit_4_title:'500+ satisfied clients', benefit_4_text:'Trust built over years in Łódź.',
      services_eyebrow:'What we offer', services_title:'Our services', services_subtitle:'Every visit is a unique experience.',
      filter_all:'All', filter_beard:'Beard', filter_hair:'Hair', filter_combo:'Combo',
      service_1_name:'Classic Haircut', service_1_desc:'Precise cut tailored to your face shape and lifestyle.',
      service_2_name:'Beard Styling', service_2_desc:'Expert beard shaping and grooming.',
      service_3_name:'Haircut + Beard', service_3_desc:'Complete hair and beard grooming in one visit.',
      service_4_name:'Straight Razor Shave', service_4_desc:'Traditional hot-towel straight razor shave.',
      service_5_name:'Clipper Cut', service_5_desc:'Fast and precise clipper cut with finishing.',
      service_6_name:'Full Package', service_6_desc:'Haircut, beard, shave and grooming — luxury package.',
      service_popular:'Most popular', service_book:'Book',
      about_eyebrow:'Our story', 'about_title':'Craft<br>is our way of life', about_badge:'years of experience',
      about_p1:'MIROWSKI BARBERSHOP is a place where tradition meets modern style. Every visit is a ritual — from the first cut to the last razor finish.',
      about_p2:'Find us in the heart of Łódź. Our team are passionate professionals who give every client exceptional attention.',
      about_cta:'Explore our services', stat_years:'Years of experience', stat_clients:'Clients per month', stat_rating:'Google rating',
      gallery_eyebrow:'Our work', gallery_title:'Gallery',
      reviews_eyebrow:'Client reviews', reviews_title:'What they say about us',
      review_1:'"Best barbershop in Łódź. Always leave satisfied!"',
      review_2:'"Top-level professionalism. Recommend to everyone!"',
      review_3:'"Great atmosphere and masterful cuts. Come back every month."',
      review_4:'"Highly recommend! Best barbers in the city. Excellent results."',
      review_5:'"Exceptional service. Worth every złoty. Best barbers in Lodz."',
      contact_eyebrow:'Find us', contact_title:'Contact',
      contact_addr_label:'Address', contact_addr:'ul. Piotrkowska, 90-001 Łódź, Poland',
      contact_phone_label:'Phone', contact_hours_label:'Opening hours',
      contact_hours_week:'Mon–Fri: 9:00–20:00', contact_hours_sat:'Sat: 9:00–17:00',
      contact_cta_call:'Call now', contact_cta_wa:'WhatsApp',
      footer_nav_title:'Navigation', footer_social_title:'Follow us', footer_rights:'All rights reserved.',
      step_service:'Service', step_barber:'Barber', step_date:'Date', step_details:'Details',
      step1_title:'Choose a service', btn_back:'Back', btn_next:'Next', btn_confirm:'Confirm booking',
      form_name:'Full name *', form_phone:'Phone *', form_optional:'(optional)',
      form_terms:'I accept the terms and privacy policy.',
      select_date_prompt:'Select a date to see available times.',
      success_title:'Booking confirmed!', success_text:'Confirmation sent to your phone.', success_close:'Close',
      error_title:'Something went wrong', error_text:'Please try again or call us directly.',
    },
    uk: {
      nav_about:'Про нас', nav_services:'Послуги', nav_gallery:'Галерея',
      nav_reviews:'Відгуки', nav_contact:'Контакт', nav_book:'Записатися',
      hero_eyebrow:'Лодзь, Польща', hero_slogan:'Ваша борода в найкращих руках.',
      hero_cta_book:'Записатися на прийом', hero_cta_services:'Наші послуги',
      benefit_1_title:'10+ років досвіду', benefit_1_text:'Професіонали з пристрастю до барбер-ремесла.',
      benefit_2_title:'Преміум продукти', benefit_2_text:'Тільки перевірені, люксові бренди.',
      benefit_3_title:'Онлайн бронювання 24/7', benefit_3_text:'Зручне бронювання в будь-який час.',
      benefit_4_title:'500+ задоволених клієнтів', benefit_4_text:'Довіра, побудована роками в Лодзі.',
      services_eyebrow:'Що ми пропонуємо', services_title:'Наші послуги', services_subtitle:'Кожен візит — унікальний досвід.',
      filter_all:'Усі', filter_beard:'Борода', filter_hair:'Волосся', filter_combo:'Комбо',
      service_1_name:'Класичне стрижіння', service_1_desc:'Точна стрижка під форму обличчя та стиль życia.',
      service_2_name:'Стилізація бороди', service_2_desc:'Формування та догляд за бородою вищого рівня.',
      service_3_name:'Стрижка + Борода', service_3_desc:'Комплексний догляд за волоссям і бородою за один візит.',
      service_4_name:'Гоління бритвою', service_4_desc:'Традиційне гоління бритвою з гарячим рушником.',
      service_5_name:'Стрижка машинкою', service_5_desc:'Швидка та точна стрижка машинкою з обробкою.',
      service_6_name:'Повний пакет', service_6_desc:'Стрижка, борода, гоління та догляд — люксовий пакет.',
      service_popular:'Найпопулярніший', service_book:'Записатися',
      about_eyebrow:'Наша історія', 'about_title':'Ремесло —<br>це наш спосіб życia', about_badge:'років досвіду',
      about_p1:'MIROWSKI BARBERSHOP — місце, де традиція зустрічається з сучасним стилем. Кожен візит — ритуал від першого розрізу до останнього штриху бритвою.',
      about_p2:'Знайдіть нас у серці Лодзя. Наша команда — пристрасні професіонали, для яких кожен клієнт заслуговує особливої уваги.',
      about_cta:'Ознайомитися з послугами', stat_years:'Років досвіду', stat_clients:'Клієнтів на місяць', stat_rating:'Оцінка Google',
      gallery_eyebrow:'Наші роботи', gallery_title:'Галерея',
      reviews_eyebrow:'Відгуки клієнтів', reviews_title:'Що кажуть про нас',
      review_1:'"Найкращий барбершоп у Лодзі. Завжди виходжу задоволеним!"',
      review_2:'"Професіоналізм найвищого рівня. Рекомендую кожному!"',
      review_3:'"Чудова атмосфера і майстерна стрижка. Повертаюся щомісяця."',
      review_4:'"Рекомендую! Найкраща перукарня в місті. Чудові результати."',
      review_5:'"Виняткове обслуговування. Найкращі барбери в Лодзі."',
      contact_eyebrow:'Знайдіть нас', contact_title:'Контакт',
      contact_addr_label:'Адреса', contact_addr:'вул. Пьотрковська, 90-001 Лодзь',
      contact_phone_label:'Телефон', contact_hours_label:'Години роботи',
      contact_hours_week:'Пн–Пт: 9:00–20:00', contact_hours_sat:'Сб: 9:00–17:00',
      contact_cta_call:'Зателефонувати', contact_cta_wa:'WhatsApp',
      footer_nav_title:'Навігація', footer_social_title:'Слідкуйте за нами', footer_rights:'Усі права захищені.',
      step_service:'Послуга', step_barber:'Барбер', step_date:'Дата', step_details:'Дані',
      step1_title:'Оберіть послугу', btn_back:'Назад', btn_next:'Далі', btn_confirm:'Підтвердити бронювання',
      form_name:"Ім'я та прізвище *", form_phone:'Телефон *', form_optional:'(необов\'язково)',
      form_terms:'Приймаю умови та політику конфіденційності.',
      select_date_prompt:'Оберіть дату, щоб побачити доступні години.',
      success_title:'Бронювання підтверджено!', success_text:'Підтвердження надіслано на ваш телефон.', success_close:'Закрити',
      error_title:'Щось пішло не так', error_text:'Спробуйте ще раз або зателефонуйте нам.',
    },
  };

  function apply(lang) {
    const dict = T[lang] || T.pl;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const v = dict[el.dataset.i18n];
      if (v !== undefined) el.innerHTML = v;
    });
    document.documentElement.lang = lang === 'uk' ? 'uk' : lang === 'en' ? 'en' : 'pl';
    /* Duplicated marquee cards also carry [data-i18n] — querySelectorAll updates all of them. */
  }

  return { apply };
})();

/* ================================================================
   §14 APP
================================================================ */
const App = (() => {
  const ADMIN_KEY = 'MIR_ADMIN_2025';

  async function init() {
    /* Admin redirect */
    if (new URLSearchParams(location.search).get('key') === ADMIN_KEY) {
      location.replace('admin.html?key=' + ADMIN_KEY);
      return;
    }

    /* Footer year */
    const yr = document.getElementById('footer-year');
    if (yr) yr.textContent = new Date().getFullYear();

    /* Start modules */
    ScrollModule.init();
    CursorModule.init();
    NavModule.init();
    HeroModule.init();

    /* Hide loader after 1.4s */
    await new Promise(r => setTimeout(r, 1400));

    const loader = document.getElementById('site-loader');
    if (loader) {
      loader.classList.add('is-done');
      loader.addEventListener('transitionend', () => loader.remove(), { once: true });
    }
    document.body.classList.remove('is-loading');

    /* Hero entrance */
    HeroModule.animateEntrance();

    /* Remaining modules */
    AnimationsModule.init();
    ServicesModule.init();
    GalleryModule.init();
    TestimonialsModule.init();
    BookingModule.init();

    /* Language switcher — applies full translation on click */
    document.querySelectorAll('.lang-btn[data-lang]').forEach(btn =>
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        State.set('lang', lang);
        document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        I18nModule.apply(lang);
      })
    );
    I18nModule.apply('pl'); /* apply default language */
  }

  return { init };
})();

/* Boot */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', App.init);
} else {
  App.init();
}
