const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
    code: { type: String, unique: true, sparse: true, trim: true, uppercase: true }, // Optional code like "VERANO26"
    title: { type: String, required: true },
    description: { type: String },
    
    discountType: { type: String, enum: ['percentage', 'fixed_amount'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    
    // Conditions
    validFrom: { type: Date },
    validTo: { type: Date },
    maxUses: { type: Number, default: 0 }, // 0 = unlimited
    usesCount: { type: Number, default: 0 },
    
    // Only apply to specific services/combos?
    applicableServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceV2' }],
    applicableCombos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ServiceComboV2' }],
    
    active: { type: Boolean, default: true }
}, { timestamps: true });

// Check if currently valid
promotionSchema.methods.isValid = function() {
    if (!this.active) return false;
    const now = new Date();
    if (this.validFrom && now < this.validFrom) return false;
    if (this.validTo && now > this.validTo) return false;
    if (this.maxUses > 0 && this.usesCount >= this.maxUses) return false;
    return true;
};

module.exports = mongoose.model('PromotionV2', promotionSchema);
