/* eslint-disable no-underscore-dangle */
const { validationResult } = require('express-validator');

const ACCESS_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

const { cronWork } = require('../services/cronMaintenanceSchedule');

const refreshData = (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  };

  if(req.query.token !== ACCESS_TOKEN) {
    res.json('wrong token');
    return;
  };

  cronWork();

  res.json('start refresh');

}

module.exports = { refreshData }
