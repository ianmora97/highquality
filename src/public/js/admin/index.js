async function init() {
    await bringServices();
    createCalendar();
    insightsThisWeek();
    // ifWindowResize();
    nextAppointment();
    initEarningsRangePickers();
    document.querySelectorAll('.kpi-card').forEach(el => {
        el.addEventListener('animationend', () => { el.style.animation = 'none'; }, { once: true });
    });
}
async function insightsThisWeek() {
    const sort = moment().startOf('isoWeek').format()
    const { data } = await axios.get(`/api/v1/event?sort=${sort}`);
    analytics(data);
}
const DAYS_MAP_ES_EN = {
    "domingo": "Sunday",
    "sábado": "Saturday",
    "viernes": "Friday",
    "jueves": "Thursday",
    "miércoles": "Wednesday",
    "martes": "Tuesday",
    "lunes": "Monday"
}
const DAYS_MAP_EN_ES = {
    "Monday": "Lunes",
    "Tuesday": "Martes",
    "Wednesday": "Miércoles",
    "Thursday": "Jueves",
    "Friday": "Viernes",
    "Saturday": "Sábado",
    "Sunday": "Domingo"
}
var g_servicios = new Map();
var g_serviciosByName = new Map();
var g_horarios = new Map();
async function bringServices() {
    const { data } = await axios.get('/api/v1/services');
    g_servicios.clear();
    g_serviciosByName.clear();
    data.forEach((e, i) => {
        g_servicios.set(e._id, e);
        g_serviciosByName.set(e.name, e);
    });

    const { data: horarios } = await axios.get('/api/v1/horario');
    g_horarios.clear();
    horarios.forEach(e => {
        g_horarios.set(e.day, e);
    });
    await addHalfHourtoMap();

    const { data: clients } = await axios.get('/api/v1/client');
    fillClients(clients);
}
var g_clients = new Map();
function fillClients(data) {
    g_clients.clear();
    data.forEach(e => {
        g_clients.set(parseInt(e.numero), e);
    });
}
async function addHalfHourtoMap() {
    g_horarios.forEach((e) => {
        let hours = e.hours;
        hours = sortHours(hours);
        e.hours = hours;
        const length = hours.length;
        for (let i = 0; i < (length - 1); i++) {
            const h = hours[i];
            const half = moment(h, 'h:mm a').add(30, 'minutes').format('h:mm a');
            e.hours.push(half);
        }
    });
    console.log("Horarios con media hora añadida", g_horarios);
}
function addHalfHour(arr) {
    const array = [];
    for (let i = 0; i < arr.length; i++) {
        let h = arr[i];
        array.push(h);
        let half = moment(h, 'h:mm a').add(30, 'minutes').format('h:mm a');
        array.push(half);
    }
    return [...new Set(array)];
}
var businessHours = [];
var hiddenDays = [];
var slotDays = {
    min: '09:00:00',
    max: '20:00:00'
};
var expected_view = 'timeGridWeek';
function clampTimeStr(hhmm, deltaHours) {
    const [h, m] = hhmm.split(':').map(Number);
    let total = h * 60 + m + deltaHours * 60;
    total = Math.max(0, Math.min(total, 24 * 60 - 1));
    const hh = String(Math.floor(total / 60)).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    return `${hh}:${mm}:00`;
}
async function createCalendar() {
    let earliestStart = null;
    let latestEnd = null;
    g_horarios.forEach((e, i) => {
        if (!e.enable) hiddenDays.push(parseInt(moment(DAYS_MAP_EN_ES[e.day], 'dddd').format('d')));
        else {
            e.hours = sortHours(e.hours);
            const day = DAYS_MAP_EN_ES[e.day];
            const hours = e.hours;
            const startTime = moment(hours[0], 'h:mm a').format('HH:mm');
            const endTime = moment(hours[hours.length - 1], 'h:mm a').add(1, 'hour').format('HH:mm');
            businessHours.push({
                daysOfWeek: [parseInt(moment(day, 'dddd').format('d'))],
                startTime,
                endTime,
            });
            if (earliestStart === null || startTime < earliestStart) earliestStart = startTime;
            if (latestEnd === null || endTime > latestEnd) latestEnd = endTime;
        }
    });
    if (earliestStart !== null && latestEnd !== null) {
        // Show 2 extra hours before opening and after closing, outside businessHours shading
        slotDays.min = clampTimeStr(earliestStart, -2);
        slotDays.max = clampTimeStr(latestEnd, 2);
    }
    let viewport = $(window).width();
    if (viewport < 640) {
        expected_view = 'timeGridDay';
        // Highlight Day button as active on mobile
        updateCalViewButtons('timeGridDay');
    }
    renderCalendar();
}
var calendar;
async function renderCalendar() {
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'es',
        initialView: expected_view,
        aspectRatio: 1,
        height: "900px",
        nowIndicator: true,
        dayMaxEventRows: true,
        expandRows: false,
        themeSystem: 'standard',
        firstDay: 1,
        businessHours: businessHours,
        hiddenDays: hiddenDays,
        slotMinTime: slotDays.min,
        slotMaxTime: slotDays.max,
        views: {
            dayGrid: {
                titleFormat: { month: 'long' },
                dayMaxEventRows: 0
            },
            timeGrid: {
                titleFormat: { month: 'long' },
                dayMaxEventRows: 0,
                dayHeaderFormat: { weekday: 'long' }
            },
            dayGridThreeWeek: {
                titleFormat: { month: 'long' },
                type: 'timeGridWeek',
                duration: { days: 3 },
                dayMaxEventRows: 0
            },
            dayGridFourWeek: {
                titleFormat: { month: 'long' },
                type: 'timeGridWeek',
                duration: { days: 4 },
                dayMaxEventRows: 0
            }
        },
        eventTimeFormat: {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        },
        slotLabelInterval: '01:00:00',
        slotLabelFormat: {
            hour: 'numeric',
            meridiem: 'short',
            hour12: true
        },
        headerToolbar: {
            left: 'prev',
            center: 'title',
            right: 'next'
        },
        buttonText: {
            week: 'Semana',
            day: 'Día',
            dayGridFourWeek: '3 Dias',
        },
        dateClick: onDateClick,
        datesSet: dateSet,
        eventClick: eventClick,
        eventContent: eventContent,
        eventDidMount: eventDidMount
    });
    calendar.render();
}

