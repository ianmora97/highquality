// ===== CONSTANTS =====
const AVOID_HOURS = ["13:30", "15:00", "19:30"];
const MIN_HALF = "00:00";
const MAX_HALF = "09:00";

const DAYS_MAP_ES_EN = {
    "domingo": "Sunday",
    "sábado": "Saturday",
    "viernes": "Friday",
    "jueves": "Thursday",
    "miércoles": "Wednesday",
    "martes": "Tuesday",
    "lunes": "Monday"
};

// ===== STATE =====
var g_servicios  = new Map();
var g_horarios   = new Map();
var g_serviciosTempCheck = new Map();
var horaSeleccionada = null;
var currentDateSelected = null; // YYYY-MM-DD
var currentStep = 1;
var calYear, calMonth;

// ===== INIT =====
async function init() {
    moment.locale('es');
    await bringServices();
    renderServices();

    const now = moment();
    calYear  = now.year();
    calMonth = now.month(); // 0-indexed
    renderCalendarMonth(calYear, calMonth);
    setupCalendarNav();
    setupBookingNav();
    updateStepUI();
}

// ===== DATA FETCH =====
async function bringServices() {
    const { data } = await axios.get('/api/v1/services');
    g_servicios.clear();
    data.forEach(e => g_servicios.set(e._id, e));

    const { data: horarios } = await axios.get('/api/v1/horario');
    g_horarios.clear();
    horarios.forEach(e => g_horarios.set(e.day, e));
}

// ===== STEP 1 — SERVICES =====
function renderServices() {
    const grid = document.getElementById('services-grid');
    grid.innerHTML = '';

    if (g_servicios.size === 0) {
        grid.innerHTML = '<p class="text-center text-gray-500 py-4" style="grid-column:span 2;">No hay servicios disponibles</p>';
        return;
    }

    let idx = 0;
    g_servicios.forEach((e, id) => {
        const card = document.createElement('div');
        card.className = 'service-select-card';
        card.dataset.id   = id;
        card.dataset.name  = e.name;
        card.dataset.price = e.price;
        card.style.setProperty('--i', idx++);
        const iconHtml = e.faIcon
            ? `<i class="${e.faIcon}"></i>`
            : `<img src="/images/icons/${e.icon}" alt="${e.name}" onerror="this.src='/images/icons/tijeras.png'">`;
        card.innerHTML = `
            <div class="service-select-check"><i class="fa-solid fa-check"></i></div>
            <div class="service-select-icon">${iconHtml}</div>
            <div class="service-select-name">${e.name}</div>
            <div class="service-select-price">₡${toCRC(e.price)}</div>
        `;
        card.addEventListener('click', () => toggleService(e.name, e.price, card));
        grid.appendChild(card);
    });
}

function toggleService(name, price, card) {
    if (g_serviciosTempCheck.has(name)) {
        g_serviciosTempCheck.delete(name);
        card.classList.remove('selected');
    } else {
        g_serviciosTempCheck.set(name, parseInt(price));
        card.classList.add('selected');
    }
    updatePriceDisplay();
}

function updatePriceDisplay() {
    let total = calcTotal();
    document.getElementById('precioFinalModal').textContent = toCRC(total);

    const bar = document.getElementById('price-total-bar');
    const hasServices = g_serviciosTempCheck.size > 0;
    bar.style.display = (hasServices && currentStep !== 4) ? 'flex' : 'none';

    if (hasServices) {
        const names = [...g_serviciosTempCheck.keys()].join(' · ');
        document.getElementById('price-bar-services').textContent = names;
    }
}

function calcTotal() {
    let total = 0;
    g_serviciosTempCheck.forEach(v => total += v);
    if (g_serviciosTempCheck.has('Corte') && g_serviciosTempCheck.has('Barba')) total -= 1000;
    if (g_serviciosTempCheck.has('Cejas') && g_serviciosTempCheck.size > 1) total -= 1000;
    return total;
}

