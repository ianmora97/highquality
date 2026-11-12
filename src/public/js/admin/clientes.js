/* Admin — Clientes
 * Single Alpine component: KPIs + searchable/sortable card list + the
 * detail/edit bottom sheet (nombre, teléfono, contraseña, historial).
 *
 * The list comes from GET /api/v1/client?page=..., which merges the unified
 * `users` accounts, the legacy `clients` rows and the citas stats server side
 * and hands back only the requested page — production has 200+ clients with
 * 100+ citas each and keeps growing, so nothing here ever asks for "all of
 * it": search/filter/sort run on the server, and both the client list and a
 * client's citas history page through their own endpoints.
 */

const AVATAR_HUES = [
    { ring: 'from-violet-400 to-purple-600',  text: 'text-violet-200',  soft: 'bg-violet-500/10 border-violet-400/25' },
    { ring: 'from-blue-400 to-primary',       text: 'text-blue-200',    soft: 'bg-blue-500/10 border-blue-400/25' },
    { ring: 'from-emerald-400 to-green-600',  text: 'text-emerald-200', soft: 'bg-emerald-500/10 border-emerald-400/25' },
    { ring: 'from-orange-400 to-red-600',     text: 'text-orange-200',  soft: 'bg-orange-500/10 border-orange-400/25' },
    { ring: 'from-amber-300 to-yellow-600',   text: 'text-amber-200',   soft: 'bg-amber-500/10 border-amber-400/25' },
    { ring: 'from-sky-400 to-cyan-600',       text: 'text-sky-200',     soft: 'bg-sky-500/10 border-sky-400/25' },
    { ring: 'from-fuchsia-400 to-pink-600',   text: 'text-fuchsia-200', soft: 'bg-fuchsia-500/10 border-fuchsia-400/25' },
];

const PAGE_SIZE = 24;
const HIST_PAGE_SIZE = 15;
const VIP_CITAS = 5;
const SEARCH_DEBOUNCE_MS = 350;

function crcMoney(n) {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' })
        .format(Number(n) || 0)
        .replace(/\D00(?=\D*$)/, '');
}

function toastOk(title, text) {
    if (window.HQ) return HQ.toast({ type: 'success', title, text, duration: 2600 });
    Swal.fire({ icon: 'success', title, background: '#0d0d0d', color: '#f1f1f1' });
}

function toastErr(title, text) {
    if (window.HQ) return HQ.toast({ type: 'error', title, text, duration: 4000 });
    Swal.fire({ icon: 'error', title, text, background: '#0d0d0d', color: '#f1f1f1' });
}

