const jwt = require('jsonwebtoken');

const { SECRET } = process.env;

async function verify(req, res, next) {
    const {signature} = req.cookies;
    jwt.verify(signature, SECRET, (err, decoded) => {
        if(err){
            res.redirect('/dashboard');
        }else{
            req.user = decoded;
            next();
        }
    });
}

module.exports = {
    verify
}