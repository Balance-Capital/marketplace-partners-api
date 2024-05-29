/* eslint-disable no-underscore-dangle */
const logger = require('../services/logger');

const dbApi = require("../models/apiDatabase");
const { findTitle, makeTitleAI } = require('./makeTitle');
const { getRangeRnd } = require('./math');
const sleep = require('../utils/sleep');

const refreshTitle = (log = false) => {
    dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).find({ offers : { $ne : [] } }, { offers: 1}).exec().then( async (stores) => { 
        // eslint-disable-next-line array-callback-return
        for (let storeIndex=0; storeIndex < stores.length; storeIndex += 1) {
            for (let offerIndex=0; offerIndex < stores[storeIndex].offers.length; offerIndex += 1) {
                // eslint-disable-next-line no-await-in-loop
                const title = await findTitle(
                    stores[storeIndex].offers[offerIndex].value, 
                    stores[storeIndex].offers[offerIndex].currency, 
                    stores[storeIndex].offers[offerIndex].title,
                    stores[storeIndex]
                );
                if(log) {
                    // eslint-disable-next-line no-console
                    console.log(title, ':' ,stores[storeIndex].offers[offerIndex].shortTitle);
                    // eslint-disable-next-line no-console
                    console.log(`store index: ${storeIndex}`, `offer index: ${offerIndex}`);    
                }
                dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).findOneAndUpdate(
                    { 'offers._id': stores[storeIndex].offers[offerIndex]._id },
                    { 
                        $set: {
                            'offers.$.shortTitle': title
                        }
                    }).exec().catch(err => logger.error(err));
            }
        }
    });
};

/**
 * Updates the titles of offers in a database.
 * Retrieves a batch of stores with non-empty offers from the database,
 * generates new titles for the offers using the `makeTitleAI` function,
 * and updates the titles in the database using bulk write operations.
 * 
 * @param {boolean} log - A boolean indicating whether to log the updated titles. Default is `false`.
 * @param {number} limit - The maximum number of stores to retrieve per batch. Default is `10`.
 * @param {number} offset - The number of stores to skip before starting to retrieve. Default is `0`.
 * @returns {Promise<void>} - A promise that resolves when the titles are updated in the database.
 */
const refreshOffersTitleAI = async (log = false, limit = 10, offset = 0) => {
  try {
    const storesModel = dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema);
    const stores = await storesModel.find({ offers: { $ne: [] },  'offers.checked.httpStatus': 200, country: 'US' }, { offers: 1 })
      .sort({ name: 1 })
      .limit(limit)
      .skip(offset)
      .exec();

    if (stores.length === 0) return;

    const bulkOperations = [];

    for (const store of stores) {
      for (const offer of store.offers) {
        const rateLimitTime = getRangeRnd(1, 2);
        await sleep(rateLimitTime);
        const title = await makeTitleAI(offer.title, offer.description);
        if (log) {
          console.log(`Offset: ${offset} -> ${title} : ${offer.title}`);
        }
        if (title) {
          const updateOperation = {
            updateOne: {
              filter: { 'offers._id': offer._id },
              update: { $set: { 'offers.$.title': title } }
            }
          };
          bulkOperations.push(updateOperation);
        }
      }
    }

    await storesModel.bulkWrite(bulkOperations);
    return await refreshOffersTitleAI(log, limit, offset + limit);
  } catch (err) {
    logger.warning(`[refreshTitle] refreshOffersTitleAI method ${err?.message}, last offset: ${offset}, limit: ${limit}`, err);
  }
};

/**
 * Updates the titles of products in a database.
 * Retrieves a batch of products from the database, generates new titles for each product using an AI algorithm,
 * and updates the titles in the database. Includes an optional logging feature to print the old and new titles to the console.
 * 
 * @param {boolean} log - A boolean indicating whether to enable logging. Default is false.
 * @param {number} limit - The maximum number of products to process in each batch. Default is 10.
 * @param {number} offset - The starting offset for retrieving products from the database. Default is 0.
 * @returns {Promise<void>} - A promise that resolves when the titles of products are updated in the database.
 */
const refreshProductsTitleAI = async (log = false, limit = 10, offset = 0) => {
  try {
    const ProductsModel = dbApi.apiDatabase.model('Products', dbApi.models.Products.schema);
    const products = await ProductsModel.find({ 'checked.httpStatus': 200, advertiserCountry: 'US' }, { _id: 1, title: 1, description: 1 })
      .sort({ 'updatedAt': 1 })
      .limit(limit)
      .skip(offset)
      .exec();

    if (products.length === 0) return;

    const bulkOperations = [];

    for (const product of products) {
      const rateLimitTime = getRangeRnd(1, 2);
      await sleep(rateLimitTime);
      const title = await makeTitleAI(product.title, product.description);
      if (log) {
        console.log('Offset:', offset, '->', 'New Title:', title, 'Old Title:', product.title);
      }

      if (title) {
        const updateOperation = {
          updateOne: {
            filter: { '_id': product._id },
            update: { $set: { 'title': title } }
          }
        };
        bulkOperations.push(updateOperation);
      }
    }

    await ProductsModel.bulkWrite(bulkOperations);
    return await refreshProductsTitleAI(log, limit, offset + limit);
  } catch (err) {
    logger.warning(`[refreshTitle] refreshProductsTitleAI method ${err?.message}, last offset: ${offset}, limit: ${limit}`, err);
  }
};

module.exports = {
    refreshTitle, 
    refreshOffersTitleAI,
    refreshProductsTitleAI
}