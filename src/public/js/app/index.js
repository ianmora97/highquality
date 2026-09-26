async function init() {
    const { data } = await axios.get('/api/v1/event/client');
    renderRecommended(data);
    renderNextAppointment(data);
}

function renderRecommended(events) {
    const container = document.getElementById('recommended-services');
    const recentServices = new Map();
    events.slice(0, 10).forEach(ev => {
        (ev.extendedProps && ev.extendedProps.servicios ? ev.extendedProps.servicios : []).forEach(s => {
            if (!recentServices.has(s)) recentServices.set(s, true);
        });
    });
    if (!recentServices.size) {
        container.innerHTML = '<p class="text-gray-600 text-sm text-center py-4">Aún no tienes citas previas</p>';
        return;
    }
    const services = [...recentServices.keys()].slice(0, 3);
    container.innerHTML = services.map(s => `
        <a href="/reservar" class="flex items-center gap-3 rounded-xl p-3 border border-white/10 hover:border-gold/30 transition-colors" style="background:#0d0d0d; text-decoration:none;">
            <div class="w-8 h-8 rounded-full flex items-center justify-center" style="background:rgba(244,200,44,0.1);">
                <i class="fa-solid fa-scissors text-gold text-sm"></i>
            </div>
            <span class="text-white font-medium text-sm flex-1">${s}</span>
            <i class="fa-solid fa-arrow-right text-gray-600 text-xs"></i>
        </a>
    `).join('');
}

function renderNextAppointment(events) {
    const container = document.getElementById('next-appointment');
    const now = new Date();
    const upcoming = events
        .filter(ev => new Date(ev.start) > now)
        .sort((a, b) => new Date(a.start) - new Date(b.start));
    if (!upcoming.length) {
        container.innerHTML = '<p class="text-gray-600 text-sm text-center py-2">No tienes citas próximas</p>';
        return;
    }
    const ev = upcoming[0];
    const fecha = moment(ev.start).format('dddd DD [de] MMMM');
    const hora = moment(ev.start).format('h:mm a');
    const servicios = ev.extendedProps && ev.extendedProps.servicios ? ev.extendedProps.servicios : [];
    container.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl flex items-center justify-center" style="background:rgba(244,200,44,0.1);">
                <i class="fa-solid fa-calendar-check text-gold"></i>
            </div>
            <div>
                <p class="font-semibold text-white capitalize mb-0">${fecha}</p>
                <p class="text-sm text-gray-400 mb-0">${hora} · ${servicios.join(', ')}</p>
            </div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', init);
