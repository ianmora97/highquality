var g_horarios = new Map();
var currentEditId = null;

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
}

function addHorario(item, i) {
    const dayName = DAYS_MAP[item.day] || item.day;
    const hasRange = item.startTime && item.endTime;
    const slots = item.hours || [];

    let rangeDisplay = '';
    if (hasRange) {
        rangeDisplay = `<span class="text-white font-semibold">${formatTime12(item.startTime)}</span>
            <i class="fa-solid fa-arrow-right text-gray-600 mx-2"></i>
            <span class="text-white font-semibold">${formatTime12(item.endTime)}</span>`;
    } else if (slots.length) {
        rangeDisplay = `<span class="text-gray-400 text-sm">${slots.length} horarios individuales</span>`;
    } else {
        rangeDisplay = `<span class="text-gray-600 text-sm">Sin horario definido</span>`;
    }

    const slotsHtml = slots.slice(0, 6).map(h =>
        `<span class="text-xs px-2 py-0.5 rounded" style="background:#1a1a1a; color:${item.enable ? '#3004f3' : '#6b7280'}; border:1px solid ${item.enable ? 'rgba(48,4,243,0.3)' : 'rgba(107,114,128,0.2)'};">${h}</span>`
    ).join('') + (slots.length > 6 ? `<span class="text-xs text-gray-600">+${slots.length - 6} más</span>` : '');

    const el = document.createElement('div');
    el.className = 'rounded-xl border border-white/10 border-l-4 p-4 animate__animated animate__fadeInLeft animate__faster bg-[#0d0d0d]';
    el.style.animationDelay = `${i * 50}ms`;
    el.style.borderLeftColor = item.enable ? '#3004f3' : '#374151';
    el.innerHTML = `
        <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-3">
                <h5 class="font-bold text-lg mb-0">${dayName}</h5>
                <div class="flex items-center gap-2">${rangeDisplay}</div>
            </div>
            <div class="flex items-center gap-2">
                <div class="form-check form-switch mb-0">
                    <input class="form-check-input" type="checkbox" role="switch"
                        id="switch-${item.day}" onchange="cambiarestado('${item._id}')"
                        ${item.enable ? 'checked' : ''}>
                </div>
                <button class="btn btn-dark btn-sm rounded-pill" onclick="openEditModal('${item._id}')">
                    <i class="fa-solid fa-pen"></i>
                </button>
            </div>
        </div>
        <div class="flex flex-wrap gap-1">${slotsHtml}</div>
    `;
    document.getElementById('horarios').appendChild(el);
}

function formatTime12(time24) {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const ampm = h < 12 ? 'am' : 'pm';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function computePreviewSlots(startTime, endTime) {
    if (!startTime || !endTime) return [];
    const slots = [];
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    let cur = sh * 60 + sm;
    const end = eh * 60 + em;
    while (cur < end) {
        const h = Math.floor(cur / 60);
        const m = cur % 60;
        const ampm = h < 12 ? 'am' : 'pm';
        const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
        slots.push(`${h12}:${String(m).padStart(2, '0')} ${ampm}`);
        cur += 30;
    }
    return slots;
}

function updateSlotsPreview() {
    const start = document.getElementById('editStartTime').value;
    const end = document.getElementById('editEndTime').value;
    const preview = document.getElementById('slotsPreview');
    const slots = computePreviewSlots(start, end);
    if (!slots.length) {
        preview.innerHTML = '<span class="text-gray-600 text-xs">Selecciona inicio y fin</span>';
        return;
    }
    preview.innerHTML = slots.map(s =>
        `<span class="text-xs px-2 py-0.5 rounded-full" style="background:rgba(48,4,243,0.15); color:#7c6af7; border:1px solid rgba(48,4,243,0.3);">${s}</span>`
    ).join('');
}

function openEditModal(id) {
    const item = g_horarios.get(id);
    currentEditId = id;
    document.getElementById('editDayName').textContent = DAYS_MAP[item.day] || item.day;
    document.getElementById('editStartTime').value = item.startTime || '';
    document.getElementById('editEndTime').value = item.endTime || '';
    updateSlotsPreview();

    // Remove old listeners before adding new ones to avoid duplicate firings
    const startInput = document.getElementById('editStartTime');
    const endInput = document.getElementById('editEndTime');
    startInput.replaceWith(startInput.cloneNode(true));
    endInput.replaceWith(endInput.cloneNode(true));
    document.getElementById('editStartTime').addEventListener('input', updateSlotsPreview);
    document.getElementById('editEndTime').addEventListener('input', updateSlotsPreview);

    document.getElementById('editHorario').classList.add('modal-open');
    document.body.style.overflow = 'hidden';
}

async function actualizarHorario() {
    const startTime = document.getElementById('editStartTime').value;
    const endTime = document.getElementById('editEndTime').value;
    if (!startTime || !endTime) {
        Swal.fire({ icon: 'warning', text: 'Selecciona hora de inicio y cierre', background: '#0d0d0d', color: '#f1f1f1' });
        return;
    }
    if (startTime >= endTime) {
        Swal.fire({ icon: 'warning', text: 'La hora de inicio debe ser antes que la de cierre', background: '#0d0d0d', color: '#f1f1f1' });
        return;
    }
    const hours = computePreviewSlots(startTime, endTime);
    await axios.put(`/api/v1/horario/${currentEditId}`, { startTime, endTime, hours });
    document.getElementById('editHorario').classList.remove('modal-open');
    document.body.style.overflow = '';
    await bringData();
    const toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, background: '#0d0d0d', color: '#f1f1f1' });
    toast.fire({ icon: 'success', title: 'Horario actualizado' });
}

async function cambiarestado(id) {
    const h = g_horarios.get(id);
    await axios.put(`/api/v1/horario/${id}`, { enable: !h.enable });
    await bringData();
}

document.addEventListener('DOMContentLoaded', init);
