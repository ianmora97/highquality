const Services = require('../models/services/services.model');
const path = require('node:path');
const fs = require('fs');

exports.get = async (req, res) => {
    const services = await Services.get();
    res.json(services);
};

exports.getIcons = async (req, res) => {
    let _path = path.join(__dirname, '../../public/images/icons');
    fs.readdir(_path, function (err, files) {
        if (err) {
            console.log('Unable to scan directory: ' + err);
        } 
        res.send(files);
    });
};

exports.create = async (req, res) => {
    const service = await Services.create(req.body);
    res.json(service);
};

exports.update = async (req, res) => {
    const {id} = req.params;
    const service = await Services.update(id, req.body);
    res.json(service);
};

exports.delete = async (req, res) => {
    const {id} = req.params;
    const service = await Services.delete(id);
    res.json(service);
};