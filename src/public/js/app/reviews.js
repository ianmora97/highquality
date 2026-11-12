// Reviews: star picker, write form, and the client's own reviews with their status.

const STAR_WORDS = ['', 'Mala experiencia', 'Podría mejorar', 'Estuvo bien', 'Muy buena', '¡Excelente!'];
const MAX = 600;
let selected = 0;

const $ = id => document.getElementById(id);
const stars = () => [...document.querySelectorAll('.acc-star')];

function paintStars(n, popLast) {
    stars().forEach((el, i) => {
        const on = i < n;
        el.classList.toggle('on', on);
        el.classList.toggle('fa-solid', on);
        el.classList.toggle('fa-regular', !on);
        el.setAttribute('aria-checked', String(i + 1 === selected));
        if (popLast && i + 1 === n) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    });
    $('star-label').textContent = STAR_WORDS[n] || ' ';
}

function pickStar(n) {
    selected = n;
    paintStars(n, true);
    refresh();
}

function refresh() {
    const len = $('review-text').value.length;
    $('review-count').textContent = `${len} / ${MAX}`;
    $('review-count').classList.toggle('warn', len > MAX - 40);
    $('review-submit').disabled = !(selected && $('review-text').value.trim());
}

function setupForm() {
    stars().forEach((el, i) => {
        const n = i + 1;
        el.addEventListener('click', () => pickStar(n));
        el.addEventListener('mouseenter', () => paintStars(n));       // hover preview
        el.addEventListener('focus', () => paintStars(n));
        el.addEventListener('blur', () => paintStars(selected));
        el.addEventListener('keydown', e => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
            e.preventDefault();
            const next = Math.min(5, Math.max(1, n + (e.key === 'ArrowRight' ? 1 : -1)));
            stars()[next - 1].focus();
            pickStar(next);
        });
    });
    $('star-picker').addEventListener('mouseleave', () => paintStars(selected));
    $('review-text').addEventListener('input', refresh);
    $('review-form').addEventListener('submit', submitReview);
}

async function submitReview(e) {
    e.preventDefault();
    const text = $('review-text').value.trim();
    if (!selected || !text) return;

    const btn = $('review-submit');
    btn.disabled = true;
    btn.querySelector('i').className = 'fa-solid fa-circle-notch fa-spin';
    btn.querySelector('span').textContent = 'Enviando…';

    try {
        await axios.post('/api/v1/review', { review: text, stars: selected });
        $('review-text').value = '';
        selected = 0;
        paintStars(0);
        Swal.fire({
            iconHtml: '<svg class="hq-check" viewBox="0 0 52 52" aria-hidden="true"><circle class="hq-check-bg" cx="26" cy="26" r="24"/><path class="hq-check-mark" d="M15 27.5l8 8 14.5-17"/></svg>',
            customClass: { icon: 'swal-icon-ok' },
            title: '¡Gracias!',
            text: 'Tu reseña quedó en revisión y se publicará una vez aprobada.',
            background: '#0d0d0d', color: '#f1f1f1', timer: 2500, showConfirmButton: false,
        });
        loadMyReviews(true);
    } catch (err) {
        const msg = (err.response && err.response.data && err.response.data.error) || 'No se pudo enviar la reseña. Intenta de nuevo.';
        Swal.fire({ icon: 'error', text: msg, background: '#0d0d0d', color: '#f1f1f1' });
    } finally {
        btn.querySelector('i').className = 'fa-solid fa-paper-plane';
        btn.querySelector('span').textContent = 'Publicar reseña';
        refresh();
    }
}

const STATUS = {
    pending:  { cls: 'gray',  label: 'En revisión',  icon: 'fa-hourglass-half' },
    approved: { cls: 'green', label: 'Publicada',    icon: 'fa-circle-check' },
    rejected: { cls: 'red',   label: 'No publicada', icon: 'fa-circle-xmark' },
};

async function loadMyReviews(fresh) {
    const box = $('my-reviews');
    try {
        const { data } = await axios.get('/api/v1/review/mine');
        $('my-count').textContent = data.length ? String(data.length) : '';
        if (!data.length) {
            box.innerHTML = `
                <div class="acc-empty">
                    <i class="fa-regular fa-star"></i>
                    <strong>Aún no escribes reseñas</strong>
                    <p>Tu opinión ayuda a otros clientes a elegirnos.</p>
                </div>`;
            return;
        }
        box.innerHTML = data.map((r, i) => {
            const st = STATUS[r.status] || STATUS.pending;
            const row = Array.from({ length: 5 }, (_, k) =>
                `<i class="fa-${k < r.stars ? 'solid' : 'regular'} fa-star" style="color:${k < r.stars ? '#F4C82C' : '#3b3b3b'};font-size:.85rem"></i>`).join('');
            const reply = r.reply ? `
                <div class="acc-reply"><i class="fa-solid fa-scissors text-gold me-1"></i>
                    <strong class="text-white">Respuesta del barbero:</strong> ${esc(r.reply)}
                </div>` : '';
            return `
                <article class="acc-card p-4 ${fresh && i === 0 ? 'acc-rise' : ''}">
                    <div class="flex items-center justify-between gap-2 mb-2">
                        <div class="flex gap-1">${row}</div>
                        <span class="acc-badge ${st.cls}"><i class="fa-solid ${st.icon}"></i> ${st.label}</span>
                    </div>
                    <p class="text-gray-300 text-sm leading-relaxed">${esc(r.review)}</p>
                    <p class="acc-sub mt-2" style="font-size:.72rem">${esc(moment(r.createdAt || Date.now()).format('D [de] MMMM YYYY'))}</p>
                    ${reply}
                </article>`;
        }).join('');
    } catch (e) {
        box.innerHTML = `
            <div class="acc-empty">
                <i class="fa-solid fa-plug-circle-exclamation"></i>
                <strong>No pudimos cargar tus reseñas</strong>
                <p>Revisa tu conexión e intenta de nuevo.</p>
            </div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => { setupForm(); loadMyReviews(); });
