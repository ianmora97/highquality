const FA_ICONS = [
    { cls: 'fa-solid fa-scissors',      label: 'Tijeras'      },
    { cls: 'fa-solid fa-droplet',        label: 'Navaja/Barba' },
    { cls: 'fa-solid fa-mask',           label: 'Mascarilla'   },
    { cls: 'fa-solid fa-child',          label: 'Niño'         },
    { cls: 'fa-solid fa-clock',          label: 'Reloj'        },
    { cls: 'fa-solid fa-spa',            label: 'Spa'          },
    { cls: 'fa-solid fa-pen-nib',        label: 'Diseño'       },
    { cls: 'fa-solid fa-pencil',         label: 'Lápiz'        },
    { cls: 'fa-solid fa-pump-soap',      label: 'Jabón/Afeit.' },
    { cls: 'fa-solid fa-user-tie',       label: 'Corte y barba'},
    { cls: 'fa-solid fa-wand-sparkles',  label: 'Cejas'        },
    { cls: 'fa-solid fa-face-smile',     label: 'Facial'       },
    { cls: 'fa-solid fa-crown',          label: 'Corona'       },
    { cls: 'fa-solid fa-star',           label: 'Estrella'     },
    { cls: 'fa-solid fa-gem',            label: 'Diamante'     },
    { cls: 'fa-solid fa-fire',           label: 'Fuego'        },
    { cls: 'fa-solid fa-bolt',           label: 'Rayo'         },
    { cls: 'fa-solid fa-droplet',        label: 'Gota'         },
    { cls: 'fa-solid fa-pump-soap',      label: 'Jabón'        },
    { cls: 'fa-solid fa-hand-sparkles',  label: 'Manos'        },
    { cls: 'fa-solid fa-eye',            label: 'Ojo'          },
    { cls: 'fa-solid fa-heart',          label: 'Corazón'      },
    { cls: 'fa-solid fa-user',           label: 'Persona'      },
    { cls: 'fa-solid fa-shield-halved',  label: 'Escudo'       },
];

var g_servicios = new Map();
var faIconSelected_add  = 'fa-solid fa-scissors';
var faIconSelected_edit = 'fa-solid fa-scissors';

var iconTypeSelected_add  = 'icon';
var iconTypeSelected_edit = 'icon';
var cropperInstance_add   = null;
var cropperInstance_edit  = null;
var croppedBlob_add       = null;
var croppedBlob_edit      = null;

function init() {
    buildFaIconGrid('faIconGrid-add',  'faIconPreviewIcon-add',  'faIconPreviewName-add',  (cls) => { faIconSelected_add  = cls; });
    buildFaIconGrid('faIconGrid-edit', 'faIconPreviewIcon-edit', 'faIconPreviewName-edit', (cls) => { faIconSelected_edit = cls; });
    bringData();
}

