require('dotenv').config();
const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const AdServiceAN = new Schema(
  {
    allow_deeplink: { type: String },
    application_status: { type: String },
    approval_required: { type: String },
    approve_lead: { type: String },
    begins: { type: Date },
    camp_title: { type: String },
    campaign_logo: { type: String },
    categories: {
      type: [{
        category_name: { type: String},
        id: { type: String }
      }]
    },
    cleanlink_url: { type: String },
    redirect_url: { type: String },
    comparisonfeed: { type: String },
    cr: {
        "30days": { type: Number },
        "7days": { type: Number },
        "90days": { type: Number }
    },
    currency: { type: String },
    description: { type: String },
    epc: {
      "30days": { type: Number },
      "7days": { type: Number },
      "90days": { type: Number }
    },
    exclusive: { type: String },
    expirestamp: { type: Date },
    favorite: { type: String },
    highest_prices: {
      lead: {
        agent_price: { type: String },
          descriptor: { type: String }
        }
      },
      id: { type: String },
      is_click: { type: String },
      is_lead: { type: String },
      is_sale: { type: String },
      prices: {
        lead: {
          basic: {
            agent_price: { type: String },
            descriptor: { type: String },
            media_prices: []
          }
        }
      },
      primary_category_name: { type: String },
      productfeed: { type: String },
      rules: [
          {
              active: { type: String },
              description: { type: String },
              group: { type: String },
              id: { type: String },
              name: { type: String },
              parameter: { type: String }
          }
      ],
      short_description: { type: String },
      status: { type: String },
      sub_types: [
          {
              camp_id: { type: String },
              sub_type: { type: String },
              type: { type: String }
          }
      ]
  },
  { timestamps: true, autoCreate: true, autoIndex: Boolean(process.env.MONGO_DB_AUTO_INDEX === 'true') }
);

AdServiceAN.index({id: 1}, {unique: true});
AdServiceAN.index({begins: -1});
AdServiceAN.index({expirestamp: -1});
AdServiceAN.index({description: 1}, { collation: { locale: 'en', strength: 2 } });
AdServiceAN.index({camp_title: 1}, { collation: { locale: 'en', strength: 2 } });
AdServiceAN.index({cleanlink_url: -1});

const model = mongoose.model('AdServiceAN', AdServiceAN);
module.exports = model;