const moment = require('moment');

const { EBAY, EXPORT_TO_API } = require('../constants/partnersName');

const { 
  X_EBAY_C_ENDUSERCTX, 
  X_EBAY_C_MARKETPLACE_ID,
  SCOPE_DEAL
} = require('../constants/ebay');

const { TALK_TIMEOUT_MINUTES } = Object.freeze({
  TALK_TIMEOUT_MINUTES: 5
});

let accessToken = null;

const db = require('../models/index');
const logger = require('../services/logger');
const configController = require('./ConfigController');
const { api } = require('../services/__api');
const { auth } = require('../services/ebay');

const eBayOffersResponse = require('../response/EbayOffersResponse');

const partnerTalk = (talk) => {
  try {
    db.models.Config.updateMany(
      { name: EBAY },
      {
        $push: {
          partnerTalk: {text:talk}
        }
      }
    ).exec().catch(error=>logger.error(error)).then(() => {
      db.models.Config.updateMany(
        { name: EBAY },
        {
          $pull: {
            partnerTalk : { timestamps: {$lte: moment().subtract(TALK_TIMEOUT_MINUTES,'minutes').toDate()}}
          }
        }
      ).exec().catch(error=>logger.error(error))
    });
  
  } catch (error) {
    logger.error(error);
  };

};

const getByParams = async (query, limit=10, offset=1) => db.models.EbayOffers.find(query).limit(limit).skip(offset).exec();

const getOffers = async (params, query) => {
  partnerTalk('ebay: get offers start');
  const { url, token, limit, offset, sortBy, id } = params;
  const { country } = query;
  
  const headers = {
      "Authorization": `Bearer ${token}`,
      "X-EBAY-C-ENDUSERCTX": X_EBAY_C_ENDUSERCTX,
      "X-EBAY-C-MARKETPLACE-ID": X_EBAY_C_MARKETPLACE_ID
  };

  const successCallback = (response) => {
    if(response && response.status===429) {
      partnerTalk('Too Many Requests 429');
      configController.update({ _id:id }, { running: true, $push: { partnerTalk: {text:'Too Many Requests'} } } );
    };
  };

  const errorCallback = async (error) => {
    if(!error) return;
    partnerTalk(`connection: ${JSON.stringify(error)}`);
    const text = JSON.stringify(error);
    configController.update({ _id:id }, { running: true, $push: { partnerTalk: {text} } });
  };

  const urlApi = `${url}?limit=${limit}&offset=${offset}&sort_by=${sortBy}&delivery_country=${country}`;
  
  const response = await api({
    url: urlApi, 
    headers,
    method: 'GET',
    errorCallback,
    successCallback
  });

  return response && response.data || null;
};

const saveOffers = async (collection) => {
  partnerTalk('ebay: save offers');
  const documents = collection.filter(item => moment(item.dealEndDate).startOf('day') >= moment().startOf('day'));
  let rejection = 0;
  if(documents.length > 0) {
    try {
      await db.models.EbayOffers.insertMany(documents,{ordered:false}).catch(error => {
        partnerTalk(JSON.stringify(error));
        rejection+=1;
      });
    } catch(err) {
      rejection+=1;
    }; 
  };
  return rejection;
};

const prepareToExportOffers = async (limit, offset) => {

  const params = {
    $and:[
      {dealEndDate: {$gt: moment().toDate()}},
      {dealStartDate: {$lte: moment().toDate()}},
      {title: {$exists : true, $ne : null}}
    ]
  };

  const collections = await db.models.EbayOffers.find(params)
    .limit(limit)
    .skip(offset)
    .exec();

  return eBayOffersResponse(collections);
};

const cleanUpDatabase = () => {
  const filter = {
    dealEndDate: {
      $lt: moment().startOf('day').toDate()
    }
  };
  db.models.EbayOffers.deleteMany(filter).exec().then(() => {
    partnerTalk('finish delete old offers');
  });
};

const run = async (progress) => {

  const limitOffsetOffers = 2000;

  if(!progress) cleanUpDatabase();

  const items = await configController.getByParams({name:EBAY});

  const { 
    _id,
    partnerUrlToOffer, 
    offersLimit,
    offersOffset,
    countryCode,
    running
  } = items[0];

  if(running && !progress) return 
  configController.update({ _id }, { running: true });
  partnerTalk('ebay: service start');  

  if(!accessToken) {
    accessToken = await auth(SCOPE_DEAL);
    if(!accessToken || accessToken.match(/error/gi)) {
      logger.error('eBay: null from auth');
      partnerTalk('eBay: null from auth');
      return;
    };
  };
  
  const queryParams = {
    country: countryCode.join(',')
  };

  const offersParams = {
    id: _id,
    limit: offersLimit,
    offset: offersOffset,
    sortBy: 'id',
    url: partnerUrlToOffer,
    token: accessToken
  };

  const offers = await getOffers(offersParams, queryParams);
  
  if(offers && offers.dealItems && offers.dealItems.length > 0) 
    await saveOffers(offers.dealItems);

  const lastOffset = offersOffset + (offers && offers.dealItems && offers.dealItems.length) || 0;

  if(offers && offers.total > lastOffset && limitOffsetOffers > lastOffset ) {
    configController.update({ _id }, {
      offersOffset: lastOffset
    });
  
    run(true);
  } else {
    db.models.Config.updateOne({ name:EBAY }, { running: false, offersOffset:0 }).exec();
    db.models.Config.updateOne({ 
      name: EXPORT_TO_API, 
      'otherParams.apiName':EBAY 
    }, {
      running: false,
      'otherParams.$.offset':0
    }).exec();
    accessToken = null;
  };
}

const closeDB = async () => db.mongoose.close();

module.exports = { 
  run, 
  getByParams, 
  prepareToExportOffers, 
  closeDB,
  getOffers
};