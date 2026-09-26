const Gallery = require('./gallery.schema');

exports.get = async () => Gallery.find().sort({ createdAt: -1 }).lean();
exports.create = async (data) => { const g = new Gallery(data); await g.save(); return g; };
exports.update = async (id, data) => Gallery.findByIdAndUpdate(id, data, { new: true });
exports.delete = async (id) => Gallery.findByIdAndDelete(id);