function buildFaIconGrid(gridId, previewIconId, previewNameId, onSelect) {
    const grid = document.getElementById(gridId);
    FA_ICONS.forEach(({ cls, label }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'fa-icon-btn';
        btn.title = label;
        btn.innerHTML = `<i class="${cls}"></i>`;
        btn.addEventListener('click', () => {
            grid.querySelectorAll('.fa-icon-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(previewIconId).className = cls + ' fa-icon-preview-i';
            document.getElementById(previewNameId).textContent = label;
            onSelect(cls);
        });
        grid.appendChild(btn);
    });
}

function selectFaIconInGrid(gridId, previewIconId, previewNameId, cls) {
    const grid = document.getElementById(gridId);
    grid.querySelectorAll('.fa-icon-btn').forEach((btn, i) => {
        const match = FA_ICONS[i] && FA_ICONS[i].cls === cls;
        btn.classList.toggle('active', match);
        if (match) {
            document.getElementById(previewIconId).className = cls + ' fa-icon-preview-i';
            document.getElementById(previewNameId).textContent = FA_ICONS[i].label;
        }
    });
}

function setIconType(mode, type, btn) {
    if (mode === 'add') iconTypeSelected_add = type;
    else iconTypeSelected_edit = type;

    document.querySelectorAll(`#iconTypeBtns-${mode} .icon-type-btn`).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    document.getElementById(`iconSection-${mode}`).style.display = type === 'icon' ? 'block' : 'none';
    document.getElementById(`imageSection-${mode}`).style.display = type === 'image' ? 'block' : 'none';
}

function handleFileSelect(mode, input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.getElementById(`cropperImg-${mode}`);
        img.src = e.target.result;
        document.getElementById(`uploadPlaceholder-${mode}`).style.display = 'none';
        document.getElementById(`cropperContainer-${mode}`).style.display = 'block';
        document.getElementById(`cropConfirmed-${mode}`).style.display = 'none';

        if (mode === 'add' && cropperInstance_add) { cropperInstance_add.destroy(); cropperInstance_add = null; }
        if (mode === 'edit' && cropperInstance_edit) { cropperInstance_edit.destroy(); cropperInstance_edit = null; }

        const instance = new Cropper(img, {
            aspectRatio: 1,
            viewMode: 1,
            autoCropArea: 1,
        });
        if (mode === 'add') cropperInstance_add = instance;
        else cropperInstance_edit = instance;
    };
    reader.readAsDataURL(file);
}

function confirmCrop(mode) {
    const instance = mode === 'add' ? cropperInstance_add : cropperInstance_edit;
    if (!instance) return;
    instance.getCroppedCanvas({ width: 800, height: 800 }).toBlob((blob) => {
        if (mode === 'add') croppedBlob_add = blob;
        else croppedBlob_edit = blob;
        document.getElementById(`cropperContainer-${mode}`).style.display = 'none';
        document.getElementById(`cropConfirmed-${mode}`).style.display = 'block';
    }, 'image/webp', 0.9);
}

function resetCrop(mode) {
    if (mode === 'add') {
        croppedBlob_add = null;
        if (cropperInstance_add) { cropperInstance_add.destroy(); cropperInstance_add = null; }
    } else {
        croppedBlob_edit = null;
        if (cropperInstance_edit) { cropperInstance_edit.destroy(); cropperInstance_edit = null; }
    }
    document.getElementById(`fileInput-${mode}`).value = '';
    document.getElementById(`uploadPlaceholder-${mode}`).style.display = 'block';
    document.getElementById(`cropperContainer-${mode}`).style.display = 'none';
    document.getElementById(`cropConfirmed-${mode}`).style.display = 'none';
}

async function bringData() {
    const { data } = await axios.get('/api/v1/services');
    fillData(data);
}

async function reloadData() {
    const { data } = await axios.get('/api/v1/services');
    fillData(data);
}

function fillData(data) {
    if (!data) return;
    $("#listaServicios").empty();
    data.forEach((e, i) => {
        g_servicios.set(e._id, e);
        addService(e, i + 1);
    });
}

function addService(item, i) {
    let iconHtml;
    if (item.imageType === 'image' && item.imageUrl) {
        iconHtml = `<img src="${item.imageUrl}" alt="${item.name}" style="width:80px; height:80px; object-fit:cover; border-radius:8px;">`;
    } else if (item.faIcon) {
        iconHtml = `<i class="${item.faIcon}" style="font-size:2.5rem; color:#F4C82C;"></i>`;
    } else {
        iconHtml = `<img src="/images/icons/${item.icon}" class="p-2" alt="${item.name}" style="filter:invert(1); width:80px;">`;
    }

    $("#listaServicios").append(`
        <div class="card bg-fore shadow py-3 animate__animated animate__fadeInDown"
             style="min-width:200px; animation-delay:${i * 50}ms;">
            <div class="d-flex justify-content-center align-items-center" style="height:90px;">
                ${iconHtml}
            </div>
            <div class="card-body text-center">
                <h5 class="fw-bold">${item.name}</h5>
                <p class="card-text mb-3">${item.price} colones</p>
                <div class="d-flex justify-content-center mb-4">
                    <div class="form-check form-switch form-check-lg">
                        <input class="form-check-input" type="checkbox"
                               onchange="cambiarestado('${item._id}')"
                               role="switch" id="switchservicio-${item.name}"
                               ${item.enable ? 'checked' : ''}>
                    </div>
                </div>
                <button type="button" class="btn btn-secondary btn-sm"
                        onclick="actualizarServicioOpenModal('${item._id}')">
                    <i class="fa-duotone fa-pen"></i> Editar
                </button>
            </div>
        </div>
    `);
}

