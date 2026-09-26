var selectedStars = 0;

function pickStar(n) {
    selectedStars = n;
    document.querySelectorAll('.star-btn').forEach(function(el, i) {
        if (i < n) {
            el.className = 'fa-solid fa-star fa-2x cursor-pointer text-yellow-400 star-btn';
        } else {
            el.className = 'fa-regular fa-star fa-2x cursor-pointer text-gray-600 star-btn';
        }
    });
}

async function submitReview() {
    const text = document.getElementById('review-text').value.trim();
    if (!selectedStars) {
        return Swal.fire({ icon: 'warning', text: 'Selecciona una calificación', background: '#0d0d0d', color: '#f1f1f1' });
    }
    if (!text) {
        return Swal.fire({ icon: 'warning', text: 'Escribe tu reseña', background: '#0d0d0d', color: '#f1f1f1' });
    }

    const nombre = document.querySelector('meta[name="client-nombre"]') ? document.querySelector('meta[name="client-nombre"]').content : 'Cliente';

    try {
        await axios.post('/api/v1/review', { nombre, review: text, stars: selectedStars, display: false });
        document.getElementById('review-text').value = '';
        pickStar(0);
        selectedStars = 0;
        Swal.fire({ icon: 'success', title: '¡Gracias!', text: 'Tu reseña fue enviada', background: '#0d0d0d', color: '#f1f1f1', timer: 2000, showConfirmButton: false });
        loadMyReviews();
    } catch (e) {
        Swal.fire({ icon: 'error', text: 'Error al enviar reseña', background: '#0d0d0d', color: '#f1f1f1' });
    }
}

async function loadMyReviews() {
    try {
        const { data } = await axios.get('/api/v1/review');
        const nombreMeta = document.querySelector('meta[name="client-nombre"]');
        const nombre = nombreMeta ? nombreMeta.content : '';
        const myReviews = data.filter(function(r) { return r.nombre === nombre; });
        const container = document.getElementById('my-reviews');
        if (!myReviews.length) {
            container.innerHTML = '<p class="text-gray-600 text-sm text-center py-4">Aún no tienes reseñas</p>';
            return;
        }
        container.innerHTML = myReviews.map(function(r) {
            const stars = Array.from({ length: 5 }, function(_, i) {
                return `<i class="fa-${i < r.stars ? 'solid' : 'regular'} fa-star" style="color:${i < r.stars ? '#F4C82C' : '#374151'}; font-size:0.85rem;"></i>`;
            }).join('');
            return `
                <div class="rounded-xl p-4 border border-white/10" style="background:#0d0d0d;">
                    <div class="flex gap-1 mb-2">${stars}</div>
                    <p class="text-gray-400 text-sm">"${r.review}"</p>
                    <p class="text-xs text-gray-600 mt-2">${new Date(r.createdAt || Date.now()).toLocaleDateString('es-CR')}</p>
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Error loading reviews', e);
    }
}

document.addEventListener('DOMContentLoaded', loadMyReviews);
