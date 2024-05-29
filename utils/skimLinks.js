// const fetch = require('node-fetch');
const moment = require('moment');
const fs = require('fs');
const myFetch = require('../services/myFetch');

const { SKIM_LINKS } = require('../constants/partnersName');

const { TALK_TIMEOUT_MINUTES } = Object.freeze({
  TALK_TIMEOUT_MINUTES: 5
});

const { HEADER_CONTENT_TYPE_JSON } = require('../constants/httpHeader');

const { DOMAIN_SOURCE_FILE_SKIMLINKS } = require('../constants/domainSourceFileSkimLinks');

const db = require('../models/index');
const configController = require('../controllers/ConfigController');
const logger = require('../services/logger');

const partnerTalk = (talk) => {
    try {
      db.models.Config.updateMany(
        { 
          name: SKIM_LINKS
        },
        {
          $push: {
            partnerTalk: {text:talk}
          }
        }
      ).exec().catch(error=>logger.error(error)).then(() => {
        db.models.Config.updateMany(
          { 
            name: SKIM_LINKS
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
  
const getMerchantData = async (merchantId) => {
  if(!merchantId) return null;
  partnerTalk(`sl: start get merchant data`);
  const items = await configController.getByParams({ name: SKIM_LINKS });

  const {
    otherParams
  } = items[0];

  const {
    accessToken,
    merchantInfoUrl
  } = otherParams[0];

  const url = `${merchantInfoUrl}?access_token=${accessToken}&merchant_id=${merchantId}`;
  const headers = {...HEADER_CONTENT_TYPE_JSON};
  const response = await myFetch(url, {headers}).then((res) => res.json());
  if (!response) return null;
  return response;
};


const getMerchantIdByDomain = async(domain) => {
  const items = await configController.getByParams({ name: SKIM_LINKS });

  const {
    otherParams
  } = items[0];

  const {
    accessToken,
    merchantDomainInfoUrl
  } = otherParams[0];
  
  const url = `${merchantDomainInfoUrl}?access_token=${accessToken}`;
  let dataFile = null;
  let merchantId = null;
  try {
    
    if(fs.existsSync(DOMAIN_SOURCE_FILE_SKIMLINKS))
      dataFile = JSON.parse(fs.readFileSync(DOMAIN_SOURCE_FILE_SKIMLINKS));
      
    if(!dataFile && dataFile.filter((item) => item === domain)) {
      const domains = await myFetch(url).then((res) => res.json());
      if(domains){
        fs.writeFileSync(DOMAIN_SOURCE_FILE_SKIMLINKS, JSON.stringify(domains.domains));
        dataFile = domains.domains;
      };
    };
      
    if(dataFile)
      merchantId = dataFile?.filter((item) => item.domain.includes(domain)) || null;
      
      if(merchantId.length > 0) merchantId = merchantId[0].merchant_id;
  
    } catch (err) {
      logger.warning(`[skimLinks] getMerchantIdByDomain ${err?.message}`, err);
    }
    return merchantId;  
  };
  
const getSkimLinksStoreInformation = async (domain) => {
  let storeInformation = null;
  const storeId = await getMerchantIdByDomain(domain) || null;
  if(typeof storeId === 'number') {
    storeInformation = await getMerchantData(storeId) || null;
  }
  if(storeInformation?.merchants?.length > 0) 
    storeInformation = storeInformation.merchants;
  return storeInformation && storeInformation[0] || null;
};
  
module.exports = {
  getMerchantData,
  getMerchantIdByDomain,
  getSkimLinksStoreInformation
}