// Calendar view switcher
function switchCalView(viewName) {
    calendar.changeView(viewName);
    updateCalViewButtons(viewName);
}

function updateCalViewButtons(activeView) {
    const map = {
        'timeGridWeek': 'btnViewWeek',
        'dayGridThreeWeek': 'btnView3Days',
        'timeGridDay': 'btnViewDay',
        'dayGridMonth': 'btnViewMonth'
    };
    ['btnViewWeek', 'btnView3Days', 'btnViewDay', 'btnViewMonth'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });
    const activeId = map[activeView];
    if (activeId) {
        const el = document.getElementById(activeId);
        if (el) el.classList.add('active');
    }
}

function eventDidMount(info) {
    const { event } = info;
    const estado = event.extendedProps.estado;
    if (estado === 'PAGO') {
        info.el.style.borderLeft = '3px solid #22c55e';
    }
}

function eventContent(info) {
    const { event, view } = info;
    const { title, start } = event;
    const hora = moment(start).format('h:mm a');
    const isPaid = event.extendedProps.estado === 'PAGO';
    const paidIcon = isPaid ? '<i class="fa-solid fa-circle-check text-success me-1" style="font-size:0.7rem;"></i>' : '';

    if (view.type.startsWith('timeGrid')) {
        return {
            html: `
            <div class="d-flex justify-content-start align-items-center px-1 animate__animated animate__fadeIn">
                <p class="mb-0 text-white me-2"><i class="fa-solid fa-cut"></i></p>
                <div class="text-white">
                    <p class="small m-0 fw-bold">${paidIcon}${title}</p>
                    <p class="small m-0"><span class="text-lowercase">${hora}</span></p>
                </div>
            </div>`
        }
    } else if (view.type == 'dayGridFourWeek') {
        return {
            html: `
            <div class="d-flex justify-content-start align-items-center px-1 animate__animated animate__fadeIn">
                <p class="mb-0 text-white me-2"><i class="fa-solid fa-cut"></i></p>
                <div class="text-white">
                    <p class="small m-0 fw-bold">${paidIcon}${title}</p>
                    <p class="small m-0"><span class="text-lowercase">${hora}</span></p>
                </div>
            </div>`
        }
    }
    return true;
}
function eventClick(info) {
    const { title, start, extendedProps: ev } = info.event;
    const fecha = moment(start, 'YYYY-MM-DD HH:mm').format('dddd D [de] MMMM');
    const hora = moment(start, 'YYYY-MM-DD HH:mm').format('h:mm a');
    const waMsg = `?text=Hola%20${encodeURIComponent(title)},%20le%20contactamos%20de%20HighQuality%20por%20su%20cita%20el%20${encodeURIComponent(fecha)}%20a%20las%20${encodeURIComponent(hora)}.`;
    const precio = ev.precio || (ev.servicios || []).reduce((sum, name) => {
        const svc = g_serviciosByName.get(name);
        return sum + (svc ? svc.price : 0);
    }, 0);
    window.dispatchEvent(new CustomEvent('open-cita-detail', {
        detail: {
            _id: ev._id,
            title,
            fecha,
            hora,
            fechaRaw: moment(start).format('YYYY-MM-DD'),
            horaRaw: moment(start).format('HH:mm'),
            servicios: ev.servicios,
            precio,
            precioFmt: toCRC(precio),
            numero: ev.numero,
            estado: ev.estado,
            waMsg,
        }
    }));
}
function showToast(icon, title) {
    Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1800,
        timerProgressBar: true,
        background: '#0d0d0d',
        color: '#f1f1f1',
    }).fire({ icon, title });
}
async function dateSet(info) {
    const { startStr, endStr } = info;
    const startM = moment(startStr);
    const endInclusive = moment(endStr).subtract(1, 'day');
    const start = sentenceCase(startM.format('dddd D [de] MMMM'));
    if (startM.isSame(endInclusive, 'day')) {
        $("#date").html(start);
    } else {
        const end = sentenceCase(endInclusive.format('dddd D [de] MMMM'));
        $("#date").html(`${start} - ${end}`);
    }

    const sort = moment(startStr).startOf('isoWeek').format()
    const { data } = await axios.get(`/api/v1/event?sort=${sort}`);
    calendar.removeAllEventSources();
    calendar.addEventSource(data);

    // Update KPIs for the currently visible week
    analytics(data);
}
async function analytics(data) {
    const today = moment().format('YYYY-MM-DD');
    const events = data.filter(e => moment(e.start).format('YYYY-MM-DD') == today);
    const total = events.length;

    const pagadas = events.filter(e => e.extendedProps.estado == 'PAGO');
    const porPagar = events.filter(e => e.extendedProps.estado != 'PAGO');

    let monto = 0;
    pagadas.forEach(e => {
        monto += parseInt(e.extendedProps.precio);
    });

    anime({
        targets: '#countCitas',
        innerHTML: [0, total],
        easing: 'linear',
        round: 1,
        duration: 500
    });

    anime({
        targets: '#countPorPagar',
        innerHTML: [0, porPagar.length],
        easing: 'linear',
        round: 1,
        duration: 500
    });

    anime({
        targets: '#countGanancias',
        innerHTML: [0, monto],
        easing: 'linear',
        round: 1,
        duration: 500,
        complete: function (anim) {
            $('#countGanancias').html(toCRC(monto));
        }
    });
    const month = moment().format('YYYY-MM');
    const { data: eventsMonth } = await axios.get('/api/v1/event/month?month=' + month);
    const pagos = eventsMonth.filter(e => e.extendedProps.estado == 'PAGO');
    console.log(pagos)
    const totalMonth = pagos.map(e => parseInt(e.extendedProps.precio)).reduce((acc, e) => acc + e, 0);

    anime({
        targets: '#countGananciasMes',
        innerHTML: [0, totalMonth],
        easing: 'linear',
        round: 1,
        duration: 500,
        complete: function (anim) {
            $('#countGananciasMes').html(toCRC(totalMonth));
        }
    });

}
async function removeHoursBookedfromthatday(arr, date) {
    const hours = [...arr];
    date.hour(0o0);
    const { data: events } = await axios.get(`/api/v1/event?sort=${date.format()}&onlyThisDay=true`);
    let bookedHours = [];
    bookedHours = events.map(e => {
        return moment(e.start).format('h:mm a')
    });
    console.log(bookedHours)
    const availableHours = hours.filter(hour => !bookedHours.includes(hour));
    return availableHours;
}
var currentDateSelected = '';
function onDateClick(info) {
    currentDateSelected = info.dateStr;
    // Opens the Alpine "Nueva Cita" bottom sheet (views/admin/index.hbs)
    window.dispatchEvent(new CustomEvent('open-nueva-cita', {
        detail: {
            dateStr: info.dateStr,
            conHora: info.dateStr.includes('T')
        }
    }));
}

