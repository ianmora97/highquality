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
    await addHalfHourtoMap();

    const { data: special } = await axios.get('/api/v1/special');
    special.forEach(e => {
        g_special.set(e._id, e);
    });

    const { data: clients } = await axios.get('/api/v1/client');
    fillClients(clients);
}
function fillClients(data){
    $("#clientsSelectize").selectize({
        valueField: 'numero',
        labelField: 'nombre',
        searchField: 'nombre',
        options: data,
        create: true,
        render: {
            option: function(item, escape) {
                return `
                <div class="bg-dark py-1 px-3 text-white rounded">
                    <span class="title">
                        <span class="name" id="nombreSelected">${escape(item.nombre)}</span>
                    </span>
                </div>`;
            },
            item: function(item, escape){
                return `
                <div class="bg-secondary px-1 rounded-3"> 
                    <span class="name">${escape(item.nombre)}</span>
                </div>`;
            }
        },
        onChange: function(value, arg){
            $("#numeroTelefono").html(value);
        }
    });
}
async function addHalfHourtoMap(){
    g_horarios.forEach((e,i) => {
        e.hours.forEach((h,j) => {
            const half = moment(h, 'h:mm a').add(30, 'minutes').format('h:mm a');
            e.hours.push(half);
        });
    });
}
function addHalfHour(arr){
    const array = [];
    for(let i =0; i < arr.length; i++){
        let h = arr[i];
        array.push(h);
        let half = moment(h, 'h:mm a').add(30, 'minutes').format('h:mm a');
        array.push(half);
    }
    return [...new Set(array)];
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
var slotDays = {
    min: '08:00:00',
    max: '22:00:00'
};

async function createCalendar(){
    g_horarios.forEach((e,i) => {
        if(!e.enable) hiddenDays.push(parseInt(moment(DAYS_MAP_EN_ES[e.day], 'dddd').format('d')));
        else{
            e.hours = sortHours(e.hours);
            const day = DAYS_MAP_EN_ES[e.day];
            const hours = e.hours;
            businessHours.push({
                daysOfWeek: [parseInt(moment(day, 'dddd').format('d'))],
                startTime: moment(hours[0], 'h:mm a').format('HH:mm'),
                endTime: moment(hours[hours.length-1], 'h:mm a').format('HH:mm'),
            });
            slotDays.min = moment(hours[0], 'h:mm a').format('HH:mm:00');
            slotDays.max = moment(hours[hours.length-1], 'h:mm a').format('HH:mm:00');
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
            }
        },
        eventTimeFormat:{
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        },
        slotLabelFormat:{
            hour: 'numeric',
            minute: '2-digit',
            omitZeroMinute: true,
            meridiem: 'short',
            hour12: true
        },
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'timeGridWeek dayGridDay' // user can switch between the two
        },
        buttonText: {
            today: 'Hoy',
            week: 'Semana',
            day: 'Día',
        },
        dateClick: onDateClick,
        datesSet: dateSet,
        eventClick: eventClick,
        eventContent: eventContent,
        eventDidMount: eventDidMount
    });
    calendar.render();
}
function eventDidMount(info){
    
}
function eventContent(info){
    const { event, view } = info;
    const { title, start} = event;
    const hora = moment(start).format('h:mm a');
    if(view.type == 'timeGridWeek'){
        return {
            html: `
            <div class="d-flex justify-content-start align-items-center px-2 animate__animated animate__fadeIn">
                <p class="mb-0 text-white me-2"><i class="fa-solid fa-cut"></i></p>
                <div class="text-white">
                    <p class="small m-0 fw-bold">${title}</p>
                    <p class="small m-0"><span class="text-lowercase">${hora}</span></p>
                </div>
            </div>`
        }
    }else if(view.type == 'dayGridMonth'){
        return {
            html:`
            <span class="p-2">
                <i class="fas fa-cut text-white"></i> ${title}
                <p class="text-white px-2 m-0">Hora: ${hora}</p>
            </span>`
        } 
    }
    return true;
}
async function eventClick(info){
    const { title, start, end, extendedProps  } = info.event;
    const ev = extendedProps;

    const fecha = moment(start,'YYYY-MM-DD HH:mm').format('dddd D MMMM');
    const hora = moment(start,'YYYY-MM-DD HH:mm').format('h:mm a')

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
                    ${ev.servicios.map((e,i) => {
                        return `<span class="badge bg-gold me-1">${e}</span>`
                    }).join('')}
                </div>
                <h4 class="text-primary fw-bold">${toCRC(ev.precio)} colones</h4>
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
                    if(input == ''){
                        return Swal.showValidationMessage('Ingrese un monto')
                    }else{
                        const {data} = await axios.put(`/api/v1/event/${ev._id}/pagar`,{
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

                        socket.emit('estado:update',{
                            id_reserva: ev.id_reserva,
                            estado: 1
                        })
                    }
                }
            });
        }else if(result.isDenied){
            const {data} = await axios.put(`/api/v1/event/${ev._id}/pagar`,{
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
            socket.emit('estado:update',{
                id_reserva: ev.id_reserva,
                estado: 2
            })
        }
    })
}
async function deleteEvent(id){
    const bg = window.getComputedStyle(document.body).getPropertyValue('--bs-body-bg');
    const color = window.getComputedStyle(document.body).getPropertyValue('--bs-body-color');
    const {data} = await axios.delete(`/api/v1/event/${id}`);
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
    analytics(data);
    calendar.removeAllEventSources();
    calendar.addEventSource(data);
    createSpecialEvents();
    calendar.addEventSource(eventsSpecial);
}
function analytics(data){
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
        innerHTML: [0,total],
        easing: 'linear',
        round: 1,
        duration: 500
    });

    anime({
        targets: '#countGanancias',
        innerHTML: [0,monto],
        easing: 'linear',
        round: 1,
        duration: 500,
        complete: function(anim) {
            $('#countGanancias').html(toCRC(monto));
        }
    });

}
async function removeHoursBookedfromthatday(arr, date){
    const hours = [...arr];
    date.hour(0o0);
    const { data: events } = await axios.get(`/api/v1/event?sort=${date.format()}`);
    let bookedHours = [];
    bookedHours = events.map(e => {
        return moment(e.start).format('h:mm a')
    });
    const availableHours = hours.filter(hour => !bookedHours.includes(hour));
    return availableHours;
}
var currentDateSelected = '';
async function onDateClick(info){
    currentDateSelected = info.dateStr;
    
    modalAddEvent.show();
    const date = moment(info.dateStr);
    const day = g_horarios.get(DAYS_MAP_ES_EN[date.format('dddd')]);

    $("#horasDisponibles").empty();
    $("#serviciosDisponibles").empty();
    const createHalf = addHalfHour(day.hours);
    const arr = await removeHoursBookedfromthatday(createHalf, date);
    arr.forEach((e,i) => {
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
        $("#agendarCitaButton").show();
        $("#salvarCerrado").hide();
    }else if(val == 'cerrado'){
        $("#cerradoSelection").show();
        $("#citaSelection").hide();
        $("#agendarCitaButton").hide();
        $("#salvarCerrado").show();
    }else{
        $("#citaSelection").hide();
        $("#cerradoSelection").hide();
        $("#agendarCitaButton").hide();
        $("#salvarCerrado").hide();
    }
}
function agendarCita(){
    const date = $("#dateSelected").html();
    const title = $("#nombreSelected").html();
    const numero = $("#clientsSelectize").val();
    const servicios = [];
    let price = 0;
    g_serviciosTempCheck.forEach((value, key)=>{
        servicios.push(key);
        price += parseInt(value);
    });
    const start = moment(`${date} ${horaSeleccionada}`, 'dddd DD MMMM h:mm a').format('YYYY-MM-DD HH:mm:ss');
    const data = {
        title: sentecesCase(title),
        start: start,
        end: moment(start).add(30, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
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
    const { data: event } = axios.post('/api/v1/event', data);
    modalAddEvent.hide();
    calendar.today();   
}
function cerrarDia(){
    const date = $("#dateSelected").html();
    const servicios = ['Cerrado'];
    
    const day = moment(date, 'dddd DD MMMM').format('dddd');
    const hours = g_horarios.get(DAYS_MAP_ES_EN[day]).hours;
    hours.forEach((e,i) => {
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
                precio: '0'
            },
        }
        const { data: event } = axios.post('/api/v1/event', data);
    });
    // const start = moment(`${date} ${horaSeleccionada}`, 'dddd DD MMMM h:mm a').format('YYYY-MM-DD HH:mm:ss');
    // const data = {
    //     title: "Cerrado",
    //     start: start,
    //     end: moment(start).add(30, 'minutes').format('YYYY-MM-DD HH:mm:ss'),
    //     allDay: false,
    //     display: 'auto',
    //     backgroundColor: '#142946',
    //     borderColor: '#046af3',
    //     textColor: '#ffffff',
    //     extendedProps: {
    //         servicios: servicios,
    //         numero: numero,
    //         estado: 'PENDIENTE',
    //         precio: price
    //     },
    // }
    // const { data: event } = axios.post('/api/v1/event', data);
    modalAddEvent.hide();
    calendar.today();   
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
function toCRC(number){
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' }).format(number).replace(/\D00(?=\D*$)/, "");
}
function sentecesCase(str){
    return str.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}
document.addEventListener('DOMContentLoaded', init);