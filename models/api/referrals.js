const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const Referrals = new Schema(
  {
    referral: {
      type: String,
      default: null
    },
    status: {
      type: String,
      default: null
    },
    refBonus: {
      type: Number,
      default: 0
    },
    refBonusString: {
      type: String
    },
    currency: {
      type: String
    },
    transactionDate: {
      type: Date
    },
    transactionId: {
      type: String
    },
    signed: {
      type: [{
        timestamp: { type: Date },
        value: { type: String },
        name: {type: String}
      }]
    }
  },
  { timestamps: true }
);

const model =  mongoose.model('Referrals', Referrals);
module.exports = model;