var incomeByMonth = [];
var earningsMode = 'day';
var chartExpanded = false;

function toggleChart() {
    const panel = document.getElementById('gananciaspormes');
    const card = document.getElementById('kpiGananciasCard');
    const closeBtn = document.getElementById('closeChartBtn');
    const hideables = document.querySelectorAll('.kpi-hideable');
    const expanding = !chartExpanded;
    chartExpanded = expanding;

    if (expanding) {
        hideables.forEach(el => el.classList.add('kpi-fade-out'));
        setTimeout(() => hideables.forEach(el => el.classList.add('hidden')), 250);
        card.classList.add('col-span-2', 'sm:col-span-4');
        closeBtn.classList.remove('hidden');
        closeBtn.classList.add('flex');
        $(panel).slideDown(220, () => loadEarningsChart());
    } else {
        $(panel).slideUp(200, () => {
            card.classList.remove('col-span-2', 'sm:col-span-4');
            closeBtn.classList.add('hidden');
            closeBtn.classList.remove('flex');
            hideables.forEach(el => el.classList.remove('hidden'));
            void document.body.offsetHeight; // force reflow so the fade-in transition plays
            requestAnimationFrame(() => hideables.forEach(el => el.classList.remove('kpi-fade-out')));
        });
    }
}

var earningsRangePicker;
function setEarningsMode(mode) {
    earningsMode = mode;
    document.querySelectorAll('.earnings-filter-btn[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    document.getElementById('earningsRangeInputs').style.display = mode === 'range' ? 'grid' : 'none';
    if (mode !== 'range') loadEarningsChart();
}

function initEarningsRangePickers() {
    const opts = {
        locale: 'es',
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'd M Y',
        maxDate: 'today',
    };
    flatpickr('#earningsStart', opts);
    flatpickr('#earningsEnd', opts);
}

async function loadEarningsChart() {
    const now = moment();
    let start, end, bucket;

    if (earningsMode === 'day') {
        start = now.clone().subtract(13, 'days').startOf('day');
        end = now.clone().endOf('day');
        bucket = 'day';
    } else if (earningsMode === 'week') {
        start = now.clone().subtract(11, 'weeks').startOf('isoWeek');
        end = now.clone().endOf('isoWeek');
        bucket = 'week';
    } else if (earningsMode === 'month') {
        start = now.clone().subtract(5, 'months').startOf('month');
        end = now.clone().endOf('month');
        bucket = 'month';
    } else {
        const s = $('#earningsStart').val();
        const e = $('#earningsEnd').val();
        if (!s || !e) return;
        start = moment(s).startOf('day');
        end = moment(e).endOf('day');
        const spanDays = end.diff(start, 'days');
        bucket = spanDays > 60 ? 'month' : (spanDays > 14 ? 'week' : 'day');
    }

    const { data: events } = await axios.get(`/api/v1/event/range?start=${start.format('YYYY-MM-DD')}&end=${end.format('YYYY-MM-DD')}`);
    const pagos = events.filter(e => e.extendedProps.estado == 'PAGO');

    const bucketKey = (m) => bucket === 'day' ? m.format('YYYY-MM-DD') : bucket === 'week' ? m.format('GGGG-[W]WW') : m.format('YYYY-MM');
    const bucketLabel = (m) => bucket === 'day' ? sentenceCase(m.format('D MMM')) : bucket === 'week' ? `Sem ${m.format('WW')}` : sentecesCase(m.format('MMM YYYY'));

    const buckets = new Map();
    const cursor = start.clone();
    while (cursor.isSameOrBefore(end)) {
        const key = bucketKey(cursor);
        if (!buckets.has(key)) buckets.set(key, { label: bucketLabel(cursor), total: 0 });
        cursor.add(1, bucket);
    }
    pagos.forEach(e => {
        const key = bucketKey(moment(e.start));
        if (buckets.has(key)) buckets.get(key).total += parseInt(e.extendedProps.precio) || 0;
    });

    incomeByMonth = Array.from(buckets.values()).map(b => ({ x: b.label, y: b.total }));
    createChart();

    const realEvents = events.filter(e => e.extendedProps.numero != '88008800' && !(e.extendedProps.servicios || []).includes('Cerrado'));
    buildServiciosChart(realEvents);
    buildDiaSemanaChart(realEvents);
    buildTopClientesChart(realEvents);
}

var gananciasChart;
function createChart() {
    const ctx = document.getElementById('chartGanancias').getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 280);
    gradient.addColorStop(0, 'rgba(124, 58, 237, 0.45)');
    gradient.addColorStop(0.6, 'rgba(124, 58, 237, 0.08)');
    gradient.addColorStop(1, 'rgba(124, 58, 237, 0)');

    if (gananciasChart) gananciasChart.destroy();

    gananciasChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: incomeByMonth.map(e => e.x),
            datasets: [{
                label: 'Ganancias',
                data: incomeByMonth.map(e => e.y),
                backgroundColor: gradient,
                borderColor: '#a78bfa',
                borderWidth: 2.5,
                tension: 0.35,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: '#7c3aed',
                pointBorderColor: '#fff',
                pointBorderWidth: 1.5,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#a78bfa',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                pointHitRadius: 12,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#8b8b8b', font: { size: 11 } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: {
                        color: '#8b8b8b',
                        font: { size: 11 },
                        callback: (v) => toCRC(v)
                    }
                }
            },
            plugins: {
                title: { display: false },
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#161616',
                    borderColor: 'rgba(124,58,237,0.4)',
                    borderWidth: 1,
                    titleColor: '#fff',
                    bodyColor: '#a78bfa',
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: (ctx) => toCRC(ctx.parsed.y)
                    }
                }
            }
        }
    });
}

