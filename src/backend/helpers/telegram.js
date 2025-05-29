const axios = require('axios');
const moment = require('moment');
moment.locale('es');
require('dotenv').config();
const {TELEGRAM_TOKEN,TELEGRAM_CHAT_ID} = process.env;

async function sendTelegramMessage(data){
    const servicios = data.extendedProps.servicios.join(', ');
    const telefono = data.extendedProps.numero || 'No disponible';
    let message = ` 💈 Nueva cita 💈 %0A %0A👤 Cliente: <b>${data.title}</b>%0A📞 Telefono: ${telefono} %0A🔖 Servicio(s): <b>${servicios}</b> %0A📅 Fecha: ${moment(data.start).format('ddd D MMM')} a las ${moment(data.start).format('h:mm a')}%0A-----------------`;
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${message}&parse_mode=html`;
    const {data: response} = await axios.get(url);
    return response;
}


module.exports = {
    sendTelegramMessage
}