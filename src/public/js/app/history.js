// Appointment history: filter (all / upcoming / past), grouped by month.

let ALL = [];
let FILTER = 'all';

const isUpcoming = ev => new Date(ev.start) > new Date();

async function init() {
    try {
        const { data } = await axios.get('/api/v1/event/client');
        ALL = data.sort((a, b) => new Date(b.start) - new Date(a.start));
    } catch (e) {
        document.getElementById('history-list').innerHTML = `
            <div class="acc-empty mt-4">
                <i class="fa-solid fa-plug-circle-exclamation"></i>
                <strong>No pudimos cargar tus citas</strong>
                <p>Revisa tu conexión e intenta de nuevo.</p>
            </div>`;
        return;
    }

    const up = ALL.filter(isUpcoming).length;
    const spent = ALL.filter(ev => !isUpcoming(ev) && ev.extendedProps && ev.extendedProps.estado === 'PAGO')
        .reduce((t, ev) => t + eventPrice(ev), 0);
    document.getElementById('history-summary').textContent =
        ALL.length ? `${plural(ALL.length, 'cita', 'citas')}${spent ? ' · ' + money(spent) + ' pagados' : ''}` : 'Sin citas todavía';

    document.getElementById('n-all').textContent = ALL.length;
    document.getElementById('n-upcoming').textContent = up;
    document.getElementById('n-past').textContent = ALL.length - up;

    document.querySelectorAll('.acc-seg button').forEach(btn => {
        btn.addEventListener('click', () => setFilter(btn.dataset.filter));
    });
    setFilter('all', true);
}

function setFilter(f, first) {
    FILTER = f;
    const btns = [...document.querySelectorAll('.acc-seg button')];
    btns.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === f)));
    document.getElementById('seg-thumb').style.transform = `translateX(${btns.findIndex(b => b.dataset.filter === f) * 100}%)`;
    render(first);
}

function badgeFor(ev) {
    const estado = (ev.extendedProps && ev.extendedProps.estado) || 'PENDIENTE';
    if (isUpcoming(ev)) return { cls: 'gold', label: relativeDay(ev.start), rail: '#F4C82C' };
    if (estado === 'PAGO') return { cls: 'green', label: 'Pagada', rail: '#22c55e' };
    return { cls: 'gray', label: 'Completada', rail: '#4b5563' };
}

function render() {
    const box = document.getElementById('history-list');
    let list = ALL;
    if (FILTER === 'upcoming') list = ALL.filter(isUpcoming).reverse(); // soonest first
    if (FILTER === 'past') list = ALL.filter(ev => !isUpcoming(ev));

    if (!list.length) {
        const msg = FILTER === 'upcoming'
            ? ['No tienes citas próximas', 'Agenda una y aparecerá aquí.']
            : FILTER === 'past' ? ['Aún no tienes citas pasadas', 'Tu historial se llena después de tu primera visita.']
            : ['Todavía no tienes citas', 'Cuando agendes la primera, la verás aquí.'];
        box.innerHTML = `
            <div class="acc-empty mt-4 acc-rise">
                <i class="fa-regular fa-calendar"></i>
                <strong>${msg[0]}</strong>
                <p>${msg[1]}</p>
                <a href="/reservar" class="acc-btn mt-4" style="width:auto;display:inline-flex;padding:.7rem 1.4rem;font-size:.9rem">
                    <i class="fa-solid fa-plus"></i> Nueva cita
                </a>
            </div>`;
        return;
    }

    // Group by month, keeping the list order.
    const groups = [];
    list.forEach(ev => {
        const key = moment(ev.start).format('MMMM YYYY');
        let g = groups[groups.length - 1];
        if (!g || g.key !== key) { g = { key, items: [] }; groups.push(g); }
        g.items.push(ev);
    });

    box.innerHTML = groups.map(g => `
        <h3 class="acc-month acc-rise">${esc(g.key)}</h3>
        <div class="flex flex-col gap-2">
            ${g.items.map(row).join('')}
        </div>`).join('');
    stagger(box);
}

function row(ev) {
    const m = moment(ev.start);
    const b = badgeFor(ev);
    const services = eventServices(ev);
    const price = eventPrice(ev);
    return `
        <article class="acc-card acc-item acc-rise" style="--rail:${b.rail}">
            <div class="d"><b>${m.format('D')}</b><small>${esc(m.format('ddd').replace('.', ''))}</small></div>
            <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-2">
                    <p class="text-white font-semibold text-sm">${esc(m.format('h:mm a'))}</p>
                    <span class="acc-badge ${b.cls}">${esc(b.label)}</span>
                </div>
                <div class="flex flex-wrap gap-1 mt-2">
                    ${services.map(s => `<span class="acc-svc">${esc(s)}</span>`).join('')}
                </div>
                ${price ? `<p class="acc-sub mt-2">${money(price)}</p>` : ''}
            </div>
        </article>`;
}

document.addEventListener('DOMContentLoaded', init);
