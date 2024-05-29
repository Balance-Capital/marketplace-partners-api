const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const Visitors = new Schema(
  {
    cookieId: {
      type: String
    },
    lastIp: {
      type: String
    },
    lastReferer: {
      type: String
    }
  },
  { timestamps: true }
);

Visitors.index({ cookieId: 1});

const logVisitors = async function logVisitors(cookieId, req) {
  this.updateOne(
    {cookieId},
    {
      lastIp:req.connection.remoteAddress,
      lastReferer: req.headers.referer
  });  
}

Visitors.statics.logVisitors = logVisitors;

const model = mongoose.model('Visitors', Visitors);
module.exports = model;