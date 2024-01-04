const mongoose = require('mongoose');

function connection(){
    mongoose.connect(process.env.MONGODB_URI, {
    }).then(db => console.log('[OK] MongoDB connected'))
    .catch(err => console.log(err));
}

connection();