const express = require('express');

const router = express.Router();

const PingPongController = require('../controllers/PingPongController');

router.get(
    '/',
    PingPongController.get
);

module.exports = router;
