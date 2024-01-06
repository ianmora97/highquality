const Services = require('./services.schema');

exports.get = async () => {
    const services = await Services.find().lean();
    return services;
};

exports.create = async (service) => {
    const newService = new Services(service);
    await newService.save();
    return newService;
};

exports.update = async (id, data) => {
    const service = await Services.findByIdAndUpdate(id, data);
    return service;
};

exports.delete = async (id) => {
    const service = await Services.findByIdAndDelete(id);
    return service;
};