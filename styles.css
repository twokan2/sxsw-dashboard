// ============================================================
// THE ERRANT — ATX · script.js · V8
// New in V8:
//   - "take me thru dere" saves events to localStorage (no account)
//   - "Up Next" tab: events from now forward, sorted by time
//   - "My Events" tab: saved events as a personal schedule
//   - Calendar export (.ics) on save
//   - Day filter buttons auto-hide past days
//   - Filters auto-hide when no events remain for that category
//   - vibe.mp3 = Metro Boomin "Take Me Thru Dere"
// ============================================================

const SHEET_ID = '1xeEYRm302zYQOxs1Mu_hEcnf_XQLeSxJ2-w-uXIgV2A';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
const STORAGE_KEY = 'errant_atx_saved_events';

let allEvents = [];
let savedEventIds = new Set();
let currentTab = 'all'; // 'all' | 'upnext' | 'mine'
let activeFilters = {
  vibe: null,
  day: null,
  free: false,
  lockedIn: false
};

// ── SAVED EVENTS (localStorage) ─────────────────────────────

function loadSavedIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      savedEventIds = new Set(arr);
    }
  } catch (e) {
    savedEventIds = new Set();
  }
}

function persistSavedIds() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...savedEventIds]));
  } catch (e) {}
}

function toggleSave(eventId) {
  const event = allEvents.find(e => e.id === eventId);
  if (!event) return;

  if (savedEventIds.has(eventId)) {
    savedEventIds.delete(eventId);
    persistSavedIds();
    updateSaveButtons(eventId, false);
    if (currentTab === 'mine') renderCards();
  } else {
    savedEventIds.add(eventId);
    persistSavedIds();
    updateSaveButtons(eventId, true);
    // Offer .ics calendar download
    downloadICS(event);
  }
  updateMyEventsCount();
  updateStatsBar();
}

function updateSaveButtons(eventId, saved) {
  document.querySelectorAll(`.save-btn[data-id="${eventId}"]`).forEach(btn => {
    btn.textContent = saved ? 'Locked In' : "it's a vibe";
    btn.classList.toggle('saved', saved);
  });
}

function updateMyEventsCount() {
  const badge = document.getElementById('my-events-count');
  if (badge) badge.textContent = savedEventIds.size > 0 ? savedEventIds.size : '';
}

// ── CALENDAR (.ICS) EXPORT ───────────────────────────────────

function formatICSDate(dateStr, timeStr) {
  // dateStr: "M/D/YYYY" or "YYYY-MM-DD"
  // timeStr: "H:MM AM – H:MM PM" — we only need start
  if (!dateStr) return null;
  let year, month, day;
  if (dateStr.includes('-')) {
    [year, month, day] = dateStr.split('-');
  } else {
    const parts = dateStr.split('/');
    month = parts[0].padStart(2, '0');
    day = parts[1].padStart(2, '0');
    year = parts[2];
  }
  let hours = '09', mins = '00';
  if (timeStr) {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      let h = parseInt(match[1]);
      const m = match[2];
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      hours = String(h).padStart(2, '0');
      mins = m;
    }
  }
  return `${year}${month}${day}T${hours}${mins}00`;
}

