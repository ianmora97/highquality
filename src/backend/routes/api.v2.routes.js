const express = require('express');
const router = express.Router();
const moment = require('moment');

// Modelos y Motor
const ServiceComboV2 = require('../models/v2/ServiceCombo');
const AppointmentV2 = require('../models/v2/Appointment');
const ClientV2 = require('../models/v2/Client');
const SlotEngine = require('../engine/SlotEngine');

/**
 * 1. OBTENER SERVICIOS ACTIVOS
 * Retorna la lista de servicios para poblar el Step 1 del Wizard.
 */
router.get('/services', async (req, res) => {
    try {
        const services = await ServiceComboV2.find({ active: true }).sort({ sort: 1 });
        // Mapeo básico si es necesario
        const formatted = services.map(s => ({
            id: s._id,
            name: s.name,
            description: s.description || '',
            price: s.price,
            duration: s.duration || 30 // defaulting to 30min if missing
        }));
        res.json({ services: formatted });
    } catch (error) {
        console.error("Error fetching V2 services:", error);
        res.status(500).json({ error: 'Error del servidor consultando servicios' });
    }
});

/**
 * 2. OBTENER ESPACIOS (SLOTS) DISPONIBLES
 * Utiliza el SlotEngine para calcular los espacios contiguos de 30min según el día.
 * Query Params: ?date=YYYY-MM-DD&duration=30
 */
router.get('/slots', async (req, res) => {
    try {
        const dateStr = req.query.date;
        const requiredDuration = parseInt(req.query.duration) || 30; // Minutos solicitados

        if (!dateStr || !moment(dateStr, 'YYYY-MM-DD', true).isValid()) {
            return res.status(400).json({ error: 'Fecha inválida. Debe ser YYYY-MM-DD' });
        }

        const availableSlots = await SlotEngine.getAvailableSlots(dateStr, requiredDuration);
        
        // Mapeamos para que el Wizard tenga labels amigables (Ej: "01:30 PM")
        const formattedSlots = availableSlots.map(momentObj => {
            return {
                time: momentObj.format('HH:mm'),
                label: momentObj.format('hh:mm A')
            };
        });

        res.json({ slots: formattedSlots });
    } catch (error) {
        console.error("Error en SlotEngine API:", error);
        res.status(500).json({ error: 'Error interno calculando disponibilidad' });
    }
});

/**
 * 3. CREAR NUEVA CITA (Y LOGICA REWARDS BASE)
 * Recibe los datos finales del Step 4.
 */
router.post('/appointments', async (req, res) => {
    try {
        const { date, time, serviceId, client } = req.body;
        
        // Validaciones básicas
        if (!date || !time || !serviceId || !client || !client.name || !client.phone) {
            return res.status(400).json({ error: 'Faltan datos requeridos para la reserva' });
        }

        // 1. Buscar servicio para saber duración e ingreso futuro
        const service = await ServiceComboV2.findById(serviceId);
        if(!service) return res.status(404).json({ error: 'El servicio seleccionado ya no está disponible' });

        // 2. Verificar disponibilidad de último momento
        const slots = await SlotEngine.getAvailableSlots(date, service.duration || 30);
        if (!slots.some(m => m.format('HH:mm') === time)) {
            return res.status(409).json({ error: 'Ese espacio acaba de ser reservado o no está disponible.' });
        }

        // 3. Gestionar Cliente (Login/Reg)
        // Buscamos exacto por teléfono para conciliar puntos de lealtad
        let clientDoc = await ClientV2.findOne({ phone: client.phone.trim() });
        if(!clientDoc) {
            clientDoc = new ClientV2({
                fullName: client.name.trim(),
                phone: client.phone.trim(),
                trusted: true // Default
            });
            await clientDoc.save();
        } else {
            // Actualizar nombre si enviaron uno distinto
            clientDoc.fullName = client.name.trim();
            await clientDoc.save();
        }

        // 4. Crear la Cita Final
        const startMoment = moment(`${date} ${time}`, 'YYYY-MM-DD HH:mm');
        const endMoment = startMoment.clone().add(service.duration || 30, 'minutes');

        const newAppointment = new AppointmentV2({
            client: clientDoc._id,
            service: service._id,
            startTime: startMoment.toDate(),
            endTime: endMoment.toDate(),
            durationMinutes: service.duration || 30,
            status: 'pending',
            notes: `Reservado por cliente vía WebV2`
        });

        await newAppointment.save();

        // --- ENVIAR NOTIFICACIONES ---
        const Notifier = require('../helpers/notifier');
        const formattedDate = startMoment.format('DD/MM/YYYY');
        const formattedTime = startMoment.format('hh:mm A');
        
        // Alerta por Telegram al Administrador
        Notifier.sendAdminAlert(
            `💈 <b>Nueva Reserva Web</b> 💈\n\n` +
            `👤 <b>Cliente:</b> ${clientDoc.fullName}\n` +
            `📱 <b>Tel:</b> ${clientDoc.phone}\n` +
            `✂️ <b>Servicio:</b> ${service.name}\n` +
            `📅 <b>Día:</b> ${formattedDate}\n` +
            `⏰ <b>Hora:</b> ${formattedTime}`
        );

        // Envío Opcional de Confirmación SMS/WA al Cliente
        Notifier.sendClientConfirmation(clientDoc.phone, {
            clientName: clientDoc.fullName,
            date: formattedDate,
            time: formattedTime
        });

        res.status(201).json({ 
            success: true, 
            message: 'Cita reservada con éxito',
            appointment: newAppointment._id
        });

    } catch (error) {
        console.error("Booking V2 Error:", error);
        res.status(500).json({ error: 'Error crítico en el servidor procesando tu cita', details: error.message });
    }
});

module.exports = router;
