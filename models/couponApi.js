require('dotenv').config();
const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const CouponApi = new Schema(
  {
    offer_id: {
      type: Number
    },
    title: {
      type: String
    },
    description: {
      type: String
    },
    code: {
      type: String
    },
    featured: {
      type: String
    },
    source: {
      type: String
    },
    deeplink: {
      type: String
    },
    affiliate_link: {
      type: String
    },
    cashback_link: {
      type: String
    },
    url: {
      type: String
    },
    image_url : {
      type: String
    },
    brand_logo : {
      type: String
    },
    type : {
      type: String
    },
    store : {
      type: String
    },
    merchant_home_page : {
      type: String
    },         
    categories: {
      type: String
    },
    start_date: {
      type: Date
    },
    end_date: {
      type: Date
    },
    status: {
      type: String
    },
    primary_location: {
      type: String
    },
    rating: {
      type: Number
    },
    label: {
      type: String
    },
    language: {
      type: String
    }
  },
  { timestamps: true, autoCreate: true, autoIndex: Boolean(process.env.MONGO_DB_AUTO_INDEX === 'true') }
);

CouponApi.index({offer_id: 1}, {unique: true});
CouponApi.index({end_date: -1});
CouponApi.index({description: 1}, { collation: { locale: 'en', strength: 2 } });
CouponApi.index({title: 1}, { collation: { locale: 'en', strength: 2 } });
CouponApi.index({merchant_home_page: -1});

const model = mongoose.model('CouponApi', CouponApi);
module.exports = model;