require('dotenv').config();
const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const EbayOffers = new Schema(
  {
    itemId: {
      type: String
    },
    legacyItemId: {
      type: String
    },
    title: {
      type: String
    },
    image : {
      type: {
        imageUrl: {type: String}
      }
    },
    marketingPrice: {
      discountAmount: {
        type: {
          currency: {type: Array},
          value: {type: String}  
        }
      },
      discountPercentage: {
        type: String
      },
      originalPrice: {
        type: {
          currency: {type: Array},
          value: {type: String}  
        }
      },
      priceTreatment: {
        type: Array
      }
    },
    price: {
      type: {
        currency: {type: Array},
        value: {type: String}  
      }
    },
    shippingOptions: {
      type: [{ 
        shippingCost: {
          type: {
            currency: {type: Array},
            value: {type: String}    
          }
        },
        shippingCostType: {
          type: String
        }
      }
    ]},
    itemWebUrl: {
      type: String
    },
    itemAffiliateWebUrl : {
      type: String
    },
    categoryId: {
      type: String
    },
    categoryAncestorIds: {
      type: Array
    },
    commissionable: {
      type: Boolean
    },
    dealWebUrl : {
      type: String
    },
    dealAffiliateWebUrl: {
      type: String
    },
    dealStartDate: {
      type: Date
    },
    dealEndDate: {
      type: Date
    }
  },
  { timestamps: true, autoCreate: true, autoIndex: Boolean(process.env.MONGO_DB_AUTO_INDEX === 'true') }
);

EbayOffers.index({dealWebUrl: 1},{unique: true});
EbayOffers.index({dealEndDate: -1});
EbayOffers.index({title: 1}, { collation: { locale: 'en', strength: 2 } });
EbayOffers.index({dealStartDate: 1});

const model = mongoose.model('EbayOffers', EbayOffers);
module.exports = model;