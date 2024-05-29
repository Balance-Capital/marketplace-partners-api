const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const cronSchedule = new Schema(
  {
    name: {
      type: String
    },
    start: {
      type: String
    },
    active: {
      type: Boolean   
    },
    description: {
      type: String
    }
  },
  { timestamps: true, autoCreate: true, autoIndex: Boolean(process.env.MONGO_DB_AUTO_INDEX === 'true') }
);

module.exports = mongoose.model('cronSchedule', cronSchedule);
