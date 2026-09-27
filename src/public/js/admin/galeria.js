/* Admin — Galería
 * Single Alpine component: KPIs + grid + the upload/edit bottom sheet.
 *
 * Flow, in order, so the sheet only ever asks one thing at a time:
 *   1. pick a file     → the browser decodes it (HEIC goes through the server)
 *   2. pick a crop     → Cropper locks to the chosen ratio
 *   3. confirm crop    → canvas → JPEG blob
 *   4. fill the meta   → título / descripción / @instagram / público
 *   5. upload          → POST /api/v1/gallery
 *
 * Everything reaching the bucket is stored as JPEG server-side; the blob sent
 * from here is already JPEG so the two agree.
 */

/* Mirrors src/backend/helpers/aspects.js — keep both in sync. */
const GALLERY_ASPECTS = [
    { key: '4:5',   label: 'Retrato',    hint: 'Instagram', ratio: 4 / 5,   width: 1280, height: 1600 },
    { key: '1:1',   label: 'Cuadrado',   hint: 'Feed',      ratio: 1,       width: 1440, height: 1440 },
    { key: '4:3',   label: 'Clásico',    hint: 'Horizontal', ratio: 4 / 3,  width: 1600, height: 1200 },
    { key: '3:4',   label: 'Vertical',   hint: 'Alto',      ratio: 3 / 4,   width: 1200, height: 1600 },
    { key: '16:9',  label: 'Panorámica', hint: 'Ancho',     ratio: 16 / 9,  width: 1920, height: 1080 },
    { key: 'libre', label: 'Libre',      hint: 'Sin recorte', ratio: null,  width: null, height: null },
];

const ACCEPTED_EXT = /\.(jpe?g|png|webp|heic|heif|avif|gif|bmp|tiff?)$/i;
const MAX_MB = 25;

function hqOk(title, text) {
    if (window.HQ) return HQ.toast({ type: 'success', title, text, duration: 2600 });
    Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1800, background: '#0d0d0d', color: '#f1f1f1' })
        .fire({ icon: 'success', title });
}

function hqErr(title, text) {
    if (window.HQ) return HQ.toast({ type: 'error', title, text, duration: 4200 });
    Swal.fire({ icon: 'error', title, text, background: '#0d0d0d', color: '#f1f1f1' });
}

