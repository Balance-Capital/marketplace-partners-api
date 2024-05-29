const moment = require('moment');
const fetch = require('node-fetch');

const { COMMISSION_JUNCTION, EXPORT_TO_API } = require('../constants/partnersName');
const { HEADER_CONTENT_TYPE_JSON } = require('../constants/httpHeader');

const { TALK_TIMEOUT_MINUTES } = Object.freeze({
  TALK_TIMEOUT_MINUTES: 5
});

const {  
  LINK_SEARCH
} = Object.freeze({
  ADVERTISER_LOOKUP: 'advertiser-lookup',
  LINK_SEARCH: 'link-search',
  PUBLISHER_LOOKUP: 'publisher-lookup'
});

const FROM_HOW_MANY_DAYS_GET_OFFERS = 7;

const db = require('../models/index');
const dbApi = require('../models/apiDatabase');
const logger = require('../services/logger');
const configController = require('./ConfigController');
const commissionJunctionOffersResponse = require('../response/CommissionJunctionOffersResponse');
const { commissionJunctionProductsResponse } = require('../response/CommissionJunctionProductsResponse');
const { getData } = require('../utils/commissionJunction');
const saveUnifyCommissionReport = require('../services/unifyCommissionReport');

/**
 * Creates an AbortSignal and sets a timeout to abort the associated AbortController after a specified number of milliseconds.
 * @param {number} ms - The number of milliseconds after which the AbortController should be aborted.
 * @returns {AbortSignal} - The AbortSignal that will be aborted after the specified timeout.
 */
AbortSignal.timeout ??= function timeout(ms) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
};

const partnerTalk = (talk) => {
  try {
    db.models.Config.updateMany(
      { 
        name: COMMISSION_JUNCTION
      },
      {
        $push: {
          partnerTalk: {text:talk}
        }
      }
    ).exec().catch(error=>logger.error(error)).then(() => {
      db.models.Config.updateMany(
        { 
          name: COMMISSION_JUNCTION
        },
        {
          $pull: {
            partnerTalk : { timestamps: {$lte: moment().subtract(TALK_TIMEOUT_MINUTES,'minutes').toDate()}}
          }
        }
      ).exec().catch(error=>logger.error(error));
  
    });
  } catch (error) {
    logger.error(error);
  };
};

const getByParams = async (query, limit = 10, offset = 1) =>
  db.models.CommissionJunctionOffers.find(query)
    .limit(limit)
    .skip(offset)
    .exec();

const getDomain = (url) => {
  try {
    const domain = new URL(url);
    return domain.host.replace('www.', '');
  } catch (err) {
    return null;
  }
};

/**
 * Retrieves offers from a Commission Junction API.
 * @param {Object} params - An object containing the parameters for the API request.
 * @param {string} params.websiteId - The ID of the website.
 * @param {string} params.token - The authentication token.
 * @param {number} params.limit - The maximum number of offers to retrieve.
 * @param {number} params.offset - The offset for pagination.
 * @param {string} params.id - The ID of the request.
 * @param {string} params.offersUrl - The URL of the Commission Junction offers API.
 * @param {boolean} params.isJoined - A flag indicating whether the advertiser is joined or not.
 * @returns {Promise<Array|null>} - An array of offers retrieved from the Commission Junction API, or null if there is no result.
 */
const getOffers = async (params) => {
  partnerTalk('cj: get offers');
  const { websiteId, token, limit, offset, id, offersUrl, isJoined } = params;
  const url = `${offersUrl}?website-id=${websiteId}&advertiser-ids=${isJoined ? 'joined' : 'notjoined'}&records-per-page=${limit}&page-number=${offset}&language=English&targeted-country=US&link-type=Text Link`;
  return getData({ url, token, result: LINK_SEARCH, id }) || null;  
};

