function init(){
    bringData();
}
async function bringData(){
    const { data } = await axios.get('/api/v1/services');
    fillData(data);

    const { data: icons } = await axios.get('/api/v1/services/icons');
    fillIcons(icons);
}
function fillData(data){
    if(data){
        $("#listaServicios").empty();
        data.forEach(e =>{
            addService(e);
        })
    }else{
        console.log('No hay datos');
    }
}
function addService(item){
    $("#listaServicios").append(`
        <div class="card card-custom" style="width: 250px;">
            <img src="/images/icons/${item.icon}" class="card-img-top" alt="${item.description}">
            <div class="card-body text-center">
                <h5 class="card-title">${item.description}</h5>
                <p class="card-text">Precio: ${item.price} colones</p>
                <div class="d-flex justify-content-evenly">
                    <div class="form-check form-switch form-switch-md">
                        <input class="form-check-input" type="checkbox" onchange="cambiarestado('${item.name}')" 
                        role="switch" id="switchservicio-${item.name}" ${item.enable ? "checked": ""}>
                    </div>
                    <button type="button" class="btn btn-success rounded-circle text-white btn-sm" 
                    onclick="actualizarServicioOpenModal('${item.name}')"><i class="fas fa-pen"></i></button>
                </div>
            </div>
        </div>
    `);
}

function fillIcons(data){
    data.forEach(e =>{
        $("#imagenseleccionada").append(`
            <li class="dropdown-item d-flex justify-content-center px-3 py-1"
            onclick="seleccionarImagen('${e}')">
                <img src="/images/icons/${e}" width="50px">
            </li>
        `);
    })
}
var imagenSeleccionada = "corte.png";
function seleccionarImagen(path){
    $("#imagenseleccionada").html(`<img src="/images/icons/${path}" width="50px">`);
    imagenSeleccionada = path;
}
document.addEventListener('DOMContentLoaded', init);