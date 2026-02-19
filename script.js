// =============================================
// THE ERRANT — ATX · V4
// =============================================

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1xeEYRm302zYQOxs1Mu_hEcnf_XQLeSxJ2-w-uXIgV2A/export?format=csv';
const STORAGE_KEY = 'knight-errant-rsvp';
const SXSW_START = new Date('2026-03-12');

let allEvents = [];
let activeVibeFilter = null;
let activeDateFilter = null;

// =============================================
// STARFIELD
// =============================================
(function initStarfield() {
    const canvas = document.getElementById('starfield');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let stars = [];
    let shootingStars = [];
    let w, h;

    function resize() {
        w = canvas.width = window.innerWidth;
        h = canvas.height = window.innerHeight;
    }

    function createStars() {
        stars = [];
        const count = Math.floor((w * h) / 4000);
        for (let i = 0; i < count; i++) {
            stars.push({
                x: Math.random() * w,
                y: Math.random() * h,
                r: Math.random() * 1.4 + 0.3,
                alpha: Math.random() * 0.6 + 0.2,
                pulse: Math.random() * 0.02 + 0.005,
                phase: Math.random() * Math.PI * 2
            });
        }
    }

    function maybeShootingStar() {
        if (Math.random() < 0.003 && shootingStars.length < 2) {
            shootingStars.push({
                x: Math.random() * w * 0.8,
                y: Math.random() * h * 0.3,
                len: Math.random() * 60 + 40,
                speed: Math.random() * 4 + 3,
                angle: Math.PI / 6 + Math.random() * 0.3,
                alpha: 1,
                life: 1
            });
        }
    }

    function draw(time) {
        ctx.clearRect(0, 0, w, h);

        // Stars
        for (const s of stars) {
            const flicker = Math.sin(time * s.pulse + s.phase) * 0.2 + 0.8;
            const a = s.alpha * flicker;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(230, 220, 255, ${a})`;
            ctx.fill();
        }

        // Shooting stars
        for (let i = shootingStars.length - 1; i >= 0; i--) {
            const ss = shootingStars[i];
            const dx = Math.cos(ss.angle) * ss.speed;
            const dy = Math.sin(ss.angle) * ss.speed;
            ss.x += dx;
            ss.y += dy;
            ss.life -= 0.012;
            ss.alpha = ss.life;

            if (ss.life <= 0) {
                shootingStars.splice(i, 1);
                continue;
            }

            const tailX = ss.x - Math.cos(ss.angle) * ss.len;
            const tailY = ss.y - Math.sin(ss.angle) * ss.len;
            const grad = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
            grad.addColorStop(0, `rgba(224, 64, 251, 0)`);
            grad.addColorStop(1, `rgba(224, 64, 251, ${ss.alpha * 0.7})`);

            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(ss.x, ss.y);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Head glow
            ctx.beginPath();
            ctx.arc(ss.x, ss.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${ss.alpha})`;
            ctx.fill();
        }

        maybeShootingStar();
        requestAnimationFrame(draw);
    }

    resize();
    createStars();
    requestAnimationFrame(draw);

    window.addEventListener('resize', () => {
        resize();
        createStars();
    });
})();

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', () => {
    updateCountdown();
    loadEvents();
    bindControls();
});

// =============================================
// COUNTDOWN
// =============================================
function updateCountdown() {
    const now = new Date();
    const diff = Math.ceil((SXSW_START - now) / (1000 * 60 * 60 * 24));
    const el = document.getElementById('daysUntil');
    if (el) el.textContent = diff > 0 ? diff : (diff === 0 ? '🔥' : '🔴');
}

// =============================================
// LOAD EVENTS
// =============================================
async function loadEvents() {
    const grid = document.getElementById('eventsGrid');
    const loading = document.getElementById('loadingState');
    const errorEl = document.getElementById('errorState');
    const emptyEl = document.getElementById('emptyState');

    grid.style.display = 'grid';
    if (loading) loading.style.display = 'flex';
    errorEl.style.display = 'none';
    emptyEl.style.display = 'none';

    try {
        const resp = await fetch(SHEET_URL);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const csv = await resp.text();
        allEvents = parseCSV(csv);

        if (loading) loading.style.display = 'none';

        if (allEvents.length === 0) {
            grid.style.display = 'none';
            emptyEl.style.display = 'block';
            return;
        }

        allEvents.sort((a, b) => {
            const da = a.date || '9999';
            const db = b.date || '9999';
            if (da !== db) return da.localeCompare(db);
            return (a.time || '').localeCompare(b.time || '');
        });

        updateStats();
        buildVibeFilters();
        buildDateNav();
        renderEvents(allEvents);
    } catch (err) {
        console.error('Load error:', err);
        if (loading) loading.style.display = 'none';
        grid.style.display = 'none';
        errorEl.style.display = 'block';
        const msg = document.getElementById('errorMsg');
        if (err.message.includes('403')) {
            msg.textContent = 'Sheet is private — make it "Anyone with the link can view"';
        } else {
            msg.textContent = "Can't reach the sheet right now.";
        }
    }
}

