const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const Categories = new Schema(
  {
    name: {
      type: String
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

Categories .index({ name: 1}, {unique: true});

const model = mongoose.model('Categories ', Categories);
module.exports = model;