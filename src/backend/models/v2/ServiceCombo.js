const mongoose = require('mongoose');

const serviceComboSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    services: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceV2' }],
    price: { type: Number, required: true }, // Usually discounted from sum of services
    active: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    imagePath: { type: String }
}, { timestamps: true });

// Virtual to calculate total duration based on included services
// Note: This needs `.populate('services')` to work
serviceComboSchema.virtual('totalDurationMinutes').get(function() {
    if (!this.services || this.services.length === 0 || !this.services[0].durationMinutes) {
        return 0; // Or default if not populated
    }
    return this.services.reduce((total, service) => total + (service.durationMinutes || 0), 0);
});

module.exports = mongoose.model('ServiceComboV2', serviceComboSchema);
