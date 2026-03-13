// THE ERRANT — ATX · V8 · All Together Now
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSv3oL0bKQ-hPaU3bU9gbNGRU5-dGH8oZENG_Wwevxi3QTHmLgMEU7SFB-PsTXa7gczFqAtXkDFHN-K/pub?output=csv';
const STORAGE_KEY = 'knight-errant-rsvp';
const SXSW_START = new Date('2026-03-12');
const SXSW_END = new Date('2026-03-19');
const SX_COLORS = ['green', 'blue', 'orange', 'gray', 'dark'];

let allEvents = [];
let activeVibeFilter = null;
let activeDateFilter = null;
let currentTab = 'all';

// === MUSIC PLAYER ===
(function () {
    const audio = document.getElementById('bgMusic');
    const btn = document.getElementById('musicToggle');
    const label = document.getElementById('musicLabel');
    const iconOff = document.getElementById('musicIconOff');
    const iconOn = document.getElementById('musicIconOn');
    if (!audio || !btn) return;
    let playing = false;
    audio.volume = 0.35;
    btn.addEventListener('click', () => {
        if (playing) {
            audio.pause(); playing = false;
            btn.classList.remove('playing');
            iconOff.style.display = ''; iconOn.style.display = 'none';
            label.textContent = 'play vibes';
        } else {
            audio.play().then(() => {
                playing = true; btn.classList.add('playing');
                iconOff.style.display = 'none'; iconOn.style.display = '';
                label.textContent = 'vibes on';
            }).catch(() => {
                label.textContent = 'no audio file';
                setTimeout(() => { label.textContent = 'play vibes'; }, 2000);
            });
        }
    });
})();

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
    updateCountdown();
    loadEvents();
    bindControls();
    bindTabs();
});

// === COUNTDOWN ===
function updateCountdown() {
    const el = document.getElementById('daysUntil');
    if (!el) return;
    const now = new Date();
    if (now > SXSW_END) {
        // Hide the days out stat and its divider after SXSW ends
        const stat = el.closest('.stat');
        if (stat) {
            const divider = stat.previousElementSibling;
            stat.style.display = 'none';
            if (divider) divider.style.display = 'none';
        }
    } else if (now >= SXSW_START) {
        el.textContent = '🔥';
    } else {
        const diff = Math.ceil((SXSW_START - now) / 864e5);
        el.textContent = diff;
    }
}

// === LOAD ===
async function loadEvents() {
    const grid = document.getElementById('eventsGrid');
    const load = document.getElementById('loadingState');
    const err = document.getElementById('errorState');
    const empty = document.getElementById('emptyState');
    grid.style.display = 'grid';
    if (load) load.style.display = 'flex';
    err.style.display = 'none'; empty.style.display = 'none';
    try {
        const r = await fetch(SHEET_URL);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        allEvents = parseCSV(await r.text());
        if (load) load.style.display = 'none';
        if (!allEvents.length) { grid.style.display = 'none'; empty.style.display = 'block'; return; }
        allEvents.sort((a, b) =>
            (a.date || '9999').localeCompare(b.date || '9999') ||
            (a.time || '').localeCompare(b.time || '')
        );
        updateStats();
        buildVibeFilters();
        buildDateNav();
        renderEvents(getTabEvents());
    } catch (e) {
        console.error(e);
        if (load) load.style.display = 'none';
        grid.style.display = 'none'; err.style.display = 'block';
        document.getElementById('errorMsg').textContent = e.message.includes('403')
            ? 'Sheet is private — make it "Anyone with the link can view"'
            : "Can't reach the sheet right now.";
    }
}

// === CSV ===
function parseCSV(csv) {
    const lines = csv.split('\n').map(l => {
        const r = []; let cur = '', q = false;
        for (let i = 0; i < l.length; i++) {
            const c = l[i];
            if (c === '"') { if (q && l[i+1] === '"') { cur += '"'; i++; } else q = !q; }
            else if (c === ',' && !q) { r.push(cur.trim()); cur = ''; }
            else cur += c;
        }
        r.push(cur.trim()); return r;
    });
    if (lines.length < 2) return [];
    const h = lines[0].map(x => x.toLowerCase().trim());
    const col = (n, ...a) => h.findIndex(x => [n, ...a].map(s => s.toLowerCase()).includes(x));
    const iD=col('date'), iT=col('time'), iN=col('event name'), iL=col('event link'),
          iLo=col('event location','location'), iV=col('vibe'), iJ=col('link to join'), iC=col('cost');
    const ev = [];
    for (let i = 1; i < lines.length; i++) {
        const r = lines[i];
        if (!r || r.length < 2 || !r.some(c => c.trim())) continue;
        const g = x => (x >= 0 && x < r.length) ? r[x].trim() : '';
        ev.push({
            date: g(iD), time: g(iT) || 'TBD', name: g(iN) || 'Untitled Event',
            link: g(iL), location: g(iLo) || 'TBD', vibe: g(iV) || 'Event',
            joinLink: g(iJ) || g(iL), cost: g(iC) || 'N/A'
        });
    }
    return ev;
}

// === DATE / TIME HELPERS ===
function parseEventDate(ev) {
    if (!ev.date) return null;
    const parts = ev.date.split('/');
    if (parts.length === 3) {
        return new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
    }
    const d = new Date(ev.date + 'T12:00:00');
    return isNaN(d) ? null : d;
}

function parseEventDateTime(ev) {
    const d = parseEventDate(ev);
    if (!d) return null;
    if (ev.time && ev.time !== 'TBD') {
        const match = ev.time.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
            let h = parseInt(match[1]); const m = parseInt(match[2]);
            const ap = match[3].toUpperCase();
            if (ap === 'PM' && h !== 12) h += 12;
            if (ap === 'AM' && h === 12) h = 0;
            d.setHours(h, m, 0, 0); return d;
        }
    }
    d.setHours(23, 59, 0, 0); return d;
}

function isEventPast(ev) {
    const dt = parseEventDateTime(ev);
    if (!dt) return false;
    return dt < new Date();
}

function todayMidnight() {
    const d = new Date(); d.setHours(0, 0, 0, 0); return d;
}

// === STATS ===
function updateStats() {
    const t = getTracked();
    document.getElementById('totalEvents').textContent = allEvents.length;
    document.getElementById('freeEvents').textContent =
        allEvents.filter(e => e.cost.toLowerCase() === 'free' || e.cost === '$0').length;
    document.getElementById('rsvpCount').textContent = t.size;
}

// === VIBE FILTERS ===
function buildVibeFilters() {
    const activeVibes = new Set(allEvents.filter(e => !isEventPast(e)).map(e => e.vibe));
    const vibes = activeVibes.size > 0
        ? [...new Set(allEvents.map(e => e.vibe))].filter(v => activeVibes.has(v)).sort()
        : [...new Set(allEvents.map(e => e.vibe))].sort();
    const c = document.getElementById('vibeFilters'); c.innerHTML = '';
    vibes.forEach(v => {
        const b = document.createElement('button');
        b.class
