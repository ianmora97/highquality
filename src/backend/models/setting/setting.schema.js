const mongoose = require('mongoose');

// One row per line of the "Horario" block in the public footer. This is plain
// display text typed by the admin — it has NOTHING to do with the `horarios`
// collection that drives the booking grid.
const ScheduleRowSchema = new mongoose.Schema({
    label:  { type: String, default: '', trim: true },   // "Lun – Vie"
    value:  { type: String, default: '', trim: true },   // "9am – 7pm"
    closed: { type: Boolean, default: false },           // paints the value red
}, { _id: false });

const ContactSchema = new mongoose.Schema({
    address:   { type: String, default: 'Hatillo 5, San José, Costa Rica', trim: true },
    phone:     { type: String, default: '+506 7245-1908', trim: true },
    whatsapp:  { type: String, default: '50672451908', trim: true },
    whatsappText: { type: String, default: 'Quiero sacar una cita', trim: true },
    instagram: { type: String, default: 'high_quality_barber.cr', trim: true },
    maps:      { type: String, default: 'https://maps.app.goo.gl/og9Jny78AHMnbg2z7', trim: true },
    waze:      { type: String, default: '', trim: true },
}, { _id: false });

const DEFAULT_SCHEDULE = [
    { label: 'Lun – Vie', value: '9am – 7pm', closed: false },
    { label: 'Sábado',    value: '8am – 6pm', closed: false },
    { label: 'Domingo',   value: 'Cerrado',   closed: true  },
];

const SettingSchema = new mongoose.Schema({
    whatsappConfirmEnabled: { type: Boolean, default: true },
    contact:  { type: ContactSchema, default: () => ({}) },
    schedule: { type: [ScheduleRowSchema], default: () => DEFAULT_SCHEDULE },
}, { timestamps: true });

SettingSchema.statics.getSingleton = async function () {
    let doc = await this.findOne();
    if (!doc) doc = await this.create({});
    // Rows saved before `contact`/`schedule` existed come back without them.
    if (!doc.contact) doc.contact = {};
    if (!doc.schedule || !doc.schedule.length) doc.schedule = DEFAULT_SCHEDULE;
    return doc;
};

const digits = (v) => String(v || '').replace(/\D/g, '');

// Instagram is stored as a handle ("high_quality_barber.cr") but a full URL is
// accepted too — the admin can paste either.
const instagramUrl = (v) => {
    const raw = String(v || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    return 'https://www.instagram.com/' + raw.replace(/^@/, '');
};

const instagramHandle = (v) => {
    const raw = String(v || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) {
        const m = raw.match(/instagram\.com\/([^/?#]+)/i);
        return m ? '@' + m[1] : raw;
    }
    return '@' + raw.replace(/^@/, '');
};

// What the public pages render. Links are derived here so the views never have
// to build a URL out of a stored value.
SettingSchema.statics.publicInfo = async function () {
    const doc = await this.getSingleton();
    const c   = doc.contact || {};
    const wa  = digits(c.whatsapp);
    const tel = digits(c.phone);
    return {
        contact: {
            address:   c.address   || '',
            phone:     c.phone     || '',
            instagram: instagramHandle(c.instagram),
        },
        links: {
            tel:       tel ? 'tel:+' + tel : '',
            whatsapp:  wa  ? `https://wa.me/${wa}?text=${encodeURIComponent(c.whatsappText || '')}` : '',
            instagram: instagramUrl(c.instagram),
            maps:      c.maps || '',
            waze:      c.waze || '',
        },
        schedule: (doc.schedule || []).map(r => ({
            label:  r.label,
            value:  r.value,
            closed: !!r.closed,
        })),
    };
};

const Setting = mongoose.model('Setting', SettingSchema);
module.exports = Setting;
