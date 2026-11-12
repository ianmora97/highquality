/* /dashboard/configuracion — payment methods, public contact info, the
   plain-text horario block and notification switches. */

const toast = (icon, title) => Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 1600,
    background: '#0d0d0d', color: '#f1f1f1',
}).fire({ icon, title });

const BLANK_CONTACT = {
    address: '', phone: '', whatsapp: '', whatsappText: '',
    instagram: '', maps: '', waze: '',
};

// Mirrors the `.btn-socials--*` hues in input.css so the preview matches the page.
const SOCIAL_STYLE = {
    tel:       { icon: 'fa-solid fa-phone',        label: 'Llamar',       color: '#f4c82c', color2: '#e0a800' },
    instagram: { icon: 'fa-brands fa-instagram',   label: 'Instagram',    color: '#e1306c', color2: '#f77737' },
    whatsapp:  { icon: 'fa-brands fa-whatsapp',    label: 'WhatsApp',     color: '#25d366', color2: '#128c7e' },
    maps:      { icon: 'fa-solid fa-location-dot', label: 'Google Maps',  color: '#4285f4', color2: '#1a73e8' },
    waze:      { icon: 'fa-brands fa-waze',        label: 'Waze',         color: '#33ccff', color2: '#0b7fa8' },
};

const digits = (v) => String(v || '').replace(/\D/g, '');

