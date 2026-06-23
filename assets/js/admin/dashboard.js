/* ================================================================
   DASHBOARD.JS — MIROWSKI BARBERSHOP Admin Panel
   Auth → Fetch → Render → Filter → Sort → Actions
================================================================ */
(async () => {

  /* ── Config — must match Code.gs ── */
  const API_URL   = ''; // Your Apps Script Web App URL
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
      const date   = bk.date ? fmtDate(bk.date) : '—';
      const badge  = `<span class="badge badge--${bk.status}">${statusLabel(bk.status)}</span>`;
      const acts   = buildActions(bk);
      return `<tr data-id="${esc(bk.id)}">
        <td>${date}</td>
        <td>${esc(bk.time||'—')}</td>
        <td><strong>${esc(bk.clientName||'—')}</strong></td>
        <td class="col-muted">${esc(bk.clientPhone||'—')}</td>
        <td>${esc(bk.serviceName||'—')}</td>
        <td class="col-muted">${esc(bk.barberName||'—')}</td>
        <td>${badge}</td>
        <td><div class="actions-cell">${acts}</div></td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', () => handleAction(btn.dataset.id, btn.dataset.action));
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
  async function handleAction(id, newStatus) {
    try {
      const res = await api('POST', { action:'updateStatus', id, status:newStatus, key:adminKey });
      if (res.success) {
        const bk = allBookings.find(b => b.id === id);
        if (bk) { bk.status = newStatus; updateStats(); renderTable(); stamp(); }
      }
    } catch { /* silent */ }
  }

  /* ── Refresh button ── */
  document.getElementById('btn-refresh')?.addEventListener('click', async () => {
    if (!adminKey) return;
    try {
      const res = await api('GET', { key: adminKey });
      if (res.bookings) { allBookings = res.bookings; updateStats(); renderTable(); stamp(); }
    } catch { /* silent */ }
  });

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

  /* ── Mock for local development ── */
  function mockApi(params) {
    if (params.key === ADMIN_KEY) {
      return Promise.resolve({ bookings: [
        { id:'1', date:'2026-06-25', time:'10:00', clientName:'Jan Kowalski',    clientPhone:'+48 666 100 200', serviceName:'Strzyżenie klasyczne', barberId:'b1', barberName:'Mirowski',   status:'pending',   confirmationCode:'ABC123' },
        { id:'2', date:'2026-06-25', time:'11:30', clientName:'Piotr Nowak',     clientPhone:'+48 777 200 300', serviceName:'Stylizacja brody',      barberId:'b2', barberName:'Aleksander', status:'confirmed', confirmationCode:'DEF456' },
        { id:'3', date:'2026-06-26', time:'09:00', clientName:'Adam Wiśniewski', clientPhone:'+48 500 300 400', serviceName:'Full Package',           barberId:'b1', barberName:'Mirowski',   status:'cancelled', confirmationCode:'GHI789' },
      ]});
    }
    return Promise.resolve({ error: 'Unauthorized' });
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

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

})();
