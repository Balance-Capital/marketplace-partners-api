const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const logUrls = new Schema(
  {
    url: {
      type: String
    },
    status: {
      type: Number
    },
    responseTime: {
      type: Number
    },
    robots: {
      type: String
    },
    title: {
      type: {
        text: {
          type: String
        },
        length: {
          type: Number
        },
        accurate : {
          type: Number
        }
      }
    },
    keywords: {
      type: [{
        word: {
          type: String
        },
        times: {
          type: Number
        },
        density: {
          type: Number
        } 
      }]
    }
  },
  { timestamps: true, autoCreate: true, autoIndex: Boolean(process.env.MONGO_DB_AUTO_INDEX === 'true') }
);

logUrls.index({url:1},{unique:1});

const model =  mongoose.model('logUrls', logUrls);
module.exports = model;