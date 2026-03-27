const Event = require('./event.schema');
const moment = require('moment');

exports.get = async (limit, page, sort, only) => {
    if(limit && page){
        const events = await Event.find().limit(limit).skip(page).sort(sort).lean();
        return events;
    }else if(limit){
        const events = await Event.find().limit(limit).sort(sort).lean();
        return events;
    }else if(page){
        const events = await Event.find().skip(page).sort(sort).lean();
        return events;
    }else if(sort == 'thisweek'){
        const events = await Event.find({
            start: {
                $gte: moment().startOf('isoWeek').format()
            }
        }).sort(sort).lean();
        return events;
    }else if(sort == 'today'){
        const events = await Event.find({
            start: {
                $gte: moment().startOf('day').format()
            }
        }).sort(sort).lean();
        return events;
    }else if(sort == 'oneweekahead'){
        const events = await Event.find({
            start: {
                $gte: moment().startOf('day').format(),
            },
            end: {
                $lte: moment().add(7, 'days').endOf('day').format()
            }
        }).sort(sort).lean();
        return events;
    }else if(only == 'true'){
        const events = await Event.find({
            start: {
                $gte: moment(sort).startOf('day').toDate(),
                $lt: moment(sort).endOf('day').toDate()
            }
        }).sort(sort).lean();
        return events;
    }else{
        const events = await Event.find({
            start: {
                $gte: sort
            }
        }).sort(sort).lean();
        return events;
    }
};

exports.getMonth = async (month) => {
    const events = await Event.find({
        start: {
            $gte: moment(month).startOf('month').format(),
            $lte: moment(month).endOf('month').format()
        }
    }).lean();
    return events;
};

exports.create = async (event) => {
    event.createdAt = moment().format();
    event.updatedAt = moment().format();
    console.log(event);
    const newEvent = new Event(event);
    await newEvent.save();
    return newEvent;
};

exports.update = async (id, data) => {
    data.updatedAt = moment().format('DD/MM/YYYY hh:mm:ss');
    const event = await Event.findByIdAndUpdate(id, data);
    return event;
};

exports.delete = async (id) => {
    const event = await Event.findByIdAndDelete(id);
    return event;
};

exports.pagar = async (id, monto) => {
    if(monto == 0){
        const event = await Event.findByIdAndUpdate(id, {
            'extendedProps.precio': parseInt(monto),
            'extendedProps.estado': 'POR PAGAR',
            backgroundColor: '#6c1313',
            borderColor: '#eb5d5d',
            textColor: '#fff'
        });
        return event;
    }else{
        const event = await Event.findByIdAndUpdate(id, {
            'extendedProps.precio': parseInt(monto),
            'extendedProps.estado': 'PAGO',
            backgroundColor: '#064724',
            borderColor: '#44c780',
            textColor: '#fff'
        });
        return event;
    }
}