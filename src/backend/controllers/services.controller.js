const Services = require('../models/services/services.model');
const path = require('node:path');
const fs = require('fs');
const { uploadImage, deleteImage } = require('../helpers/storage');
const multer = require('multer');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) return cb(new Error('Solo imágenes'), false);
        cb(null, true);
    }
});

exports.uploadMiddleware = upload.single('image');

exports.uploadImage = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
        const { id } = req.params;
        const { url, key } = await uploadImage(req.file.buffer, 'services', 800, 800);
        const service = await Services.update(id, { imageUrl: url, imageType: 'image' });
        res.json({ url, key, service });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
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