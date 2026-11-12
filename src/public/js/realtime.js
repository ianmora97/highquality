/* HighQuality — shared realtime layer
 * Loaded on the booking page and on every dashboard page.
 * Exposes:
 *   HQ.connect({ room })   → socket.io socket, with a live status pill
 *   HQ.toast({...})        → the app's own toast (no SweetAlert dependency)
 *   HQ.on(event, handler)  → sugar over socket.on that survives reconnects
 */
(function (global) {
    'use strict';

    // ── toasts ────────────────────────────────────────────────────────────────
    var TOAST_STYLES = {
        booking: { icon: 'fa-solid fa-calendar-check', accent: 'violet' },
        success: { icon: 'fa-solid fa-check',          accent: 'emerald' },
        warn:    { icon: 'fa-solid fa-triangle-exclamation', accent: 'amber' },
        error:   { icon: 'fa-solid fa-xmark',          accent: 'rose' },
        info:    { icon: 'fa-solid fa-bolt',           accent: 'blue' },
        money:   { icon: 'fa-solid fa-coins',          accent: 'emerald' },
        trash:   { icon: 'fa-solid fa-calendar-xmark', accent: 'rose' }
    };

    function layer() {
        var el = document.getElementById('hq-toast-layer');
        if (!el) {
            el = document.createElement('div');
            el.id = 'hq-toast-layer';
            el.className = 'hq-toast-layer';
            document.body.appendChild(el);
        }
        return el;
    }

    function toast(opts) {
        opts = opts || {};
        var style = TOAST_STYLES[opts.type] || TOAST_STYLES.info;
        var ms    = opts.duration || 5000;

        var card = document.createElement('div');
        card.className = 'hq-toast hq-toast-' + style.accent;
        card.innerHTML =
            '<span class="hq-toast-badge"><i class="' + (opts.icon || style.icon) + '"></i></span>' +
            '<div class="hq-toast-body">' +
                '<div class="hq-toast-title">' + escapeHtml(opts.title || '') + '</div>' +
                (opts.text ? '<div class="hq-toast-text">' + escapeHtml(opts.text) + '</div>' : '') +
            '</div>' +
            '<button class="hq-toast-close" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>' +
            '<span class="hq-toast-bar" style="animation-duration:' + ms + 'ms"></span>';

        var dismiss = function () {
            if (card.dataset.closing) return;
            card.dataset.closing = '1';
            card.classList.add('hq-toast-out');
            setTimeout(function () { card.remove(); }, 260);
        };

        card.querySelector('.hq-toast-close').addEventListener('click', dismiss);
        layer().appendChild(card);

        var timer = setTimeout(dismiss, ms);
        card.addEventListener('mouseenter', function () { clearTimeout(timer); card.classList.add('hq-toast-hold'); });
        card.addEventListener('mouseleave', function () { timer = setTimeout(dismiss, 1200); card.classList.remove('hq-toast-hold'); });

        // Keep the stack short so a burst of bookings cannot cover the page.
        var cards = layer().querySelectorAll('.hq-toast');
        if (cards.length > 4) cards[0].remove();

        return { dismiss: dismiss };
    }

    function escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    // ── live status pill ──────────────────────────────────────────────────────
    function pill() {
        var el = document.getElementById('hq-live-pill');
        if (!el) {
            el = document.createElement('div');
            el.id = 'hq-live-pill';
            el.className = 'hq-live-pill hq-live-off';
            el.innerHTML = '<span class="hq-live-dot"></span><span class="hq-live-text">Conectando…</span>';
            document.body.appendChild(el);
        }
        return el;
    }

    function setStatus(state, label) {
        var el = pill();
        el.classList.remove('hq-live-on', 'hq-live-off', 'hq-live-warn');
        el.classList.add(state === 'on' ? 'hq-live-on' : state === 'warn' ? 'hq-live-warn' : 'hq-live-off');
        el.querySelector('.hq-live-text').textContent = label;
        if (state === 'on') {
            el.classList.add('hq-live-settled');
            clearTimeout(el._hide);
            el._hide = setTimeout(function () { el.classList.add('hq-live-min'); }, 2600);
        } else {
            el.classList.remove('hq-live-min');
        }
    }

    // ── connection ────────────────────────────────────────────────────────────
    var socket   = null;
    var room     = 'booking';
    var handlers = [];

    function connect(opts) {
        opts = opts || {};
        room = opts.room || 'booking';

        if (typeof global.io !== 'function') {
            console.warn('[HQ] socket.io client no cargado — sin tiempo real');
            setStatus('off', 'Sin tiempo real');
            return null;
        }
        if (socket) return socket;

        socket = global.io({ transports: ['websocket', 'polling'], reconnectionDelayMax: 5000 });

        socket.on('connect', function () {
            socket.emit('hello', { room: room });
            setStatus('on', 'En vivo');
        });
        socket.on('disconnect', function () { setStatus('warn', 'Reconectando…'); });
        socket.io.on('reconnect_attempt', function () { setStatus('warn', 'Reconectando…'); });
        socket.on('connect_error', function () { setStatus('off', 'Sin conexión'); });

        handlers.forEach(function (h) { socket.on(h.event, h.fn); });
        return socket;
    }

    function on(event, fn) {
        handlers.push({ event: event, fn: fn });
        if (socket) socket.on(event, fn);
    }

    function emit() {
        if (socket && socket.connected) socket.emit.apply(socket, arguments);
    }

    function isLive() { return !!(socket && socket.connected); }

    global.HQ = { connect: connect, on: on, emit: emit, toast: toast, isLive: isLive, setStatus: setStatus };
    global.hqToast = toast;

    // Any page that declares <body data-hq-room="..."> gets the socket without
    // needing its own bootstrap. Pages with richer handling (the dashboard
    // panel, the booking page) call connect() themselves — it is idempotent.
    document.addEventListener('DOMContentLoaded', function () {
        var declared = document.body && document.body.dataset.hqRoom;
        if (declared) connect({ room: declared });
    });
})(window);