function clientesPage() {
    return {
        // ── list state (server-paginated) ──
        clientes: [],              // accumulated pages 1..this.page for the current filter
        summary: { total: 0, conCuenta: 0, recurrentes: 0, ingresos: 0 },
        loading: true,              // first fetch of a fresh filter/search
        loadingMore: false,         // "mostrar más" fetching the next page
        page: 1,
        pages: 1,
        total: 0,
        query: '',
        filtro: 'todos',           // todos | cuenta | sincuenta | vip
        orden: 'recientes',        // recientes | citas | gasto | nombre | nuevos
        ordenOpen: false,
        _searchTimer: null,

        // ── sheet state ──
        open: false,
        mode: 'add',                // add | edit
        saving: false,
        errorMsg: '',
        actual: null,                // the client the sheet is showing
        historial: [],
        historialPage: 1,
        historialPages: 1,
        historialTotal: 0,
        loadingHistorial: false,
        loadingMoreHistorial: false,
        cambiarPass: false,
        verPass: false,
        form: { id: null, name: '', phone: '', password: '', password2: '' },

        // ── drag to dismiss ──
        dragY: 0,
        dragging: false,
        _dragStartY: 0,

        ordenes: [
            ['recientes', 'Visita más reciente', 'fa-clock-rotate-left'],
            ['citas',     'Más citas',           'fa-calendar-check'],
            ['gasto',     'Más gasto',           'fa-coins'],
            ['nombre',    'Nombre (A-Z)',        'fa-arrow-down-a-z'],
            ['nuevos',    'Registro más nuevo',  'fa-user-plus'],
        ],

        init() {
            // Filter/order change → fresh page 1. Search is debounced so
            // typing doesn't fire a request per keystroke.
            this.$watch('filtro', () => this.buscar());
            this.$watch('orden', () => this.buscar());
            this.cargar(1, false);
        },

        // ═══ data ═══
        onQueryInput() {
            clearTimeout(this._searchTimer);
            this._searchTimer = setTimeout(() => this.buscar(), SEARCH_DEBOUNCE_MS);
        },

        buscar() { this.cargar(1, false); },

        async cargar(page, append) {
            if (append) this.loadingMore = true; else this.loading = true;
            try {
                const { data } = await axios.get('/api/v1/client', {
                    params: {
                        page,
                        limit: PAGE_SIZE,
                        search: this.query.trim(),
                        filtro: this.filtro,
                        orden: this.orden,
                    },
                });
                this.clientes = append ? this.clientes.concat(data.data) : data.data;
                this.summary  = data.summary;
                this.page     = data.page;
                this.pages    = data.pages;
                this.total    = data.total;
            } catch (e) {
                toastErr('No se pudieron cargar los clientes');
            } finally {
                this.loading = false;
                this.loadingMore = false;
            }
        },

        /** Re-fetch every page currently loaded (1..this.page) after a mutation, keeping scroll depth. */
        async recargar() {
            const upTo = this.page;
            this.loading = true;
            try {
                let acc = [];
                let last = null;
                for (let p = 1; p <= upTo; p++) {
                    const { data } = await axios.get('/api/v1/client', {
                        params: { page: p, limit: PAGE_SIZE, search: this.query.trim(), filtro: this.filtro, orden: this.orden },
                    });
                    acc = acc.concat(data.data);
                    last = data;
                }
                this.clientes = acc;
                if (last) { this.summary = last.summary; this.pages = last.pages; this.total = last.total; }
            } catch (e) {
                toastErr('No se pudo actualizar la lista');
            } finally {
                this.loading = false;
            }
        },

        hayMas()  { return this.page < this.pages; },
        verMas()  { if (this.hayMas()) this.cargar(this.page + 1, true); },
        limpiar() { this.query = ''; this.filtro = 'todos'; this.orden = 'recientes'; this.buscar(); },
        ordenLabel() {
            const hit = this.ordenes.find(o => o[0] === this.orden);
            return hit ? hit[1] : '';
        },

        // ═══ card helpers ═══
        iniciales(c) {
            const parts = String(c.name || '?').trim().split(/\s+/).slice(0, 2);
            return parts.map(p => p.charAt(0).toUpperCase()).join('') || '?';
        },

        hue(c) {
            const key = String(c.phone || c._id || '0').replace(/\D/g, '') || '0';
            const n = key.split('').reduce((acc, d) => acc + Number(d), 0);
            return AVATAR_HUES[n % AVATAR_HUES.length];
        },

        tel(c)      { return String(c.phone || '').replace(/(\d{4})(\d{4})/, '$1-$2'); },
        dinero(v)   { return crcMoney(v); },
        esVip(c)    { return (c.citas || 0) >= VIP_CITAS; },

        cuando(v) {
            if (!v) return 'Sin citas';
            const m = moment(v);
            // A future date is the next cita, not the last one.
            return m.isAfter(moment()) ? 'Cita ' + m.fromNow() : 'Visitó ' + m.fromNow();
        },

        fecha(v) { return v ? moment(v).format('D MMM YYYY') : '—'; },
        hora(v)  { return v ? moment(v).format('h:mm a') : ''; },

        // ═══ sheet ═══
        abrirNuevo() {
            this.mode = 'add';
            this.actual = null;
            this.historial = [];
            this.historialPage = 1;
            this.historialPages = 1;
            this.historialTotal = 0;
            this.form = { id: null, name: '', phone: '', password: '', password2: '' };
            this.cambiarPass = false;
            this.verPass = false;
            this.errorMsg = '';
            this.open = true;
        },

        abrirEditar(c) {
            this.mode = 'edit';
            this.actual = c;
            this.form = {
                id: c._id,
                name: c.name || '',
                phone: String(c.phone || ''),
                password: '',
                password2: '',
            };
            this.cambiarPass = false;
            this.verPass = false;
            this.errorMsg = '';
            this.historial = [];
            this.historialPage = 1;
            this.historialPages = 1;
            this.historialTotal = 0;
            this.open = true;
            this.cargarHistorial(c._id, 1, false);
        },

        cerrar() { this.open = false; },

        async cargarHistorial(id, page, append) {
            if (append) this.loadingMoreHistorial = true; else this.loadingHistorial = true;
            try {
                const { data } = await axios.get(`/api/v1/client/${id}/citas`, {
                    params: { page, limit: HIST_PAGE_SIZE },
                });
                this.historial = append ? this.historial.concat(data.data) : data.data;
                this.historialPage  = data.page;
                this.historialPages = data.pages;
                this.historialTotal = data.total;
            } catch (e) {
                if (!append) this.historial = [];
            } finally {
                this.loadingHistorial = false;
                this.loadingMoreHistorial = false;
            }
        },

        hayMasHistorial() { return this.historialPage < this.historialPages; },
        verMasHistorial() {
            if (this.hayMasHistorial()) this.cargarHistorial(this.form.id, this.historialPage + 1, true);
        },

        servicios(cita) {
            const list = (cita.extendedProps && cita.extendedProps.servicios) || [];
            return list.join(', ') || 'Cita';
        },

        pagada(cita) { return cita.extendedProps && cita.extendedProps.estado === 'PAGO'; },
        precio(cita) { return crcMoney((cita.extendedProps && cita.extendedProps.precio) || 0); },

        // ═══ save / delete ═══
        validar() {
            if (!this.form.name.trim()) return 'Escribe el nombre del cliente.';
            if (!/^\d{8}$/.test(this.form.phone.replace(/\D/g, ''))) return 'El teléfono debe tener 8 dígitos.';
            if (this.pideClave()) {
                if (this.form.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
                if (this.form.password !== this.form.password2) return 'Las contraseñas no coinciden.';
            }
            return '';
        },

        /** true when the form is actually setting a password right now. */
        pideClave() {
            if (this.mode === 'add') return !!this.form.password;
            return this.cambiarPass && !!this.form.password;
        },

        async guardar() {
            const error = this.validar();
            if (error) { this.errorMsg = error; return; }
            this.errorMsg = '';
            this.saving = true;
            try {
                const payload = {
                    name: this.form.name.trim(),
                    phone: this.form.phone.replace(/\D/g, ''),
                };
                if (this.pideClave()) payload.password = this.form.password;

                if (this.mode === 'add') {
                    await axios.post('/api/v1/client', payload);
                } else {
                    await axios.put(`/api/v1/client/${this.form.id}`, payload);
                }

                this.open = false;
                await this.recargar();
                toastOk(
                    this.mode === 'add' ? 'Cliente creado' : 'Cliente actualizado',
                    payload.name
                );
            } catch (e) {
                this.errorMsg = e.response?.data?.error || 'Error al guardar. Intenta de nuevo.';
            } finally {
                this.saving = false;
            }
        },

        async quitarCuenta() {
            const result = await Swal.fire({
                title: '¿Quitar la cuenta?',
                text: `${this.form.name} no podrá volver a ingresar hasta que se cree una contraseña nueva. Su historial de citas se mantiene.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Quitar cuenta',
                cancelButtonText: 'Cancelar',
                background: '#0d0d0d',
                color: '#f1f1f1',
                customClass: { confirmButton: 'hq-swal-danger' },
            });
            if (!result.isConfirmed) return;

            this.saving = true;
            try {
                await axios.delete(`/api/v1/client/${this.form.id}/account`);
                this.open = false;
                await this.recargar();
                toastOk('Cuenta eliminada', this.form.name);
            } catch (e) {
                this.errorMsg = e.response?.data?.error || 'No se pudo quitar la cuenta.';
            } finally {
                this.saving = false;
            }
        },

        async eliminar() {
            const result = await Swal.fire({
                title: '¿Eliminar cliente?',
                text: `"${this.form.name}" se borra del directorio. Las citas ya registradas se mantienen en el calendario.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Eliminar',
                cancelButtonText: 'Cancelar',
                background: '#0d0d0d',
                color: '#f1f1f1',
                customClass: { confirmButton: 'hq-swal-danger' },
            });
            if (!result.isConfirmed) return;

            this.saving = true;
            try {
                await axios.delete(`/api/v1/client/${this.form.id}`);
                this.open = false;
                await this.recargar();
                toastOk('Cliente eliminado');
            } catch (e) {
                this.errorMsg = e.response?.data?.error || 'No se pudo eliminar el cliente.';
            } finally {
                this.saving = false;
            }
        },

        // ═══ drag to dismiss ═══
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
            if (this.dragY > 90) this.cerrar();
            this.dragY = 0;
        },
    };
}
