const express = require('express');
const router = express.Router();
const moment = require('moment');

// Modelos
const AppointmentV2 = require('../models/v2/Appointment');
const PaymentV2 = require('../models/v2/Payment');
const ClientV2 = require('../models/v2/Client');
const RewardV2 = require('../models/v2/Reward');
const CashClosureV2 = require('../models/v2/CashClosure');
const ServiceComboV2 = require('../models/v2/ServiceCombo');

// Middleware basico de Auth Admin (si lo tienes, en este caso asumiremos que el frontend enviará una sesión válida, o se podría importar auth)
// const { verify } = require('../middlewares/auth');

/**
 * 1. MARCAR CITA COMO COMPLETADA (CERRAR VENTA Y DAR PUNTOS)
 * Body: { amount: Number, method: 'efectivo'|'sinpe'|'tarjeta', reference: String }
 */
router.post('/appointments/:id/complete', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, method, reference } = req.body;

        if (!amount || !method) {
            return res.status(400).json({ error: 'Faltan datos de pago (monto y método)' });
        }

        const appointment = await AppointmentV2.findById(id).populate('client').populate('service');
        if (!appointment) return res.status(404).json({ error: 'Cita no encontrada' });
        
        if (appointment.status === 'completed') {
            return res.status(400).json({ error: 'Esta cita ya fue completada anteriormente.' });
        }

        // 1. Crear el Pago
        const payment = new PaymentV2({
            appointment: appointment._id,
            client: appointment.client._id,
            amount: Number(amount),
            method: method,
            reference: reference || '',
            paymentDate: new Date()
        });
        await payment.save();

        // 2. Actualizar Cita
        appointment.status = 'completed';
        await appointment.save();

        // 3. Actualizar Cliente y Sistema de Recompensas
        const client = appointment.client;
        client.totalAppointments = (client.totalAppointments || 0) + 1;
        client.revenueGenerated = (client.revenueGenerated || 0) + Number(amount);

        // Lógica de Lealtad: Por cada 5 cortes, gana una recompensa
        let rewardCreated = false;
        if (client.totalAppointments > 0 && client.totalAppointments % 5 === 0) {
            const reward = new RewardV2({
                client: client._id,
                triggerReason: `Alcanzó ${client.totalAppointments} visitas`,
                status: 'available'
            });
            await reward.save();
            client.activeRewards = (client.activeRewards || 0) + 1;
            rewardCreated = true;
        }

        await client.save();

        res.json({ 
            success: true, 
            message: 'Cita completada y cobro registrado exitosamente.',
            rewardGenerated: rewardCreated
        });

    } catch (error) {
        console.error("Error completing appointment:", error);
        res.status(500).json({ error: 'Error del servidor procesando el pago', details: error.message });
    }
});

/**
 * 2. OBTENER RESUMEN DE CAJA PARA HOY (Dashboard Data)
 */
router.get('/today-summary', async (req, res) => {
    try {
        const startOfDay = moment().startOf('day').toDate();
        const endOfDay = moment().endOf('day').toDate();

        // Citas de hoy
        const appointmentsToday = await AppointmentV2.find({
            startTime: { $gte: startOfDay, $lte: endOfDay }
        });

        // Pagos completados hoy
        const paymentsToday = await PaymentV2.find({
            paymentDate: { $gte: startOfDay, $lte: endOfDay },
            status: 'completed'
        });

        const totalRevenue = paymentsToday.reduce((acc, p) => acc + p.amount, 0);
        const cashRevenue = paymentsToday.filter(p => p.method === 'efectivo').reduce((acc, p) => acc + p.amount, 0);
        const sinpeRevenue = paymentsToday.filter(p => p.method === 'sinpe').reduce((acc, p) => acc + p.amount, 0);

        const completedCount = appointmentsToday.filter(a => a.status === 'completed').length;
        const pendingCount = appointmentsToday.filter(a => a.status === 'scheduled').length;

        // Nuevos clientes registrados hoy
        const newClientsToday = await ClientV2.countDocuments({
            createdAt: { $gte: startOfDay, $lte: endOfDay }
        });

        res.json({
            metrics: {
                totalRevenue,
                cashRevenue,
                sinpeRevenue,
                completedAppointments: completedCount,
                pendingAppointments: pendingCount,
                newClients: newClientsToday,
                totalPayments: paymentsToday.length
            }
        });

    } catch (error) {
        console.error("Error getting today summary:", error);
        res.status(500).json({ error: 'Error obteniendo resumen financiero' });
    }
});

/**
 * 3. REALIZAR CIERRE DE CAJA DEL DÍA
 */
router.post('/closures', async (req, res) => {
    try {
        const { date, expectedCash, actualCash, notes } = req.body;
        
        let targetDateM = moment(date, 'YYYY-MM-DD');
        if (!targetDateM.isValid()) {
            targetDateM = moment();
        }

        const startOfDay = targetDateM.startOf('day').toDate();
        const endOfDay = targetDateM.endOf('day').toDate();

        // Check if already closed
        const existingClosure = await CashClosureV2.findOne({
            closureDate: { $gte: startOfDay, $lte: endOfDay }
        });

        if (existingClosure) {
            return res.status(400).json({ error: 'La caja de este día ya fue cerrada previamente.' });
        }

        const payments = await PaymentV2.find({
            paymentDate: { $gte: startOfDay, $lte: endOfDay },
            status: 'completed'
        });

        const calculatedEfectivo = payments.filter(p => p.method === 'efectivo').reduce((sum, p) => sum + p.amount, 0);
        const calculatedSinpe = payments.filter(p => p.method === 'sinpe').reduce((sum, p) => sum + p.amount, 0);

        const difference = Number(actualCash) - calculatedEfectivo;
        
        // Ensure "notes" reflects difference if any
        let finalNotes = notes || '';
        if (difference !== 0) {
            finalNotes += ` [Diferencia de Efectivo: ₡${difference}]`;
        }

        const closure = new CashClosureV2({
            closureDate: new Date(),
            periodStart: startOfDay,
            periodEnd: endOfDay,
            totalCash: calculatedEfectivo, // this assumes total recorded cash
            totalSinpe: calculatedSinpe,
            totalCard: 0,
            totalRevenue: calculatedEfectivo + calculatedSinpe,
            paymentsIncluded: payments.map(p => p._id),
            notes: finalNotes.trim(),
            status: 'closed'
        });

        await closure.save();

        res.json({
            success: true,
            closure,
            message: difference === 0 ? 'Caja cerrada perfectamente cuadrada.' : `Cierre con diferencia de ₡${difference}`
        });

    } catch (error) {
        console.error("Error saving closure:", error);
        res.status(500).json({ error: 'Error procesando el cierre de caja.' });
    }
});

module.exports = router;
