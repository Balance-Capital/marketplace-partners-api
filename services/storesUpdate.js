/* eslint-disable no-continue */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-console */
require('dotenv').config();
const fs = require('fs');
const puppeteer = require('puppeteer');
// const moment = require('moment');
const ShortUniqueId = require('short-unique-id');
const COUNTRIES = require('../constants/countries.json');

// const DELAY_DAYS_CHECKING_AGAIN = 7;
const { DOMAIN_SOURCE_FILE_SKIMLINKS } = require('../constants/domainSourceFileSkimLinks');

const { 
  IMAGE_TYPE_STORE_LOGO
} = require('../constants/imageType');

// const {
//   DEFAULT_IMAGE_STORE
// } = require('../constants/defaultImageStore');

const TEST = false;

const pidFile = 'resources/private/storesUpdate.pid'

const { domainToCountry } = require('./scraperHoney');
const { getOriginDomain } = require('../utils/getOriginDomain');
const { getAdvertiseCategories } = require('../response/CommissionJunctionProductsResponse');
const { getMerchantData, getMerchantIdByDomain, getSkimLinksStoreInformation } = require('../utils/skimLinks');

const { uploadObject } = require('./spaceDigitalOcean');
const { getImageFromRemoteServer } = require('../utils/remoteFiles');

const apiDb = require('../models/apiDatabase');

const logger = require('./logger');

const myFetch = require("./myFetch");

const args = [
  '--window-size=1600,1080',
  '--no-sandbox',
  '--disable-gpu',
  '--disable-setuid-sandbox',
  '--disable-features=site-per-process',
  '--disable-infobars',
  '--window-position=0,0',
  '--ignore-certifcate-errors',
  '--ignore-certifcate-errors-spki-list'
];

const options = {
  args,
  defaultViewport: {
    height: 980,
    width: 1580
  },
  headless: !TEST,
  executablePath: TEST ? process.env.CHROMIUM_PATH || null : null,
  devtools: !TEST,
  ignoreHTTPSErrors: true,
  userDataDir: './tmp'
};

let browser = null;

(async () => {
  console.log(`start browser`);
  browser = await puppeteer.launch(options);
  fs.writeFileSync(pidFile, process.pid.toString());
})();

// --- util ---

const crawler = async (url) => {  
  let page = null;
  try {
    page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36');
    
    const response = await page.goto(url);

    const timing = response.timing();
    const status = response.status();
    const chain = response.request().redirectChain();

    const description = await page.evaluate(() => document.querySelector('meta[name=description]').content);

    const log = {
      chain, status, timing: {requestTime: timing.requestTime}, url, description
    }

    await page.close();
    return log;
  } catch (err) {
    if(page) await page.close();
    return {
      chain:[], 
      status:0, 
      timing: {
        requestTime: 0
      }, 
      url
    }
  };
};

const fixImageExt = (img) => {
  if(!img) return null;
  const ext = img.substring(img.lastIndexOf('.')+1);
  if(ext.match(/�/)) {
    const path = img.substring(0, img.lastIndexOf('/'));
    const newExt = img.substring(img.lastIndexOf('_')+1).replace(/\..*/,'');
    const fileName = new ShortUniqueId({ length: 10 })();
    const pathFileNameExt = `${path}/${fileName}.${newExt}`
    return pathFileNameExt;
  };
  return img;
};

const stop = () => {
  const pid = fs.readFileSync(pidFile).toString('utf8');
  process.kill(parseInt(pid, 10), 'SIGHUP');
  process.exit();  
};

// ----
// const checkImage = async (pathToImage) => {
//   try {
//     if(pathToImage.match(/default/gui)) {
//       // const imageExist = await fetch(`${process.env.IMAGE_HOST_CDN}/${pathToImage}`, { signal: AbortSignal.timeout(15000) }).then((response) => response.status >=200 && response.status < 300 ? 1 : 0);
//       // return imageExist;
//       return 0;
//     };
//     const imageExist = await myFetch(`${process.env.IMAGE_HOST_CDN}/${pathToImage}`).then((response) => response.status >=200 && response.status < 300 ? 1 : 0);
//     return imageExist;
//   } catch(err) {
//     logger.error(err);
//     return 0;
//   }
// };

// const storesData = async (limit, offset) => {
//   const data = await apiDb.apiDatabase.model('Stores', apiDb.models.Stores.schema).find({
//     offers: {$ne: []},
//     $or: [
//       { categories: [] },
//       { categories: null },
//       {'checked.date': {$lte: moment().subtract(DELAY_DAYS_CHECKING_AGAIN, 'days').toDate()}},
//       {'checked.date': {$exists: false}}
//     ]
//   })
//     .sort({_id: 1})
//     .skip(offset)
//     .limit(limit)
//     .exec();
//   return data;
// };

