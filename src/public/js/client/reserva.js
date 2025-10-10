async function init() {
    await bringServices();
    createCalendar();
}
const DAYS_MAP_ES_EN = {
    "domingo": "Sunday",
    "sábado": "Saturday",
    "viernes": "Friday",
    "jueves": "Thursday",
    "miércoles": "Wednesday",
    "martes": "Tuesday",
    "lunes": "Monday"
};
const DAYS_MAP_EN_ES = {
    "Monday": "Lunes",
    "Tuesday": "Martes",
    "Wednesday": "Miércoles",
    "Thursday": "Jueves",
    "Friday": "Viernes",
    "Saturday": "Sábado",
    "Sunday": "Domingo"
};


const AVOID_HOURS = ["13:30", "15:00", "19:30"];

const MIN_HALF = "00:00";
const MAX_HALF = "23:00";

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
}
function showHorario(e, i) {
    const HORA_FORMAT = moment(e, 'h:mm a').format('h-mm');
    const isHalfHour = e.includes('30') ? "lightskin" : "gold";
    $("#horasDisponibles").append(`
        <div class="d-inline-block animate__animated animate__zoomIn animate__fast" style="animation-delay:${i * 40}ms;" id="hora-div-${HORA_FORMAT}">
            <input type="radio" name="horaDeCitaSelect" class="btn-check" id="hora-cita-${HORA_FORMAT}" 
            onclick="changeHora('${e}')" autocomplete="off">
            <label class="btn btn-outline-${isHalfHour} mt-2" for="hora-cita-${HORA_FORMAT}">${e}</label>
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
    min: '08:00:00',
    max: '22:00:00'
};
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
                endTime: moment(hours[hours.length - 1], 'h:mm a').format('HH:mm'),
            });
            slotDays.min = moment(hours[0], 'h:mm a').format('HH:mm:00');
            slotDays.max = moment(hours[hours.length - 1], 'h:mm a').format('HH:mm:00');
        }
    });
    renderCalendar();
}
var calendar;
async function renderCalendar() {
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'es',
        initialView: 'dayGridMonth',
        aspectRatio: 1,
        height: "900px",
        nowIndicator: true,
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
        },
        validRange: {
            start: moment().format('YYYY-MM-DD'),
            end: moment().add(1, 'year').format('YYYY-MM-DD')
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
            right: 'next' // user can switch between the two
        },
        buttonText: {
            today: 'Hoy',
            week: 'Semana',
            day: 'Día',
        },
        dateClick: onDateClick,
        datesSet: dateSet,
        eventContent: eventContent,
    });
    calendar.render();
}
function eventContent(info) {
    return {
        html: ''
    };
}
async function dateSet(info) {
    const { startStr, endStr } = info;
    const start = moment(startStr).format('dddd D MMM');
    const end = moment(endStr).format('dddd D MMM');
    $("#date").html(`${start} - ${end}`);
}
async function removeHoursBookedfromthatday(arr, date) {
    const hours = [...arr];
    date.hour(0o0);
    const { data: events } = await axios.get(`/api/v1/event?sort=${date.format()}`);

    const today = moment(date).format('YYYY-MM-DD');
    const eventsToday = events.filter(e => {
        return moment(e.start).format('YYYY-MM-DD') == today;
    });

    let bookedHours = [];
    bookedHours = eventsToday.map(e => {
        return moment(e.start).format('h:mm a')
    });
    const availableHours = hours.filter(hour => !bookedHours.includes(hour));
    return availableHours;
}

var currentDateSelected = '';
async function onDateClick(info) {
    currentDateSelected = info.dateStr;

    modalAddEvent.show();

    
    const date = moment(info.dateStr);
    const day = g_horarios.get(DAYS_MAP_ES_EN[date.format('dddd')]);

    showNocturnalSchedule(date);
    
    $("#horasDisponibles").empty();
    $("#serviciosDisponibles").empty();
    
    let arr = [...day.hours];
    
    arr = additionalHalfHourSlots(arr, date, day.hours);
    
    arr = arr.filter(hour => !AVOID_HOURS.includes(moment(hour, 'h:mm a').format('HH:mm')));
    
    arr = await removeHoursBookedfromthatday(arr, date);
    if (arr.length == 0) {
        $("#horasDisponibles").append(`
            <p class="text-center text-muted">No hay horas disponibles</p>
        `);
    }

    if (date.format('dddd') == 'viernes') {
        arr = arr.filter(hour => {
            // remove 3:00pm and 3:30pm
            const hour24 = moment(hour, 'h:mm a').format('HH:mm');
            return hour24 != '15:00' && hour24 != '15:30';
        });
    }

    arr.forEach((e, i) => {
        showHorario(e, i);
    });
    
    g_servicios.forEach((e, i) => {
        showServicio(e, i);
    });

    $("#dateSelected").html(date.format('dddd DD MMMM'));
    $("#timeSelected").html(date.format('hh:mm a'));
}
function additionalHalfHourSlots(arr, date, day) {
    // If the selected date is today, and the current time is between 12:00 PM and 1:00 PM, add a 30-minute slot from now
    const now = moment();
    if (date.isSame(now, 'day')) {
        const hour = now.format('HH:mm');
        if (hour >= MIN_HALF && hour <= MAX_HALF) {
            day.forEach(e => {
                const time = moment(e, 'h:mm a');
                const timePlus30 = moment(e, 'h:mm a').add(30, 'minutes');
                if (!day.includes(timePlus30.format('h:mm a'))) {
                    arr.push(timePlus30.format('h:mm a'));
                }
            });
            arr = sortHours(arr);
        }
    }
    return arr;
}
function showNocturnalSchedule(date) {
    if (!date.isSame(moment(), 'day')) {
        $("#noctural").hide();
        return;
    }
    const now = moment();
    const hour = now.format('HH:mm');
    if (hour >= MIN_HALF && hour <= MAX_HALF) {
        console.log("It's after midnight, enabling 30 min events for today");
        $("#noctural").show();
    }
}

var g_clientSelected;
function agendarCita() {
    if (!checkCitaData()) {
        return;
    }
    const bg = window.getComputedStyle(document.body).getPropertyValue('--bs-body-bg');
    const color = window.getComputedStyle(document.body).getPropertyValue('--bs-body-color');

    const date = $("#dateSelected").html();
    const title = $("#nombreCita").val();
    const numero = $("#numeroTelefono").val();
    const servicios = [];
    let price = 0;
    g_serviciosTempCheck.forEach((value, key) => {
        servicios.push(key);
        price += parseInt(value);
    });
    const start = moment(`${date} ${horaSeleccionada}`, 'dddd DD MMMM h:mm a').format('YYYY-MM-DD HH:mm:ss');
    const data = {
        title: sentecesCase(title),
        start: start,
        end: moment(start).add(30, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
        extendedProps: {
            servicios: servicios,
            numero: numero,
            precio: price
        },
    }
    // validate data before send
    if(date == "" || title == "" || numero == "" || servicios.length == 0 || horaSeleccionada == "00:00 am"){
        Swal.fire({
            icon: 'error',
            text: 'Por favor complete todos los campos',
            background: bg,
            color: color,
        });
        return;
    }
    const { data: event } = axios.post('/api/v1/event/book', data);
    modalAddEvent.hide();
    calendar.today();
    Swal.fire({
        icon: 'success',
        title: 'Cita agendada',
        text: 'Se agendó correctamente la cita',
        showConfirmButton: false,
        timer: 2000,
        background: bg,
        color: color,
        onClose: reloadData
    });
    Swal.fire({
        title: 'Cita Agregada!',
        icon: 'success',
        html: `
        <h5>🚨Politica de citas🚨</h5>
        <p>✅ Estar 5 min antes de la hora de la cita</p>
        <p>✅ Despues de 10 min de atraso su cita queda totalmente anulada❌</p>
        <p>✅ Avisar al menos 4 horas antes que su persona no va a asistir a la cita respectiva</p>
        <p>✅ En su siguiente cita o de inmediato se cobrará
        una penalidad de $2000 colones *50% del servicio * al no avisar que no asistirá a su cita
        (siendo conciente de qué está desperdiciando el tiempo y el trabajo).</p>
        `,
        showConfirmButton: true,
        showCloseButton: true,
        confirmButtonText: "Entendido",
        confirmButtonAriaLabel: "Entendido",
        background: bg,
        color: color,
        onClose: reloadData
    });

}
function reloadData() {
    location.reload();
}
function checkCitaData() {
    const title = $("#nombreCita").val();
    const numero = $("#numeroTelefono").val();
    const bg = window.getComputedStyle(document.body).getPropertyValue('--bs-body-bg');
    const color = window.getComputedStyle(document.body).getPropertyValue('--bs-body-color');
    if (horaSeleccionada == "00:00 am") {
        Swal.fire({
            icon: 'error',
            text: 'Seleccione una hora',
            background: bg,
            color: color,
        });
        return false;
    } else if (g_serviciosTempCheck.size == 0) {
        Swal.fire({
            icon: 'error',
            text: 'Seleccione un servicio',
            background: bg,
            color: color,
        });
        return false;
    } else if (title == "") {
        Swal.fire({
            icon: 'error',
            text: 'Digite un nombre',
            background: bg,
            color: color,
        });
        return false;
    } else if (numero == "") {
        Swal.fire({
            icon: 'error',
            text: 'Digite un número de teléfono',
            background: bg,
            color: color,
        });
        return false;
    }
    return true;
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

const socket = io();

socket.on('nueva-cita', (cita) => {
    console.log('Nueva cita recibida:', cita);
    removeCitaFromDialog(cita);
});

function removeCitaFromDialog(cita){
    const date = moment(cita.start);
    const now = moment();
    if (date.isSame(now, 'day')) {
        const start = moment(cita.start).format('h-mm');
        $(`#hora-div-${start}`).remove();
        if($("#horasDisponibles").children().length == 0){
            $("#horasDisponibles").append(`
                <p class="text-center text-muted">No hay horas disponibles</p>
            `);
        }
        if(horaSeleccionada == date.format('h:mm a')){
            horaSeleccionada = "00:00 am";
            $("#timeSelected").html("00:00 am");
        }
    }
}

document.addEventListener('DOMContentLoaded', init);