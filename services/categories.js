const fs = require('fs');
const dbApi = require('../models/apiDatabase');
const logger = require('./logger');
const exportFile = 'resources/private/exportCategories.csv';

/**
 * Performs a bulk insert operation on a MongoDB database.
 * Retrieves a list of stores from the database, extracts the categories from each store,
 * and creates an insert operation for each category. Finally, it uses the `bulkWrite` method
 * to insert all the categories into the database.
 */
const makeCategories = async () => {
  try {
    const storesModel = dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema);
    const productsModel = dbApi.apiDatabase.model('Products', dbApi.models.Products.schema);
    const categoriesModel = dbApi.apiDatabase.model('Categories', dbApi.models.Categories.schema);

    const stores = await storesModel.find({}, { categories: 1 }).exec();
    const products = await productsModel.find({}, { categories: 1 }).exec();

    const existingCategories = await categoriesModel.distinct('name');

    const bulkInsert = [];

    for (const store of stores) {
      const categories = store.categories;
      for (const category of categories) {
        if (existingCategories.includes(category)) continue;

        bulkInsert.push({
          insertOne: {
            document: { name: category },
          },
        });

        existingCategories.push(category);
      }
    }

    for (const product of products) {
      const categories = product.categories;
      for (const category of categories) {
        if (existingCategories.includes(category)) continue;

        bulkInsert.push({
          insertOne: {
            document: { name: category },
          },
        });

        existingCategories.push(category);
      }
    }

    await categoriesModel.bulkWrite(bulkInsert);
  } catch (error) {
    logger.warning(`[Categories] makeCategories ${error?.message}`, error);
  }
};

/**
 * Exports the distinct categories from the "Categories" model and saves them in a CSV file.
 * @returns {Promise<Array<string>>} - An array of distinct category names.
 */
const exportCategories = async () => {
  try {
    // Retrieve the "Categories" model from the database
    const categoriesModel = dbApi.apiDatabase.model('Categories', dbApi.models.Categories.schema);

    // Retrieve all distinct category names from the "Categories" model
    const categories = await categoriesModel.distinct('name');

    // Join the category names with a semicolon delimiter
    const exportSave = categories.join(';');

    // Write the joined category names to a CSV file
    fs.writeFileSync(exportFile, exportSave);

    return categories;
  } catch (error) {
    logger.warning(`[Categories] exportCategories ${error?.message}`, error);
  }
};

module.exports = {
    makeCategories,
    exportCategories
};

if(process.argv[2] === 'start') {
    makeCategories().then(()=>process.exit());
};

if(process.argv[2] === 'export') {
  exportCategories().then((exp)=>{ console.log(exp); process.exit()});
};

