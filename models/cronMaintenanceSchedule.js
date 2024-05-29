const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const cronMaintenanceSchedule = new Schema(
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
    running: {
      type: Boolean   
    },
    description: {
      type: String
    },
    serviceTalk: {
      type: [{
        text: {
          type: String
        },
        timestamps: {
          type: Date,
          default: Date.now 
        }
      }]
    }
  },
  { timestamps: true, autoCreate: true, autoIndex: Boolean(process.env.MONGO_DB_AUTO_INDEX === 'true') }
);

cronMaintenanceSchedule.index({'serviceTalk.timestamps': 1});

module.exports = mongoose.model('cronMaintenanceSchedule', cronMaintenanceSchedule);