// const getMerchantIdByDomain = async(domain) => {
//   const url = 'https://merchants.skimapis.com/v4/publisher/185785/domains?access_token=147928:1625744250:2aa52d4413ab084ec2e9e368a463e8b8';
//   let dataFile = null;
//   let merchantId = null;
//   try {
  
//     if(fs.existsSync(DOMAIN_SOURCE_FILE_SKIMLINKS))
//       dataFile = JSON.parse(fs.readFileSync(DOMAIN_SOURCE_FILE_SKIMLINKS));
    
//     if(!dataFile) {
//       const domains = await myFetch(url).then((res) => res.json());
//       if(domains){
//         fs.writeFileSync(DOMAIN_SOURCE_FILE_SKIMLINKS, JSON.stringify(domains.domains));
//         dataFile = domains.domains;
//       };
//     };
    
//     if(dataFile)
//       merchantId = dataFile?.filter((item) => item.domain.includes(domain)) || null;
    
//     merchantId = (merchantId.length > 0) 
//       ? merchantId[0].merchant_id
//       : null;

//   } catch (err) {
//     logger.warning(`[storesUpdate] getMerchantIdByDomain ${err?.message}`, err);
//   }
//   return merchantId;  
// };

// const getSkimLinksStoreInformation = async (domain) => {
//   let storeInformation = null;
//   const storeId = await getMerchantIdByDomain(domain) || null;
//   if(storeId) {
//     storeInformation = await getMerchantData(storeId) || null;
//   }
//   if(storeInformation?.merchants?.length > 0) 
//     storeInformation = storeInformation.merchants;
//   return storeInformation && storeInformation[0] || null;
// };

// --- mains functions ---

/**
 * update :
 * - logo
 * - description
 * - categories
 * - country in shop
 * - countryCode in offer
 * - commission
 */

const descriptionField = async (limit=10, offset=0) => {
  const storesDescription = await apiDb.apiDatabase.model('Stores', apiDb.models.Stores.schema).find({
    $or:[
      { description: null }
    ],
    isActive: true, 
    offers:{$ne: []},
    // 'checked.date': {
    //   $exists: false,
    //   $lte: moment().subtract(DELAY_DAYS_CHECKING_AGAIN, 'days').toDate()
    // }
  },{_id:1, name:1, domain:1, description:1}).sort({domain:1}).limit(limit).skip(offset).exec();
  
  if(!storesDescription.length) {
    process.exit();
  }

  for(const element of storesDescription) {
    try {
      const description = !element?.description?.length
        ? (await crawler(`http://${element?.domain}`)).description || null
        : element?.description || null;

      console.log(element?.description, description);
      
      if(!description) continue;

      const result = await apiDb.apiDatabase.model('Stores', apiDb.models.Stores.schema).updateOne({_id: element._id}, {
        description
        // $set: {
        //   'checked.date': moment().toDate()
        // }
      }).exec().catch((err) => { throw new Error(err); });  
        const log = {
          domain: element?.domain,
          description,
          result
        }
        console.log(log)
    } catch (err) {
      logger.warning(`[storesUpdate] descriptionField ${err?.message}`, err);
      // descriptionField(limit, offset+limit);    
    }
  }
  descriptionField(limit, offset+limit);    
};

const categoriesField = async (limit=10, offset=0) => {
  // await apiDb.apiDatabase.model('Stores', apiDb.models.Stores.schema)
  //   .find({
  //     $or:[
  //       { categories: [] },
  //       { categories: null }
  //     ]  
  //   },{_id:1, name:1, domain:1, categories:1}).sort({domain:1}).limit(limit).skip(offset).exec().then(async (results)=>{
  //     const update = [];
  //     for(const item of results) {
  //       const categories = item.categories.filter((element) => element);
  //       console.log(item._id, item.categories, categories)
  //       const oneUpdate = await apiDb.apiDatabase.model('Stores', apiDb.models.Stores.schema)
  //         .updateOne({_id:item._id}, {
  //           categories
  //         }).exec();
  //       update.push(oneUpdate);
  //     }
  //     return update;
  // });

  const storesWithoutCategories = await apiDb.apiDatabase.model('Stores', apiDb.models.Stores.schema).find({
    isActive: true
    // $or:[
    //   { categories: [] },
    //   { categories: null }
    // ]
    // 'checked.date': {
    //   $exists: false,
    //   $lte: moment().subtract(DELAY_DAYS_CHECKING_AGAIN, 'days').toDate()
    // }
  },{_id:1, name:1, domain:1, categories:1}).sort({domain:1}).limit(limit).skip(offset).exec();
  
  if(!storesWithoutCategories.length) {
    process.exit();
  }

  for(const element of storesWithoutCategories) {
    try {
      const categories = await getAdvertiseCategories(element?.name);
      console.log(element?.name, element.categories, categories);
      if(!categories.length) continue;
      const result = await apiDb.apiDatabase.model('Stores', apiDb.models.Stores.schema).updateOne({_id: element._id}, {
        categories
        // $set: {
        //   'checked.date': moment().toDate()
        // }
      }).exec().catch((err) => { throw new Error(err); });  
      const log = {
        domain: element?.domain,
        categories,
        result
      }
      console.log(log)
    } catch (err) {
      logger.warning(`[storesUpdate] categoriesField ${err?.message}`, err);
      // categoriesField(limit, offset+limit);    
    }
  }
  categoriesField(limit, offset+limit);    
};

