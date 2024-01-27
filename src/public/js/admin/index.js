async function init(){
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
var g_special = new Map();
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

    const { data: special } = await axios.get('/api/v1/special');
    special.forEach(e => {
        g_special.set(e._id, e);
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

var eventsSpecial = [];
function createSpecialEvents(){
    eventsSpecial = [];
    g_special.forEach((e,i) => {
        const { title, start, end, props } = e;
        if(title == 'mediahora'){
            eventsSpecial.push({
                title: title,
                start: start,
                end: end,
                allDay: props.allDay,
                display: 'none',
                backgroundColor: props.backgroundColor,
                borderColor: props.borderColor,
                textColor: props.textColor,
                extendedProps: {
                    estado: props.extendedProps.estado
                },
            });
        }
    });
}

var businessHours = [];
var hiddenDays = [];

async function createCalendar(){
    g_horarios.forEach((e,i) => {
        if(!e.enable) hiddenDays.push(moment(DAYS_MAP_EN_ES[e.day], 'dddd').format('d'));
        else{
            e.hours = sortHours(e.hours);
            const day = DAYS_MAP_EN_ES[e.day];
            const hours = e.hours;
            businessHours.push({
                daysOfWeek: [moment(day, 'dddd').format('d')],
                startTime: moment(hours[0], 'h:mm a').format('HH:mm'),
                endTime: moment(hours[hours.length-1], 'h:mm a').format('HH:mm'),
            });
        }
    });
    renderCalendar();
}
var calendar;
async function renderCalendar(){
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        locale: 'es',
        initialView: 'timeGridWeek',
        aspectRatio: 1,
        height: "850px",
        nowIndicator: true,
        themeSystem: 'bootstrap',
        dayMaxEventRows: true,
        firstDay: 1,
        businessHours: businessHours,
        hiddenDays: hiddenDays,
        slotMinTime: "08:00:00",
        slotMaxTime: "22:00:00",
        dayMaxEventRows: true,
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
        slotLabelFormat:{
            hour: 'numeric',
            minute: '2-digit',
            omitZeroMinute: true,
            meridiem: 'narrow',
            hour12: true
        },
        headerToolbar: {
            left: 'prev,next',
            center: 'title',
            right: 'timeGridWeek' // user can switch between the two
        },
        dateClick: onDateClick,
        datesSet: dateSet,
        viewDidMount: viewDidMount,
    });
    calendar.render();
}
async function viewDidMount(info){
    g_special.forEach((e,i) => {
        $('.fc-daygrid-day[data-date="'+moment(e.start, "YYYY-MM-DD HH:mm").format("YYYY-MM-DD")+'"] .fc-daygrid-day-frame.fc-scrollgrid-sync-inner .fc-daygrid-day-events')
        .addClass('bg-dark text-white text-center rounded').html('<i class="fa-duotone fa-hourglass-half fa-xs"></i> Media Hora');
    });
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
    createSpecialEvents();
    calendar.addEventSource(eventsSpecial);
}
var currentDateSelected = '';
async function onDateClick(info){
    currentDateSelected = info.dateStr;
    $("#mediahoraSwitch").prop('checked', false);
    g_special.forEach((e,i) => {
        if(moment(e.start).format("YYYY-MM-DD") == moment(currentDateSelected).format("YYYY-MM-DD")){
            if(e.title == 'mediahora'){
                $("#mediahoraSwitch").prop('checked', true);
            }
        }
    });

    
    modalAddEvent.show();
    const date = moment(info.dateStr);
    const day = g_horarios.get(DAYS_MAP_ES_EN[date.format('dddd')]);

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
async function addMediaHora(){
    var remove = false;
    const bg = window.getComputedStyle(document.body).getPropertyValue('--bs-body-bg');
    const color = window.getComputedStyle(document.body).getPropertyValue('--bs-body-color');
    const bootstrapColorSwall = Swal.mixin({
        customClass: {
            confirmButton: 'btn btn-primary',
            cancelButton: 'btn btn-fore ms-2'
        },
        buttonsStyling: false
    });
    var id = "";
    g_special.forEach((e,i) => {
        if(moment(e.start).format("YYYY-MM-DD") == moment(currentDateSelected).format("YYYY-MM-DD")){
            if(e.title == 'mediahora'){
                remove = true;
                id = e._id;
            }
        }
    });
    if(remove){
        bootstrapColorSwall.fire({
            title: '30 minutos',
            text: "Desactivar las citas de media hora?",
            icon: 'warning',
            confirmButtonText: "Si",
            showCancelButton: true,
            cancelButtonText: "No, cancelar",
            background: bg,
            color: color,
        }).then((result) => {
            if (result.isConfirmed) {
                axios.delete(`/api/v1/special/${id}`);
                Swal.fire({
                    icon: 'success',
                    title: 'Media Hora Desactivada',
                    text: `Se desactivó la media hora correctamente`,
                    showConfirmButton: false,
                    timer: 1500
                });
                modalAddEvent.hide();
                location.reload();
            }else{
                $("#citaSelection").hide();
                $("#cerradoSelection").hide();
            }
        });
        return;
    }

    bootstrapColorSwall.fire({
        title: '30 minutos',
        text: "Activar las citas de media hora?",
        confirmButtonText: "Si",
        showCancelButton: true,
        cancelButtonText: "No, cancelar",
        background: bg,
        color: color,
    }).then((result) => {
        if (result.isConfirmed) {
            const datasend = {
                title: 'mediahora',
                start: moment(currentDateSelected).format(),
                end: moment(currentDateSelected).format(),
                props:{
                    allDay: true,
                    backgroundColor: '#ffffff',
                    borderColor: '#ffffff',
                    textColor: '#000000',
                    extendedProps: {
                        estado: 'MEDIAHORA'
                    },
                }
            }
            const {data} = axios.post('/api/v1/special', datasend);
            Swal.fire({
                icon: 'success',
                title: 'Media Hora Activada',
                text: `Se activó la media hora correctamente`,
                showConfirmButton: false,
                timer: 1500
            });
            modalAddEvent.hide();
            location.reload();
        }else{
            $("#citaSelection").hide();
            $("#cerradoSelection").hide();
        }
        
    });
}
async function typeselection(ele){
    const val = ele.value;
    if(val == 'cita'){
        $("#citaSelection").show();
        $("#cerradoSelection").hide();
    }else if(val == 'cerrado'){
        $("#cerradoSelection").show();
        $("#citaSelection").hide();
    }else{
        $("#citaSelection").hide();
        $("#cerradoSelection").hide();
    
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

function sortHours(hours) {
    const sortedHours = hours.sort((a, b) => {
        const timeA = new Date("2020-01-01 " + a).getTime();
        const timeB = new Date("2020-01-01 " + b).getTime();
        return timeA - timeB;
    });
    return sortedHours;
}

document.addEventListener('DOMContentLoaded', init);