function init(event){
    bringData();
}

async function init(){
    const {data} = await axios.get('/api/v1/client');
    fillData(data);
}

function fillData(data){
    $("#tbody").empty();
    analytics(data);
    data.forEach((e,i)=>{
        addData(e);
    });
    createDataTables();
}

function addData(e){
    $("#tbody").append(`
        <tr>
            <td class="fw-bold">${e.nombre}</td>
            <td>
                <h5 class="text-primary mb-0">${e.citasPagas}</h5>
            </td>
            <td class="">
                <a href="tel:${e.numero}" class="text-gray">${e.numero}</a>
            </td>
        </tr>
    `);
}
function analytics(data){
    const length = data.length;
    $("#totalitems").text(length);
    anime({
        targets: '#totalitems',
        innerHTML: [0,length],
        easing: 'linear',
        round: 1,
        duration: 500,
    });
}
function createDataTables(){
    $("#table").DataTable({
        responsive: true,
        select: false,
        keys: false,
        order: [[ 1, "desc" ]],
        scrollCollapse: false,
        columnDefs:[
            { type: 'text', targets: [0,1,2]}
        ],
        lengthMenu: [
            [ 10, 50, 100, 150, 500 -1 ],
            [ "10", "50", "100", "150", "500", 'Todos' ]
        ],
        language: {
            decimal:        "",
            emptyTable:     "No hay clientes",
            info:           "Mostrando _END_ de _TOTAL_ clientes ",
            select: {
                rows: {
                    _: "",
                    0: "",
                    1: ""
                }
            },
            infoEmpty:      "Mostrando 0 hasta 0 de 0 clientes",
            infoFiltered:   "(Filtrado de _MAX_ clientes totales)",
            infoPostFix:    "",
            thousands:      ",",
            lengthMenu:     "Mostrando _MENU_",
            loadingRecords: "Cargando...",
            processing:     "Procesando...",
            search:         "Buscar:",
            zeroRecords:    "No se encontraron clientes similares",
            paginate: {
                first: '<i class="fa-duotone fa-angle-double-left"></i>',
                previous: '<i class="fa-duotone fa-angle-left"></i>',
                next: '<i class="fa-duotone fa-angle-right"></i>',
                last: '<i class="fa-duotone fa-angle-double-right"></i>'
            },
            aria: {
                paginate: {
                    first: '<i class="fa-duotone fa-angle-double-left"></i>',
                    previous: '<i class="fa-duotone fa-angle-left"></i>',
                    next: '<i class="fa-duotone fa-angle-right"></i>',
                    last: '<i class="fa-duotone fa-angle-double-right"></i>'
                }
            },
            buttons:{
                pageLength: {
                    _: "<i class='fa-solid fa-grip-lines'></i> Mostrar %d",
                    '-1': "Todos"
                },
            }
        },
        responsive: {
            details: {
                type: 'column',
                target: 'tr',
                renderer: function ( api, rowIdx, columns ) {
                    var data = $.map( columns, function ( col, i ) {
                        return col.hidden ?`
                                <tr data-dt-row="${col.rowIndex}" data-dt-column="${col.columnIndex}">
                                    <td class="fw-bold">${col.title}:</td>
                                    <td>${col.data}</td>
                                </tr>
                                `:'';
                    } ).join('');
                    return data ?
                        $('<table/>').append( data ) :
                        false;
                }
            },
        }
    });
    const table = $("#table").DataTable();
    $('#info').html('');
    $('.dt-length').html('');
    $('.dt-search').html('');
    $('#pagination').html('');
    $('#table_info').appendTo('#info');

    $('.dt-paging').appendTo('#pagination');
    $('#barraBuscar').on('keyup', function(){
        let val = $(this).val();
        var table = $("#table").DataTable();
        table.search(val).draw();
    });
}
document.addEventListener('DOMContentLoaded', init);