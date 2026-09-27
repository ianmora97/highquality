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

    try {
        await axios.post('/api/v1/review', { review: text, stars: selectedStars });
        document.getElementById('review-text').value = '';
        pickStar(0);
        selectedStars = 0;
        Swal.fire({
            icon: 'success', title: '¡Gracias!',
            text: 'Tu reseña fue enviada y quedará visible en el sitio una vez aprobada.',
            background: '#0d0d0d', color: '#f1f1f1', timer: 2500, showConfirmButton: false,
        });
        loadMyReviews();
    } catch (e) {
        const text = (e.response && e.response.data && e.response.data.error) || 'Error al enviar reseña';
        Swal.fire({ icon: 'error', text, background: '#0d0d0d', color: '#f1f1f1' });
    }
}

const STATUS_LABEL = { pending: 'En revisión', approved: 'Publicada', rejected: 'No publicada' };
const STATUS_CLASS = {
    pending:  'bg-gray-800 text-gray-400',
    approved: 'bg-yellow-400/10 text-yellow-400',
    rejected: 'bg-red-500/10 text-red-400',
};

async function loadMyReviews() {
    try {
        const { data } = await axios.get('/api/v1/review/mine');
        const container = document.getElementById('my-reviews');
        if (!data.length) {
            container.innerHTML = '<p class="text-gray-600 text-sm text-center py-4">Aún no tienes reseñas</p>';
            return;
        }
        container.innerHTML = data.map(function(r) {
            const stars = Array.from({ length: 5 }, function(_, i) {
                return `<i class="fa-${i < r.stars ? 'solid' : 'regular'} fa-star" style="color:${i < r.stars ? '#F4C82C' : '#374151'}; font-size:0.85rem;"></i>`;
            }).join('');
            const reply = r.reply ? `
                <div class="mt-3 pt-3 border-t border-white/5 flex gap-2">
                    <i class="fa-solid fa-scissors text-primary text-xs mt-0.5"></i>
                    <p class="text-gray-400 text-xs leading-relaxed"><span class="text-white font-semibold">Respuesta del barbero: </span>"${r.reply}"</p>
                </div>` : '';
            return `
                <div class="rounded-xl p-4 border border-white/10" style="background:#0d0d0d;">
                    <div class="flex items-center justify-between gap-2 mb-2">
                        <div class="flex gap-1">${stars}</div>
                        <span class="text-xs px-2 py-1 rounded-full ${STATUS_CLASS[r.status] || STATUS_CLASS.pending}">${STATUS_LABEL[r.status] || STATUS_LABEL.pending}</span>
                    </div>
                    <p class="text-gray-400 text-sm">"${r.review}"</p>
                    <p class="text-xs text-gray-600 mt-2">${new Date(r.createdAt || Date.now()).toLocaleDateString('es-CR')}</p>
                    ${reply}
                </div>
            `;
        }).join('');
    } catch (e) {
        console.error('Error loading reviews', e);
    }
}

document.addEventListener('DOMContentLoaded', loadMyReviews);
