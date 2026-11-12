/* Admin — Bloqueos (specials)
 * A block closes whole days: `start` is the first day at 00:00 and `end` the
 * last day at 23:59, which is exactly what validateSlot and /special/check read.
 * Partial-day closures are a different mechanism ("Cerrado" citas in the panel).
 *
 * One Alpine component drives the month calendar, the list and the sheet, so
 * every mutation just reloads the three data sources.
 */

const MOTIVOS = [
    { t: 'Vacaciones',    i: 'fa-solid fa-umbrella-beach' },
    { t: 'Feriado',       i: 'fa-solid fa-flag' },
    { t: 'Día libre',     i: 'fa-solid fa-mug-hot' },
    { t: 'Enfermedad',    i: 'fa-solid fa-notes-medical' },
    { t: 'Mantenimiento', i: 'fa-solid fa-screwdriver-wrench' },
    { t: 'Capacitación',  i: 'fa-solid fa-graduation-cap' },
    { t: 'Viaje',         i: 'fa-solid fa-plane' },
    { t: 'Evento',        i: 'fa-solid fa-champagne-glasses' },
];

const ICONO_DEFECTO = 'fa-solid fa-calendar-xmark';
const SENTINEL_PHONE = '88008800';

function iconoDeMotivo(title) {
    const hit = MOTIVOS.find(m => m.t.toLowerCase() === String(title || '').trim().toLowerCase());
    return hit ? hit.i : ICONO_DEFECTO;
}

function hqOk(title, text) {
    if (window.HQ) return HQ.toast({ type: 'success', title, text, duration: 2600 });
    Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1600, background: '#0d0d0d', color: '#f1f1f1' })
        .fire({ icon: 'success', title });
}

function hqErr(title, text) {
    if (window.HQ) return HQ.toast({ type: 'error', title, text, duration: 4000 });
    Swal.fire({ icon: 'error', title, text, background: '#0d0d0d', color: '#f1f1f1' });
}

// A cita the barber actually has to move — the sentinel client and the
// "Cerrado" placeholders are bookkeeping, not people.
function esCitaReal(e) {
    const props = e.extendedProps || {};
    if (props.numero === SENTINEL_PHONE) return false;
    if (e.title === 'Cerrado') return false;
    return !(props.servicios || []).includes('Cerrado');
}