function baseBarOptions(tooltipLabel) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
            x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b8b8b', font: { size: 10 } } },
            y: { grid: { display: false }, ticks: { color: '#c7c7c7', font: { size: 10 } } }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: '#161616',
                borderColor: 'rgba(124,58,237,0.4)',
                borderWidth: 1,
                titleColor: '#fff',
                bodyColor: '#a78bfa',
                padding: 8,
                displayColors: false,
                callbacks: tooltipLabel ? { label: tooltipLabel } : undefined
            }
        }
    };
}

var chartServicios;
function buildServiciosChart(events) {
    const counts = new Map();
    events.forEach(e => {
        (e.extendedProps.servicios || []).forEach(s => counts.set(s, (counts.get(s) || 0) + 1));
    });
    const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);

    const ctx = document.getElementById('chartServicios').getContext('2d');
    if (chartServicios) chartServicios.destroy();
    chartServicios = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(s => s[0]),
            datasets: [{
                data: sorted.map(s => s[1]),
                backgroundColor: '#F4C82C',
                borderRadius: 4,
                barThickness: 14
            }]
        },
        options: baseBarOptions((ctx) => `${ctx.parsed.x} citas`)
    });
}

var chartDiaSemana;
function buildDiaSemanaChart(events) {
    const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const counts = [0, 0, 0, 0, 0, 0, 0];
    events.forEach(e => {
        const iso = moment(e.start).isoWeekday(); // 1 = Monday .. 7 = Sunday
        counts[iso - 1]++;
    });

    const ctx = document.getElementById('chartDiaSemana').getContext('2d');
    if (chartDiaSemana) chartDiaSemana.destroy();
    chartDiaSemana = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dayLabels,
            datasets: [{
                data: counts,
                backgroundColor: '#0d9488',
                borderRadius: 4,
                barThickness: 14
            }]
        },
        options: {
            ...baseBarOptions((ctx) => `${ctx.parsed.y} citas`),
            indexAxis: 'x',
            scales: {
                x: { grid: { display: false }, ticks: { color: '#c7c7c7', font: { size: 10 } } },
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b8b8b', font: { size: 10 } } }
            }
        }
    });
}

