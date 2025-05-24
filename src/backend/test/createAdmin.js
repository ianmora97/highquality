var CryptoJS = require("crypto-js");
require('dotenv').config();
const { SECRET } = process.env;

function encryptMD5(data){
    console.log(data, SECRET)
    return CryptoJS.HmacMD5(data, SECRET).toString();
}

async function createAdminUser() {
    const adminPassword = await encryptMD5("rootadmin1234@!");
    console.log(adminPassword);
}
createAdminUser();
