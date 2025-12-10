async function init() {
    await bringServices();
    createCalendar();
    insightsThisWeek();
    // ifWindowResize();
    nextAppointment();
    createDataforChart();
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
var g_horarios = new Map();
async function bringServices() {
    const { data } = await axios.get('/api/v1/services');
    g_servicios.clear();
    data.forEach((e, i) => {
        g_servicios.set(e._id, e);
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
var g_clientSelected;
var g_clients = new Map();
var clientSelectize;
function fillClients(data) {
    data.forEach(e => {
        g_clients.set(parseInt(e.numero), e);
    })
    clientSelectize = $("#clientsSelectize").selectize({
        valueField: 'numero',
        labelField: 'nombre',
        searchField: 'nombre',
        options: data,
        create: false,
        render: {
            option: function (item, escape) {
                return `
                <div class="bg-dark py-1 px-3 text-white rounded">
                    <span class="title">
                        <span class="name" id="nombreSelected">${escape(item.nombre)}</span>
                    </span>
                </div>`;
            },
            item: function (item, escape) {
                return `
                <div class="bg-secondary px-1 rounded-3"> 
                    <span class="name">${escape(item.nombre)}</span>
                </div>`;
            }
        },
        onChange: function (value, arg) {
            $("#numeroTelefono").html(value);
            g_clientSelected = g_clients.get(parseInt(value));
        }
    });
}
async function addHalfHourtoMap() {
    g_horarios.forEach((e) => {
        let hours = e.hours;
        const length = hours.length;
        for (let i = 0; i < (length - 1); i++) {
            const h = hours[i];
            const half = moment(h, 'h:mm a').add(30, 'minutes').format('h:mm a');
            e.hours.push(half);
        }
    });
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
function showHorario(e, i) {
    const HORA_FORMAT = moment(e, 'h:mm a').format('h-mm');
    $("#horasDisponibles").append(`
        <div class="d-inline-block animate__animated animate__zoomIn animate__fast" style="animation-delay:${i * 40}ms;">
            <input type="radio" name="horaDeCitaSelect" class="btn-check" id="hora-cita-${HORA_FORMAT}" 
            onclick="changeHora('${e}')" autocomplete="off">
            <label class="btn btn-outline-gold mt-2" for="hora-cita-${HORA_FORMAT}">${e}</label>
        </div>
    `);
}
function showServicio(e, i) {
    $("#serviciosDisponibles").append(`
        <div class="animate__animated animate__zoomIn animate__fast" style="animation-delay:${i * 40}ms;">
            <input type="checkbox" class="btn-check" id="service-checkbox-${e.name}" data-precio="${e.price}" 
            onclick="addServicioToArray('${e.name}','${e.price}')" autocomplete="off">
            <label class="btn btn-outline-info" id="service-checkbox-label-${e.name}" for="service-checkbox-${e.name}">${e.name}</label>
        </div>
    `);
}
var g_serviciosTempCheck = new Map();
function addServicioToArray(servicio, precio) {
    if (!g_serviciosTempCheck.has(servicio)) {
        g_serviciosTempCheck.set(servicio, parseInt(precio));
    } else {
        g_serviciosTempCheck.delete(servicio);
    }
    let total = 0;
    let combo = 0;
    g_serviciosTempCheck.forEach((value, key) => {
        total += value;
    });
    if (g_serviciosTempCheck.has('Corte') && g_serviciosTempCheck.has('Barba')) {
        total -= 1000;
    }
    if (g_serviciosTempCheck.has('Cejas')) {
        if (g_serviciosTempCheck.size > 1) {
            total -= 1000;
        }
    }
    $('#precioFinalModal').html(`${total}`);
}
const modalAddEvent = new bootstrap.Modal(document.getElementById('addEvent'), {
    keyboard: false
});
var businessHours = [];
var hiddenDays = [];
var slotDays = {
    min: '09:00:00',
    max: '20:00:00'
};
var expected_view = 'timeGridWeek';
async function createCalendar() {
    g_horarios.forEach((e, i) => {
        if (!e.enable) hiddenDays.push(parseInt(moment(DAYS_MAP_EN_ES[e.day], 'dddd').format('d')));
        else {
            e.hours = sortHours(e.hours);
            const day = DAYS_MAP_EN_ES[e.day];
            const hours = e.hours;
            businessHours.push({
                daysOfWeek: [parseInt(moment(day, 'dddd').format('d'))],
                startTime: moment(hours[0], 'h:mm a').format('HH:mm'),
                endTime: moment(hours[hours.length - 1], 'h:mm a').add(1, 'hour').format('HH:mm'),
            });
            // slotDays.min = moment(hours[0], 'h:mm a').format('HH:mm:00');
            // slotDays.max = moment(hours[hours.length - 1], 'h:mm a').add(1, 'hour').format('HH:mm:00');
        }
    });
    let viewport = $(window).width();
    if (viewport < 600) {
        expected_view = 'dayGridFourWeek';
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
        dayMaxEventRows: true,
        expandRows: true,
        themeSystem: 'bootstrap',
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
        slotLabelFormat: {
            hour: 'numeric',
            minute: '2-digit',
            omitZeroMinute: true,
            meridiem: 'short',
            hour12: true
        },
        headerToolbar: {
            left: 'prev',
            center: 'title',
            right: 'next'
        },
        buttonText: {
            today: 'Hoy',
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
function eventDidMount(info) {

}
function eventContent(info) {
    const { event, view } = info;
    const { title, start } = event;
    const hora = moment(start).format('h:mm a');
    if (view.type == 'timeGridWeek') {
        return {
            html: `
            <div class="d-flex justify-content-start align-items-center px-1 animate__animated animate__fadeIn">
                <p class="mb-0 text-white me-2"><i class="fa-solid fa-cut"></i></p>
                <div class="text-white">
                    <p class="small m-0 fw-bold">${title}</p>
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
                    <p class="small m-0 fw-bold">${title}</p>
                    <p class="small m-0"><span class="text-lowercase">${hora}</span></p>
                </div>
            </div>`
        }
    }
    return true;
}
async function eventClick(info) {
    const { title, start, end, extendedProps } = info.event;
    const ev = extendedProps;

    const fecha = moment(start, 'YYYY-MM-DD HH:mm').format('dddd D MMMM');
    const hora = moment(start, 'YYYY-MM-DD HH:mm').format('h:mm a')

    const bg = window.getComputedStyle(document.body).getPropertyValue('--bs-body-bg');
    const color = window.getComputedStyle(document.body).getPropertyValue('--bs-body-color');
    const swalWithBootstrapButtons = Swal.mixin({
        customClass: {
            confirmButton: 'btn btn-success text-white me-2',
            denyButton: 'btn btn-danger text-white me-2',
            cancelButton: 'btn btn-light text-dark',
        },
        buttonsStyling: false
    })
    swalWithBootstrapButtons.fire({
        html: `
            <div>
                <h1 class="text-capitalize fw-bold">${title}</h1>
                <div class="d-flex justify-content-center align-items-center my-4">
                    ${ev.servicios.map((e, i) => {
            return `<span class="badge bg-gold me-1">${e}</span>`
        }).join('')}
                </div>
                <h4 class="text-primary fw-bold">${toCRC(ev.precio)} colones</h4>
                <hr>
                <p class="mb-1">
                    📞 Telefono: 
                    <span class="fw-bold">
                        <a href="tel:+506${ev.numero}">${ev.numero}</a>
                    </span>
                    <a 
                        href="https://wa.me/+506${ev.numero}?text=Hola%20${title},%20le%20contactamos%20de%20HighQuality%20por%20su%20cita%20el%20${encodeURIComponent(fecha)}%20a%20las%20${encodeURIComponent(hora)}."
                        target="_blank"
                        class="ms-2 btn btn-success btn-sm"
                        title="Enviar WhatsApp"
                    >
                        <i class="fab fa-whatsapp"></i>
                    </a>
                </p>
                <hr>
                <small class="mb-1 d-block">
                    <span class="text-capitalize">${fecha}</span> - <span class="fw-bold">${hora}</span>
                </small>
                <hr>
                <div class="d-grid gap-2 col-6 mx-auto">
                    <button type="button" class="btn btn-outline-danger btn-sm mt-2" 
                    onclick="deleteEvent('${ev._id}')"><i class="fas fa-calendar-times pe-1"></i> Eliminar Cita</button>
                </div>
            </div>
        `,
        showDenyButton: true,
        showCancelButton: true,
        confirmButtonText: 'Pago',
        cancelButtonText: 'Cerrar',
        denyButtonText: 'Pendiente de Pago',
        background: bg,
        color: color,
        showClass: {
            popup: `
                animate__animated
                animate__fadeInDown
                animate__faster
                `
        },
        hideClass: {
            popup: `
                animate__animated
                animate__fadeOutUp
                animate__faster`
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            swalWithBootstrapButtons.fire({
                title: 'Pago',
                html: `
                    <p>¿Monto?</p>
                `,
                input: 'text',
                inputValue: ev.precio,
                inputAttributes: {
                    autocapitalize: 'off'
                },
                showCancelButton: true,
                confirmButtonText: 'Pagar',
                background: bg,
                color: color,
                preConfirm: async (input) => {
                    if (typeof input != 'number' && isNaN(parseInt(input))) {
                        return Swal.showValidationMessage('Ingrese un monto valido')
                    }
                    else if (input == '') {
                        return Swal.showValidationMessage('Ingrese un monto')
                    } else {
                        const { data } = await axios.put(`/api/v1/event/${ev._id}/pagar`, {
                            monto: input
                        });
                        const Toast = Swal.mixin({
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 1000,
                            timerProgressBar: true,
                            background: bg,
                            color: color,
                        })
                        Toast.fire({
                            icon: 'success',
                            title: 'Pagado'
                        });
                        calendar.today();
                    }
                }
            });
        } else if (result.isDenied) {
            const { data } = await axios.put(`/api/v1/event/${ev._id}/pagar`, {
                monto: 0
            });
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1000,
                timerProgressBar: true,
                background: bg,
                color: color,
            })
            Toast.fire({
                icon: 'warning',
                title: 'Por Pagar'
            })
            calendar.today();
        }
    })
}
async function deleteEvent(id) {
    const bg = window.getComputedStyle(document.body).getPropertyValue('--bs-body-bg');
    const color = window.getComputedStyle(document.body).getPropertyValue('--bs-body-color');
    const { data } = await axios.delete(`/api/v1/event/${id}`);
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1000,
        timerProgressBar: true,
        background: bg,
        color: color,
    });
    Toast.fire({
        icon: 'success',
        title: 'Eliminado'
    });
    calendar.today();
}
async function dateSet(info) {
    const { startStr, endStr } = info;
    const start = moment(startStr).format('dddd D MMM');
    const end = moment(endStr).format('dddd D MMM');
    $("#date").html(`${start} - ${end}`);

    const sort = moment(startStr).startOf('isoWeek').format()
    const { data } = await axios.get(`/api/v1/event?sort=${sort}`);
    calendar.removeAllEventSources();
    calendar.addEventSource(data);
}
async function analytics(data) {
    const today = moment().format('YYYY-MM-DD');
    const events = data.filter(e => moment(e.start).format('YYYY-MM-DD') == today);
    const total = events.length;

    $("#countCitas").html(total);

    let monto = 0;
    const pagadas = events.filter(e => e.extendedProps.estado == 'PAGO');
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
async function onDateClick(info) {
    currentDateSelected = info.dateStr;

    modalAddEvent.show();
    const date = moment(info.dateStr);
    const day = g_horarios.get(DAYS_MAP_ES_EN[date.format('dddd')]);

    $("#horasDisponibles").empty();
    $("#serviciosDisponibles").empty();

    const arr = await removeHoursBookedfromthatday(day.hours, date);
    console.log(arr)
    arr.forEach((e, i) => {
        showHorario(e, i);
    });
    g_servicios.forEach((e, i) => {
        showServicio(e, i);
    });

    $("#dateSelected").html(date.format('dddd DD MMMM'));
    $("#timeSelected").html(date.format('hh:mm a'));

}
async function typeselection(ele) {
    const val = ele.value;
    if (val == 'cita') {
        $("#citaSelection").show();
        $("#cerradoSelection").hide();
        $("#agendarCitaButton").show();
        $("#salvarCerrado").hide();
    } else if (val == 'cerrado') {
        $("#cerradoSelection").show();
        $("#citaSelection").hide();
        $("#agendarCitaButton").hide();
        $("#salvarCerrado").show();
    } else {
        $("#citaSelection").hide();
        $("#cerradoSelection").hide();
        $("#agendarCitaButton").hide();
        $("#salvarCerrado").hide();
    }
}
async function addNewClientToList() {
    const bg = window.getComputedStyle(document.body).getPropertyValue('--bs-body-bg');
    const color = window.getComputedStyle(document.body).getPropertyValue('--bs-body-color');
    const swalWithBootstrapButtons = Swal.mixin({
        customClass: {
            confirmButton: 'btn btn-success text-white me-2',
            cancelButton: 'btn btn-light text-dark',
        },
        buttonsStyling: false
    });
    const { value: formValues } = await swalWithBootstrapButtons.fire({
        title: 'Agregar Cliente',
        html: `
            <input id="nombreCliente" class="form-control form-control-lg mb-2" placeholder="Nombre">
            <input id="numeroCliente" class="form-control form-control-lg" placeholder="Número de Teléfono">`,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar',
        background: bg,
        color: color,
        preConfirm: async () => {
            const numero = parseInt(document.getElementById('numeroCliente').value);
            const nombre = sentecesCase(document.getElementById('nombreCliente').value);
            const { data: client } = await axios.post('/api/v1/client', { numero, nombre });
            g_clients.set(client.numero, client);
            return client;
        }
    });
    const selectize = clientSelectize[0].selectize;
    selectize.addOption(formValues);
    selectize.refreshOptions();
}
async function agendarCita() {
    if (!checkCitaData()) {
        return;
    }
    const date = $("#dateSelected").html();
    const title = $("#nombreSelected").html();
    const numero = $("#clientsSelectize").val();
    const servicios = [];
    let price = 0;
    g_serviciosTempCheck.forEach((value, key) => {
        servicios.push(key);
        price += parseInt(value);
    });
    console.log("DATE", date, horaSeleccionada);
    const start = moment(`${date} ${horaSeleccionada}`, 'dddd DD MMMM h:mm a').format(); //'YYYY-MM-DD HH:mm:ss'
    console.log("start", start);

    const data = {
        title: sentecesCase(title),
        start: start,
        end: moment(start).add(30, 'minutes').format(),
        allDay: false,
        display: 'auto',
        backgroundColor: '#191919',
        borderColor: '#595959',
        textColor: '#ffffff',
        extendedProps: {
            servicios: servicios,
            numero: numero,
            estado: 'PENDIENTE',
            precio: price
        },
    }
    const { data: event } = await axios.post('/api/v1/event', data);
    modalAddEvent.hide();
    calendar.today();
    reloadData();
}
function reloadData() {
    g_serviciosTempCheck.clear();
    g_clientSelected = undefined;
    horaSeleccionada = "00:00 am";
    $("#clientsSelectize").val('');
}
function checkCitaData() {
    const bg = window.getComputedStyle(document.body).getPropertyValue('--bs-body-bg');
    const color = window.getComputedStyle(document.body).getPropertyValue('--bs-body-color');
    if (horaSeleccionada == "00:00 am") {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Seleccione una hora',
            background: bg,
            color: color,
        });
        return false;
    } else if (g_serviciosTempCheck.size == 0) {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Seleccione un servicio',
            background: bg,
            color: color,
        });
        return false;
    } else if (g_clientSelected == undefined) {
        Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Seleccione un cliente',
            background: bg,
            color: color,
        });
        return false;
    }
    return true;
}
function cerrarDia() {
    const allday = $("#allDayClosed").is(':checked');

    const date = $("#dateSelected").html();
    const servicios = ['Cerrado'];

    const day = moment(date, 'dddd DD MMMM').format('dddd');
    const hours = g_horarios.get(DAYS_MAP_ES_EN[day]).hours;
    if (allday) {
        hours.forEach((e, i) => {
            const start = moment(`${date} ${e}`, 'dddd DD MMMM h:mm a').format('YYYY-MM-DD HH:mm:ss');
            const data = {
                title: "Cerrado",
                start: start,
                end: moment(start).add(30, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
                allDay: false,
                display: 'auto',
                backgroundColor: '#142946',
                borderColor: '#046af3',
                textColor: '#ffffff',
                extendedProps: {
                    servicios: servicios,
                    numero: '88008800',
                    estado: 'PENDIENTE',
                    precio: 0
                },
            }
            const { data: event } = axios.post('/api/v1/event', data);
        });
    } else {
        const startTime = moment(`${date} ${$("#closedHoursStart").val()}`, 'dddd DD MMMM HH:mm').format('YYYY-MM-DD HH:00:00');
        const endTime = moment(`${date} ${$("#closedHoursEnd").val()}`, 'dddd DD MMMM HH:mm').format('YYYY-MM-DD HH:00:00');

        const s = moment(startTime);
        const e = moment(endTime);
        const hoursArray = [];

        let currentHour = moment(s).startOf('hour'); // Round down to the start of the hour

        hoursArray.push(currentHour.format('hh:mm a'));
        for (let i = 0; currentHour.isBefore(e); i++) {
            currentHour.add(1, 'hour');
            hoursArray.push(currentHour.format('hh:mm a'));
        }
        hoursArray.forEach((e, i) => {
            const start = moment(`${date} ${e}`, 'dddd DD MMMM h:mm a').format('YYYY-MM-DD HH:mm:ss');
            const data = {
                title: "Cerrado",
                start: start,
                end: moment(start).add(30, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
                allDay: false,
                display: 'auto',
                backgroundColor: '#142946',
                borderColor: '#046af3',
                textColor: '#ffffff',
                extendedProps: {
                    servicios: servicios,
                    numero: '88008800',
                    estado: 'PENDIENTE',
                    precio: 0
                },
            }
            const { data: event } = axios.post('/api/v1/event', data);
        });
    }
    modalAddEvent.hide();
    calendar.today();
}
var incomeByMonth = [];
async function createDataforChart() {
    const months = [
        moment().format('YYYY-MM'),
        moment().subtract(1, 'month').format('YYYY-MM'),
        moment().subtract(2, 'month').format('YYYY-MM'),
        moment().subtract(3, 'month').format('YYYY-MM'),
    ];
    for (let i = 0; i < months.length; i++) {
        const month = months[i];
        const { data: eventsMonth } = await axios.get('/api/v1/event/month?month=' + month);
        const pagos = eventsMonth.filter(e => e.extendedProps.estado == 'PAGO');
        const totalByMonth = pagos.map(e => parseInt(e.extendedProps.precio)).reduce((acc, e) => acc + e, 0);
        incomeByMonth.push({
            x: sentecesCase(moment(month, 'YYYY-MM').format('MMMM YYYY')),
            y: totalByMonth
        });
    }
    incomeByMonth = incomeByMonth.reverse();
    createChart();
}

var gananciasChart;
function createChart() {
    const ctx = document.getElementById('chartGanancias').getContext('2d');
    var gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(248, 39, 46, 1)');
    gradient.addColorStop(0.5, 'rgba(248, 39, 46, 0.25)');
    gradient.addColorStop(1, 'rgba(248, 39, 46, 0)');

    gananciasChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: incomeByMonth.map(e => e.x),
            datasets: [{
                label: 'Ganancias',
                data: incomeByMonth.map(e => e.y),
                backgroundColor: gradient,
                borderColor: 'rgba(248, 39, 46, 1)',
                borderWidth: 1,
                tension: 0.4,
                pointRadius: 10,
                fill: true,
                pointBackgroundColor: 'rgba(248, 39, 46, 0.5)',
                pointBorderColor: 'rgba(248, 39, 46, 1)',
                pointHoverRadius: 10,
                pointHoverBackgroundColor: 'rgba(248, 39, 46, 0.5)',
                pointHoverBorderColor: 'rgba(248, 39, 46, 1)',
                pointHoverBorderWidth: 2,
                pointHitRadius: 10,
                pointBorderWidth: 2


            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: false,
                }
            }
        }
    });
}
function toggleChart() {
    $('#gananciaspormes').slideToggle();
}
var horaSeleccionada = "00:00 am";
function changeHora(hora) {
    $("#timeSelected").html(hora);
    horaSeleccionada = hora;
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
        const currentAppointment = data.filter(e => moment(e.start).isSame(now, 'hour'));
        const nextAppointment = data.filter(e => moment(e.start).isSame(now.add(30, 'minutes'), 'hour'));
        console.log("Current Appointment", currentAppointment);
        console.log("Next Appointment", nextAppointment);

        if (currentAppointment.length > 0) {
            const event = currentAppointment[0];
            const { title, start, extendedProps } = event;
            $("#currentAppointment").html(`${title} - ${moment(start).format('h:mm a')} - ${extendedProps.servicios.join(', ')}`);
        }
        if (nextAppointment.length > 0) {
            console.log("Next Appointment", nextAppointment);
            const event = nextAppointment[0];
            const { title, start, extendedProps } = event;
            $("#nextAppointment").html(`${title} - ${moment(start).format('h:mm a')} - ${extendedProps.servicios.join(', ')}`);
        }
        
    });
}

document.addEventListener('DOMContentLoaded', init);