/**
 * Retrieves product data from an API.
 * @param {Object} params - An object containing the necessary parameters for retrieving products.
 * @param {string} params.websiteId - The website ID.
 * @param {string} params.companyId - The company ID.
 * @param {string} params.token - The authorization token.
 * @param {number} params.limit - The maximum number of products to retrieve.
 * @param {number} params.offset - The offset for pagination.
 * @param {string} params.productsUrl - The URL of the products API.
 * @param {string} params.currency - The currency for the product prices.
 * @returns {Array} - An array of product objects.
 */
const getProducts = async (params) => {
  partnerTalk('cj: get products');

  const { websiteId, companyId, token, limit, offset, productsUrl, currency } = params;

  const headers = {
    ...HEADER_CONTENT_TYPE_JSON,
    'Authorization': `Bearer ${token}`
  };

  const query = JSON.stringify({
    query: `{
      products(
        companyId: ${companyId},
        offset: ${offset},
        limit: ${limit},
        currency: "${currency}",
        advertiserCountries: "US",
        partnerStatus: JOINED
      ) {
        totalCount,
        count,
        limit,
        resultList {
          adId,
          advertiserName,
          advertiserCountry,
          targetCountry,
          additionalImageLink,
          imageLink,
          brand,
          advertiserId,
          catalogId,
          id,
          title,
          description,
          price { amount, currency },
          salePrice { amount, currency },
          salePriceEffectiveDateStart,
          salePriceEffectiveDateEnd,
          link,
          mobileLink,
          linkCode(pid: "${websiteId}") { clickUrl }
        }
      }
    }`.replace(/\s+|\n+/gui, '')
  });

  const data = await fetch(productsUrl, {
    method: 'POST',
    headers,
    body: query,
    signal: AbortSignal.timeout(15000)
  });

  const response = data.ok ? await data.json() : null;

  return response?.data?.products;
};

/**
 * Saves a collection of offers to the database.
 * @param {Array} collection - An array of offer objects.
 * @returns {Promise<boolean>} - A promise that resolves to a boolean value indicating whether the offers were successfully saved to the database.
 */
const saveOffers = async (collection) => {
  try {
    partnerTalk(`cj: save offers: ${collection.length}`);
    
    const documents = collection.map((item) => {
      const promotionEndDate = item['promotion-end-date'][0] ? moment(item['promotion-end-date'][0]).toISOString() : moment().add(30, 'days').startOf('day').toISOString();
      const promotionStartDate = item['promotion-start-date'][0] ? moment(item['promotion-start-date'][0]).toISOString() : moment().startOf('day').toISOString();
      const domains = item.destination[0] ? getDomain(item.destination[0]) : [];

      return {
        advertiserId: parseFloat(item['advertiser-id'][0]) || null,
        advertiserName: item['advertiser-name'][0] || null,
        category: item.category || null,
        clickCommission: item['click-commission'][0] || null,
        creativeHeight: item['creative-height'][0] || null,
        creativeWidth: item['creative-width'][0] || null,
        language: item.language || null,
        leadCommission: item['lead-commission'][0] || null,
        linkCodeHtml: item['link-code-html'][0] || null,
        linkCodeJavascript: item['link-code-javascript'][0] || null,
        description: item.description[0] || null,
        destination: item.destination[0] || null,
        linkId: item['link-id'][0] || null,
        linkName: item['link-name'][0] || null,
        linkType: item['link-type'][0] || null,
        performanceIncentive: item['performance-incentive'][0] || null,
        promotionEndDate,
        promotionStartDate,
        promotionType: item['promotion-type'][0] || null,
        couponCode: item['coupon-code'][0] || null,
        relationshipStatus: item['relationship-status'][0] || null,
        saleCommission: item['sale-commission'][0] || null,
        sevenDayEpc: parseFloat(item['seven-day-epc'][0]) || null,
        threeMonthEpc: parseFloat(item['three-month-epc'][0]) || null,
        domains,
        dateAdded: moment().toISOString(),
        clickUrl: item['clickUrl'] && item['clickUrl'][0] || null,
        countryCode: item['targeted-countries'][0] || null
      };
    });

    return await db.models.CommissionJunctionOffers
      .insertMany(documents, { ordered: false, upsert: true })
      .then(() => true)
      .catch((err) => {throw new Error(err?.message)});
  
  } catch (err) {
    console.log(err);
    return false;
  }
};

