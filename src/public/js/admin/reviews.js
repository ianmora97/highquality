/* Admin — Reviews
 * KPIs + searchable/sortable review queue + inline approve/reject/reply,
 * server-paginated (GET /api/v1/review?page=...) so a growing review table
 * never ships more than one page's worth of cards to the browser.
 */

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 350;

function toastOk(title, text) {
    if (window.HQ) return HQ.toast({ type: 'success', title, text, duration: 2400 });
    Swal.fire({ icon: 'success', title, text, background: '#0d0d0d', color: '#f1f1f1' });
}

function toastErr(title, text) {
    if (window.HQ) return HQ.toast({ type: 'error', title, text, duration: 4000 });
    Swal.fire({ icon: 'error', title, text, background: '#0d0d0d', color: '#f1f1f1' });
}

function reviewsPage() {
    return {
        // ── list state (server-paginated) ──
        reviews: [],
        summary: { total: 0, pending: 0, approved: 0, rejected: 0, avgStars: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } },
        loading: true,
        loadingMore: false,
        page: 1,
        pages: 1,
        total: 0,
        query: '',
        filtro: 'todos',        // todos | pending | approved | rejected
        orden: 'recientes',     // recientes | antiguas | altas | bajas
        ordenOpen: false,
        _searchTimer: null,

        // ── per-card reply UI ──
        replyOpen: {},          // { [reviewId]: bool }
        replyDraft: {},         // { [reviewId]: string }
        savingId: null,

        ordenes: [
            ['recientes', 'Más recientes',    'fa-clock-rotate-left'],
            ['antiguas',  'Más antiguas',     'fa-clock'],
            ['altas',     'Mejor calificadas', 'fa-arrow-up-short-wide'],
            ['bajas',     'Peor calificadas',  'fa-arrow-down-short-wide'],
        ],

        filtros: [
            ['todos',    'Todas',      'fa-comments'],
            ['pending',  'Pendientes', 'fa-hourglass-half'],
            ['approved', 'Aprobadas',  'fa-check'],
            ['rejected', 'Rechazadas', 'fa-ban'],
        ],

        init() {
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
                const { data } = await axios.get('/api/v1/review', {
                    params: {
                        page,
                        limit: PAGE_SIZE,
                        search: this.query.trim(),
                        status: this.filtro === 'todos' ? undefined : this.filtro,
                        orden: this.orden,
                    },
                });
                this.reviews = append ? this.reviews.concat(data.data) : data.data;
                this.summary = data.summary;
                this.page    = data.page;
                this.pages   = data.pages;
                this.total   = data.total;
            } catch (e) {
                toastErr('No se pudieron cargar las reseñas');
            } finally {
                this.loading = false;
                this.loadingMore = false;
            }
        },

        /** Re-fetch every page currently loaded (1..this.page), keeping scroll depth. */
        async recargar() {
            const upTo = this.page;
            try {
                let acc = [];
                let last = null;
                for (let p = 1; p <= upTo; p++) {
                    const { data } = await axios.get('/api/v1/review', {
                        params: {
                            page: p, limit: PAGE_SIZE, search: this.query.trim(),
                            status: this.filtro === 'todos' ? undefined : this.filtro,
                            orden: this.orden,
                        },
                    });
                    acc = acc.concat(data.data);
                    last = data;
                }
                this.reviews = acc;
                if (last) { this.summary = last.summary; this.pages = last.pages; this.total = last.total; }
            } catch (e) {
                toastErr('No se pudo actualizar la lista');
            }
        },

        hayMas() { return this.page < this.pages; },
        verMas() { if (this.hayMas()) this.cargar(this.page + 1, true); },
        limpiar() { this.query = ''; this.filtro = 'todos'; this.orden = 'recientes'; this.buscar(); },
        ordenLabel() {
            const hit = this.ordenes.find(o => o[0] === this.orden);
            return hit ? hit[1] : '';
        },
        filtroCount(key) {
            if (key === 'todos') return this.summary.total;
            return this.summary[key] || 0;
        },

        // ═══ card helpers ═══
        iniciales(r) {
            const parts = String(r.nombre || '?').trim().split(/\s+/).slice(0, 2);
            return parts.map(p => p.charAt(0).toUpperCase()).join('') || '?';
        },

        tel(r) { return r.phone ? String(r.phone).replace(/(\d{4})(\d{4})/, '$1-$2') : ''; },

        fecha(v) { return v ? moment(v).format('D MMM YYYY, h:mm a') : ''; },
        cuando(v) { return v ? moment(v).fromNow() : ''; },

        statusBadge(status) {
            if (status === 'approved') return { text: 'Aprobada',  cls: 'bg-emerald-500/10 border-emerald-400/25 text-emerald-300' };
            if (status === 'rejected') return { text: 'Rechazada', cls: 'bg-red-500/10 border-red-400/25 text-red-400' };
            return { text: 'Pendiente', cls: 'bg-orange-500/10 border-orange-400/25 text-orange-300' };
        },

        // ═══ actions ═══
        async aprobar(r) {
            this.savingId = r._id;
            try {
                await axios.patch(`/api/v1/review/${r._id}/approve`);
                r.status = 'approved';
                this.dropIfFiltered(r);
                await this.recargarSummary();
                toastOk('Reseña aprobada', 'Ya es visible en el sitio.');
            } catch (e) {
                toastErr(e.response?.data?.error || 'No se pudo aprobar.');
            } finally {
                this.savingId = null;
            }
        },

        async rechazar(r) {
            const result = await Swal.fire({
                title: '¿Rechazar esta reseña?',
                text: 'No se mostrará en el sitio. Puedes revertirlo después.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Rechazar',
                cancelButtonText: 'Cancelar',
                background: '#0d0d0d',
                color: '#f1f1f1',
                customClass: { confirmButton: 'hq-swal-danger' },
            });
            if (!result.isConfirmed) return;

            this.savingId = r._id;
            try {
                await axios.patch(`/api/v1/review/${r._id}/reject`);
                r.status = 'rejected';
                this.dropIfFiltered(r);
                await this.recargarSummary();
                toastOk('Reseña rechazada');
            } catch (e) {
                toastErr(e.response?.data?.error || 'No se pudo rechazar.');
            } finally {
                this.savingId = null;
            }
        },

        toggleReply(r) {
            this.replyOpen[r._id] = !this.replyOpen[r._id];
            if (this.replyDraft[r._id] === undefined) this.replyDraft[r._id] = r.reply || '';
        },

        async guardarRespuesta(r) {
            const reply = (this.replyDraft[r._id] || '').trim();
            this.savingId = r._id;
            try {
                const { data } = await axios.patch(`/api/v1/review/${r._id}/reply`, { reply });
                r.reply = data.reply;
                r.repliedAt = data.repliedAt;
                this.replyOpen[r._id] = false;
                toastOk(reply ? 'Respuesta publicada' : 'Respuesta eliminada');
            } catch (e) {
                toastErr(e.response?.data?.error || 'No se pudo guardar la respuesta.');
            } finally {
                this.savingId = null;
            }
        },

        async eliminar(r) {
            const result = await Swal.fire({
                title: '¿Eliminar reseña?',
                text: `"${(r.review || '').slice(0, 80)}"`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar',
                background: '#0d0d0d',
                color: '#f1f1f1',
                customClass: { confirmButton: 'hq-swal-danger' },
            });
            if (!result.isConfirmed) return;

            this.savingId = r._id;
            try {
                await axios.delete(`/api/v1/review/${r._id}`);
                this.reviews = this.reviews.filter(x => x._id !== r._id);
                this.total -= 1;
                await this.recargarSummary();
                toastOk('Reseña eliminada');
            } catch (e) {
                toastErr(e.response?.data?.error || 'No se pudo eliminar.');
            } finally {
                this.savingId = null;
            }
        },

        /** Drop a review from the current view once its status no longer matches the active filter. */
        dropIfFiltered(r) {
            if (this.filtro !== 'todos' && this.filtro !== r.status) {
                this.reviews = this.reviews.filter(x => x._id !== r._id);
                this.total = Math.max(0, this.total - 1);
            }
        },

        async recargarSummary() {
            try {
                const { data } = await axios.get('/api/v1/review', { params: { page: 1, limit: 1 } });
                this.summary = data.summary;
            } catch (e) { /* KPI refresh is best-effort */ }
        },
    };
}
