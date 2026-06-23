/* ================================================================
   SHEETS.JS — Google Apps Script API layer
   Set API_URL to your deployed Web App endpoint.
   When API_URL is empty, mock responses are used for local dev.
   MIROWSKI BARBERSHOP
================================================================ */
const SheetsAPI = (() => {

  /* Replace with your deployed Apps Script Web App URL */
  const API_URL = '';

  /* Mock network delay (ms) */
  const MOCK_DELAY = 550;

  /* Pre-seeded mock booked slots for demo: { 'YYYY-MM-DD': ['HH:MM', ...] } */
  const MOCK_BOOKED = {};

  /* ── Generic fetch ── */
  const request = async (action, data = {}) => {
    if (!API_URL) return mockResponse(action, data);

    const res = await fetch(API_URL, {
      method: 'POST',
      /* text/plain avoids CORS preflight with Apps Script */
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action, ...data }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };

  /* ── Mock responses ── */
  const mockResponse = async (action, data) => {
    await new Promise(r => setTimeout(r, MOCK_DELAY));

    switch (action) {
      case 'getSlots':
        return MOCK_BOOKED[data.date] || [];

      case 'createBooking': {
        const code = Math.random().toString(36).substr(2, 6).toUpperCase();
        return { success: true, confirmationCode: code };
      }

      case 'adminAuth':
        return data.pin === '1234'
          ? { success: true, token: 'mock-token-' + Date.now() }
          : { success: false, error: 'Nieprawidłowy PIN' };

      case 'getAppointments':
        return { success: true, appointments: [] };

      case 'updateStatus':
        return { success: true };

      default:
        return { success: true };
    }
  };

  /* ── Public API ── */
  return {
    /* Returns string[] of booked time strings e.g. ['09:00', '10:30'] */
    getSlots: (date, barberId, serviceId) =>
      request('getSlots', { date, barberId, serviceId }),

    createBooking: payload =>
      request('createBooking', payload),

    adminAuth: pin =>
      request('adminAuth', { pin }),

    getAppointments: (token, filters = {}) =>
      request('getAppointments', { token, ...filters }),

    updateStatus: (token, id, status) =>
      request('updateStatus', { token, id, status }),
  };
})();
