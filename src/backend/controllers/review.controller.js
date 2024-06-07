const Review = require('../models/reviews/reviews.model');

exports.get = async (req, res) => {
    const reviews = await Review.get();
    res.json(reviews);
};
exports.getDisplay = async (req, res) => {
    const reviews = await Review.getDisplay();
    res.json(reviews);
};
exports.create = async (req, res) => {
    const review = await Review.create(req.body);
    res.json(review);
};
exports.test = async (req, res) => {
    console.log(req.body);
    res.json(req.body);
};
exports.update = async (req, res) => {
    const {id} = req.params;
    const review = await Review.update(id, req.body);
    res.json(review);
};
exports.delete = async (req, res) => {
    const {id} = req.params;
    const review = await Review.delete(id);
    res.json(review);
};