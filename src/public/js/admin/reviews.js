var g_reviews = new Map();
var currentFilter = 'all';

function init() {
    bringData();
}

async function bringData() {
    const { data } = await axios.get('/api/v1/review');
    g_reviews.clear();
    data.forEach(e => g_reviews.set(e._id, e));
    updateStats();
    renderList();
}

function updateStats() {
    const all = [...g_reviews.values()];
    document.getElementById('totalitems').textContent = all.length;
    document.getElementById('displayCount').textContent = all.filter(r => r.display).length;
    const avg = all.length ? (all.reduce((s, r) => s + r.stars, 0) / all.length).toFixed(1) : '—';
    document.getElementById('avgStars').textContent = avg;
}

function renderList() {
    const list = document.getElementById('list');
    list.innerHTML = '';
    let items = [...g_reviews.values()];
    if (currentFilter === 'visible') items = items.filter(r => r.display);
    if (currentFilter === 'hidden')  items = items.filter(r => !r.display);
    if (!items.length) {
        list.innerHTML = '<p class="text-gray-500 text-center py-8 col-span-full">No hay reviews</p>';
        return;
    }
    items.forEach((e, i) => addReview(e, i + 1));
}

function filterReviews(type) {
    currentFilter = type;
    ['all','visible','hidden'].forEach(t => {
        const btn = document.getElementById('filter-' + t);
        btn.classList.toggle('btn-primary', t === type);
        btn.classList.toggle('btn-dark', t !== type);
    });
    renderList();
}

function addReview(item, i) {
    const stars = Array.from({length: 5}, (_, idx) =>
        `<i class="fa-${idx < item.stars ? 'solid' : 'regular'} fa-star" style="color:#F4C82C; font-size:0.85rem;"></i>`
    ).join('');

    const card = document.createElement('div');
    card.className = 'animate__animated animate__fadeInUp';
    card.style.animationDelay = `${i * 40}ms`;
    card.innerHTML = `
        <div class="rounded-xl p-4 border border-white/10 h-full flex flex-col gap-3"
             style="background:#0d0d0d; ${item.display ? 'border-color:rgba(244,200,44,0.3);' : ''}">
            <!-- Header -->
            <div class="flex items-start justify-between gap-2">
                <div>
                    <div class="font-semibold text-white">${item.nombre || 'Anónimo'}</div>
                    <div class="flex gap-1 mt-1">${stars}</div>
                </div>
                <span class="text-xs px-2 py-1 rounded-full ${item.display ? 'bg-yellow-400/10 text-yellow-400' : 'bg-gray-800 text-gray-500'}">
                    <i class="fa-solid fa-${item.display ? 'eye' : 'eye-slash'} me-1"></i>${item.display ? 'Visible' : 'Oculto'}
                </span>
            </div>
            <!-- Review text -->
            <p class="text-gray-400 text-sm leading-relaxed flex-1">"${item.review}"</p>
            <!-- Date -->
            <div class="text-xs text-gray-600">${new Date(item.createdAt || Date.now()).toLocaleDateString('es-CR', {year:'numeric',month:'short',day:'numeric'})}</div>
            <!-- Actions -->
            <div class="flex items-center justify-between pt-2 border-t border-white/5">
                <button type="button" class="btn btn-sm btn-dark" onclick="toggleDisplay('${item._id}')">
                    <i class="fa-solid fa-${item.display ? 'eye-slash' : 'eye'} me-1"></i>
                    ${item.display ? 'Ocultar' : 'Mostrar'}
                </button>
                <button type="button" class="btn btn-sm" style="background:rgba(220,38,38,0.15); color:#f87171; border:1px solid rgba(220,38,38,0.3);"
                        onclick="eliminarReview('${item._id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    document.getElementById('list').appendChild(card);
}

async function toggleDisplay(id) {
    const review = g_reviews.get(id);
    await axios.put(`/api/v1/review/${id}`, { display: !review.display });
    await bringData();
}

async function eliminarReview(id) {
    const op = g_reviews.get(id);
    const bg = window.getComputedStyle(document.body).getPropertyValue('--bs-body-bg');
    const color = window.getComputedStyle(document.body).getPropertyValue('--bs-body-color');
    const result = await Swal.fire({
        icon: 'warning',
        title: '¿Eliminar review?',
        text: op.review.substring(0, 80),
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        customClass: { confirmButton: 'btn btn-danger ms-2', cancelButton: 'btn btn-dark' },
        buttonsStyling: false,
        background: bg,
        color
    });
    if (result.isConfirmed) {
        await axios.delete('/api/v1/review/' + id);
        const toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, background: bg, color });
        toast.fire({ icon: 'success', title: 'Eliminado' });
        await bringData();
    }
}

document.addEventListener('DOMContentLoaded', init);
