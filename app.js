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
    getSlots:      (date, barberId) => request('getSlots', { date, barberId }),
    createBooking: payload          => request('createBooking', payload),
    updateStatus:  (token, id, st)  => request('updateStatus', { token, id, status: st }),
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

    gsap.utils.toArray('.animate-fade-up').forEach(el =>
      gsap.fromTo(el, { opacity: 0, y: 44 }, { opacity: 1, y: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } })
    );
    gsap.utils.toArray('.animate-fade-left').forEach(el =>
      gsap.fromTo(el, { opacity: 0, x: -44 }, { opacity: 1, x: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 86%', once: true } })
    );
    gsap.utils.toArray('.animate-fade-right').forEach(el =>
      gsap.fromTo(el, { opacity: 0, x: 44 }, { opacity: 1, x: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 86%', once: true } })
    );
    gsap.utils.toArray('.animate-scale-in').forEach(el =>
      gsap.fromTo(el, { opacity: 0, scale: .9 }, { opacity: 1, scale: 1, duration: .8, ease: 'back.out(1.4)', scrollTrigger: { trigger: el, start: 'top 88%', once: true } })
    );

    document.querySelectorAll('[data-stagger]').forEach(parent => {
      const items = parent.querySelectorAll(parent.dataset.stagger);
      if (!items.length) return;
      gsap.fromTo(items, { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: .7, ease: 'power3.out', stagger: parseFloat(parent.dataset.staggerDelay || .11), scrollTrigger: { trigger: parent, start: 'top 84%', once: true } });
    });

    /* Counter animation */
    document.querySelectorAll('.stat__num[data-count]').forEach(el => {
      const target = parseFloat(el.dataset.count);
      const suffix = el.dataset.suffix || '';
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter() {
          gsap.fromTo({ n: 0 }, { n: target }, {
            duration: 2, ease: 'power2.out',
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
   §9 GALLERY + LIGHTBOX
================================================================ */
const GalleryModule = (() => {
  function init() {
    const items    = [...document.querySelectorAll('.gallery__item[data-index]')];
    const lightbox = document.getElementById('lightbox');
    if (!items.length || !lightbox) return;

    let cur = 0;
    const img     = lightbox.querySelector('.lightbox__img');
    const caption = lightbox.querySelector('.lightbox__caption');

    const open = idx => {
      cur = idx;
      const el  = items[cur];
      const src = el.dataset.src || el.querySelector('img')?.src || '';
      const alt = el.querySelector('img')?.alt || '';
      if (img) { img.style.opacity = '0'; img.src = src; img.alt = alt; img.addEventListener('load', () => img.style.opacity = '1', { once: true }); }
      if (caption) caption.textContent = alt;
      lightbox.classList.add('is-open');
      document.body.classList.add('modal-open');
      if (window.lenis) window.lenis.stop();
    };
    const close = () => {
      lightbox.classList.remove('is-open');
      document.body.classList.remove('modal-open');
      if (window.lenis) window.lenis.start();
    };
    const nav = d => open((cur + d + items.length) % items.length);

    items.forEach((el, i) => el.addEventListener('click', () => open(i)));
    lightbox.querySelector('.lightbox__close')?.addEventListener('click', close);
    lightbox.querySelector('.lightbox__prev') ?.addEventListener('click', () => nav(-1));
    lightbox.querySelector('.lightbox__next') ?.addEventListener('click', () => nav( 1));
    lightbox.addEventListener('click', e => { if (e.target === lightbox) close(); });
    document.addEventListener('keydown', e => {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape')     close();
      if (e.key === 'ArrowLeft')  nav(-1);
      if (e.key === 'ArrowRight') nav(1);
    });
  }
  return { init };
})();

/* ================================================================
   §10 TESTIMONIALS MARQUEE
================================================================ */
const TestimonialsModule = (() => {
  function init() {
    const track = document.getElementById('testimonials-track');
    if (!track) return;
    track.parentNode.appendChild(track.cloneNode(true));
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

  function init() {
    daysEl  = document.getElementById('cal-days');
    monthEl = document.getElementById('cal-month');
    if (!daysEl || !monthEl) return;

    const now = new Date();
    viewY = now.getFullYear();
    viewM = now.getMonth();

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
    try { taken = await SheetsAPI.getSlots(fmtDate(date), State.get('barber')?.id || null); } catch {}

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

  return { init };
})();

/* ================================================================
   §12 BOOKING WIZARD
================================================================ */
const BookingModule = (() => {

  const SERVICES = [
    { id:'s1', dur:45,  price:80,  cat:'hair',  name:'Strzyżenie klasyczne',    desc:'Precyzyjne strzyżenie dopasowane do kształtu twarzy.' },
    { id:'s2', dur:30,  price:60,  cat:'beard', name:'Stylizacja brody',        desc:'Kształtowanie i pielęgnacja brody.' },
    { id:'s3', dur:75,  price:130, cat:'combo', name:'Strzyżenie + Broda',      desc:'Kompleksowa pielęgnacja w jednej wizycie.' },
    { id:'s4', dur:45,  price:90,  cat:'beard', name:'Golenie brzytwą',         desc:'Tradycyjne golenie z gorącym ręcznikiem.' },
    { id:'s5', dur:30,  price:60,  cat:'hair',  name:'Strzyżenie maszynką',     desc:'Szybkie precyzyjne strzyżenie maszynką.' },
    { id:'s6', dur:90,  price:180, cat:'combo', name:'Full Package',            desc:'Strzyżenie, broda, golenie — luksusowy pakiet.' },
  ];

  const BARBERS = [
    { id:'any', name:'Dowolny barber',  spec:'Pierwszy dostępny',  avatar:null },
    { id:'b1',  name:'Mirowski',        spec:'Master Barber',       avatar:'assets/images/team/barber-main.jpg' },
    { id:'b2',  name:'Aleksander',      spec:'Senior Barber',       avatar:null },
  ];

  let modal, currentStep = 1, busy = false;
  let btnBack, btnNext, btnSubmit;
  let progressFill, progressSteps;
  let modalTitle;
  /* step divs */
  let s1, s2, s3, s4, sSuccess, sError;

  const TITLES = ['Wybierz usługę','Wybierz barbera','Data i godzina','Twoje dane'];

  function openModal() {
    if (!modal) return;
    State.reset(['service','barber','date','time','clientName','clientPhone','clientEmail','notes']);
    modal.classList.add('is-open');
    document.body.classList.add('modal-open');
    if (window.lenis) window.lenis.stop();
    showStep(1);
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    document.body.classList.remove('modal-open');
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
    if (modalTitle) modalTitle.textContent = TITLES[n-1] || '';
    if (progressFill) progressFill.style.width = (n/4*100)+'%';
    progressSteps && progressSteps.forEach((el,i) => {
      el.classList.toggle('is-active', i+1===n);
      el.classList.toggle('is-done',   i+1<n);
    });
    if (btnBack)   btnBack.style.display   = n>1 && n<5 ? '' : 'none';
    if (btnNext)   btnNext.style.display   = n<4        ? '' : 'none';
    if (btnSubmit) btnSubmit.style.display = n===4      ? '' : 'none';
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
    grid.innerHTML = '';
    SERVICES.forEach(svc => {
      const sel = State.get('service')?.id === svc.id;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'modal-service-card' + (sel?' is-selected':'');
      btn.innerHTML = `<div class="modal-service-card__name">${svc.name}</div>
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
  function renderBarbers() {
    const grid = document.getElementById('modal-barbers');
    if (!grid) return;
    grid.innerHTML = '';
    BARBERS.forEach(b => {
      const sel = State.get('barber')?.id === b.id;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'modal-barber-card' + (sel?' is-selected':'');
      const av = b.avatar
        ? `<img src="${b.avatar}" alt="${b.name}" class="modal-barber-card__avatar" loading="lazy">`
        : `<div class="modal-barber-card__avatar">&#9986;</div>`;
      btn.innerHTML = `${av}<div class="modal-barber-card__name">${b.name}</div><div class="modal-barber-card__spec">${b.spec}</div>`;
      btn.addEventListener('click', () => {
        State.set('barber', b);
        grid.querySelectorAll('.modal-barber-card').forEach(c => c.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        setTimeout(() => showStep(3,'forward'), 320);
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
    el.innerHTML = `
      <div class="booking-summary__row"><span class="booking-summary__label">Usługa</span><span class="booking-summary__val">${svc?.name||'—'}</span></div>
      <div class="booking-summary__row"><span class="booking-summary__label">Barber</span><span class="booking-summary__val">${bar?.name||'—'}</span></div>
      <div class="booking-summary__row"><span class="booking-summary__label">Data</span><span class="booking-summary__val">${State.get('date')||'—'}</span></div>
      <div class="booking-summary__row"><span class="booking-summary__label">Godzina</span><span class="booking-summary__val">${State.get('time')||'—'}</span></div>
      <div class="booking-summary__row"><span class="booking-summary__label">Cena</span><span class="booking-summary__val booking-summary__val--gold">${svc?.price||'—'} zł</span></div>`;
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

      setErr('err-terms', !terms?.checked ? 'Zaakceptuj regulamin.' : '');
      if (!terms?.checked) ok=false;

      State.set('clientEmail', document.getElementById('f-email')?.value.trim()||'');
      State.set('notes',       document.getElementById('f-notes')?.value.trim()||'');
      if (!ok) { shake(); return false; }
    }
    return true;
  }

  /* — Submit — */
  async function submit() {
    if (!validate()) return;
    const svc = State.get('service');
    const bar = State.get('barber');

    if (btnSubmit) { btnSubmit.classList.add('is-loading'); btnSubmit.disabled=true; }

    try {
      const res = await SheetsAPI.createBooking({
        serviceId:   svc?.id, serviceName: svc?.name,
        barberId:    bar?.id, barberName:  bar?.name,
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
      if (btnSubmit) { btnSubmit.classList.remove('is-loading'); btnSubmit.disabled=false; }
    }
  }

  function showResult(type) {
    [s1,s2,s3,s4].forEach(el => el && el.classList.add('is-hidden'));
    if (type==='success' && sSuccess) sSuccess.classList.remove('is-hidden');
    if (type==='error'   && sError)   sError.classList.remove('is-hidden');
    if (btnBack)   btnBack.style.display   = 'none';
    if (btnNext)   btnNext.style.display   = 'none';
    if (btnSubmit) btnSubmit.style.display = 'none';
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

    document.querySelectorAll('[data-booking-open]').forEach(el => el.addEventListener('click', openModal));
    document.querySelectorAll('[data-booking-close]').forEach(el => el.addEventListener('click', closeModal));
    modal.querySelector('.modal__backdrop')?.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key==='Escape' && modal.classList.contains('is-open')) closeModal(); });

    btnBack?.addEventListener('click', () => { if (currentStep>1) showStep(currentStep-1,'back'); });
    btnNext?.addEventListener('click', () => { if (validate() && currentStep<4) showStep(currentStep+1,'forward'); });
    btnSubmit?.addEventListener('click', submit);
  }

  return { init };
})();

/* ================================================================
   §13 APP
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

    /* Language buttons (visual only — content is static PL) */
    document.querySelectorAll('.lang-btn[data-lang]').forEach(btn =>
      btn.addEventListener('click', () => {
        State.set('lang', btn.dataset.lang);
        document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
      })
    );
  }

  return { init };
})();

/* Boot */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', App.init);
} else {
  App.init();
}