// ===== STEP 2 — CUSTOM CALENDAR =====
function isDayEnabled(momentDate) {
    const dayEs = momentDate.format('dddd'); // Spanish locale: "lunes", etc.
    const dayEn = DAYS_MAP_ES_EN[dayEs];
    const horario = g_horarios.get(dayEn);
    return horario ? horario.enable : false;
}

function renderCalendarMonth(year, month) {
    calYear  = year;
    calMonth = month;

    const mth = moment([year, month, 1]);
    document.getElementById('cal-month-label').textContent =
        mth.format('MMMM YYYY').toUpperCase();

    const grid = document.getElementById('calendar-grid');
    grid.innerHTML = '';

    const firstWeekday = mth.isoWeekday(); // 1=Mon … 7=Sun
    const daysInMonth  = mth.daysInMonth();
    const today        = moment().startOf('day');

    // Empty leading cells
    for (let i = 1; i < firstWeekday; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-day cal-empty';
        grid.appendChild(empty);
    }

    for (let d = 1; d <= daysInMonth; d++) {
        const date   = moment([year, month, d]);
        const isPast = date.isBefore(today);
        const isToday   = date.isSame(today, 'day');
        const isEnabled = isDayEnabled(date);
        const dateStr   = date.format('YYYY-MM-DD');
        const isSelected = currentDateSelected === dateStr;

        const cell = document.createElement('div');
        cell.className = 'cal-day';
        if (isPast || !isEnabled) cell.classList.add('disabled');
        if (isToday)   cell.classList.add('today');
        if (isSelected) cell.classList.add('selected');
        cell.textContent = d;

        if (!isPast && isEnabled) {
            cell.addEventListener('click', () => onDayClick(dateStr));
        }

        grid.appendChild(cell);
    }

    // Disable prev button when already at current month
    const nowM = moment();
    document.getElementById('cal-prev').disabled =
        (year === nowM.year() && month === nowM.month());
}

function setupCalendarNav() {
    document.getElementById('cal-prev').addEventListener('click', () => {
        let m = calMonth - 1, y = calYear;
        if (m < 0) { m = 11; y--; }
        renderCalendarMonth(y, m);
    });
    document.getElementById('cal-next').addEventListener('click', () => {
        let m = calMonth + 1, y = calYear;
        if (m > 11) { m = 0; y++; }
        renderCalendarMonth(y, m);
    });
}

async function onDayClick(dateStr) {
    currentDateSelected = dateStr;
    renderCalendarMonth(calYear, calMonth); // refresh selected state

    // Show loading, then slide to step 3
    document.getElementById('horasDisponibles').innerHTML =
        '<div class="slots-loading"><i class="fa-solid fa-circle-notch fa-spin text-gold"></i> Cargando horarios...</div>';

    goToStep(3, 'forward');
    await loadTimeSlots();
}

// ===== STEP 3 — TIME SLOTS =====
async function loadTimeSlots() {
    const date  = moment(currentDateSelected);
    const dayEs = date.format('dddd');
    const day   = g_horarios.get(DAYS_MAP_ES_EN[dayEs]);

    // Update date label in step heading
    document.getElementById('step3-date-label').textContent =
        date.format('dddd, DD [de] MMMM');

    if (!day) {
        document.getElementById('horasDisponibles').innerHTML =
            '<p class="text-center text-gray-500 py-8">No hay horarios para este día.</p>';
        return;
    }

    showNocturnalSchedule(date);

    let arr = [...day.hours];
    arr = additionalHalfHourSlots(arr, date, day.hours);
    arr = arr.filter(h => !AVOID_HOURS.includes(moment(h, 'h:mm a').format('HH:mm')));
    arr = await removeHoursBookedfromthatday(arr, date.clone());

    // Viernes: remove 3pm and 3:30pm
    if (dayEs === 'viernes') {
        arr = arr.filter(h => {
            const h24 = moment(h, 'h:mm a').format('HH:mm');
            return h24 !== '15:00' && h24 !== '15:30';
        });
    }

    const container = document.getElementById('horasDisponibles');
    container.innerHTML = '';
    horaSeleccionada = null;

    const hasHalfSlots = arr.some(h => h.includes('30'));
    document.getElementById('time-legend').style.display = hasHalfSlots ? 'flex' : 'none';

    if (arr.length === 0) {
        container.innerHTML =
            '<p class="text-center text-gray-500 py-8">No hay horas disponibles para este día.</p>';
        return;
    }

    arr.forEach((e, i) => showHorario(e, i));
}

