const Gallery = require('../models/gallery/gallery.model');
const { uploadImage, deleteImage, toJpeg, imageUpload } = require('../helpers/storage');
const { ASPECTS, resolveAspect, boxFor } = require('../helpers/aspects');

exports.uploadMiddleware = imageUpload({ field: 'image', maxMb: 25 });

/** Crop presets, so the admin page never hardcodes them. */
exports.aspects = async (req, res) => {
    res.json(Object.entries(ASPECTS).map(([key, a]) => ({ key, ...a })));
};

/** Public: only the photos authorised for /galeria. */
exports.get = async (req, res) => {
    res.json(await Gallery.get({ visible: true }));
};

/** Admin: everything, hidden rows included. */
exports.getAll = async (req, res) => {
    res.json(await Gallery.get());
};

/**
 * HEIC and friends cannot be drawn into a <canvas>, so the browser can't crop
 * them. The admin page posts the original here and gets a JPEG back to feed
 * into Cropper. Nothing is stored — this is a format shim, not an upload.
 */
exports.preview = async (req, res) => {
    if (!req.file) {
        const err = new Error('No se recibió imagen.');
        err.status = 400;
        throw err;
    }
    const img = await toJpeg(req.file.buffer, { quality: 82 });
    res.type('image/jpeg').set('Cache-Control', 'no-store').send(img.buffer);
};

exports.upload = async (req, res) => {
    if (!req.file) {
        const err = new Error('No se recibió imagen.');
        err.status = 400;
        throw err;
    }

    const aspect = resolveAspect(req.body.aspect);
    const { title, description, instagramLink, visible } = req.body;

    const stored = await uploadImage(req.file.buffer, 'gallery', boxFor(aspect));

    const item = await Gallery.create({
        imageUrl: stored.url,
        imageKey: stored.key,
        width: stored.width,
        height: stored.height,
        aspect,
        title: (title || '').trim(),
        description: (description || '').trim(),
        instagramLink: cleanHandle(instagramLink),
        // FormData stringifies booleans, so 'false' has to be caught explicitly.
        visible: visible === undefined ? true : visible !== 'false' && visible !== false,
    });

    res.status(201).json(item);
};

exports.update = async (req, res) => {
    const patch = { ...req.body };
    if (patch.instagramLink !== undefined) patch.instagramLink = cleanHandle(patch.instagramLink);
    if (patch.visible !== undefined) patch.visible = patch.visible !== 'false' && patch.visible !== false;

    const item = await Gallery.update(req.params.id, patch);
    if (!item) {
        const err = new Error('Foto no encontrada.');
        err.status = 404;
        throw err;
    }
    res.json(item);
};

exports.reorder = async (req, res) => {
    const modified = await Gallery.reorder(req.body.ids);
    res.json({ ok: true, modified });
};

exports.delete = async (req, res) => {
    const item = await Gallery.getById(req.params.id);
    if (!item) {
        const err = new Error('Foto no encontrada.');
        err.status = 404;
        throw err;
    }
    // Drop the row first: an orphan object in the bucket is cheaper to live with
    // than a row pointing at a file that no longer exists.
    await Gallery.delete(req.params.id);
    await deleteImage(item.imageKey);
    res.json({ ok: true });
};

/** '@user', a profile URL or a bare handle → bare handle. */
function cleanHandle(value) {
    return String(value || '')
        .trim()
        .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
        .replace(/^@+/, '')
        .replace(/\/.*$/, '')
        .slice(0, 40);
}
