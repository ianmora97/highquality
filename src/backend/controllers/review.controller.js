const Review = require('../models/reviews/reviews.model');

const { ReviewError } = Review;

/** Turn a ReviewError into its JSON response; rethrow anything unexpected. */
function fail(res, err) {
    if (err instanceof ReviewError) {
        return res.status(err.status).json({ error: err.message });
    }
    throw err;
}

// GET /api/v1/review/display — public, approved only
exports.getDisplay = async (req, res) => {
    res.json(await Review.getDisplay());
};

// GET /api/v1/review/mine — the logged-in client's own reviews
exports.mine = async (req, res) => {
    try {
        res.json(await Review.mine(req.user));
    } catch (err) { return fail(res, err); }
};

// GET /api/v1/review — admin queue, paginated
exports.list = async (req, res) => {
    const { page, limit, status, stars, search, orden } = req.query;
    res.json(await Review.list({ page, limit, status, stars, search, orden }));
};

// POST /api/v1/review — client submits a review, identity comes from the session
exports.create = async (req, res) => {
    try {
        res.status(201).json(await Review.create(req.body, req.user));
    } catch (err) { return fail(res, err); }
};

exports.approve = async (req, res) => {
    try {
        res.json(await Review.setStatus(req.params.id, 'approved'));
    } catch (err) { return fail(res, err); }
};

exports.reject = async (req, res) => {
    try {
        res.json(await Review.setStatus(req.params.id, 'rejected'));
    } catch (err) { return fail(res, err); }
};

exports.reply = async (req, res) => {
    try {
        res.json(await Review.reply(req.params.id, req.body.reply));
    } catch (err) { return fail(res, err); }
};

exports.delete = async (req, res) => {
    try {
        res.json(await Review.remove(req.params.id));
    } catch (err) { return fail(res, err); }
};
