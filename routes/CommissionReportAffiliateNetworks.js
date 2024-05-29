const express = require('express');

const router = express.Router();

const commissionReportAffiliateNetworksController = require('../controllers/CommissionReportAffiliateNetworksController');
const commissionReportAffiliateNetworksRequest = require('../request/CommissionReportAffiliateNetworksRequest');

router.get(
    '/',
    commissionReportAffiliateNetworksRequest.get(),
    commissionReportAffiliateNetworksController.get
);

router.put(
    '/',
    commissionReportAffiliateNetworksRequest.put(),
    commissionReportAffiliateNetworksController.put
);

module.exports = router;
