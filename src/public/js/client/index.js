function init(event){
    checkForm();
    animateElements();
    bringOpiniones();
    // getCitas();
}

// async function getCitas(){
//     // citasdisponibles
//     let {data: citas} = await axios.get('/api/v1/event?sort=oneweekahead');
//     $("#citasdisponibles").empty();
//     citas.forEach((e,i)=>{
//         $("#citasdisponibles").append(`
            
//         `);
//     });
// }

async function bringOpiniones(){
    let {data: opiniones} = await axios.get('/api/v1/review/display');
    $("#opinionesList").empty();
    opiniones.forEach((e,i)=>{
        let estrellas = "";
        for (let i = 0; i < e.stars; i++) {
            estrellas += `<i class="fa-solid fa-star text-gold"></i>`;
        }
        $("#opinionesList").append(`
            <li class="splide__slide" style="width:350px;">
                <div class="bg-dark shadow rounded-3 p-3 mx-4 reviewOpinion">
                    <h6 class="fw-bold mb-2">${e.nombre}</h6>
                    <p class="d-flex justify-content-start align-items-center gap-2 mb-2">
                        ${estrellas}
                    </p>
                    <p class="card-text mb-2 text-muted">${e.review}</p>
                </div>
            </li>
        `);
    });
    const splide = new Splide( '#opinionesCarousel', {
        type: 'loop',
        drag: 'free',
        focus: 'center',
        arrows: false,
        autoHeight: true,
        pauseOnHover: true,
        fixedWidth: 350,
        pagination: false,
        perPage: 5,
        autoScroll: {
          speed: 1,
        },
    });
      
    // splide.mount();
    splide.mount(window.splide.Extensions);
}

function addStar(star, ele){
    document.getElementById('stars').value = parseInt(star);
    $(ele).find('i').removeClass('fa-regular').addClass('fa-solid active');
    $(ele).prevAll().find('i').removeClass('fa-regular').addClass('fa-solid active');
    $(ele).nextAll().find('i').removeClass('fa-solid active').addClass('fa-regular');
}
function checkForm(){
    $("#formOpinion").on('submit', async function(e){
        const bg = window.getComputedStyle(document.body).getPropertyValue('--bs-body-bg');
        const color = window.getComputedStyle(document.body).getPropertyValue('--bs-body-color');
        e.preventDefault();
        let form = $(this);
        let stars = document.getElementById('stars').value;
        let nombre = document.getElementById('nombre').value;
        let opinion = document.getElementById('opinion').value;

        if(stars == '' || nombre == '' || opinion == ''){
            $("#feedbackerror").text('Debe llenar todos los campos.');
        }else{
            $("#feedbackerror").text('');
            let {data} = await axios.post('/api/v1/review', {
                stars: parseInt(stars),
                nombre: nombre,
                review: opinion
            });
            const Toast = Swal.mixin({
                toast: true,
                position: 'center-center',
                showConfirmButton: false,
                timer: 1500,
                timerProgressBar: true,
                background: bg,
                color: color,
            });
            Toast.fire({
                icon: 'success',
                title: 'Review Enviado'
            });
        }
    });
}
function animateElements(){
    
}

document.addEventListener('DOMContentLoaded', init);