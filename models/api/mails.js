const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const Mails = new Schema(
  {
    messageSign: {
      type: String
    },
    messageType: {
      type: String
    },
    used: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

Mails.index({messageSign:1},{unique:true});

const model =  mongoose.model('Mails', Mails);
module.exports = model;