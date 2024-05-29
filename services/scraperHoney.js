/* eslint-disable consistent-return */
/* eslint-disable no-continue */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-await-in-loop */
const fs = require('fs');
const fetch = require('node-fetch');
const moment = require('moment');
const cheerio = require('cheerio');
const { getCountry } = require('tld-countries');

const {
  CURRENCY,
  PERCENTAGE
} = require('../constants/offersValueType');

const { 
  IMAGE_TYPE_STORE_LOGO
} = require('../constants/imageType');

const {
  SCRAPER_HONEY
} = require('../constants/partnersName');

const offer = require('../objects/Offer');

const URL = 'http://143.198.141.229:8080/generate?site=';

const exceptStores = ['sephora-france','adidas-france', 'autodoc'];

const reportFile = 'resources/private/scraper-report.csv';
const storesFile = 'resources/private/honeyStores.txt';
const pidFile = 'resources/private/scraperHoney.pid';
const reportInsertStoresFile = 'resources/private/insertStores.csv';
const indexInsertStoresFile = 'resources/private/indexInsertStoresFile.txt';
const indexInsertOffersFile = 'resources/private/indexInsertOffersFile.txt';
const COUNTRIES = require('../constants/countries.json');

const existsIndexStores = fs.existsSync(indexInsertStoresFile)
if(!existsIndexStores) fs.writeFileSync(indexInsertStoresFile,'0')
const existsIndexOffers = fs.existsSync(indexInsertOffersFile)
if(!existsIndexOffers) fs.writeFileSync(indexInsertOffersFile,'0')
const indexInsertStore = parseInt(fs.readFileSync(indexInsertStoresFile).toString('utf8'), 10) || 0;
const indexInsertOffers = parseInt(fs.readFileSync(indexInsertOffersFile).toString('utf8'), 10) || 0;

const { uploadObject } = require('./spaceDigitalOcean');
const apiDb = require('../models/apiDatabase');
const logger = require('./logger');
const { importUnifyOffers } = require('../controllers/ExportsOffersController');
const { getSkimLinksStoreInformation } = require('../utils/skimLinks');

const streamToString = require('../utils/streamToString');
const { getOriginDomain } = require('../utils/getOriginDomain');
const { getImageFromRemoteServer } = require('../utils/remoteFiles');
const { getAdvertiseCategories } = require('../response/CommissionJunctionProductsResponse');
const myFetch = require("./myFetch");

const addNewOrUpdateOffer = async(importedOffer, store) => {
  const value = importedOffer.meta.percentOff ? importedOffer.meta.percentOff : importedOffer.meta.dollarOff || null; 
  const countryInfo =
  store.country &&
  COUNTRIES.filter(
    (country) =>
      country.name === store.country.toUpperCase()
  );  
  const unifyImportedData = Object.create(offer);
  unifyImportedData.categories = store.categories || null;
  unifyImportedData.code = importedOffer.code || null;
  unifyImportedData.countryCode = (countryInfo && countryInfo[0] && [countryInfo[0].code]) || ['XX'];
  unifyImportedData.country = (countryInfo && countryInfo[0] && countryInfo[0].name) || null;
  unifyImportedData.currency = '$';
  unifyImportedData.value = value && value.replace(/\$|%/gui,'')  || null;
  unifyImportedData.valueType = importedOffer.meta.percentOff ? PERCENTAGE : CURRENCY;
  unifyImportedData.verified = false;
  unifyImportedData.validDate = moment(importedOffer.created).add(45,'days').toDate();
  unifyImportedData.startDate = moment(importedOffer.created).toDate();
  unifyImportedData.image = null;
  unifyImportedData.savingType = null;
  unifyImportedData.storeUrl = null;
  unifyImportedData.title = importedOffer.title || importedOffer.description || importedOffer.generatedDescription || null;
  unifyImportedData.shortTitle = null;
  unifyImportedData.description = importedOffer.description || importedOffer.generatedDescription || null;
  unifyImportedData.origin = store.domain || null;
  unifyImportedData.domains = store.domains || null;
  unifyImportedData.originId = parseInt(importedOffer.dealId, 10) || null;
  unifyImportedData.redirectUrl = importedOffer.url || `https://${store.domain}` || null;
  unifyImportedData.merchantId = null;
  unifyImportedData.stars = importedOffer.rank*5 || 1;
  unifyImportedData.advertiserName = store.name || null;
  unifyImportedData.checked.httpStatus = null;
  unifyImportedData.checked.timeRequest = null;
  unifyImportedData.checked.date = null;
  unifyImportedData.partnerSource = SCRAPER_HONEY;   
  importUnifyOffers([unifyImportedData]);
};

