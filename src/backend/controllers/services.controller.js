const Services = require('../models/services/services.model');
const ServicesSchema = require('../models/services/services.schema');
const path = require('node:path');
const fs = require('fs');
const { uploadImage, deleteImage, imageUpload } = require('../helpers/storage');

exports.uploadMiddleware = imageUpload({ field: 'image', maxMb: 15 });

exports.uploadImage = async (req, res) => {
    if (!req.file) {
        const err = new Error('No se recibió imagen.');
        err.status = 400;
        throw err;
    }
    const { id } = req.params;

    // Keep the old object's key so replacing an image doesn't leave it orphaned
    // in the bucket forever.
    const previous = await ServicesSchema.findById(id).select('imageKey').lean();

    const { url, key } = await uploadImage(req.file.buffer, 'services', { width: 800, height: 800 });
    const service = await Services.update(id, { imageUrl: url, imageKey: key, imageType: 'image' });

    if (previous?.imageKey && previous.imageKey !== key) await deleteImage(previous.imageKey);

    res.json({ url, key, service });
};

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