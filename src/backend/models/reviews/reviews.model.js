const Review = require('./reviews.schema');
const moment = require('moment');

exports.get = async () => {
    const review = await Review.find();
    return review;
};

exports.getDisplay = async () => {
    const review = await Review.find({
        display: true
    });
    return review;
};

exports.create = async (review) => {
    review.createdAt = moment().format();
    const newReview = new Review(review);
    await newReview.save();
    return newReview;
};

exports.update = async (id, data) => {
    const review = await Review.findByIdAndUpdate(id, data);
    return review;
};

exports.delete = async (id) => {
    const review = await Review.findByIdAndDelete(id);
    return review;
};
