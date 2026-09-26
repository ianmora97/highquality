async function init() {
    const { data } = await axios.get('/api/v1/event/client');
    const container = document.getElementById('history-list');
    document.getElementById('history-count').textContent = `${data.length} citas`;

    if (!data.length) {
        container.innerHTML = '<p class="text-gray-600 text-sm text-center py-8">No tienes citas aún</p>';
        return;
    }
    container.innerHTML = '';

    // Sort by date descending (most recent first)
    data.sort((a, b) => new Date(b.start) - new Date(a.start));

    data.forEach((ev, i) => {
        const fecha = moment(ev.start).format('dddd DD [de] MMMM YYYY');
        const hora = moment(ev.start).format('h:mm a');
        const estado = (ev.extendedProps && ev.extendedProps.estado) ? ev.extendedProps.estado : 'PENDIENTE';
        const isPaid = estado === 'PAGO';
        const isPast = new Date(ev.start) < new Date();
        const servicios = ev.extendedProps && ev.extendedProps.servicios ? ev.extendedProps.servicios : [];
        const precio = ev.extendedProps ? ev.extendedProps.precio : null;

        const card = document.createElement('div');
        card.className = 'rounded-xl p-4 border border-white/10 animate__animated animate__fadeInUp';
        card.style.animationDelay = `${i * 40}ms`;
        card.style.background = '#0d0d0d';

        const badgeColor = isPaid ? 'rgba(34,197,94,0.1)' : isPast ? 'rgba(107,114,128,0.1)' : 'rgba(234,179,8,0.1)';
        const badgeBorder = isPaid ? 'rgba(34,197,94,0.2)' : isPast ? 'rgba(107,114,128,0.2)' : 'rgba(234,179,8,0.2)';
        const badgeText = isPaid ? 'text-green-400' : isPast ? 'text-gray-500' : 'text-yellow-400';
        const badgeLabel = isPaid ? 'Pagado' : isPast ? 'Pasado' : 'Próxima';

        card.innerHTML = `
            <div class="flex items-start justify-between gap-2 mb-2">
                <div>
                    <p class="font-semibold text-white capitalize mb-0">${fecha}</p>
                    <p class="text-sm text-gray-400 mb-0">${hora}</p>
                </div>
                <span class="text-xs px-2 py-1 rounded-full ${badgeText}"
                      style="background:${badgeColor}; border:1px solid ${badgeBorder}; white-space:nowrap;">
                    ${badgeLabel}
                </span>
            </div>
            <div class="flex flex-wrap gap-1 mt-2">
                ${servicios.map(s => `<span class="text-xs px-2 py-0.5 rounded" style="background:rgba(244,200,44,0.1); color:#F4C82C; border:1px solid rgba(244,200,44,0.2);">${s}</span>`).join('')}
            </div>
            ${precio ? `<p class="text-sm text-gray-500 mt-2">₡${Number(precio).toLocaleString('es-CR')}</p>` : ''}
        `;
        container.appendChild(card);
    });
}

document.addEventListener('DOMContentLoaded', init);
