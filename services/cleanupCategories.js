const dbApi = require('../models/apiDatabase');
const logger = require('./logger');

/**
 * Removes null values from the `categories` array of each item in the `Stores` collection in the database.
 * @returns {Promise<void>} A promise that resolves when the cleanup is complete.
 */
const cleanupNullCategories = async () => {
  try {
    const storesModel = dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema);
    // Find all documents where the `categories` field is null
    const stores = await storesModel.find({ categories: null }).exec();

    const bulkUpdate = []

    for(const store of stores) {
      const categories = store.categories.filter((value) => value !== null);
      const updateOperation = {
        updateOne: {
          filter: { '_id': store._id },
          update: { $set: { 'categories': categories } },
        },
      };
      bulkUpdate.push(updateOperation);
    };

    await storesModel.bulkWrite(bulkUpdate);

    console.log('Cleanup complete');
  } catch (error) {
    logger.warning(`[cleanupCategories] cleanupNullCategories ${error?.message}`, error)
    console.error('Cleanup failed:', error);
  }
};

if(process.argv[2] === 'start') {
  cleanupNullCategories().then(()=>process.exit());
};

module.exports = {
  cleanupNullCategories
};