function showHorario(e, i) {
    const HORA_FORMAT = moment(e, 'h:mm a').format('h-mm');
    const isHalf = e.includes('30');
    const wrapper = document.createElement('div');
    wrapper.id        = `hora-div-${HORA_FORMAT}`;
    wrapper.className = 'animate__animated animate__zoomIn animate__faster';
    wrapper.style.animationDelay = `${i * 30}ms`;
    wrapper.innerHTML = `
        <input type="radio" name="horaDeCitaSelect" class="time-slot-radio"
               id="hora-cita-${HORA_FORMAT}" onclick="changeHora('${e}')" autocomplete="off">
        <label class="time-slot-card ${isHalf ? 'slot-half' : 'slot-full'}" for="hora-cita-${HORA_FORMAT}">
            <i class="fa-solid fa-check slot-check"></i>
            <span class="slot-time">${e}</span>
            <span class="slot-badge">${isHalf ? 'Media hora' : 'Hora completa'}</span>
        </label>
    `;
    document.getElementById('horasDisponibles').appendChild(wrapper);
}

function changeHora(hora) {
    horaSeleccionada = hora;
}

function showNocturnalSchedule(date) {
    const el = document.getElementById('noctural');
    if (!date.isSame(moment(), 'day')) { el.style.display = 'none'; return; }
    const h = moment().format('HH:mm');
    el.style.display = (h >= MIN_HALF && h <= MAX_HALF) ? 'flex' : 'none';
}

async function removeHoursBookedfromthatday(arr, date) {
    date.startOf('day');
    const { data: events } = await axios.get(`/api/v1/event?sort=${date.format()}`);
    const dayStr = date.format('YYYY-MM-DD');
    const bookedHours = events
        .filter(e => moment(e.start).format('YYYY-MM-DD') === dayStr)
        .map(e => moment(e.start).format('h:mm a'));
    return arr.filter(h => !bookedHours.includes(h));
}

function additionalHalfHourSlots(arr, date, dayHours) {
    const now = moment();
    if (!date.isSame(now, 'day')) return arr;
    const h = now.format('HH:mm');
    if (h >= MIN_HALF && h <= MAX_HALF) {
        dayHours.forEach(e => {
            const plus30 = moment(e, 'h:mm a').add(30, 'minutes').format('h:mm a');
            if (!dayHours.includes(plus30)) arr.push(plus30);
        });
        arr = sortHours(arr);
    }
    return arr;
}

// ===== STEP 4 — SUMMARY =====
function renderBookingSummary() {
    const services = [...g_serviciosTempCheck.keys()].join(', ');
    const dateLabel = moment(currentDateSelected).format('dddd, DD [de] MMMM');
    const total     = calcTotal();

    document.getElementById('booking-summary').innerHTML = `
        <div class="summary-row">
            <div class="summary-icon"><i class="fa-solid fa-scissors"></i></div>
            <div>
                <div class="summary-label">Servicio(s)</div>
                <div class="summary-value">${services}</div>
            </div>
        </div>
        <div class="summary-row">
            <div class="summary-icon"><i class="fa-solid fa-calendar-day"></i></div>
            <div>
                <div class="summary-label">Fecha</div>
                <div class="summary-value">${dateLabel}</div>
            </div>
        </div>
        <div class="summary-row">
            <div class="summary-icon" style="color:#e44e4e; background:rgba(228,78,78,0.1);">
                <i class="fa-solid fa-clock"></i>
            </div>
            <div>
                <div class="summary-label">Hora</div>
                <div class="summary-value uppercase">${horaSeleccionada}</div>
            </div>
        </div>
        <div class="summary-row summary-total">
            <div class="summary-icon"><i class="fa-solid fa-coins"></i></div>
            <div>
                <div class="summary-label">Total estimado</div>
                <div class="summary-value">₡${toCRC(total)}</div>
            </div>
        </div>
    `;
}

