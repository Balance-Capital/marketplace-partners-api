const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const logTimeOperations = new Schema(
  {
    operationName: {
      type: String
    },
    avgTime: {
      type: Number
    },
    timeOperations: {
      type: []
    }
  },
  { timestamps: true, autoCreate: true, autoIndex: Boolean(process.env.MONGO_DB_AUTO_INDEX === 'true') }
);

const model =  mongoose.model('logTimeOperations', logTimeOperations);
module.exports = model;