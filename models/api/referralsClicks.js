const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const ReferralsClick = new Schema(
  {
    referral: {
      type: String
    },
    ip: {
      type: String
    },
    userAgent: {
      type: String
    },
  },
  { timestamps: true }
);

const model =  mongoose.model('ReferralsClick', ReferralsClick);
module.exports = model;