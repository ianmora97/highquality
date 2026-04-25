require('dotenv').config();
const mongoose = require('mongoose');

// V1 Models (Assuming they export standard mongoose models)
const ClientV1 = require('../../backend/models/clients/client.schema');
const EventV1 = require('../../backend/models/events/event.schema');

// V2 Models
const ClientV2 = require('../../backend/models/v2/Client');
const AppointmentV2 = require('../../backend/models/v2/Appointment');
const PaymentV2 = require('../../backend/models/v2/Payment');

const migrateAll = async () => {
    try {
        console.log('🔄 Conectando a MongoDB para migración...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Conectado a MongoDB');

        // 1. Migrate Clients
        console.log('➡️ Migrando Clientes...');
        const v1Clients = await ClientV1.find({});
        let clientsMigrated = 0;

        for (const c1 of v1Clients) {
            // Upsert based on phone number (numero)
            const phoneStr = c1.numero ? c1.numero.toString() : null;
            if (!phoneStr) continue;

            const existing = await ClientV2.findOne({ phone: phoneStr });
            if (!existing) {
                await ClientV2.create({
                    firstName: c1.nombre,
                    phone: phoneStr,
                    totalAppointments: c1.citasPagas || 0, // Approximate mapping
                    loyaltyPoints: 0,
                    notes: 'Migrado desde V1',
                    legacyId: c1._id
                });
                clientsMigrated++;
            }
        }
        console.log(`✅ ${clientsMigrated} Clientes nuevos migrados.`);

        // 2. Migrate Events (Appointments)
        console.log('➡️ Migrando Citas & Eventos...');
        const v1Events = await EventV1.find({});
        let eventsMigrated = 0;
        let paymentsCreated = 0;

        for (const e1 of v1Events) {
            // Check if already migrated
            const existingEvent = await AppointmentV2.findOne({ legacyId: e1._id });
            if (existingEvent) continue;

            // Extract extendedProps
            const props = e1.extendedProps || {};
            const phone = props.numero ? props.numero.toString() : null;
            
            let clientV2Id = null;
            if (phone) {
                const cv2 = await ClientV2.findOne({ phone: phone });
                if (cv2) clientV2Id = cv2._id;
            }

            // Determine status
            let newStatus = 'completed'; // For old events
            if (props.estado === 'PENDIENTE') newStatus = 'pending';
            if (props.estado === 'CANCELADO') newStatus = 'cancelled'; // If legacy handled it
            if (e1.title === 'Cerrado') newStatus = 'cancelled'; // Handle blocks differently? Actually admin closed events might be better mapped to Blocks conceptually.

            // Wait, if it's "Cerrado", maybe we should skip creating an Appointment and create a Block instead?
            // Realistically to keep it idempotent and simple we assume Appointment for now or skip blocks. Let's do Appointment with status 'cancelled' and title 'Cerrado' to preserve it.
            const isBlock = e1.title === 'Cerrado';

            if (!isBlock) {
                const cv2 = clientV2Id || undefined;
                
                // Map services (they were an array of strings like ["Corte", "Barba"])
                const mappedServices = Array.isArray(props.servicios) ? props.servicios : [];

                const appt = await AppointmentV2.create({
                    client: cv2,
                    unregisteredClientName: cv2 ? undefined : e1.title,
                    startTime: e1.start,
                    endTime: e1.end,
                    status: newStatus,
                    notes: `Migración: ${mappedServices.join(', ')}`,
                    legacyId: e1._id,
                    legacySnapshot: JSON.stringify(e1)
                });
                eventsMigrated++;

                // 3. Migrate Payments for completely paid events
                if (props.estado === 'PAGO' && props.precio) {
                    await PaymentV2.create({
                        appointment: appt._id,
                        client: cv2,
                        amount: parseInt(props.precio) || 0,
                        method: 'efectivo', // We don't know the method in V1, fallback effectively to cash
                        paymentDate: e1.start, // Approx payment date
                        status: 'completed',
                        legacyId: e1._id
                    });
                    paymentsCreated++;
                }
            } else {
                // Ignore Cerrado for now, or could map to BlockV2. I'll just map to BlockV2.
                const BlockV2 = require('../../backend/models/v2/Block');
                const existingBlock = await BlockV2.findOne({ legacyId: e1._id });
                if (!existingBlock) {
                    await BlockV2.create({
                        startTime: e1.start,
                        endTime: e1.end,
                        reason: 'Cerrado (Migración)',
                        isAllDay: e1.allDay || false,
                        legacyId: e1._id
                    });
                }
            }
        }
        
        console.log(`✅ ${eventsMigrated} Citas migradas.`);
        console.log(`✅ ${paymentsCreated} Pagos inferidos creados.`);
        console.log('🚀 MIGRACIÓN IDEMPOTENTE FINALIZADA CON ÉXITO.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error general migración:', err);
        process.exit(1);
    }
};

migrateAll();
