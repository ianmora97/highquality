// Slot engine — single source of truth for how a day's work blocks become bookable slots.
//
// A horario day is a list of work blocks: [{ start: '09:00', end: '13:00' }, ...].
// The gap between two blocks is the barber's lunch/rest — no slots are generated there.
// Every appointment lasts 30 min, so a slot only fits when slot + 30 <= block end.
//   · base slots  → one per hour from the block start (what clients see on future days)
//   · half slots  → the same grid shifted 30 min (same-day only for clients, always for admin)

const SLOT_MINUTES = 30;
const STEP_MINUTES = 60;

const LABEL_RE = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i;
const HHMM_RE = /^(\d{1,2}):(\d{2})$/;

function toMinutes(hhmm) {
    const m = HHMM_RE.exec(String(hhmm).trim());
    if (!m) return null;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (h > 23 || min > 59) return null;
    return h * 60 + min;
}

function toHHmm(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function toLabel(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const ampm = h < 12 ? 'am' : 'pm';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function labelToMinutes(label) {
    const m = LABEL_RE.exec(String(label).trim());
    if (!m) return null;
    let h = Number(m[1]) % 12;
    if (m[3].toLowerCase() === 'pm') h += 12;
    return h * 60 + Number(m[2]);
}

// Sorts, drops invalid entries and merges blocks that overlap or touch.
function normalizeBlocks(blocks) {
    if (!Array.isArray(blocks)) return [];
    const parsed = blocks
        .map(b => ({ start: toMinutes(b && b.start), end: toMinutes(b && b.end) }))
        .filter(b => b.start !== null && b.end !== null && b.end > b.start)
        .sort((a, b) => a.start - b.start);

    const merged = [];
    parsed.forEach(b => {
        const last = merged[merged.length - 1];
        if (last && b.start <= last.end) last.end = Math.max(last.end, b.end);
        else merged.push({ ...b });
    });
    return merged.map(b => ({ start: toHHmm(b.start), end: toHHmm(b.end) }));
}

// Legacy docs stored a flat list of hour labels. Consecutive slots (<= 1h apart)
// belong to the same work block; a bigger gap means the barber was resting.
function blocksFromHours(hours) {
    if (!Array.isArray(hours) || !hours.length) return [];
    const mins = hours.map(labelToMinutes).filter(m => m !== null).sort((a, b) => a - b);
    if (!mins.length) return [];

    const blocks = [];
    let start = mins[0];
    let prev = mins[0];
    mins.slice(1).forEach(m => {
        if (m - prev > STEP_MINUTES) {
            blocks.push({ start, end: prev + SLOT_MINUTES });
            start = m;
        }
        prev = m;
    });
    blocks.push({ start, end: prev + SLOT_MINUTES });
    return blocks.map(b => ({ start: toHHmm(b.start), end: toHHmm(b.end) }));
}

function slotsFromBlocks(blocks, offsetMinutes) {
    const out = [];
    normalizeBlocks(blocks).forEach(b => {
        const end = toMinutes(b.end);
        for (let t = toMinutes(b.start) + offsetMinutes; t + SLOT_MINUTES <= end; t += STEP_MINUTES) {
            out.push(t);
        }
    });
    return out.sort((a, b) => a - b);
}

function baseSlots(blocks) {
    return slotsFromBlocks(blocks, 0).map(toLabel);
}

function halfSlots(blocks) {
    return slotsFromBlocks(blocks, SLOT_MINUTES).map(toLabel);
}

// `allowHalf` is true for same-day bookings and for the admin panel.
function isSlotAllowed(blocks, hhmm, allowHalf) {
    const minutes = toMinutes(hhmm);
    if (minutes === null) return false;
    const allowed = slotsFromBlocks(blocks, 0);
    if (allowHalf) allowed.push(...slotsFromBlocks(blocks, SLOT_MINUTES));
    return allowed.includes(minutes);
}

// Fills the derived fields every consumer reads, migrating legacy hour-only docs on the fly.
function hydrateHorario(doc) {
    const blocks = doc.blocks && doc.blocks.length
        ? normalizeBlocks(doc.blocks)
        : blocksFromHours(doc.hours);

    return {
        ...doc,
        blocks,
        hours: baseSlots(blocks),
        halfHours: halfSlots(blocks),
        startTime: blocks.length ? blocks[0].start : '',
        endTime: blocks.length ? blocks[blocks.length - 1].end : '',
    };
}

module.exports = {
    SLOT_MINUTES,
    STEP_MINUTES,
    toMinutes,
    toHHmm,
    toLabel,
    labelToMinutes,
    normalizeBlocks,
    blocksFromHours,
    baseSlots,
    halfSlots,
    isSlotAllowed,
    hydrateHorario,
};