function bloqueosPage() {
    return {
        MOTIVOS,

        // ── list state ──
        bloqueos: [],
        loading: true,
        query: '',
        filtro: 'activos',        // activos | pasados | todos

        // citas inside the upcoming blocks (per-card + KPI warnings)
        citasBloqueadas: [],

        // ── page calendar ──
        calY: moment().year(),
        calM: moment().month(),
        mesCitas: {},             // 'YYYY-MM-DD' → nº de citas
        diasAbiertos: {},         // 'Monday' → bool

        hoyIso: moment().format('YYYY-MM-DD'),

        // ── sheet ──
        open: false,
        mode: 'add',              // add | edit
        saving: false,
        errorMsg: '',
        form: { id: null, title: '', icon: ICONO_DEFECTO, start: '', end: '' },
        pickY: moment().year(),
        pickM: moment().month(),

        conflictos: [],
        conflictLoading: false,
        _conflictTimer: null,

        // ── drag to dismiss ──
        dragY: 0,
        dragging: false,
        _dragStartY: 0,

        PRESETS: [
            { t: 'Hoy',            dias: 0, desde: 0 },
            { t: 'Mañana',         dias: 0, desde: 1 },
            { t: 'Fin de semana',  weekend: true },
            { t: 'Próximos 7 días', dias: 6, desde: 0 },
        ],

        init() {
            this.cargar();
            this.cargarHorarios();
            this.cargarMes();

            // The range drives the conflict list, debounced so dragging a
            // selection does not fire a request per tap.
            this.$watch('form.start', () => this.pedirConflictos());
            this.$watch('form.end',   () => this.pedirConflictos());

            if (window.HQ) {
                HQ.on('special:update', () => { this.cargar(); this.cargarMes(); });
                HQ.on('cita:new',    () => { this.cargarMes(); this.cargarCitasBloqueadas(); });
                HQ.on('cita:delete', () => { this.cargarMes(); this.cargarCitasBloqueadas(); });
            }
        },

        // ═══ data ═══
        async cargar() {
            try {
                const { data } = await axios.get('/api/v1/special');
                this.bloqueos = (data || [])
                    .map(b => this.decorar(b))
                    .sort((a, b) => {
                        const rank = { vigente: 0, proximo: 1, pasado: 2 };
                        if (rank[a._estado] !== rank[b._estado]) return rank[a._estado] - rank[b._estado];
                        return a._estado === 'pasado'
                            ? new Date(b.start) - new Date(a.start)
                            : new Date(a.start) - new Date(b.start);
                    });
                await this.cargarCitasBloqueadas();
            } catch (e) {
                hqErr('No se pudieron cargar los bloqueos');
            } finally {
                this.loading = false;
            }
        },

        async cargarHorarios() {
            try {
                const { data } = await axios.get('/api/v1/horario');
                const map = {};
                (data || []).forEach(h => { map[h.day] = !!h.enable && !!(h.blocks || []).length; });
                this.diasAbiertos = map;
            } catch (e) { /* the calendar just won't dim closed weekdays */ }
        },

        async cargarMes() {
            try {
                const mes = moment([this.calY, this.calM, 1]).format('YYYY-MM-DD');
                const { data } = await axios.get('/api/v1/event/month', { params: { month: mes } });
                const map = {};
                (data || []).filter(esCitaReal).forEach(e => {
                    const k = moment(e.start).format('YYYY-MM-DD');
                    map[k] = (map[k] || 0) + 1;
                });
                this.mesCitas = map;
            } catch (e) { /* dots are decoration */ }
        },

        // One range query over every block that has not finished yet.
        async cargarCitasBloqueadas() {
            const futuros = this.bloqueos.filter(b => b._estado !== 'pasado');
            if (!futuros.length) { this.citasBloqueadas = []; return; }
            const desde = futuros.reduce((min, b) => (b._sIso < min ? b._sIso : min), futuros[0]._sIso);
            const hasta = futuros.reduce((max, b) => (b._eIso > max ? b._eIso : max), futuros[0]._eIso);
            try {
                const { data } = await axios.get('/api/v1/event/range', { params: { start: desde, end: hasta } });
                this.citasBloqueadas = (data || []).filter(esCitaReal);
            } catch (e) {
                this.citasBloqueadas = [];
            }
        },

        // Derived fields the cards and the calendar read.
        decorar(b) {
            const s = moment(b.start);
            const e = moment(b.end);
            const now = moment();
            const sIso = s.format('YYYY-MM-DD');
            const eIso = e.format('YYYY-MM-DD');
            const estado = now.isAfter(e) ? 'pasado' : now.isBefore(s) ? 'proximo' : 'vigente';
            const dias = e.clone().startOf('day').diff(s.clone().startOf('day'), 'days') + 1;

            return {
                ...b,
                _sIso: sIso,
                _eIso: eIso,
                _estado: estado,
                _dias: dias,
                _icon: (b.props && b.props.icon) || iconoDeMotivo(b.title),
                _rango: sIso === eIso
                    ? s.format('dddd DD [de] MMMM YYYY')
                    : `${s.format('DD MMM')} → ${e.format('DD MMM YYYY')}`,
                _enCuanto: s.fromNow(),
            };
        },

        // ═══ derived list ═══
        filtrados() {
            const q = this.query.trim().toLowerCase();
            return this.bloqueos.filter(b => {
                if (this.filtro === 'activos' && b._estado === 'pasado') return false;
                if (this.filtro === 'pasados' && b._estado !== 'pasado') return false;
                if (!q) return true;
                return String(b.title || '').toLowerCase().includes(q) || b._rango.toLowerCase().includes(q);
            });
        },

        vigentes() { return this.bloqueos.filter(b => b._estado === 'vigente'); },
        proximos() { return this.bloqueos.filter(b => b._estado === 'proximo'); },

        diasCerrados() {
            return this.bloqueos
                .filter(b => b._estado !== 'pasado')
                .reduce((n, b) => n + b._dias, 0);
        },

        citasDe(b) {
            return this.citasBloqueadas.filter(c => {
                const iso = moment(c.start).format('YYYY-MM-DD');
                return iso >= b._sIso && iso <= b._eIso;
            });
        },

        citasEnRiesgo() {
            const ids = new Set();
            this.bloqueos
                .filter(b => b._estado !== 'pasado')
                .forEach(b => this.citasDe(b).forEach(c => ids.add(c._id)));
            return ids.size;
        },

        // ═══ page calendar ═══
        mesLabel() { return moment([this.calY, this.calM, 1]).format('MMMM YYYY'); },

        mesAnterior() { this.moverMes(-1); },
        mesSiguiente() { this.moverMes(1); },

        moverMes(delta) {
            const m = moment([this.calY, this.calM, 1]).add(delta, 'month');
            this.calY = m.year();
            this.calM = m.month();
            this.cargarMes();
        },

        irHoy() {
            this.calY = moment().year();
            this.calM = moment().month();
            this.cargarMes();
        },

        celdas(year, month) {
            const first = moment([year, month, 1]);
            const start = first.clone().startOf('isoWeek');
            const cells = [];
            for (let i = 0; i < 42; i++) {
                const d = start.clone().add(i, 'days');
                const iso = d.format('YYYY-MM-DD');
                cells.push({
                    iso,
                    num: d.date(),
                    inMonth: d.month() === month,
                    isToday: iso === this.hoyIso,
                    isPast: iso < this.hoyIso,
                    closed: this.diasAbiertos[d.clone().locale('en').format('dddd')] === false,
                });
            }
            // A 6th row that lands entirely in the next month adds nothing.
            return cells.slice(35).every(c => !c.inMonth) ? cells.slice(0, 35) : cells;
        },

        diasMes() {
            return this.celdas(this.calY, this.calM).map(c => {
                const blk = this.bloqueoDe(c.iso);
                return {
                    ...c,
                    blocked: !!blk,
                    blockId: blk ? blk._id : null,
                    title: blk ? blk.title : '',
                    citas: this.mesCitas[c.iso] || 0,
                };
            });
        },

        bloqueoDe(iso) {
            return this.bloqueos.find(b => iso >= b._sIso && iso <= b._eIso) || null;
        },

        claseDia(c) {
            if (!c.inMonth) return 'border-transparent text-gray-800';
            if (c.blocked) {
                return c.isPast
                    ? 'bg-white/[.04] border-white/10 text-gray-500 line-through'
                    : 'bg-rose-500/20 border-rose-400/50 text-rose-200 hover:bg-rose-500/30';
            }
            if (c.closed) return 'bg-white/[.02] border-white/8 text-gray-700 hover:border-white/15';
            if (c.isToday) return 'bg-primary/15 border-primary/50 text-white';
            if (c.isPast) return 'border-white/5 text-gray-700';
            return 'bg-white/[.03] border-white/8 text-gray-300 hover:border-rose-400/40 hover:text-white';
        },

        desdeCalendario(c) {
            if (!c.inMonth) return;
            if (c.blocked) {
                const b = this.bloqueos.find(x => x._id === c.blockId);
                if (b) this.abrirEditar(b);
                return;
            }
            this.abrirNuevo(c.iso);
        },

        // ═══ sheet ═══
        abrirNuevo(iso) {
            this.mode = 'add';
            this.form = { id: null, title: '', icon: ICONO_DEFECTO, start: iso || '', end: '' };
            this.conflictos = [];
            this.errorMsg = '';
            this.enfocarMes(iso || this.hoyIso);
            // Reopening on the same dates does not move the watchers, so ask directly.
            this.pedirConflictos();
            this.open = true;
        },

        abrirEditar(b) {
            this.mode = 'edit';
            this.form = {
                id: b._id,
                title: b.title || '',
                icon: b._icon,
                start: b._sIso,
                end: b._sIso === b._eIso ? '' : b._eIso,
            };
            this.conflictos = [];
            this.errorMsg = '';
            this.enfocarMes(b._sIso);
            this.pedirConflictos();
            this.open = true;
        },

        cerrar() { this.open = false; },

        enfocarMes(iso) {
            const m = moment(iso, 'YYYY-MM-DD');
            this.pickY = m.year();
            this.pickM = m.month();
        },

        usarMotivo(m) {
            this.form.title = m.t;
            this.form.icon = m.i;
        },

        // ═══ date picking ═══
        pickMesLabel() { return moment([this.pickY, this.pickM, 1]).format('MMMM YYYY'); },

        pickMesAnterior() { this.pickMoverMes(-1); },
        pickMesSiguiente() { this.pickMoverMes(1); },

        pickMoverMes(delta) {
            const m = moment([this.pickY, this.pickM, 1]).add(delta, 'month');
            this.pickY = m.year();
            this.pickM = m.month();
        },

        pickDias() {
            return this.celdas(this.pickY, this.pickM).map(c => {
                const blk = this.bloqueoDe(c.iso);
                return {
                    ...c,
                    // A day already covered by another block is not selectable.
                    taken: !!blk && blk._id !== this.form.id,
                    selected: c.iso === this.form.start || c.iso === this.form.end,
                    inRange: !!this.form.end && c.iso > this.form.start && c.iso < this.form.end,
                };
            });
        },

        clasePick(c) {
            if (!c.inMonth) return 'border-transparent text-gray-800 pointer-events-none';
            if (c.selected) return 'bg-danger border-danger text-white';
            if (c.inRange) return 'bg-rose-500/20 border-rose-400/30 text-rose-200';
            if (c.taken) return 'bg-white/[.02] border-white/8 text-gray-700 line-through cursor-not-allowed';
            if (c.isPast) return 'border-white/5 text-gray-700';
            if (c.isToday) return 'bg-primary/15 border-primary/50 text-white';
            if (c.closed) return 'bg-white/[.02] border-white/8 text-gray-600 hover:border-white/15';
            return 'bg-white/[.03] border-white/8 text-gray-300 hover:border-danger/50 hover:text-white';
        },

        seleccionar(c) {
            if (!c.inMonth || c.taken) return;
            this.errorMsg = '';
            // First tap sets the start, second tap closes the range.
            if (!this.form.start || this.form.end) {
                this.form.start = c.iso;
                this.form.end = '';
                return;
            }
            if (c.iso === this.form.start) { this.form.end = ''; return; }
            if (c.iso < this.form.start) {
                this.form.end = this.form.start;
                this.form.start = c.iso;
            } else {
                this.form.end = c.iso;
            }
        },

        limpiarFechas() {
            this.form.start = '';
            this.form.end = '';
            this.conflictos = [];
        },

        usarPreset(p) {
            const base = moment().startOf('day');
            if (p.weekend) {
                const sat = base.clone().day(6);
                if (sat.isBefore(base, 'day')) sat.add(7, 'days');
                this.form.start = sat.format('YYYY-MM-DD');
                this.form.end = sat.clone().add(1, 'day').format('YYYY-MM-DD');
            } else {
                const from = base.clone().add(p.desde, 'days');
                this.form.start = from.format('YYYY-MM-DD');
                this.form.end = p.dias ? from.clone().add(p.dias, 'days').format('YYYY-MM-DD') : '';
            }
            this.enfocarMes(this.form.start);
        },

        finIso() { return this.form.end || this.form.start; },

        totalDias() {
            if (!this.form.start) return 0;
            return moment(this.finIso(), 'YYYY-MM-DD').diff(moment(this.form.start, 'YYYY-MM-DD'), 'days') + 1;
        },

        resumen() {
            if (!this.form.start) return '';
            const s = moment(this.form.start, 'YYYY-MM-DD');
            if (!this.form.end) return s.format('dddd DD [de] MMMM YYYY');
            return `${s.format('DD MMM')} → ${moment(this.form.end, 'YYYY-MM-DD').format('DD MMM YYYY')}`;
        },

        detalleDias() {
            const n = this.totalDias();
            if (!n) return '';
            const abiertos = this.diasDeAtencion();
            const base = n === 1 ? '1 día' : `${n} días`;
            return abiertos === n ? base : `${base} · ${abiertos} con atención programada`;
        },

        // Days inside the range where the shop would otherwise have been open.
        diasDeAtencion() {
            let n = 0;
            const cur = moment(this.form.start, 'YYYY-MM-DD');
            const end = moment(this.finIso(), 'YYYY-MM-DD');
            while (cur.isSameOrBefore(end, 'day')) {
                if (this.diasAbiertos[cur.clone().locale('en').format('dddd')] !== false) n++;
                cur.add(1, 'day');
            }
            return n;
        },

        pistaFechas() {
            if (!this.form.start) return 'Toca el primer día a cerrar';
            if (!this.form.end) return 'Toca el último día, o guarda así para un solo día';
            return 'Rango listo — toca cualquier día para empezar de nuevo';
        },

        // ═══ conflicts ═══
        pedirConflictos() {
            clearTimeout(this._conflictTimer);
            if (!this.form.start) { this.conflictos = []; return; }
            this.conflictLoading = true;
            this._conflictTimer = setTimeout(() => this.buscarConflictos(), 250);
        },

        async buscarConflictos() {
            try {
                const { data } = await axios.get('/api/v1/event/range', {
                    params: { start: this.form.start, end: this.finIso() },
                });
                this.conflictos = (data || [])
                    .filter(esCitaReal)
                    .sort((a, b) => new Date(a.start) - new Date(b.start));
            } catch (e) {
                this.conflictos = [];
            } finally {
                this.conflictLoading = false;
            }
        },

        cuando(c) { return moment(c.start).format('ddd DD MMM · h:mm a'); },

        waLink(c) {
            const tel = String(c.extendedProps?.numero || '').replace(/\D/g, '');
            const fecha = moment(c.start).format('dddd DD [de] MMMM [a las] h:mm a');
            const texto = `Hola ${c.title}, tu cita del ${fecha} se debe reagendar porque estaremos cerrados${this.form.title ? ' (' + this.form.title + ')' : ''}. ¿Qué otro día te sirve?`;
            return `https://wa.me/506${tel}?text=${encodeURIComponent(texto)}`;
        },

        async eliminarCita(c) {
            const result = await Swal.fire({
                title: '¿Eliminar la cita?',
                text: `${c.title} — ${this.cuando(c)}. Avísale antes; no se envía ninguna notificación.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Eliminar',
                cancelButtonText: 'Cancelar',
                background: '#0d0d0d',
                color: '#f1f1f1',
                customClass: { confirmButton: 'hq-swal-danger' },
            });
            if (!result.isConfirmed) return;
            try {
                await axios.delete(`/api/v1/event/${c._id}`);
                this.conflictos = this.conflictos.filter(x => x._id !== c._id);
                await this.cargarCitasBloqueadas();
                this.cargarMes();
                hqOk('Cita eliminada', c.title);
            } catch (e) {
                hqErr('No se pudo eliminar la cita');
            }
        },

        // ═══ save / delete ═══
        async guardar() {
            const title = this.form.title.trim();
            if (!title) { this.errorMsg = 'Escribe el motivo del bloqueo'; return; }
            if (!this.form.start) { this.errorMsg = 'Elige al menos un día'; return; }

            if (this.conflictos.length) {
                const result = await Swal.fire({
                    title: `${this.conflictos.length} cita${this.conflictos.length === 1 ? '' : 's'} dentro del bloqueo`,
                    text: 'Se bloquearán esas fechas igual. Las citas ya agendadas siguen en la agenda: tendrás que moverlas o eliminarlas a mano.',
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Bloquear igual',
                    cancelButtonText: 'Revisar citas',
                    background: '#0d0d0d',
                    color: '#f1f1f1',
                    customClass: { confirmButton: 'hq-swal-danger' },
                });
                if (!result.isConfirmed) return;
            }

            this.errorMsg = '';
            this.saving = true;
            try {
                const payload = {
                    title,
                    start: moment(this.form.start, 'YYYY-MM-DD').startOf('day').toISOString(),
                    end: moment(this.finIso(), 'YYYY-MM-DD').endOf('day').toISOString(),
                    type: this.form.end ? 'range' : 'all-day',
                    color: '#e44e4e',
                    props: { icon: this.form.icon },
                };

                if (this.mode === 'add') await axios.post('/api/v1/special', payload);
                else await axios.put(`/api/v1/special/${this.form.id}`, payload);

                this.open = false;
                await this.cargar();
                this.cargarMes();
                hqOk(this.mode === 'add' ? 'Bloqueo creado' : 'Bloqueo actualizado', `${title} — ${this.resumen()}`);
            } catch (e) {
                this.errorMsg = e.response?.data?.error || 'Error al guardar. Intenta de nuevo.';
            } finally {
                this.saving = false;
            }
        },

        async eliminar(b) {
            const citas = this.citasDe(b).length;
            const result = await Swal.fire({
                title: '¿Quitar el bloqueo?',
                text: citas
                    ? `"${b.title}" — ${b._rango}. Esas fechas volverán a aceptar reservas (hay ${citas} cita${citas === 1 ? '' : 's'} ahí).`
                    : `"${b.title}" — ${b._rango}. Esas fechas volverán a aceptar reservas.`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Quitar',
                cancelButtonText: 'Cancelar',
                background: '#0d0d0d',
                color: '#f1f1f1',
                customClass: { confirmButton: 'hq-swal-danger' },
            });
            if (!result.isConfirmed) return;
            try {
                await axios.delete(`/api/v1/special/${b._id}`);
                if (this.form.id === b._id) this.open = false;
                await this.cargar();
                this.cargarMes();
                hqOk('Bloqueo eliminado', b.title);
            } catch (e) {
                hqErr('No se pudo eliminar el bloqueo');
            }
        },

        eliminarActual() {
            const b = this.bloqueos.find(x => x._id === this.form.id);
            if (b) this.eliminar(b);
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

moment.locale('es');
