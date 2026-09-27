require('dotenv').config();
const express    = require('express');
const hbs        = require('./backend/engine/handlebars.js').instance();
const bodyParser = require('body-parser');
const app        = express();
const path       = require('node:path');
const http       = require('http');
const cookieParser = require('cookie-parser');
const helmet     = require('helmet');
const passport   = require('passport');
require('./backend/config/passport'); // register all strategies

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

// ? Error handling — must come after every route
app.use(require('./backend/middlewares/errors').notFound);
app.use(require('./backend/middlewares/errors').errorHandler);

// ? Start server
const realtime = require('./backend/helpers/realtime');

const server = http.createServer(app).listen(app.get('port'), () => {
    console.log(`[OK] SERVER STARTED ON PORT ${app.get('port')}`);
    require('./backend/connections/mongo.js');
    require('./backend/connections/indexes.js').ensureIndexes();
});

// ? Realtime (socket.io) — attached to every listening server
const io = realtime.attach(server);
app.set('socketio', io);
app.set('realtime', realtime);

// ? Last-resort guards.
// Node 22 exits the process on an unhandled rejection. Everything reachable
// through a route is now wrapped (see helpers/asyncHandler), so anything that
// lands here is a bug worth a loud log — but it must not take the site down
// with it while it is being fixed.
process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason);
});
process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err);
});

module.exports = { app, server, io, realtime };
