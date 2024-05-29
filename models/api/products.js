const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const Products = new Schema(
  {
    importedId: {
      type: String
    },
    partnerSource: {
      type: String
    },
    advertiserName: {
      type: String
    },
    advertiserCountry: {
      type: String
    },
    image: {
      type: String
    },
    brand: {
      type: String
    },
    title: {
      type: String
    },
    description: {
      type: String
    },
    price: {
      type: {
        amount: {
          type: String
        }, 
        currency: {
          type: String
        }
      }
    },
    salePrice: {
      type: {
        amount: {
          type: String
        }, 
        currency: {
          type: String
        }
      }
    },
    link: {
      type: String
    },
    checked: {
      type: {
        httpStatus: {
          type: Number
        },
        timeRequest: {
          type: Number
        },
        date: {
          type: Date
        },
        err: {
          type: String
        }
      }
    },
    categories: {
      type: Array
    }
  },
  { timestamps: true }
);

Products.index({importedId: 1},{unique: true})
Products.index({description: 1},{collation: { locale: 'en', strength: 2 } })
Products.index({advertiserCountry: 1},{collation: { locale: 'en', strength: 2 } })
Products.index({partnerSource: 1},{collation: { locale: 'en', strength: 2 } })
Products.index({image: 1},{collation: { locale: 'en', strength: 2 } })
Products.index({'checked.httpStatus': 1})
Products.index({'categories': 1})

const model =  mongoose.model('Products', Products);
module.exports = model;