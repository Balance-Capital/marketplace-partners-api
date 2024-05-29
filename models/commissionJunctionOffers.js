require('dotenv').config();
const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const CommissionJunctionOffers = new Schema(
  {
    advertiserId: {
      type: Number
    },
    advertiserName: {
      type: String
    },
    category: {
      type: Array
    },
    clickCommission: {
      type: Number
    },
    creativeHeight: {
      type: Number
    },
    creativeWidth: {
      type: Number
    },
    language: {
      type: Array
    },
    leadCommission : {
      type: String
    },
    linkCodeHtml : {
      type: String
    },
    linkCodeJavascript : {
      type: String
    },
    description : {
      type: String
    },
    destination : {
      type: String
    },
    linkId : {
      type: Number
    },         
    linkName: {
      type: String
    },
    linkType: {
      type: String
    },
    performanceIncentive: {
      type: Boolean
    },
    promotionEndDate: {
      type: Date
    },
    promotionStartDate: {
      type: Date
    },
    promotionType: {
      type: String
    },
    couponCode: {
      type: String
    },
    relationshipStatus: {
      type: String
    },
    saleCommission: {
      type: String
    },
    sevenDayEpc: {
      type: Number
    },
    threeMonthEpc: {
      type: Number
    },
    domains: {
      type: Array
    },
    dateAdded: {
      type: Date
    },
    clickUrl: {
      type: String
    },
    exported: {
      type: Date
    },
    countryCode: {
      type: String
    }
  },
  { timestamps: true, autoCreate: true, autoIndex: Boolean(process.env.MONGO_DB_AUTO_INDEX === 'true') }
);

CommissionJunctionOffers.index({linkId: 1}, { unique: true });
CommissionJunctionOffers.index({promotionEndDate: -1});
CommissionJunctionOffers.index({description: 1});
CommissionJunctionOffers.index({linkName: 1});
CommissionJunctionOffers.index({language: 1}, { collation: { locale: 'en', strength: 2 } });
CommissionJunctionOffers.index({promotionStartDate: 1});
CommissionJunctionOffers.index({promotionEndDate: 1});
CommissionJunctionOffers.index({dateAdded: 1});

const model = mongoose.model('CommissionJunctionOffers', CommissionJunctionOffers);
module.exports = model;