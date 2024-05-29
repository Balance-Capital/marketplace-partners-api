const xml2js = require('xml2js');
const moment = require('moment');

const { HEADER_CONTENT_TYPE_JSON } = require('../constants/httpHeader');
const { COMMISSION_JUNCTION } = require('../constants/partnersName');

const { TIMEOUT } = Object.freeze({
    TIMEOUT: 15000
});

const { TALK_TIMEOUT_MINUTES } = Object.freeze({
  TALK_TIMEOUT_MINUTES: 5
});

let CJ_TIMEOUT_COUNTER = 0;
const CJ_TIMEOUT_COUNTER_MAX = 3;

const { 
    ADVERTISER_LOOKUP, 
    LINK_SEARCH
  } = Object.freeze({
    ADVERTISER_LOOKUP: 'advertiser-lookup',
    LINK_SEARCH: 'link-search'
});

const db = require('../models/index');
const { api } = require('../services/__api');
const configController = require('../controllers/ConfigController');
const logger = require('../services/logger');

const partnerTalk = (talk) => {
    try {
      db.models.Config.updateMany(
        { 
          name: COMMISSION_JUNCTION
        },
        {
          $push: {
            partnerTalk: {text:talk}
          }
        }
      ).exec().catch(error=>logger.error(error)).then(() => {
        db.models.Config.updateMany(
          { 
            name: COMMISSION_JUNCTION
          },
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
  
const getData = async ({ url, token, result, id }) => {

    const successCallback = () => {
      if(id)
        configController.update({ _id:id }, { running: false });
    };
  
    const errorCallback = async (error) => {
      partnerTalk(`errorCallback: ${JSON.stringify(error)}`);
  
      CJ_TIMEOUT_COUNTER+=1;
      if(CJ_TIMEOUT_COUNTER < CJ_TIMEOUT_COUNTER_MAX) {
        setTimeout(() => {
          configController.update({ _id:id }, { running: false });
        }, TIMEOUT);
      };
    };
    const headers = {...HEADER_CONTENT_TYPE_JSON,'Authorization': `Bearer ${token}`};
    const response = await api({ 
      url, 
      headers, 
      method: 'GET', 
      errorCallback, 
      successCallback 
    });
    if (!response) return null;
  
    return xml2js
      .parseStringPromise(response.data)
      .catch((err) => {
        logger.error(err.response.status);
        return false;
      })
      .then((xml) => {
        let results;
  
        switch (result) {
          case LINK_SEARCH:
            results = xml['cj-api'].links;
            break;
          case ADVERTISER_LOOKUP:
            results = xml['cj-api'].advertisers[0].advertiser;
            break;
          default:
            results = xml['cj-api'];
        }
  
        return results || null;
      });
  };

module.exports = {
    getData
}