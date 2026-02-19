// THE ERRANT — ATX · V7 · All Together Now · Light Mode
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1xeEYRm302zYQOxs1Mu_hEcnf_XQLeSxJ2-w-uXIgV2A/export?format=csv';
const STORAGE_KEY = 'knight-errant-rsvp';
const SXSW_START = new Date('2026-03-12');
const SX_COLORS = ['green', 'blue', 'orange', 'gray', 'dark'];
let allEvents = [];
let activeVibeFilter = null;
let activeDateFilter = null;

// === MUSIC PLAYER ===
(function() {
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
            audio.pause();
            playing = false;
            btn.classList.remove('playing');
            iconOff.style.display = '';
            iconOn.style.display = 'none';
            label.textContent = 'play vibes';
        } else {
            audio.play().then(() => {
                playing = true;
                btn.classList.add('playing');
                iconOff.style.display = 'none';
                iconOn.style.display = '';
                label.textContent = 'vibes on';
            }).catch(() => {
                label.textContent = 'no audio file';
                setTimeout(() => { label.textContent = 'play vibes'; }, 2000);
            });
        }
    });
})();

// === INIT ===
document.addEventListener('DOMContentLoaded', () => { updateCountdown(); loadEvents(); bindControls(); });

function updateCountdown() {
    const diff = Math.ceil((SXSW_START - new Date()) / 864e5);
    const el = document.getElementById('daysUntil');
    if (el) el.textContent = diff > 0 ? diff : diff === 0 ? '🔥' : '🔴';
}

// === LOAD ===
async function loadEvents() {
    const grid = document.getElementById('eventsGrid'), load = document.getElementById('loadingState'),
          err = document.getElementById('errorState'), empty = document.getElementById('emptyState');
    grid.style.display = 'grid'; if (load) load.style.display = 'flex';
    err.style.display = 'none'; empty.style.display = 'none';
    try {
        const r = await fetch(SHEET_URL);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        allEvents = parseCSV(await r.text());
        if (load) load.style.display = 'none';
        if (!allEvents.length) { grid.style.display = 'none'; empty.style.display = 'block'; return; }
        allEvents.sort((a, b) => (a.date || '9999').localeCompare(b.date || '9999') || (a.time || '').localeCompare(b.time || ''));
        updateStats(); buildVibeFilters(); buildDateNav(); renderEvents(allEvents);
    } catch (e) {
        console.error(e); if (load) load.style.display = 'none';
        grid.style.display = 'none'; err.style.display = 'block';
        document.getElementById('errorMsg').textContent = e.message.includes('403')
            ? 'Sheet is private — make it "Anyone with the link can view"' : "Can't reach the sheet right now.";
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
    const col = (n, ...a) => h.findIndex(x => [n,...a].map(s=>s.toLowerCase()).includes(x));
    const iD=col('date'),iT=col('time'),iN=col('event name'),iL=col('event link'),
          iLo=col('event location','location'),iV=col('vibe'),iJ=col('link to join'),iC=col('cost');
    const ev = [];
    for (let i = 1; i < lines.length; i++) {
        const r = lines[i]; if (!r || r.length < 2 || !r.some(c=>c.trim())) continue;
        const g = x => (x >= 0 && x < r.length) ? r[x].trim() : '';
        ev.push({ date:g(iD), time:g(iT)||'TBD', name:g(iN)||'Untitled Event', link:g(iL),
            location:g(iLo)||'TBD', vibe:g(iV)||'Event', joinLink:g(iJ)||g(iL), cost:g(iC)||'N/A' });
    }
    return ev;
}

// === STATS ===
function updateStats() {
    const t = getTracked();
    document.getElementById('totalEvents').textContent = allEvents.length;
    document.getElementById('freeEvents').textContent = allEvents.filter(e => e.cost.toLowerCase()==='free'||e.cost==='$0').length;
    document.getElementById('rsvpCount').textContent = t.size;
}

// === VIBE FILTERS ===
function buildVibeFilters() {
    const vibes = [...new Set(allEvents.map(e=>e.vibe))].sort();
    const c = document.getElementById('vibeFilters'); c.innerHTML = '';
    vibes.forEach(v => {
        const b = document.createElement('button'); b.className = 'vibe-btn'; b.textContent = v.toLowerCase();
        b.addEventListener('click', () => {
            if (activeVibeFilter === v) { activeVibeFilter = null; b.classList.remove('active'); }
            else { activeVibeFilter = v; c.querySelectorAll('.vibe-btn').forEach(x=>x.classList.remove('active')); b.classList.add('active'); }
            applyFilters();
        });
        c.appendChild(b);
    });
}

// === DATE NAV ===
function buildDateNav() {
    const dates = [...new Set(allEvents.map(e=>e.date).filter(Boolean))].sort();
    const nav = document.getElementById('dateNav'); nav.innerHTML = '';
    const d = ['sun','mon','tue','wed','thu','fri','sat'], m = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    dates.forEach(ds => {
        const dt = new Date(ds+'T12:00:00'), cnt = allEvents.filter(e=>e.date===ds).length;
        const ch = document.createElement('button'); ch.className = 'date-chip';
        ch.innerHTML = `${d[dt.getDay()]} ${m[dt.getMonth()]} ${dt.getDate()} <span class="date-chip-count">${cnt}</span>`;
        ch.addEventListener('click', () => {
            if (activeDateFilter === ds) { activeDateFilter = null; ch.classList.remove('active'); document.getElementById('dateFilter').value = ''; }
            else { activeDateFilter = ds; nav.querySelectorAll('.date-chip').forEach(x=>x.classList.remove('active')); ch.classList.add('active'); document.getElementById('dateFilter').value = ds; }
            applyFilters();
        });
        nav.appendChild(ch);
    });
}

// === RENDER ===
function renderEvents(events) {
    const grid = document.getElementById('eventsGrid'), empty = document.getElementById('emptyState');
    grid.innerHTML = ''; document.getElementById('errorState').style.display = 'none';
    if (!events.length) { grid.style.display = 'none'; empty.style.display = 'block'; return; }
    grid.style.display = 'grid'; empty.style.display = 'none';
    const tracked = getTracked(), dn = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    events.forEach((ev, i) => {
        const card = document.createElement('article'); card.className = 'event-card';
        card.style.animationDelay = `${Math.min(i*0.05,0.8)}s`;
        // Cycle through SXSW palette colors
        card.setAttribute('data-color', SX_COLORS[i % SX_COLORS.length]);
        let dl='', dd='';
        if (ev.date) { const dt = new Date(ev.date+'T12:00:00'); dl = dn[dt.getDay()]; dd = dt.getDate(); }
        const k = `${ev.name}-${ev.date}`, is_t = tracked.has(k);
        const cost = ev.cost.toLowerCase()==='free' ? 'Free ✦' : ev.cost;
        card.innerHTML = `
            <div class="card-date-strip"><span class="card-day">${dl}</span><span class="card-date-num">${dd}</span></div>
            <div class="card-body">
                <div class="card-vibe-tag">${esc(ev.vibe)}</div>
                <h3 class="card-title">${esc(ev.name)}</h3>
                <div class="card-details">
                    <div class="card-detail"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span>${esc(ev.time)}</span></div>
                    <div class="card-detail"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span>${esc(ev.location)}</span></div>
                    <div class="card-detail"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg><span>${esc(cost)}</span></div>
                </div>
                <div class="card-actions">
                    <a class="btn-tapin" href="${esc(ev.joinLink||ev.link||'#')}" target="_blank" rel="noopener">tap in</a>
                    <button class="btn-bet ${is_t?'locked':''}" data-key="${esc(k)}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="${is_t?'currentColor':'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                        <span class="btn-bet-label">${is_t?"that's a bet ✓":"that's a bet"}</span>
                    </button>
                </div>
            </div>`;
        card.querySelector('.btn-bet').addEventListener('click', function() { toggleTrack(k, this); });
        grid.appendChild(card);
    });
}

// === TRACKING ===
function getTracked() { try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')); } catch { return new Set(); } }
function toggleTrack(k, btn) {
    const t = getTracked(), lb = btn.querySelector('.btn-bet-label');
    if (t.has(k)) { t.delete(k); btn.classList.remove('locked'); btn.querySelector('svg').setAttribute('fill','none'); if(lb) lb.textContent="that's a bet"; }
    else { t.add(k); btn.classList.add('locked'); btn.querySelector('svg').setAttribute('fill','currentColor'); if(lb) lb.textContent="that's a bet ✓"; }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...t])); updateStats();
}