var chartTopClientes;
function buildTopClientesChart(events) {
    const totals = new Map(); // numero -> { name, total }
    events.filter(e => e.extendedProps.estado == 'PAGO').forEach(e => {
        const numero = e.extendedProps.numero;
        const entry = totals.get(numero) || { name: e.title, total: 0 };
        entry.total += parseInt(e.extendedProps.precio) || 0;
        totals.set(numero, entry);
    });
    const sorted = Array.from(totals.values()).sort((a, b) => b.total - a.total).slice(0, 5);

    const ctx = document.getElementById('chartTopClientes').getContext('2d');
    if (chartTopClientes) chartTopClientes.destroy();
    chartTopClientes = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(c => c.name),
            datasets: [{
                data: sorted.map(c => c.total),
                backgroundColor: '#14b73a',
                borderRadius: 4,
                barThickness: 14
            }]
        },
        options: baseBarOptions((ctx) => toCRC(ctx.parsed.x))
    });
}

function sortHours(hours) {
    const sortedHours = hours.sort((a, b) => {
        const timeA = new Date("2020-01-01 " + a).getTime();
        const timeB = new Date("2020-01-01 " + b).getTime();
        return timeA - timeB;
    });
    return sortedHours;
}
function toCRC(number) {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(number).replace(/\D00(?=\D*$)/, "");
}
function sentecesCase(str) {
    return str.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}
function sentenceCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function ifWindowResize() {
    window.addEventListener('resize', function () {
        expected_view = "timeGridWeek";
        let viewport = $(window).width();
        if (viewport < 600) {
            expected_view = 'dayGridFourWeek';
        }
        calendar.changeView(expected_view);
    });
}

function nextAppointment() {
    setInterval(() => {
        addNextAppointmentToNavbar();
    }, 60000);
    addNextAppointmentToNavbar();

}

function addNextAppointmentToNavbar() {
    const now = moment();
    const today = moment().format('YYYY-MM-DD');
    axios.get(`/api/v1/event?sort=${today}&onlyThisDay=true`).then(({ data }) => {
        // FIX: use moment() fresh to avoid moment mutation bug
        const currentAppointment = data.filter(e => moment(e.start).isSame(now, 'hour'));
        const nextAppointment = data.filter(e => moment(e.start).isSame(moment().add(30, 'minutes'), 'hour'));

        if (currentAppointment.length > 0) {
            const event = currentAppointment[0];
            const { title, start, extendedProps } = event;
            $("#currentAppointment").html(`${title} — ${moment(start).format('h:mm a')} — ${extendedProps.servicios.join(', ')}`);
        } else {
            $("#currentAppointment").html('Sin cita actual');
        }
        if (nextAppointment.length > 0) {
            const event = nextAppointment[0];
            const { title, start, extendedProps } = event;
            $("#nextAppointment").html(`${title} — ${moment(start).format('h:mm a')} — ${extendedProps.servicios.join(', ')}`);
        } else {
            $("#nextAppointment").html('No hay citas próximas');
        }

    });
}

document.addEventListener('DOMContentLoaded', init);