function galeriaPage() {
    return {
        // ── list ──
        fotos: [],
        loading: true,
        query: '',
        filtro: 'todas',          // todas | publicas | ocultas
        toggling: {},             // id → true while its visibility switch is in flight
        ordenando: false,         // reorder mode: arrows instead of edit buttons
        savingOrder: false,

        // ── sheet ──
        open: false,
        mode: 'add',              // add | edit
        saving: false,
        converting: false,        // server-side HEIC → JPEG in flight
        progress: 0,
        errorMsg: '',
        form: { id: null, title: '', description: '', instagramLink: '', visible: true, imageUrl: '' },

        // ── crop ──
        aspects: GALLERY_ASPECTS,
        aspect: '4:5',
        cropper: null,
        stage: 'empty',           // empty | cropping | ready
        croppedBlob: null,
        previewUrl: '',
        srcUrl: '',               // decodable source handed to Cropper
        dragOver: false,

        // ── lightbox ──
        lightbox: null,

        // ── drag to dismiss ──
        dragY: 0,
        dragging: false,
        _dragStartY: 0,

        init() {
            this.cargar();
            // Object URLs outlive the component otherwise.
            window.addEventListener('beforeunload', () => this.revocar());
        },

        // ═══ data ═══
        async cargar() {
            try {
                const { data } = await axios.get('/api/v1/gallery/all');
                this.fotos = data || [];
            } catch (e) {
                hqErr('No se pudo cargar la galería');
            } finally {
                this.loading = false;
            }
        },

        // ═══ derived ═══
        filtradas() {
            const q = this.query.trim().toLowerCase();
            return this.fotos.filter((f) => {
                if (this.filtro === 'publicas' && !f.visible) return false;
                if (this.filtro === 'ocultas' && f.visible) return false;
                if (!q) return true;
                return [f.title, f.description, f.instagramLink]
                    .some((v) => String(v || '').toLowerCase().includes(q));
            });
        },

        publicas() { return this.fotos.filter((f) => f.visible).length; },
        ocultas()  { return this.fotos.length - this.publicas(); },
        etiquetadas() { return this.fotos.filter((f) => f.instagramLink).length; },

        // ═══ card helpers ═══
        ratioCss(f) {
            if (f.width && f.height) return `${f.width} / ${f.height}`;
            const hit = this.aspects.find((a) => a.key === f.aspect);
            return hit && hit.ratio ? hit.ratio : '4 / 5';
        },

        aspectLabel(key) {
            const hit = this.aspects.find((a) => a.key === key);
            return hit ? hit.label : key || '—';
        },

        async toggleVisible(f, ev) {
            const next = !f.visible;
            this.toggling[f._id] = true;
            try {
                await axios.put(`/api/v1/gallery/${f._id}`, { visible: next });
                f.visible = next;
                hqOk(next ? 'Visible en la galería' : 'Oculta en la galería', f.title || 'Foto');
            } catch (e) {
                // :checked never re-runs (f.visible didn't change), so undo the DOM flip.
                if (ev && ev.target) ev.target.checked = f.visible;
                hqErr('No se pudo cambiar la visibilidad');
            } finally {
                delete this.toggling[f._id];
            }
        },

        // ═══ reorder ═══
        // Arrows instead of drag-and-drop: a touch drag inside a scrolling grid
        // fights the page scroll on mobile, and the barber reorders rarely.
        async mover(f, dir) {
            const i = this.fotos.findIndex((x) => x._id === f._id);
            const j = i + dir;
            if (i < 0 || j < 0 || j >= this.fotos.length) return;
            const next = this.fotos.slice();
            [next[i], next[j]] = [next[j], next[i]];
            this.fotos = next;
            await this.guardarOrden();
        },

        async guardarOrden() {
            this.savingOrder = true;
            try {
                await axios.put('/api/v1/gallery/reorder', { ids: this.fotos.map((f) => f._id) });
            } catch (e) {
                hqErr('No se pudo guardar el orden');
                await this.cargar();
            } finally {
                this.savingOrder = false;
            }
        },

        // ═══ lightbox ═══
        abrirLightbox(f) { this.lightbox = f; },

        // ═══ sheet ═══
        abrirNueva() {
            this.mode = 'add';
            this.form = { id: null, title: '', description: '', instagramLink: '', visible: true, imageUrl: '' };
            this.aspect = '4:5';
            this.resetImagen();
            this.errorMsg = '';
            this.progress = 0;
            this.open = true;
        },

        abrirEditar(f) {
            this.mode = 'edit';
            this.form = {
                id: f._id,
                title: f.title || '',
                description: f.description || '',
                instagramLink: f.instagramLink || '',
                visible: !!f.visible,
                imageUrl: f.imageUrl || '',
            };
            this.aspect = f.aspect || '4:5';
            this.resetImagen();
            this.previewUrl = f.imageUrl || '';
            this.stage = 'ready';
            this.errorMsg = '';
            this.open = true;
        },

        cerrar() {
            this.open = false;
            this.destruirCropper();
        },

        // ═══ file → cropper ═══
        elegirArchivo() { this.$refs.fileInput.click(); },

        onDrop(e) {
            this.dragOver = false;
            const file = e.dataTransfer?.files?.[0];
            if (file) this.usarArchivo(file);
        },

        onArchivo(e) {
            const file = e.target.files && e.target.files[0];
            if (file) this.usarArchivo(file);
        },

        async usarArchivo(file) {
            this.errorMsg = '';

            const esImagen = String(file.type || '').startsWith('image/') || ACCEPTED_EXT.test(file.name || '');
            if (!esImagen) {
                this.errorMsg = 'Ese archivo no es una imagen. Se admiten JPG, PNG, WebP, HEIC y GIF.';
                if (this.$refs.fileInput) this.$refs.fileInput.value = '';
                return;
            }
            if (file.size > MAX_MB * 1024 * 1024) {
                this.errorMsg = `La imagen pesa ${(file.size / 1048576).toFixed(1)} MB y el límite es ${MAX_MB} MB.`;
                if (this.$refs.fileInput) this.$refs.fileInput.value = '';
                return;
            }

            this.destruirCropper();
            this.croppedBlob = null;
            this.converting = true;
            try {
                this.srcUrl = await this.aFuenteDecodificable(file);
                this.stage = 'cropping';
                // Cropper measures the element, so it needs the x-show flip first.
                this.$nextTick(() => this.montarCropper());
            } catch (err) {
                this.stage = 'empty';
                this.errorMsg = err?.response?.data?.error
                    || 'No se pudo leer esa imagen. Probá con un JPG o PNG.';
            } finally {
                this.converting = false;
                if (this.$refs.fileInput) this.$refs.fileInput.value = '';
            }
        },

        /**
         * HEIC/HEIF cannot be drawn into a <canvas> outside Safari, so Cropper
         * can't touch it. When the browser fails to decode the file, the server
         * transcodes it to JPEG for us (POST /api/v1/gallery/preview stores
         * nothing).
         */
        async aFuenteDecodificable(file) {
            this.revocar();
            const local = URL.createObjectURL(file);
            if (await this.puedeDecodificar(local)) return local;

            URL.revokeObjectURL(local);
            const body = new FormData();
            body.append('image', file, file.name || 'foto');
            const { data } = await axios.post('/api/v1/gallery/preview', body, { responseType: 'blob' });
            return URL.createObjectURL(data);
        },

        puedeDecodificar(url) {
            return new Promise((resolve) => {
                const probe = new Image();
                probe.onload = () => resolve(probe.naturalWidth > 0);
                probe.onerror = () => resolve(false);
                probe.src = url;
            });
        },

        montarCropper() {
            const img = this.$refs.cropImg;
            if (!img) return;
            img.src = this.srcUrl;
            this.cropper = new Cropper(img, {
                aspectRatio: this.ratioActual(),
                viewMode: 1,
                autoCropArea: 1,
                background: false,
                responsive: true,
            });
        },

        ratioActual() {
            const hit = this.aspects.find((a) => a.key === this.aspect);
            return hit && hit.ratio ? hit.ratio : NaN;   // NaN = free crop
        },

        elegirAspecto(key) {
            this.aspect = key;
            if (this.cropper) this.cropper.setAspectRatio(this.ratioActual());
        },

        rotar() { if (this.cropper) this.cropper.rotate(90); },

        confirmarCrop() {
            if (!this.cropper) return;
            const hit = this.aspects.find((a) => a.key === this.aspect);
            const box = hit && hit.width ? { width: hit.width, height: hit.height } : {};
            const canvas = this.cropper.getCroppedCanvas({
                ...box,
                imageSmoothingQuality: 'high',
                fillColor: '#ffffff',   // JPEG has no alpha; without this PNGs go black
            });
            canvas.toBlob((blob) => {
                if (!blob) { this.errorMsg = 'No se pudo recortar la imagen.'; return; }
                this.croppedBlob = blob;
                if (this.previewUrl.startsWith('blob:')) URL.revokeObjectURL(this.previewUrl);
                this.previewUrl = URL.createObjectURL(blob);
                this.stage = 'ready';
                this.destruirCropper();
            }, 'image/jpeg', 0.92);
        },

        resetImagen() {
            this.destruirCropper();
            this.revocar();
            this.croppedBlob = null;
            this.previewUrl = '';
            this.stage = 'empty';
            if (this.$refs.fileInput) this.$refs.fileInput.value = '';
        },

        destruirCropper() {
            if (this.cropper) { this.cropper.destroy(); this.cropper = null; }
        },

        revocar() {
            if (this.srcUrl && this.srcUrl.startsWith('blob:')) URL.revokeObjectURL(this.srcUrl);
            if (this.previewUrl && this.previewUrl.startsWith('blob:')) URL.revokeObjectURL(this.previewUrl);
            this.srcUrl = '';
        },

        pesoBlob() {
            if (!this.croppedBlob) return '';
            return `${(this.croppedBlob.size / 1048576).toFixed(1)} MB`;
        },

        // ═══ save / delete ═══
        async guardar() {
            if (this.mode === 'add' && !this.croppedBlob) {
                this.errorMsg = this.stage === 'cropping'
                    ? 'Confirmá el recorte antes de subir.'
                    : 'Elegí una imagen para subir.';
                return;
            }
            this.errorMsg = '';
            this.saving = true;
            this.progress = 0;
            try {
                if (this.mode === 'edit') {
                    await axios.put(`/api/v1/gallery/${this.form.id}`, {
                        title: this.form.title.trim(),
                        description: this.form.description.trim(),
                        instagramLink: this.form.instagramLink.trim(),
                        visible: this.form.visible,
                    });
                } else {
                    const body = new FormData();
                    body.append('image', this.croppedBlob, 'foto.jpg');
                    body.append('aspect', this.aspect);
                    body.append('title', this.form.title.trim());
                    body.append('description', this.form.description.trim());
                    body.append('instagramLink', this.form.instagramLink.trim());
                    body.append('visible', this.form.visible ? 'true' : 'false');
                    await axios.post('/api/v1/gallery', body, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                        onUploadProgress: (ev) => {
                            if (ev.total) this.progress = Math.round((ev.loaded / ev.total) * 100);
                        },
                    });
                }

                this.open = false;
                this.resetImagen();
                await this.cargar();
                hqOk(this.mode === 'add' ? 'Foto subida' : 'Foto actualizada', this.form.title || '');
            } catch (e) {
                this.errorMsg = e.response?.data?.error || 'Error al guardar. Intentá de nuevo.';
            } finally {
                this.saving = false;
                this.progress = 0;
            }
        },

        async eliminar() {
            const result = await Swal.fire({
                title: '¿Eliminar foto?',
                text: 'Se borra de la galería y del almacenamiento. No se puede deshacer.',
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
                await axios.delete(`/api/v1/gallery/${this.form.id}`);
                this.open = false;
                this.resetImagen();
                await this.cargar();
                hqOk('Foto eliminada');
            } catch (e) {
                this.errorMsg = 'No se pudo eliminar la foto';
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
