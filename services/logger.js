/* eslint-disable import/no-extraneous-dependencies */
require('dotenv').config();
const Rollbar = require("rollbar");

// const winston = require("winston");

// const { Logtail } = require("@logtail/node");

// const { LogtailTransport } = require("@logtail/winston");

// Create a Logtail client
// const logtail = new Logtail(process.env?.LOGTAIL_TOKEN || null);

// Create a Rollbar client
// eslint-disable-next-line no-unused-vars
const rollbar = new Rollbar({
  accessToken: process.env?.ROLLBAR_TOKEN || null,
  captureUncaught: process.env?.APP_ENV !== 'development',
  captureUnhandledRejections: process.env?.APP_ENV !== 'development'
});

// Create a Winston logger - passing in the Logtail transport
// const winstonLogger = winston.createLogger({
//   transports: [new LogtailTransport(logtail), new LogtailTransport(rollbar)]
// });

// const intervalTime = 10000;
// setInterval(()=>{logtail.flush()},intervalTime);

const logger = {
  error : (message, context={}) => rollbar.error(message, context),
  debug : (message, context={}) => rollbar.debug(message, context),
  warning : (message, context={}) => rollbar.warning(message, context),
  warn: (message, context={}) => rollbar.warn(message, context),
  info : (message, context={}) => rollbar.info(message, context),
  critical: (message, context={}) => rollbar.crit(message, context),
  log: (message, context={}) => rollbar.log(message, context)
};

module.exports = logger;
