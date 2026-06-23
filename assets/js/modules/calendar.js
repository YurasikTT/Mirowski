/* ================================================================
   CALENDAR.JS — Custom date picker + 30-min time slot renderer
   Reads working hours, generates slots, checks availability via API.
   MIROWSKI BARBERSHOP
================================================================ */
const CalendarModule = (() => {

  /* ── Working hours per weekday (0=Sun, 1=Mon … 6=Sat) ── */
  const HOURS = {
    0: null,                       // Sunday — closed
    1: { open: 9,  close: 20 },
    2: { open: 9,  close: 20 },
    3: { open: 9,  close: 20 },
    4: { open: 9,  close: 20 },
    5: { open: 9,  close: 20 },
    6: { open: 9,  close: 17 },
  };

  /* Advance booking window in days */
  const MAX_DAYS_AHEAD = 30;
  const SLOT_INTERVAL  = 30; // minutes

  const MONTH_NAMES = {
    pl: ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec',
         'Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'],
    en: ['January','February','March','April','May','June',
         'July','August','September','October','November','December'],
    uk: ['Січень','Лютий','Березень','Квітень','Травень','Червень',
         'Липень','Серпень','Вересень','Жовтень','Листопад','Грудень'],
  };

  /* ── Module state ── */
  let viewYear, viewMonth;
  let bookedSlots = [];       // fetched from API
  let slotsLoading = false;

  /* ── Helpers ── */
  const lang  = () => window.MirowskiState?.lang || 'pl';
  const bk    = () => window.MirowskiState?.booking;
  const toISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  /* ================================================================
     RENDER CALENDAR GRID
  ================================================================ */
  const renderCalendar = () => {
    const monthEl = document.getElementById('cal-month');
    const grid    = document.getElementById('cal-days');
    if (!monthEl || !grid) return;

    const names = MONTH_NAMES[lang()] || MONTH_NAMES.pl;
    monthEl.textContent = `${names[viewMonth]} ${viewYear}`;

    const today   = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + MAX_DAYS_AHEAD);

    const firstDow   = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    /* Monday-first: offset 0=Mon … 6=Sun */
    const offset = firstDow === 0 ? 6 : firstDow - 1;

    let html = '';

    for (let i = 0; i < offset; i++) {
      html += `<div class="cal-day is-empty" aria-hidden="true"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date    = new Date(viewYear, viewMonth, d);
      const iso     = toISO(date);
      const dow     = date.getDay();
      const isPast  = date < today;
      const isFar   = date > maxDate;
      const closed  = !HOURS[dow];
      const isToday = iso === toISO(today);
      const isSel   = bk()?.date === iso;
      const disabled = isPast || isFar || closed;

      html += `<div class="cal-day${
        isToday   ? ' is-today'   : ''}${
        isSel     ? ' is-active'  : ''}${
        disabled  ? ' is-past'    : ''}${
        closed    ? ' is-blocked' : ''}"
        role="gridcell"
        tabindex="${disabled ? -1 : 0}"
        aria-label="${d} ${names[viewMonth]}"
        aria-disabled="${disabled}"
        data-date="${iso}">${d}</div>`;
    }

    grid.innerHTML = html;

    grid.querySelectorAll('.cal-day:not(.is-past):not(.is-empty):not(.is-blocked)')
      .forEach(day => {
        day.addEventListener('click', () => selectDate(day.dataset.date));
        day.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectDate(day.dataset.date);
          }
        });
      });
  };

  /* ================================================================
     DATE SELECTION
  ================================================================ */
  const selectDate = dateStr => {
    const state = bk();
    if (!state) return;
    state.date = dateStr;
    state.time = null;  // reset time on date change

    document.querySelectorAll('.cal-day').forEach(d =>
      d.classList.toggle('is-active', d.dataset.date === dateStr)
    );

    fetchAndRenderSlots(dateStr);
  };

  /* ================================================================
     FETCH + RENDER TIME SLOTS
  ================================================================ */
  const fetchAndRenderSlots = async dateStr => {
    if (slotsLoading) return;
    slotsLoading = true;

    const grid   = document.getElementById('timeslots-grid');
    const prompt = document.getElementById('timeslots-prompt') ||
                   document.querySelector('.timeslots__prompt');
    if (!grid) { slotsLoading = false; return; }

    if (prompt) prompt.style.display = 'none';
    grid.innerHTML = `<div class="step__loading">Ładowanie...</div>`;

    const date = new Date(dateStr + 'T12:00:00');
    const dow  = date.getDay();
    const hrs  = HOURS[dow];

    if (!hrs) {
      grid.innerHTML = `<p style="color:var(--muted);font-size:var(--text-sm);padding:var(--sp-6) 0">
        Nieczynne w ten dzień.
      </p>`;
      slotsLoading = false;
      return;
    }

    /* Fetch booked slots from API */
    try {
      const state = bk();
      bookedSlots = await SheetsAPI.getSlots(dateStr, state?.barberId, state?.serviceId);
      if (!Array.isArray(bookedSlots)) bookedSlots = [];
    } catch {
      bookedSlots = [];
    }

    const now   = new Date();
    const slots = generateSlots(hrs.open, hrs.close);

    grid.innerHTML = slots.map(slot => {
      const [h, m]  = slot.split(':').map(Number);
      const slotDt  = new Date(dateStr + 'T12:00:00');
      slotDt.setHours(h, m, 0, 0);

      const isPast   = slotDt <= now;
      const isBooked = bookedSlots.includes(slot);
      const isActive = bk()?.time === slot;
      const disabled = isPast || isBooked;

      return `<button class="time-slot${
        disabled  ? ' is-booked' : ''}${
        isActive  ? ' is-active' : ''}"
        data-time="${slot}"
        ${disabled ? 'disabled aria-disabled="true"' : ''}
        aria-label="${slot}${isBooked ? ' — niedostępny' : ''}">${slot}</button>`;
    }).join('');

    grid.querySelectorAll('.time-slot:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        const state = bk();
        if (state) state.time = btn.dataset.time;
        grid.querySelectorAll('.time-slot').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
      });
    });

    slotsLoading = false;
  };

  /* ================================================================
     SLOT GENERATOR — 30-min intervals within working hours
  ================================================================ */
  const generateSlots = (openH, closeH) => {
    const slots = [];
    let h = openH, m = 0;
    while (h < closeH) {
      slots.push(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
      m += SLOT_INTERVAL;
      if (m >= 60) { h++; m = 0; }
    }
    return slots;
  };

  /* ================================================================
     MONTH NAVIGATION GUARD
  ================================================================ */
  const clampView = () => {
    const now = new Date();
    const min = { y: now.getFullYear(), m: now.getMonth() };
    const max = { y: now.getFullYear(), m: now.getMonth() + 1 };
    /* Allow at most 2 months ahead */
    if (viewYear < min.y || (viewYear === min.y && viewMonth < min.m)) {
      viewYear = min.y; viewMonth = min.m;
    }
    if (viewYear > max.y || (viewYear === max.y && viewMonth > max.m)) {
      viewYear = max.y; viewMonth = max.m;
    }
  };

  /* ================================================================
     INIT
  ================================================================ */
  const init = () => {
    const now  = new Date();
    viewYear   = now.getFullYear();
    viewMonth  = now.getMonth();

    renderCalendar();

    /* Restore selected date's slots if returning to step 3 */
    const state = bk();
    if (state?.date) fetchAndRenderSlots(state.date);

    /* Bind month nav (re-bind each init to avoid stale closures) */
    const prevBtn = document.getElementById('cal-prev');
    const nextBtn = document.getElementById('cal-next');

    const bindNav = (btn, delta) => {
      if (!btn) return;
      /* Clone to remove previous listeners */
      const fresh = btn.cloneNode(true);
      btn.parentNode.replaceChild(fresh, btn);
      fresh.addEventListener('click', () => {
        viewMonth += delta;
        if (viewMonth > 11) { viewMonth = 0; viewYear++; }
        if (viewMonth < 0)  { viewMonth = 11; viewYear--; }
        clampView();
        renderCalendar();
      });
    };

    bindNav(document.getElementById('cal-prev'), -1);
    bindNav(document.getElementById('cal-next'),  1);
  };

  return { init };
})();
