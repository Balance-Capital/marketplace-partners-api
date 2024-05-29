const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const Withdraw = new Schema(
  {
    fromAddress: {
      type: String
    },
    toAddress: {
      type: String
    },
    currency: {
      type: String
    },
    amount: {
      type: Number
    },
    transactionId: {
      type: String
    },
    referralTransactionId: {
      type: String
    },    
    done: {
      type: Date,
      default: null
    },
    signed: {
      type: [{
        timestamps: {
          type: Date
        },
        value: {
          type: String
        },
        name: {
          type: String
        }
      }]
    }
  },
  { timestamps: true }
);

const model =  mongoose.model('Withdraw', Withdraw);
module.exports = model;