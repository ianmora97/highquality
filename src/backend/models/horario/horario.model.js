const Horario = require('./horario.schema');

exports.get = async () => {
    const horario = await Horario.find().lean();
    return horario;
};

exports.create = async (data) => {
    const horario = new Horario(data);
    await horario.save();
    return horario;
};

exports.update = async (id, data) => {
    const horario = await Horario.findByIdAndUpdate(id, data);
    return horario;
};

exports.delete = async (id) => {
    const horario = await Horario.findByIdAndDelete(id);
    return horario;
};