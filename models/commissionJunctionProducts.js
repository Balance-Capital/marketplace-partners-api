const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const CommissionJunctionProducts = new Schema(
  {
    adId: {
      type: String
    },
    advertiserName: {
      type: String
    },
    advertiserCountry: {
      type: String
    },
    targetCountry: {
      type: String
    },
    additionalImageLink: {
      type: Array
    },
    imageLink: {
      type: String
    },
	  brand: {
      type: String
    },
    advertiserId: {
      type: String
    },
    catalogId: {
      type: String
    },
    id: {
      type: String
    },
    title: {
      type: String
    },
    description: {
      type: String
    },
    price: {
      type: [{
        amount: {
          type: String
        },
        currency: {
          type: String
        }
      }]
    },
    salePrice: {
      type: [{
        amount: {
          type: String
        },
        currency: {
          type: String
        }
      }]
    },
    salePriceEffectiveDateStart: {
      type: String
    },
    salePriceEffectiveDateEnd: {
      type: String
    },
    link: {
      type: String
    },
    mobileLink: {
      type: String
    },
    linkCode: {
      type: String
    },
    exported: {
      type: Date
    }
  },
  { timestamps: true, autoCreate: true, autoIndex: Boolean(process.env.MONGO_DB_AUTO_INDEX === 'true') }
);

CommissionJunctionProducts.index({id: 1},{unique: true});

const model = mongoose.model('CommissionJunctionProducts', CommissionJunctionProducts);
module.exports = model;
