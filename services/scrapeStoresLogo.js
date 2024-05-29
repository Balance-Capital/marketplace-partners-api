/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-console */
require('dotenv').config();
const fs = require('fs');
const puppeteer = require('puppeteer');
const moment = require('moment');

const logger = require('./logger');
const dbApi = require('../models/apiDatabase');

const pidFile = 'resources/private/scraperStoresLogo.pid';

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

const TEST = false;

const options = {
  args,
  defaultViewport: {
    height: 980,
    width: 1580
  },
  headless: !TEST,
  executablePath: TEST ? process.env.CHROMIUM_PATH || null : null,
  devtools: !TEST,
  ignoreHTTPSErrors: true,
  userDataDir: './tmp'
};

let browser = null;

const MAX_LOOPS = 5;

(async () => {
  console.log(`start browser`);
  browser = await puppeteer.launch(options);
  fs.writeFileSync(pidFile, process.pid.toString());
})();

const extractLogoInfoFromSourceCode = (htmlSource) => {
  const parser = new DOMParser();
  const parsedHtml = parser.parseFromString(htmlSource, 'text/html');
  // Extracting logo information from meta tags
  const metaLogo = parsedHtml.querySelector('meta[property="og:image"]');
  const metaLogoUrl = metaLogo ? metaLogo.getAttribute('content') : '';
  // Extracting logo information from ld+json
  const ldJsonScript = parsedHtml.querySelector(
    'script[type="application/ld+json"]'
  );
  const ldJsonData = ldJsonScript ? JSON.parse(ldJsonScript.textContent) : {};
  const ldJsonLogoUrl = ldJsonData.logo ? ldJsonData.logo : '';
  return { metaLogoUrl, ldJsonLogoUrl };
}

const crawler = async (url) => {
  let page = null;
  try {
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
      }
    });
    
    const response = (await Promise.all([page.waitForNavigation(),page.goto(url)]))[1];

    const timing = response.timing();
    const status = response.status();
    const chain = response.request().redirectChain();

    if(status !== 200) throw new Error('[scraperStoresLogo] Http ststus <> 200');

    const htmlSource = await page.evaluate(() => document.documentElement.outerHTML);
    const logo = extractLogoInfoFromSourceCode(htmlSource);

    const log = {
      chain,
      status,
      timing: { requestTime: timing.requestTime },
      url,
      logo
    };

    await page.close();
    return log;
  } catch (err) {
    if (page) await page.close();
    return {
      logo: null,
      chain: [],
      status: 0,
      timing: {
        requestTime: 0
      },
      url
    };
  }
};

const scraperStoresLogo = async (limit = 10, offset = 0) => {
  try {
    const storesModel = dbApi.apiDatabase.model(
      'Stores',
      dbApi.models.Stores.schema
    );

    const stores = await storesModel
      .find(
        {domain: { $ne: null }, isActive: true, offers: [], logo: new RegExp(".*default.*", "gui")},
        { _id: 1, domain: 1, logo: 1 }
      )
      .sort({ domain: 1 })
      .limit(limit)
      .skip(offset)
      .exec();

    const bulkUpdate = [];
    let index = 0;
    for (const store of stores) {
      index++;
      const response = await crawler(`http://${store.domain}`);
      const { logo } = response;

      if (!logo) {
        continue;
      }

      try {
        const request = {
          idTask: taskId,
          context: ' ',
          ask: description
        };

        let aiResponse = null;

        for (let loops = 1; loops <= MAX_LOOPS; loops++) {
          const { data } = await client.runTask(request);

          if (data?.categories) {
            aiResponse = data.categories.reduce((unique, item) => {
              return unique.includes(item) ? unique : [...unique, item];
            }, []);
            break;
          }
        }

        if (!aiResponse) {
          continue;
        }

        const updateStoreCategories = {
          updateOne: {
            filter: { _id: store._id },
            update: { $set: { categories: aiResponse } }
          }
        };
        console.log(
          index,
          'store',
          store.domain,
          description,
          store.categories,
          aiResponse
        );
        const updateOffersCategories = [];
        for (const offer of store.offers) {
          console.log('offer', offer.categories, aiResponse);
          const offersCategories = {
            updateOne: {
              filter: { 'offers._id': offer._id },
              update: { $set: { 'offers.$.categories': aiResponse } }
            }
          };
          updateOffersCategories.push(offersCategories);
        }

        bulkUpdate.push(updateStoreCategories, ...updateOffersCategories);
      } catch (err) {
        console.log(err);
        logger.warning(`[responseAIBroker] AI ${err?.message}`, err);
      }
    }
    if (bulkUpdate.length > 0) await storesModel.bulkWrite(bulkUpdate);
  } catch (err) {
    console.log(err);
    logger.warning(`[makeCategories] makeCategoriesAI ${err?.message}`, err);
  }
};

module.exports = scraperStoresLogo;

const start = async () => {
  const limit = 10;
  for (let indx = 0; indx < 1; indx += limit) {
    console.log('index', indx);
    await scraperStoresLogo(limit, indx).then(() => console.log('Finish'));
    // .finally(() => process.exit());
  }
  process.exit();
};
if (process.argv[2] === 'start') {
  start();
}
