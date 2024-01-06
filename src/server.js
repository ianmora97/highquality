require('dotenv').config();
const express = require('express');
const hbs = require('./backend/engine/handlebars.js').instance();
const bodyParser = require('body-parser');
const app = express();
const path = require('node:path');
const http = require('http');
const https = require('https');
var cookieParser = require('cookie-parser')
// const {toHttps,cert} = require('./backend/middlewares/security/https');
const helmet = require('helmet');

// ? Settings
app.set('port', process.env.PORT);
app.set('host', process.env.HOST);

// ? Handlebars
app.set('views', path.join(__dirname, 'backend/views'));
app.set('view engine', '.hbs');
app.engine('.hbs', hbs.engine);

// ? set security headers
app.use(helmet({
    contentSecurityPolicy: false,
    xDownloadOptions: false,
}));
app.use(
    helmet.frameguard({
        action: "deny",
    })
);

// ? Serve Static Files
app.use(express.static(path.join(__dirname, 'public')));

// ? Middlewares
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

if(process.env.NODE_ENV === 'prod'){
    // ? Security and HTTPS
    app.enable('trust proxy');
    // app.use(toHttps);
}

// ? Routes
app.use(require('./backend/routes/render.routes'));
app.use('/scripts',require('./backend/routes/static.routes'));
app.use('/dashboard', require('./backend/routes/admin.routes.js'));
app.use('/api/v1', require('./backend/routes/api.routes.js'));

// ? Start the server
var server = http.createServer(app).listen(app.get('port'), () => {
    console.log(`[OK] SERVER STARTED ON PORT ${app.get('port')}`)
    require('./backend/connections/mongo.js');
});
if(process.env.NODE_ENV === 'prod'){
    server = https.createServer(cert(), app).listen(443, () => {
        console.log(`[OK] PRODUCTION SERVER STARTED`);
    });
}

module.exports = {
    app,
    server
}