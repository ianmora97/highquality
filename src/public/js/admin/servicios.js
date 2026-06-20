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
    const iconHtml = item.faIcon
        ? `<i class="${item.faIcon}" style="font-size:2.5rem; color:#F4C82C;"></i>`
        : `<img src="/images/icons/${item.icon}" class="p-2" alt="${item.name}" style="filter:invert(1); width:80px;">`;

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
    const dataSend = {
        name:   $("#nombre-add").val(),
        price:  $("#precio-add").val(),
        faIcon: faIconSelected_add,
        enable: true,
    };
    await axios.post('/api/v1/services', dataSend);
    reloadData();
    $("#addService").modal('hide');
}

function actualizarServicioOpenModal(id) {
    const servicio = g_servicios.get(id);
    $("#idUpdate").html(servicio._id);
    $("#nombre-edit").val(servicio.name);
    $("#precio-edit").val(servicio.price);

    faIconSelected_edit = servicio.faIcon || 'fa-solid fa-scissors';
    selectFaIconInGrid('faIconGrid-edit', 'faIconPreviewIcon-edit', 'faIconPreviewName-edit', faIconSelected_edit);

    $("#editService").modal('show');
}

async function actualizarServicio() {
    const id = $("#idUpdate").html();
    const dataSend = {
        name:   $("#nombre-edit").val(),
        price:  $("#precio-edit").val(),
        faIcon: faIconSelected_edit,
    };
    await axios.put(`/api/v1/services/${id}`, dataSend);
    reloadData();
    $("#editService").modal('hide');
}

async function cambiarestado(id) {
    const servicio = g_servicios.get(id);
    await axios.put(`/api/v1/services/${id}`, { enable: !servicio.enable });
}

document.addEventListener('DOMContentLoaded', init);
