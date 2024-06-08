const Event = require('../models/events/event.model');
const { addClient } = require('../helpers/addClient');
const axios = require('axios');
const moment = require('moment');

exports.migrate = async (req, res) => {
    const url = 'https://highqualitycr.com/api/admin/reservas/ios/shorcut';
    const {data} = await axios.get(url);
    for (let i = 0; i < data.length; i++) {
        const e = data[i];
        let start = moment(e.start, 'YYYY-MM-DDThh:mm').format();
        const estado = moment(start).isBefore(moment()) ? 'PAGO' : 'PENDIENTE';
        const backgroundColor = estado == 'PAGO' ? '#064724' : '#191919';
        const borderColor = estado == 'PAGO' ? '#44c780' : '#595959';
        let insert = {
            title: e.nombre,
            start: start,
            end: moment(start).add(30,'minutes').format(),
            allDay: false,
            display: 'auto',
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            textColor: '#ffffff',
            extendedProps: {
                servicios: e.description.replace(' ','').split(','),
                numero: parseInt(e.telefono),
                estado: estado,
                precio: e.precio
            },
        }
        const event = await Event.create(insert);
        await addClient(insert);
    }
    res.send("All Data Migrated");
};