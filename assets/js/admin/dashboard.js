/* ================================================================
   DASHBOARD.JS — MIROWSKI BARBERSHOP Admin Panel
   Auth → Fetch → Render → Filter → Sort → Actions
================================================================ */
(async () => {

  /* ── Config — must match backend.gs ── */
  const API_URL   = 'https://script.google.com/macros/s/AKfycbwxP6ouOnpLDH4luOUiqeZ_cK2yP8o41uEki-l8yJ8Nt1iCi5YVNlHEutve0WwTGnLVLg/exec';
  const ADMIN_KEY = 'MIR_ADMIN_2025';

  /* ── DOM ── */
  const authGate  = document.getElementById('auth-gate');
  const dashboard = document.getElementById('admin-dashboard');
  const authForm  = document.getElementById('auth-form');
  const authPin   = document.getElementById('auth-pin');
  const authBtn   = document.getElementById('auth-submit');
  const authErr   = document.getElementById('auth-error');
  const tbody     = document.getElementById('bookings-body');
  const emptyMsg  = document.getElementById('table-empty');
  const lastUpd   = document.getElementById('last-updated');

  /* ── State ── */
  let allBookings = [];
  let adminKey    = null;
  let sortCol     = 'date';
  let sortAsc     = true;
  let filters     = { date:'', barber:'', status:'', search:'' };

  /* ================================================================
     BOOTSTRAP — check URL key first, fall back to form
  ================================================================ */
  const urlKey = new URLSearchParams(location.search).get('key');
  if (urlKey) {
    await authenticate(urlKey, true);
  }

  authForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const pin = authPin?.value.trim();
    if (!pin) return;
    await authenticate(pin, false);
  });

  /* ================================================================
     AUTHENTICATION
  ================================================================ */
  async function authenticate(key, silent) {
    setLoading(true);
    setError('');
    try {
      const res = await api('GET', { key });
      if (Array.isArray(res.bookings)) {
        adminKey    = key;
        allBookings = res.bookings;
        showDashboard();
      } else {
        if (!silent) setError('Nieprawidłowe hasło');
      }
    } catch {
      if (!silent) setError('Błąd połączenia z serwerem');
    } finally {
      setLoading(false);
    }
  }

  function setLoading(on) {
    if (!authBtn) return;
    authBtn.classList.toggle('is-loading', on);
    authBtn.disabled = on;
  }

  function setError(msg) {
    if (authErr) authErr.textContent = msg;
  }

  /* ================================================================
     SHOW DASHBOARD
  ================================================================ */
  function showDashboard() {
    authGate?.classList.add('is-hidden');
    dashboard?.classList.remove('is-hidden');
    updateStats();
    renderTable();
    bindFilters();
    bindSortHeaders();
    stamp();
    /* Load barbers for filter immediately after login */
    api('POST', { action:'getBarbers', key: adminKey })
      .then(res => {
        if (res?.barbers) {
          _allBarbers = res.barbers;
          _barbersLoaded = true;
          populateBarberFilter(res.barbers);
        }
      })
      .catch(() => { /* filter stays at "all" — non-critical */ });
  }

  function populateBarberFilter(barbers) {
    const sel = document.getElementById('f-barber');
    if (!sel) return;
    const prev = sel.value;
    while (sel.options.length > 1) sel.remove(1);
    barbers.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = b.name + (b.active ? '' : ' (nieaktywny)');
      sel.appendChild(opt);
    });
    if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;
  }

  function stamp() {
    if (lastUpd) {
      lastUpd.textContent = 'Aktualizacja: ' +
        new Date().toLocaleTimeString('pl-PL', { hour:'2-digit', minute:'2-digit' });
    }
  }

  /* ================================================================
     STATS
  ================================================================ */
  function updateStats() {
    const n = (status) => allBookings.filter(b => b.status === status).length;
    set('stat-total',     allBookings.length);
    set('stat-pending',   n('pending'));
    set('stat-confirmed', n('confirmed'));
    set('stat-cancelled', n('cancelled'));
    function set(id, val) {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    }
  }

  /* ================================================================
     FILTERS
  ================================================================ */
  function bindFilters() {
    document.getElementById('f-date')?.addEventListener('input',  e => { filters.date   = e.target.value; renderTable(); });
    document.getElementById('f-barber')?.addEventListener('change',e => { filters.barber = e.target.value; renderTable(); });
    document.getElementById('f-status')?.addEventListener('change',e => { filters.status = e.target.value; renderTable(); });
    document.getElementById('f-search')?.addEventListener('input', e => { filters.search = e.target.value.toLowerCase(); renderTable(); });

    document.getElementById('btn-clear')?.addEventListener('click', () => {
      filters = { date:'', barber:'', status:'', search:'' };
      ['f-date','f-barber','f-status','f-search'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
      });
      renderTable();
    });
  }

  function applyFilters(rows) {
    return rows.filter(b => {
      if (filters.date   && b.date    !== filters.date)    return false;
      if (filters.barber && b.barberId !== filters.barber)  return false;
      if (filters.status && b.status  !== filters.status)   return false;
      if (filters.search) {
        const hay = `${b.clientName} ${b.clientPhone} ${b.serviceName} ${b.barberName}`.toLowerCase();
        if (!hay.includes(filters.search)) return false;
      }
      return true;
    });
  }

  /* ================================================================
     SORT
  ================================================================ */
  function bindSortHeaders() {
    document.querySelectorAll('.bookings-table th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (sortCol === col) { sortAsc = !sortAsc; }
        else { sortCol = col; sortAsc = true; }
        renderTable();
        document.querySelectorAll('.bookings-table th').forEach(h => h.classList.remove('sort-asc','sort-desc'));
        th.classList.add(sortAsc ? 'sort-asc' : 'sort-desc');
      });
    });
  }

  function applySort(rows) {
    return [...rows].sort((a, b) => {
      const va = String(a[sortCol] || '');
      const vb = String(b[sortCol] || '');
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }

  /* ================================================================
     RENDER TABLE
  ================================================================ */
  function renderTable() {
    if (!tbody) return;
    const rows = applySort(applyFilters(allBookings));

    emptyMsg?.classList.toggle('is-hidden', rows.length > 0);

    if (!rows.length) { tbody.innerHTML = ''; return; }

    tbody.innerHTML = rows.map(bk => {
      const date  = bk.date ? fmtDate(bk.date) : '—';
      const time  = fmtTime(bk.time);
      const badge = `<span class="badge badge--${bk.status}">${statusLabel(bk.status)}</span>`;
      const acts  = buildActions(bk);
      return `<tr data-id="${esc(bk.id)}">
        <td><strong>${date}</strong><br><small class="col-muted">${time}</small></td>
        <td><strong>${esc(bk.clientName||'—')}</strong><br><small class="col-muted">${esc(bk.clientPhone||'—')}</small></td>
        <td>${esc(bk.serviceName||'—')}</td>
        <td class="col-muted">${esc(bk.barberName||'—')}</td>
        <td>${badge}</td>
        <td><div class="actions-cell">${acts}</div></td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => handleAction(btn.dataset.id, btn.dataset.action, btn));
    });
  }

  function buildActions(bk) {
    const { id, status } = bk;
    const b = (cls, action, label) =>
      `<button class="adm-btn adm-btn--sm ${cls}" data-id="${id}" data-action="${action}">${label}</button>`;

    if (status === 'pending')   return b('adm-btn--confirm','confirmed','Potwierdź') + b('adm-btn--cancel','cancelled','Anuluj');
    if (status === 'confirmed') return b('adm-btn--cancel','cancelled','Anuluj');
    if (status === 'cancelled') return b('adm-btn--restore','pending','Przywróć');
    return '';
  }

  /* ================================================================
     ACTIONS
  ================================================================ */
  async function handleAction(id, newStatus, triggerBtn) {
    /* Disable button to prevent double-submit */
    if (triggerBtn) { triggerBtn.disabled = true; triggerBtn.classList.add('is-loading'); }

    try {
      const res = await api('POST', { action:'updateStatus', id, status:newStatus, key:adminKey });

      if (res && res.success) {
        const bk = allBookings.find(b => b.id === id);
        if (bk) {
          bk.status = newStatus;
          updateStats();
          renderTable();
          stamp();
        }
        toast('Zaktualizowano status.', 'ok');
      } else {
        const msg = res?.error || 'Serwer odrzucił żądanie.';
        toast('Błąd: ' + msg, 'err');
        /* Re-enable button on failure so user can retry */
        if (triggerBtn) { triggerBtn.disabled = false; triggerBtn.classList.remove('is-loading'); }
      }
    } catch (err) {
      toast('Błąd połączenia: ' + (err.message || 'nieznany błąd'), 'err');
      if (triggerBtn) { triggerBtn.disabled = false; triggerBtn.classList.remove('is-loading'); }
    }
  }

  /* ── Refresh button ── */
  document.getElementById('btn-refresh')?.addEventListener('click', async () => {
    if (!adminKey) return;
    try {
      const res = await api('GET', { key: adminKey });
      if (res.bookings) { allBookings = res.bookings; updateStats(); renderTable(); stamp(); }
    } catch { /* silent */ }
  });

  /* ================================================================
     TAB SWITCHING
  ================================================================ */
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const tab = btn.dataset.tab;
      document.getElementById('panel-bookings')?.classList.toggle('is-hidden', tab !== 'bookings');
      document.getElementById('panel-barbers')?.classList.toggle('is-hidden', tab !== 'barbers');
      if (tab === 'barbers' && !_barbersLoaded) loadBarbers();
    });
  });

  /* ================================================================
     BARBERS MANAGEMENT
  ================================================================ */
  const SERVICES_LIST = [
    { id:'s1', name:'Strzyżenie klasyczne' }, { id:'s2', name:'Stylizacja brody' },
    { id:'s3', name:'Strzyżenie + Broda' },   { id:'s4', name:'Golenie brzytwą' },
    { id:'s5', name:'Strzyżenie maszynką' },  { id:'s6', name:'Full Package' },
  ];

  let _allBarbers   = [];
  let _barbersLoaded = false;
  let _editingId    = null;

  async function loadBarbers() {
    _barbersLoaded = true;
    try {
      const res = await api('POST', { action: 'getBarbers', key: adminKey });
      _allBarbers = res?.barbers || [];
    } catch { _allBarbers = []; }
    renderBarbers();
    populateBarberFilter(_allBarbers);
  }

  function renderBarbers() {
    const grid = document.getElementById('barbers-grid');
    if (!grid) return;
    if (!_allBarbers.length) {
      grid.innerHTML = '<p style="color:var(--muted);padding:24px 0">Brak barberów. Dodaj pierwszego.</p>';
      return;
    }
    grid.innerHTML = _allBarbers.map(b => {
      const av = b.avatar
        ? `<img src="${esc(b.avatar)}" alt="${esc(b.name)}" class="bc-avatar">`
        : `<div class="bc-avatar bc-avatar--placeholder">&#9986;</div>`;
      const activeBadge = b.active ? '' : '<span class="badge badge--cancelled">Nieaktywny</span>';
      const svcCount = b.services ? b.services.split(',').filter(Boolean).length : 0;
      return `<div class="barber-card" data-id="${esc(b.id)}">
        ${av}
        <div class="bc-body">
          <div class="bc-name">${esc(b.name)} ${activeBadge}</div>
          <div class="bc-spec">${esc(b.spec)}</div>
          <div class="bc-meta">${svcCount} usług · ${b.availability ? b.availability.split(',').length : 0} dni</div>
        </div>
        <div class="bc-actions">
          <button class="adm-btn adm-btn--sm adm-btn--ghost bc-edit" data-id="${esc(b.id)}">Edytuj</button>
          <button class="adm-btn adm-btn--sm adm-btn--cancel bc-delete" data-id="${esc(b.id)}">Usuń</button>
        </div>
      </div>`;
    }).join('');

    grid.querySelectorAll('.bc-edit').forEach(btn =>
      btn.addEventListener('click', () => openBarberModal(btn.dataset.id)));
    grid.querySelectorAll('.bc-delete').forEach(btn =>
      btn.addEventListener('click', () => deleteBarberById(btn.dataset.id, btn)));
  }

  function openBarberModal(id) {
    _editingId = id || null;
    const modal = document.getElementById('barber-modal');
    const title = document.getElementById('barber-modal-title');
    const form  = document.getElementById('barber-form');
    if (!modal || !form) return;

    /* Populate service checkboxes */
    const svcWrap = document.getElementById('bf-services');
    if (svcWrap) {
      svcWrap.innerHTML = SERVICES_LIST.map(s =>
        `<label class="bf-check"><input type="checkbox" name="svc" value="${s.id}"> ${s.name}</label>`
      ).join('');
    }

    if (id) {
      const b = _allBarbers.find(x => x.id === id);
      if (!b) return;
      title.textContent = 'Edytuj barbera';
      document.getElementById('bf-id').value    = b.id;
      document.getElementById('bf-name').value  = b.name;
      document.getElementById('bf-spec').value  = b.spec;
      document.getElementById('bf-avatar').value = b.avatar || '';
      document.getElementById('bf-active').checked = b.active !== false;
      updateAvatarPreview(b.avatar || '');
      /* Tick services */
      const svcs = (b.services || '').split(',').map(s => s.trim());
      svcWrap?.querySelectorAll('input[name="svc"]').forEach(cb => {
        cb.checked = svcs.includes(cb.value);
      });
      /* Tick availability */
      const avail = (b.availability || '').split(',').map(s => s.trim());
      form.querySelectorAll('input[name="avail"]').forEach(cb => {
        cb.checked = avail.includes(cb.value);
      });
    } else {
      title.textContent = 'Dodaj barbera';
      form.reset();
      document.getElementById('bf-id').value = '';
      svcWrap?.querySelectorAll('input[name="svc"]').forEach(cb => cb.checked = true);
      form.querySelectorAll('input[name="avail"]').forEach(cb => cb.checked = ['1','2','3','4','5'].includes(cb.value));
      updateAvatarPreview('');
    }
    document.getElementById('barber-form-error').textContent = '';
    modal.classList.remove('is-hidden');
  }

  function updateAvatarPreview(src) {
    const el = document.getElementById('bf-avatar-preview');
    if (!el) return;
    el.innerHTML = src
      ? `<img src="${esc(src)}" alt="podgląd" style="height:60px;border-radius:50%;margin-top:6px;">`
      : '';
  }

  document.getElementById('bf-avatar')?.addEventListener('input', e => updateAvatarPreview(e.target.value));

  function closeBarberModal() {
    document.getElementById('barber-modal')?.classList.add('is-hidden');
    _editingId = null;
  }

  document.getElementById('btn-add-barber')?.addEventListener('click',       () => openBarberModal(null));
  document.getElementById('barber-modal-close')?.addEventListener('click',   closeBarberModal);
  document.getElementById('barber-modal-cancel')?.addEventListener('click',  closeBarberModal);
  document.getElementById('barber-modal')?.addEventListener('click', e => {
    if (e.target === document.getElementById('barber-modal')) closeBarberModal();
  });

  document.getElementById('barber-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const errEl  = document.getElementById('barber-form-error');
    const saveBtn = document.getElementById('barber-modal-save');
    const name   = document.getElementById('bf-name')?.value.trim();
    const spec   = document.getElementById('bf-spec')?.value.trim();
    if (!name || !spec) { errEl.textContent = 'Imię i specjalizacja są wymagane.'; return; }

    const svcs  = [...document.querySelectorAll('#bf-services input[name="svc"]:checked')].map(c => c.value);
    const avail = [...document.querySelectorAll('#barber-form input[name="avail"]:checked')].map(c => c.value);

    const barber = {
      id:           document.getElementById('bf-id')?.value || null,
      name, spec,
      avatar:       document.getElementById('bf-avatar')?.value.trim() || '',
      services:     svcs.join(','),
      availability: avail.join(','),
      active:       document.getElementById('bf-active')?.checked !== false,
    };

    saveBtn.disabled = true; saveBtn.classList.add('is-loading');
    errEl.textContent = '';
    try {
      const res = await api('POST', { action:'saveBarber', barber, key: adminKey });
      if (res?.success) {
        await loadBarbers();
        closeBarberModal();
        toast('Barber zapisany.', 'ok');
      } else {
        errEl.textContent = res?.error || 'Błąd zapisu.';
      }
    } catch (err) {
      errEl.textContent = 'Błąd połączenia: ' + (err.message || 'nieznany');
    } finally {
      saveBtn.disabled = false; saveBtn.classList.remove('is-loading');
    }
  });

  async function deleteBarberById(id, btn) {
    if (!confirm('Usunąć tego barbera? Tej operacji nie można cofnąć.')) return;
    if (btn) { btn.disabled = true; btn.classList.add('is-loading'); }
    try {
      const res = await api('POST', { action:'deleteBarber', id, key: adminKey });
      if (res?.success) {
        _allBarbers = _allBarbers.filter(b => b.id !== id);
        renderBarbers();
        toast('Barber usunięty.', 'ok');
      } else {
        toast(res?.error || 'Błąd usuwania.', 'err');
        if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); }
      }
    } catch (err) {
      toast('Błąd: ' + err.message, 'err');
      if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); }
    }
  }

  /* ── Logout ── */
  document.getElementById('btn-logout')?.addEventListener('click', () => {
    adminKey = null; allBookings = [];
    dashboard?.classList.add('is-hidden');
    authGate?.classList.remove('is-hidden');
    history.replaceState({}, '', location.pathname);
  });

  /* ================================================================
     API HELPER — text/plain POST to avoid CORS preflight
  ================================================================ */
  async function api(method, params) {
    if (!API_URL) return mockApi(params);

    if (method === 'GET') {
      const r = await fetch(`${API_URL}?${new URLSearchParams(params)}`, { method:'GET' });
      return JSON.parse(await r.text());
    }

    const r = await fetch(API_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body:    JSON.stringify(params),
    });
    return JSON.parse(await r.text());
  }

  /* ── Mock for local development (API_URL not set) ── */
  function mockApi(params) {
    if (params.key !== ADMIN_KEY) {
      return Promise.resolve({ error: 'Unauthorized' });
    }
    /* GET-style: fetch all bookings */
    if (!params.action) {
      return Promise.resolve({ bookings: [
        { id:'1', date:'2026-06-25', time:'10:00', clientName:'Jan Kowalski',    clientPhone:'+48 666 100 200', serviceName:'Strzyżenie klasyczne', barberId:'b1', barberName:'Mirowski',   status:'pending',   confirmationCode:'ABC123' },
        { id:'2', date:'2026-06-25', time:'11:30', clientName:'Piotr Nowak',     clientPhone:'+48 777 200 300', serviceName:'Stylizacja brody',      barberId:'b2', barberName:'Aleksander', status:'confirmed', confirmationCode:'DEF456' },
        { id:'3', date:'2026-06-26', time:'09:00', clientName:'Adam Wiśniewski', clientPhone:'+48 500 300 400', serviceName:'Full Package',           barberId:'b1', barberName:'Mirowski',   status:'cancelled', confirmationCode:'GHI789' },
      ]});
    }
    /* POST-style: action routing */
    if (params.action === 'updateStatus') return Promise.resolve({ success: true });
    if (params.action === 'getBarbers')   return Promise.resolve({ barbers: _allBarbers });
    if (params.action === 'saveBarber')   return Promise.resolve({ success: true, id: params.barber?.id || 'b_mock' });
    if (params.action === 'deleteBarber') return Promise.resolve({ success: true });
    return Promise.resolve({ success: false, error: 'Unknown mock action' });
  }

  /* ================================================================
     UTILITIES
  ================================================================ */
  function statusLabel(s) {
    return { pending:'Oczekuje', confirmed:'Potwierdzone', cancelled:'Anulowane' }[s] || s;
  }

  function fmtDate(iso) {
    return new Date(iso + 'T12:00:00')
      .toLocaleDateString('pl-PL', { day:'2-digit', month:'2-digit', year:'numeric' });
  }

  function fmtTime(raw) {
    if (!raw) return '—';
    const s = String(raw);
    if (/^\d{1,2}:\d{2}/.test(s)) return s.substring(0, 5);
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toLocaleTimeString('pl-PL', { hour:'2-digit', minute:'2-digit' });
    return s.substring(0, 5);
  }

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ================================================================
     TOAST NOTIFICATIONS
  ================================================================ */
  let _toastTimer = null;

  function toast(msg, type /* 'ok' | 'err' | 'info' */) {
    let el = document.getElementById('adm-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'adm-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className   = 'adm-toast adm-toast--' + (type || 'info') + ' is-visible';
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => el.classList.remove('is-visible'), 3500);
  }

})();
