/* ================================================================
   backend.gs — MIROWSKI BARBERSHOP · Google Apps Script backend
   Version: 1.0 production

   SETUP (one-time):
   1. Create a new Google Spreadsheet
   2. Open Extensions → Apps Script, paste this entire file
   3. Fill in CONFIG below
   4. Deploy → New deployment → Web App
      · Execute as: Me
      · Who has access: Anyone (no Google account required)
   5. Copy the Web App URL to API_URL in app.js
   6. To update after code changes: Deploy → Manage → New version

   SHEET COLUMNS (auto-created on first booking):
   A:ID  B:Date  C:Time  D:Duration  E:ServiceId  F:ServiceName
   G:BarberId  H:BarberName  I:ClientName  J:ClientPhone
   K:ClientEmail  L:Notes  M:Price  N:Status  O:CreatedAt  P:Code
================================================================ */

const CONFIG = {
  SPREADSHEET_ID: '1HvggGsM6d6QduhXh9A3rAf0RKivx57cMCnzAEjSeVs4',           // ← paste your spreadsheet ID from the URL
  SHEET_NAME:     'Bookings',
  ADMIN_KEY:      'MIR_ADMIN_2025', // ← change this, update app.js too
  TIMEZONE:       'Europe/Warsaw',
};

const COL = {
  ID:1, DATE:2, TIME:3, DURATION:4,
  SERVICE_ID:5, SERVICE_NAME:6, BARBER_ID:7, BARBER_NAME:8,
  CLIENT_NAME:9, CLIENT_PHONE:10, CLIENT_EMAIL:11, NOTES:12,
  PRICE:13, STATUS:14, CREATED_AT:15, CODE:16,
};

const HEADER_ROW = [
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
    if (p.key === CONFIG.ADMIN_KEY) {
      return json({ bookings: getBookings() });
    }
    if (p.action === 'getBarbers') {
      return json({ barbers: getBarbers() });
    }
    if (p.date) {
      return json({ taken: getTakenSlots(p.date, p.barber || null) });
    }
    return json({ error: 'Bad request' });
  } catch(err) {
    return json({ error: err.message });
  }
}

/* ================================================================
   doPost — route by body.action
================================================================ */
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    switch (body.action) {
      case 'getSlots':
        return json({ taken: getTakenSlots(body.date, body.barberId || null) });
      case 'getBarbers':
        return json({ barbers: getBarbers() });
      case 'createBooking':
        return json(createBooking(body));
      case 'updateStatus':
        if (body.key !== CONFIG.ADMIN_KEY)
          return json({ success: false, error: 'Unauthorized' });
        return json(updateStatus(body.id, body.status));
      case 'saveBarber':
        if (body.key !== CONFIG.ADMIN_KEY)
          return json({ success: false, error: 'Unauthorized' });
        return json(saveBarber(body.barber));
      case 'deleteBarber':
        if (body.key !== CONFIG.ADMIN_KEY)
          return json({ success: false, error: 'Unauthorized' });
        return json(deleteBarber(body.id));
      default:
        return json({ success: false, error: 'Unknown action' });
    }
  } catch(err) {
    return json({ success: false, error: err.message });
  }
}

/* ================================================================
   createBooking
================================================================ */
function createBooking(d) {
  if (!d.date || !d.time)
    return { success: false, error: 'Missing date or time' };
  if (!d.clientName && !d.name)
    return { success: false, error: 'Missing client name' };
  if (!d.clientPhone && !d.phone)
    return { success: false, error: 'Missing phone number' };

  /* Double-booking guard */
  const taken = getTakenSlots(d.date, d.barberId || null);
  if (taken.includes(d.time))
    return { success: false, error: 'Slot is already booked' };

  const id   = Utilities.getUuid();
  const code = generateCode();
  const ts   = Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss');

  getSheet().appendRow([
    id,
    d.date,                             // stored as plain string — avoids Sheets date serialisation
    d.time,
    d.duration   || 60,
    d.serviceId  || '',
    d.serviceName || '',
    d.barberId   || '',
    d.barberName || '',
    d.clientName || d.name  || '',
    d.clientPhone || d.phone || '',
    d.clientEmail || d.email || '',
    d.notes   || '',
    d.price   || 0,
    'pending',
    ts,
    code,
  ]);

  return { success: true, confirmationCode: code };
}

/* ================================================================
   updateStatus
================================================================ */
function updateStatus(id, status) {
  if (!['pending','confirmed','cancelled'].includes(status))
    return { success: false, error: 'Invalid status value' };

  const sheet = getSheet();
  const data  = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][COL.ID - 1]) === String(id)) {
      sheet.getRange(i + 1, COL.STATUS).setValue(status);
      return { success: true };
    }
  }
  return { success: false, error: 'Booking not found' };
}

