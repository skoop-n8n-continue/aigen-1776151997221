// Digital Signage Calendar Logic

const today = new Date();
// Remove time component for strict date comparisons
today.setHours(0, 0, 0, 0);

// Global state for auto-rotation
let displayMonth = today.getMonth();
let displayYear = today.getFullYear();
let isShowingNextMonth = false;

// Theme colors from CSS
const COLORS = {
    meeting: 'var(--event-meeting)',
    deadline: 'var(--event-deadline)',
    company: 'var(--event-company)',
    casual: 'var(--event-casual)'
};

// Generate sample events relative to today so it's always populated
function generateSampleEvents() {
    const evts = [];

    function addEvent(dayOffset, title, type) {
        const d = new Date(today);
        d.setDate(today.getDate() + dayOffset);

        evts.push({
            date: d,
            title: title,
            color: COLORS[type] || COLORS.meeting
        });
    }

    // Past events (few days ago)
    addEvent(-3, "Project Retrospective", "casual");
    addEvent(-1, "Client Sync", "meeting");

    // Today's events
    addEvent(0, "Daily Standup", "meeting");
    addEvent(0, "Design Review", "company");

    // Upcoming events (Current month and next)
    addEvent(1, "All-Hands Meeting", "company");
    addEvent(2, "Q2 Roadmap Planning", "meeting");
    addEvent(4, "Project Alpha Launch", "deadline");
    addEvent(5, "Team Lunch", "casual");
    addEvent(7, "Client Presentation", "meeting");
    addEvent(10, "Marketing Sync", "meeting");
    addEvent(12, "Code Freeze", "deadline");
    addEvent(15, "Company Town Hall", "company");
    addEvent(18, "Sprint Retrospective", "meeting");
    addEvent(22, "Quarterly Review", "deadline");
    addEvent(25, "Happy Hour", "casual");

    // Next month events
    addEvent(31, "Monthly Kickoff", "company");
    addEvent(35, "Cross-functional Sync", "meeting");
    addEvent(42, "Beta Release", "deadline");

    return evts;
}

const events = generateSampleEvents();

// --- Clock and Date logic ---
function updateClock() {
    const now = new Date();

    // Update Clock (e.g., 10:42 AM)
    const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    document.getElementById('clock').innerText = now.toLocaleTimeString('en-US', timeOptions);

    // Update Date Display (e.g., Tuesday, April 14, 2026)
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

    // Calculate calendar grid properties
    const startingDay = firstDayOfMonth.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    // We want exactly 6 rows (42 cells) to keep grid size consistent
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

    // Check if this cell is exactly "today"
    if (cellDate.getTime() === today.getTime()) {
        cell.classList.add('today');
    }

    // Number element
    const numEl = document.createElement('div');
    numEl.classList.add('day-number');
    numEl.innerText = dayNum;
    cell.appendChild(numEl);

    // Add events for this day (limit to max 3 visually to prevent overflow)
    const dayEvents = events.filter(e => e.date.getTime() === cellDate.getTime());

    const maxEventsToShow = 3;
    const eventsToShow = dayEvents.slice(0, maxEventsToShow);

    eventsToShow.forEach(evt => {
        const evtEl = document.createElement('div');
        evtEl.classList.add('event-dot');
        evtEl.style.backgroundColor = evt.color;
        evtEl.innerText = evt.title;
        cell.appendChild(evtEl);
    });

    // If more events than max, show a "+X more" indicator
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

    // Find all upcoming events starting from today
    // Limit to next 10 events to not overload the screen
    const upcomingEvents = events
        .filter(e => e.date.getTime() >= today.getTime())
        .sort((a, b) => a.date - b.date)
        .slice(0, 10);

    upcomingEvents.forEach(evt => {
        const item = document.createElement('div');
        item.classList.add('agenda-event');
        item.style.borderLeftColor = evt.color;

        // Format Date nicely (e.g. "Today", "Tomorrow", or "Apr 15")
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

        item.innerHTML = `
            <div class="agenda-event-time">${dateLabel}</div>
            <div class="agenda-event-title">${evt.title}</div>
        `;

        agendaList.appendChild(item);
    });
}


// --- Signage Auto-Rotation Logic ---
// Automatically cycle between current month and next month
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

// Initial render
renderCalendar(displayMonth, displayYear);
renderAgenda();

// Auto-rotate every 15 seconds
setInterval(cycleSignage, 15000);

// Slow auto-scroll the agenda if needed (since signage is non-interactive)
function scrollAgenda() {
    const list = document.getElementById('events-list');
    if (list.scrollHeight > list.clientHeight) {
        list.scrollTop += 1; // Scroll 1px
        // If at bottom, reset to top
        if (list.scrollTop + list.clientHeight >= list.scrollHeight - 1) {
            setTimeout(() => {
                list.scrollTop = 0;
            }, 2000); // Pause at bottom before resetting
        }
    }
}

// Start smooth scrolling the agenda every 50ms
setInterval(scrollAgenda, 50);
