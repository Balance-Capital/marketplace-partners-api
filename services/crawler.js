/* eslint-disable no-console */
/* eslint-disable no-param-reassign */
/* eslint-disable no-underscore-dangle */
require('dotenv').config();
const puppeteer = require('puppeteer');
const moment = require('moment');

const {
  SIGNAL_INIT,
  SIGNAL_PING,
  SIGNAL_PONG,
  SIGNAL_STATUS,
  SIGNAL_STATUS_OK,
  SIGNAL_STATUS_ERROR,
  SIGNAL_KILL
} = require('../constants/threads');

const DELAY_DAYS_TO_CHECKING_AGAIN = 7;

const REJECT_REDIRECT_DOMAIN = ['google.com'];

const MAX_OPEN_PAGES = 3;

const QUERY_STATUSES = [429, 403];

const REJECT_STATUS = 404;

const WAIT_TIME_SHORT_START = 5000;
const WAIT_TIME_SHORT_END = 15000;

const WAIT_TIME_LONG_START = 45000;
const WAIT_TIME_LONG_END = 90000;

const NAVIGATION_TIMEOUT = 45000;

let IS_CRON_WORKING = true;

const signature = 'crawler-website checker ver.1';

const args = [
  '--window-size=1600,1080',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-setuid-sandbox',
  '--disable-features=site-per-process',
  '--disable-infobars',
  '--window-position=0,0',
  '--ignore-certifcate-errors',
  '--ignore-certifcate-errors-spki-list'
];

const options = {
  args,
  defaultViewport: {
    height: 980,
    width: 1580
  },
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || null,
  devtools: false,
  ignoreHTTPSErrors: true,
  userDataDir: './tmp'
};

const { generateRandomNumber } = require('../utils/random');
const logger = require('./logger');
const apiDb = require('../models/apiDatabase');

let browser = null;
(async () => {
  console.log(`start browser ${signature}`);
  browser = await puppeteer.launch(options);
})();

/**
 * Crawls a given URL using Puppeteer.
 * @param {string} url - The URL to crawl.
 * @param {number} [index=0] - The index of the page being crawled.
 * @returns {Promise<Object>} - An object containing the redirect chain, status, timing, and URL of the crawled page.
 */
const crawler = async (url, index = 0) => {
  const crawlTime = Date.now();
  let page = null;
  try {
    console.log(`start new page ${index}`);
    page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36'
    );

    await page.setCacheEnabled(false); 
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.resourceType() === 'image') {
        request.abort();
      } else {
        request.continue();
      };
    });
    
    const response = await page.goto(url, {timeout: NAVIGATION_TIMEOUT, waitUntil: 'networkidle2'});
    const timing = response.timing();
    let status = response.status();
    const chain = response.request().redirectChain();

    if (chain) {
      const hasRejectedRedirect = chain.some((item) =>
        REJECT_REDIRECT_DOMAIN.includes(new URL(item.url()).hostname)
      );
      if (hasRejectedRedirect) {
        status = REJECT_STATUS;
      }
    }

    const log = {
      chain,
      status,
      timing,
      url,
      err: null
    };

    console.log(chain, status, timing.requestTime, url);
    console.log(`close new page ${index}`);
    return log;
  } catch (err) {
    console.log(
      `${signature} page id: ${index} ERROR: ${err?.message}, total time crawler: ${(
        (Date.now() - crawlTime) /
        1000
      ).toFixed(2)} sec.`
    );
    return {
      chain: [],
      status: -1,
      timing: {
        requestTime: Date.now() - crawlTime
      },
      url,
      err: err?.message || null
    };
  } finally {
    if (page) await page.close();
  }
};

/**
 * Retrieves data from the apiDatabase model based on certain conditions and returns the data.
 * @param {number} limit - The maximum number of records to retrieve.
 * @param {number} offset - The number of records to skip before retrieving.
 * @returns {Promise<Array>} - An array of records retrieved from the apiDatabase model that meet the specified conditions.
 */
const productsData = async (limit, offset) => {
  try {
    const data = await apiDb.apiDatabase
      .model('products', apiDb.models.Products.schema)
      .find({
        $or: [
          { 'checked.date': { $exists: false } },
          { 'checked.date': null },
          {
            'checked.date': {
              $lte: moment()
                .subtract(DELAY_DAYS_TO_CHECKING_AGAIN, 'days')
                .toDate()
            }
          },
          { 'checked.status': {$in: QUERY_STATUSES} }
        ]
      })
      .sort({ 'checked.date': 1 })
      .skip(offset)
      .limit(limit)
      .lean()
      .exec();

    return data;
  } catch (err) {
    logger.warning(`[productsData] ${err?.message}`, err);
    throw err;
  }
};