// ===== NAVIGATION =====
function setupBookingNav() {
    document.getElementById('btn-next').addEventListener('click', onNextClick);
    document.getElementById('btn-back').addEventListener('click', onBackClick);
}

async function onNextClick() {
    const bg    = window.getComputedStyle(document.body).getPropertyValue('--bs-body-bg');
    const color = window.getComputedStyle(document.body).getPropertyValue('--bs-body-color');

    if (currentStep === 1) {
        if (g_serviciosTempCheck.size === 0) {
            Swal.fire({ icon: 'warning', text: 'Selecciona al menos un servicio', background: bg, color });
            return;
        }
        goToStep(2, 'forward');

    } else if (currentStep === 2) {
        if (!currentDateSelected) {
            Swal.fire({ icon: 'warning', text: 'Selecciona un día en el calendario', background: bg, color });
            return;
        }
        document.getElementById('horasDisponibles').innerHTML =
            '<div class="slots-loading"><i class="fa-solid fa-circle-notch fa-spin text-gold"></i> Cargando horarios...</div>';
        goToStep(3, 'forward');
        await loadTimeSlots();

    } else if (currentStep === 3) {
        if (!horaSeleccionada) {
            Swal.fire({ icon: 'warning', text: 'Selecciona una hora', background: bg, color });
            return;
        }
        renderBookingSummary();
        goToStep(4, 'forward');

    } else if (currentStep === 4) {
        await agendarCita();
    }
}

function onBackClick() {
    if (currentStep > 1) goToStep(currentStep - 1, 'back');
}

function goToStep(n, direction) {
    const currentEl = document.getElementById(`step-${currentStep}`);
    const nextEl    = document.getElementById(`step-${n}`);

    currentEl.classList.remove('active', 'slide-fwd', 'slide-back');
    nextEl.classList.remove('slide-fwd', 'slide-back');
    // force reflow so animation re-triggers
    void nextEl.offsetWidth;
    nextEl.classList.add('active', direction === 'forward' ? 'slide-fwd' : 'slide-back');

    currentStep = n;
    updateStepUI();

    // Scroll so stepper sits just below the sticky nav (64px)
    const stepsBar = document.getElementById('steps-bar');
    const top = stepsBar.getBoundingClientRect().top + window.pageYOffset - 72;
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
}

function updateStepUI() {
    // Step dots
    document.querySelectorAll('.step-item').forEach(el => {
        const s = parseInt(el.dataset.step);
        el.classList.toggle('active', s === currentStep);
        el.classList.toggle('done',   s < currentStep);
    });
    // Connectors
    document.querySelectorAll('.step-connector').forEach((el, i) => {
        el.classList.toggle('done', i + 1 < currentStep);
    });
    // Back button
    document.getElementById('btn-back').style.display = currentStep > 1 ? 'inline-flex' : 'none';
    // Next button label
    const nextBtn = document.getElementById('btn-next');
    if (currentStep === 4) {
        nextBtn.innerHTML = '<i class="fa-solid fa-calendar-check me-2"></i>Agendar Cita';
    } else {
        nextBtn.innerHTML = 'Continuar <i class="fa-solid fa-arrow-right ms-2"></i>';
    }
    // Refresh price bar visibility (hidden on step 4)
    updatePriceDisplay();
}

