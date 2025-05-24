const moment = require('moment');
require('dotenv').config();
const {TWILIO_ACCOUNT_SID,TWILIO_AUTH_TOKEN} = process.env;
const client = require('twilio')(TWILIO_ACCOUNT_SID,TWILIO_AUTH_TOKEN);


async function sendWhatsappMessage(data){
    const servicios = data.extendedProps.servicios.join(', ');
    const date = moment(data.start).format('ddd D MMM - h:mm a');

    const message = await client.messages.create({
        contentSid: "HX59f74f7f5fe32223820bdb15f75ecd04",
        messagingServiceSid: "MGddb5ff477ad80676eb551282606c71c6",
        contentVariables: JSON.stringify({
            1: date,
            2: servicios,
            3: data.title
        }),
        from: 'whatsapp:+50664398822',
        to: `whatsapp:+506${data.extendedProps.numero}`
    });
    return true;
}

module.exports = {
    sendWhatsappMessage
}