const jwt = require('jsonwebtoken');
var CryptoJS = require("crypto-js");

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

function encrypt(data){
    return CryptoJS.AES.encrypt(data, SECRET).toString();
}

function decrypt(data){
    return CryptoJS.AES.decrypt(data, SECRET).toString(CryptoJS.enc.Utf8);
}

function encryptMD5(data){
    return CryptoJS.HmacMD5(data, SECRET).toString();
}

module.exports = {
    sign,
    encrypt,
    decrypt,
    encryptMD5
}