/**
 * Updates the `checked` field of a product in the database with the provided `status` and `timing` values.
 * @param {string} id - The ID of the product to be updated.
 * @param {number} status - The HTTP status code to be assigned to the `checked.httpStatus` field.
 * @param {object} timing - An object containing the timing information of the request. It should have a `requestTime` property.
 * @param {Error|null} err - Optional error object to be assigned to the `checked.err` field.
 * @returns {Promise<void>} - A Promise that resolves once the product is updated in the database.
 */
const productsDataUpdate = async (id, status, timing, err = null) => {
  try {
    const Products = apiDb.apiDatabase.model('products', apiDb.models.Products.schema);
    await Products.updateOne(
      { _id: id },
      {
        $set: {
          'checked.httpStatus': status,
          'checked.timeRequest': timing.requestTime,
          'checked.date': new Date(),
          'checked.err': err
        }
      }
    ).exec();
  } catch (error) {
    logger.warning(`[productsDataUpdate] ${error?.message}`, error);
  }
};

/**
 * Retrieves data from the `apiDatabase` and filters it based on certain conditions.
 * Returns a flattened array of offers.
 * @param {number} limit - The maximum number of offers to retrieve.
 * @param {number} offset - The number of offers to skip before retrieving.
 * @returns {Promise<Array>} - An array of offers that meet the specified conditions.
 */
const couponsDealsData = async (limit, offset) => {
  try {
    const query = {
      offers: { $ne: [] },
      $or: [
        { 'offers.checked.date': { $exists: false } },
        { 'offers.checked.date': null },
        {
          'offers.checked.date': {
            $lte: moment()
              .subtract(DELAY_DAYS_TO_CHECKING_AGAIN, 'days')
              .toDate()
          }
        },
        { 'checked.status': { $in: QUERY_STATUSES } }
      ]
    };

    const options = { offers: 1 };
    const sort = { 'offers.checked.date': 1 };

    const data = await apiDb.apiDatabase
      .model('Stores', apiDb.models.Stores.schema)
      .find(query, options)
      .sort(sort)
      .skip(offset)
      .limit(limit)
      .lean()
      .exec();

    return data.flatMap((store) => store.offers);
  } catch (err) {
    logger.warning(`[couponsDealsData] ${err?.message}`, err);
    return [];
  }
};

/**
 * Updates a specific field in a document in a MongoDB database.
 * @param {string} id - The ID of the offer to be updated.
 * @param {number} status - The HTTP status code to be set for the offer.
 * @param {Object} timing - An object containing the request time for the offer.
 * @param {number} timing.requestTime - The request time for the offer.
 * @param {any} err - An optional error object.
 * @returns {Promise<void>} - A promise that resolves when the update operation is complete.
 */
const couponsDealsUpdate = async (id, status, timing, err = null) => {
  try {
    const Stores = apiDb.apiDatabase.model('Stores', apiDb.models.Stores.schema);
    const update = {
      $set: {
        'offers.$.checked.httpStatus': status,
        'offers.$.checked.timeRequest': timing.requestTime,
        'offers.$.checked.date': moment().toDate(),
        'offers.$.checked.err': err,
      },
    };
    await Stores.updateOne({ 'offers._id': id }, update).exec();
  } catch (error) {
    logger.warning(`[couponsDealsUpdate] ${error?.message}`, error);
  }
};

/**
 * Crawls products data from a database and performs web scraping on each product's link.
 * @param {number} limit - The number of products to retrieve from the database in each batch. Default is 1.
 * @param {number} offset - The starting index of the products to retrieve from the database. Default is 0.
 * @returns {Promise<void>} - The function performs web scraping and updates the database, but does not return any value.
 */
const crawlerProducts = async (limit = 1, offset = 0) => {
  try {
    const products = await productsData(limit, offset);

    if (products && !IS_CRON_WORKING) {
      const openPages = (await browser?.pages())?.length || 100;
      const timeout =
        openPages < MAX_OPEN_PAGES
          ? generateRandomNumber(WAIT_TIME_SHORT_START, WAIT_TIME_SHORT_END)
          : generateRandomNumber(WAIT_TIME_LONG_START, WAIT_TIME_LONG_END);

      setTimeout(() => {
        crawlerProducts(
          limit,
          openPages < MAX_OPEN_PAGES ? offset + limit : offset
        );
      }, timeout);
    }

    for (const product of products) {
      const results = await crawler(product.link.replace(/\{sessionId\}/gui, 'special-client'), product.id);
      await productsDataUpdate(product._id, results.status, results.timing, results?.err || null);
      console.log(results);
    }
  } catch (err) {
    logger.warning(`[crawlerProducts] ${err?.message}`, err);
    console.log(`${signature} ${err}`);
  }
};

