const { app, server } = require('../../server');
var io = require('socket.io')(server);

io.on('connection', (socket) =>{
    console.log('Socket connected', socket.id);
    socket.on('reserva:new', (data) => {
        io.sockets.emit('reserva:new',data);
    });
    socket.on('reserva:delete', (data) => {
        io.sockets.emit('reserva:delete',data);
    });
    socket.on('estado:update', (data) => {
        io.sockets.emit('estado:update',data);
    });
});

app.set('socketio', io);