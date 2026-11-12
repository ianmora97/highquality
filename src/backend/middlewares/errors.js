// Central error pipeline. Route handlers are wrapped by helpers/asyncHandler,
// so a rejected promise arrives here as next(err) instead of killing the
// process. Nothing below ever leaks a stack trace to the client.

const DUPLICATE_KEY = 11000;

/** API routes answer in JSON; pages answer in plain text. */
function wantsJson(req) {
    return req.originalUrl.startsWith('/api/')
        || req.xhr
        || (req.headers.accept || '').includes('application/json');
}

/** Translate the errors this app actually produces into an HTTP status. */
function classify(err) {
    if (err.status || err.statusCode) {
        return { status: err.status || err.statusCode, message: err.message };
    }
    if (err.name === 'ValidationError') {
        const first = Object.values(err.errors || {})[0];
        return { status: 422, message: first ? first.message : 'Datos inválidos.' };
    }
    if (err.name === 'CastError') {
        return { status: 400, message: `Valor inválido para "${err.path}".` };
    }
    if (err.code === DUPLICATE_KEY) {
        return { status: 409, message: 'Ese registro ya existe.' };
    }
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return { status: 401, message: 'Sesión inválida.' };
    }
    if (err.type === 'entity.parse.failed') {
        return { status: 400, message: 'JSON malformado.' };
    }
    return { status: 500, message: 'Error interno del servidor.' };
}

function notFound(req, res, next) {
    if (!wantsJson(req)) return next();
    res.status(404).json({ error: 'Recurso no encontrado.' });
}

// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature
function errorHandler(err, req, res, next) {
    const { status, message } = classify(err);

    // 5xx is a real fault: log it with the stack. 4xx is the caller's problem.
    if (status >= 500) {
        console.error(`[${req.method} ${req.originalUrl}]`, err);
    } else {
        console.warn(`[${req.method} ${req.originalUrl}] ${status} — ${message}`);
    }

    if (res.headersSent) return next(err);

    if (wantsJson(req)) return res.status(status).json({ error: message });
    res.status(status).type('text/plain').send(message);
}

module.exports = { notFound, errorHandler, classify };
