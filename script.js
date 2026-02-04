// Global state
let allEvents = [];
let filteredEvents = [];
let rsvpdEvents = new Set();

// Load RSVP'd events from localStorage
function loadRSVPData() {
    const saved = localStorage.getItem('sxsw-rsvp-data');
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
    localStorage.setItem('sxsw-rsvp-data', JSON.stringify([...rsvpdEvents]));
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadRSVPData();
    initializeEventListeners();
});

// Event Listeners
function initializeEventListeners() {
    document.getElementById('file-upload').addEventListener('change', handleFileUpload);
    document.getElementById('load-sheets').addEventListener('click', handleSheetsLoad);
    document.getElementById('search-input').addEventListener('input', handleSearch);
    document.getElementById('date-filter').addEventListener('change', handleDateFilter);
    document.getElementById('clear-date').addEventListener('click', clearDateFilter);
    document.getElementById('view-all').addEventListener('click', viewAll);
    document.getElementById('export-excel').addEventListener('click', exportToExcel);
    document.getElementById('export-sheets').addEventListener('click', exportToSheets);
}

// File Upload Handler
async function handleFileUpload(event) {
    const files = event.target.files;
    if (!files.length) return;

    showLoading();

    for (const file of files) {
        try {
            if (file.name.endsWith('.csv')) {
                await parseCSV(file);
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                await parseExcel(file);
            } else if (file.name.endsWith('.pdf')) {
                await parsePDF(file);
            }
        } catch (error) {
            console.error(`Error parsing ${file.name}:`, error);
            alert(`Error parsing ${file.name}. Please check the file format.`);
        }
    }

    renderEvents();
    event.target.value = ''; // Reset file input
}

// Parse CSV
function parseCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n');
                const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
                
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
                resolve();
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
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

// Parse Excel
function parseExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                
                jsonData.forEach(row => {
                    if (row['Event Name'] || row['Event name'] || row['event name']) {
                        allEvents.push(normalizeEvent(row));
                    }
                });
                resolve();
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// Parse PDF (basic text extraction)
async function parsePDF(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const typedarray = new Uint8Array(e.target.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    fullText += pageText + '\n';
                }
                
                // Try to extract structured data from PDF text
                alert('PDF uploaded. Please note: PDF parsing is basic. For best results, use CSV or Excel files.');
                resolve();
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// Normalize event data structure
function normalizeEvent(rawEvent) {
    return {
        date: rawEvent['Date'] || rawEvent['date'] || '',
        time: rawEvent['Time'] || rawEvent['time'] || 'TBD',
        name: rawEvent['Event Name'] || rawEvent['Event name'] || rawEvent['event name'] || 'Untitled Event',
        link: rawEvent['Event Link'] || rawEvent['event link'] || rawEvent['Link to Join'] || '#',
        location: rawEvent['Event Location'] || rawEvent['location'] || 'TBD',
        vibe: rawEvent['Vibe'] || rawEvent['vibe'] || '',
        rsvpLink: rawEvent['Link to Join'] || rawEvent['link to join'] || rawEvent['Event Link'] || rawEvent['event link'] || '#',
        cost: rawEvent['Cost'] || rawEvent['cost'] || 'N/A'
    };
}

// Google Sheets Handler
async function handleSheetsLoad() {
    const url = document.getElementById('sheets-url').value.trim();
    if (!url) {
        alert('Please enter a Google Sheets URL');
        return;
    }

    try {
        showLoading();
        
        // Extract spreadsheet ID from URL
        const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (!match) {
            throw new Error('Invalid Google Sheets URL');
        }
        
        const spreadsheetId = match[1];
        const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
        
        const response = await fetch(csvUrl);
        if (!response.ok) {
            throw new Error('Failed to load sheet. Make sure it is publicly accessible.');
        }
        
        const text = await response.text();
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
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
        
        renderEvents();
        alert('Events loaded from Google Sheets!');
    } catch (error) {
        console.error('Error loading Google Sheets:', error);
        alert('Error loading Google Sheets. Make sure the sheet is publicly accessible (Anyone with the link can view).');
    }
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
    if (!costStr || costStr.trim() === '') return 'N/A';
    
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
            event.name.toLowerCase().includes(query)
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

// Clear Date Filter
function clearDateFilter() {
    document.getElementById('date-filter').value = '';
    filteredEvents = [...allEvents];
    renderEvents();
}

// View All
function viewAll() {
    document.getElementById('search-input').value = '';
    document.getElementById('date-filter').value = '';
    filteredEvents = [...allEvents];
    renderEvents();
}

// Render Events
function renderEvents() {
    const container = document.getElementById('events-container');
    const eventsToShow = filteredEvents.length > 0 ? filteredEvents : allEvents;
    
    if (eventsToShow.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>🎉 Upload your events to get started!</p>
                <p class="empty-subtitle">CSV, Excel, or Google Sheets</p>
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
        countEl.textContent = `Showing ${count} event${count !== 1 ? 's' : ''}`;
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
    XLSX.writeFile(wb, "sxsw-events-errant.xlsx");
}

// Export to Google Sheets (opens new sheet with data)
function exportToSheets() {
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
    a.download = 'sxsw-events-errant.csv';
    a.click();
    URL.revokeObjectURL(url);
    
    alert('CSV downloaded! Upload this file to Google Sheets to create a new sheet.');
}

// Show Loading
function showLoading() {
    const container = document.getElementById('events-container');
    container.innerHTML = '<div class="empty-state loading"><p>Loading events...</p></div>';
}

// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
