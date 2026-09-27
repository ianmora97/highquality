// ===== CONSTANTS =====
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

// ===== REALTIME STATE =====
var g_slotsRendered = [];           // slot labels ('h:mm a') currently on screen
var g_heldSlots     = new Set();    // ISO starts another client is booking right now
var g_myHold        = null;         // ISO start this browser is holding
var g_refreshTimer  = null;

// ===== INIT =====
async function init() {
    moment.locale('es');
    await bringServices();
    renderServices();

    const now = moment();
    calYear  = now.year();
    calMonth = now.month(); // 0-indexed
    await renderCalendarMonth(calYear, calMonth);
    setupCalendarNav();
    setupBookingNav();
    updateStepUI();
    initStep4();
    setupInputMasks();
    initRealtime();
}

// ===== STEP 4 STATE =====
function initStep4() {
    const nombreMeta = document.querySelector('meta[name="client-session-nombre"]');
    const numeroMeta = document.querySelector('meta[name="client-session-numero"]');
    const nombre = nombreMeta ? nombreMeta.content.trim() : '';
    const numero = numeroMeta ? numeroMeta.content.trim() : '';

    if (nombre && numero) {
        _showSessionPill(nombre, numero);
    } else {
        _showPhoneInput();
    }
}

function _showSessionPill(nombre, numero) {
    document.getElementById('session-pill').style.display   = 'block';
    document.getElementById('phone-section').style.display  = 'none';
    document.getElementById('nombre-section').style.display = 'none';
    document.getElementById('account-actions').style.display = 'none';

    document.getElementById('numeroTelefono').value = numero;
    document.getElementById('nombreCita').value     = nombre;

    document.getElementById('session-pill').innerHTML =
        '<div class="rounded-xl p-3 mb-3" style="background:rgba(244,200,44,0.06); border:1px solid rgba(244,200,44,0.2);">' +
            '<div class="flex items-center gap-3">' +
                '<div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style="background:rgba(244,200,44,0.12);">' +
                    '<i class="fa-solid fa-user" style="color:#F4C82C;"></i>' +
                '</div>' +
                '<div class="flex-1 min-w-0">' +
                    '<div class="font-semibold" style="color:#fff;">' + nombre + '</div>' +
                    '<div class="text-sm" style="color:#9ca3af;">' + formatPhone(numero) + '</div>' +
                '</div>' +
                '<span class="text-xs px-2 py-1 rounded-full shrink-0" style="background:rgba(34,197,94,0.12); color:#22c55e;">' +
                    '<i class="fa-solid fa-circle-check me-1"></i>Sesión' +
                '</span>' +
            '</div>' +
        '</div>';
}

function _showPhoneInput() {
    document.getElementById('session-pill').style.display    = 'none';
    document.getElementById('phone-section').style.display   = 'block';
    document.getElementById('nombre-section').style.display  = 'none';
    document.getElementById('account-actions').style.display = 'none';
}

