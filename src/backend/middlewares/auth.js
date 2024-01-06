const {encryptMD5} = require('../helpers/cipher');
const jwt = require('jsonwebtoken');

const { SECRET } = process.env;

async function cipherPassword(req, res, next) {
    const {password} = req.body;
    req.body.password = encryptMD5(password);
    next();
}

async function verify(req, res, next) {
    const {signature} = req.cookies;
    jwt.verify(signature, process.env.SECRET, (err, decoded) => {
        if(err){
            res.redirect('/dashboard');
        }else{
            req.user = decoded;
            next();
        }
    });
}

module.exports = {
    cipherPassword,
    verify
}