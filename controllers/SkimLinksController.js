const moment = require('moment');
const fetch = require('node-fetch');

const { SKIM_LINKS, EXPORT_TO_API } = require('../constants/partnersName');
const { HEADER_CONTENT_TYPE_JSON } = require('../constants/httpHeader');

let accessToken = null;
const { TALK_TIMEOUT_MINUTES } = Object.freeze({
  TALK_TIMEOUT_MINUTES: 5
});

const FROM_HOW_MANY_DAYS_GET_OFFERS = 7;

const db = require('../models/index');
const logger = require('../services/logger');
const { api } = require('../services/__api');
const configController = require('./ConfigController');
const skimLinksOffersResponse = require('../response/SkimLinksOffersResponse');
const { saveUnifyCommissionReport } = require('../services/unifyCommissionReport');
const { encrypt } = require('../utils/encrypt_decrypt');

const partnerTalk = (talk) => {
  try {

    db.models.Config.updateMany(
      { name: SKIM_LINKS },
      {
        $push: {
          partnerTalk: {text:talk}
        }
      }
    ).exec().catch(error=>logger.error(error)).then(() => {
      db.models.Config.updateMany(
        { name: SKIM_LINKS },
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
  db.models.SkimLinksOffers.find(query).limit(limit).skip(offset).exec();

const auth = async (params) => {
  try {
    const { url, id, secret } = params;

    const payload = {
      client_id: id,
      client_secret: secret,
      grant_type: 'client_credentials'
    };
  
    const response = await api({method:'POST', HEADER_CONTENT_TYPE_JSON, url, params:payload });
    return (response && response.data) || null;
  
  } catch (err) {
    logger.warning(`[SkimLinksController] auth ${err?.message}`, err, params)   
  }
};

const getOffers = async (params, query) => {
  try {
    partnerTalk('sl: get offers');
    const { url, token, limit, offset, sortBy } = params;
    const { country } = query;
  
    const urlApi = `${url}?access_token=${encodeURI(
      token
    )}&limit=${limit}&offset=${offset}&sort_by=${sortBy}&country=${country}`;
  
    const response = await fetch(urlApi).then((data) => data.json()).catch((err) => logger.error(`fetch issue ${err?.message}`, err));
    return response || null;  
  } catch(err) {
    logger.warning(`[SkimLinksController] getOffers ${err?.message}`, err)
  }
};

const saveOffers = async (collection) => {
  try {
    const documents = collection.offers.filter(item => moment(item.offer_ends).startOf('day') >= moment().startOf('day')).map((item) => ({
      terms: item.terms,
      merchantDetailsDomain: item.merchant_details.domain,
      merchantDetailsVerticals: item.merchant_details.verticals,
      merchantDetailsCountryCode: item.merchant_details.country_code,
      merchantDetailsId: item.merchant_details.id,
      merchantDetailsMetadata: item.merchant_details.metadata,
      merchantDetailsFavourite: item.merchant_details.favourite,
      merchantDetailsPartnerType: item.merchant_details.partner_type,
      merchantDetailsMerchantId: item.merchant_details.merchant_id,
      merchantDetailsAdvertiserId: item.merchant_details.advertiser_id,
      merchantDetailsName: item.merchant_details.name,
      merchantDetailsCountries: item.merchant_details.countries,
      merchantDetailsDomains: item.merchant_details.domains,
      couponCode: item.coupon_code,
      dateAdded: item.date_added,
      description: item.description,
      featured: item.featured,
      id: item.id,
      offerEnds: item.offer_ends,
      offerStarts: item.offer_starts,
      offerType: item.offer_type,
      period: item.period,
      title: item.title,
      url: item.url
    }));
    partnerTalk(`sl: save offers: ${documents.length}`);
    if (documents.length > 0) {
      try {
        db.models.SkimLinksOffers.insertMany(documents,{ordered:false})
        // .catch((err) => logger.warning(`Catch while insert ${err?.message}`, err, documents))
        ;
      } catch (err) {
        logger.warning(`Catch insert ${err?.message}`, err, documents);
      }
    }
  
  } catch(err) {
    logger.warning(`[SkimLinksController] saveOffers ${err?.message}`, err, collection)
  }
};

const getCommissionReport = async (salesReportUrl, startDate = null) => {
  try {
    const url = salesReportUrl || null;
    if(!url) return null;
  
    const startTime = startDate === null 
      ? moment().startOf('day').subtract(365, 'day').toISOString()
      : moment(startDate).toISOString();
    const urlApi = `${url}?access_token=${encodeURI(
      accessToken.access_token
    )}&start_date=${encodeURI(startTime)}`;
    // &end_date=${encodeURI(endTime)}
    // &limit=30&offset=&start_date=2019-01-31T00%3A00%3A00&end_date=2019-01-31T23%3A59%3A59&updated_since=&custom_id=&merchant_id=&domain_id=&sort_dir=DESC&sort_by=id&commission_id=&status=active
    // &limit=${limit}&offset=${offset}&sort_by=${sortBy}&country=${country}`;
  
    const response = await fetch(urlApi).then((data) => data.json()).catch((err) => logger.warning(`SkimLinks Commission Report Get: ${err?.message}`, err));
    if(!response || response?.errors) {
      logger.warning(`[SkimLinksController] no response from partner ${response?.errors}`, response)
      return [];
    }
    const commission = await Promise.all( response?.commissions?.map((item) => saveUnifyCommissionReport({
      ...item, 
      transactionDetails: {
        ...item.transaction_details,
        publisherAmountString: encrypt(`${item.transaction_details?.basket?.publisher_amount || 0}`)
      },
      customId: item.click_details.custom_id?.split(':')[0] || null,
      referralId: item.click_details.custom_id?.split(':')[1] || null,
      date: item.click_details.date,
      dataSource: SKIM_LINKS,
      commissionId: item.commission_id
    })));
    return commission || [];  
  } catch(err) {
    logger.warning(`[SkimLinksController] getCommissionReport ${err?.message}`, err, salesReportUrl, startDate)
  }
};

const closeDB = async () => db.mongoose.close();

const prepareToExportOffers = async (limit, offset) => {
  try {
    const params = {
      $and:[
        {
          offerEnds: {$gt: moment().toDate()}, 
          dateAdded: {$gt: moment().subtract(FROM_HOW_MANY_DAYS_GET_OFFERS,'days').startOf('day').toDate()}
        },
        {
          $or: [
            { 'merchantDetailsMetadata.description': { $exists: true, $ne: null } },
            { description: { $exists: true, $ne: null } },
            { title: { $exists: true, $ne: null } }
          ]
        }]
    };
    const sort = {
      merchantDetailsDomain:-1
    };
    const collections = await db.models.SkimLinksOffers.find(params)
      .sort(sort)
      .limit(limit)
      .skip(offset)
      .exec();
    
    partnerTalk(`sl: prepare offers to export: ${collections.length}`);
  
    return skimLinksOffersResponse(collections);  
  } catch(err) {
    logger.warning(`[SkimLinksController] prepareToExportOffers ${err?.message}`, err, limit, offset)
  }
};

const cleanUpDatabase = () => {
  try {
    const filter = {
      offerEnds: {
        $lt: moment().startOf('day').toDate()
      }
    };
    db.models.SkimLinksOffers.deleteMany(filter).exec().then(() => {
      partnerTalk('finish delete old offers');
    });  
  } catch(err) {
    logger.warning(`[SkimLinksController] cleanUpDatabase ${err?.message}`, err)
  }
};

const run = async (countryIndex = 0) => {
  partnerTalk(`sl: start service`);
  const items = await configController.getByParams({ name: SKIM_LINKS });

  const {
    _id,
    login,
    secret,
    partnerUrlToOffer,
    partnerUrlToAuth,
    offersLimit,
    offersOffset,
    countryCode,
    running,
    otherParams
  } = items[0];

  let GetCommissionReport = false;

  if(!running) {
    // cleanUpDatabase();
    GetCommissionReport = true;
  }

  if (running && !accessToken) return;
  configController.update({ _id }, { running: true });

  if (!accessToken) {
    const accessParams = {
      url: partnerUrlToAuth,
      id: login,
      secret
    };
    accessToken = await auth(accessParams);
    if (!accessToken) {
      logger.error('SkimLinks: null from auth');
      configController.update({ _id }, { running: false });
      return;
    }
  }

  const offersParams = {
    token: accessToken.access_token,
    url: partnerUrlToOffer,
    limit: offersLimit,
    offset: offersOffset,
    sortBy: 'id',
    sort_dir: 'desc'
  };

  const queryParams = {
    country: countryCode[countryIndex]
  };

  if(GetCommissionReport) {
    await getCommissionReport(otherParams[0].salesReportUrl, moment().subtract(365, 'days').toDate());
  };

  const offers = await getOffers(offersParams, queryParams);
  if (offers && offers?.offers?.length > 0) {
    await saveOffers(offers);
  };

  if (offers.has_more) {
    const lastOffset = offersOffset + offers.offers.length;
    configController.update({ _id }, { offersOffset: lastOffset});  
    run(countryIndex);
    partnerTalk(`run - last offset: ${lastOffset}`);
  } else if(countryIndex !== countryCode.length-1) {
      db.models.Config.updateOne({ name:SKIM_LINKS }, { offersOffset:0 }).exec();
      run(countryIndex+1);
    } else {
      partnerTalk('finish and reset offset');
      db.models.Config.updateOne({ name:SKIM_LINKS }, { offersOffset:0, running: false }).exec();
      db.models.Config.updateOne({
        name:EXPORT_TO_API, 
        'otherParams.apiName':SKIM_LINKS
      },{
        running: false,
        'otherParams.$.offset':0
      }).exec();
      accessToken = null;
      GetCommissionReport = false;
    }
};

module.exports = { 
  run, 
  getByParams, 
  prepareToExportOffers, 
  closeDB, 
  getCommissionReport 
};