// =============================================
// CSV PARSER
// =============================================
function parseCSV(csv) {
    const lines = csv.split('\n').map(line => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') {
                if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
                else inQuotes = !inQuotes;
            } else if (ch === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += ch;
            }
        }
        result.push(current.trim());
        return result;
    });

    if (lines.length < 2) return [];
    const headers = lines[0].map(h => h.toLowerCase().trim());

    const col = (name, ...alts) => {
        const all = [name, ...alts].map(n => n.toLowerCase());
        return headers.findIndex(h => all.includes(h));
    };

    const iDate = col('date');
    const iTime = col('time');
    const iName = col('event name');
    const iLink = col('event link');
    const iLocation = col('event location', 'location');
    const iVibe = col('vibe');
    const iJoin = col('link to join');
    const iCost = col('cost');

    const events = [];
    for (let i = 1; i < lines.length; i++) {
        const r = lines[i];
        if (!r || r.length < 2 || !r.some(c => c.trim())) continue;
        const g = idx => (idx >= 0 && idx < r.length) ? r[idx].trim() : '';
        events.push({
            date: g(iDate),
            time: g(iTime) || 'TBD',
            name: g(iName) || 'Untitled Event',
            link: g(iLink),
            location: g(iLocation) || 'TBD',
            vibe: g(iVibe) || 'Event',
            joinLink: g(iJoin) || g(iLink),
            cost: g(iCost) || 'N/A'
        });
    }
    return events;
}

// =============================================
// STATS
// =============================================
function updateStats() {
    const tracked = getTracked();
    document.getElementById('totalEvents').textContent = allEvents.length;
    document.getElementById('freeEvents').textContent = allEvents.filter(e =>
        e.cost.toLowerCase() === 'free' || e.cost === '$0' || e.cost === '0'
    ).length;
    document.getElementById('rsvpCount').textContent = tracked.size;
}

// =============================================
// VIBE FILTERS
// =============================================
function buildVibeFilters() {
    const vibes = [...new Set(allEvents.map(e => e.vibe))].sort();
    const container = document.getElementById('vibeFilters');
    container.innerHTML = '';

    vibes.forEach(vibe => {
        const btn = document.createElement('button');
        btn.className = 'vibe-btn';
        btn.textContent = vibe.toLowerCase();
        btn.addEventListener('click', () => {
            if (activeVibeFilter === vibe) {
                activeVibeFilter = null;
                btn.classList.remove('active');
            } else {
                activeVibeFilter = vibe;
                container.querySelectorAll('.vibe-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }
            applyFilters();
        });
        container.appendChild(btn);
    });
}

// =============================================
// DATE NAVIGATION
// =============================================
function buildDateNav() {
    const dates = [...new Set(allEvents.map(e => e.date).filter(Boolean))].sort();
    const nav = document.getElementById('dateNav');
    nav.innerHTML = '';

    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    dates.forEach(dateStr => {
        const d = new Date(dateStr + 'T12:00:00');
        const count = allEvents.filter(e => e.date === dateStr).length;
        const chip = document.createElement('button');
        chip.className = 'date-chip';
        chip.innerHTML = `${days[d.getDay()]} ${months[d.getMonth()]} ${d.getDate()} <span class="date-chip-count">${count}</span>`;
        chip.addEventListener('click', () => {
            if (activeDateFilter === dateStr) {
                activeDateFilter = null;
                chip.classList.remove('active');
                document.getElementById('dateFilter').value = '';
            } else {
                activeDateFilter = dateStr;
                nav.querySelectorAll('.date-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                document.getElementById('dateFilter').value = dateStr;
            }
            applyFilters();
        });
        nav.appendChild(chip);
    });
}

// =============================================
// RENDER EVENTS
// =============================================
function renderEvents(events) {
    const grid = document.getElementById('eventsGrid');
    const emptyEl = document.getElementById('emptyState');
    const errorEl = document.getElementById('errorState');

    grid.innerHTML = '';
    errorEl.style.display = 'none';

    if (events.length === 0) {
        grid.style.display = 'none';
        emptyEl.style.display = 'block';
        return;
    }

    grid.style.display = 'grid';
    emptyEl.style.display = 'none';

    const tracked = getTracked();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    events.forEach((event, idx) => {
        const card = document.createElement('article');
        card.className = 'event-card';
        card.style.animationDelay = `${Math.min(idx * 0.05, 0.8)}s`;

        let dayLabel = '';
        let dateNum = '';
        if (event.date) {
            const d = new Date(event.date + 'T12:00:00');
            dayLabel = dayNames[d.getDay()];
            dateNum = d.getDate();
        }

        const eventKey = `${event.name}-${event.date}`;
        const isTracked = tracked.has(eventKey);
        const costDisplay = event.cost.toLowerCase() === 'free' ? 'Free ✦' : event.cost;

        card.innerHTML = `
            <div class="card-date-strip">
                <span class="card-day">${dayLabel}</span>
                <span class="card-date-num">${dateNum}</span>
            </div>
            <div class="card-body">
                <div class="card-vibe-tag">${escapeHTML(event.vibe)}</div>
                <h3 class="card-title">${escapeHTML(event.name)}</h3>
                <div class="card-details">
                    <div class="card-detail">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        <span>${escapeHTML(event.time)}</span>
                    </div>
                    <div class="card-detail">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span>${escapeHTML(event.location)}</span>
                    </div>
                    <div class="card-detail">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                        <span>${escapeHTML(costDisplay)}</span>
                    </div>
                </div>
                <div class="card-actions">
                    <a class="btn-blueprint" href="${escapeHTML(event.joinLink || event.link || '#')}" target="_blank" rel="noopener">
                        <span>the blueprint</span>
                    </a>
                    <button class="btn-bet ${isTracked ? 'locked' : ''}" data-key="${escapeHTML(eventKey)}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="${isTracked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                        <span class="btn-bet-label">${isTracked ? "that's a bet ✓" : "that's a bet"}</span>
                    </button>
                </div>
            </div>
        `;

        const betBtn = card.querySelector('.btn-bet');
        betBtn.addEventListener('click', () => toggleTrack(eventKey, betBtn));

        grid.appendChild(card);
    });
}

// =============================================
// TRACKING
// =============================================
function getTracked() {
    try {
        return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
    } catch { return new Set(); }
}

function toggleTrack(key, btn) {
    const tracked = getTracked();
    const label = btn.querySelector('.btn-bet-label');
    if (tracked.has(key)) {
        tracked.delete(key);
        btn.classList.remove('locked');
        btn.querySelector('svg').setAttribute('fill', 'none');
        if (label) label.textContent = "that's a bet";
    } else {
        tracked.add(key);
        btn.classList.add('locked');
        btn.querySelector('svg').setAttribute('fill', 'currentColor');
        if (label) label.textContent = "that's a bet ✓";
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...tracked]));
    updateStats();
}

// =============================================
// FILTERING
// =============================================
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const dateVal = activeDateFilter || document.getElementById('dateFilter').value;

    let filtered = allEvents;

    if (searchTerm) {
        filtered = filtered.filter(e =>
            e.name.toLowerCase().includes(searchTerm) ||
            e.vibe.toLowerCase().includes(searchTerm) ||
            e.location.toLowerCase().includes(searchTerm) ||
            e.cost.toLowerCase().includes(searchTerm)
        );
    }

    if (dateVal) {
        filtered = filtered.filter(e => e.date === dateVal);
    }

    if (activeVibeFilter) {
        filtered = filtered.filter(e =>
            e.vibe.toLowerCase() === activeVibeFilter.toLowerCase()
        );
    }

    renderEvents(filtered);
}

function clearAllFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('dateFilter').value = '';
    activeVibeFilter = null;
    activeDateFilter = null;
    document.querySelectorAll('.vibe-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('active'));
    renderEvents(allEvents);
}

// =============================================
// CONTROLS
// =============================================
function bindControls() {
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 200));
    document.getElementById('dateFilter').addEventListener('change', () => {
        activeDateFilter = document.getElementById('dateFilter').value || null;
        document.querySelectorAll('.date-chip').forEach(c => c.classList.remove('active'));
        applyFilters();
    });
    document.getElementById('clearFilters').addEventListener('click', clearAllFilters);
    document.getElementById('viewAll').addEventListener('click', clearAllFilters);
    document.getElementById('refreshBtn').addEventListener('click', () => {
        allEvents = [];
        activeVibeFilter = null;
        activeDateFilter = null;
        document.getElementById('searchInput').value = '';
        document.getElementById('dateFilter').value = '';
        loadEvents();
    });
    document.getElementById('exportExcel').addEventListener('click', exportExcel);
    document.getElementById('exportCSV').addEventListener('click', exportCSV);
}

// =============================================
// EXPORT
// =============================================
function exportExcel() {
    if (!allEvents.length) return;
    const ws = XLSX.utils.json_to_sheet(allEvents.map(formatExport));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SXSW 2026');
    XLSX.writeFile(wb, 'the-errant-atx-sxsw-2026.xlsx');
}

function exportCSV() {
    if (!allEvents.length) return;
    const ws = XLSX.utils.json_to_sheet(allEvents.map(formatExport));
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'the-errant-atx-sxsw-2026.csv';
    a.click();
    URL.revokeObjectURL(url);
}

function formatExport(e) {
    return {
        'Date': e.date,
        'Time': e.time,
        'Event Name': e.name,
        'Location': e.location,
        'Vibe': e.vibe,
        'Cost': e.cost,
        'Link': e.joinLink || e.link
    };
}

// =============================================
// UTILITIES
// =============================================
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function debounce(fn, ms) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}
