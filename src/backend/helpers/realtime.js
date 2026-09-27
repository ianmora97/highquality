// Single source of truth for every realtime event in the app.
//
// Two responsibilities:
//   1. Broadcast domain changes (citas, horarios, cierres) so every open page —
//      client booking page and admin panel — stays in sync without polling.
//   2. Keep short-lived "slot holds": while a client has a slot selected it is
//      shown as taken to everyone else. A hold is advisory (it expires, it dies
//      with the socket); the authoritative guard is the unique index on
//      `events.start` plus `validateSlot`.

const { Server } = require('socket.io');

const HOLD_TTL_MS   = 5 * 60 * 1000;  // a selected slot is reserved this long;
                                      // the holder renews it while it stays selected
const PRUNE_EVERY   = 20 * 1000;
const ROOM_BOOKING  = 'booking';      // clients sitting on /reservar
const ROOM_ADMIN    = 'admin';        // dashboard pages

let io = null;

/** startISO -> { socketId, expiresAt } */
const holds = new Map();

// ─── helpers ──────────────────────────────────────────────────────────────────

function keyOf(start) {
    const d = new Date(start);
    return isNaN(d) ? null : d.toISOString();
}

function prune() {
    const now = Date.now();
    for (const [key, hold] of holds) {
        if (hold.expiresAt <= now) {
            holds.delete(key);
            broadcast('slot:released', { start: key, reason: 'expired' });
        }
    }
}

function snapshot() {
    prune();
    return [...holds.entries()].map(([start, h]) => ({ start, expiresAt: h.expiresAt }));
}

function releaseAllFrom(socketId) {
    for (const [key, hold] of holds) {
        if (hold.socketId === socketId) {
            holds.delete(key);
            broadcast('slot:released', { start: key, reason: 'left' });
        }
    }
}

function broadcast(event, payload) {
    if (io) io.emit(event, payload);
}

// ─── wiring ───────────────────────────────────────────────────────────────────

function attach(httpServer) {
    if (io) {
        io.attach(httpServer);   // prod also serves over https
        return io;
    }

    io = new Server(httpServer, {
        serveClient: true,       // /socket.io/socket.io.js, no CDN needed
        pingInterval: 20000,
        pingTimeout: 20000,
    });

    io.on('connection', (socket) => {
        socket.on('hello', (payload = {}) => {
            const room = payload.room === 'admin' ? ROOM_ADMIN : ROOM_BOOKING;
            socket.join(room);
            socket.data.room = room;
            socket.emit('slots:snapshot', snapshot());
        });

        // Client selected a slot — reserve it for everyone else.
        socket.on('slot:hold', (payload = {}) => {
            const key = keyOf(payload.start);
            if (!key) return;
            prune();

            const existing = holds.get(key);
            if (existing && existing.socketId !== socket.id) {
                socket.emit('slot:denied', { start: key });
                return;
            }

            // One hold per socket: picking a new hour frees the previous one.
            for (const [otherKey, hold] of holds) {
                if (hold.socketId === socket.id && otherKey !== key) {
                    holds.delete(otherKey);
                    broadcast('slot:released', { start: otherKey, reason: 'switched' });
                }
            }

            const expiresAt = Date.now() + HOLD_TTL_MS;
            holds.set(key, { socketId: socket.id, expiresAt });
            socket.emit('slot:granted', { start: key, expiresAt });
            socket.broadcast.emit('slot:held', { start: key, expiresAt });
        });

        socket.on('slot:release', (payload = {}) => {
            const key = keyOf(payload.start);
            if (!key) return;
            const hold = holds.get(key);
            if (hold && hold.socketId === socket.id) {
                holds.delete(key);
                broadcast('slot:released', { start: key, reason: 'released' });
            }
        });

        socket.on('slots:sync', () => socket.emit('slots:snapshot', snapshot()));

        socket.on('disconnect', () => releaseAllFrom(socket.id));
    });

    setInterval(prune, PRUNE_EVERY).unref();
    return io;
}

// ─── domain broadcasts ────────────────────────────────────────────────────────

function toPlain(doc) {
    return doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;
}

/** A hold is pointless once the cita exists — drop it silently. */
function clearHoldFor(start) {
    const key = keyOf(start);
    if (key) holds.delete(key);
}

function citaCreated(event, source = 'client') {
    const cita = toPlain(event);
    if (!cita) return;
    clearHoldFor(cita.start);
    broadcast('cita:new', { cita, source });
}

function citaUpdated(event, reason = 'update') {
    const cita = toPlain(event);
    if (!cita) return;
    broadcast('cita:update', { cita, reason });
}

function citaDeleted(event) {
    const cita = toPlain(event);
    if (!cita) return;
    broadcast('cita:delete', { cita });
}

function horarioChanged(horario) {
    broadcast('horario:update', { horario: toPlain(horario) || null });
}

function specialChanged(special) {
    broadcast('special:update', { special: toPlain(special) || null });
}

function getIO() { return io; }

module.exports = {
    attach,
    getIO,
    citaCreated,
    citaUpdated,
    citaDeleted,
    horarioChanged,
    specialChanged,
    ROOM_BOOKING,
    ROOM_ADMIN,
};