const logoStoreField = async (limit=10, offset=0) => {
  const storesWithoutLogo = await apiDb.apiDatabase.model('Stores', apiDb.models.Stores.schema).find({
    $or:[
      { logo: null },
      { logo: /default/gui }
    ]
    // ,
    // 'checked.date': {
    //   $exists: false,
    //   $lte: moment().subtract(DELAY_DAYS_CHECKING_AGAIN, 'days').toDate()
    // }
  },{_id:1, logo:1, domain:1}).sort({name:1}).limit(limit).skip(offset).exec();

  if(!storesWithoutLogo.length) {
    process.exit();
  }

  for(const element of storesWithoutLogo) {
    try {
      const storeInformation = await getSkimLinksStoreInformation(element?.domain);
      if(!storeInformation) continue;
      const {logo} = storeInformation?.metadata || null;
      if(!logo) continue;
      const fileName = logo.toString().substring(logo.lastIndexOf('/')+1) || null;
      const remoteFile = await getImageFromRemoteServer(logo, fileName, IMAGE_TYPE_STORE_LOGO);
      remoteFile.pathAndName = fixImageExt(remoteFile.pathAndName);
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: remoteFile.pathAndName,
        Body: remoteFile.fileData,
        ACL: "public-read",
        CacheControl: 'public,max-age=864000'
      };

      if(!remoteFile.fileData && !remoteFile.fileName) continue;  

      if(remoteFile.fileData) await uploadObject(params);  

      await apiDb.apiDatabase.model('Stores', apiDb.models.Stores.schema).updateOne({_id: element._id}, {
        logo: remoteFile.pathAndName
        // $set: {
        //   'checked.date': moment().toDate()
        // }
      }).exec().then((result) => {
        const log = {
          domain: element?.domain,
          remote: remoteFile?.pathAndName,
          logo,
          result
        }
        console.log(log)  
      }).catch((err) => { throw new Error(err); });  
    } catch (err) {
      const log = {
        err,
        domain: element?.domain
      }
      console.log(log)  
      logger.warning(`[storesUpdate] logoStoreField ${err?.message}`, err);
      // logoStoreField(limit, offset+limit);    
    }
  };
  logoStoreField(limit, offset+limit);    
};

const countryField = async (limit=10, offset=0) => {
  const stores = await apiDb.apiDatabase.model('Stores', apiDb.models.Stores.schema).find({
    $or:[
      { country: null },
      { countries: null },
      { countries: [] }
    ]
  },{_id:1, countries:1, domain:1, country: 1, offers:1}).sort({name:1}).limit(limit).skip(offset).exec();
  
  if(!stores.length) {
    process.exit();
  }
  
  for(const element of stores) {
    try {
      const domain = getOriginDomain(element?.domain);
      const countryFromDomain = domainToCountry(domain.substring(domain.lastIndexOf('.')+1))[0];
      let countries = [];
      let country = 'XX'
      if(countryFromDomain) {
        countries = [countryFromDomain?.country] || [];
        country = countryFromDomain?.code || 'XX';
      } else {
        const storeInformation = await getSkimLinksStoreInformation(domain);
        if(storeInformation) {
          countries = storeInformation?.countries || [];
          if(countries.length) {
            country = countries.filter((item) => item?.toString().toLowerCase() === 'united states').length 
            ? 'US' 
            : COUNTRIES.filter((item) => item.name?.toString().toLowerCase() === countries[0]?.toString().toLowerCase())[0]?.code || 'XX';
          }
        };
      };

      await apiDb.apiDatabase.model('Stores', apiDb.models.Stores.schema).updateOne({_id: element._id}, {
        countries,
        country
        // $set: {
        //   'checked.date': moment().toDate()
        // }
      }).exec().then((result) => {
        const log = {
          domain,
          result
        }
        console.log(log)
      }).catch((err) => { throw new Error(err); });  
    } catch (err) {
      const log = {
        err
      }
      console.log(log)  
      logger.warning(`[storesUpdate] countryField ${err?.message}`, err);
      // countryField(limit, offset+limit);    
    }
  }
  countryField(limit, offset+limit);
};

