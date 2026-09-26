var g_overrides = new Map();
var currentOverrideType = 'all-day';

function init() { bringData(); }

async function bringData() {
    const { data } = await axios.get('/api/v1/special');
    g_overrides.clear();
    const list = document.getElementById('overridesList');
    const empty = document.getElementById('emptyState');

    if (!data.length) {
        list.innerHTML = '';
        list.appendChild(empty);
        empty.style.display = 'block';
        return;
    }

    empty.style.display = 'none';
    list.innerHTML = '';

    // Sort by start date descending
    data.sort((a, b) => new Date(b.start) - new Date(a.start));

    data.forEach((e, i) => {
        g_overrides.set(e._id, e);
        addOverrideCard(e, i);
    });
}

function addOverrideCard(item, i) {
    const start = moment(item.start);
    const end = moment(item.end);
    const isSameDay = start.isSame(end, 'day');
    const isPast = moment().isAfter(end);

    const dateLabel = isSameDay
        ? start.format('dddd DD [de] MMMM YYYY')
        : `${start.format('DD MMM YYYY')} → ${end.format('DD MMM YYYY')}`;

    const el = document.createElement('div');
    el.className = 'rounded-xl border border-white/10 p-4 flex items-center justify-between gap-4 animate__animated animate__fadeInDown';
    el.style.cssText = `background:#0d0d0d; animation-delay:${i * 40}ms; border-left: 4px solid ${isPast ? '#374151' : '#e44e4e'};`;
    el.innerHTML = `
        <div class="flex items-center gap-4">
            <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                 style="background:${isPast ? 'rgba(55,65,81,0.2)' : 'rgba(228,78,78,0.15)'};">
                <i class="fa-solid fa-calendar-xmark" style="color:${isPast ? '#6b7280' : '#e44e4e'};"></i>
            </div>
            <div>
                <div class="font-semibold text-white">${item.title}</div>
                <div class="text-sm text-gray-500 capitalize">${dateLabel}</div>
                <span class="text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${isPast ? 'bg-gray-800 text-gray-500' : 'bg-red-500/10 text-red-400'}">
                    ${isPast ? 'Pasado' : 'Activo'}
                </span>
            </div>
        </div>
        <button class="btn btn-sm" style="background:rgba(220,38,38,0.15); color:#f87171; border:1px solid rgba(220,38,38,0.3);"
                onclick="eliminarOverride('${item._id}')">
            <i class="fa-solid fa-trash"></i>
        </button>
    `;
    document.getElementById('overridesList').appendChild(el);
}

function openAddModal() {
    // Reset form
    document.getElementById('override-title').value = '';
    document.getElementById('override-start').value = '';
    document.getElementById('override-end').value = '';
    setOverrideType('all-day', document.querySelector('[data-type="all-day"]'));
    document.getElementById('addOverrideModal').classList.add('modal-open');
    document.body.style.overflow = 'hidden';
}

function setOverrideType(type, btn) {
    currentOverrideType = type;
    document.querySelectorAll('.override-type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const endField = document.getElementById('endDateField');
    endField.style.display = type === 'range' ? 'block' : 'none';
}

async function createOverride() {
    const title = document.getElementById('override-title').value.trim();
    const startVal = document.getElementById('override-start').value;
    const endVal = document.getElementById('override-end').value;

    if (!title || !startVal) {
        Swal.fire({ icon: 'warning', text: 'Completa el motivo y la fecha de inicio', background: '#0d0d0d', color: '#f1f1f1' });
        return;
    }

    const start = moment(startVal).startOf('day');
    const end = currentOverrideType === 'range' && endVal
        ? moment(endVal).endOf('day')
        : moment(startVal).endOf('day');

    if (end.isBefore(start)) {
        Swal.fire({ icon: 'warning', text: 'La fecha de fin debe ser después del inicio', background: '#0d0d0d', color: '#f1f1f1' });
        return;
    }

    await axios.post('/api/v1/special', {
        title,
        start: start.toISOString(),
        end: end.toISOString(),
        type: currentOverrideType,
        color: '#e44e4e',
        props: {}
    });

    document.getElementById('addOverrideModal').classList.remove('modal-open');
    document.body.style.overflow = '';

    const toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0d0d0d', color: '#f1f1f1' });
    toast.fire({ icon: 'success', title: 'Bloqueo creado' });
    await bringData();
}

async function eliminarOverride(id) {
    const item = g_overrides.get(id);
    const result = await Swal.fire({
        icon: 'warning',
        title: '¿Eliminar bloqueo?',
        text: `"${item.title}" — ${moment(item.start).format('DD/MM/YYYY')}`,
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        customClass: { confirmButton: 'btn btn-danger ms-2', cancelButton: 'btn btn-dark' },
        buttonsStyling: false,
        background: '#0d0d0d',
        color: '#f1f1f1'
    });
    if (result.isConfirmed) {
        await axios.delete('/api/v1/special/' + id);
        const toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, background: '#0d0d0d', color: '#f1f1f1' });
        toast.fire({ icon: 'success', title: 'Eliminado' });
        await bringData();
    }
}

moment.locale('es');
document.addEventListener('DOMContentLoaded', init);
