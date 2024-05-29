// const axios = require('axios');
const fetch = require('node-fetch');
const moment = require('moment');

const { ADSERVICE_AN, EXPORT_TO_API } = require('../constants/partnersName');
const { HEADER_CONTENT_TYPE_JSON } = require('../constants/httpHeader');

let accessToken = null;
const { TALK_TIMEOUT_MINUTES } = Object.freeze({
  TALK_TIMEOUT_MINUTES: 5
});

const db = require('../models/index');
const logger = require('../services/logger');
const configController = require('./ConfigController');
const adServiceANResponse = require('../response/AdServiceANResponse');
const UnifyCommissionData = require('../objects/UnifyCommissionData');
const { cleanHtml } = require('../utils/cleanHtml');

const partnerTalk = (talk) => {
  try {

    db.models.Config.updateMany(
      { name: ADSERVICE_AN },
      {
        $push: {
          partnerTalk: {text:talk}
        }
      }
    ).exec().catch(error=>logger.error(error)).then(() => {
      db.models.Config.updateMany(
        { name: ADSERVICE_AN },
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

const getByParams = async (query, limit = 10, offset = 0) =>
  db.models.AdServiceAN.find(query).limit(limit).skip(offset).exec();

const auth = async (params) => {
  const { url, id, secret } = params;

  const payload = {
    username: id,
    password: secret
  };

  const response = await fetch(url, {method:'POST', headers:{ HEADER_CONTENT_TYPE_JSON }, body:JSON.stringify(payload) }).then(data => data.json());
  return response || null;
};

const getOffers = async (params) => {
  partnerTalk('adServiceAN: get offers');
  const { url, token, offerDetailUrl } = params;

  const authToken = Buffer.from(token);
  const response = await fetch(url, {
    method:'GET', 
    headers:{ 
      HEADER_CONTENT_TYPE_JSON, 
      'Authorization': `Basic ${authToken.toString('base64')}` 
    } 
  })
  .then(data => data.json())
  .catch((err) => logger.error(`adServiceAN Get offer: ${err}`));
  const results = Promise.all(response.data.map(async (item) => {
    const redirectUrl = await fetch(offerDetailUrl.toString().replace(':id',item.id), {
      method:'GET', 
      headers:{ 
        HEADER_CONTENT_TYPE_JSON, 
        'Authorization': `Basic ${authToken.toString('base64')}` 
      } 
    })
    .then(data => data.json())
    .then(data => data.data.tracking_url)
    
    return {
      ...item,
      redirect_url: `${redirectUrl}&media_id=101234&sub={sessionId}`
    }
  }));
  return results;
};

const saveOffers = async (collection) => {
  try {
    const documents = collection.map((item) => ({
      allow_deeplink: item.allow_deeplink || null,
      application_status: item.application_status || null,
      approval_required: item.approval_required || null,
      approve_lead: item.approve_lead || null,
      begins: item.begins &&  moment(item.begins).toISOString() || moment().toISOString(),
      camp_title: item.camp_title || null,
      campaign_logo: item.campaign_logo || null,
      categories: item.categories.map(element => element.category_name) || [],
      cleanlink_url: item.cleanlink_url || null,
      redirect_url: item.redirect_url || null,
      comparisonfeed: item.comparisonfeed || null,
      cr: {
          "30days": item.cr["30days"] || null,
          "7days": item.cr["7days"] || null,
          "90days": item.cr["90days"] || null
      },
      currency: item.currency || null,
      description: cleanHtml(item.description) || null,
      epc: {
        "30days": item.epc["30days"] || null,
        "7days": item.epc["7days"] || null,
        "90days": item.epc["90days"] || null
      },
      exclusive: item.exclusive || null,
      expirestamp: item.expirestamp &&  moment(item.expirestamp).toISOString() || moment().add(6,'months').toISOString(),
      favorite: item.favorite || null,
      highest_prices: {
        lead: {
          agent_price: item?.highest_prices?.lead?.agent_price || null,
          descriptor: item?.highest_prices?.lead?.descriptor || null
        }
      },
      id: item.id,
      is_click: item.is_click || null,
      is_lead: item.is_lead || null,
      is_sale: item.is_sale || null,
      prices: {
        lead: {
          basic: {
            agent_price: item?.prices?.lead?.basic?.agent_price || null,
            descriptor: item?.prices?.lead?.basic?.descriptor || null,
            media_prices: item?.prices?.lead?.basic?.media_prices || []
          }
        }
      },
      primary_category_name: item.primary_category_name || null,
      productfeed: item.productfeed || null,
      rules: item.rules.map(element => ({
        active: element.active,
        description: cleanHtml(element.description),
        group: element.group,
        id: element.id,
        name: element.name,
        parameter: element.parameter
      })) || null,
      short_description: cleanHtml(item.short_description) || null,
      status: item.status || null,
      sub_types: item.sub_types.map(element => ({
        camp_id: element.camp_id,
        sub_type: element.sub_type,
        type: element.type
      })) || null
    }));

    partnerTalk(`adService: save offers: ${documents.length}`);
    if (documents.length > 0) {
      try {
        await db.models.AdServiceAN.insertMany(documents,{ordered:false, upsert:true}).catch((error) => {
          logger.error(error);
        });
      } catch (error) {
        logger.error(error);
      }
    }
    
  } catch(err) {
    logger.error(err);
  }

};

const closeDB = async () => {
  db.mongoose.close();
};

const prepareToExportOffers = async (limit, offset) => {
  const params = {
    $and:[
      {
        expirestamp: {$gt: moment().subtract(1,'day').startOf('day').toDate()}
      },
      {
        $or: [
          { description: { $exists: true, $ne: null } },
          { camp_title: { $exists: true, $ne: null } }
        ]
      }]
  };
  const sort = {
    cleanlink_url:-1
  };
  const collections = await db.models.AdServiceAN.find(params)
    .sort(sort)
    .limit(limit)
    .skip(offset)
    .exec();
  
  partnerTalk(`adServiceAN: prepare offers to export: ${collections.length}`);

  return adServiceANResponse(collections);
};

const cleanUpDatabase = () => {
  const filterA = {
    expirestamp: {$eq: null}
  };
  db.models.AdServiceAN.deleteMany(filterA).exec().then(() => {
    partnerTalk('finish delete old offers filterA');
  });
  const filterB = {
    expirestamp: {$lt: moment().startOf('day').toDate()}
  };
  db.models.AdServiceAN.deleteMany(filterB).exec().then(() => {
    partnerTalk('finish delete old offers filterB');
  });
};

const getCommissionReport = async (params) => {
  const { url, token, currentTime } = params;

  const query = `?to_date=${encodeURIComponent(moment(currentTime).endOf('month').toISOString())}&from_date=${encodeURIComponent(moment(currentTime).startOf('month').toISOString())}&group_by=sub&show_pending=1`;
  const authToken = Buffer.from(token);
  const response = await fetch(`${url}${query}`, {
    method:'GET', 
    headers:{ 
      HEADER_CONTENT_TYPE_JSON, 
      'Authorization': `Basic ${authToken.toString('base64')}` 
    } 
  })
  .then(data => data.json())
  .catch((err) => logger.error(err));
  return response || null;
}

const saveUnifyCommissionReport = async(lastReport) => {
  const documents = lastReport?.data?.rows?.map((item) => {
    const record = Object.create(UnifyCommissionData);
    
    record.clicked_url = null;
    record.partner_name = ADSERVICE_AN;
    record.custom_id =  item?.sub || null;
    record.date = item?.date_min || null;
    record.page_url = item?.url || null;
    record.platform = item?.medianame || null;
    record.user_agent = item?.user_agent || null;
    record.user_country = item?.countrycode || null;
    record.merchant_details = {
      id: null,
      name: item?.camp_title || null
    };
    record.transaction_details = {
      aggregation_id: null,
      basket: {
        commission_type: null,
        currency: null,
        items: item?.camp_title || null,
        order_amount: null,
        publisher_amount: item?.sale_rev || null
      },
      invoice_id: null,
      last_updated: item?.stamp || null,
      payment_status: null,
      status: null,
      transaction_date: item?.stamp || null
    };
    return record;
  });
  documents.forEach(async item => {
    const query = {
      date: item?.date || null,
      custom_id: item?.custom_id || null
    };
    const exist = await db.models.UnifyCommissionReport.findOne(query,{_id:1}).count();
    if(!exist) {
      db.models.UnifyCommissionReport.insertMany(item)
      //.catch(err => logger.error(err))
      .then(data=>data);
    }
  })
};

const getOfferDetail = async (params) => {
  const { url, token, id } = params;

  const authToken = Buffer.from(token);
  const response = await fetch(url.replace(':id', id), {
    method:'GET', 
    headers:{ 
      HEADER_CONTENT_TYPE_JSON, 
      'Authorization': `Basic ${authToken.toString('base64')}` 
    } 
  })
  .then(data => data.json())
  .catch((err) => logger.error(err));
  return response || null;
};

const getVouchers = async (params) => {
  const { url, token, id } = params;

  const authToken = Buffer.from(token);
  const response = await fetch(url.replace(':id', id), {
    method:'GET', 
    headers:{ 
      HEADER_CONTENT_TYPE_JSON, 
      'Authorization': `Basic ${authToken.toString('base64')}` 
    } 
  })
  .then(data => data.json())
  .catch((err) => logger.error(err));
  return response || null;
};

const run = async (countryIndex = 0) => {
  partnerTalk(`adServiceAN: start service`);
  const items = await configController.getByParams({ name: ADSERVICE_AN });

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

  if(!running) await cleanUpDatabase();

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
      logger.error('AdServiceAN: null from auth');
      configController.update({ _id }, { running: false });
      return;
    }
  }

  const param = {
    url:otherParams[0].statiscticUrl, 
    token: `${accessToken.data.pid}:${accessToken.data.login_token}`,
    currentTime: moment().subtract(1,'month')
  };
  const commissionReport = await getCommissionReport(param);
  saveUnifyCommissionReport(commissionReport);

  // const param = {
  //   url:otherParams[0].vouchersUrl, 
  //   token: `${accessToken.data.pid}:${accessToken.data.login_token}`
  // };
  // const vouchers = await getVouchers(param);
  // console.log(vouchers);

  const offersParams = {
    token: `${accessToken.data.pid}:${accessToken.data.login_token}`,
    offerDetailUrl: otherParams[0].offerDetailUrl,
    url: partnerUrlToOffer,
    limit: offersLimit,
    offset: offersOffset,
    sortBy: 'id',
    sort_dir: 'desc'
  };

  const queryParams = {
    country: countryCode[countryIndex]
  };

  const offers = await getOffers(offersParams, queryParams).then(data => data);

  if (offers && offers.length > 0) {
    await saveOffers(offers);
  };

  partnerTalk('finish and reset offset');
  db.models.Config.updateOne({ name:ADSERVICE_AN }, { offersOffset:0, running: false }).exec();
  db.models.Config.updateOne({
    name:EXPORT_TO_API, 
    'otherParams.apiName':ADSERVICE_AN
  },{
    running: false,
    'otherParams.$.offset':0
  }).exec();
  accessToken = null;
};

module.exports = { run, getByParams, prepareToExportOffers, closeDB, getCommissionReport, getOfferDetail, getVouchers };
