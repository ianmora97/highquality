/* Admin — Servicios
 * Single Alpine component: list + KPIs + the add/edit bottom sheet.
 * Cards render from `servicios`, so every mutation just reloads the list.
 */

const SERVICE_ICONS = [
    { cls: 'fa-solid fa-scissors',        label: 'Tijeras',        tags: 'corte pelo tijera' },
    { cls: 'fa-solid fa-user-tie',        label: 'Corte y barba',  tags: 'combo completo' },
    { cls: 'fa-solid fa-pump-soap',       label: 'Afeitado',       tags: 'jabon espuma navaja rasurar' },
    { cls: 'fa-solid fa-droplet',         label: 'Barba',          tags: 'aceite gota' },
    { cls: 'fa-solid fa-mask',            label: 'Mascarilla',     tags: 'facial cara' },
    { cls: 'fa-solid fa-face-smile',      label: 'Facial',         tags: 'cara limpieza' },
    { cls: 'fa-solid fa-spa',             label: 'Spa',            tags: 'relax tratamiento' },
    { cls: 'fa-solid fa-child',           label: 'Niño',           tags: 'kids infantil' },
    { cls: 'fa-solid fa-wand-sparkles',   label: 'Cejas',          tags: 'depilar diseno' },
    { cls: 'fa-solid fa-pen-nib',         label: 'Diseño',         tags: 'freestyle linea' },
    { cls: 'fa-solid fa-pencil',          label: 'Delineado',      tags: 'perfilar borde' },
    { cls: 'fa-solid fa-spray-can',       label: 'Tinte',          tags: 'color pintura spray' },
    { cls: 'fa-solid fa-palette',         label: 'Color',          tags: 'tinte mechas' },
    { cls: 'fa-solid fa-brush',           label: 'Peinado',        tags: 'styling cepillo' },
    { cls: 'fa-solid fa-hand-sparkles',   label: 'Manos',          tags: 'manicure' },
    { cls: 'fa-solid fa-hot-tub-person',  label: 'Lavado',         tags: 'shampoo agua' },
    { cls: 'fa-solid fa-fire',            label: 'Fuego',          tags: 'premium hot' },
    { cls: 'fa-solid fa-bolt',            label: 'Rápido',         tags: 'express veloz' },
    { cls: 'fa-solid fa-crown',           label: 'Premium',        tags: 'corona vip' },
    { cls: 'fa-solid fa-gem',             label: 'Deluxe',         tags: 'diamante lujo' },
    { cls: 'fa-solid fa-star',            label: 'Destacado',      tags: 'estrella top' },
    { cls: 'fa-solid fa-heart',           label: 'Favorito',       tags: 'corazon' },
    { cls: 'fa-solid fa-eye',             label: 'Detalle',        tags: 'ojo vista' },
    { cls: 'fa-solid fa-shield',          label: 'Protección',     tags: 'escudo cuidado' },
    { cls: 'fa-solid fa-clock',           label: 'Por tiempo',     tags: 'reloj duracion' },
    { cls: 'fa-solid fa-gift',            label: 'Combo',          tags: 'regalo paquete' },
    { cls: 'fa-solid fa-user-group',      label: 'Grupal',         tags: 'dos personas' },
];

const DEFAULT_ICON = 'fa-solid fa-scissors';

function crc(n) {
    return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC' })
        .format(Number(n) || 0)
        .replace(/\D00(?=\D*$)/, '');
}

function hqToastOk(title, text) {
    if (window.HQ) return HQ.toast({ type: 'success', title, text, duration: 2600 });
    Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1600, background: '#0d0d0d', color: '#f1f1f1' })
        .fire({ icon: 'success', title });
}

function hqToastErr(title, text) {
    if (window.HQ) return HQ.toast({ type: 'error', title, text, duration: 4000 });
    Swal.fire({ icon: 'error', title, text, background: '#0d0d0d', color: '#f1f1f1' });
}

