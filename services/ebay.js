const EbayAuthToken = require('ebay-oauth-nodejs-client');
const fs = require('fs');

const { EBAY } = require('../constants/partnersName');
const { 
  X_EBAY_C_ENDUSERCTX, 
  X_EBAY_C_MARKETPLACE_ID,
  SCOPE_PUBLIC_DATA,
  CATEGORY_URL,
  CATEGORY_SOURCE_FILE
} = require('../constants/ebay');

let accessToken = null;

const db = require('../models/index');
const { api } = require('./__api');

const auth = async (scope) => {    
  const items = await db.models.Config.find({name:EBAY}).exec();

  const { 
    login, 
    secret, 
    otherParams
  } = items[0];

  const ebayAuthToken = new EbayAuthToken({
    clientId : login,
    clientSecret : secret,
    devid : otherParams[0].devid,
    redirectUri : '-- redirect uri ---'
  });

  const eBayToken = await ebayAuthToken.getApplicationToken('PRODUCTION', [scope]);
  const token = JSON.parse(eBayToken);
  if(token.error) return `error: ${token.error} : ${token.error_description}`;
  return token && token.access_token || null;
};

const getCategoryFromEbay = async () => {
  
  const items = await db.models.Config.find().exec({name:EBAY});

  const { 
    _id
  } = items[0];

  if(!accessToken)
    accessToken = await auth(SCOPE_PUBLIC_DATA);
  
  const headers = {
    "Authorization": `Bearer ${accessToken}`,
    "X-EBAY-C-ENDUSERCTX": X_EBAY_C_ENDUSERCTX,
    "X-EBAY-C-MARKETPLACE-ID": X_EBAY_C_MARKETPLACE_ID,
    "Accept-Encoding": "application/gzip"
  };

  const successCallback = (response) => {
    if(response && response.status===429) {
      db.models.Config.updateOne({ _id }, { running: true, $push: { partnerTalk: {text:'Too Many Requests'} } } );
    };
  };

  const errorCallback = async (error) => {
    const text = JSON.stringify(error.message);
    db.models.Config.updateOne({ _id }, { running: true, $push: { partnerTalk: {text} } });
  };

  const response = await api({
    url: CATEGORY_URL, 
    headers,
    method: 'GET',
    errorCallback,
    successCallback
  });

  return response && response.data || null;

};

const readCategoryTree = (categories, id, foundCategory) => {
  // eslint-disable-next-line no-restricted-syntax
  for(const category of categories) {
    if(foundCategory && foundCategory.length > 0 ) return foundCategory;
    const found = category.category.categoryId.match(new RegExp(`${id}`));
    if(found) {
      // eslint-disable-next-line no-param-reassign
      foundCategory = category.category.categoryName;
      break;
    };
    if(category.childCategoryTreeNodes) {
      // eslint-disable-next-line no-param-reassign
      foundCategory = readCategoryTree(category.childCategoryTreeNodes, id, foundCategory);
    };    
  };
  return foundCategory;
}

const eBayCategory = async (categoryId) => {
  try {
    if(fs.existsSync(CATEGORY_SOURCE_FILE)) {
      const category = JSON.parse(fs.readFileSync(CATEGORY_SOURCE_FILE));
      if(category) {
        const result = readCategoryTree(category.rootCategoryNode.childCategoryTreeNodes, categoryId);
        return result;
      };
    };
  
    const categoryFromEbay = await getCategoryFromEbay();
    fs.writeFileSync(CATEGORY_SOURCE_FILE,JSON.stringify(categoryFromEbay));
    return readCategoryTree(categoryFromEbay.rootCategoryNode.childCategoryTreeNodes, categoryId);

  } catch(error) {
    return error;
  };

};

const getId = (id) => id.replace(/v1|\|+/gui,'');

module.exports = {
    eBayCategory,
    auth,
    getId
};
