function init(){
    bringData();
}
var g_reviews = new Map();

async function bringData(){
    const { data } = await axios.get('/api/v1/review');
    fillData(data);
}
function fillData(data){
    if(data.length != 0){
        $("#list").empty();
        data.forEach((e,i) =>{
            g_reviews.set(e._id,e);
            addReview(e,i+1);
        })
    }else{
        $("#list").html(`
            <p class="text-center text-muted d-block w-100">No tiene reviews</p>
        `);
    }
}
function addReview(item,i){
    let estrellas = "";
    for (let i = 0; i < item.stars; i++) {
        estrellas += `<i class="fa-solid fa-star text-gold"></i>`;
    }
    $("#list").append(`
        <div class="card bg-fore shadow  animate__animated animate__fadeInDown" style="width: 350px; animation-delay:${i*50}ms;">
            <div class="card-body">
                <h6 class="fw-bold mb-2">${item.nombre}</h6>
                <p class="d-flex justify-content-start align-items-center gap-2 mb-2">${estrellas}</p>
                <p class="card-text mb-2 text-muted">${item.review}</p>
                <hr>
                <div class="d-flex justify-content-between">
                    <button type="button" class="btn btn-secondary btn-sm" onclick="eliminarReview('${item._id}')">
                    <i class="fa-duotone fa-trash"></i> Eliminar</button>
                    <div class="form-check form-switch form-check-lg ">
                        <input class="form-check-input" type="checkbox" onchange="cambiarestado('${item._id}')" 
                        role="switch" id="switchDisplay-${item.nombre}-${i}" ${item.display ? "checked": ""}>
                    </div>
                </div>
            </div>
        </div>
    `);
}
async function agregarServicio(){
    let dataSend = {
        name: $("#nombre-add").val(),
        price: $("#precio-add").val(),
        icon: imagenSeleccionada,
        enable: true
    };
    const { data } = await axios.post('/api/v1/review', dataSend);
    reloadData();
    $("#addReview").modal('hide');
}

async function eliminarReview(id){
    const op = g_reviews.get(id);
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
        icon: 'warning',
        title: '¿Desea eliminar esta opinion?',
        text: `${op.review}`,
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        background: bg,
        color: color
    }).then(async (result) => {
        if (result.isConfirmed) {
            const {data} = await axios.delete('/api/v1/review/'+id);
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true,
                background: bg,
                color: color,
            });
            Toast.fire({
                icon: 'success',
                title: 'Eliminado'
            });
            bringData();
        }
    });

}

async function actualizarServicio(){
    const id = $("#idUpdate").html();
    let dataSend = {
        name: $("#nombre-edit").val(),
        price: $("#precio-edit").val(),
        icon: imagenseleccionadaedit,
    };
    const { data } = await axios.put(`/api/v1/review/${id}`, dataSend);
    reloadData();
    $("#editService").modal('hide');
}

async function cambiarestado(id){
    const servicio = g_reviews.get(id);
    let dataSend = {
        display: !servicio.display
    };
    const { data } = await axios.put(`/api/v1/review/${id}`, dataSend);
}

document.addEventListener('DOMContentLoaded', init);