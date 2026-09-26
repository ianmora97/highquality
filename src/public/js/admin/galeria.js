var g_gallery = new Map();
var galleryCropperInstance = null;
var galleryCroppedBlob = null;

function init() { bringData(); }

async function bringData() {
    const { data } = await axios.get('/api/v1/gallery');
    g_gallery.clear();
    const grid = document.getElementById('galleryGrid');
    const empty = document.getElementById('emptyGallery');
    grid.innerHTML = '';
    if (!data.length) { empty.style.display = 'block'; return; }
    empty.style.display = 'none';
    data.forEach((e, i) => {
        g_gallery.set(e._id, e);
        addGalleryCard(e, i);
    });
}

function addGalleryCard(item, i) {
    const insta = item.instagramLink
        ? `<a href="https://instagram.com/${item.instagramLink}" target="_blank" class="text-xs text-blue-400 hover:text-blue-300"><i class="fa-brands fa-instagram me-1"></i>@${item.instagramLink}</a>`
        : '';
    const el = document.createElement('div');
    el.className = 'rounded-xl overflow-hidden border border-white/10 animate__animated animate__fadeInUp';
    el.style.cssText = `background:#0d0d0d; animation-delay:${i * 40}ms;`;
    el.innerHTML = `
        <div style="position:relative; padding-top:75%; overflow:hidden;">
            <img src="${item.imageUrl}" alt="${item.title || ''}"
                 style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;">
        </div>
        <div class="p-3">
            ${item.title ? `<div class="font-semibold text-white text-sm mb-1">${item.title}</div>` : ''}
            ${item.description ? `<div class="text-gray-500 text-xs mb-2">${item.description}</div>` : ''}
            ${insta}
            <div class="flex justify-end mt-2">
                <button class="btn btn-sm" style="background:rgba(220,38,38,0.15); color:#f87171; border:1px solid rgba(220,38,38,0.3);"
                        onclick="deleteGalleryPhoto('${item._id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    document.getElementById('galleryGrid').appendChild(el);
}

function handleGalleryFile(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.getElementById('galleryCropperImg');
        img.src = e.target.result;
        document.getElementById('galleryUploadPlaceholder').style.display = 'none';
        document.getElementById('galleryCropperContainer').style.display = 'block';
        document.getElementById('galleryCropConfirmed').style.display = 'none';
        if (galleryCropperInstance) { galleryCropperInstance.destroy(); galleryCropperInstance = null; }
        galleryCropperInstance = new Cropper(img, { aspectRatio: 4 / 3, viewMode: 1, autoCropArea: 1 });
    };
    reader.readAsDataURL(file);
}

function confirmGalleryCrop() {
    if (!galleryCropperInstance) return;
    galleryCropperInstance.getCroppedCanvas({ width: 1200, height: 900 }).toBlob((blob) => {
        galleryCroppedBlob = blob;
        document.getElementById('galleryCropperContainer').style.display = 'none';
        document.getElementById('galleryCropConfirmed').style.display = 'block';
    }, 'image/webp', 0.9);
}

function resetGalleryCrop() {
    galleryCroppedBlob = null;
    if (galleryCropperInstance) { galleryCropperInstance.destroy(); galleryCropperInstance = null; }
    document.getElementById('galleryFileInput').value = '';
    document.getElementById('galleryUploadPlaceholder').style.display = 'block';
    document.getElementById('galleryCropperContainer').style.display = 'none';
    document.getElementById('galleryCropConfirmed').style.display = 'none';
}

async function uploadGalleryPhoto() {
    if (!galleryCroppedBlob) {
        Swal.fire({ icon: 'warning', text: 'Selecciona y confirma una imagen', background: '#0d0d0d', color: '#f1f1f1' });
        return;
    }
    const form = new FormData();
    form.append('image', galleryCroppedBlob, 'gallery.webp');
    form.append('title', document.getElementById('gallery-title').value.trim());
    form.append('description', document.getElementById('gallery-desc').value.trim());
    form.append('instagramLink', document.getElementById('gallery-instagram').value.trim());

    try {
        const uploadBtn = document.querySelector('[onclick="uploadGalleryPhoto()"]');
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin me-1"></i> Subiendo...';

        await axios.post('/api/v1/gallery', form, { headers: { 'Content-Type': 'multipart/form-data' } });

        document.getElementById('addPhotoModal').classList.remove('modal-open');
        document.body.style.overflow = '';
        resetGalleryCrop();
        document.getElementById('gallery-title').value = '';
        document.getElementById('gallery-desc').value = '';
        document.getElementById('gallery-instagram').value = '';

        const toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#0d0d0d', color: '#f1f1f1' });
        toast.fire({ icon: 'success', title: 'Foto subida' });
        await bringData();
    } catch (err) {
        Swal.fire({ icon: 'error', text: err.response?.data?.error || 'Error al subir', background: '#0d0d0d', color: '#f1f1f1' });
    } finally {
        const uploadBtn = document.querySelector('[onclick="uploadGalleryPhoto()"]');
        if (uploadBtn) { uploadBtn.disabled = false; uploadBtn.innerHTML = '<i class="fa-solid fa-cloud-arrow-up me-1"></i> Subir Foto'; }
    }
}

async function deleteGalleryPhoto(id) {
    const result = await Swal.fire({
        icon: 'warning', title: '¿Eliminar foto?',
        showCancelButton: true, confirmButtonText: 'Eliminar', cancelButtonText: 'Cancelar',
        customClass: { confirmButton: 'btn btn-danger ms-2', cancelButton: 'btn btn-dark' },
        buttonsStyling: false, background: '#0d0d0d', color: '#f1f1f1'
    });
    if (result.isConfirmed) {
        await axios.delete('/api/v1/gallery/' + id);
        await bringData();
    }
}

document.addEventListener('DOMContentLoaded', init);
