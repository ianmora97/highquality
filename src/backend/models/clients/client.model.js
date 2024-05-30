const Client = require('./client.schema');
const moment = require('moment');

exports.get = async () => {
    const clients = await Client.find();
    return clients;
};

exports.findOne = async (phone) => {
    const client = await Client.findOne({ 
        numero: phone
     });
    return client;
};

exports.create = async (client) => {
    client.createdAt = moment().format();
    const newClient = new Client(client);
    await newClient.save();
    return newClient;
};

exports.update = async (id, data) => {
    const client = await Client.findByIdAndUpdate(id, data);
    return client;
};

exports.delete = async (id) => {
    const client = await Client.findByIdAndDelete(id);
    return client;
};