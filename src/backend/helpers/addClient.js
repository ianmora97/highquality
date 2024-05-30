const Client = require('../models/clients/client.model');

function addClient(data){
    return new Promise(async (resolve, reject) => {
        try {
            let client = await Client.findOne(data.extendedProps.numero);
            if(!client){
                client = await Client.create({
                    numero: data.extendedProps.numero,
                    nombre: data.title
                });
            }
            resolve(client);
        } catch (error) {
            reject(error);
        }
    });
}

module.exports = {
    addClient
};