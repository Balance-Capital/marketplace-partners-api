const moment = require('moment');
const { COUPON_API, EXPORT_TO_API } = require('../constants/partnersName')

const { TALK_TIMEOUT_MINUTES } = Object.freeze({
  TALK_TIMEOUT_MINUTES: 5
});
const db = require('../models/index');
const logger = require('../services/logger');
const { api } = require('../services/api');
const configController = require('./ConfigController');
const couponApiResponse = require('../response/CouponApiResponse');

const partnerTalk = (talk) => {
  try {

    db.models.Config.updateMany(
      { name: COUPON_API },
      {
        $push: {
          partnerTalk: {text:talk}
        }
      }
    ).exec().catch(error=>logger.error(error)).then(() => {
      db.models.Config.updateMany(
        { name: COUPON_API },
        {
          $pull: {
            partnerTalk : { timestamps: {$lte: moment().subtract(TALK_TIMEOUT_MINUTES,'minutes').toDate()}}
          }
        }
      ).exec().catch(error=>logger.error(error));
  
    });
  
  } catch (error) {
    logger.error(error);
  };

};

const getByParams = async (query, limit = 10, offset = 1) =>
  db.models.CouponApi.find(query).limit(limit).skip(offset).exec();

const getOffers = async (params) => {
  partnerTalk('couponapi: get offers');
  const { url } = params;

  const errorCallback = (error) => {
    logger.error(`couponapi Get offer: ${error}`);
  };
  const response = await api({url, errorCallback });
  return (response && response.data) || null;
};

const saveOffers = async (collection) => {
  const documents = collection.offers.filter(item => moment(item.end_date).startOf('day') >= moment().startOf('day')).map((item) => ({
    offer_id : item.offer_id,
    title : item.title,
    description : item.description,
    code : item.code,
    featured : item.featured,
    source : item.source,
    url : item.url,
    affiliate_link : item.affiliate_link,
    cashback_link: item.cashback_link,
    deeplink: item.deeplink,
    image_url : item.image_url,
    brand_logo : item.brand_logo,
    type : item.type,
    store : item.store,
    merchant_home_page : item.merchant_home_page,
    categories : item.categories,
    start_date : item.start_date,
    end_date : item.end_date,
    status : item.status,
    primary_location : item.primary_location,
    rating : item.rating,
    label : item.label,
    language : item.language
  }));
  partnerTalk(`couponapi: save offers: ${documents.length}`);
  if (documents.length > 0) {
    try {
      db.models.CouponApi.insertMany(documents,{ordered:false}).catch((error) => {
        logger.error(error);
      });
    } catch (error) {
      logger.error(error);
    }
  }
};

const closeDB = async () => {
  db.mongoose.close();
};

const prepareToExportOffers = async (limit, offset) => {
  const params = {
    $and:[
      {offerEnds: {$gt: moment().toDate()}},
      {
        $or: [
          { description: { $exists: true, $ne: null } },
          { title: { $exists: true, $ne: null } }
        ]
      }]
  };
  const sort = {
    merchant_home_page: -1
  };
  const collections = await db.models.CouponApi.find(params)
    .sort(sort)
    .limit(limit)
    .skip(offset)
    .exec();
  
  partnerTalk(`couponapi: prepare offers to export: ${collections.length}`);

  return couponApiResponse(collections);
};

const cleanUpDatabase = () => {
  const filter = {
    end_date: {
      $lt: moment().startOf('day').toDate()
    }
  };
  db.models.CouponApi.deleteMany(filter).exec().then(() => {
    partnerTalk('finish delete old offers');
  });
};

const run = async (countryIndex = 0) => {
  partnerTalk(`couponapi: start service`);
  const items = await configController.getByParams({ name: COUPON_API });

  const {
    _id,
    partnerUrlToOffer,
    offersLimit,
    offersOffset,
    countryCode,
    running
  } = items[0];

  if(!running) cleanUpDatabase();

  configController.update({ _id }, { running: true });

  const offersParams = {
    url: partnerUrlToOffer,
    limit: offersLimit,
    offset: offersOffset
  };

  const queryParams = {
    country: countryCode[countryIndex]
  };

  const offers = await getOffers(offersParams, queryParams);
  if (offers && offers.offers.length > 0) {
    saveOffers(offers);
  };

  db.models.Config.updateOne({ name:COUPON_API }, { offersOffset:0, running: false }).exec();
  db.models.Config.updateOne({
    name:EXPORT_TO_API, 
    'otherParams.apiName':COUPON_API
  },{
    running: false,
    'otherParams.$.offset':0
  }).exec();

};

module.exports = { run, getByParams, prepareToExportOffers, closeDB };
