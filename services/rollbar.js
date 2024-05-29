require('dotenv').config();
const Rollbar = require("rollbar");

const rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR_TOKEN,
  captureUncaught: process.env.APP_ENV !== 'development',
  captureUnhandledRejections: process.env.APP_ENV !== 'development'
});

module.exports = rollbar;