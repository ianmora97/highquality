const Event = require('./event.schema');
const moment = require('moment');

exports.get = async (limit, page, sort) => {
    if(limit && page){
        const events = await Event.find().limit(limit).skip(page).sort(sort).lean();
        return events;
    }else if(limit){
        const events = await Event.find().limit(limit).sort(sort).lean();
        return events;
    }else if(page){
        const events = await Event.find().skip(page).sort(sort).lean();
        return events;
    }else{
        const events = await Event.find().sort(sort).lean();
        return events;
    }
};

exports.create = async (event) => {
    event.createdAt = moment().format('DD/MM/YYYY hh:mm:ss');
    event.updatedAt = moment().format('DD/MM/YYYY hh:mm:ss');
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