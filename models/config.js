const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const otherParams = {
  token: String,
  websiteId: String,
  requestorCid: String,
  getAdvertisersUrl: String,
  getPublisherLookupUrl: String,
  getLinksUrl: String,
  getProductsUrl: String,
  productLimit: String,
  productOffset: String,
  salesReportUrl: String,
}

const Config = new Schema(
  {
    name: {
      type: String
    },
    login: {
      type: String
    },
    secret: {
      type: String
    },
    partnerUrlToOffer: {
      type: String
    },
    partnerUrlToAuth: {
      type: String
    },
    ourId: {
      type: String
    },
	  urlTemplate: {
      type: String
    },
    offersLimit: {
      type: Number,
      default: 1000
    },
    offersOffset: {
      type: Number,
      default: 1
    },
    countryCode: {
      type: Array
    },
    running: {
      type: Boolean,
      default: false
    },
    active: {
      type: Boolean,
      default: false
    },
    otherParams: {
      type: [{
        type: Object
      }]
    },
    partnerTalk: {
      type: [{
        text: { type: String},
        timestamps: { type: Date, default: Date.now}
      }]
    }
  },
  { timestamps: true, autoCreate: true, autoIndex: Boolean(process.env.MONGO_DB_AUTO_INDEX === 'true') }
);

Config.index({name: 1});
Config.index({running: 1});
Config.index({active: 1});
Config.index({'partnerTalk.timestamps': -1});

const model = mongoose.model('Config', Config);
module.exports = model;