/* ================================================================
   getTakenSlots — booked times for a date, skipping cancelled
================================================================ */
function getTakenSlots(targetDate, barberId) {
  const rows  = getSheet().getDataRange().getValues();
  const taken = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[COL.ID - 1]) continue;
    if (String(r[COL.STATUS - 1]) === 'cancelled') continue;
    if (normalizeDate(r[COL.DATE - 1]) !== targetDate) continue;
    if (barberId && String(r[COL.BARBER_ID - 1]) !== String(barberId)) continue;

    const t = normalizeTime(r[COL.TIME - 1]);
    if (t) taken.push(t);
  }
  return taken;
}

/* ================================================================
   getBookings — all rows for admin view
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
      time:             normalizeTime(r[COL.TIME - 1]),
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

  return result.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

/* ================================================================
   Utilities
================================================================ */
function getSheet() {
  const ss = CONFIG.SPREADSHEET_ID
    ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow(HEADER_ROW);
    sheet.setFrozenRows(1);
    /* Format header row */
    const headerRange = sheet.getRange(1, 1, 1, HEADER_ROW.length);
    headerRange.setFontWeight('bold').setBackground('#1a1a1a').setFontColor('#C6A769');
  }
  return sheet;
}

/* Handles both Date objects (when Sheets auto-parses) and strings */
function normalizeDate(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, CONFIG.TIMEZONE, 'yyyy-MM-dd');
  }
  return String(val).replace(/\//g, '-').split('T')[0].trim();
}

/* Sheets auto-converts "10:00" to a Date object — extract HH:mm back */
function normalizeTime(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, CONFIG.TIMEZONE, 'HH:mm');
  }
  return String(val).trim().substring(0, 5);
}

function generateCode() {
  const pool = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += pool[Math.floor(Math.random() * pool.length)];
  return c;
}

/* text/plain avoids CORS OPTIONS preflight while remaining JSON-parseable */
function json(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.TEXT);
}

/* ================================================================
   BARBERS SHEET
   Columns: ID | Name | Spec | Avatar | Services | Availability | Active
================================================================ */
const BC = { ID:1, NAME:2, SPEC:3, AVATAR:4, SERVICES:5, AVAIL:6, ACTIVE:7 };

function getBarbersSheet() {
  const ss = CONFIG.SPREADSHEET_ID
    ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName('Barbers');
  if (!sh) {
    sh = ss.insertSheet('Barbers');
    sh.appendRow(['ID','Name','Spec','Avatar','Services','Availability','Active']);
    sh.setFrozenRows(1);
    sh.getRange(1,1,1,7).setFontWeight('bold').setBackground('#1a1a1a').setFontColor('#C6A769');
    sh.appendRow(['b1','Mirowski','Master Barber','Photos/ЛОГО.jpeg','s1,s2,s3,s4,s5,s6','1,2,3,4,5,6','true']);
    sh.appendRow(['b2','Aleksander','Senior Barber','','s1,s2,s3,s5','1,2,3,4,5,6','true']);
  }
  return sh;
}

function getBarbers() {
  const rows = getBarbersSheet().getDataRange().getValues();
  const out  = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[BC.ID - 1]) continue;
    out.push({
      id:           String(r[BC.ID   - 1]),
      name:         String(r[BC.NAME - 1]),
      spec:         String(r[BC.SPEC - 1]),
      avatar:       String(r[BC.AVATAR   - 1]),
      services:     String(r[BC.SERVICES - 1]),
      availability: String(r[BC.AVAIL    - 1]),
      active:       String(r[BC.ACTIVE   - 1]) !== 'false',
    });
  }
  return out;
}

function saveBarber(d) {
  if (!d || !d.name) return { success: false, error: 'Name required' };
  const sh   = getBarbersSheet();
  const data = sh.getDataRange().getValues();
  const row  = [
    d.id || '', d.name, d.spec || '',
    d.avatar || '', d.services || '',
    d.availability || '1,2,3,4,5',
    d.active !== false ? 'true' : 'false',
  ];
  for (let i = 1; i < data.length; i++) {
    if (d.id && String(data[i][0]) === String(d.id)) {
      sh.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return { success: true, id: d.id };
    }
  }
  row[0] = 'b' + Date.now();
  sh.appendRow(row);
  return { success: true, id: row[0] };
}

function deleteBarber(id) {
  const sh   = getBarbersSheet();
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sh.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'Not found' };
}
