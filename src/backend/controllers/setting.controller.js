const Setting = require('../models/setting/setting.schema');

exports.get = async (req, res) => {
    const setting = await Setting.getSingleton();
    res.json(setting);
};

exports.update = async (req, res) => {
    const setting = await Setting.getSingleton();
    if (typeof req.body.whatsappConfirmEnabled === 'boolean') {
        setting.whatsappConfirmEnabled = req.body.whatsappConfirmEnabled;
    }
    await setting.save();
    res.json(setting);
};
