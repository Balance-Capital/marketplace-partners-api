/* eslint-disable no-underscore-dangle */
const moment = require('moment');

const dbApi = require('../models/apiDatabase');
// const logger = require('../services/logger');

const groupBy = require('./groupBy');

const reportProducts = async () => {
  // const reportName = 'storeAndOffersSnapshot';
  const startTime = moment().toDate();

  const products = await dbApi.apiDatabase.model('Products', dbApi.models.Products.schema)
    .find({},{
      partnerSource:1,
      advertiserCountry:1,
      checked:1,
      price:1,
      salePrice:1,
      categories:1
    })
    .exec();

  const allProducts = products?.length;

  const productsBySource = groupBy(products, 'partnerSource');
  const productsByCountry = groupBy(products, 'advertiserCountry');
  const HttpStatus = products.map((item) => ({httpStatus: item.checked.httpStatus}));
  const productsByHttpStatus = groupBy(HttpStatus, 'httpStatus');
  const groupByHttpStatus = Object.keys(productsByHttpStatus).map((item) => ({name: item, length: productsByHttpStatus[item].length}));
  const groupBySource = Object.keys(productsBySource).map((item) => ({name: item, length: productsBySource[item].length}));
  const groupByCountry = Object.keys(productsByCountry).map((item) => ({name: item, length: productsByCountry[item].length}));
  
  const productsWithoutCategories = products.filter((item) => item.categories.length === 0)?.length || null;

  const productsWithPromotion = products.filter((item) => parseInt(item?.price?.amount, 10)  > parseInt(item?.salePrice?.amount, 10))?.length || null;

  const checkedProducts = products.filter((item) => item?.checked?.httpStatus === 200).length;

  const report = {
    allProducts,
    checkedProducts,
    groupBySource,
    groupByCountry,
    groupByHttpStatus,
    productsWithoutCategories,
    productsWithPromotion,
    timeWorking: `${moment().diff(startTime)/1000} sec.`
  };

  return report;
};

const reportProductsPromise = () =>
  new Promise((resolve, reject) => {
    try {
      reportProducts().then((result) => resolve(result));
    } catch (error) {
      reject(error);
    }
  });

if(process.argv[2] === 'start') {
  reportProductsPromise().then((result) => { console.log(result); process.exit() });
};
  
module.exports = {
  reportProductsPromise
};