/**
 * Saves a collection of products to the database.
 * @param {Array} collection - An array of product objects to be saved to the database.
 * @returns {Promise} - A promise that resolves to true if the products are saved successfully, and false if there is an error during the insertion process.
 */
const saveProducts = async (collection) => {
  try {
    partnerTalk(`cj: save products: ${collection.length}`);
    
    const documents = collection.map((item) => {
      const { adId, advertiserName, advertiserCountry, targetCountry, additionalImageLink, imageLink, brand, advertiserId, catalogId, id, title, description, price, salePrice, salePriceEffectiveDateStart, salePriceEffectiveDateEnd, link, mobileLink, linkCode } = item;
      
      return {
        adId,
        advertiserName,
        advertiserCountry,
        targetCountry,
        additionalImageLink,
        imageLink,
        brand,
        advertiserId,
        catalogId,
        id,
        title,
        description,
        price: { ...price },
        salePrice: { ...salePrice },
        salePriceEffectiveDateStart,
        salePriceEffectiveDateEnd,
        link,
        mobileLink,
        linkCode: linkCode.clickUrl
      };
    });
    
    return await db.models.CommissionJunctionProducts
      .insertMany(documents, { ordered: false, upsert: true })
      .then(() => true)
      .catch((err) => {throw new Error(err?.message)});

  } catch (error) {
    return false;
  }
};

const closeDB = async () => {
  db.mongoose.close();
};

/**
 * Prepares a list of offers to be exported.
 * Filters the offers based on certain criteria, sorts them, and limits the number of offers returned.
 * Also checks if the offers already exist in a database and excludes them from the final list.
 * 
 * @param {number} limit - The maximum number of offers to be returned.
 * @param {number} offset - The number of offers to skip before starting to return the offers.
 * @returns {Promise<Array>} - An array of offers that meet the filtering criteria and are not already existing in the database.
 */
const prepareToExportOffers = async (limit, offset) => {
  const params = {
    $or: [
      { description: { $exists: true, $ne: null } },
      { linkName: { $exists: true, $ne: null } }
    ],
    exported: {$exists: false},
    dateAdded: { $gt: moment().subtract(FROM_HOW_MANY_DAYS_GET_OFFERS, 'days').startOf('day').toDate() },
    language: { $regex: /english/i }
  };

    // linkType: 'Banner',
    // promotion-type: 'Product'
    // promotionStartDate: { $ne: null },
    // promotionEndDate: { $gt: moment().toDate() }

  const sort = { updatedAt: -1 };

  const offers = await db.models.CommissionJunctionOffers.find(params)
    .collation({ locale: 'en', strength: 2 })
    .sort(sort)
    .limit(limit)
    .skip(offset)
    .exec();

  const checkId = offers.map((item) => item.linkId);

  const stores = dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema);
  const existsOffersId = await stores
    .find({ 'offers.partnerSource': COMMISSION_JUNCTION, 'offers.originId': { $in: checkId } }, { _id: 1, 'offers.$': 1 })
    .exec();

  const notAllowId = existsOffersId.map((store) => store.offers.map((offer) => offer.originId)).flat();

  const collections = offers.filter((item) => !notAllowId.includes(item.linkId));

  partnerTalk(`cj: prepare offers to export: ${collections.length}`);

  const updateOffers = collections.map((item) => item.linkId).flat();

  if (collections.length > 0) {
    const offersResponse = await commissionJunctionOffersResponse(collections);
    await db.models.CommissionJunctionOffers
      .updateMany({linkId: {$in: updateOffers}}, {$set: { exported: moment().toISOString()}})
      .exec();
    return offersResponse;
  } else {
    return [];
  }
};