function downloadICS(event) {
  const dtStart = formatICSDate(event.date, event.time);
  if (!dtStart) return;
  // End = 2hrs after start by default
  const endHour = String(parseInt(dtStart.substring(9, 11)) + 2).padStart(2, '0');
  const dtEnd = dtStart.substring(0, 9) + endHour + dtStart.substring(11);
  const uid = `errant-atx-${event.id || Date.now()}@sxsw2026`;
  const loc = (event.location || '').replace(/,/g, '\\,');
  const summary = (event.name || '').replace(/,/g, '\\,');
  const url = event.rsvpLink || event.link || '';

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Errant ATX//SXSW 2026//EN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `SUMMARY:${summary}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `LOCATION:${loc}`,
    `URL:${url}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(event.name || 'event').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

// ── DATE/TIME HELPERS ────────────────────────────────────────

function parseEventDateTime(event) {
  // Returns a Date object or null
  const dateStr = event.date; // "M/D/YYYY"
  const timeStr = event.time; // "H:MM AM – H:MM PM"
  if (!dateStr) return null;
  let year, month, day;
  if (dateStr.includes('-')) {
    [year, month, day] = dateStr.split('-').map(Number);
  } else {
    const parts = dateStr.split('/');
    month = parseInt(parts[0]);
    day = parseInt(parts[1]);
    year = parseInt(parts[2]);
  }
  let hours = 9, mins = 0;
  if (timeStr) {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match) {
      let h = parseInt(match[1]);
      const m = parseInt(match[2]);
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && h !== 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      hours = h; mins = m;
    }
  }
  return new Date(year, month - 1, day, hours, mins);
}

function isEventPast(event) {
  const dt = parseEventDateTime(event);
  if (!dt) return false;
  return dt < new Date();
}

function isEventUpcoming(event) {
  return !isEventPast(event);
}

// Returns "3/14/2026" → Date at midnight
function parseDayDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
  }
  return null;
}

function getTodayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── CSV PARSING ──────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (vals[i] || '').trim(); });
    return obj;
  }).filter(r => r['Event Name'] || r['event name'] || r['name']);
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

function normalizeEvent(row) {
  // Handles both Blueprint-style and RSVPATX-style columns
  return {
    id: row['id'] || row['ID'] || Math.random().toString(36).slice(2),
    date: row['Date'] || row['date'] || '',
    time: row['Time'] || row['time'] || '',
    name: row['Event Name'] || row['name'] || row['Name'] || '',
    link: row['Event Link'] || row['link'] || row['Link'] || '',
    location: row['Event Location'] || row['venue'] || row['Location'] || '',
    vibe: row['Vibe'] || row['vibe'] || 'Experience',
    rsvpLink: row['Link to Join'] || row['rsvpLink'] || row['Event Link'] || row['link'] || '',
    cost: row['Cost'] || row['cost'] || 'Free',
    freeFood: (row['Free Food'] || '').toLowerCase() === 'yes',
    freeDrinks: (row['Free Drinks'] || '').toLowerCase() === 'yes',
    staffPick: (row['Staff Pick'] || '').toLowerCase() === 'yes',
    notes: row['Notes'] || row['notes'] || '',
    latitude: parseFloat(row['Latitude'] || row['latitude'] || 0) || 0,
    longitude: parseFloat(row['Longitude'] || row['longitude'] || 0) || 0
  };
}

// ── FETCH DATA ───────────────────────────────────────────────

async function fetchEvents() {
  showLoading(true);
  try {
    const res = await fetch(CSV_URL + '&t=' + Date.now());
    if (!res.ok) throw new Error('Sheet fetch failed');
    const text = await res.text();
    const rows = parseCSV(text);
    allEvents = rows.map(normalizeEvent).filter(e => e.name);
    showError(false);
  } catch (err) {
    console.error(err);
    showError(true);
    allEvents = [];
  }
  showLoading(false);
  buildDayFilters();
  buildVibeFilters();
  renderCards();
  updateMyEventsCount();
  updateStatsBar();
}


// ── STATS BAR ───────────────────────────────────────────────

function updateStatsBar() {
  const total = document.getElementById('totalEvents');
  const free = document.getElementById('freeEvents');
  const locked = document.getElementById('rsvpCount');
  const days = document.getElementById('daysUntil');
  
  if (total) total.textContent = allEvents.length;
  if (free) free.textContent = allEvents.filter(e => (e.cost||'').toLowerCase() === 'free' || e.freeDrinks || e.freeFood).length;
  if (locked) locked.textContent = savedEventIds.size;
  
  if (days) {
    const sxswStart = new Date('2026-03-12T00:00:00');
    const diff = Math.ceil((sxswStart - new Date()) / 864e5);
    days.textContent = diff > 0 ? diff : diff === 0 ? '🔥' : '🔴';
  }
}

// ── FILTER LOGIC ─────────────────────────────────────────────

function getFilteredEvents() {
  let events = [...allEvents];

  if (currentTab === 'upnext') {
    events = events.filter(isEventUpcoming);
    events.sort((a, b) => {
      const da = parseEventDateTime(a);
      const db = parseEventDateTime(b);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da - db;
    });
    return events; // Up Next ignores other filters — show everything upcoming
  }

  if (currentTab === 'mine') {
    events = events.filter(e => savedEventIds.has(e.id));
    events.sort((a, b) => {
      const da = parseEventDateTime(a);
      const db = parseEventDateTime(b);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da - db;
    });
    return events;
  }

  // "All" tab with filters
  if (activeFilters.vibe) events = events.filter(e => e.vibe === activeFilters.vibe);
  if (activeFilters.day) events = events.filter(e => e.date === activeFilters.day);
  if (activeFilters.free) events = events.filter(e => e.cost === 'Free' || e.freeDrinks || e.freeFood);
  if (activeFilters.lockedIn) events = events.filter(e => savedEventIds.has(e.id));

  return events;
}

// ── RENDER CARDS ─────────────────────────────────────────────

function renderCards() {
  const container = document.getElementById('events-container');
  if (!container) return;

  const events = getFilteredEvents();
  const emptyMsg = document.getElementById('empty-message');
  const emptyMine = document.getElementById('empty-mine');

  if (emptyMsg) emptyMsg.style.display = 'none';
  if (emptyMine) emptyMine.style.display = 'none';

  if (events.length === 0) {
    container.innerHTML = '';
    if (currentTab === 'mine') {
      if (emptyMine) emptyMine.style.display = 'flex';
    } else {
      if (emptyMsg) emptyMsg.style.display = 'flex';
    }
    return;
  }

  container.innerHTML = events.map((event, i) => buildCard(event, i)).join('');

  // Wire up save buttons
  container.querySelectorAll('.save-btn').forEach(btn => {
    const id = btn.dataset.id;
    if (savedEventIds.has(id)) {
      btn.textContent = 'Locked In';
      btn.classList.add('saved');
    }
    btn.addEventListener('click', () => toggleSave(id));
  });

  // Wire up RSVP links
  container.querySelectorAll('.rsvp-link').forEach(a => {
    a.addEventListener('click', e => e.stopPropagation());
  });
}

function buildCard(event, index) {
  const past = isEventPast(event);
  const saved = savedEventIds.has(event.id);
  const SX_COLORS = ['green','blue','orange','gray','dark'];
  const color = SX_COLORS[(index || 0) % SX_COLORS.length];
  const pastClass = past ? ' event-past' : '';

  // Parse date for the date strip
  let dayLabel = '', dateNum = '';
  const dn = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  if (event.date) {
    let dt;
    if (event.date.includes('-')) {
      dt = new Date(event.date + 'T12:00:00');
    } else if (event.date.includes('/')) {
      const p = event.date.split('/');
      dt = new Date(parseInt(p[2]), parseInt(p[0])-1, parseInt(p[1]), 12, 0, 0);
    }
    if (dt && !isNaN(dt)) {
      dayLabel = dn[dt.getDay()];
      dateNum = dt.getDate();
    }
  }

  const cost = (event.cost || 'Free').toLowerCase() === 'free' ? 'Free ✦' : escHtml(event.cost);
  const rsvpLink = event.rsvpLink || event.link || '';

  // Badges
  let badges = '';
  if (event.freeDrinks) badges += '<span class="badge free-drinks">🍹 free drinks</span>';
  if (event.freeFood) badges += '<span class="badge free-food">🍽 free food</span>';
  if (event.staffPick) badges += '<span class="badge staff-pick">✦ staff pick</span>';

  return `
    <article class="event-card${pastClass}" data-color="${color}" data-id="${escHtml(event.id)}">
      <div class="card-date-strip">
        <span class="card-day">${escHtml(dayLabel)}</span>
        <span class="card-date-num">${dateNum}</span>
      </div>
      <div class="card-body">
        <div class="card-vibe-tag">${escHtml(event.vibe || 'Event')}</div>
        <h3 class="card-title">${escHtml(event.name)}</h3>
        ${badges ? '<div class="card-badges">' + badges + '</div>' : ''}
        <div class="card-details">
          <div class="card-detail"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span>${escHtml(event.time || 'TBD')}</span></div>
          <div class="card-detail"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span>${escHtml(event.location || 'TBD')}</span></div>
          <div class="card-detail"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg><span>${cost}</span></div>
        </div>
        <div class="card-actions">
          ${rsvpLink ? '<a class="btn-tapin" href="' + escHtml(rsvpLink) + '" target="_blank" rel="noopener">tap in</a>' : ''}
          <button class="save-btn${saved ? ' saved' : ''}" data-id="${escHtml(event.id)}">
            ${saved ? 'Locked In' : "it's a vibe"}
          </button>
        </div>
      </div>
    </article>
  `;
}

function escHtml(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── TAB LOGIC ────────────────────────────────────────────────

function switchTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  const filterBar = document.getElementById('filter-bar');
  if (filterBar) filterBar.style.display = (tab === 'all') ? '' : 'none';
  const statsBar = document.getElementById('stats-bar');
  if (statsBar) statsBar.style.display = (tab === 'map') ? 'none' : '';
  const mapEl = document.getElementById('map-container');
  const eventsEl = document.getElementById('events-container');
  const emptyMap = document.getElementById('empty-map');
  if (mapEl) mapEl.style.display = (tab === 'map') ? '' : 'none';
  if (eventsEl) eventsEl.style.display = (tab === 'map') ? 'none' : '';
  if (emptyMap) emptyMap.style.display = 'none';
  if (tab === 'map') { renderMap(); } else { renderCards(); }
}

// ── DAY FILTER BUTTONS ───────────────────────────────────────

function buildDayFilters() {
  const container = document.getElementById('day-filters');
  if (!container) return;

  const today = getTodayMidnight();

  // Collect unique days from events
  const days = [...new Set(allEvents.map(e => e.date).filter(Boolean))];
  days.sort((a, b) => {
    const da = parseDayDate(a);
    const db = parseDayDate(b);
    return da - db;
  });

  // Filter out past days
  const futureDays = days.filter(d => {
    const dt = parseDayDate(d);
    return dt && dt >= today;
  });

  container.innerHTML = futureDays.map(day => {
    const dt = parseDayDate(day);
    const label = dt ? dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : day;
    return `<button class="filter-btn day-btn" data-day="${escHtml(day)}">${label}</button>`;
  }).join('');

  container.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const day = btn.dataset.day;
      if (activeFilters.day === day) {
        activeFilters.day = null;
        btn.classList.remove('active');
      } else {
        activeFilters.day = day;
        container.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
      renderCards();
    });
  });
}

// ── VIBE FILTER BUTTONS ──────────────────────────────────────

function buildVibeFilters() {
  const container = document.getElementById('vibe-filters');
  if (!container) return;

  // Only show vibes that have at least one upcoming event
  const upcomingVibes = new Set(
    allEvents.filter(isEventUpcoming).map(e => e.vibe).filter(Boolean)
  );

  // If all events are past, show all vibes anyway
  const vibes = upcomingVibes.size > 0
    ? [...upcomingVibes]
    : [...new Set(allEvents.map(e => e.vibe).filter(Boolean))];

  vibes.sort();

  container.innerHTML = vibes.map(vibe => {
    return `<button class="filter-btn vibe-btn" data-vibe="${escHtml(vibe)}">${escHtml(vibe)}</button>`;
  }).join('');

  container.querySelectorAll('.vibe-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const vibe = btn.dataset.vibe;
      if (activeFilters.vibe === vibe) {
        activeFilters.vibe = null;
        btn.classList.remove('active');
      } else {
        activeFilters.vibe = vibe;
        container.querySelectorAll('.vibe-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
      renderCards();
    });
  });
}

// ── FREE / LOCKED-IN TOGGLES ─────────────────────────────────

function bindFilterToggles() {
  const freeBtn = document.getElementById('btn-free');
  const lockedBtn = document.getElementById('btn-locked');
  const wipeBtn = document.getElementById('btn-wipe');

  if (freeBtn) {
    freeBtn.addEventListener('click', () => {
      activeFilters.free = !activeFilters.free;
      freeBtn.classList.toggle('active', activeFilters.free);
      renderCards();
    });
  }
  if (lockedBtn) {
    lockedBtn.addEventListener('click', () => {
      activeFilters.lockedIn = !activeFilters.lockedIn;
      lockedBtn.classList.toggle('active', activeFilters.lockedIn);
      renderCards();
    });
  }
  if (wipeBtn) {
    wipeBtn.addEventListener('click', () => {
      activeFilters = { vibe: null, day: null, free: false, lockedIn: false };
      document.querySelectorAll('.filter-btn, .day-btn').forEach(b => b.classList.remove('active'));
      if (freeBtn) freeBtn.classList.remove('active');
      if (lockedBtn) lockedBtn.classList.remove('active');
      renderCards();
    });
  }
}

// ── SEARCH ───────────────────────────────────────────────────

function bindSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;
  input.addEventListener('input', () => {
    const q = input.value.toLowerCase().trim();
    const cards = document.querySelectorAll('.event-card');
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      card.style.display = q === '' || text.includes(q) ? '' : 'none';
    });
  });
}

// ── MUSIC PLAYER ─────────────────────────────────────────────

function initMusicPlayer() {
  const playBtn = document.getElementById('music-toggle');
  if (!playBtn) return;

  let audio = null;

  playBtn.addEventListener('click', () => {
    if (!audio) {
      audio = new Audio('vibe.mp3');
      audio.loop = true;
    }
    if (audio.paused) {
      audio.play().catch(() => {});
      playBtn.classList.add('playing');
      playBtn.textContent = '⏸ pause vibes';
    } else {
      audio.pause();
      playBtn.classList.remove('playing');
      playBtn.textContent = '▶ play vibes';
    }
  });
}

// ── UI HELPERS ───────────────────────────────────────────────

function showLoading(on) {
  const el = document.getElementById('loading-msg');
  if (el) el.style.display = on ? 'block' : 'none';
}

function showError(on) {
  const el = document.getElementById('error-msg');
  if (el) el.style.display = on ? 'block' : 'none';
}

// ── TAB BINDINGS ─────────────────────────────────────────────

function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

// ── EXPORT BUTTONS (xlsx/csv) ────────────────────────────────

function bindExports() {
  const xlsxBtn = document.getElementById('btn-export-xlsx');
  const csvBtn = document.getElementById('btn-export-csv');
  if (xlsxBtn) xlsxBtn.addEventListener('click', exportXLSX);
  if (csvBtn) csvBtn.addEventListener('click', exportCSV);
}

function exportCSV() {
  const events = getFilteredEvents();
  const headers = ['Date', 'Time', 'Event Name', 'Event Link', 'Location', 'Vibe', 'Cost', 'Free Food', 'Free Drinks', 'Staff Pick', 'Notes'];
  const rows = events.map(e => [
    e.date, e.time, e.name, e.rsvpLink, e.location, e.vibe, e.cost,
    e.freeFood ? 'Yes' : 'No', e.freeDrinks ? 'Yes' : 'No',
    e.staffPick ? 'Yes' : 'No', e.notes
  ].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','));
  const csv = [headers.join(','), ...rows].join('\n');
  downloadBlob(csv, 'text/csv', 'sxsw-2026-errant.csv');
}

function exportXLSX() {
  // Minimal XLSX via SheetJS CDN (must be loaded in index.html)
  if (typeof XLSX === 'undefined') {
    alert('XLSX export requires SheetJS library. Add to index.html: <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"><\/script>');
    return;
  }
  const events = getFilteredEvents();
  const ws_data = [
    ['Date', 'Time', 'Event Name', 'Link', 'Location', 'Vibe', 'Cost', 'Free Food', 'Free Drinks', 'Staff Pick', 'Notes'],
    ...events.map(e => [e.date, e.time, e.name, e.rsvpLink, e.location, e.vibe, e.cost,
      e.freeFood ? 'Yes' : 'No', e.freeDrinks ? 'Yes' : 'No', e.staffPick ? 'Yes' : 'No', e.notes])
  ];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws, 'Events');
  XLSX.writeFile(wb, 'sxsw-2026-errant.xlsx');
}

function downloadBlob(content, type, filename) {
  const blob = new Blob([content], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

// ── STARFIELD (canvas bg) ────────────────────────────────────

function initStarfield() {
  const canvas = document.getElementById('starfield');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let stars = [];

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function makeStars(n) {
    stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.2 + 0.3,
        a: Math.random(),
        speed: Math.random() * 0.003 + 0.001
      });
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stars.forEach(s => {
      s.a += s.speed;
      const alpha = (Math.sin(s.a) + 1) / 2 * 0.6 + 0.1;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(89, 190, 121, ${alpha})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }

  resize();
  makeStars(120);
  draw();
  window.addEventListener('resize', () => { resize(); makeStars(120); });
}


// ── MAP (Leaflet + OpenStreetMap) ────────────────────────────
let leafletMap = null;
let mapMarkers = [];

function renderMap() {
  const mapContainer = document.getElementById('map-container');
  const emptyMap = document.getElementById('empty-map');
  const eventsEl = document.getElementById('events-container');
  const emptyMsg = document.getElementById('empty-message');
  const emptyMine = document.getElementById('empty-mine');
  if (eventsEl) eventsEl.style.display = 'none';
  if (emptyMsg) emptyMsg.style.display = 'none';
  if (emptyMine) emptyMine.style.display = 'none';

  const savedEvents = allEvents.filter(e => savedEventIds.has(e.id) && e.latitude && e.longitude);
  if (savedEvents.length === 0) {
    if (mapContainer) mapContainer.style.display = 'none';
    if (emptyMap) emptyMap.style.display = 'block';
    return;
  }
  if (mapContainer) mapContainer.style.display = '';
  if (emptyMap) emptyMap.style.display = 'none';

  if (!leafletMap) {
    leafletMap = L.map('map').setView([30.2672, -97.7431], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19
    }).addTo(leafletMap);
  }
  mapMarkers.forEach(m => leafletMap.removeLayer(m));
  mapMarkers = [];

  const colors = ['#59be79','#50afe8','#f97c3c','#a855f7','#001e1e'];
  const bounds = [];
  savedEvents.forEach(function(event, i) {
    const color = colors[i % colors.length];
    const icon = L.divIcon({
      className: 'map-pin',
      html: '<div style="background:'+color+';width:12px;height:12px;border-radius:50%;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
      iconSize: [16,16], iconAnchor: [8,8]
    });
    const rsvpLink = event.rsvpLink || event.link || '';
    const dirs = 'https://maps.google.com/maps?daddr='+event.latitude+','+event.longitude;
    const popup = '<div style="font-family:Aptos,sans-serif;max-width:220px;">'
      + '<strong style="font-size:13px;">'+escHtml(event.name)+'</strong><br>'
      + '<span style="font-size:11px;color:#5a7272;">'+escHtml(event.date)+' · '+escHtml(event.time)+'</span><br>'
      + '<span style="font-size:11px;color:#5a7272;">📍 '+escHtml(event.location)+'</span><br>'
      + (event.freeDrinks ? '<span style="font-size:10px;">🍹 free drinks</span> ' : '')
      + (event.freeFood ? '<span style="font-size:10px;">🍽 free food</span> ' : '')
      + (event.staffPick ? '<span style="font-size:10px;">✦ staff pick</span>' : '')
      + '<div style="margin-top:6px;display:flex;gap:6px;">'
      + (rsvpLink ? '<a href="'+escHtml(rsvpLink)+'" target="_blank" style="font-size:11px;color:#50afe8;">rsvp ↗</a>' : '')
      + '<a href="'+dirs+'" target="_blank" style="font-size:11px;color:#f97c3c;">directions ↗</a>'
      + '</div></div>';
    const marker = L.marker([event.latitude, event.longitude], {icon: icon}).bindPopup(popup).addTo(leafletMap);
    mapMarkers.push(marker);
    bounds.push([event.latitude, event.longitude]);
  });
  if (bounds.length > 1) leafletMap.fitBounds(bounds, {padding:[30,30]});
  else if (bounds.length === 1) leafletMap.setView(bounds[0], 15);
  setTimeout(function(){ leafletMap.invalidateSize(); }, 100);
}

// ── INIT ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadSavedIds();
  initStarfield();
  initMusicPlayer();
  bindTabs();
  bindFilterToggles();
  bindSearch();
  bindExports();
  fetchEvents();
});
