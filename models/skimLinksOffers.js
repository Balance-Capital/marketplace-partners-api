require('dotenv').config();
const mongoose = require('mongoose'); 

const { Schema } = mongoose;

const SkimLinksOffers = new Schema(
  {
    terms: {
      type: String
    },
    merchantDetailsDomain: {
      type: String
    },
    merchantDetailsVerticals: {
      type: Array
    },
    merchantDetailsCountry_code: {
      type: String
    },
    merchantDetailsId: {
      type: Number
    },
    merchantDetailsMetadata: {
      type: Object
    },
    merchantDetailsFavourite: {
      type: Boolean
    },
    merchantDetailsPartnerType : {
      type: String
    },
    merchantDetailsMerchantId : {
      type: Number
    },
    merchantDetailsAdvertiserId : {
      type: Number
    },
    merchantDetailsName : {
      type: String
    },
    merchantDetailsCountries : {
      type: Array
    },
    merchantDetailsDomains : {
      type: Array
    },         
    couponCode: {
      type: String
    },
    dateAdded: {
      type: Date
    },
    description: {
      type: String
    },
    featured: {
      type: Boolean
    },
    id: {
      type: Number
    },
    advertiserId: {
      type: Number
    },
    merchantId: {
      type: Number
    },
    offerEnds: {
      type: Date
    },
    offerStarts: {
      type: Date
    },
    offerType: {
      type: String
    },
    period: {
      type: String
    },
    title: {
      type: String
    },
    url: {
      type: String
    }
  },
  { timestamps: true, autoCreate: true, autoIndex: Boolean(process.env.MONGO_DB_AUTO_INDEX === 'true') }
);

SkimLinksOffers.index({id: 1}, {unique: true});
SkimLinksOffers.index({offerEnds: -1});
SkimLinksOffers.index({'merchantDetailsMetadata.description': 1});
SkimLinksOffers.index({description: 1}, { collation: { locale: 'en', strength: 2 } });
SkimLinksOffers.index({title: 1}, { collation: { locale: 'en', strength: 2 } });
SkimLinksOffers.index({merchantDetailsDomain: -1});
SkimLinksOffers.index({dateAdded: 1});

const model = mongoose.model('SkimLinksOffers', SkimLinksOffers);
module.exports = model;