/* eslint-disable no-console */
require('dotenv').config();
const axios = require('axios');
const { RESPONSE_STATUS_REFUSED } = require('../constants/httpResponse');
const logger = require('./logger');

const api = async ({
  url,
  headers,
  params,
  method,
  successCallback,
  errorCallback
}) => {
  const options = {
    method: method || 'get',
    headers,
    url,
    data: params,
    decompress: true
  };
  return axios(options)
    .catch((error) => {
      if (error && error.code === RESPONSE_STATUS_REFUSED) {
        if (errorCallback) errorCallback(error);
        if(process.env.HTTP_API_DEBUG === 'true') {
          console.log(options);
          console.log(error.code);  
        }
        logger.critical(`PARTNERS API: ${error}`);
      } else if (error && error.response && error.response.status === 500) {
        if (errorCallback) errorCallback(error);
        if(process.env.HTTP_API_DEBUG === 'true') {
          console.log(options);
          console.log(error.response.status);
        }
        logger.critical(`PARTNERS API: ${error}`);
      } else {
        if (errorCallback) errorCallback(error);
        if(process.env.HTTP_API_DEBUG) {
          console.log(error);
        }
        logger.warning(`PARTNERS API: ${error}`);
      }
      return false;
    })
    .then((response) => {
      if(!response.status) {
        if(errorCallback) errorCallback();
      }
      if(process.env.HTTP_API_DEBUG === 'true') {
        console.log('---------');
        console.log('REQUEST OPTION');
        console.log(options.url);        
        console.log(options.method);        
        console.log(options.headers);        
        console.log('RESPONSE');
        console.log(`STATUS: ${response.status}`);
        console.log(`HEADERS:`);
        console.log(response.headers);
      };
      if (successCallback) successCallback(response);
      return response;
    });
};

module.exports = { api };
