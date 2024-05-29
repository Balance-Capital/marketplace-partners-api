const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const logProcess = new Schema(
  {
    name: {
      type: String
    },
    pid: {
      type: Number
    }
  },
  { timestamps: true }
);

const model =  mongoose.model('logProcess', logProcess);
module.exports = model;