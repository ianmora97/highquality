const Gallery = require('../models/gallery/gallery.model');
const GallerySchema = require('../models/gallery/gallery.schema');
const { uploadImage, deleteImage } = require('../helpers/storage');
const multer = require('multer');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) return cb(new Error('Solo imágenes'), false);
        cb(null, true);
    }
});

exports.uploadMiddleware = upload.single('image');

exports.get = async (req, res) => {
    const items = await Gallery.get();
    res.json(items);
};

exports.upload = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
        const { title, description, instagramLink } = req.body;
        const { url, key } = await uploadImage(req.file.buffer, 'gallery', 1200, 900);
        const item = await Gallery.create({ imageUrl: url, imageKey: key, title: title || '', description: description || '', instagramLink: instagramLink || '' });
        res.json(item);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
    const item = await Gallery.update(req.params.id, req.body);
    res.json(item);
};

exports.delete = async (req, res) => {
    const item = await GallerySchema.findById(req.params.id).lean();
    if (item?.imageKey) await deleteImage(item.imageKey);
    await Gallery.delete(req.params.id);
    res.json({ ok: true });
};
