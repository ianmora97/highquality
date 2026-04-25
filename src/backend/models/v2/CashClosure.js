const mongoose = require('mongoose');

const cashClosureSchema = new mongoose.Schema({
    closureDate: { type: Date, default: Date.now },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    
    totalCash: { type: Number, default: 0 },
    totalSinpe: { type: Number, default: 0 },
    totalCard: { type: Number, default: 0 },
    
    totalRevenue: { type: Number, default: 0 }, // Sum of all above
    
    // Payments included
    paymentsIncluded: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PaymentV2' }],
    
    notes: { type: String },
    status: { type: String, enum: ['draft', 'closed'], default: 'closed' }
}, { timestamps: true });

// Enforce one closure per date/period roughly
cashClosureSchema.index({ periodStart: 1, periodEnd: 1 });

module.exports = mongoose.model('CashClosureV2', cashClosureSchema);
