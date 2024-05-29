const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const UnifyCommissionReport = new Schema(
  {
    commissionId: {
      type: String
    },
    signed: {
      type: [{
        timestamp: { type: Date },
        value: { type: String },
        name: { type: String }
      }]
    },    
    dataSource: {
      type: String
    },
    customId: {
      type: String
    },
    date: {
      type: Date
    },
    userCountry: {
      type: String
    },
    merchantDetails: {
      type: {
        id: {
          type: String
        },
        name: {
          type: String
        }  
      }
    },
    transactionDetails: {
      type: {
        commissionType: {
          type: String
        },
        currency: {
          type: String
        },
        currencyRate: {
          type: Number
        },
        currencyPair: {
          type: String
        },
        items: {
          type: Number
        },
        orderAmount: {
          type: Number
        },
        publisherAmount: {
          type: Number
        },
        publisherAmountString: {
          type: String
        },      
        invoiceId: {
          type: String
        },
        lastUpdated: {
          type: Date
        },
        paymentStatus: {
          type: String
        },
        status: {
          type: String
        },
        withDrawStatus: {
          type: String
        },
        transactionDate: {
          type: Date
        }
  
      }
    }
  },
  { timestamps: true, autoCreate: true, autoIndex: Boolean(process.env.MONGO_DB_AUTO_INDEX === 'true') }
);

UnifyCommissionReport.index({commissionId: -1});

const model = mongoose.model('UnifyCommissionReport', UnifyCommissionReport);
module.exports = model;