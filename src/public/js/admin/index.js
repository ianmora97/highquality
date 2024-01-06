function init(){
    createCalendar();
}
const modalAddEvent = new bootstrap.Modal(document.getElementById('addEvent'), {
    keyboard: false
});

async function createCalendar(){
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
        dateClick: onDateClick
    });
    calendar.render();
}

async function onDateClick(info){
    modalAddEvent.show();
    const date = moment(info.dateStr);

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

document.addEventListener('DOMContentLoaded', init);