// ===== BOOKING SUBMISSION =====
async function agendarCita() {
    const bg    = window.getComputedStyle(document.body).getPropertyValue('--bs-body-bg');
    const color = window.getComputedStyle(document.body).getPropertyValue('--bs-body-color');

    const title  = document.getElementById('nombreCita').value.trim();
    const numero = document.getElementById('numeroTelefono').value.trim();

    if (!title) {
        Swal.fire({ icon: 'error', text: 'Escribe tu nombre completo', background: bg, color });
        return;
    }
    if (!numero) {
        Swal.fire({ icon: 'error', text: 'Escribe tu número de teléfono', background: bg, color });
        return;
    }

    const servicios = [...g_serviciosTempCheck.keys()];
    let price = 0;
    g_serviciosTempCheck.forEach(v => price += v);

    const start = moment(
        `${currentDateSelected} ${horaSeleccionada}`,
        'YYYY-MM-DD h:mm a'
    ).format('YYYY-MM-DD HH:mm:ss');

    const data = {
        title: sentecesCase(title),
        start: start,
        end:   moment(start).add(30, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
        extendedProps: { servicios, numero, precio: price }
    };

    try {
        const nextBtn = document.getElementById('btn-next');
        nextBtn.disabled = true;
        nextBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin me-2"></i>Agendando...';

        await axios.post('/api/v1/event/book', data);

        Swal.fire({
            title: '¡Cita Agendada!',
            iconHtml: '<i class="fa-solid fa-check"></i>',
            customClass: { icon: 'swal-icon-success' },
            html: `
                <div class="swal-policy-box">
                    <p class="swal-policy-title"><i class="fa-solid fa-shield-halved"></i> Política de citas</p>
                    <ul class="swal-policy-list">
                        <li><i class="fa-solid fa-clock"></i> Llega 5 minutos antes de tu cita</li>
                        <li><i class="fa-solid fa-triangle-exclamation"></i> Después de 10 min de atraso la cita queda anulada</li>
                        <li><i class="fa-solid fa-bell"></i> Avisa al menos 4 horas antes si no puedes asistir</li>
                        <li><i class="fa-solid fa-circle-dollar-to-slot"></i> Se cobrará ₡2,500 de penalidad por no avisar</li>
                    </ul>
                </div>
            `,
            showConfirmButton: true,
            confirmButtonText: '<i class="fa-solid fa-thumbs-up me-2"></i>Entendido',
            background: bg,
            color
        }).then(() => location.reload());

    } catch (err) {
        Swal.fire({
            icon:  'error',
            title: 'Error al agendar',
            text:  'No se pudo agendar la cita. Por favor intenta nuevamente.',
            background: bg,
            color
        });
        const nextBtn = document.getElementById('btn-next');
        nextBtn.disabled = false;
        nextBtn.innerHTML = '<i class="fa-solid fa-calendar-check me-2"></i>Agendar Cita';
    }
}

// ===== SOCKET.IO — real-time slot removal =====
const socket = io();

socket.on('nueva-cita', (cita) => {
    if (currentStep !== 3 || !currentDateSelected) return;
    const citaDate = moment(cita.start);
    if (!citaDate.isSame(moment(currentDateSelected), 'day')) return;

    const slotKey = citaDate.format('h-mm');
    const el = document.getElementById(`hora-div-${slotKey}`);
    if (el) el.remove();

    if (document.getElementById('horasDisponibles').children.length === 0) {
        document.getElementById('horasDisponibles').innerHTML =
            '<p class="text-center text-gray-500 py-8">No hay horas disponibles.</p>';
    }
    if (horaSeleccionada === citaDate.format('h:mm a')) {
        horaSeleccionada = null;
    }
});

// ===== UTILS =====
function sortHours(hours) {
    return hours.sort((a, b) =>
        new Date('2020-01-01 ' + a) - new Date('2020-01-01 ' + b)
    );
}

function toCRC(n) {
    return new Intl.NumberFormat('es-CR').format(n);
}

function sentecesCase(str) {
    return str.toLowerCase().replace(/\b[a-z]/g, l => l.toUpperCase());
}

document.addEventListener('DOMContentLoaded', init);
