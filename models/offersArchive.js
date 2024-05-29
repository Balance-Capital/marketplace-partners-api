const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const OffersArchive = new Schema(
  {
    verified: {
      type: Boolean, // if the offer has been verified
      default: false
    },
    star: {
      type: Number, // number of stars added manually
      default: 5
    },
    validDate: {
      type: Date // expired date
    },
    startDate: {
      type: Date  // the date from which the offer will be available
    },
    value: {
      type: Number // for instance 10
    },
    valueType: {
      type: String, // Enum: currency or percentage
      Enum: ['currency', 'percentage']
    },
    currency: {
      type: String // $ or pound or euro etc
    },
    countryCode: {
      type: Array
    },
    image: {
      type: String // name of file
    },
    savingType: {
      type: String // what kind of saving is it, free shipping etc
    },
    storeUrl: {
      type: String // redirect link to our store page
    },
    title: {
      type: String
    },
    shortTitle: {
      type: String
    },
    description: {
      type: String
    },
    code: {
      type: String // for instance M10 or WIN20
    },
    origin: {
      type: String // partner whom it came from
    },
    domain: {
      type: String // partner whom it came from origin domain
    },
    originId: {
      type: Number // unique partner’s offer id
    },
    redirectUrl: {
      type: String // external redirect
    },
    priority: {
      type: Number // priority number
    },
    partnerSource: {
      type: String
    },
    categories: {
      type: []
    }
  },
  { timestamps: true, autoCreate: true, autoIndex: Boolean(process.env.MONGO_DB_AUTO_INDEX === 'true') }
);

const model = mongoose.model('OffersArchive', OffersArchive);
module.exports = model;