function configuracionPage() {
    return {
        tabs: [
            { id: 'pago',           label: 'Pagos',          icon: 'fa-solid fa-credit-card' },
            { id: 'contacto',       label: 'Contacto',       icon: 'fa-solid fa-address-book' },
            { id: 'horario',        label: 'Horario',        icon: 'fa-solid fa-clock' },
            { id: 'notificaciones', label: 'Notificaciones', icon: 'fa-solid fa-bell' },
        ],
        tab: 'pago',

        // ── settings ──
        form: { contact: { ...BLANK_CONTACT }, schedule: [] },
        saved: '',                 // JSON snapshot of the last persisted form
        whatsappConfirmEnabled: true,
        saving: false,

        // ── payment methods ──
        metodos: [],
        loadingMetodos: true,
        sheet: false,
        metodoMode: 'add',
        metodoId: null,
        metodoForm: { name: '', details: '' },
        metodoError: '',
        savingMetodo: false,
        dragY: 0,
        dragging: false,

        init() {
            this.cargarSettings();
            this.cargarMetodos();
        },

        // ───────── settings ─────────
        async cargarSettings() {
            const { data } = await axios.get('/api/v1/settings');
            this.whatsappConfirmEnabled = !!data.whatsappConfirmEnabled;
            this.form = {
                contact:  { ...BLANK_CONTACT, ...(data.contact || {}) },
                schedule: (data.schedule || []).map(r => ({
                    label: r.label || '', value: r.value || '', closed: !!r.closed,
                })),
            };
            this.saved = JSON.stringify(this.form);
        },

        dirty() {
            return this.saved !== '' && JSON.stringify(this.form) !== this.saved;
        },

        descartar() {
            this.form = JSON.parse(this.saved);
        },

        async guardar() {
            this.saving = true;
            try {
                const { data } = await axios.put('/api/v1/settings', {
                    contact:  this.form.contact,
                    schedule: this.form.schedule,
                });
                this.form = {
                    contact:  { ...BLANK_CONTACT, ...(data.contact || {}) },
                    schedule: (data.schedule || []).map(r => ({
                        label: r.label || '', value: r.value || '', closed: !!r.closed,
                    })),
                };
                this.saved = JSON.stringify(this.form);
                toast('success', 'Configuración guardada');
            } catch (e) {
                toast('error', 'No se pudo guardar');
            } finally {
                this.saving = false;
            }
        },

        async toggleWhatsappConfirm(enabled) {
            this.whatsappConfirmEnabled = enabled;
            await axios.put('/api/v1/settings', { whatsappConfirmEnabled: enabled });
            toast('success', enabled ? 'Mensajes activados' : 'Mensajes desactivados');
        },

        // ───────── contacto preview ─────────
        igHandle() {
            const raw = (this.form.contact.instagram || '').trim();
            if (!raw) return '';
            if (/^https?:\/\//i.test(raw)) {
                const m = raw.match(/instagram\.com\/([^/?#]+)/i);
                return m ? '@' + m[1] : raw;
            }
            return '@' + raw.replace(/^@/, '');
        },

        igUrl() {
            const raw = (this.form.contact.instagram || '').trim();
            if (!raw) return '';
            return /^https?:\/\//i.test(raw) ? raw : 'https://www.instagram.com/' + raw.replace(/^@/, '');
        },

        previewSocials() {
            const c   = this.form.contact;
            const tel = digits(c.phone);
            const wa  = digits(c.whatsapp);
            const out = [];
            if (tel)     out.push({ key: 'tel',       href: 'tel:+' + tel, ...SOCIAL_STYLE.tel });
            if (c.instagram) out.push({ key: 'instagram', href: this.igUrl(), ...SOCIAL_STYLE.instagram });
            if (wa)      out.push({ key: 'whatsapp',  href: `https://wa.me/${wa}?text=${encodeURIComponent(c.whatsappText || '')}`, ...SOCIAL_STYLE.whatsapp });
            if (c.maps)  out.push({ key: 'maps',      href: c.maps, ...SOCIAL_STYLE.maps });
            if (c.waze)  out.push({ key: 'waze',      href: c.waze, ...SOCIAL_STYLE.waze });
            return out;
        },

        // ───────── horario (texto) ─────────
        agregarFila() {
            this.form.schedule.push({ label: '', value: '', closed: false });
        },
        quitarFila(i) {
            this.form.schedule.splice(i, 1);
        },
        moverFila(i, delta) {
            const j = i + delta;
            if (j < 0 || j >= this.form.schedule.length) return;
            const rows = this.form.schedule;
            [rows[i], rows[j]] = [rows[j], rows[i]];
        },

        // ───────── métodos de pago ─────────
        async cargarMetodos() {
            this.loadingMetodos = true;
            const { data } = await axios.get('/api/v1/payment-method/all');
            this.metodos = data;
            this.loadingMetodos = false;
        },

        activos()    { return this.metodos.filter(m => m.enable).length; },
        inactivos()  { return this.metodos.filter(m => !m.enable).length; },

        abrirNuevoMetodo() {
            this.metodoMode = 'add';
            this.metodoId   = null;
            this.metodoForm = { name: '', details: '' };
            this.metodoError = '';
            this.abrirSheet();
        },

        abrirEditarMetodo(id) {
            const m = this.metodos.find(x => x._id === id);
            if (!m) return;
            this.metodoMode = 'edit';
            this.metodoId   = id;
            this.metodoForm = { name: m.name || '', details: m.details || '' };
            this.metodoError = '';
            this.abrirSheet();
        },

        abrirSheet() {
            this.sheet = true;
            document.body.style.overflow = 'hidden';
        },

        cerrarSheet() {
            this.sheet = false;
            this.dragY = 0;
            document.body.style.overflow = '';
        },

        async guardarMetodo() {
            const name = (this.metodoForm.name || '').trim();
            if (!name) {
                this.metodoError = 'El nombre es requerido.';
                return;
            }
            this.savingMetodo = true;
            try {
                const body = { name, details: (this.metodoForm.details || '').trim() };
                if (this.metodoId) await axios.put(`/api/v1/payment-method/${this.metodoId}`, body);
                else               await axios.post('/api/v1/payment-method', body);
                this.cerrarSheet();
                await this.cargarMetodos();
                toast('success', this.metodoId ? 'Actualizado' : 'Agregado');
            } catch (e) {
                this.metodoError = 'No se pudo guardar.';
            } finally {
                this.savingMetodo = false;
            }
        },

        async toggleMetodo(id, enable) {
            await axios.put(`/api/v1/payment-method/${id}`, { enable });
            await this.cargarMetodos();
        },

        async borrarMetodo(id) {
            const r = await Swal.fire({
                title: '¿Eliminar?',
                text: 'Este método no estará disponible en los pagos.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Eliminar',
                cancelButtonText: 'Cancelar',
                background: '#0d0d0d',
                color: '#f1f1f1',
            });
            if (!r.isConfirmed) return;
            await axios.delete(`/api/v1/payment-method/${id}`);
            await this.cargarMetodos();
            toast('success', 'Eliminado');
        },

        // ── drag-to-dismiss (mobile sheet) ──
        onDragStart(e) {
            this.dragging = true;
            this._dragStartY = e.touches[0].clientY;
        },
        onDragMove(e) {
            if (!this.dragging) return;
            this.dragY = Math.max(0, e.touches[0].clientY - this._dragStartY);
        },
        onDragEnd() {
            this.dragging = false;
            if (this.dragY > 90) this.cerrarSheet();
            this.dragY = 0;
        },
    };
}
