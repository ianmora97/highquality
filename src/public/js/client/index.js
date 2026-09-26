function init(event){
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

function animateElements(){
    
}

document.addEventListener('DOMContentLoaded', init);