const { msUntilNextTick } = require('../helpers/reminders');

const MIN = 60 * 1000;
// Wall-clock helper: ms since epoch for HH:MM today (any whole-hour offset works).
const at = (h, m, s = 0) => Date.UTC(2026, 10, 12, h, m, s);

describe('msUntilNextTick', () => {
    test.each([
        [at(10, 0),      20 * MIN],             // 10:00 -> 10:20
        [at(10, 19, 59), 1000],                 // 1 s before -> 10:20
        [at(10, 20),     30 * MIN],             // exactly on a tick -> the next one, not 0
        [at(10, 21),     29 * MIN],             // 10:21 -> 10:50
        [at(10, 50),     30 * MIN],             // 10:50 -> 11:20
        [at(10, 55),     25 * MIN],             // 10:55 -> 11:20
        [at(23, 55),     25 * MIN],             // crosses midnight
    ])('now=%i -> %i ms', (now, expected) => {
        expect(msUntilNextTick(now)).toBe(expected);
    });
});