/**
 * Retrieves a collection of products from the database that meet certain criteria,
 * filters out any products that have already been imported, updates the exported status
 * of the selected products, and returns the filtered collection along with the number
 * of products processed.
 *
 * @param {number} limit - The maximum number of products to retrieve from the database.
 * @param {number} offset - The number of products to skip before retrieving the next batch.
 * @returns {Promise<{results: Array, offset: number}>} - The generated response containing the filtered products and the number of products processed.
 */
const prepareToExportProducts = async (limit, offset) => {
  const params = {
    $or: [
      { description: { $exists: true, $ne: null } },
      { imageLink: { $ne: null } }
    ],
    exported: { $exists: false }
  };

  const sort = { updatedAt: -1 };

  const collections = await db.models.CommissionJunctionProducts.find(params)
    .collation({ locale: 'en', strength: 2 })
    .sort(sort)
    .limit(limit)
    .skip(offset)
    .exec();

  partnerTalk(`cj: prepare offers to export: ${collections.length}`);

  const importIds = collections.map((item) => item.id);

  const products = await dbApi.apiDatabase.model('products', dbApi.models.Products.schema)
    .find({ importedId: { $in: importIds } }, { importedId: 1 })
    .then((result) => {
      const tabResult = result.map((item) => item.importedId);
      return collections.filter((item) => !tabResult.includes(item.id));
    });

  if (products.length > 0) {
    const resultsOfCollection = await commissionJunctionProductsResponse(products);
    await db.models.CommissionJunctionProducts.updateMany(
      { id: { $in: importIds } },
      { $set: { exported: moment().toISOString() } }
    ).exec();
    return { results: resultsOfCollection, offset: products.length };
  } else {
    return { results: [], offset: products.length };
  }
};

const cleanUpDatabase = () => {
  const filter = {
    promotionEndDate: {
      $lt: moment().startOf('day').toDate()
    }
  };
  db.models.CommissionJunctionOffers.deleteMany(filter).exec().then(() => {
    partnerTalk('finish delete old offers');
  });
};

/**
 * Retrieves commission reports from a partner API.
 * @param {Object} params - An object containing the following properties:
 *   - salesReportUrl (string): The URL of the partner API endpoint for retrieving commission reports.
 *   - token (string): The authentication token required to access the API.
 * @returns {Promise<Object|null>} - The commission report response from the partner API, or null if there was an error or the salesReportUrl was not provided.
 */
const getCommissionReport = async (params) => {
  try {
    const url = params.salesReportUrl || null;
    if (!url) return null;

    const sinceTime = moment().startOf('day').subtract(30, 'days').toISOString();
    const beforeTime = moment().startOf('day').toISOString();
    const bodyAsk = `{ 
      publisherCommissions(
        forPublishers: ["${params.requestorCid}"], 
        sincePostingDate:"${sinceTime}",
        beforePostingDate:"${beforeTime}") {
          count payloadComplete records {
            actionTrackerName websiteName advertiserName postingDate pubCommissionAmountUsd items { 
              quantity perItemSaleAmountPubCurrency totalCommissionPubCurrency 
            }
          }
        }
      }`;

    const urlApi = `${url}`;
    const headers = { 'Authorization': `Bearer ${params.token}` };

    const response = await fetch(urlApi, {
      method: 'POST',
      headers,
      body: bodyAsk
    });

    if (!response) {
      logger.warning(`[CommissionJunctionController] no response from partner ${data?.errors}`, data);
      return null;
    }
    
    const data = await response.json();

    return data;
  } catch (err) {
    logger.warning(`[CommissionJunctionController] getCommissionReport ${err?.message}`, err, salesReportUrl, startDate);
    return null;
  }
};

const prepeareAndSaveUnifyReport = async () => {
    const commission = await Promise.all( response?.commissions?.map((item) => saveUnifyCommissionReport({
      ...item, 
      transactionDetails: {
        ...item.transaction_details,
        publisherAmountString: encrypt(`${item.transaction_details?.basket?.publisher_amount || 0}`)
      },
      customId: item.click_details.custom_id?.split(':')[0] || null,
      referralId: item.click_details.custom_id?.split(':')[1] || null,
      date: item.click_details.date,
      dataSource: COMMISSION_JUNCTION,
      commissionId: item.commission_id
    })));
    return commission || [];
}

