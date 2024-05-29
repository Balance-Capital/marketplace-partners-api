require('dotenv').config();

const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const DashBoard= new Schema(
  {
    allStores: {
      type: Number
    },
    allActiveStores: {
      type: Number
    },
    allOffers: {
      type: Number
    },
    validOffers: {
      type: Number
    },
    expiredOffers: {
      type: Number
    },
    siteMapOffers: {
      type: Number
    },
    siteMapStores: {
      type: Number
    },
    storesWithoutLogo: {
      type: Number
    },
    storesWithoutDescription: {
      type: Number
    },
    storesWithoutFaq: {
      type: Number
    }, 
    storesWithoutCommission: {
      type: Number
    },
    storesWithoutCategories: {
      type: Number
    },
    groupBySource : {
      type: Object
    },
    allProducts: {
      type: Number
    },
    checkedProducts: {
      type: Number
    },
    groupByCountry: {
      type: Object
    },
    duplicateStore: {
      type: Object
    },
    checkedOffers: {
      type: Number
    }
  },
  { timestamps: true, autoCreate: true, autoIndex: Boolean(process.env.MONGO_DB_AUTO_INDEX === 'true') }
);

DashBoard.index({'createdAt': -1});

const model = mongoose.model('DashBoard', DashBoard);
module.exports = model;