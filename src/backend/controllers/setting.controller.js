const Setting = require('../models/setting/setting.schema');

const CONTACT_FIELDS = ['address', 'phone', 'whatsapp', 'whatsappText', 'instagram', 'maps', 'waze'];

exports.get = async (req, res) => {
    const setting = await Setting.getSingleton();
    res.json(setting);
};

exports.update = async (req, res) => {
    const setting = await Setting.getSingleton();

    if (typeof req.body.whatsappConfirmEnabled === 'boolean') {
        setting.whatsappConfirmEnabled = req.body.whatsappConfirmEnabled;
    }

    if (req.body.contact && typeof req.body.contact === 'object') {
        if (!setting.contact) setting.contact = {};
        CONTACT_FIELDS.forEach((k) => {
            if (typeof req.body.contact[k] === 'string') {
                setting.contact[k] = req.body.contact[k].trim();
            }
        });
    }

    // Whole-array replace: the admin edits the rows as a list, and an empty row
    // is a deleted row.
    if (Array.isArray(req.body.schedule)) {
        setting.schedule = req.body.schedule
            .map(r => ({
                label:  String(r && r.label || '').trim(),
                value:  String(r && r.value || '').trim(),
                closed: !!(r && r.closed),
            }))
            .filter(r => r.label || r.value)
            .slice(0, 12);
    }

    await setting.save();
    res.json(setting);
};