const countOffers = (limit, offset) => {
  apiDb.apiDatabase.model('Stores', apiDb.models.Stores.schema)
  .find({},{name:1}).sort({_id:1}).limit(limit).skip(offset).exec().then((stores) => {
    stores.forEach(async(store) => {
      const storeName = store.name.toLowerCase().replace(/ /gu, '-');
      const url = `${URL}${storeName}`;
      fetch(url).then(async (response) => {
        const data = await response.json();
        const offerCounter = data[storeName].length || 0;
        fs.appendFileSync(reportFile,`"${storeName}","${offerCounter}","yes"\r\n`);
        countOffers(limit, offset+1)
      }).catch((err) => {logger.error(err);fs.appendFileSync(reportFile,`"${storeName}","0","no"\r\n`);countOffers(limit, offset+1)})
    })
  })
}

const getFromScraper = (limit, offset) => {
  fs.writeFileSync(indexInsertOffersFile, offset.toString())  
  apiDb.apiDatabase.model('Stores', apiDb.models.Stores.schema)
  .find().sort({_id:1}).limit(limit).skip(offset).exec().then((stores) => {
    if(stores.length === 0) {
      fs.writeFileSync(indexInsertOffersFile, '0');
      process.exit();
    }
    stores.forEach((store) => {
      const storeName = store?.name?.toLowerCase()?.replace(/ /gu, '-')?.trim() || null;
      if(storeName) {
        const url = `${URL}${encodeURIComponent(storeName)}`;
        fetch(url).then(async (response) => {
          getFromScraper(limit,offset+1);
          const data = await response.json();
          console.log(storeName, offset, `status: ${data?.response || response?.status || null}`, `import-offers: ${data[storeName]?.length}`);
          if(data?.response === 404 || response?.status !== 200) return;
          data[storeName]?.forEach((item) => {
            addNewOrUpdateOffer(item, store);  
          });
        }).catch(err => logger.error(err));  
      } else {
        getFromScraper(limit,offset+1);
      }
    });
  });
}

const getStoreInfoFromHoney = async (store) => {
  let body = null;
  try {
    body = await myFetch(`https://www.joinhoney.com/shop/${store}?type=seo`).then(async (res) => {
      const stream = await streamToString(res.body);
      if(!stream) return null;
      let logo = null;
      let sameAs = null;
      let description = null;
      let name = null;
      const dom = cheerio.load(stream);
      const script = dom('script[type="application/ld+json"]');
      const json = JSON.parse(script[0].children[0].data);

      if(json?.logo) {
        logo = json?.logo?.url || null
      };
    
      if(json?.sameAs) {
        sameAs = json?.sameAs || null
      };

      if(json?.description) {
        description = json?.description || null
      };

      if(json?.name) {
        name = json?.name || null
      };    

      return {sameAs, logo, description, name};
    });

  } catch (error) {
    logger.error(error)
  }
  return body;
}

const getDescriptionFromWebsite = async (url) => {
  let body = null;
  try {
    body = await myFetch(url).then(async (res) => {
      const stream = await streamToString(res.body);
      if(!stream) return null;
      let description = null;
      const dom = cheerio.load(stream);
      description = dom('meta[name="description"]');
      return description[0]?.attribs?.content || null;
    });
  } catch (error) {
    logger.error(error)
  }
  return body;
}

const insertStore = async (insertData) => {
  try {
    const result = await apiDb.apiDatabase.model('Stores', apiDb.models.Stores.schema).insertMany(insertData).catch((err) => logger.error(err));
    return result;
  } catch (err) {
    logger.error(err);
    return false;
  }
}

const domainToCountry = (domain) => {
  const country = getCountry(domain);
  if(country) {
    const code = COUNTRIES.filter((item) => item.name === country.toUpperCase())
    return [{
      country,
      code: code[0]?.code,
      domain
    }];
  };
  const countries = [
    {domain: 'com', country: 'United States', code: 'US'},
    {domain: 'us', country: 'United States', code: 'US'},
    {domain: 'fr', country: 'France', code: 'FR'},
    {domain: 'uk.com', country: 'Great Britain', code: 'GB'},
    {domain: 'uk', country: 'Great Britain', code: 'GB'},
    {domain: 'de', country: 'Germany', code: 'DE'},
    {domain: 'nl', country: 'Netherlands', code: 'NL'},
    {domain: 'es', country: 'Spain', code: 'ES'},
    {domain: 'it', country: 'Italy', code: 'IT'},
    {domain: 'pt', country: 'Portugal', code: 'PT'}
  ];
  const result = [countries.filter((element) => element.domain === domain)[0]] || [];
  if(!result.length) {
    return [{domain: 'com', country: 'United States', code: 'US'}];
  }
  return result;
} 

