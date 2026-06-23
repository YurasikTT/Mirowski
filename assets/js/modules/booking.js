/* ================================================================
   BOOKING.JS — 4-step booking wizard orchestrator
   Flow: Service → Barber → Date/Time → Contact details
   MIROWSKI BARBERSHOP
================================================================ */
const BookingModule = (() => {

  /* ── Static data ── */
  const SERVICES = [
    { id: 's1', duration: 45, price: 80,  category: 'hair',
      name: { pl: 'Strzyżenie klasyczne',  en: 'Classic Cut',         uk: 'Класичний стриж' } },
    { id: 's2', duration: 30, price: 60,  category: 'beard',
      name: { pl: 'Stylizacja brody',      en: 'Beard Styling',       uk: 'Стилізація бороди' } },
    { id: 's3', duration: 75, price: 130, category: 'combo',
      name: { pl: 'Strzyżenie + Broda',    en: 'Cut + Beard',         uk: 'Стриж + Борода' } },
    { id: 's4', duration: 45, price: 90,  category: 'beard',
      name: { pl: 'Golenie brzytwą',       en: 'Straight Razor Shave',uk: 'Гоління бритвою' } },
    { id: 's5', duration: 30, price: 60,  category: 'hair',
      name: { pl: 'Strzyżenie maszynką',   en: 'Machine Cut',         uk: 'Стриж машинкою' } },
    { id: 's6', duration: 90, price: 180, category: 'combo',
      name: { pl: 'Full Package',          en: 'Full Package',        uk: 'Повний пакет' } },
  ];

  const BARBERS = [
    { id: 'any', isAny: true,
      name: { pl: 'Bez preferencji', en: 'No preference', uk: 'Без вподобань' },
      spec: { pl: 'Dowolny barber',  en: 'Any barber',    uk: 'Будь-який барбер' },
      avatar: null },
    { id: 'b1',
      name: { pl: 'Mirowski', en: 'Mirowski', uk: 'Міровскі' },
      spec: { pl: 'Klasyczne strzyżenia', en: 'Classic cuts',     uk: 'Класичні стрижки' },
      avatar: 'assets/images/team/barber-main.jpg' },
    { id: 'b2',
      name: { pl: 'Aleksander', en: 'Aleksander', uk: 'Александер' },
      spec: { pl: 'Broda & stylizacja', en: 'Beard & styling', uk: 'Борода та стилізація' },
      avatar: '' },
  ];

  const STEP_TITLES = {
    1: { pl: 'Wybierz usługę',  en: 'Choose service',     uk: 'Оберіть послугу' },
    2: { pl: 'Wybierz barbera', en: 'Choose barber',      uk: 'Оберіть барбера' },
    3: { pl: 'Wybierz termin',  en: 'Choose date & time', uk: 'Оберіть дату та час' },
    4: { pl: 'Twoje dane',      en: 'Your details',       uk: 'Ваші дані' },
  };

  const VALIDATION_MSG = {
    req:   { pl: 'To pole jest wymagane',   en: 'This field is required',   uk: 'Поле обов\'язкове' },
    short: { pl: 'Minimum 2 znaki',          en: 'Minimum 2 characters',    uk: 'Мінімум 2 символи' },
    phone: { pl: 'Podaj prawidłowy numer',   en: 'Enter a valid number',    uk: 'Введіть правильний номер' },
    email: { pl: 'Podaj prawidłowy e-mail',  en: 'Enter a valid e-mail',    uk: 'Введіть правильний e-mail' },
    terms: { pl: 'Zaakceptuj regulamin',     en: 'Please accept the terms', uk: 'Прийміть умови' },
  };

  /* ── DOM refs ── */
  const modal     = document.getElementById('booking-modal');
  const btnNext   = document.getElementById('modal-next');
  const btnBack   = document.getElementById('modal-back');
  const btnSubmit = document.getElementById('modal-submit');
  const titleEl   = document.getElementById('booking-modal-title');
  const fillEl    = document.getElementById('progress-fill');

  /* ── State helpers ── */
  const b    = () => window.MirowskiState?.booking;
  const lang = () => window.MirowskiState?.lang || 'pl';
  const t    = obj => obj[lang()] || obj.pl;

  /* ── Step transition lock ── */
  let busy = false;

  /* ================================================================
     OPEN / CLOSE
  ================================================================ */
  const openModal = () => {
    if (!modal) return;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    if (window.lenis) window.lenis.stop();
    goTo(b()?.step || 1, null);
  };

  const closeModal = () => {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    if (window.lenis) window.lenis.start();
  };

  /* ================================================================
     STEP NAVIGATION
  ================================================================ */
  const goTo = (n, dir) => {
    if (busy) return;
    busy = true;

    const fromEl = modal.querySelector('.modal__step:not(.is-hidden)');
    const toEl   = document.getElementById(`step-${n}`);

    if (!toEl) { busy = false; return; }

    /* Exit current */
    if (fromEl && fromEl !== toEl) {
      const exitClass = dir === 'back' ? 'is-exit-right' : 'is-exit-left';
      fromEl.classList.add(exitClass);
      setTimeout(() => {
        fromEl.classList.add('is-hidden');
        fromEl.classList.remove(exitClass);
      }, 240);
    }

    /* Enter new */
    setTimeout(() => {
      toEl.classList.remove('is-hidden');
      toEl.classList.add('is-enter');
      toEl.getBoundingClientRect(); // reflow
      toEl.classList.remove('is-enter');

      /* Scroll panel to top */
      modal.querySelector('.modal__panel')?.scrollTo({ top: 0, behavior: 'instant' });

      populate(n);
      updateChrome(n);
      busy = false;
    }, fromEl && fromEl !== toEl ? 180 : 0);
  };

  /* ── Chrome: title, progress bar, progress steps, nav buttons ── */
  const updateChrome = n => {
    if (titleEl && STEP_TITLES[n]) titleEl.textContent = t(STEP_TITLES[n]);
    if (fillEl) fillEl.style.width = `${(n / 4) * 100}%`;

    document.querySelectorAll('.progress__step').forEach(s => {
      const sn = +s.dataset.step;
      s.classList.toggle('is-active', sn === n);
      s.classList.toggle('is-done',   sn < n);
    });

    btnBack?.classList.toggle('is-hidden', n === 1);
    btnNext?.classList.toggle('is-hidden', n === 4);
    btnSubmit?.classList.toggle('is-hidden', n !== 4);
  };

  /* ── Populate step content ── */
  const populate = n => {
    if (n === 1) renderServices();
    if (n === 2) renderBarbers();
    if (n === 3) CalendarModule.init();
    if (n === 4) renderSummary();
  };

  /* ================================================================
     STEP 1 — SERVICES
  ================================================================ */
  const renderServices = () => {
    const grid = document.getElementById('modal-services');
    if (!grid) return;
    const state = b();

    grid.innerHTML = SERVICES.map(svc => /* html */`
      <div class="modal-service-card ${state?.serviceId === svc.id ? 'is-selected' : ''}"
           data-id="${svc.id}" role="button" tabindex="0"
           aria-pressed="${state?.serviceId === svc.id}">
        <p class="modal-service-card__name">${t(svc.name)}</p>
        <div class="modal-service-card__meta">
          <span class="modal-service-card__price">${svc.price}&nbsp;zł</span>
          <span class="modal-service-card__duration">${svc.duration}&nbsp;min</span>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.modal-service-card').forEach(card => {
      const select = () => {
        b().serviceId = card.dataset.id;
        grid.querySelectorAll('.modal-service-card').forEach(c => {
          c.classList.remove('is-selected');
          c.setAttribute('aria-pressed', 'false');
        });
        card.classList.add('is-selected');
        card.setAttribute('aria-pressed', 'true');
        setTimeout(() => goTo(2, 'next'), 340);
      };
      card.addEventListener('click', select);
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
      });
    });
  };

  /* ================================================================
     STEP 2 — BARBERS
  ================================================================ */
  const renderBarbers = () => {
    const grid = document.getElementById('modal-barbers');
    if (!grid) return;
    const state = b();

    grid.innerHTML = BARBERS.map(barber => {
      const avatarEl = barber.avatar
        ? `<img class="modal-barber-card__avatar" src="${barber.avatar}" alt="${t(barber.name)}" loading="lazy">`
        : `<div class="modal-barber-card__avatar" aria-hidden="true">✂</div>`;

      return /* html */`
        <div class="modal-barber-card ${state?.barberId === barber.id ? 'is-selected' : ''}"
             data-id="${barber.id}" role="button" tabindex="0"
             aria-pressed="${state?.barberId === barber.id}">
          ${avatarEl}
          <p class="modal-barber-card__name">${t(barber.name)}</p>
          <p class="modal-barber-card__spec">${t(barber.spec)}</p>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.modal-barber-card').forEach(card => {
      const select = () => {
        b().barberId = card.dataset.id;
        grid.querySelectorAll('.modal-barber-card').forEach(c => {
          c.classList.remove('is-selected');
          c.setAttribute('aria-pressed', 'false');
        });
        card.classList.add('is-selected');
        card.setAttribute('aria-pressed', 'true');
        setTimeout(() => goTo(3, 'next'), 340);
      };
      card.addEventListener('click', select);
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(); }
      });
    });
  };

  /* ================================================================
     STEP 4 — SUMMARY
  ================================================================ */
  const renderSummary = () => {
    const box = document.getElementById('booking-summary');
    if (!box) return;
    const state = b();
    const svc    = SERVICES.find(s => s.id === state?.serviceId);
    const barber = BARBERS.find(br => br.id === state?.barberId);

    const dateStr = state?.date
      ? new Date(state.date + 'T12:00:00').toLocaleDateString(
          lang() === 'pl' ? 'pl-PL' : lang() === 'uk' ? 'uk-UA' : 'en-GB',
          { weekday: 'long', day: 'numeric', month: 'long' }
        )
      : '—';

    const row = (label, val, gold = false) => /* html */`
      <div class="booking-summary__row">
        <span class="booking-summary__label">${label}</span>
        <span class="booking-summary__val${gold ? ' booking-summary__val--gold' : ''}">${val}</span>
      </div>`;

    const L = {
      service: { pl:'Usługa', en:'Service',   uk:'Послуга' },
      barber:  { pl:'Barber', en:'Barber',     uk:'Барбер' },
      date:    { pl:'Data',   en:'Date',       uk:'Дата' },
      time:    { pl:'Godz.',  en:'Time',       uk:'Час' },
      price:   { pl:'Cena',   en:'Price',      uk:'Ціна' },
    };

    box.innerHTML =
      row(t(L.service), svc ? t(svc.name) : '—') +
      row(t(L.barber),  barber ? t(barber.name) : '—') +
      row(t(L.date),    dateStr) +
      row(t(L.time),    state?.time || '—', true) +
      row(t(L.price),   svc ? `${svc.price} zł` : '—', true);
  };

  /* ================================================================
     VALIDATION
  ================================================================ */
  const validate = () => {
    const l    = lang();
    const msg  = k => VALIDATION_MSG[k][l] || VALIDATION_MSG[k].pl;
    let valid  = true;

    const check = (id, errId, rule) => {
      const el  = document.getElementById(id);
      const err = document.getElementById(errId);
      const m   = rule(el);
      el?.classList.toggle('is-error', !!m);
      if (err) err.textContent = m || '';
      if (m) valid = false;
    };

    check('f-name', 'err-name', el => {
      const v = el?.value.trim() || '';
      return !v ? msg('req') : v.length < 2 ? msg('short') : '';
    });

    check('f-phone', 'err-phone', el => {
      const v = el?.value.trim() || '';
      return !v ? msg('req') : !/^[\+]?[\d\s\-\(\)]{7,15}$/.test(v) ? msg('phone') : '';
    });

    const emailEl = document.getElementById('f-email');
    if (emailEl?.value.trim()) {
      check('f-email', null, el => {
        return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()) ? msg('email') : '';
      });
    }

    check('f-terms', 'err-terms', el => (!el?.checked ? msg('terms') : ''));

    return valid;
  };

  /* ================================================================
     SUBMIT
  ================================================================ */
  const submit = async () => {
    if (!validate()) return;

    const state  = b();
    const svc    = SERVICES.find(s => s.id === state.serviceId);
    const barber = BARBERS.find(br => br.id === state.barberId);

    state.client = {
      name:  document.getElementById('f-name')?.value.trim(),
      phone: document.getElementById('f-phone')?.value.trim(),
      email: document.getElementById('f-email')?.value.trim(),
      notes: document.getElementById('f-notes')?.value.trim(),
    };

    const payload = {
      serviceId:   state.serviceId,
      serviceName: t(svc?.name || {}),
      barberId:    state.barberId,
      barberName:  t(barber?.name || {}),
      date:        state.date,
      time:        state.time,
      duration:    svc?.duration || 60,
      price:       svc?.price || 0,
      ...state.client,
    };

    btnSubmit.classList.add('is-loading');
    btnSubmit.disabled = true;

    try {
      const res = await SheetsAPI.createBooking(payload);
      showResult('success', res.confirmationCode);
    } catch (err) {
      console.error('[BookingModule]', err);
      showResult('error');
    } finally {
      btnSubmit.classList.remove('is-loading');
      btnSubmit.disabled = false;
    }
  };

  /* ================================================================
     RESULT SCREENS
  ================================================================ */
  const showResult = (type, code = '') => {
    document.querySelectorAll('.modal__step').forEach(s => s.classList.add('is-hidden'));
    const el = document.getElementById(`step-${type}`);
    if (!el) return;
    el.classList.remove('is-hidden');

    if (type === 'success') {
      const codeEl = document.getElementById('booking-code');
      if (codeEl) codeEl.textContent = `MIR-${code || '------'}`;
      if (fillEl) fillEl.style.width = '100%';
    }

    btnBack?.classList.add('is-hidden');
    btnNext?.classList.add('is-hidden');
    btnSubmit?.classList.add('is-hidden');
  };

  /* ================================================================
     ADVANCE GUARD
  ================================================================ */
  const canGoNext = () => {
    const state = b();
    const l = lang();
    const noMsg = { pl: '', en: '', uk: '' };
    const fail  = k => ({ ok: false, msg: ({ service:
      { pl:'Wybierz usługę',   en:'Select a service',   uk:'Оберіть послугу' },
      barber:
      { pl:'Wybierz barbera',  en:'Select a barber',    uk:'Оберіть барбера' },
      date:
      { pl:'Wybierz datę',     en:'Choose a date',      uk:'Оберіть дату' },
      time:
      { pl:'Wybierz godzinę',  en:'Choose a time',      uk:'Оберіть час' },
    })[k][l] });

    if (state?.step === 1 && !state?.serviceId) return fail('service');
    if (state?.step === 2 && !state?.barberId)  return fail('barber');
    if (state?.step === 3 && !state?.date)      return fail('date');
    if (state?.step === 3 && !state?.time)      return fail('time');
    return { ok: true };
  };

  /* ================================================================
     SHAKE + TOAST FEEDBACK
  ================================================================ */
  const shakeModal = msg => {
    const panel = modal?.querySelector('.modal__panel');
    if (!panel) return;

    panel.style.animation = 'none';
    panel.getBoundingClientRect();
    panel.style.animation = 'shake .42s ease';
    setTimeout(() => { panel.style.animation = ''; }, 440);

    let toast = modal.querySelector('.modal__toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'modal__toast';
      panel.prepend(toast);
    }
    toast.textContent = msg;
    toast.classList.add('is-visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('is-visible'), 2400);
  };

  /* ================================================================
     INIT
  ================================================================ */
  const init = () => {
    if (!modal) return;

    /* Open triggers */
    document.querySelectorAll('[data-booking-open]').forEach(btn => {
      btn.addEventListener('click', () => {
        const state = b();
        if (state) {
          if (btn.dataset.service) state.serviceId = btn.dataset.service;
          state.step = 1;
        }
        openModal();
      });
    });

    /* Close triggers (backdrop + close button) */
    document.querySelectorAll('[data-booking-close]').forEach(btn => {
      btn.addEventListener('click', closeModal);
    });

    /* Escape key */
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
    });

    /* Next */
    btnNext?.addEventListener('click', () => {
      const state = b();
      const check = canGoNext();
      if (!check.ok) { shakeModal(check.msg); return; }
      state.step = Math.min(state.step + 1, 4);
      goTo(state.step, 'next');
    });

    /* Back */
    btnBack?.addEventListener('click', () => {
      const state = b();
      if (state.step > 1) {
        state.step--;
        goTo(state.step, 'back');
      }
    });

    /* Submit */
    btnSubmit?.addEventListener('click', e => {
      e.preventDefault();
      submit();
    });

    /* Custom close event */
    modal.addEventListener('modal:close', closeModal);
  };

  return { init, openModal, closeModal, SERVICES, BARBERS };
})();
