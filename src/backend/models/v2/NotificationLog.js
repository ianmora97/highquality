const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema({
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'ClientV2' },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'AppointmentV2' },
    
    type: { type: String, enum: ['whatsapp', 'telegram', 'system'], required: true },
    templateName: { type: String }, // For Twilio WhatsApp templates
    
    message: { type: String }, // Actual payload or text sent
    status: { type: String, enum: ['pending', 'sent', 'failed', 'delivered', 'read'], default: 'pending' },
    
    providerMessageId: { type: String }, // Twilio SID or Telegram message ID
    
    // Detailed error trace if failed
    errorMessage: { type: String }
}, { timestamps: true });

// Useful for debugging
notificationLogSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('NotificationLogV2', notificationLogSchema);
