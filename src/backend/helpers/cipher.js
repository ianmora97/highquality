const jwt = require('jsonwebtoken');

const { SECRET } = process.env;

function sign(data){
    return new Promise((resolve, reject) => {
        jwt.sign(data, SECRET, {
            expiresIn: 604800
        }, (err, token) => {
            if (err) reject(err);
            resolve(token);
        });
    });
}

module.exports = {
    sign,
}