async function agregarServicio() {
    const faIcon = iconTypeSelected_add === 'icon' ? faIconSelected_add : '';
    const dataSend = {
        name:      $("#nombre-add").val(),
        price:     $("#precio-add").val(),
        faIcon,
        imageType: iconTypeSelected_add,
        enable:    true,
    };
    const { data: newService } = await axios.post('/api/v1/services', dataSend);

    if (iconTypeSelected_add === 'image' && croppedBlob_add && newService._id) {
        const form = new FormData();
        form.append('image', croppedBlob_add, 'service.webp');
        await axios.post(`/api/v1/services/${newService._id}/image`, form, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }

    croppedBlob_add = null;
    await reloadData();
    $("#addService").modal('hide');
}

function actualizarServicioOpenModal(id) {
    const servicio = g_servicios.get(id);
    $("#idUpdate").html(servicio._id);
    $("#nombre-edit").val(servicio.name);
    $("#precio-edit").val(servicio.price);

    const type = servicio.imageType || 'icon';
    iconTypeSelected_edit = type;
    const typeBtn = document.querySelector(`#iconTypeBtns-edit [data-type="${type}"]`);
    if (typeBtn) setIconType('edit', type, typeBtn);

    faIconSelected_edit = servicio.faIcon || 'fa-solid fa-scissors';
    selectFaIconInGrid('faIconGrid-edit', 'faIconPreviewIcon-edit', 'faIconPreviewName-edit', faIconSelected_edit);

    croppedBlob_edit = null;
    if (cropperInstance_edit) { cropperInstance_edit.destroy(); cropperInstance_edit = null; }
    document.getElementById('uploadPlaceholder-edit').style.display = 'block';
    document.getElementById('cropperContainer-edit').style.display = 'none';
    document.getElementById('cropConfirmed-edit').style.display = 'none';

    if (servicio.imageUrl && type === 'image') {
        document.getElementById('cropConfirmed-edit').style.display = 'block';
        document.getElementById('cropConfirmed-edit').innerHTML = `<img src="${servicio.imageUrl}" style="height:60px; border-radius:6px;"> <span class="text-gray-400 text-xs ms-2">Imagen actual</span>`;
    }

    $("#editService").modal('show');
}

async function actualizarServicio() {
    const id = $("#idUpdate").html();
    const faIcon = iconTypeSelected_edit === 'icon' ? faIconSelected_edit : '';
    const dataSend = {
        name:      $("#nombre-edit").val(),
        price:     $("#precio-edit").val(),
        faIcon,
        imageType: iconTypeSelected_edit,
    };
    await axios.put(`/api/v1/services/${id}`, dataSend);

    if (iconTypeSelected_edit === 'image' && croppedBlob_edit) {
        const form = new FormData();
        form.append('image', croppedBlob_edit, 'service.webp');
        await axios.post(`/api/v1/services/${id}/image`, form, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    }

    croppedBlob_edit = null;
    await reloadData();
    $("#editService").modal('hide');
}

async function cambiarestado(id) {
    const servicio = g_servicios.get(id);
    await axios.put(`/api/v1/services/${id}`, { enable: !servicio.enable });
}

document.addEventListener('DOMContentLoaded', init);
