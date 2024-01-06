function init(){
    console.log('Admin Dashboard');
    createCalendar();
}

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
        }
    });
    calendar.render();
}

document.addEventListener('DOMContentLoaded', init);