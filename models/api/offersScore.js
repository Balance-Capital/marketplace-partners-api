const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const OffersScore = new Schema(
  {
    bestDiscount: {
      type: String
    },
    couponCodes: {
      type: String
    },
    totalOffers: {
      type: Number
    },
    avgSavings: {
      type: String
    }
  },
  { timestamps: true }
);

const model = mongoose.model('OffersScore', OffersScore);
module.exports = model;