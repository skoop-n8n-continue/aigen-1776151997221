// Digital Signage Calendar Logic with data.json configurator

// Global state
const today = new Date();
today.setHours(0, 0, 0, 0);

let displayMonth = today.getMonth();
let displayYear = today.getFullYear();
let isShowingNextMonth = false;
let autoRotateInterval = null;

let appData = null;
let parsedEvents = [];
let eventTypesMap = {};

// Fetch and parse data.json
async function loadAppData() {
  try {
    const response = await fetch('data.json');
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to load app data:', error);
    return null;
  }
}

// Convert hex to rgb string for alpha transparency
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 183, 175';
}

async function init() {
    const data = await loadAppData();
    if (!data) return;
    appData = data;

    // Apply data-driven styles
    const settings = data.sections.app_settings;
    document.documentElement.style.setProperty('--bg-dark', settings.background_color.value);
    document.documentElement.style.setProperty('--bg-panel', settings.panel_color.value);
    document.documentElement.style.setProperty('--bg-panel-light', settings.panel_light_color.value);
    document.documentElement.style.setProperty('--text-main', settings.text_main_color.value);
    document.documentElement.style.setProperty('--text-muted', settings.text_muted_color.value);
    document.documentElement.style.setProperty('--accent', settings.accent_color.value);
    document.documentElement.style.setProperty('--border', settings.border_color.value);

    // Calculate transparent versions of accent color for glow and today bg
    const rgbAccent = hexToRgb(settings.accent_color.value);
    document.documentElement.style.setProperty('--accent-glow', `rgba(${rgbAccent}, 0.3)`);
    document.documentElement.style.setProperty('--today-bg', `rgba(${rgbAccent}, 0.15)`);

    // Apply Agenda title
    document.getElementById('agenda-title').innerText = settings.agenda_title?.value || "Upcoming Events";

    // Setup event types map for easy lookup
    const eventTypes = data.sections.event_types?.value || [];
    eventTypes.forEach(type => {
        eventTypesMap[type.id] = type;
    });

    // Parse events dates
    const rawEvents = data.sections.events?.value || [];
    parsedEvents = rawEvents.map(evt => {
        const d = new Date(evt.date);
        d.setHours(0, 0, 0, 0); // normalize for day comparisons
        return {
            id: evt.id,
            title: evt.title,
            date: d,
            origDate: new Date(evt.date),
            typeId: evt.event_type
        };
    });

    // Initial renders
    renderCalendar(displayMonth, displayYear);
    renderAgenda();

    // Setup Auto-rotate
    const intervalSecs = settings.auto_rotate_seconds?.value || 15;
    autoRotateInterval = setInterval(cycleSignage, intervalSecs * 1000);

    // Reveal the app
    document.getElementById('app-container').classList.add('loaded');
}


// --- Clock and Date logic ---
function updateClock() {
    const now = new Date();

    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    document.getElementById('clock').innerText = now.toLocaleTimeString('en-US', timeOptions);

    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('date-display').innerText = now.toLocaleDateString('en-US', dateOptions);
}
// Run immediately, then every second
updateClock();
setInterval(updateClock, 1000);


// --- Calendar Rendering Logic ---
function renderCalendar(month, year) {
    const daysGrid = document.getElementById('days-grid');
    const monthYearDisplay = document.getElementById('month-year');

    // Clear previous
    daysGrid.innerHTML = '';

    // Set Header
    const firstDayOfMonth = new Date(year, month, 1);
    monthYearDisplay.innerText = firstDayOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const startingDay = firstDayOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const totalCells = 42;

    // 1. Previous month trailing days
    for (let i = 0; i < startingDay; i++) {
        const dayNum = daysInPrevMonth - startingDay + i + 1;
        const cellDate = new Date(year, month - 1, dayNum);
        daysGrid.appendChild(createDayCell(cellDate, dayNum, true));
    }

    // 2. Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        const cellDate = new Date(year, month, i);
        daysGrid.appendChild(createDayCell(cellDate, i, false));
    }

    // 3. Next month leading days
    const remainingCells = totalCells - (startingDay + daysInMonth);
    for (let i = 1; i <= remainingCells; i++) {
        const cellDate = new Date(year, month + 1, i);
        daysGrid.appendChild(createDayCell(cellDate, i, true));
    }

    // Add fade-in animation
    daysGrid.classList.remove('fade-in');
    void daysGrid.offsetWidth; // trigger reflow
    daysGrid.classList.add('fade-in');
}

