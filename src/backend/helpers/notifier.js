const axios = require('axios');
const twilio = require('twilio');

class Notifier {
    constructor() {
        this.telegramToken = process.env.TELEGRAM_TOKEN;
        this.telegramChatId = process.env.TELEGRAM_CHAT_ID;
        
        this.twilioClient = null;
        if(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            try {
                this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            } catch(e) {
                console.error("Twilio setup error", e);
            }
        }
    }

    async sendAdminAlert(message) {
        if (!this.telegramToken || !this.telegramChatId) {
            console.log("[-] Telegram alert skipped: No config found. Message:", message);
            return;
        }

        try {
            const url = `https://api.telegram.org/bot${this.telegramToken}/sendMessage`;
            await axios.post(url, {
                chat_id: this.telegramChatId,
                text: message,
                parse_mode: 'HTML' // Usar HTML en vez de Markdown suele ser menos estricto con caracteres especiales
            });
        } catch (error) {
            console.error("Error sending Telegram alert:", error.response?.data || error.message);
        }
    }

    async sendClientConfirmation(phone, data) {
        if (!this.twilioClient || !process.env.TWILIO_FROM_PHONE) {
            console.log(`[-] Twilio alert skipped for ${phone}: No config found. Data:`, data);
            return;
        }

        try {
            // Limpiar teléfono de espacios, guiones
            let cleanPhone = phone.replace(/[^\d+]/g, '');
            // Si no tiene código de país (Ej Costa Rica +506), se lo añadimos por defecto si tiene 8 dígitos
            if(!cleanPhone.startsWith('+') && cleanPhone.length === 8) {
                cleanPhone = `+506${cleanPhone}`;
            }

            const messageOptions = {
                body: `¡Hola ${data.clientName}! 💈 Tu cita en High Quality Studio ha sido confirmada para el ${data.date} a las ${data.time}.\n\nPara cancelar responde a este mensaje con la palabra "CANCELAR".\nTe esperamos.`,
                from: process.env.TWILIO_FROM_PHONE, // Formato "whatsapp:+14155238886" recomendado si usas Twilio Sandbox WA, si no, número SMS normal
                to: process.env.TWILIO_FROM_PHONE.includes('whatsapp:') ? `whatsapp:${cleanPhone}` : cleanPhone
            };

            const message = await this.twilioClient.messages.create(messageOptions);
            console.log(`Notification sent to ${cleanPhone}, SID: ${message.sid}`);
        } catch (error) {
            console.error("Error sending SMS/WhatsApp message:", error);
        }
    }
}

module.exports = new Notifier();
