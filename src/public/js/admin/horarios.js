var g_horarios = new Map();

const DAYS_MAP = {
    "Monday": "Lunes", "Tuesday": "Martes", "Wednesday": "Miércoles",
    "Thursday": "Jueves", "Friday": "Viernes", "Saturday": "Sábado", "Sunday": "Domingo"
};

function init() { bringData(); }

async function bringData() {
    const { data } = await axios.get('/api/v1/horario');
    g_horarios.clear();
    data.forEach(e => g_horarios.set(e._id, e));
    fillData(data);
}

function fillData(data) {
    const container = document.getElementById('horarios');
    container.innerHTML = '';
    const ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const sorted = ORDER.map(d => data.find(h => h.day === d)).filter(Boolean);
    sorted.forEach((e, i) => addHorario(e, i + 1));
    updateKpis(sorted);
}

function updateKpis(sorted) {
    const abiertos = sorted.filter(d => d.enable);
    const cerrados = sorted.length - abiertos.length;
    let totalMinutes = 0;
    let totalSlots = 0;
    abiertos.forEach(d => {
        totalSlots += (d.hours || []).length;
        (d.blocks || []).forEach(b => {
            totalMinutes += toMinutes(b.end) - toMinutes(b.start);
        });
    });
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    document.getElementById('kpiDiasAbiertos').textContent = `${abiertos.length}/${sorted.length}`;
    document.getElementById('kpiHorasSemana').textContent = mins ? `${hrs}h ${mins}m` : `${hrs}h`;
    document.getElementById('kpiCitasSemana').textContent = totalSlots;
    document.getElementById('kpiDiasCerrados').textContent = cerrados;
}

function addHorario(item, i) {
    const dayName = DAYS_MAP[item.day] || item.day;
    const blocks = item.blocks || [];
    const slots = item.hours || [];
    const on = !!item.enable;

    const rangesHtml = blocks.map((b, idx) => {
        const gap = idx > 0 ? toMinutes(b.start) - toMinutes(blocks[idx - 1].end) : 0;
        const gapChip = gap > 0
            ? `<span class="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] px-2 py-1 rounded-lg bg-amber-500/8 border border-amber-400/20 text-amber-300/80">
                   <i class="fa-solid fa-mug-hot text-[10px]"></i> ${formatTime12(blocks[idx - 1].end)} – ${formatTime12(b.start)}
               </span>`
            : '';
        return gapChip + `
            <span class="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] px-2 py-1 rounded-lg bg-primary/10 border border-primary/25 text-primary">
                <i class="fa-regular fa-clock text-[10px]"></i> ${formatTime12(b.start)} – ${formatTime12(b.end)}
            </span>`;
    }).join('');

    const slotsHtml = slots.map(h =>
        `<span class="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-300">${h}</span>`
    ).join('');

    const el = document.createElement('div');
    el.className = 'rounded-xl border border-white/10 border-l-4 bg-[#0d0d0d] animate__animated animate__fadeInLeft animate__faster';
    el.style.animationDelay = `${i * 50}ms`;
    el.style.borderLeftColor = on ? '#1D4ED8' : '#374151';
    el.innerHTML = `
        <div class="p-3.5">
            <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${on ? 'bg-primary/10 border-primary/25 text-primary' : 'bg-white/5 border-white/10 text-gray-500'}">
                    <i class="fa-solid fa-calendar-day text-sm"></i>
                </div>
                <div class="min-w-0 flex-1 flex items-center gap-2">
                    <h5 class="font-bold text-base text-white mb-0 leading-none shrink-0">${dayName}</h5>
                    ${on ? '' : `<span class="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 bg-red-500/8 text-red-400/60">Cerrado</span>`}
                </div>
                <div class="flex items-center gap-2.5 shrink-0">
                    <div class="form-check form-switch form-check-lg mb-0">
                        <input class="form-check-input" type="checkbox" role="switch"
                            id="switch-${item.day}" onchange="cambiarestado('${item._id}')"
                            ${on ? 'checked' : ''}>
                    </div>
                    ${on ? `
                    <div class="w-px h-8 bg-white/10"></div>
                    <button class="h-10 px-3 flex items-center gap-2 rounded-xl text-sm text-gray-300 bg-white/5 border border-white/10 hover:text-white hover:bg-white/10 active:scale-95 transition-all"
                            onclick="openEditModal('${item._id}')">
                        <i class="fa-solid fa-pen text-xs"></i>
                        <span class="hidden sm:inline">Editar</span>
                    </button>` : ''}
                </div>
            </div>
            ${on ? `<div class="flex flex-wrap items-center gap-1.5 mt-2.5">${rangesHtml}</div>` : ''}
        </div>
        ${on ? `
        <button class="w-full flex items-center justify-center gap-2 py-2 border-t border-white/8 text-[11px] text-gray-500 hover:text-gray-300 hover:bg-white/[.02] transition-all"
                onclick="toggleHoras(this)">
            <span>${slots.length} citas</span>
            <i class="fa-solid fa-chevron-down text-[10px] transition-transform" data-chevron></i>
        </button>
        <div class="hidden px-3.5 pb-3.5 pt-3" data-hours>
            <div class="flex flex-wrap gap-1.5">${slotsHtml}</div>
        </div>` : ''}
    `;
    document.getElementById('horarios').appendChild(el);
}

function toggleHoras(btn) {
    const panel = btn.parentElement.querySelector('[data-hours]');
    const chevron = btn.querySelector('[data-chevron]');
    const isOpen = !panel.classList.contains('hidden');
    panel.classList.toggle('hidden', isOpen);
    chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
}

function toMinutes(hhmm) {
    const [h, m] = String(hhmm).split(':').map(Number);
    return h * 60 + m;
}

function formatTime12(time24) {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const ampm = h < 12 ? 'am' : 'pm';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function addMinutesToTimeStr(time24, delta) {
    const total = Math.min(toMinutes(time24) + delta, 23 * 60 + 30);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

// Mirrors baseSlots() in backend/helpers/slots.js: one appointment per hour,
// and a slot only fits while it ends within the block.
function computePreviewSlots(startTime, endTime) {
    if (!startTime || !endTime) return [];
    const slots = [];
    const end = toMinutes(endTime);
    for (let cur = toMinutes(startTime); cur + 30 <= end; cur += 60) {
        const h = Math.floor(cur / 60);
        const m = cur % 60;
        const ampm = h < 12 ? 'am' : 'pm';
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        slots.push(`${h12}:${String(m).padStart(2, '0')} ${ampm}`);
    }
    return slots;
}

function snapToHalfHour(date) {
    const snapped = new Date(date.getTime());
    const total = Math.round((date.getHours() * 60 + date.getMinutes()) / 30) * 30;
    const clamped = Math.min(total, 23 * 60 + 30);
    snapped.setHours(Math.floor(clamped / 60), clamped % 60, 0, 0);
    return snapped;
}

function timeStrToDate(str) {
    const [h, m] = str.split(':').map(Number);
    return new Date(2000, 0, 1, h, m);
}

function dateToTimeStr(d) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function openEditModal(id) {
    window.dispatchEvent(new CustomEvent('open-edit-horario', { detail: { id } }));
}

async function cambiarestado(id) {
    const h = g_horarios.get(id);
    await axios.put(`/api/v1/horario/${id}`, { enable: !h.enable });
    await bringData();
}

document.addEventListener('DOMContentLoaded', init);
