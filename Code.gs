/* ================================================================
   Code.gs — Google Apps Script backend for MIROWSKI BARBERSHOP

   SETUP:
   1. Create a Google Spreadsheet
   2. Open Extensions → Apps Script, paste this code
   3. Set CONFIG.SPREADSHEET_ID to your spreadsheet ID
   4. Set CONFIG.ADMIN_KEY (must match dashboard.js ADMIN_KEY)
   5. Deploy → New deployment → Web App
      · Execute as: Me
      · Who has access: Anyone (anonymous)
   6. Copy the Web App URL to API_URL in sheets.js and dashboard.js
================================================================ */

const CONFIG = {
  SPREADSHEET_ID: '',             // ← your spreadsheet ID from the URL
  SHEET_NAME:     'Bookings',
  ADMIN_KEY:      'MIR_ADMIN_2025', // ← change this + update dashboard.js
  TIMEZONE:       'Europe/Warsaw',
};

/* ── Column indices (1-based) ── */
const COL = {
  ID:1, DATE:2, TIME:3, DURATION:4,
  SERVICE_ID:5, SERVICE_NAME:6,
  BARBER_ID:7, BARBER_NAME:8,
  CLIENT_NAME:9, CLIENT_PHONE:10, CLIENT_EMAIL:11, NOTES:12,
  PRICE:13, STATUS:14, CREATED_AT:15, CODE:16,
};

const HEADER = [
  'ID','Date','Time','Duration',
  'ServiceId','ServiceName','BarberId','BarberName',
  'ClientName','ClientPhone','ClientEmail','Notes',
  'Price','Status','CreatedAt','Code',
];

/* ================================================================
   doGet — route by query parameter
================================================================ */
function doGet(e) {
  const p = e.parameter || {};
  try {
    /* Admin: GET ?key=ADMIN_KEY */
    if (p.key && p.key === CONFIG.ADMIN_KEY) {
      return ok({ bookings: getBookings() });
    }

    /* Slots: GET ?date=YYYY-MM-DD[&barber=b1] */
    if (p.date) {
      return ok({ taken: getTakenSlots(p.date, p.barber || null) });
    }

    return ok({ error: 'Bad request' });
  } catch(err) {
    return ok({ error: err.message });
  }
}

/* ================================================================
   doPost — route by body.action
================================================================ */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    switch (body.action) {
      case 'createBooking':
        return ok(createBooking(body));

      case 'updateStatus':
        if (body.key !== CONFIG.ADMIN_KEY)
          return ok({ success:false, error:'Unauthorized' });
        return ok(updateStatus(body.id, body.status));

      default:
        return ok({ success:false, error:'Unknown action' });
    }
  } catch(err) {
    return ok({ success:false, error:err.message });
  }
}

/* ================================================================
   createBooking — append a new row
================================================================ */
function createBooking(d) {
  /* Validate */
  if (!d.date || !d.time) return { success:false, error:'Missing date or time' };
  if (!d.clientName && !d.name)  return { success:false, error:'Missing client name' };
  if (!d.clientPhone && !d.phone) return { success:false, error:'Missing phone' };

  /* Double-booking guard */
  const taken = getTakenSlots(d.date, d.barberId || null);
  if (taken.includes(d.time)) {
    return { success:false, error:'Slot already booked' };
  }

  const id   = Utilities.getUuid();
  const code = generateCode();
  const now  = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');

  /* Build row aligned to HEADER order */
  const row = [
    id,
    d.date,                            // stored as string — avoids Sheets auto-date parsing
    d.time,
    d.duration || 60,
    d.serviceId   || '',
    d.serviceName || '',
    d.barberId    || '',
    d.barberName  || '',
    d.clientName  || d.name  || '',
    d.clientPhone || d.phone || '',
    d.clientEmail || d.email || '',
    d.notes  || '',
    d.price  || 0,
    'pending',
    now,
    code,
  ];

  getSheet().appendRow(row);
  return { success:true, confirmationCode:code };
}

/* ================================================================
   updateStatus — find row by ID, set new status
================================================================ */
function updateStatus(id, status) {
  const valid = ['pending','confirmed','cancelled'];
  if (!valid.includes(status)) return { success:false, error:'Invalid status' };

  const sheet = getSheet();
  const rows  = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][COL.ID - 1]) === String(id)) {
      sheet.getRange(i + 1, COL.STATUS).setValue(status);
      return { success:true };
    }
  }
  return { success:false, error:'Not found' };
}

/* ================================================================
   getTakenSlots — booked times for a given date (+ optional barber)
   Skips cancelled bookings.
================================================================ */
function getTakenSlots(targetDate, barberId) {
  const rows  = getSheet().getDataRange().getValues();
  const taken = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[COL.ID - 1]) continue;
    if (String(row[COL.STATUS - 1]) === 'cancelled') continue;

    const rowDate = normalizeDate(row[COL.DATE - 1]);
    if (rowDate !== targetDate) continue;
    if (barberId && String(row[COL.BARBER_ID - 1]) !== barberId) continue;

    const time = String(row[COL.TIME - 1]).trim();
    if (time) taken.push(time);
  }

  return taken;
}

/* ================================================================
   getBookings — all rows for admin view (sorted by date+time)
================================================================ */
function getBookings() {
  const rows   = getSheet().getDataRange().getValues();
  const result = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[COL.ID - 1]) continue;

    result.push({
      id:               String(r[COL.ID - 1]),
      date:             normalizeDate(r[COL.DATE - 1]),
      time:             String(r[COL.TIME - 1]),
      duration:         Number(r[COL.DURATION - 1]) || 60,
      serviceId:        String(r[COL.SERVICE_ID - 1]),
      serviceName:      String(r[COL.SERVICE_NAME - 1]),
      barberId:         String(r[COL.BARBER_ID - 1]),
      barberName:       String(r[COL.BARBER_NAME - 1]),
      clientName:       String(r[COL.CLIENT_NAME - 1]),
      clientPhone:      String(r[COL.CLIENT_PHONE - 1]),
      clientEmail:      String(r[COL.CLIENT_EMAIL - 1]),
      notes:            String(r[COL.NOTES - 1]),
      price:            Number(r[COL.PRICE - 1]) || 0,
      status:           String(r[COL.STATUS - 1]) || 'pending',
      createdAt:        String(r[COL.CREATED_AT - 1]),
      confirmationCode: String(r[COL.CODE - 1]),
    });
  }

  /* Upcoming first, then past */
  return result.sort((a, b) =>
    (a.date + a.time).localeCompare(b.date + b.time)
  );
}

/* ================================================================
   Utilities
================================================================ */
function getSheet() {
  const ss = CONFIG.SPREADSHEET_ID
    ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  /* First-run: create sheet with header row */
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow(HEADER);
    /* Freeze header */
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/* Google Sheets may store date cells as Date objects or strings.
   Normalise to YYYY-MM-DD string in either case.                  */
function normalizeDate(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, CONFIG.TIMEZONE, 'yyyy-MM-dd');
  }
  return String(val).replace(/\//g, '-').split('T')[0];
}

/* 6-char alphanumeric code (no ambiguous chars: 0, O, I, 1) */
function generateCode() {
  const pool = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += pool[Math.floor(Math.random() * pool.length)];
  return code;
}

/* Return JSON as text/plain — avoids CORS preflight,
   response is still parseable with JSON.parse().          */
function ok(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.TEXT);
}