// === FILTERS ===
function applyFilters() {
    const s = document.getElementById('searchInput').value.toLowerCase().trim();
    const d = activeDateFilter || document.getElementById('dateFilter').value;
    let f = allEvents;
    if (s) f = f.filter(e => e.name.toLowerCase().includes(s)||e.vibe.toLowerCase().includes(s)||e.location.toLowerCase().includes(s)||e.cost.toLowerCase().includes(s));
    if (d) f = f.filter(e => e.date === d);
    if (activeVibeFilter) f = f.filter(e => e.vibe.toLowerCase() === activeVibeFilter.toLowerCase());
    renderEvents(f);
}
function clearAllFilters() {
    document.getElementById('searchInput').value = ''; document.getElementById('dateFilter').value = '';
    activeVibeFilter = null; activeDateFilter = null;
    document.querySelectorAll('.vibe-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.date-chip').forEach(c=>c.classList.remove('active'));
    renderEvents(allEvents);
}

// === CONTROLS ===
function bindControls() {
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 200));
    document.getElementById('dateFilter').addEventListener('change', () => { activeDateFilter = document.getElementById('dateFilter').value||null; document.querySelectorAll('.date-chip').forEach(c=>c.classList.remove('active')); applyFilters(); });
    document.getElementById('clearFilters').addEventListener('click', clearAllFilters);
    document.getElementById('viewAll').addEventListener('click', clearAllFilters);
    document.getElementById('refreshBtn').addEventListener('click', () => { allEvents=[]; activeVibeFilter=null; activeDateFilter=null; document.getElementById('searchInput').value=''; document.getElementById('dateFilter').value=''; loadEvents(); });
    document.getElementById('exportExcel').addEventListener('click', exportXlsx);
    document.getElementById('exportCSV').addEventListener('click', exportCsv);
}

// === EXPORT ===
function fmt(e) { return { Date:e.date, Time:e.time, 'Event Name':e.name, Location:e.location, Vibe:e.vibe, Cost:e.cost, Link:e.joinLink||e.link }; }
function exportXlsx() { if(!allEvents.length) return; const ws=XLSX.utils.json_to_sheet(allEvents.map(fmt)); const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'SXSW 2026'); XLSX.writeFile(wb,'the-errant-atx-sxsw-2026.xlsx'); }
function exportCsv() { if(!allEvents.length) return; const ws=XLSX.utils.json_to_sheet(allEvents.map(fmt)); const csv=XLSX.utils.sheet_to_csv(ws); const b=new Blob([csv],{type:'text/csv'}); const u=URL.createObjectURL(b); const a=document.createElement('a'); a.href=u; a.download='the-errant-atx-sxsw-2026.csv'; a.click(); URL.revokeObjectURL(u); }

// === UTIL ===
function esc(s) { if(!s) return ''; const d=document.createElement('div'); d.textContent=s; return d.innerHTML; }
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; }
