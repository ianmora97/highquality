function init(){
    bringData();
}
var g_horarios = new Map();

async function bringData(){
    const { data } = await axios.get('/api/v1/horario');
    fillData(data);
}

function fillData(data){
    if(data){
        $("#horarios").empty();
        data.forEach((e,i) =>{
            g_horarios.set(e._id,e);
            addService(e,i+1);
        })
    }else{
        console.log('No hay datos');
    }
}
function addService(item,i){
    const DAYS_MAP = {
        "Monday": "Lunes",
        "Tuesday": "Martes",
        "Wednesday": "Miércoles",
        "Thursday": "Jueves",
        "Friday": "Viernes",
        "Saturday": "Sábado",
        "Sunday": "Domingo"
    }
    let hours = "";
    item.hours.forEach(e =>{
        hours += `<p class="mb-0 fw-bold border-end pe-2 border-dark">
            <span class="text-success">${e}</span>
        </p> `;
    })
    $("#horarios").append(`
        <div class="card bg-fore shadow p-3 animate__animated animate__fadeInLeft w-100 
        border-end-0 border-start-0 border-bottom-0 border-5 border-${item.enable ? "primary" : "secondary"}" 
        style="animation-delay:${i*50}ms;">

            <div class="d-flex justify-content-between align-items-center mb-2">
                <h5 class="fw-bold mb-1">${DAYS_MAP[item.day]}</h5>
            
                <div class="d-flex justify-content-end align-items-center">
                    <div class="form-check form-switch form-check-lg ">
                        <input class="form-check-input" type="checkbox" onchange="cambiarestado('${item._id}')" 
                        role="switch" id="switchservicio-${item.day}" ${item.enable ? "checked": ""}>
                    </div>
                    <button type="button" class="btn btn-dark btn-sm ms-2 rounded-pill"
                    onclick="horarioModalUpdate('${item._id}')"><i class="fa-duotone fa-pen"></i></button>
                </div>
            </div>
            <div class="d-flex justify-content-start align-items-center gap-2 flex-wrap">
                ${hours}
            </div>
        </div>
    `);
}

function horarioModalUpdate(id){
    const horario = g_horarios.get(id);
    $("#editHorario").modal('show');

    $("#idUpdate").html(horario._id);

    $("#horas-edit").empty();
    horario.hours.forEach(e =>{
        $("#horas-edit").append(`
            <div class="card bg-dark mb-3 p-2">
                <div class="d-flex justify-content-between align-items-center px-2">
                    <h5 class="mb-0">${e}</h5>
                    <button class="btn btn-outline-danger" type="button" onclick="eliminarHoraEdit('${e}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `);
    });

}

async function agregarHora(){
    const bg = window.getComputedStyle(document.body).getPropertyValue('--bs-body-bg');
    const color = window.getComputedStyle(document.body).getPropertyValue('--bs-body-color');
    const id = $("#idUpdate").html();

    const bootstrapColorSwall = Swal.mixin({
        customClass: {
            confirmButton: 'btn btn-primary',
            cancelButton: 'btn btn-danger ms-2'
        },
        buttonsStyling: false
    });
    const { value: date } = await bootstrapColorSwall.fire({
        title: 'Agregar hora',
        text: "Ingrese la hora",
        input: "time",
        confirmButtonText: "Agregar",
        background: bg,
        color: color,
        didOpen: () => {
            const today = (new Date()).toISOString();
            Swal.getInput().min = today.split("T")[0];
        }
    });
    if (date) {
        const formatDate = moment(date, "HH:mm").format("h:00 a");
        
        g_horarios.get(id).hours.push(formatDate);

        $("#horas-edit").append(`
            <div class="card bg-dark mb-3 p-2">
                <div class="d-flex justify-content-between align-items-center px-2">
                    <h5 class="mb-0">${formatDate}</h5>
                </div>
            </div>
        `);
    }
}

async function actualizarHorario(){
    const id = $("#idUpdate").html();
    let dataSend = {
        hours: g_horarios.get(id).hours,
    };
    const { data } = await axios.put(`/api/v1/horario/${id}`, dataSend);
    bringData();
    $("#editHorario").modal('hide');
}

function eliminarHoraEdit(e){
    const id = $("#idUpdate").html();
    // confirmation with sweetalert2
    const bg = window.getComputedStyle(document.body).getPropertyValue('--bs-body-bg');
    const color = window.getComputedStyle(document.body).getPropertyValue('--bs-body-color');
    const bootstrapColorSwall = Swal.mixin({
        customClass: {
            confirmButton: 'btn btn-primary',
            cancelButton: 'btn btn-danger ms-2'
        },
        buttonsStyling: false
    });
    bootstrapColorSwall.fire({
        title: '¿Está seguro?',
        text: `¿Desea eliminar la hora ${e}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        background: bg,
        color: color
    }).then((result) => {
        if (result.isConfirmed) {
            g_horarios.get(id).hours = g_horarios.get(id).hours.filter(x => x != e);
            actualizarHorario();
        }
    });
}

async function cambiarestado(id){
    const servicio = g_servicios.get(id);
    let dataSend = {
        enable: !servicio.enable
    };
    const { data } = await axios.put(`/api/v1/services/${id}`, dataSend);
}

document.addEventListener('DOMContentLoaded', init);