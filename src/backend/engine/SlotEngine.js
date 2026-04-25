const moment = require('moment-timezone');
const WeeklySchedule = require('../models/v2/WeeklySchedule');
const ScheduleException = require('../models/v2/ScheduleException');
const Appointment = require('../models/v2/Appointment');
const Block = require('../models/v2/Block');

class SlotEngine {
    constructor(timezone = 'America/Costa_Rica') {
        this.timezone = timezone;
        this.slotDuration = 30; // Core resolution
    }

    /**
     * Calculates available slots for a given date
     * @param {Date|String} targetDate The date to query
     * @param {Number} serviceDuration Minutes needed
     * @param {Boolean} isPublicClient If true, applies public visibility rules (full hours future, half hours today).
     * @returns {Array} List of available start times (moment objects)
     */
    async getAvailableSlots(targetDate, serviceDuration, isPublicClient = true) {
        const queryDate = moment(targetDate).tz(this.timezone).startOf('day');
        const now = moment().tz(this.timezone);

        // 1. Check if dates are valid for booking
        if (queryDate.isBefore(now.startOf('day'))) {
            return []; // Cannot book in the past
        }

        // 2. Fetch base schedule for the day of week
        const dayOfWeek = queryDate.day();
        const schedule = await WeeklySchedule.findOne({ dayOfWeek });
        
        let isOpen = schedule ? schedule.isOpen : false;
        let startTime = schedule ? schedule.startTime : '00:00';
        let endTime = schedule ? schedule.endTime : '00:00';
        let breaks = schedule ? schedule.breaks : [];

        // 3. Check for exceptions (holidays, special hours)
        const exception = await ScheduleException.findOne({
            date: {
                $gte: queryDate.toDate(),
                $lt: moment(queryDate).add(1, 'day').toDate()
            }
        });

        if (exception) {
            isOpen = exception.isOpen;
            if (isOpen) {
                startTime = exception.startTime;
                endTime = exception.endTime;
                breaks = []; // Usually exceptions overwrite breaks, or we can merge. We assume overwrite.
            }
        }

        if (!isOpen) return [];

        // 4. Generate all possible 30-min slots from startTime to endTime
        const allSlots = this._generateSlots(queryDate, startTime, endTime);

        // 5. Remove breaks
        const validSlots = this._removeTimePeriods(allSlots, breaks, queryDate);

        // 6. Fetch existing overlapping blocks and appointments
        const queryStart = moment(queryDate).set({ hour: startTime.split(':')[0], minute: startTime.split(':')[1] }).toDate();
        const queryEnd = moment(queryDate).set({ hour: endTime.split(':')[0], minute: endTime.split(':')[1] }).toDate();

        const [appointments, blocks] = await Promise.all([
            Appointment.find({
                status: { $in: ['pending', 'completed', 'recurring_reserved'] },
                startTime: { $lt: queryEnd },
                endTime: { $gt: queryStart }
            }),
            Block.find({
                startTime: { $lt: queryEnd },
                endTime: { $gt: queryStart }
            })
        ]);

        const busyPeriods = [
            ...appointments.map(a => ({ start: moment(a.startTime).tz(this.timezone), end: moment(a.endTime).tz(this.timezone) })),
            ...blocks.map(b => ({ start: moment(b.startTime).tz(this.timezone), end: moment(b.endTime).tz(this.timezone) }))
        ];

        // 7. Filter out busy slots
        let freeSlots = validSlots.filter(slot => {
            const slotStart = moment(slot);
            const slotEnd = moment(slot).add(this.slotDuration, 'minutes');
            
            // Check if this slot overlaps with any busy period
            return !busyPeriods.some(busy => {
                return slotStart.isBefore(busy.end) && slotEnd.isAfter(busy.start);
            });
        });

        // 8. Find continuous sequences that fit the `serviceDuration`
        const neededConsecutiveSlots = Math.ceil(serviceDuration / this.slotDuration);
        let finalAvailableStarts = [];

        for (let i = 0; i <= freeSlots.length - neededConsecutiveSlots; i++) {
            let isContinuous = true;
            for (let j = 1; j < neededConsecutiveSlots; j++) {
                // If the next free slot is not exactly 30 mins after the current one, it's not continuous
                const gap = freeSlots[i + j].diff(freeSlots[i + j - 1], 'minutes');
                if (gap !== this.slotDuration) {
                    isContinuous = false;
                    break;
                }
            }

            if (isContinuous) {
                finalAvailableStarts.push(freeSlots[i]);
            }
        }

        // 9. Apply Public Client Visibility Rules
        // If booking for today, public can see half hours.
        // If booking for future, public can ONLY see full hours (xx:00) UNLESS half hours form the only fit (edge cases).
        // Let's implement strict: only :00 visible for future dates.
        if (isPublicClient) {
            const isToday = queryDate.isSame(now.startOf('day'), 'day');
            
            // Also filter out slots in the past for TODAY, with an offset (e.g. at least 1 hr advance)
            const minBookingTime = moment().tz(this.timezone).add(1, 'hours');
            finalAvailableStarts = finalAvailableStarts.filter(slot => slot.isAfter(minBookingTime));

            if (!isToday) {
                // Future dates: only show whole hours
                finalAvailableStarts = finalAvailableStarts.filter(slot => slot.minute() === 0);
            }
        }

        return finalAvailableStarts;
    }

    _generateSlots(baseDate, startTimeStr, endTimeStr) {
        const slots = [];
        const [startH, startM] = startTimeStr.split(':').map(Number);
        const [endH, endM] = endTimeStr.split(':').map(Number);

        const current = moment(baseDate).set({ hour: startH, minute: startM, second: 0, millisecond: 0 });
        const end = moment(baseDate).set({ hour: endH, minute: endM, second: 0, millisecond: 0 });

        while (current.isBefore(end)) {
            slots.push(moment(current));
            current.add(this.slotDuration, 'minutes');
        }
        return slots;
    }

    _removeTimePeriods(slots, periods, baseDate) {
        if (!periods || periods.length === 0) return slots;

        const exclusionPeriods = periods.map(p => {
            const [sh, sm] = p.startTime.split(':').map(Number);
            const [eh, em] = p.endTime.split(':').map(Number);
            return {
                start: moment(baseDate).set({ hour: sh, minute: sm, second: 0, millisecond: 0 }),
                end: moment(baseDate).set({ hour: eh, minute: em, second: 0, millisecond: 0 })
            };
        });

        return slots.filter(slot => {
            const slotStart = moment(slot);
            const slotEnd = moment(slot).add(this.slotDuration, 'minutes');
            
            return !exclusionPeriods.some(ex => {
                return slotStart.isBefore(ex.end) && slotEnd.isAfter(ex.start);
            });
        });
    }
}

module.exports = new SlotEngine();
