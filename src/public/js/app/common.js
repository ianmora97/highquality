// Shared helpers for the client account (/app/*). Loaded in the layout <head>, after moment.

// User text goes into innerHTML templates — escape it.
function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
}

function firstName(full) {
    return String(full || '').trim().split(/\s+/)[0] || '';
}

function plural(n, one, many) {
    return n + ' ' + (n === 1 ? one : many);
}

function money(n) {
    return '₡' + Number(n || 0).toLocaleString('es-CR');
}

function eventServices(ev) {
    return (ev.extendedProps && ev.extendedProps.servicios) || [];
}

function eventPrice(ev) {
    return Number((ev.extendedProps && ev.extendedProps.precio) || 0);
}

// "Hoy", "Mañana", "En 3 días" for a future date; "Hace 2 semanas" for a past one.
function relativeDay(date) {
    var days = moment(date).startOf('day').diff(moment().startOf('day'), 'days');
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Mañana';
    if (days > 1 && days < 14) return 'En ' + days + ' días';
    if (days >= 14) return 'En ' + Math.round(days / 7) + ' semanas';
    if (days === -1) return 'Ayer';
    if (days > -14) return 'Hace ' + Math.abs(days) + ' días';
    if (days > -60) return 'Hace ' + Math.round(Math.abs(days) / 7) + ' semanas';
    return 'Hace ' + Math.max(2, Math.round(Math.abs(days) / 30)) + ' meses';
}

// Google Calendar "add event" link — the 30 min slot, no server round trip.
function calendarUrl(ev) {
    var fmt = function (m) { return m.utc().format('YYYYMMDD[T]HHmmss[Z]'); };
    var start = moment(ev.start);
    var svc = eventServices(ev).join(', ');
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
        '&text=' + encodeURIComponent('HighQuality Studio' + (svc ? ' · ' + svc : '')) +
        '&dates=' + fmt(start.clone()) + '/' + fmt(start.clone().add(30, 'minutes')) +
        '&details=' + encodeURIComponent('Cita en HighQuality Studio');
}

// Staggered reveal: <el class="acc-rise" style="--i:n">.
function stagger(root) {
    var i = 0;
    root.querySelectorAll('.acc-rise').forEach(function (el) { el.style.setProperty('--i', Math.min(i++, 10)); });
}
