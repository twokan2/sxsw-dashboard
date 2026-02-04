// Hardcoded Google Sheets URL
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1xeEYRm302zYQOxs1Mu_hEcnf_XQLeSxJ2-w-uXIgV2A/export?format=csv';

// Global state
let allEvents = [];
let filteredEvents = [];
let rsvpdEvents = new Set();

// Load RSVP'd events from localStorage
function loadRSVPData() {
    const saved = localStorage.getItem('sxsw-rsvp-data-v2');
    if (saved) {
        try {
            rsvpdEvents = new Set(JSON.parse(saved));
        } catch (e) {
            console.error('Error loading RSVP data:', e);
        }
    }
}

// Save RSVP data to localStorage
function saveRSVPData() {
    localStorage.setItem('sxsw-rsvp-data-v2', JSON.stringify([...rsvpdEvents]));
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadRSVPData();
    initializeEventListeners();
    loadEventsFromSheet();
});

// Event Listeners
function initializeEventListeners() {
    document.getElementById('refresh-btn').addEventListener('click', refreshEvents);
    document.getElementById('search-input').addEventListener('input', handleSearch);
    document.getElementById('date-filter').addEventListener('change', handleDateFilter);
    document.getElementById('clear-filters').addEventListener('click', clearFilters);
    document.getElementById('view-all').addEventListener('click', viewAll);
    document.getElementById('export-excel').addEventListener('click', exportToExcel);
    document.getElementById('export-csv').addEventListener('click', exportToCSV);
}

// Refresh Events
function refreshEvents() {
    const btn = document.getElementById('refresh-btn');
    const icon = btn.querySelector('.refresh-icon');
    
    // Add loading state
    btn.disabled = true;
    btn.style.opacity = '0.7';
    
    // Clear current events
    allEvents = [];
    filteredEvents = [];
    
    // Reload from sheet
    loadEventsFromSheet().then(() => {
        btn.disabled = false;
        btn.style.opacity = '1';
        
        // Success feedback
        const originalText = btn.querySelector('.refresh-text').textContent;
        btn.querySelector('.refresh-text').textContent = 'updated! 🎉';
        setTimeout(() => {
            btn.querySelector('.refresh-text').textContent = originalText;
        }, 2000);
    });
}

// Load Events from Google Sheet
async function loadEventsFromSheet() {
    showLoading();
    
    try {
        const response = await fetch(GOOGLE_SHEET_URL);
        if (!response.ok) {
            throw new Error('Failed to load events from Google Sheets');
        }
        
        const text = await response.text();
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        allEvents = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            
            const values = parseCSVLine(lines[i]);
            const event = {};
            
            headers.forEach((header, index) => {
                event[header] = values[index] || '';
            });
            
            if (event['Event Name'] || event['Event name'] || event['event name']) {
                allEvents.push(normalizeEvent(event));
            }
        }
        
        filteredEvents = [...allEvents];
        hideLoading();
        renderEvents();
        
    } catch (error) {
        console.error('Error loading events:', error);
        hideLoading();
        showError('Unable to load events. Please try refreshing the page.');
    }
}

// Parse CSV line handling quotes
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
}

// Normalize event data structure
function normalizeEvent(rawEvent) {
    return {
        date: rawEvent['Date'] || rawEvent['date'] || '',
        time: rawEvent['Time'] || rawEvent['time'] || 'TBD',
        name: rawEvent['Event Name'] || rawEvent['Event name'] || rawEvent['event name'] || 'Untitled Event',
        link: rawEvent['Event Link'] || rawEvent['event link'] || '#',
        location: rawEvent['Event Location'] || rawEvent['location'] || rawEvent['Event location'] || 'TBD',
        vibe: rawEvent['Vibe'] || rawEvent['vibe'] || '',
        rsvpLink: rawEvent['Link to Join'] || rawEvent['link to join'] || rawEvent['Event Link'] || rawEvent['event link'] || '#',
        cost: rawEvent['Cost'] || rawEvent['cost'] || 'N/A'
    };
}

// Parse and format date
function parseDate(dateStr) {
    if (!dateStr || dateStr === 'TBD') return null;
    
    try {
        // Handle various date formats
        if (dateStr.includes('-')) {
            return new Date(dateStr);
        } else if (dateStr.includes('/')) {
            return new Date(dateStr);
        } else if (dateStr.match(/^\d{8}$/)) {
            // YYYYMMDD format
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            return new Date(`${year}-${month}-${day}`);
        } else {
            return new Date(dateStr);
        }
    } catch (e) {
        return null;
    }
}

// Format date for display
function formatDate(dateStr) {
    const date = parseDate(dateStr);
    if (!date || isNaN(date.getTime())) {
        return { day: 'TBD', month: '' };
    }
    
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    
    return { day, month };
}

// Format cost
function formatCost(costStr) {
    if (!costStr || costStr.trim() === '' || costStr === 'N/A') return 'N/A';
    
    const lower = costStr.toLowerCase();
    if (lower.includes('free') || lower === '$0' || lower === '0') {
        return 'Free';
    }
    
    return costStr;
}

// Search Handler
function handleSearch(event) {
    const query = event.target.value.toLowerCase();
    
    if (!query) {
        filteredEvents = [...allEvents];
    } else {
        filteredEvents = allEvents.filter(event => 
            event.name.toLowerCase().includes(query) ||
            (event.vibe && event.vibe.toLowerCase().includes(query)) ||
            (event.location && event.location.toLowerCase().includes(query))
        );
    }
    
    renderEvents();
}

