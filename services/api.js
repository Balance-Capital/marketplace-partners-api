/* eslint-disable no-console */
require('dotenv').config();
const axios = require('axios');
const { RESPONSE_STATUS_REFUSED } = require('../constants/httpResponse');
const logger = require('./logger');

/**
 * Makes an HTTP request using the Axios library.
 * Handles different error scenarios and logs the errors using a logger module.
 *
 * @param {Object} options - The options for the HTTP request.
 * @param {string} options.url - The URL to make the HTTP request to.
 * @param {Object} [options.headers] - The headers to include in the request.
 * @param {Object} [options.params] - The parameters to send with the request.
 * @param {string} [options.method='get'] - The HTTP method to use.
 * @param {Function} [options.successCallback] - A callback function to be called if the request is successful.
 * @param {Function} [options.errorCallback] - A callback function to be called if the request fails.
 * @returns {Promise<Object|boolean>} - The response object if the request is successful, or false if the request fails.
 */
const api = async ({
  url,
  headers,
  params,
  method = 'get',
  successCallback,
  errorCallback
}) => {
  try {
    const options = {
      method,
      headers,
      url,
      data: params,
      decompress: true
    };

    const response = await axios(options);

    if (process.env.HTTP_API_DEBUG === 'true') {
      console.log('---------');
      console.log('REQUEST OPTION');
      console.log(options.url);
      console.log(options.method);
      console.log(options.headers);
      console.log('RESPONSE');
      console.log(`STATUS: ${response.status}`);
      console.log(`HEADERS:`);
      console.log(response.headers);
    }

    if (successCallback) successCallback(response);

    return response;
  } catch (error) {
    if (error && error.code === RESPONSE_STATUS_REFUSED) {
      if (errorCallback) errorCallback(error);
      if (process.env.HTTP_API_DEBUG === 'true') {
        console.log(options);
        console.log(error.code);
      }
      logger.critical(`PARTNERS API: ${error}`);
    } else if (error && error.response && error.response.status === 500) {
      if (errorCallback) errorCallback(error);
      if (process.env.HTTP_API_DEBUG === 'true') {
        console.log(options);
        console.log(error.response.status);
      }
      logger.critical(`PARTNERS API: ${error}`);
    } else {
      if (errorCallback) errorCallback(error);
      if (process.env.HTTP_API_DEBUG === 'true') {
        console.log(error);
      }
      logger.warning(`PARTNERS API: ${error}`);
    }

    return false;
  }
};

module.exports = { api };