function createDayCell(cellDate, dayNum, isOtherMonth) {
    const cell = document.createElement('div');
    cell.classList.add('day-cell');

    if (isOtherMonth) {
        cell.classList.add('other-month');
    }

    if (cellDate.getTime() === today.getTime()) {
        cell.classList.add('today');
    }

    const numEl = document.createElement('div');
    numEl.classList.add('day-number');
    numEl.innerText = dayNum;
    cell.appendChild(numEl);

    const dayEvents = parsedEvents.filter(e => e.date.getTime() === cellDate.getTime());
    const maxEventsToShow = 3;
    const eventsToShow = dayEvents.slice(0, maxEventsToShow);

    eventsToShow.forEach(evt => {
        const evtEl = document.createElement('div');
        evtEl.classList.add('event-dot');
        const evtType = eventTypesMap[evt.typeId];
        evtEl.style.backgroundColor = evtType ? evtType.color : 'var(--accent)';
        evtEl.innerText = evt.title;
        cell.appendChild(evtEl);
    });

    if (dayEvents.length > maxEventsToShow) {
        const moreEl = document.createElement('div');
        moreEl.classList.add('event-dot');
        moreEl.style.backgroundColor = 'transparent';
        moreEl.style.color = 'var(--text-muted)';
        moreEl.style.padding = '0';
        moreEl.style.textAlign = 'center';
        moreEl.innerText = `+${dayEvents.length - maxEventsToShow} more`;
        cell.appendChild(moreEl);
    }

    return cell;
}


// --- Agenda Rendering Logic ---
function renderAgenda() {
    const agendaList = document.getElementById('events-list');
    agendaList.innerHTML = '';

    const upcomingEvents = parsedEvents
        .filter(e => e.date.getTime() >= today.getTime())
        .sort((a, b) => a.origDate - b.origDate)
        .slice(0, 10);

    upcomingEvents.forEach(evt => {
        const item = document.createElement('div');
        item.classList.add('agenda-event');

        const evtType = eventTypesMap[evt.typeId];
        const eventColor = evtType ? evtType.color : 'var(--accent)';
        item.style.borderLeftColor = eventColor;

        let dateLabel = "";
        const diffTime = Math.abs(evt.date - today);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (evt.date.getTime() === today.getTime()) {
            dateLabel = "Today";
        } else if (diffDays === 1) {
            dateLabel = "Tomorrow";
        } else {
            dateLabel = evt.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
        }

        const timeLabel = evt.origDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

        item.innerHTML = `
            <div class="agenda-event-time">${dateLabel} &middot; ${timeLabel}</div>
            <div class="agenda-event-title">${evt.title}</div>
        `;

        agendaList.appendChild(item);
    });
}


// --- Signage Auto-Rotation Logic ---
function cycleSignage() {
    isShowingNextMonth = !isShowingNextMonth;

    let targetMonth = today.getMonth();
    let targetYear = today.getFullYear();

    if (isShowingNextMonth) {
        targetMonth += 1;
        if (targetMonth > 11) {
            targetMonth = 0;
            targetYear += 1;
        }
    }

    renderCalendar(targetMonth, targetYear);
}

// Slow auto-scroll the agenda if needed (since signage is non-interactive)
function scrollAgenda() {
    const list = document.getElementById('events-list');
    if (list && list.scrollHeight > list.clientHeight) {
        list.scrollTop += 1;
        if (list.scrollTop + list.clientHeight >= list.scrollHeight - 1) {
            setTimeout(() => {
                list.scrollTop = 0;
            }, 2000);
        }
    }
}

setInterval(scrollAgenda, 50);

// Initialize
init();