const runUpdateStore = async () => {

  const stores = fs.readFileSync(storesFile).toString('utf8');
  if(!stores) return null;
  const storesArray = stores.split('\n');
  for( let x=indexInsertStore; x<storesArray.length; x+=1 ) {
    try {
      // get information about store from honey
      const store = storesArray[x];
      console.log('Record name', store, 'index', x);
      if(exceptStores.includes(store)) continue;
      const infoFromHoney = await getStoreInfoFromHoney(store);
      let domain = null;
      if(infoFromHoney?.sameAs) {
        const pureDomain = infoFromHoney?.sameAs?.replace(/https:\/\/|http:\/\//gui,'') || null;
        if(pureDomain) {
          const toSlash = pureDomain.indexOf('/');
          domain = (toSlash!==-1) ? pureDomain.substring(0, toSlash) : pureDomain;
          domain = getOriginDomain(domain);  
        }
      }

      // is store exists?
      if(!domain) continue;
      const country = domainToCountry(domain.substring(domain.indexOf('.')+1))[0];
      const storeExists = await apiDb.apiDatabase.model('Stores', apiDb.models.Stores.schema).findOne({domain},{_id:1}).exec().then((result) => !!result);
      if(storeExists) {
        fs.appendFileSync(reportInsertStoresFile,`"${store}","${domain}","true","${moment().toISOString()}"\r\n`);
        fs.writeFileSync(indexInsertStoresFile, x.toString());
        continue;
      }
      fs.appendFileSync(reportInsertStoresFile,`"${store}","${domain}","false","${moment().toISOString()}"\r\n`);

      // get information about store from skimlinks 
      const storeDataFromSkimLink = await getSkimLinksStoreInformation(domain) || null;

      const insertData = {
        logo: infoFromHoney?.logo,
        description: infoFromHoney?.description || storeDataFromSkimLink?.description || null,
        name: infoFromHoney?.name?.replace(/Coupons|Promo|Codes| and |Deals|,/gui,'').trim() || storeDataFromSkimLink?.name || null, 
        domain,
        countries: storeDataFromSkimLink?.countries || [country?.country] || [],
        averageCommissionRate: storeDataFromSkimLink?.averageCommissionRate || null,
        categories: storeDataFromSkimLink?.categories || [],
        partnerSource: SCRAPER_HONEY,
        skimLinksId: null,
        priority: 11,
        domains: [domain],
        country: country?.code || null,
        epc:null,
        averageBasketSize: null,
        averageConversionRate: null,
        specialRateType: null,
        offers: [],
        faq: [],
        aboutOffers: null,
        meta: null,
        offersScore: {},
        seo: {
          contentLength: 0
        },
        star: 3,
        indexing: false,
        isActive: false
      }

      // upload logo
      const nameOfRemoteFile = insertData.name.replace(/\.|-|\s+/gui,'_');
      if(insertData.logo) {
        const imageLink = insertData.logo;
        const remoteFile = await getImageFromRemoteServer(imageLink, nameOfRemoteFile, IMAGE_TYPE_STORE_LOGO);
        const params = {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: remoteFile.pathAndName,
          Body: remoteFile.fileData,
          ACL: "public-read",
          CacheControl: 'public,max-age=864000'
        };
        if(remoteFile.fileData) {
          uploadObject(params);  
          insertData.logo = remoteFile.pathAndName;
        };   
      }
      
      // update description
      // insertData.description = !insertData?.description?.length
      //   ? await getDescriptionFromWebsite(infoFromHoney?.sameAs) || null
      //   : null;

      // categories 
      insertData.categories = !insertData?.categories?.length 
        ? (await getAdvertiseCategories(insertData?.name))?.filter((element) => !['Clothing/Apparel', "Children's"].includes(element)) 
        : [];

      fs.writeFileSync(indexInsertStoresFile, x.toString());
      insertStore(insertData);
    } catch(error) {
      logger.error(error);
    }

  }
}

if(process.argv[2] === 'import-offers') {
  fs.writeFileSync(pidFile, process.pid.toString());
  getFromScraper(1, indexInsertOffers);
};

if(process.argv[2] === 'count') {
  fs.writeFileSync(pidFile, process.pid.toString());
  fs.appendFileSync(reportFile,`"Store Name","Count offers","Exists"\r\n`);
  countOffers(1, 0)
};

if(process.argv[2] === 'import-stores') {
  const reportFileExists = fs.existsSync(reportInsertStoresFile);
  if(!reportFileExists)
    fs.appendFileSync(reportInsertStoresFile,`"Store Name","domain","Exists","timestamp"\r\n`);
  fs.writeFileSync(pidFile, process.pid.toString());
  runUpdateStore()
};

if(process.argv[2] === 'stop') {
  const pid = fs.readFileSync(pidFile).toString('utf8');
  process.kill(parseInt(pid, 10), 'SIGHUP');
  process.exit();
};

module.exports = {
  getFromScraper,
  countOffers,
  domainToCountry
};
