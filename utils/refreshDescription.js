/* eslint-disable no-underscore-dangle */
const logger = require('../services/logger');

const dbApi = require("../models/apiDatabase");
const { makeDescriptionAI } = require('./makeDescription');

/**
 * Updates the description of offers in a database.
 * It retrieves stores with non-empty offers, sorts them, and retrieves the first store.
 * Then, for each offer in the store, it generates a new description using the `makeDescriptionAI` function
 * and updates the offer's description in the database. Finally, it saves the changes to the database.
 *
 * @param {boolean} [log=false] - A boolean flag indicating whether to log the description changes.
 * @returns {Promise<void>} - A promise that resolves when the descriptions are updated in the database.
 */
const offersRefreshDescriptionAI = async (log = false) => {
  try {
    const StoresModel = dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema);
    const stores = await StoresModel.find({ offers: { $ne: [] }, 'offers.checked.httpStatus': 200 }, { offers: 1, description:1 })
      .sort({ 'offers._id': 1, name: 1 })
      .limit(1)
      .skip(0)
      .exec();

    const bulkOperations = [];

    for (const store of stores) {
      for (const offer of store.offers) {
        const description = await makeDescriptionAI(offer.description, store.description || offer.description || ' ');

        if (log) {
          console.log(`${description} : ${store.description} -> ${offer.description}`);
        }

        if (description) {
          const updateOperation = {
            updateOne: {
              filter: { 'offers._id': offer._id },
              update: { $set: { 'offers.$.description': description } },
            },
          };
          bulkOperations.push(updateOperation);
        }
      }
    }

    await StoresModel.bulkWrite(bulkOperations);
  } catch (err) {
    logger.warning(`[refreshDescription] offersRefreshDescriptionAI method ${err?.message}`, err);
  }
};

const productsRefreshDescriptionAI = async (log = false, limit=10, offset=0) => {
  try {
    const ProductModel = dbApi.apiDatabase.model('Products', dbApi.models.Products.schema);
    const products = await ProductModel.find({ 'checked.httpStatus': 200 }, { _id:1, title: 1, description:1 })
      .sort({ advertiserName: 1 })
      .limit(limit)
      .skip(offset)
      .exec();
    
    if(products?.length === 0) return;

    const bulkOperations = [];

    for (const product of products) {
      const description = await makeDescriptionAI(product.description);

      if (log) {
        console.log(`${description} : ${product.description}`);
      }

      if (description) {
        const updateOperation = {
          updateOne: {
            filter: { '_id': product._id },
            update: { $set: { 'description': description } },
          },
        };
        bulkOperations.push(updateOperation);
      }
    };
    await ProductModel.bulkWrite(bulkOperations);
    return await productsRefreshDescriptionAI(log, limit, offset+=limit);
  } catch (err) {
    logger.warning(`[refreshDescription] productsRefreshDescriptionAI method ${err?.message}`, err);
  }
};

module.exports = {
  productsRefreshDescriptionAI,
  offersRefreshDescriptionAI
}