/**
 * Iterates over an array of elements and performs different actions based on the presence of a `redirectUrl` property.
 * If the `redirectUrl` is not present, it updates the `couponsDeals` with a status of 0 and a request time of -1.
 * If the `redirectUrl` is present, it calls the `crawler` function with the `redirectUrl` and the element's ID,
 * and then updates the `couponsDeals` with the results of the `crawler` function.
 *
 * @param {Array} check - An array of objects representing the elements to be checked.
 * Each object should have an `_id` property and a `redirectUrl` property.
 */
const loop = async (check) => {
  await Promise.all(
    check.map((element) => {
      if (!element.redirectUrl) {
        return couponsDealsUpdate(element._id, 0, { requestTime: -1 });
      } else {
        return crawler(
          element.redirectUrl.replace(/\{sessionId\}/gui, 'special-client'),
          element._id
        ).then((results) =>
          couponsDealsUpdate(element._id, results.status, results.timing, results.err || null)
        );
      }
    })
  );
};

/**
 * Crawls and checks coupon deals data.
 * @param {number} limit - The maximum number of coupon deals to retrieve at a time (default is 1).
 * @param {number} offset - The starting index of the coupon deals to retrieve (default is 0).
 * @returns {Promise<void>} - The function performs various checks and updates on the coupon deals data but does not return any specific output.
 */
const crawlerCouponsDeals = async (limit = 1, offset = 0) => {
  try {
    const couponDealsData = await couponsDealsData(limit, offset);
    if (!couponDealsData || IS_CRON_WORKING) return;
    const openPages = (await browser?.pages())?.length || 100;
    const timeout =
      openPages < MAX_OPEN_PAGES
      ? generateRandomNumber(WAIT_TIME_SHORT_START, WAIT_TIME_SHORT_END)
      : generateRandomNumber(WAIT_TIME_LONG_START, WAIT_TIME_LONG_END);
    setTimeout(() => {
      const newOffset = openPages < MAX_OPEN_PAGES ? offset + limit : offset;
      crawlerCouponsDeals(limit, newOffset);
    }, timeout);

    if (couponDealsData.length <= 5) {
      await loop(couponDealsData);
      return;
    }

    const parts = Math.ceil(couponDealsData.length / 5);

    const chunkPromises = Array.from({ length: parts }, async (_, i) => {
      const start = i * 5;
      const end = start + 5;
      return await loop(couponDealsData.slice(start, end));
    });

    await Promise.all(chunkPromises);
  } catch (err) {
    console.log(`${signature} ${err}`);
    logger.warning(`[crawlerCouponsDeals] ${err?.message}`, err);
  }
};

/**
 * Sets the IS_CRON_WORKING flag to true and calls two other functions with initial values for limit and offset parameters.
 * @returns {Promise} A promise that resolves when both functions complete.
 */
const run = async () => {
  IS_CRON_WORKING = true;
  const promises = [crawlerProducts(1, 0), crawlerCouponsDeals(1, 0)];
  return Promise.all(promises);
};

/**
 * Sets the `IS_CRON_WORKING` variable to `false` and calls the `crawlerProducts` and `crawlerCouponsDeals` functions.
 * @returns {Promise} A promise that resolves when both functions have completed.
 */
const test = async () => {
  IS_CRON_WORKING = false;
  const promises = [crawlerProducts(1, 0), crawlerCouponsDeals(1, 0)];
  return Promise.all(promises);
};

if (process.argv[2] === 'start') {
  test();
}

process.on('message', (msg) => {
  switch (msg) {
    case SIGNAL_PING:
      process.send(SIGNAL_PONG);
      process.exit();
      break;
    case SIGNAL_STATUS:
      process.send(IS_CRON_WORKING ? SIGNAL_STATUS_OK : SIGNAL_STATUS_ERROR);
      break;
    case SIGNAL_INIT:
      test();
      break;
    case SIGNAL_KILL:
      process.exit();
      break;
    default:
  }
});

module.exports = {
  crawler,
  run,
  crawlerProducts,
  crawlerCouponsDeals
};
