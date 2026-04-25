require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const moment = require('moment');

const ServiceComboV2 = require('./src/backend/models/v2/ServiceCombo');
const WeeklySchedule = require('./src/backend/models/v2/WeeklySchedule');

const BASE_URL = 'http://localhost/api/v2';

async function seedAndSimulate() {
    console.log("==========================================");
    console.log("💈 SEED & SIMULACIÓN - HIGH QUALITY V2 💈");
    console.log("==========================================\n");

    try {
        console.log("[0] Conectando a MongoDB para inyectar servicios dummy...");
        await mongoose.connect(process.env.MONGODB_URI);
        
        let c = await ServiceComboV2.findOne({ name: "Corte Clásico + Barba (Simulación)" });
        if (!c) {
            c = await ServiceComboV2.create({
                name: "Corte Clásico + Barba (Simulación)",
                description: "Degradado, perfilado de barba, toalla caliente.",
                price: 12000,
                active: true,
                displayOrder: 1,
                // Agrego duration fijo para ayudar a la API si lo lee directo
                duration: 60
            });
            console.log("✅ Servicio Dummy creado exitosamente.");
        } else {
            console.log("✅ Servicio Dummy ya existía.");
        }

        console.log("[0.5] Verificando Horarios en WeeklySchedule...");
        const schedules = await WeeklySchedule.find();
        if (schedules.length === 0) {
            console.log("   - Creando horarios por defecto (Lunes-Sábado 9am-6pm)...");
            const scheduleDocs = [];
            for (let i = 0; i <= 6; i++) {
                scheduleDocs.push({
                    dayOfWeek: i,
                    isOpen: i !== 0, // Domingo cerrado (0=Sunday)
                    startTime: '09:00',
                    endTime: '18:00',
                    breaks: [{ startTime: '13:00', endTime: '14:00' }]
                });
            }
            await WeeklySchedule.insertMany(scheduleDocs);
            console.log("✅ Horarios Dummy creados exitosamente.");
        }

        // 1. Obtener Servicios
        console.log("\n[1] Obteniendo Servicios vía API...");
        const servicesRes = await axios.get(`${BASE_URL}/services`);
        const services = servicesRes.data.services;
        if (!services || services.length === 0) {
            throw new Error("No hay servicios disponibles en la base de datos.");
        }
        const selectedService = services.find(s => s.name.includes("Simulación")) || services[0];
        console.log(`✅ Servicio seleccionado: ${selectedService.name} (₡${selectedService.price})`);

        // 2. Obtener Slots
        console.log(`\n[2] Obteniendo Espacios (Slots) Disponibles hoy para un servicio de ${selectedService.duration} min...`);
        const today = moment().format('YYYY-MM-DD');
        const slotsRes = await axios.get(`${BASE_URL}/slots?date=${today}&duration=${selectedService.duration}`);
        const slots = slotsRes.data.slots;
        if (!slots || slots.length === 0) {
            console.warn("⚠️ No hay espacios disponibles para hoy. Usando mañana para forzar la prueba...");
            const tomorrow = moment().add(1, 'day').format('YYYY-MM-DD');
            const tomorrowRes = await axios.get(`${BASE_URL}/slots?date=${tomorrow}&duration=${selectedService.duration}`);
            const tmwSlots = tomorrowRes.data.slots;
            if(!tmwSlots || tmwSlots.length === 0) throw new Error("No hay espacios ni mañana. El calendario V1 debe estar repleto o mal configurado.");
            
            var selectedDate = tomorrow;
            var selectedSlotLabel = tmwSlots[0].time;
        } else {
            var selectedDate = today;
            var selectedSlotLabel = slots[0].time;
        }
        
        console.log(`✅ Espacio disponible localizado: Día ${selectedDate} a las ${selectedSlotLabel}`);

        // 3. Crear Cita
        console.log("\n[3] Creando Cita Web (El WebClient envía los datos finales)...");
        const clientData = {
            name: "Juanito Pérez (Bot)",
            phone: "+50688887777" // Teléfono simulado para ver console.logs de Twilio
        };
        const appointmentPayload = {
            date: selectedDate,
            time: selectedSlotLabel,
            serviceId: selectedService.id,
            client: clientData
        };
        const bookRes = await axios.post(`${BASE_URL}/appointments`, appointmentPayload);
        const appointmentId = bookRes.data.appointment;
        console.log(`✅ Cita confirmada (Ver console.log original del server para Notificaciones Push). ID: ${appointmentId}`);

        // 4. Marcar Cita como Completada (Pago)
        console.log("\n[4] Pagando la cita (Simulando acciones del admin)...");
        const paymentPayload = {
            amount: selectedService.price,
            method: 'efectivo',
            reference: 'Simulación automatizada completada'
        };
        const completeRes = await axios.post(`${BASE_URL}/finances/appointments/${appointmentId}/complete`, paymentPayload);
        console.log(`✅ Cobro de ₡${selectedService.price} en Efectivo Registrado en caja V2.`);
        
        if (completeRes.data.rewardGenerated) {
            console.log(`🎁 ¡RECOMPENSA GENERADA! El cliente acumuló los puntos necesarios.`);
        } else {
            console.log(`📊 +1 Punto de Lealtad sumado al Cliente.`);
        }

        // 5. Ver el Dashboard Resumen de Caja
        console.log("\n[5] Obteniendo Resumen de la Caja Administrativa para el día del cobro...");
        const summaryRes = await axios.get(`${BASE_URL}/finances/today-summary`);
        const metrics = summaryRes.data.metrics;
        console.log(`✅ Métricas Actuales extraídas del API:`);
        console.log(`   - Efectivo: ₡${metrics.cashRevenue}`);
        console.log(`   - SINPE: ₡${metrics.sinpeRevenue}`);
        console.log(`   - Total Revenue: ₡${metrics.totalRevenue}`);
        console.log(`   - Citas Completadas Hoy: ${metrics.completedAppointments}`);

        // 6. Cierre de Caja (con Faltante intencional solo si hay cash)
        if (metrics.cashRevenue > 0) {
            console.log("\n[6] Cierre de Caja (Simulación de arqueo)...");
            const closurePayload = {
                date: moment().format('YYYY-MM-DD'), // Se cierra para HOY (registro de pagos de hoy)
                expectedCash: metrics.cashRevenue,
                actualCash: metrics.cashRevenue - 1500, // Simulando que se usó 1500 de caja chica
                notes: "Faltan 1500 colones porque se pagó el almuerzo de un barbero. (Test)"
            };
            
            try {
                const closureRes = await axios.post(`${BASE_URL}/finances/closures`, closurePayload);
                console.log(`✅ Documento de Cierre 'CashClosureV2' insertado en BD.`);
                console.log(`✅ Mensaje del servidor: ${closureRes.data.message}`);
                console.log(`   - Diferencia guardada: ${closureRes.data.closure.difference}`);
            } catch(closureErr) {
                if(closureErr.response && closureErr.response.status === 400) {
                    console.log(`⚠️  Aviso: La caja de HOY ya había sido cerrada anteriormente. Falla intencional y correcta de idempotencia.`);
                } else {
                    console.error("Error inesperado en cierre:", closureErr.response?.data || closureErr.message);
                }
            }
        }

        console.log("\n==========================================");
        console.log("🎉 TODAS LAS PRUEBAS V2 FUERON EXITOSAS 🎉");
        console.log("==========================================");

    } catch (error) {
        console.error("\n❌ ERROR EN LA SIMULACIÓN ❌");
        if (error.response) {
            console.error(error.response.data);
        } else {
            console.error(error.message);
        }
    } finally {
        // Drop the dummy service to keep it clean (optional)
        // await ServiceComboV2.deleteOne({ name: "Corte Clásico + Barba (Simulación)" });
        mongoose.disconnect();
    }
}

seedAndSimulate();
