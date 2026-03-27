const Event = require('../models/events/event.model');
const cron = require('node-cron');
const moment = require('moment');
const axios = require('axios');
require('dotenv').config();
const {TELEGRAM_TOKEN,TELEGRAM_CHAT_ID} = process.env;

async function createTelegramMessagesCron(){
    cron.schedule('23 * * * *', async () => {
        console.log("Running Task every hour");
        let fecha = moment().add(1, "hours").format();
        const {data: rows} = await Event.get(null, null, fecha ,null);
        rows.forEach(async (row) => {
            const servicios = data.extendedProps.servicios.join(', ');
            let message = ` 💈 <b>Cita en 5 min</b> 💈 %0A 👤 Cliente: ${data.title}%0A ${servicios} %0A-----------------`;
            const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage?chat_id=${TELEGRAM_CHAT_ID}&text=${message}&parse_mode=html`;
            const {data: response} = await axios.get(url);
            return response;
        });
    });
}

module.exports = {
    createTelegramMessagesCron
}