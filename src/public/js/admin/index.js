function init(){
    createCalendar();
    bringServices();
}
const DAYS_MAP = {
    "domingo": "Sunday",
    "sábado": "Saturday",
    "viernes": "Friday",
    "jueves": "Thursday",
    "miércoles": "Wednesday",
    "martes": "Tuesday",
    "lunes": "Monday"
}
var g_servicios = new Map();
var g_horarios = new Map();
async function bringServices(){
    const { data } = await axios.get('/api/v1/services');
    g_servicios.clear();
    data.forEach((e,i) => {
        g_servicios.set(e._id, e);
    });

    const { data: horarios } = await axios.get('/api/v1/horario');
    g_horarios.clear();
    horarios.forEach(e => {
        g_horarios.set(e.day, e);
    });
}

function showHorario(e,i){
    const HORA_FORMAT = moment(e, 'h:mm a').format('h-mm');
    $("#horasDisponibles").append(`
        <div class="d-inline-block animate__animated animate__zoomIn animate__fast" style="animation-delay:${i*40}ms;">
            <input type="radio" name="horaDeCitaSelect" class="btn-check" id="hora-cita-${HORA_FORMAT}" 
            onclick="changeHora('${e}')" autocomplete="off">
            <label class="btn btn-outline-gold mt-2" for="hora-cita-${HORA_FORMAT}">${e}</label>
        </div>
    `);
}
function showServicio(e,i){
    $("#serviciosDisponibles").append(`
        <div class="animate__animated animate__zoomIn animate__fast" style="animation-delay:${i*40}ms;">
            <input type="checkbox" class="btn-check" id="service-checkbox-${e.name}" data-precio="${e.price}" 
            onclick="addServicioToArray('${e.name}','${e.price}')" autocomplete="off">
            <label class="btn btn-outline-info" id="service-checkbox-label-${e.name}" for="service-checkbox-${e.name}">${e.name}</label>
        </div>
    `);
}
var g_serviciosTempCheck = new Map();
function addServicioToArray(servicio, precio){
    if(!g_serviciosTempCheck.has(servicio)){
        g_serviciosTempCheck.set(servicio, parseInt(precio));
    }else{
        g_serviciosTempCheck.delete(servicio);
    }
    let total = 0;
    let combo = 0;
    g_serviciosTempCheck.forEach((value, key)=>{
        total += value;
    });
    if(g_serviciosTempCheck.has('Corte') && g_serviciosTempCheck.has('Barba')){
        total -= 1000;
    }
    if(g_serviciosTempCheck.has('Cejas')){
        if(g_serviciosTempCheck.size > 1){
            total -= 1000;
        }
    }
    $('#precioFinalModal').html(`${total}`);
}

const modalAddEvent = new bootstrap.Modal(document.getElementById('addEvent'), {
    keyboard: false
});

async function createCalendar(){
    const { data } = await axios.get('/api/v1/event');

    const calendarEl = document.getElementById('calendar');
    const calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'es',
        initialView: 'timeGridWeek',
        aspectRatio:1,
        height: "80vh",
        nowIndicator: true,
        themeSystem: 'bootstrap',
        dayMaxEventRows: true,
        firstDay: 1,
        views: {
            dayGrid: {
                titleFormat: { month: 'long' },
                dayMaxEventRows: 0
            },
            timeGrid: {
                titleFormat: { month: 'long' },
                dayMaxEventRows: 0,
                dayHeaderFormat: { weekday: 'long' }
            }
        },
        headerToolbar: {
            left: 'prev,next',
            center: 'title',
            right: 'timeGridWeek,timeGridDay' // user can switch between the two
        },
        events: data,
        dateClick: onDateClick
    });
    calendar.render();
}

async function onDateClick(info){

    modalAddEvent.show();
    const date = moment(info.dateStr);
    const day = g_horarios.get(DAYS_MAP[date.format('dddd')]);

    $("#horasDisponibles").empty();
    $("#serviciosDisponibles").empty();
    day.hours.forEach((e,i) => {
        showHorario(e,i);
    });
    g_servicios.forEach((e,i) => {
        showServicio(e,i);
    });

    $("#dateSelected").html(date.format('dddd DD MMMM'));
    $("#timeSelected").html(date.format('hh:mm a'));

}

async function typeselection(ele){
    const val = ele.value;
    if(val == 'cita'){
        $("#citaSelection").show();
        $("#cerradoSelection").hide();
    }else if(val == 'cerrado'){
        $("#cerradoSelection").show();
        $("#citaSelection").hide();
    }
}

function agendarCita(){
    const date = $("#dateSelected").html();
    const title = $("#nombreCita").val();
    const numero = $("#numeroTelefono").val();
    const servicios = [];
    g_serviciosTempCheck.forEach((value, key)=>{
        servicios.push(key);
    });
    const start = moment(`${date} ${horaSeleccionada}`, 'dddd DD MMMM h:mm a').format('YYYY-MM-DD HH:mm:ss');
    const data = {
        title: title,
        start: start,
        end: moment(start).add(1, 'hours').format('YYYY-MM-DD HH:mm:ss'),
        allDay: false,
        display: 'auto',
        backgroundColor: '#ffffff',
        borderColor: '#ffffff',
        textColor: '#000000',
        extendedProps: {
            servicios: servicios,
            numero: numero,
            estado: 'PENDIENTE'
        },
    }
    const { data: event } = axios.post('/api/v1/event', data);
    modalAddEvent.hide();
    // Swal.fire({
    //     icon: 'success',
    //     title: 'Cita agendada',
    //     text: 'Se agendó correctamente la cita',
    //     showConfirmButton: false,
    //     timer: 1500
    // });
    location.reload();
}
var horaSeleccionada = "00:00 am";
function changeHora(hora){
    $("#timeSelected").html(hora);
    horaSeleccionada = hora;
}

document.addEventListener('DOMContentLoaded', init);