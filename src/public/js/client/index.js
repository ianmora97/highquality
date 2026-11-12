function init(event){
    animateElements();
    bringOpiniones();
    mountGaleriaCarousel();
    // getCitas();
}

/* Homepage gallery carousel.
 * Slides are server-rendered, so this only mounts Splide. focus:'center' plus
 * an odd perPage keeps one slide in the middle; the scale-up is CSS
 * (.gallery-carousel .splide__slide.is-active), driven by the class Splide
 * sets. type:'loop' is what makes it infinite — with fewer slides than
 * perPage Splide can't clone enough to loop, so it falls back to a static row. */
function mountGaleriaCarousel(){
    const el = document.getElementById('galeriaCarousel');
    if (!el || typeof Splide === 'undefined') return;

    const slides = el.querySelectorAll('.splide__slide').length;
    if (!slides) return;

    new Splide(el, {
        type: slides > 1 ? 'loop' : 'slide',
        focus: 'center',
        perPage: 3,
        perMove: 1,
        gap: '0.9rem',
        padding: '8%',
        arrows: slides > 1,
        pagination: slides > 1,
        autoplay: slides > 1,
        interval: 3800,
        pauseOnHover: true,
        pauseOnFocus: true,
        speed: 650,
        easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
        updateOnMove: true,      // sets is-active before the move finishes, so
                                 // the scale-up animates with the slide
        breakpoints: {
            1024: { perPage: 3, padding: '6%', gap: '0.75rem' },
            // With perPage 1 the padding already centres the frame; leaving
            // focus:'center' on top of it shifts the strip by half a slide.
            640:  { perPage: 1, focus: 0, padding: '15%', gap: '0.6rem' },
        },
    }).mount();
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