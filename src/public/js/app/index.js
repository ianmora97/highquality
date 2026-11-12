// Account home: next appointment ticket, quick stats, one-tap rebook.

function paintHeader() {
    document.getElementById('acc-first').textContent = firstName(document.getElementById('acc-first').textContent);
    const today = moment().format('dddd D [de] MMMM');
    document.getElementById('acc-today').textContent = today;
}

async function init() {
    paintHeader();
    try {
        const { data } = await axios.get('/api/v1/event/client');
        renderNextAppointment(data);
        renderStats(data);
        renderRecommended(data);
    } catch (e) {
        const msg = `
            <div class="acc-empty">
                <i class="fa-solid fa-plug-circle-exclamation"></i>
                <strong>No pudimos cargar tus citas</strong>
                <p>Revisa tu conexión e intenta de nuevo.</p>
                <button type="button" class="acc-btn ghost mt-4" style="width:auto;display:inline-flex" onclick="location.reload()">
                    <i class="fa-solid fa-rotate-right"></i> Reintentar
                </button>
            </div>`;
        document.getElementById('next-appointment').innerHTML = msg;
        document.getElementById('acc-stats-wrap').remove();
        document.getElementById('recommended-services').innerHTML = '';
    }
}

function renderNextAppointment(events) {
    const box = document.getElementById('next-appointment');
    const upcoming = events
        .filter(ev => new Date(ev.start) > new Date())
        .sort((a, b) => new Date(a.start) - new Date(b.start));

    if (!upcoming.length) {
        box.innerHTML = `
            <div class="acc-empty">
                <i class="fa-regular fa-calendar-plus"></i>
                <strong>No tienes citas próximas</strong>
                <p>Agenda la próxima y te esperamos.</p>
            </div>`;
        return;
    }

    const ev = upcoming[0];
    const m = moment(ev.start);
    const soon = m.diff(moment(), 'hours') < 24;
    const label = relativeDay(ev.start);
    const services = eventServices(ev);
    const more = upcoming.length > 1 ? `<p class="acc-sub mt-3 text-center">y ${plural(upcoming.length - 1, 'cita más', 'citas más')} agendadas · <a href="/app/history" class="text-gold">ver historial</a></p>` : '';

    box.innerHTML = `
        <div class="acc-ticket">
            <div class="acc-ticket-top">
                <div class="acc-date"><b>${m.format('D')}</b><small>${esc(m.format('MMM').replace('.', ''))}</small></div>
                <div class="min-w-0 flex-1">
                    <span class="acc-badge gold ${soon ? 'live' : ''} mb-2">${esc(label)}</span>
                    <p class="acc-when">${esc(m.format('dddd'))} · ${esc(m.format('h:mm a'))}</p>
                    <div class="flex flex-wrap gap-1 mt-2">
                        ${services.map(s => `<span class="acc-svc">${esc(s)}</span>`).join('') || '<span class="acc-sub">Sin servicios</span>'}
                    </div>
                </div>
            </div>
            <div class="acc-ticket-foot">
                <a class="acc-btn ghost" href="${esc(calendarUrl(ev))}" target="_blank" rel="noopener">
                    <i class="fa-regular fa-calendar-plus"></i> Agregar al calendario
                </a>
            </div>
        </div>${more}`;
}

function renderStats(events) {
    const wrap = document.getElementById('acc-stats-wrap');
    const now = new Date();
    const past = events.filter(ev => new Date(ev.start) <= now);

    if (!events.length) { wrap.remove(); return; }

    const counts = new Map();
    events.forEach(ev => eventServices(ev).forEach(s => counts.set(s, (counts.get(s) || 0) + 1)));
    const fav = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    const last = past.sort((a, b) => new Date(b.start) - new Date(a.start))[0];

    const tile = (hue, icon, value, label) => `
        <div class="acc-stat" style="--h:${hue}">
            <i class="fa-solid ${icon}"></i>
            <b>${esc(value)}</b>
            <small>${esc(label)}</small>
        </div>`;

    wrap.innerHTML = `<div class="acc-stats">
        ${tile('#a78bfa', 'fa-scissors', past.length, past.length === 1 ? 'Visita' : 'Visitas')}
        ${tile('#34d399', 'fa-clock-rotate-left', last ? relativeDay(last.start) : '—', 'Última visita')}
        ${tile('#fb923c', 'fa-heart', fav ? fav[0] : '—', 'Tu favorito')}
    </div>`;
}

function renderRecommended(events) {
    const box = document.getElementById('recommended-services');
    const counts = new Map();
    events.slice(0, 20).forEach(ev => eventServices(ev).forEach(s => counts.set(s, (counts.get(s) || 0) + 1)));

    if (!counts.size) {
        box.innerHTML = `
            <div class="acc-empty">
                <i class="fa-solid fa-scissors"></i>
                <strong>Aún no tienes servicios previos</strong>
                <p>Cuando tengas citas, aquí los repites con un toque.</p>
            </div>`;
        return;
    }

    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    box.innerHTML = top.map(([name, n]) => `
        <a href="/reservar" class="acc-card acc-chip">
            <span class="ico"><i class="fa-solid fa-scissors"></i></span>
            <span class="flex-1 min-w-0">
                <span class="block text-white font-semibold text-sm truncate">${esc(name)}</span>
                <span class="block acc-sub" style="font-size:.72rem">${esc(plural(n, 'vez', 'veces'))}</span>
            </span>
            <i class="fa-solid fa-arrow-right arr"></i>
        </a>`).join('');
}

document.addEventListener('DOMContentLoaded', init);
