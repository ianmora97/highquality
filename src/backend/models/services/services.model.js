const Services = require('./services.schema');
const { normalizeUrl, keyFromUrl } = require('../../helpers/storage');

exports.get = async () => {
    const services = await Services.find().lean();
    // Images stored before the public-URL fix hold a signed-only /storage/v1/s3/
    // link that answers 403 to an <img>. Repair it on read.
    return services.map((s) => {
        if (!s.imageUrl) return s;
        s.imageUrl = normalizeUrl(s.imageUrl);
        if (!s.imageKey) s.imageKey = keyFromUrl(s.imageUrl);
        return s;
    });
};

exports.create = async (service) => {
    const newService = new Services(service);
    await newService.save();
    return newService;
};

exports.update = async (id, data) => {
    const service = await Services.findByIdAndUpdate(id, data, { new: true });
    return service;
};

exports.delete = async (id) => {
    const service = await Services.findByIdAndDelete(id);
    return service;
};