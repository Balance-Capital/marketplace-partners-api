const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const TitleGenerator = new Schema(
  {
    text: {
      type: String
    }
  },
  { timestamps: true, autoCreate: true, autoIndex: Boolean(process.env.MONGO_DB_AUTO_INDEX === 'true') }
);
TitleGenerator.index({text: 1})

const model = mongoose.model('TitleGenerator', TitleGenerator);
module.exports = model;
