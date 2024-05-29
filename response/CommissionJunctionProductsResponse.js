const fs = require('fs');

const { COMMISSION_JUNCTION } = require('../constants/partnersName');

const { 
  ADVERTISER_LOOKUP
} = Object.freeze({
  ADVERTISER_LOOKUP: 'advertiser-lookup'
});

const { 
  IMAGE_TYPE_PRODUCT
} = require('../constants/imageType');

const { uploadObject } = require('../services/spaceDigitalOcean');
const { getImageFromRemoteServer } = require('../utils/remoteFiles');
// const countries = require('../constants/countries.json');
const Product = require('../objects/Product');
const logger = require('../services/logger');

const configController = require('../controllers/ConfigController');
const { isUnicodeDefault } = require('../utils/unicode');
const {getData} = require('../utils/commissionJunction');

const {
  CATEGORY_SOURCE_FILE
} = require('../constants/categorySourcesFile');

const { makeTitleAI } = require('../utils/makeTitle');

let categories = [];

const getAdvertisers = async (params) => {
  const { requestorCid, token, getAdvertisersUrl, advertiserName } = params;
  const url = `${getAdvertisersUrl}` + 
    `?requestor-cid=${encodeURIComponent(requestorCid)}` +
    `&advertiser-name=${encodeURIComponent(advertiserName)}`
    // `&advertiser-ids=joined` +
    // `&records-per-page=${limit}` +
    // `&page-number=${offset}` +
    // `&keywords=${keywords}`
    ;
  const response = await getData({ url, token, result: ADVERTISER_LOOKUP });
  return response || [];
};

let affiliatenetworkConfig = null;
const getAffiliatenetworkConfig = async () => {
  if (affiliatenetworkConfig === null) {
    const items = await configController.getByParams({
      name: COMMISSION_JUNCTION
    });
  
    const {
      otherParams
    } = items[0];

    affiliatenetworkConfig = otherParams;
  };
  return affiliatenetworkConfig;
}

const getAdvertiseCategories = async (name) => {
  try {
    if(!name) return null;
    if(fs.existsSync(CATEGORY_SOURCE_FILE))
      categories = JSON.parse( fs.readFileSync(CATEGORY_SOURCE_FILE) || "[]" );
    const isExists = categories.find((item) => item?.name === name);
    if(!isExists) {
      affiliatenetworkConfig = await getAffiliatenetworkConfig();
      const offersParams = {
        token: affiliatenetworkConfig[0].token,
        requestorCid: affiliatenetworkConfig[0].requestorCid,
        getAdvertisersUrl: affiliatenetworkConfig[0].getAdvertisersUrl,
        advertiserName: name
      };
      const advertiser = await getAdvertisers(offersParams);
      const company = advertiser.find(
        (company) => {
          return company['advertiser-name'][0] === name
        });
      let category = [];
      if (company && company['primary-category']) { 
        category =  [...company['primary-category'][0].parent, ...company['primary-category'][0].child];
        const _categories = JSON.parse( fs.readFileSync(CATEGORY_SOURCE_FILE) || "[]" );
        const _isExists = _categories.find((item) => item?.name === name);
        if(category.length > 0 && !_isExists) {
          categories.push({name, category});
          const uniqueArray = categories.filter((obj, index, self) => index === self.findIndex((o) => o.name === obj.name && o.category.toString() === obj.category.toString()));
          fs.writeFileSync(CATEGORY_SOURCE_FILE, JSON.stringify(uniqueArray));  
        }
      }
      return category;
    };
    return isExists.category;  
  } catch(err) {
    logger.warning(`[CommissionJunctionProductsResponse] getAdvertiseCategories ${err?.message}`, err);
  }
};

const commissionJunctionProductsResponse = (products) => Promise.all(
    products.map(async (product) => {
      const {
        // adId,
        advertiserName,
        advertiserCountry,
        // targetCountry,
        // additionalImageLink,
        imageLink,
        brand,
        // advertiserId, 
        // catalogId, 
        id, 
        title, 
        description, 
        price,
        salePrice,
        // salePriceEffectiveDateStart,
        // salePriceEffectiveDateEnd,
        // mobileLink,
        linkCode,
        // link
      } = product;

      if(!imageLink || !title) return undefined;

      const unicodeTitle = (() => {
        const text = (isUnicodeDefault(title)) ? title : brand;
        return text 
          ? text.replace(/[_-]?\d{1,}.?x.?\d{1,}/,'') 
          : null;
      })(); 

      const remoteFile = await getImageFromRemoteServer(imageLink, id, IMAGE_TYPE_PRODUCT);
      if (remoteFile.status !== 200) return undefined;
      
      const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: remoteFile.pathAndName,
        Body: remoteFile.fileData,
        ACL: "public-read",
        CacheControl: 'public,max-age=864000'
      };

      if(!remoteFile.fileData && !remoteFile.fileName) return undefined;  

      if(remoteFile.fileData) await uploadObject(params);  

      const category = await getAdvertiseCategories(advertiserName) || [];
      
      const newProduct = Object.create(Product);
      
      try {
        newProduct.advertiserCountry = advertiserCountry;
        newProduct.advertiserName = advertiserName;
        newProduct.partnerSource = COMMISSION_JUNCTION;
        newProduct.brand = brand;
        newProduct.description = description;
        newProduct.image = remoteFile.pathAndName
        newProduct.importedId = id;
        newProduct.link = `${linkCode}&sid={sessionId}`;
        newProduct.price = {amount: price[0].amount, currency: price[0].currency};
        newProduct.salePrice = salePrice[0]?.amount ? {amount: salePrice[0].amount, currency: salePrice[0].currency} : newProduct.price;
        newProduct.title = await makeTitleAI(unicodeTitle);
        newProduct.categories = category;
      } catch(error) {
        logger.warning(`[commissionJunctionProductsResponse] ${error?.message}`, error);
      };

      return newProduct;
    })
);

module.exports = {
  commissionJunctionProductsResponse,
  getAdvertiseCategories
};
