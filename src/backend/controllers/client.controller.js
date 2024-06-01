const Client = require('../models/clients/client.model');
const { sign } = require('../helpers/cipher')

exports.get = async (req, res) => {
    const clients = await Client.get();
    res.json(clients);
};

exports.create = async (req, res) => {
    console.log(req.body)
    const client = await Client.create(req.body);
    res.json(client);
};

exports.update = async (req, res) => {
    const {id} = req.params;
    const client = await Client.update(id, req.body);
    res.json(client);
};

exports.delete = async (req, res) => {
    const {id} = req.params;
    const client = await Client.delete(id);
    res.json(client);
};