require('dotenv').config();
const mongoose = require('mongoose');
const Services = require('../models/services/services.schema');
const Horario  = require('../models/horario/horario.schema');

const services = [
    { name: "Corte",                  price: 5000, icon: "corteNino.png",        faIcon: "fa-solid fa-scissors",      enable: true  },
    { name: "SOLO Barba",             price: 3500, icon: "cejas.png",             faIcon: "fa-solid fa-droplet",       enable: true  },
    { name: "Black Mask",             price: 3000, icon: "blackmask.png",         faIcon: "fa-solid fa-mask",          enable: true  },
    { name: "Corte niño",             price: 4000, icon: "005-barbershop.png",    faIcon: "fa-solid fa-child",         enable: true  },
    { name: "Mediahora",              price: 1000, icon: "007-barber-shop.png",   faIcon: "fa-solid fa-clock",         enable: false },
    { name: "Facial completo",        price: 4000, icon: "hair-washing.png",      faIcon: "fa-solid fa-spa",           enable: true  },
    { name: "Diseño mediano",         price: 1000, icon: "gillette.png",          faIcon: "fa-solid fa-pen-nib",       enable: true  },
    { name: "Diseño grande",          price: 2000, icon: "gillette.png",          faIcon: "fa-solid fa-pencil",        enable: true  },
    { name: "Afeitados simple",       price: 1000, icon: "barba-brush.png",       faIcon: "fa-solid fa-pump-soap",     enable: true  },
    { name: "Corte y barba",          price: 7000, icon: "barba_cafe.png",        faIcon: "fa-solid fa-user-tie",      enable: true  },
    { name: "Marcaje de cejas mujer", price: 1500, icon: "cejas.png",             faIcon: "fa-solid fa-wand-sparkles", enable: true  },
];

const horarios = [
    { day: "Monday",    enable: true,  hours: ["10:00 am","11:00 am","12:00 pm","1:00 pm","2:00 pm"] },
    { day: "Tuesday",   enable: true,  hours: ["9:00 am","10:00 am","11:00 am","12:00 pm","1:00 pm","3:00 pm","5:00 pm","6:00 pm"] },
    { day: "Wednesday", enable: true,  hours: ["9:00 am","10:00 am","11:00 am","12:00 pm","1:00 pm","3:00 pm","4:00 pm","5:00 pm"] },
    { day: "Thursday",  enable: true,  hours: ["9:00 am","10:00 am","11:00 am","12:00 pm","1:00 pm","3:00 pm","4:00 pm","5:00 pm","6:00 pm","7:00 pm","8:00 pm"] },
    { day: "Friday",    enable: true,  hours: ["9:00 am","10:00 am","12:00 pm","1:00 pm","4:00 pm","5:00 pm","6:00 pm","7:30 pm","8:00 pm"] },
    { day: "Saturday",  enable: true,  hours: ["8:30 am","9:00 am","10:00 am","11:00 am","12:00 pm","1:00 pm","3:00 pm","5:00 pm","6:00 pm"] },
    { day: "Sunday",    enable: false, hours: ["12:00 pm","1:00 pm","3:00 pm","4:00 pm","5:00 pm"] },
];

async function seed() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[OK] MongoDB connected');

    // Clear existing
    await Services.deleteMany({});
    await Horario.deleteMany({});
    console.log('[OK] Collections cleared');

    // Insert
    await Services.insertMany(services);
    console.log(`[OK] ${services.length} services inserted`);

    await Horario.insertMany(horarios);
    console.log(`[OK] ${horarios.length} horarios inserted`);

    await mongoose.disconnect();
    console.log('[OK] Done');
}

seed().catch(err => { console.error(err); process.exit(1); });
