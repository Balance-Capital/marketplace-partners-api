const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const offersReport = new Schema(
  {
    storeDomain: {
      type: String
    },
    countOffers: {
      type: Number
    },
    countNewOffers: {
      type: Number   
    },
    countIncomeOffers: {
      type: Number   
    },
    countIncomeDuplicate: {
      type: Number   
    },
    partnersName: {
      type: String   
    }
  },
  { timestamps: true }
);

offersReport.index({createdAt:1});
offersReport.index({storeDomain:1});

module.exports = mongoose.model('offersReport', offersReport);
