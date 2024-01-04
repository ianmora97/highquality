const express = require('express');
const router = express.Router();
const path = require('path');

router.get('/*', async (req, res) => {
    const scriptPath = req.params[0];
    const fullPath = path.join(__dirname, `../../../node_modules/${scriptPath}`);
    res.sendFile(fullPath);
});

module.exports = router;