/**
 * Executes a series of tasks related to the Commission Junction partner.
 * Retrieves configuration data, checks if the service is running, and performs actions such as getting commission reports,
 * retrieving offers and products, and saving them to the database.
 * @param {Array} skip - An array of strings indicating which tasks to skip. Possible values are 'offers' and 'products'.
 * @returns {Promise<void>}
 */
const run = async (skip = []) => {
  const SKIP_OFFERS = 'offers';
  const SKIP_PRODUCTS = 'products';
  const SKIP_REPORT = 'report';

  partnerTalk('cj: start service');

  const items = await configController.getByParams({
    name: COMMISSION_JUNCTION
  });

  const {
    _id,
    offersLimit,
    offersOffset,
    countryCode,
    otherParams,
    running,
    partnerUrlToOffer
  } = items[0];

  if (running) return;
  await configController.update({ _id }, { running: true });

  const offersParams = {
    token: otherParams[0].token,
    websiteId: otherParams[0].websiteId,
    requestorCid: otherParams[0].requestorCid,
    getPublisherLookupUrl: otherParams[0].getPublisherLookupUrl,
    getAdvertisersUrl: otherParams[0].getAdvertisersUrl,
    getLinksUrl: otherParams[0].getLinksUrl,
    getProductsUrl: otherParams[0].getProductsUrl,
    limit: offersLimit,
    offset: offersOffset,
    productLimit: otherParams[0].productLimit,
    productOffset: otherParams[0].productOffset,
    countryCode,
    id: _id,
    offersUrl: partnerUrlToOffer,
    isJoined: true,
    salesReportUrl: otherParams[0].salesReportUrl
  };

  if (!skip.includes(SKIP_REPORT)) {
    skip.push(SKIP_REPORT)
    await getCommissionReport(offersParams);
  }

  let offers = null;
  if (!skip.includes(SKIP_OFFERS)) {
    offers = await getOffers(offersParams);
  }

  let products = null;
  if (!skip.includes(SKIP_PRODUCTS)) {
    products = await getProducts({
      companyId: offersParams.requestorCid,
      currency: 'USD',
      productsUrl: offersParams.getProductsUrl,
      token: offersParams.token,
      limit: offersParams.productLimit,
      offset: offersParams.productOffset,
      websiteId: offersParams.websiteId
    });
  }

  if (!offers || (offers && +offers[0]['$']['records-returned'] === 0)) {
    if(!skip.includes(SKIP_OFFERS)) 
      skip.push(SKIP_OFFERS);
  }

  if (!products || (products?.resultList && products?.resultList.length === 0)) {
    if(!skip.includes(SKIP_PRODUCTS)) 
      skip.push(SKIP_PRODUCTS);
  }

  if (skip.includes(SKIP_OFFERS) && skip.includes(SKIP_PRODUCTS)) {
    // cleanUpDatabase();
    await configController.update({ _id }, { running: false, offersOffset: 1 });
    await db.models.Config.updateOne(
      {
        name: EXPORT_TO_API,
        'otherParams.apiName': COMMISSION_JUNCTION
      },
      {
        running: false,
        'otherParams.$.offset': 0
      }
    ).exec();
    return;
  }

  if (products && products?.resultList?.length > 0) {
    await saveProducts(products.resultList);
  }

  if (offers && offers[0]?.link) {
    await saveOffers(offers[0]?.link);
  }

  await configController.update(
    { _id },
    {
      offersOffset: offers && offers[0]?.link ? offersOffset+1 : offersOffset,
      running: false,
      $set: {
        'otherParams.$[].productOffset': offersParams.productOffset + offersParams.productLimit
      }
    }
  );
  return run(skip);
};

module.exports = {
  run,
  getByParams,
  prepareToExportOffers,
  prepareToExportProducts,
  closeDB,
  getCommissionReport
}