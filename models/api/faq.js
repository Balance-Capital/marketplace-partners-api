const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const FAQ = new Schema(
  {
    question: {
      type: String
    },
    answer: {
      type: String
    }
  },
  { timestamps: true }
);

const model =  mongoose.model('FAQ', FAQ);
module.exports = model;