function formatPhone(num) {
    const s = String(num).replace(/\D/g, '');
    return s.length === 8 ? s.slice(0, 4) + '-' + s.slice(4) : s;
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
    updateStepUI();
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
// Slots the client may book: base (hourly) always, half-hour slots only the same day.
function slotsForDate(horario, momentDate) {
    if (!horario || !horario.enable) return [];
    const base = [...(horario.hours || [])];
    if (!momentDate.isSame(moment(), 'day')) return sortHours(base);
    return sortHours([...base, ...(horario.halfHours || [])]);
}

function isDayEnabled(momentDate) {
    const dayEs = momentDate.format('dddd'); // Spanish locale: "lunes", etc.
    const dayEn = DAYS_MAP_ES_EN[dayEs];
    const horario = g_horarios.get(dayEn);

    if (!horario || !horario.enable) return false;

    const slots = slotsForDate(horario, momentDate);
    if (!slots.length) return false;

    // Same-day: check if any future slots remain after filtering past times
    if (momentDate.isSame(moment(), 'day')) {
        const nowHHmm = moment().format('HH:mm');
        return slots.some(h => moment(h, 'h:mm a').format('HH:mm') > nowHHmm);
    }

    return true;
}

async function hasAvailableSlots(dateStr) {
    try {
        const date = moment(dateStr);
        const dayEs = date.format('dddd');
        const dayEn = DAYS_MAP_ES_EN[dayEs];
        const horario = g_horarios.get(dayEn);

        if (!horario || !horario.enable) return false;

        let slots = slotsForDate(horario, date);

        // Same-day: filter past slots
        if (date.isSame(moment(), 'day')) {
            const nowHHmm = moment().format('HH:mm');
            slots = slots.filter(h => {
                const slotHHmm = moment(h, 'h:mm a').format('HH:mm');
                return slotHHmm > nowHHmm;
            });
        }

        // Check booked hours
        const { data: events } = await axios.get(`/api/v1/event?sort=${date.format()}&onlyThisDay=true`);
        const bookedHours = events.map(e => moment(e.start).format('h:mm a'));

        // Find available slot
        const available = slots.some(h => !bookedHours.includes(h));
        return available;
    } catch(e) {
        return true; // default to available on error
    }
}

async function renderCalendarMonth(year, month) {
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
        const isFullyBooked = !isPast && isEnabled && !(await hasAvailableSlots(dateStr));

        const cell = document.createElement('div');
        cell.className = 'cal-day';
        if (isPast || !isEnabled) cell.classList.add('disabled');
        if (isFullyBooked) cell.classList.add('booked');
        if (isToday)   cell.classList.add('today');
        if (isSelected) cell.classList.add('selected');
        cell.textContent = d;

        if (!isPast && isEnabled && !isFullyBooked) {
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
    document.getElementById('cal-prev').addEventListener('click', async () => {
        let m = calMonth - 1, y = calYear;
        if (m < 0) { m = 11; y--; }
        await renderCalendarMonth(y, m);
    });
    document.getElementById('cal-next').addEventListener('click', async () => {
        let m = calMonth + 1, y = calYear;
        if (m > 11) { m = 0; y++; }
        await renderCalendarMonth(y, m);
    });
}

async function onDayClick(dateStr) {
    // New date picked → hour selection invalid
    if (dateStr !== currentDateSelected) horaSeleccionada = null;
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

    // Check for overrides (blocked dates)
    const { data: overrideData } = await axios.get(`/api/v1/special/check?date=${currentDateSelected}`);
    if (overrideData.blocked) {
        const reason = overrideData.specials[0]?.title || 'Cerrado';
        document.getElementById('horasDisponibles').innerHTML = `
            <div class="text-center py-8 w-full">
                <i class="fa-solid fa-calendar-xmark fa-2x text-red-400 mb-3"></i>
                <p class="text-gray-400 font-medium">Día no disponible</p>
                <p class="text-gray-600 text-sm">${reason}</p>
            </div>
        `;
        return;
    }

    showNocturnalSchedule(date);

    let arr = slotsForDate(day, date);
    arr = await removeHoursBookedfromthatday(arr, date.clone());

    // Same-day: hide slots whose time already passed
    if (date.isSame(moment(), 'day')) {
        const nowHHmm = moment().format('HH:mm');
        arr = arr.filter(h => {
            const slotHHmm = moment(h, 'h:mm a').format('HH:mm');
            return slotHHmm > nowHHmm;  // Simple string comparison works for HH:mm
        });
    }

    const container = document.getElementById('horasDisponibles');
    container.innerHTML = '';
    if (horaSeleccionada) releaseSlot();
    horaSeleccionada = null;

    const hasHalfSlots = arr.some(h => h.includes('30'));
    document.getElementById('time-legend').style.display = hasHalfSlots ? 'flex' : 'none';

    if (arr.length === 0) {
        g_slotsRendered = [];
        container.innerHTML =
            '<p class="text-center text-gray-500 py-8">No hay horas disponibles para este día.</p>';
        return;
    }

    g_slotsRendered = arr.slice();
    arr.forEach((e, i) => showHorario(e, i));
}

function showHorario(e, i) {
    const HORA_FORMAT = moment(e, 'h:mm a').format('h-mm');
    const isHalf = e.includes('30');
    const iso    = slotIso(e);
    const wrapper = document.createElement('div');
    wrapper.id        = `hora-div-${HORA_FORMAT}`;
    wrapper.className = 'animate__animated animate__zoomIn animate__faster';
    wrapper.style.animationDelay = `${i * 30}ms`;
    wrapper.dataset.start = iso || '';
    wrapper.dataset.hora  = e;
    wrapper.innerHTML = `
        <input type="radio" name="horaDeCitaSelect" class="time-slot-radio"
               id="hora-cita-${HORA_FORMAT}" onclick="changeHora('${e}')" autocomplete="off">
        <label class="time-slot-card ${isHalf ? 'slot-half' : 'slot-full'}" for="hora-cita-${HORA_FORMAT}">
            <i class="fa-solid fa-check slot-check"></i>
            <span class="slot-time">${e}</span>
            <span class="slot-badge">${isHalf ? 'Media hora' : ''}</span>
        </label>
    `;
    document.getElementById('horasDisponibles').appendChild(wrapper);

    // A slot someone else is booking right now must never look pickable.
    if (iso && g_heldSlots.has(iso)) applyLock(wrapper, true);
}

function changeHora(hora) {
    horaSeleccionada = hora;
    holdSlot(hora);
    updateStepUI();
}

function showNocturnalSchedule(date) {
    const el = document.getElementById('noctural');
    // Panel only during early morning (00:00–06:00) of the current day.
    // Half-hour slots themselves stay available all day regardless.
    const isToday = date.isSame(moment(), 'day');
    const hour = moment().hour();
    el.style.display = (isToday && hour < 6) ? 'flex' : 'none';
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

// ===== STEP STATE =====
function isStepComplete(n) {
    if (n === 1) return g_serviciosTempCheck.size > 0;
    if (n === 2) return currentDateSelected !== null;
    if (n === 3) return horaSeleccionada !== null;
    return false;
}

function isStepReachable(n) {
    if (n === 1) return true;
    for (var i = 1; i < n; i++) {
        if (!isStepComplete(i)) return false;
    }
    return true;
}

// ===== NAVIGATION =====
function setupBookingNav() {
    document.getElementById('btn-next').addEventListener('click', onNextClick);
    document.getElementById('btn-back').addEventListener('click', onBackClick);
    document.querySelectorAll('.step-item').forEach(function(el) {
        el.addEventListener('click', function() {
            var s = parseInt(el.dataset.step);
            if (s === currentStep) return;
            if (!isStepReachable(s)) return;
            if (s === 4) renderBookingSummary();
            goToStep(s, s < currentStep ? 'back' : 'forward');
        });
    });
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
    // Stepping back out of the hour picker abandons the selection: free the hold
    // so the next client can take that slot immediately.
    if (currentStep >= 3 && n < 3) {
        releaseSlot();
        horaSeleccionada = null;
    }

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
    // Step dots — done = step has valid data (regardless of current position)
    document.querySelectorAll('.step-item').forEach(el => {
        const s = parseInt(el.dataset.step);
        const complete   = isStepComplete(s);
        const reachable  = isStepReachable(s);
        el.classList.toggle('active', s === currentStep);
        el.classList.toggle('done',   complete && s !== currentStep);
        // Clickable when reachable and not already here
        el.style.cursor = (reachable && s !== currentStep) ? 'pointer' : 'default';
        el.title = (!reachable && s !== currentStep) ? 'Completa los pasos anteriores' : '';
    });
    // Connectors — done when the step to their left is complete
    document.querySelectorAll('.step-connector').forEach((el, i) => {
        el.classList.toggle('done', isStepComplete(i + 1));
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

    // Use session data if available, otherwise read from inputs
    const hasSession = !!document.querySelector('meta[name="client-session-nombre"]')?.content.trim();
    const title  = document.getElementById('nombreCita').value.trim();
    const numero = phoneMask ? phoneMask.unmaskedValue : document.getElementById('numeroTelefono').value.replace(/\D/g, '');

    if (!hasSession) {
        if (!numero || numero.length !== 8) {
            Swal.fire({ icon: 'error', text: 'Escribe un número de teléfono válido (8 dígitos)', background: bg, color });
            return;
        }
        if (!title || title.length < 2) {
            Swal.fire({ icon: 'error', text: 'Escribe tu nombre completo', background: bg, color });
            return;
        }
    }

    const servicios = [...g_serviciosTempCheck.keys()];
    let price = 0;
    g_serviciosTempCheck.forEach(v => price += v);

    const start = moment(
        `${currentDateSelected} ${horaSeleccionada}`,
        'YYYY-MM-DD h:mm a'
    ).format('YYYY-MM-DD HH:mm:ss');

    const data = {
        title:  sentecesCase(title),
        start:  start,
        end:    moment(start).add(30, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
        extendedProps: { servicios, numero, precio: price }
    };

    try {
        const nextBtn = document.getElementById('btn-next');
        nextBtn.disabled = true;
        nextBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin me-2"></i>Agendando...';

        await axios.post('/api/v1/event/book', data);
        g_myHold = null;   // the cita exists now; the server dropped the hold

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
        const status = err.response?.status;
        const msg = err.response?.data?.error || 'No se pudo agendar la cita. Por favor intenta nuevamente.';

        const nextBtn = document.getElementById('btn-next');
        nextBtn.disabled = false;
        nextBtn.innerHTML = '<i class="fa-solid fa-calendar-check me-2"></i>Agendar Cita';

        // 409 = another booking won the race, or the schedule moved under us.
        // Send the client back to a grid that tells the truth.
        if (status === 409) {
            g_myHold = null;
            horaSeleccionada = null;
            Swal.fire({
                icon: 'warning',
                title: 'Esa hora ya no está libre',
                text: msg,
                confirmButtonText: 'Elegir otra hora',
                background: bg,
                color
            }).then(async () => {
                goToStep(3, 'back');
                await loadTimeSlots();
            });
            return;
        }

        Swal.fire({ icon: 'error', title: 'Error al agendar', text: msg, background: bg, color });
    }
}

// ===== REALTIME =====
// Every change made anywhere in the app (another client booking, the barber
// adding/cancelling a cita, the schedule being edited) lands here over the
// socket. Nothing on this page polls.

function slotIso(hora) {
    if (!currentDateSelected || !hora) return null;
    const m = moment(`${currentDateSelected} ${hora}`, 'YYYY-MM-DD h:mm a');
    return m.isValid() ? m.toDate().toISOString() : null;
}

function slotWrapper(iso) {
    return document.querySelector(`#horasDisponibles [data-start="${iso}"]`);
}

function slotLabelFromIso(iso) {
    return moment(iso).format('h:mm a');
}

function isSameSelectedDay(iso) {
    return !!currentDateSelected && moment(iso).isSame(moment(currentDateSelected), 'day');
}

// ── holds: while this browser has an hour selected, nobody else can take it ──
function holdSlot(hora) {
    const iso = slotIso(hora);
    if (!iso) return;
    g_myHold = iso;
    HQ.emit('slot:hold', { start: iso });
}

function releaseSlot() {
    if (!g_myHold) return;
    HQ.emit('slot:release', { start: g_myHold });
    g_myHold = null;
}

function applyLock(wrapper, locked) {
    if (!wrapper) return;
    const label = wrapper.querySelector('.time-slot-card');
    const radio = wrapper.querySelector('.time-slot-radio');
    if (!label) return;

    if (locked) {
        label.classList.add('slot-locked');
        if (radio) { radio.checked = false; radio.disabled = true; }
        if (!label.querySelector('.slot-lock-icon')) {
            label.insertAdjacentHTML('afterbegin', '<i class="fa-solid fa-lock slot-lock-icon"></i>');
        }
        const badge = label.querySelector('.slot-badge');
        if (badge) {
            if (badge.dataset.original === undefined) badge.dataset.original = badge.textContent;
            badge.textContent = 'En proceso';
        }
    } else {
        label.classList.remove('slot-locked');
        if (radio) radio.disabled = false;
        const icon = label.querySelector('.slot-lock-icon');
        if (icon) icon.remove();
        const badge = label.querySelector('.slot-badge');
        if (badge && badge.dataset.original !== undefined) badge.textContent = badge.dataset.original;
    }
}

// ── grid refresh (debounced: a burst of events must cause one reload) ────────
function scheduleSlotRefresh(delay) {
    clearTimeout(g_refreshTimer);
    g_refreshTimer = setTimeout(async () => {
        if (currentStep === 3 && currentDateSelected) await loadTimeSlots();
        if (calYear !== undefined) await renderCalendarMonth(calYear, calMonth);
    }, delay === undefined ? 350 : delay);
}

// ── a slot is gone for good (someone booked it) ─────────────────────────────
function removeSlotLive(iso, opts) {
    const wrapper = slotWrapper(iso);
    const label   = slotLabelFromIso(iso);
    g_slotsRendered = g_slotsRendered.filter(h => h !== label);

    if (wrapper) {
        wrapper.classList.remove('animate__animated', 'animate__zoomIn');
        wrapper.classList.add('slot-vanish');
        setTimeout(() => {
            wrapper.remove();
            refreshSlotChrome();
        }, 440);
    }

    // It was the hour this client had picked — clear selection, do not fail on submit.
    if (horaSeleccionada === label) {
        horaSeleccionada = null;
        g_myHold = null;
        updateStepUI();
    } else if (opts && opts.notify && wrapper) {
        HQ.toast({
            type: 'info',
            title: 'Horario actualizado',
            text: `Las ${label} ya no están disponibles.`,
            duration: 4000
        });
    }
}

function refreshSlotChrome() {
    const container = document.getElementById('horasDisponibles');
    if (!container) return;
    const legend = document.getElementById('time-legend');
    if (container.children.length === 0) {
        container.innerHTML =
            '<p class="text-center text-gray-500 py-8">No hay horas disponibles para este día.</p>';
        if (legend) legend.style.display = 'none';
        return;
    }
    // The legend only makes sense while half-hour slots are actually on screen.
    const hasHalf = [...container.children].some(c => (c.dataset.hora || '').includes('30'));
    if (legend) legend.style.display = hasHalf ? 'flex' : 'none';
}

// ── wiring ──────────────────────────────────────────────────────────────────
function initRealtime() {
    HQ.connect({ room: 'booking' });

    // Full list of held slots on connect / reconnect.
    HQ.on('slots:snapshot', (list) => {
        g_heldSlots = new Set((list || []).map(h => h.start));
        g_heldSlots.forEach(iso => applyLock(slotWrapper(iso), true));
        // Reconnected with an hour still selected — claim it again.
        if (g_myHold) HQ.emit('slot:hold', { start: g_myHold });
    });

    // A hold has a server-side TTL so a client that walks away frees the slot.
    // While the hour is still selected on screen, keep renewing it.
    setInterval(() => {
        if (g_myHold && horaSeleccionada) HQ.emit('slot:hold', { start: g_myHold });
    }, 45000);

    HQ.on('slot:held', (payload) => {
        const start = payload && payload.start;
        if (!start) return;
        g_heldSlots.add(start);
        if (isSameSelectedDay(start)) applyLock(slotWrapper(start), true);
    });

    HQ.on('slot:released', (payload) => {
        const start = payload && payload.start;
        if (!start) return;
        g_heldSlots.delete(start);
        if (isSameSelectedDay(start)) applyLock(slotWrapper(start), false);
    });

    HQ.on('slot:granted', (payload) => {
        g_myHold = payload && payload.start ? payload.start : g_myHold;
    });

    // Our own hold timed out (tab left open for a long while) — take it back
    // if the hour is still selected, otherwise forget it.
    HQ.on('slot:released', (payload) => {
        const start = payload && payload.start;
        if (!start || start !== g_myHold) return;
        if (horaSeleccionada) HQ.emit('slot:hold', { start: start });
        else g_myHold = null;
    });

    // Our hold was refused — someone selected it a moment earlier.
    HQ.on('slot:denied', (payload) => {
        const start = payload && payload.start;
        if (!start) return;
        g_heldSlots.add(start);
        applyLock(slotWrapper(start), true);
        if (horaSeleccionada === slotLabelFromIso(start)) {
            horaSeleccionada = null;
            g_myHold = null;
            updateStepUI();
        }
        HQ.toast({
            type: 'warn',
            title: 'Hora ocupada',
            text: 'Otro cliente está reservando esa hora. Elige otra.',
            duration: 6000
        });
    });

    // New cita anywhere — from another client or from the barber.
    HQ.on('cita:new', (payload) => {
        const cita = payload && payload.cita;
        if (!cita) return;
        const iso = new Date(cita.start).toISOString();
        g_heldSlots.delete(iso);
        if (!isSameSelectedDay(cita.start)) {
            scheduleSlotRefresh(600);   // keep the month availability dots honest
            return;
        }
        removeSlotLive(iso, { notify: true });
        scheduleSlotRefresh(1200);
    });

    // Cita cancelled → the hour is free again.
    HQ.on('cita:delete', (payload) => {
        const cita = payload && payload.cita;
        if (cita && isSameSelectedDay(cita.start)) {
            HQ.toast({
                type: 'success',
                title: 'Se liberó un espacio',
                text: `Las ${slotLabelFromIso(cita.start)} volvieron a estar disponibles.`,
                duration: 5000
            });
        }
        scheduleSlotRefresh();
    });

    // Reagendada / pagada → the grid may change either way.
    HQ.on('cita:update', () => scheduleSlotRefresh());

    // Barber edited the working hours or closed a day while we were browsing.
    HQ.on('horario:update', async () => {
        await bringServices();
        HQ.toast({ type: 'info', title: 'Horarios actualizados', text: 'La disponibilidad se acaba de refrescar.' });
        scheduleSlotRefresh(0);
    });

    HQ.on('special:update', () => {
        HQ.toast({ type: 'info', title: 'Disponibilidad actualizada' });
        scheduleSlotRefresh(0);
    });

    // Never leave a stale hold behind.
    window.addEventListener('beforeunload', releaseSlot);
}

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

// ===== INPUT MASKS =====
var phoneMask = null;

function setupInputMasks() {
    var phoneEl = document.getElementById('numeroTelefono');
    var nameEl  = document.getElementById('nombreCita');

    if (!phoneEl || !nameEl) return;

    // Phone: XXXX-XXXX display, 8 raw digits underneath
    phoneMask = IMask(phoneEl, {
        mask: '0000 0000',
        lazy: true,
    });
    phoneMask.on('accept', function() {
        debounceLookup(phoneMask.unmaskedValue);
    });

    // Name: allow letters (including accented), spaces, hyphens, apostrophes
    var namePattern = /^[a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s'\-]*$/;
    nameEl.addEventListener('input', function() {
        var pos   = this.selectionStart;
        var clean = this.value.replace(/[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ\s'\-]/g, '');
        if (clean !== this.value) {
            this.value = clean;
            this.setSelectionRange(pos - 1, pos - 1);
        }
    });
}

// ===== PHONE LOOKUP =====
var lookupTimer = null;
function debounceLookup(rawDigits) {
    clearTimeout(lookupTimer);
    if (!rawDigits || rawDigits.length < 8) {
        hideLookupResult();
        return;
    }
    lookupTimer = setTimeout(function() { phoneLookup(rawDigits); }, 600);
}

async function phoneLookup(numero) {
    var status         = document.getElementById('lookup-status');
    var nombreSection  = document.getElementById('nombre-section');
    var nombreInput    = document.getElementById('nombreCita');
    var accountActions = document.getElementById('account-actions');
    var actionLogin    = document.getElementById('action-login');
    var actionRegister = document.getElementById('action-register');
    try {
        var resp = await axios.get('/api/v1/client/lookup?numero=' + numero);
        var data = resp.data;
        status.style.display = 'none';
        accountActions.style.display = 'none';
        if (data.found) {
            nombreInput.value       = data.nombre;
            nombreInput.readOnly    = true;
            nombreInput.style.color = '#9ca3af';
            nombreSection.style.display = 'block';
            if (data.hasAccount) {
                actionLogin.style.display    = 'block';
                actionRegister.style.display = 'none';
                accountActions.style.display = 'block';
            }
        } else {
            nombreInput.value       = '';
            nombreInput.readOnly    = false;
            nombreInput.style.color = '';
            nombreSection.style.display = 'block';
        }
    } catch(e) {
        hideLookupResult();
    }
}

function hideLookupResult() {
    var status         = document.getElementById('lookup-status');
    var nombreSection  = document.getElementById('nombre-section');
    var nombreInput    = document.getElementById('nombreCita');
    var accountActions = document.getElementById('account-actions');
    if (status)         status.style.display = 'none';
    if (nombreSection)  nombreSection.style.display = 'none';
    if (nombreInput)    { nombreInput.value = ''; nombreInput.readOnly = false; nombreInput.style.color = ''; }
    if (accountActions) accountActions.style.display = 'none';
}

// ===== CLIENT AUTH =====
var clientAuthModal;
document.addEventListener('DOMContentLoaded', function() {
    clientAuthModal = new bootstrap.Modal(document.getElementById('clientAuthModal'));
    if (new URLSearchParams(window.location.search).get('auth') === '1') {
        setTimeout(() => clientAuthModal.show(), 400);
    }
});

function openClientAuth() {
    clientAuthModal.show();
}

function showAuthTab(tab) {
    document.getElementById('auth-login').style.display = tab === 'login' ? '' : 'none';
    document.getElementById('auth-register').style.display = tab === 'register' ? '' : 'none';
    document.getElementById('tab-login-btn').className = 'btn btn-sm flex-1 ' + (tab === 'login' ? 'btn-gold' : 'btn-dark');
    document.getElementById('tab-register-btn').className = 'btn btn-sm flex-1 ' + (tab === 'register' ? 'btn-gold' : 'btn-dark');
    document.getElementById('auth-error').style.display = 'none';
}

async function clientLogin() {
    var numero = document.getElementById('loginNumero').value;
    var password = document.getElementById('loginPassword').value;
    try {
        await axios.post('/api/v1/client/auth/login', { numero, password });
        window.location.href = '/app';
    } catch(e) {
        var err = document.getElementById('auth-error');
        err.textContent = (e.response && e.response.data && e.response.data.error) ? e.response.data.error : 'Error al iniciar sesión';
        err.style.display = '';
    }
}

async function clientRegister() {
    var nombre = document.getElementById('regNombre').value;
    var numero = document.getElementById('regNumero').value;
    var password = document.getElementById('regPassword').value;
    var confirm = document.getElementById('regPasswordConfirm').value;
    var err = document.getElementById('auth-error');
    if (password !== confirm) {
        err.textContent = 'Las contraseñas no coinciden';
        err.style.display = '';
        return;
    }
    try {
        await axios.post('/api/v1/client/auth/register', { nombre, numero, password });
        window.location.href = '/app';
    } catch(e) {
        err.textContent = (e.response && e.response.data && e.response.data.error) ? e.response.data.error : 'Error al crear cuenta';
        err.style.display = '';
    }
}

document.addEventListener('DOMContentLoaded', init);