// Date Filter Handler
function handleDateFilter(event) {
    const selectedDate = event.target.value;
    if (!selectedDate) {
        filteredEvents = [...allEvents];
    } else {
        filteredEvents = allEvents.filter(event => {
            const eventDate = parseDate(event.date);
            if (!eventDate) return false;
            
            const filterDate = new Date(selectedDate);
            return eventDate.toDateString() === filterDate.toDateString();
        });
    }
    
    renderEvents();
}

// Clear Filters
function clearFilters() {
    document.getElementById('search-input').value = '';
    document.getElementById('date-filter').value = '';
    filteredEvents = [...allEvents];
    renderEvents();
}

// View All
function viewAll() {
    clearFilters();
}

// Render Events
function renderEvents() {
    const container = document.getElementById('events-container');
    const eventsToShow = filteredEvents.length > 0 ? filteredEvents : allEvents;
    
    if (eventsToShow.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: rgba(61, 37, 100, 0.7); border-radius: 15px; border: 2px dashed #6b4f9b;">
                <p style="font-size: 1.3rem; margin-bottom: 10px;">🎉 No events loaded yet</p>
                <p style="font-size: 1rem; opacity: 0.7;">Click "where we going twin" to load events</p>
            </div>
        `;
        updateEventCount(0);
        return;
    }
    
    // Sort by date
    const sorted = [...eventsToShow].sort((a, b) => {
        const dateA = parseDate(a.date);
        const dateB = parseDate(b.date);
        
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        
        return dateA - dateB;
    });
    
    container.innerHTML = '';
    const template = document.getElementById('event-template');
    
    sorted.forEach((event, index) => {
        const card = template.content.cloneNode(true);
        
        const { day, month } = formatDate(event.date);
        card.querySelector('.date-day').textContent = day;
        card.querySelector('.date-month').textContent = month;
        
        card.querySelector('.event-name').textContent = event.name;
        card.querySelector('.event-time span').textContent = event.time || 'TBD';
        card.querySelector('.event-location span').textContent = event.location || 'TBD';
        card.querySelector('.event-vibe span').textContent = event.vibe || 'N/A';
        card.querySelector('.event-cost span').textContent = formatCost(event.cost);
        
        const rsvpBtn = card.querySelector('.rsvp-btn');
        rsvpBtn.href = event.rsvpLink;
        
        const eventId = `${event.name}-${event.date}`;
        if (rsvpdEvents.has(eventId)) {
            rsvpBtn.classList.add('rsvpd');
            rsvpBtn.querySelector('.rsvp-status').textContent = 'RSVP\'d';
        }
        
        rsvpBtn.addEventListener('click', (e) => {
            rsvpdEvents.add(eventId);
            saveRSVPData();
            rsvpBtn.classList.add('rsvpd');
            rsvpBtn.querySelector('.rsvp-status').textContent = 'RSVP\'d';
        });
        
        container.appendChild(card);
    });
    
    updateEventCount(sorted.length);
}

// Update Event Count
function updateEventCount(count) {
    const countEl = document.getElementById('event-count');
    if (count === 0) {
        countEl.textContent = '';
    } else {
        const totalCount = allEvents.length;
        if (count === totalCount) {
            countEl.textContent = `Showing all ${count} event${count !== 1 ? 's' : ''}`;
        } else {
            countEl.textContent = `Showing ${count} of ${totalCount} events`;
        }
    }
}

// Export to Excel
function exportToExcel() {
    if (allEvents.length === 0) {
        alert('No events to export');
        return;
    }
    
    const exportData = allEvents.map(event => ({
        'Date': event.date,
        'Time': event.time,
        'Event Name': event.name,
        'Event Link': event.link,
        'Event Location': event.location,
        'Vibe': event.vibe,
        'Link to Join': event.rsvpLink,
        'Cost': event.cost
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "SXSW Events");
    XLSX.writeFile(wb, "knight-errant-sxsw-2026.xlsx");
}

// Export to CSV
function exportToCSV() {
    if (allEvents.length === 0) {
        alert('No events to export');
        return;
    }
    
    const headers = ['Date', 'Time', 'Event Name', 'Event Link', 'Event Location', 'Vibe', 'Link to Join', 'Cost'];
    const rows = allEvents.map(event => [
        event.date,
        event.time,
        event.name,
        event.link,
        event.location,
        event.vibe,
        event.rsvpLink,
        event.cost
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'knight-errant-sxsw-2026.csv';
    a.click();
    URL.revokeObjectURL(url);
}

// Show Loading
function showLoading() {
    document.getElementById('loading-state').classList.add('active');
    document.getElementById('events-container').style.display = 'none';
}

// Hide Loading
function hideLoading() {
    document.getElementById('loading-state').classList.remove('active');
    document.getElementById('events-container').style.display = 'grid';
}

// Show Error
function showError(message) {
    const container = document.getElementById('events-container');
    container.style.display = 'grid';
    container.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: rgba(61, 37, 100, 0.7); border-radius: 15px; border: 2px solid rgba(255, 20, 147, 0.5);">
            <p style="font-size: 1.3rem; margin-bottom: 10px; color: #ff1493;">⚠️ ${message}</p>
            <button onclick="location.reload()" style="margin-top: 20px; padding: 12px 30px; background: linear-gradient(135deg, #ff1493, #ff00ff); color: white; border: none; border-radius: 25px; cursor: pointer; font-weight: 600; font-size: 1rem;">
                Refresh Page
            </button>
        </div>
    `;
}
