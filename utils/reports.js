/* eslint-disable no-underscore-dangle */
const moment = require('moment');

const dbApi = require('../models/apiDatabase');
// const logger = require('../services/logger');

const groupBy = require('./groupBy');

const storeAndOffersSnapshot = async () => {
  // const reportName = 'storeAndOffersSnapshot';

  const stores = await dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).find({},{offers:1, _id:1, isActive: 1, domain:1}).exec();

  const allStores = stores?.length;

  const allActiveStores = stores.filter((item) => item?.isActive === true).length;

  const allOffers = stores
    .map((ele) => ele.offers.length)
    .reduce((a, b) => a + b, 0);

  const onlyOffers = stores.map((store) => store.offers).flat();
  const offersBySource = groupBy(onlyOffers, 'partnerSource');
  const offersByCountry = groupBy(onlyOffers, 'countryCode');
  const groupBySource = Object.keys(offersBySource).map((item) => ({name: item, length: offersBySource[item].length}));
  const groupByCountry = Object.keys(offersByCountry).map((item) => ({name: item, length: offersByCountry[item].length}));
  
  const storesByDomain = groupBy(stores, 'domain');
  const groupByDomain = Object.keys(storesByDomain).map((item) => ({name: item, length: storesByDomain[item].length}));
  const duplicateStore = groupByDomain.filter((item) => item.length > 1);

  const validOffers = stores.map((ele) => ele.offers.filter((offer) => !!( moment(offer.startDate).isBefore(moment().startOf('day')) && 
  moment(offer.validDate).isAfter(moment().startOf('day')) )))
    .map((item) => item?.length || 0)
    .reduce((a, b) => a + b, 0);
  
  const checkedOffers = stores
    .map((ele) => ele.offers.filter((item) => item?.checked?.httpStatus === 200))
    .map((ele) => ele?.length || 0)
    .reduce((a, b) => a + b, 0);

  const expiredOffers = allOffers - validOffers;

  let siteMapOffers = await dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).getAllOffersForSiteMap();
  const siteMapStores = siteMapOffers.length;
  siteMapOffers = siteMapOffers
    ?.map((ele) => ele.offers.length)
    ?.reduce((a, b) => a + b, 0) || 0;

  const storesWithoutLogo = await dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).find({
    logo: /default/gui 
  }).count().exec();

  const storesWithoutDescription = await dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).find({
    $or: [
      {description: null},{description: ''}
    ]
  }).count().exec();

  const storesWithoutFaq = await dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).find({
    faq: [] 
  }).count().exec();

  const storesWithoutCommission = await dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).find({
    averageCommissionRate: null 
  }).count().exec();

  const storesWithoutCategories = await dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).find({
    categories: []
  }).count().exec();

  const allRawProducts = await dbApi.apiDatabase.model('Products', dbApi.models.Products.schema).find().exec();
  const allProducts = allRawProducts.length;
  const checkedProducts = allRawProducts.filter((item) => item?.checked?.httpStatus === 200).length;

  const report = {
    allProducts,
    checkedProducts,
    groupBySource,
    allStores,
    allActiveStores,
    allOffers,
    validOffers,
    expiredOffers,
    siteMapOffers,
    siteMapStores,
    storesWithoutLogo,
    storesWithoutDescription,
    storesWithoutFaq,
    storesWithoutCommission,
    storesWithoutCategories,
    checkedOffers,
    groupByCountry,
    duplicateStore
  };
  
  return dbApi.apiDatabase.model('DashBoard', dbApi.models.DashBoard.schema).findOne({
    $and: [
      { createdAt: { $gte: moment().startOf('day') } },
      { createdAt: { $lte: moment().endOf('day') } }
    ]
  })
    .exec()
    .then((dashboard) => {
      if (!dashboard) {
        return dbApi.apiDatabase.model('DashBoard', dbApi.models.DashBoard.schema).insertMany([{...report}]);
      };
      return dbApi.apiDatabase.model('DashBoard', dbApi.models.DashBoard.schema).updateOne({_id: dashboard._id}, {
          ...report
      }).exec();
    });
};

const storeAndOffersSnapshotPromise = () =>
  new Promise((resolve, reject) => {
    try {
      storeAndOffersSnapshot().then((result) => resolve(result));
    } catch (error) {
      reject(error);
    }
  });

if(process.argv[2] === 'start') {
  storeAndOffersSnapshot().then(() => process.exit());
};
  
module.exports = {
  storeAndOffersSnapshot,
  storeAndOffersSnapshotPromise
};
