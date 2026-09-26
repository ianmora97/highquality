var g_methods = new Map();
var currentEditId = null;

function init() {
    switchTab('pago');
    loadMethods();
    loadSettings();
}

function switchTab(name) {
    document.querySelectorAll('.settings-tab').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
        btn.classList.remove('text-white', 'border-primary');
        btn.classList.add('text-gray-400', 'border-transparent');
    });
    const tab = document.getElementById('tab-' + name);
    const btn = document.getElementById('tab-btn-' + name);
    if (tab) tab.style.display = 'block';
    if (btn) {
        btn.classList.remove('text-gray-400', 'border-transparent');
        btn.classList.add('text-white', 'border-primary');
    }
}

async function loadMethods() {
    const { data } = await axios.get('/api/v1/payment-method/all');
    g_methods.clear();
    data.forEach(m => g_methods.set(m._id, m));
    renderMethods(data);
}

function renderMethods(data) {
    const list = document.getElementById('paymentMethodsList');
    const empty = document.getElementById('emptyMethods');
    if (!data.length) {
        list.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';
    list.innerHTML = data.map(m => `
        <div class="flex items-center justify-between px-4 py-3 hover:bg-white/[.02] transition-colors" id="method-row-${m._id}">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.enable ? 'bg-success/10 text-success' : 'bg-white/5 text-gray-600'}">
                    <i class="fa-solid fa-${m.details ? 'mobile-screen' : 'money-bill-wave'} text-sm"></i>
                </div>
                <div>
                    <p class="text-sm font-medium text-white">${m.name}</p>
                    ${m.details ? `<p class="text-xs text-gray-500">${m.details}</p>` : ''}
                </div>
            </div>
            <div class="flex items-center gap-2">
                <div class="form-check form-switch mb-0">
                    <input class="form-check-input" type="checkbox" role="switch"
                        ${m.enable ? 'checked' : ''} onchange="toggleMethod('${m._id}', this.checked)">
                </div>
                <button class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/8 transition-all" onclick="openEditModal('${m._id}')">
                    <i class="fa-solid fa-pen text-xs"></i>
                </button>
                <button class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-500 hover:text-danger hover:bg-danger/10 transition-all" onclick="deleteMethod('${m._id}')">
                    <i class="fa-solid fa-trash text-xs"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function openAddModal() {
    currentEditId = null;
    document.getElementById('methodModalTitle').innerHTML = '<i class="fa-solid fa-credit-card"></i> Nuevo Método';
    document.getElementById('method-name').value = '';
    document.getElementById('method-details').value = '';
    document.getElementById('methodModal').classList.add('modal-open');
    document.body.style.overflow = 'hidden';
}

function openEditModal(id) {
    const m = g_methods.get(id);
    currentEditId = id;
    document.getElementById('methodModalTitle').innerHTML = '<i class="fa-solid fa-pen"></i> Editar Método';
    document.getElementById('method-name').value = m.name;
    document.getElementById('method-details').value = m.details || '';
    document.getElementById('methodModal').classList.add('modal-open');
    document.body.style.overflow = 'hidden';
}

async function saveMethod() {
    const name = document.getElementById('method-name').value.trim();
    if (!name) {
        Swal.fire({ icon: 'warning', text: 'El nombre es requerido', background: '#0d0d0d', color: '#f1f1f1' });
        return;
    }
    const body = { name, details: document.getElementById('method-details').value.trim() };
    if (currentEditId) {
        await axios.put(`/api/v1/payment-method/${currentEditId}`, body);
    } else {
        await axios.post('/api/v1/payment-method', body);
    }
    document.getElementById('methodModal').classList.remove('modal-open');
    document.body.style.overflow = '';
    await loadMethods();
    const toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, background: '#0d0d0d', color: '#f1f1f1' });
    toast.fire({ icon: 'success', title: currentEditId ? 'Actualizado' : 'Agregado' });
}

async function toggleMethod(id, enable) {
    await axios.put(`/api/v1/payment-method/${id}`, { enable });
    await loadMethods();
}

async function deleteMethod(id) {
    const result = await Swal.fire({
        title: '¿Eliminar?',
        text: 'Este método no estará disponible en los pagos.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Eliminar',
        cancelButtonText: 'Cancelar',
        background: '#0d0d0d',
        color: '#f1f1f1',
    });
    if (!result.isConfirmed) return;
    await axios.delete(`/api/v1/payment-method/${id}`);
    await loadMethods();
}

async function loadSettings() {
    const { data } = await axios.get('/api/v1/settings');
    document.getElementById('whatsapp-confirm-switch').checked = data.whatsappConfirmEnabled;
}

async function toggleWhatsappConfirm(enabled) {
    await axios.put('/api/v1/settings', { whatsappConfirmEnabled: enabled });
    const toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, background: '#0d0d0d', color: '#f1f1f1' });
    toast.fire({ icon: 'success', title: enabled ? 'Mensajes activados' : 'Mensajes desactivados' });
}

document.addEventListener('DOMContentLoaded', init);
