const express = require('express');

const router = express.Router();

const maintenanceController = require('../controllers/MaintenanceController');
const refresherDataRequest = require('../request/RefresherDataRequest');

router.get(
    '/', 
    refresherDataRequest.token(),
    maintenanceController.refreshData
);

module.exports = router;
