const fetch = require('node-fetch');
const logger = require("./logger");

AbortSignal.timeout ??= function timeout(ms) {
  const ctrl = new AbortController()
  setTimeout(() => ctrl.close(), ms)
  return ctrl.signal
};

const myFetch = (url, option=null) => {
  const timeOut = 15000;
  const options = { 
    signal: AbortSignal.timeout(timeOut),
    method: 'GET',
    cache: 'no-cache', 
    redirect: 'follow',
    headers: {
      'connection': 'keep-alive'
    },
    ...option
  };
  try {
    return fetch(url, options);
  } catch (error) {
    logger.error(error);
    return error;
  };
};

module.exports = myFetch;