function serviciosPage() {
    return {
        // ── list state ──
        servicios: [],
        loading: true,
        query: '',
        filtro: 'todos',          // todos | activos | inactivos
        toggling: {},             // id → true while its switch is in flight

        // ── sheet state ──
        open: false,
        mode: 'add',              // add | edit
        saving: false,
        errorMsg: '',
        iconQuery: '',
        form: {
            id: null,
            name: '',
            price: '',
            enable: true,
            imageType: 'icon',
            faIcon: DEFAULT_ICON,
            imageUrl: '',
        },

        // ── image crop state ──
        cropper: null,
        cropStage: 'empty',       // empty | cropping | ready
        croppedBlob: null,
        previewUrl: '',

        // ── drag to dismiss ──
        dragY: 0,
        dragging: false,
        _dragStartY: 0,

        icons: SERVICE_ICONS,

        init() { this.cargar(); },

        // ═══ data ═══
        async cargar() {
            try {
                const { data } = await axios.get('/api/v1/services');
                this.servicios = (data || []).slice().sort((a, b) => {
                    if (!!b.enable !== !!a.enable) return b.enable ? 1 : -1;
                    return (a.price || 0) - (b.price || 0);
                });
            } catch (e) {
                hqToastErr('No se pudieron cargar los servicios');
            } finally {
                this.loading = false;
            }
        },

        // ═══ derived list ═══
        filtradas() {
            const q = this.query.trim().toLowerCase();
            return this.servicios.filter(s => {
                if (this.filtro === 'activos' && !s.enable) return false;
                if (this.filtro === 'inactivos' && s.enable) return false;
                if (!q) return true;
                return String(s.name || '').toLowerCase().includes(q)
                    || String(s.price || '').includes(q);
            });
        },

        activos()   { return this.servicios.filter(s => s.enable).length; },
        inactivos() { return this.servicios.length - this.activos(); },

        promedio() {
            const on = this.servicios.filter(s => s.enable);
            if (!on.length) return 0;
            return Math.round(on.reduce((n, s) => n + (Number(s.price) || 0), 0) / on.length);
        },

        // ═══ card helpers ═══
        iconOf(s)   { return s.faIcon || DEFAULT_ICON; },
        esImagen(s) { return s.imageType === 'image' && !!s.imageUrl; },
        precio(v)   { return crc(v); },

        async toggle(s, ev) {
            const next = !s.enable;
            this.toggling[s._id] = true;
            try {
                await axios.put(`/api/v1/services/${s._id}`, { enable: next });
                s.enable = next;                       // keep local state in sync
                hqToastOk(next ? 'Servicio activado' : 'Servicio desactivado', s.name);
            } catch (e) {
                // :checked won't re-run (s.enable never changed), so undo the DOM flip.
                if (ev && ev.target) ev.target.checked = s.enable;
                hqToastErr('No se pudo cambiar el estado');
            } finally {
                delete this.toggling[s._id];
            }
        },

        // ═══ sheet ═══
        abrirNuevo() {
            this.mode = 'add';
            this.form = { id: null, name: '', price: '', enable: true, imageType: 'icon', faIcon: DEFAULT_ICON, imageUrl: '' };
            this.resetImagen();
            this.errorMsg = '';
            this.iconQuery = '';
            this.open = true;
        },

        abrirEditar(s) {
            this.mode = 'edit';
            this.form = {
                id: s._id,
                name: s.name || '',
                price: s.price ?? '',
                enable: !!s.enable,
                imageType: s.imageType === 'image' ? 'image' : 'icon',
                faIcon: s.faIcon || DEFAULT_ICON,
                imageUrl: s.imageUrl || '',
            };
            this.resetImagen();
            if (this.form.imageType === 'image' && this.form.imageUrl) {
                this.previewUrl = this.form.imageUrl;
                this.cropStage = 'ready';
            }
            this.errorMsg = '';
            this.iconQuery = '';
            this.open = true;
        },

        cerrar() {
            this.open = false;
            this.destruirCropper();
        },

        // ═══ icon picker ═══
        iconosFiltrados() {
            const q = this.iconQuery.trim().toLowerCase();
            if (!q) return this.icons;
            return this.icons.filter(i =>
                i.label.toLowerCase().includes(q) || i.tags.includes(q)
            );
        },

        nombreIcono() {
            const hit = this.icons.find(i => i.cls === this.form.faIcon);
            return hit ? hit.label : 'Personalizado';
        },

        // ═══ image upload + crop ═══
        resetImagen() {
            this.destruirCropper();
            this.croppedBlob = null;
            this.previewUrl = '';
            this.cropStage = 'empty';
            if (this.$refs.fileInput) this.$refs.fileInput.value = '';
        },

        destruirCropper() {
            if (this.cropper) { this.cropper.destroy(); this.cropper = null; }
        },

        elegirArchivo() { this.$refs.fileInput.click(); },

        onArchivo(e) {
            const file = e.target.files && e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                this.destruirCropper();
                this.croppedBlob = null;
                this.cropStage = 'cropping';
                const img = this.$refs.cropImg;
                img.src = ev.target.result;
                // Cropper needs the element laid out, so wait for the x-show flip.
                this.$nextTick(() => {
                    this.cropper = new Cropper(img, { aspectRatio: 1, viewMode: 1, autoCropArea: 1, background: false });
                });
            };
            reader.readAsDataURL(file);
        },

        confirmarCrop() {
            if (!this.cropper) return;
            this.cropper.getCroppedCanvas({ width: 800, height: 800 }).toBlob((blob) => {
                this.croppedBlob = blob;
                this.previewUrl = URL.createObjectURL(blob);
                this.cropStage = 'ready';
                this.destruirCropper();
            }, 'image/webp', 0.9);
        },

        // ═══ save / delete ═══
        validar() {
            if (!this.form.name.trim()) return 'Escribe el nombre del servicio';
            const p = Number(this.form.price);
            if (this.form.price === '' || Number.isNaN(p)) return 'Escribe el precio del servicio';
            if (p < 0) return 'El precio no puede ser negativo';
            if (this.form.imageType === 'image' && !this.croppedBlob && !this.form.imageUrl) {
                return 'Sube y recorta una imagen, o usa un ícono';
            }
            if (this.form.imageType === 'image' && this.cropStage === 'cropping') {
                return 'Confirma el recorte de la imagen';
            }
            return '';
        },

        async guardar() {
            const error = this.validar();
            if (error) { this.errorMsg = error; return; }
            this.errorMsg = '';
            this.saving = true;
            try {
                const payload = {
                    name: this.form.name.trim(),
                    price: Number(this.form.price),
                    enable: this.form.enable,
                    imageType: this.form.imageType,
                    faIcon: this.form.imageType === 'icon' ? this.form.faIcon : '',
                };

                let id = this.form.id;
                if (this.mode === 'add') {
                    const { data } = await axios.post('/api/v1/services', payload);
                    id = data && data._id;
                } else {
                    await axios.put(`/api/v1/services/${id}`, payload);
                }

                if (this.form.imageType === 'image' && this.croppedBlob && id) {
                    const body = new FormData();
                    body.append('image', this.croppedBlob, 'service.webp');
                    await axios.post(`/api/v1/services/${id}/image`, body, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }

                this.open = false;
                this.destruirCropper();
                await this.cargar();
                hqToastOk(this.mode === 'add' ? 'Servicio creado' : 'Servicio actualizado', payload.name);
            } catch (e) {
                this.errorMsg = e.response?.data?.error || 'Error al guardar. Intenta de nuevo.';
            } finally {
                this.saving = false;
            }
        },

        async eliminar() {
            const result = await Swal.fire({
                title: '¿Eliminar servicio?',
                text: `"${this.form.name}" dejará de aparecer en la reserva. Esta acción no se puede deshacer.`,
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
                await axios.delete(`/api/v1/services/${this.form.id}`);
                this.open = false;
                this.destruirCropper();
                await this.cargar();
                hqToastOk('Servicio eliminado');
            } catch (e) {
                this.errorMsg = 'No se pudo eliminar el servicio';
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