const offerCountryCodeField = async (limit=10, offset=0) => {
  const stores = await apiDb.apiDatabase.model('Stores', apiDb.models.Stores.schema).find({
    'offers': { $ne: [] },
    $or: [
      // {'offers.countryCode': 'XX'},
      {'offers.countryCode': null}
    ]
  },{_id:1, countries:1, domain:1, country: 1, offers:1}).sort({name:1}).limit(limit).skip(offset).exec();
  if(!stores.length) process.exit();
  for(const element of stores) {
    try {
      const {offers} = element;
      for(const offer of offers) {
        const domain = getOriginDomain(offer?.domain);
        const countryFromDomain = domainToCountry(domain.substring(domain.lastIndexOf('.')+1))[0];
        // const storeInformation = await getSkimLinksStoreInformation(domain);
        const countryCode = countryFromDomain?.code ? countryFromDomain.code : 'XX';
        await apiDb.apiDatabase.model('Stores', apiDb.models.Stores.schema)
          .updateOne({
            _id: element._id,
            'offers._id': offer._id
          }, {
            $set: {
            'offers.$.countryCode': [countryCode]
            // 'offers.$.checked.date': moment().toDate()
          }
        }).exec().then((result) => {
          const log = {
            domain,
            result
          }
          console.log(log)
        }).catch((err) => { throw new Error(err); });  
  
      }

    } catch (err) {
      const log = {
        err
      }
      console.log(log)  
      logger.warning(`[storesUpdate] offerCountryCodeField ${err?.message}`, err);
      // offerCountryCodeField(limit, offset+limit);    
    }
  }
  offerCountryCodeField(limit, offset+limit);
};

const averageCommissionField = async (limit=10, offset=0) => {
  const stores = await apiDb.apiDatabase.model('Stores', apiDb.models.Stores.schema).find({
    'averageCommissionRate': null
  },{_id:1, name:1, domain:1, averageCommissionRate:1}).sort({name:1}).limit(limit).skip(offset).exec();
  if(!stores.length) process.exit();
  for(const element of stores) {
    try {
      const domain = getOriginDomain(element?.domain);
      const storeInformation = await getSkimLinksStoreInformation(domain);
      console.log(domain,storeInformation);
      if(!storeInformation || !storeInformation?.calculated_commission_rate) continue;
      await apiDb.apiDatabase.model('Stores', apiDb.models.Stores.schema)
        .updateOne(
          {
            _id: element._id
          }, {
            averageCommissionRate: storeInformation?.calculated_commission_rate || null
          }
        ).exec().then((result) => {
          const log = {
            domain,
            result
          }
          console.log(log)
        }).catch((err) => { throw new Error(err); });  

    } catch (err) {
      const log = {
        err
      }
      console.log(log)  
      logger.warning(`[storesUpdate] averageCommissionField ${err?.message}`, err);
      // averageCommissionField(limit, offset+limit);    
    }
  }
  averageCommissionField(limit, offset+limit);
};

const listOfLinksToShops = () => {
  try {
    const file = 'list_of_stores.csv';
    apiDb.apiDatabase.model('Stores', apiDb.models.Stores.schema).filterByValidDate({
      lastMatch:{ $match: { offers: { $not: {$size:0} } } },
      firstMatch: { 
        $match: { 
          'offers.partnerSource': 'skimLinks'
        }
      },
      limitQuery: -1,
      offsetQuery: 0,
      sort:{ name: 1 },
      collation: { locale: 'en', strength: 2 },
      countryCode: 'US'
    }).then((stores) => {
      const header = '"store name","url"\r\n';
      const records = stores.map((record) => `"${record.name}","https://XXX/site/${record.domain}"`).join('\r\n')
      fs.writeFileSync(file, `${header}${records}`);
      process.exit();
    });
  } catch (err) {
    console.log(err)
  }

};

const instruction = 'to update stores and offers, please type:\r\ncommand to use:\r\n- country-code: update country code on all offers\r\n- stop\r\n';

const userAsk = process.argv[2] || null;

if(userAsk) {
  switch(userAsk) {
    case 'list' : listOfLinksToShops(); break;
    case 'country-code' : offerCountryCodeField(); break;
    case 'country' : countryField(); break;
    case 'description' : descriptionField(); break;
    case 'categories' : categoriesField(); break;
    case 'commission' : averageCommissionField(); break;
    case 'logo' : logoStoreField(); break;
    case 'stop' : stop(); break;
    default: console.log(instruction); process.exit();
  }
}
