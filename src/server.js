require('dotenv').config();
const express    = require('express');
const hbs        = require('./backend/engine/handlebars.js').instance();
const bodyParser = require('body-parser');
const app        = express();
const path       = require('node:path');
const http       = require('http');
const https      = require('https');
const cookieParser = require('cookie-parser');
const { cert }   = require('./backend/middlewares/https');
const helmet     = require('helmet');
const passport   = require('passport');
require('./backend/config/passport'); // register all strategies

// const {createTelegramMessagesCron} = require('./backend/helpers/cron');
// createTelegramMessagesCron();

// ? Settings
app.set('port', process.env.PORT);
app.set('host', process.env.HOST);

// ? Handlebars
app.set('views', path.join(__dirname, 'backend/views'));
app.set('view engine', '.hbs');
app.engine('.hbs', hbs.engine);

// ? Security headers
app.use(helmet({ contentSecurityPolicy: false, xDownloadOptions: false }));
app.use(helmet.frameguard({ action: 'deny' }));

// ? Static files
app.use(express.static(path.join(__dirname, 'public')));

// ? Core middlewares
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(passport.initialize());

if (process.env.NODE_ENV === 'prod') {
    app.enable('trust proxy');
}

// ? Routes
app.use(require('./backend/routes/render.routes'));
app.use('/scripts',    require('./backend/routes/static.routes'));
app.use('/dashboard',  require('./backend/routes/admin.routes.js'));
app.use('/api/v1',     require('./backend/routes/api.routes.js'));

// ? Start server
var server = http.createServer(app).listen(app.get('port'), () => {
    console.log(`[OK] SERVER STARTED ON PORT ${app.get('port')}`);
    require('./backend/connections/mongo.js');
});
if (process.env.NODE_ENV === 'prod') {
    server = https.createServer(cert(), app).listen(443, () => {
        console.log('[OK] PRODUCTION SERVER STARTED');
    });
}

const { Server } = require('socket.io');
const io = new Server(server);
io.on('connection', () => {});
app.set('socketio', io);

module.exports = { app, server, io };
