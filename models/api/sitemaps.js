const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const SiteMap = new Schema(
  {
    name: {
      type: String
    },
    start: {
      type: String
    },
    active: {
      type: Boolean,
      default: false
    },
    running: {
      type: Boolean,
      default: false
    },
    feedPath: {
      type: String
    },
    siteUrl: {
      type: String
    },
    serviceTalk: {
      type: [{
        text: {
          type: String
        },
        short: {
          type: String
        },
        timestamps: {
          type: Date,
          default: Date.now 
        }
      }]
    },
    description: {
      type: String
    },
    staticUrl: {
      type: [{
        url: {
          type: String
        },
        priority: {
          type: Number
        },
        changeFreq: {
          type: String
        }
      }]
    },
    map: {
      type: String
    },
    maps: {
      type: [{
        name: {
          type: String
        },
        map: {
          type: String
        },
        priority: {
          type: Number
        }
      }]
    },
    mapStatic: {
      type: String
    }
  },
  { timestamps: true }
);

SiteMap.index({name:1});
SiteMap.index({'serviceTalk.timestamps': 1});

const model = mongoose.model('SiteMap', SiteMap);
module.exports = model;
