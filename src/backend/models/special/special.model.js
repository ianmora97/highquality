const Special = require('./special.schema');
const moment = require('moment');

exports.get = async (limit, page, sort) => {
    if(limit && page){
        const specials = await Special.find().limit(limit).skip(page).sort(sort).lean();
        return specials;
    }else if(limit){
        const specials = await Special.find().limit(limit).sort(sort).lean();
        return specials;
    }else if(page){
        const specials = await Special.find().skip(page).sort(sort).lean();
        return specials;
    }else if(sort == 'thisweek'){
        const specials = await Special.find({
            createdAt: {
                $gte: moment().startOf('isoWeek').format()
            }
        }).sort(sort).lean();
        return specials;
    }else{
        const specials = await Special.find().sort(sort).lean();
        return specials;
    }
};

exports.create = async (special) => {
    special.createdAt = moment().format();
    const newSpecial = new Special(special);
    await newSpecial.save();
    return newSpecial;
};

exports.update = async (id, data) => {
    const event = await Special.findByIdAndUpdate(id, data);
    return event;
};

exports.delete = async (id) => {
    const event = await Special.findByIdAndDelete(id);
    return event;
};