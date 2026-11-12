const axios = require('axios');
const moment = require('moment');
moment.locale('es');
require('dotenv').config();

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// "Cerrado" blocks and the 88008800 sentinel are agenda entries, not clients.
const isCita = (e) => e?.title !== 'Cerrado' && e?.extendedProps?.numero !== '88008800';

// Never throws: a Telegram outage must not break booking or the reminder loop.
async function send(text) {
    const { TELEGRAM_TOKEN, TELEGRAM_CHAT_ID } = process.env;
    if (!TELEGRAM_TOKEN || !TELEGRAM_CHAT_ID) return null;
    try {
        const { data } = await axios.post(
            `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
            { chat_id: TELEGRAM_CHAT_ID, text, parse_mode: 'HTML' },
            { timeout: 10000 }
        );
        return data;
    } catch (error) {
        // error.message only: the AxiosError config carries the bot token in its URL.
        console.error('[telegram] envío falló:', error.message);
        return null;
    }
}

function detalle(e) {
    const servicios = (e.extendedProps?.servicios || []).join(', ') || '—';
    const telefono = e.extendedProps?.numero || 'No disponible';
    return `👤 Cliente: <b>${esc(e.title)}</b>\n📞 Teléfono: ${esc(telefono)}\n🔖 Servicio(s): <b>${esc(servicios)}</b>\n📅 ${moment(e.start).format('ddd D MMM')} a las ${moment(e.start).format('h:mm a')}`;
}

const notifyNuevaCita = (e, origen = 'client') =>
    isCita(e) ? send(`💈 <b>${origen === 'admin' ? 'Cita agregada' : 'Nueva cita'}</b> 💈\n\n${detalle(e)}`) : null;

const notifyCancelada = (e) =>
    isCita(e) ? send(`❌ <b>Cita cancelada</b>\n\n${detalle(e)}`) : null;

const notifyRecordatorio = (e) =>
    send(`⏰ <b>Próxima cita en ~10 min</b>\n\n${detalle(e)}`);

module.exports = { notifyNuevaCita, notifyCancelada, notifyRecordatorio };
