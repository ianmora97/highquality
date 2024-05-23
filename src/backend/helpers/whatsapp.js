const moment = require('moment');
require('dotenv').config();
const {TWILIO_ACCOUNT_SID,TWILIO_AUTH_TOKEN} = process.env;
const client = require('twilio')(TWILIO_ACCOUNT_SID,TWILIO_AUTH_TOKEN);


async function sendWhatsappMessage(data){
    const servicios = data.extendedProps.servicios.join(', ');
    const date = moment(data.start).format('ddd D MMM - h:mm a');
    client.messages.create({
        body: `🗓 *Fecha*: ${date} 
        \n🔖 *Servicio*: ${servicios} 
        \n👤 *Nombre*: ${data.title} 
        \nGracias por reservar con 
        \n💈 *HighQuality Barber* 💈`,
        from: 'whatsapp:+50664398822',
        to: `whatsapp:+506${data.extendedProps.numero}`
    }).then(message => {
        console.log("MENSAJE ENVIADO");
        return true;
    });
}

module.exports = {
    sendWhatsappMessage
}