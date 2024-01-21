function init(){
    bringData();
}
var g_servicios = new Map();

async function bringData(){
    const { data } = await axios.get('/api/v1/services');
    fillData(data);

    const { data: icons } = await axios.get('/api/v1/services/icons');
    fillIcons(icons);
}
async function reloadData(){
    const { data } = await axios.get('/api/v1/services');
    fillData(data);
}
function fillData(data){
    if(data){
        $("#listaServicios").empty();
        data.forEach((e,i) =>{
            g_servicios.set(e._id,e);
            addService(e,i+1);
        })
    }else{
        console.log('No hay datos');
    }
}
function addService(item,i){
    $("#listaServicios").append(`
        <div class="card bg-fore shadow py-3 animate__animated animate__fadeInDown" 
        style="min-width: 200px; animation-delay:${i*50}ms;">
            <div class="d-flex justify-content-center">
                <img src="/images/icons/${item.icon}" class="card-img-top p-3" alt="${item.name}" style="filter: invert(1); width:150px;">
            </div>
            <div class="card-body text-center">
                <h5 class="fw-bold">${item.name}</h5>
                <p class="card-text mb-3">${item.price} colones</p>

                <div class="d-flex justify-content-center mb-4">
                    <div class="form-check form-switch form-check-lg ">
                        <input class="form-check-input" type="checkbox" onchange="cambiarestado('${item._id}')" 
                        role="switch" id="switchservicio-${item.name}" ${item.enable ? "checked": ""}>
                    </div>
                </div>

                <button type="button" class="btn btn-secondary btn-sm" 
                onclick="actualizarServicioOpenModal('${item._id}')"><i class="fa-duotone fa-pen"></i> Editar</button>
            </div>
        </div>
    `);
}

function fillIcons(data){
    data.forEach(e =>{
        $("#imagesToSelect").append(`
            <li class="dropdown-item d-flex justify-content-center px-3 py-1"
            onclick="seleccionarImagen('${e}')">
                <img src="/images/icons/${e}" width="50px" style="filter: invert(1);">
            </li>
        `);
        $("#imagesToSelect-edit").append(`
            <li class="dropdown-item d-flex justify-content-center px-3 py-1"
            onclick="seleccionarImagenEdit('${e}')">
                <img src="/images/icons/${e}" width="50px" style="filter: invert(1);">
            </li>
        `);
    })
}
var imagenSeleccionada = "corte.png";
function seleccionarImagen(path){
    $("#imagenseleccionada").html(`<img src="/images/icons/${path}" width="50px">`);
    imagenSeleccionada = path;
}

async function agregarServicio(){
    let dataSend = {
        name: $("#nombre-add").val(),
        price: $("#precio-add").val(),
        icon: imagenSeleccionada,
        enable: true
    };
    const { data } = await axios.post('/api/v1/services', dataSend);
    reloadData();
    $("#addService").modal('hide');
}

var imagenseleccionadaedit;
function seleccionarImagenEdit(path){
    $("#imagenseleccionada-edit").html(`<img src="/images/icons/${path}" width="50px">`);
    imagenseleccionadaedit = path;
}
function actualizarServicioOpenModal(id){
    const servicio = g_servicios.get(id);

    $("#idUpdate").html(servicio._id);

    $("#nombre-edit").val(servicio.name);
    $("#precio-edit").val(servicio.price);
    $("#imagenseleccionada-edit").html(`<img src="/images/icons/${servicio.icon}" width="50px">`);
    imagenseleccionadaedit = servicio.icon;

    $("#editService").modal('show');
}

async function actualizarServicio(){
    const id = $("#idUpdate").html();
    let dataSend = {
        name: $("#nombre-edit").val(),
        price: $("#precio-edit").val(),
        icon: imagenseleccionadaedit,
    };
    const { data } = await axios.put(`/api/v1/services/${id}`, dataSend);
    reloadData();
    $("#editService").modal('hide');
}

async function cambiarestado(id){
    const servicio = g_servicios.get(id);
    let dataSend = {
        enable: !servicio.enable
    };
    const { data } = await axios.put(`/api/v1/services/${id}`, dataSend);
}

document.addEventListener('DOMContentLoaded', init);