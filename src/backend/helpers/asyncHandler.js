// Express 4 does not catch rejections from async route handlers: an unhandled
// rejection reaches Node, and Node 22 kills the process. A single malformed body
// on a public route (POST /api/v1/review, for example) used to take the whole
// site down — bookings, dashboard and sockets with it.
//
// asyncHandler routes those rejections into Express's error pipeline instead.

/** Wrap one handler so a rejected promise becomes next(err). */
function asyncHandler(fn) {
    if (typeof fn !== 'function') return fn;
    if (fn.__wrapped) return fn;

    const wrapped = function (req, res, next) {
        try {
            const out = fn.call(this, req, res, next);
            if (out && typeof out.then === 'function') out.catch(next);
            return out;
        } catch (err) {
            // Synchronous throws inside an async-looking handler.
            next(err);
        }
    };

    wrapped.__wrapped = true;
    return wrapped;
}

/**
 * Wrap every function a controller module exports, leaving anything else
 * (config objects, arrays of middleware) untouched. Lets a route file opt in
 * with one call instead of editing every handler.
 */
function wrapAll(controller) {
    const out = {};
    for (const [key, value] of Object.entries(controller)) {
        out[key] = typeof value === 'function' ? asyncHandler(value) : value;
    }
    return out;
}

module.exports = { asyncHandler, wrapAll };
