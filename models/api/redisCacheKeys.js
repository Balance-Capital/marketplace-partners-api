const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const RedisCacheKeys = new Schema(
  {
    name: {
      type: String
    },
    active: {
      type: Boolean
    },
    expire: {
      type: Number
    }
  },
  { timestamps: true }
);

RedisCacheKeys.index({'name':1},{unique:1});

const model =  mongoose.model('RedisCacheKeys', RedisCacheKeys);
module.exports = model;