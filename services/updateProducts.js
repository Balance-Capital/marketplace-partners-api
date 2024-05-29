const { AIClient, requestObject } = require('p4u-client-ai');
const { 
  IMAGE_TYPE_PRODUCT
} = require('../constants/imageType');

const dbApi = require('../models/apiDatabase');
const logger = require('./logger');
const { getRangeRnd } = require('../utils/math');
const sleep = require('../utils/sleep');
// const { getImageFromRemoteServer } = require('../utils/remoteFiles');
// const { uploadObject } = require('./spaceDigitalOcean');
const { getAdvertiseCategories } = require('../response/CommissionJunctionProductsResponse');

const updateCategories = async () => {

  const products = await dbApi.apiDatabase.model('Products', dbApi.models.Products.schema)
    .find({ categories: [], brand: {$ne: null } }, {
      partnerSource:1,
      advertiserCountry:1,
      checked:1,
      price:1,
      salePrice:1,
      categories:1,
      brand: 1,
      advertiserName:1,
      _id:1
    })
    .exec();

  console.info(`products without categories: ${products.length}`)

  for(const product of products) {
    // eslint-disable-next-line no-await-in-loop
    const category = await getAdvertiseCategories(product?.brand);
    console.info(`category: ${category}, company: ${product?.advertiserName}, brand: ${product?.brand}`);
    if(category.length > 0) {
      await dbApi.apiDatabase.model('Products', dbApi.models.Products.schema).updateOne({
        _id: product._id
      }, { categories: category}).exec();
    } else {
      // await dbApi.apiDatabase.model('Products', dbApi.models.Products.schema).deleteOne({
      //   _id: product._id
      // }).exec();
    }
  };

};

const updateCategoriesPromise = () => new Promise((resolve, reject) => {
  try {
    updateCategories().then((result) => resolve(result));
  } catch (error) {
    reject(error);
    logger.warning(`[updateProducts] reject ${error?.message}`, error);
  }
});

const cleanupPromise = () => new Promise((resolve, reject) => {
  try {
    dbApi.apiDatabase.model('Products', dbApi.models.Products.schema).deleteMany({
      brand: null
    }).exec().then((r1) => {
      const m1 = `brand: ${JSON.stringify(r1)}`;
      console.info(m1);
      dbApi.apiDatabase.model('Products', dbApi.models.Products.schema).deleteMany({
        image: new RegExp('default','gui')
      }).exec().then((r2) => {
        const m2 = `image: ${JSON.stringify(r2)}`;
        console.info(m2);
        dbApi.apiDatabase.model('Products', dbApi.models.Products.schema).deleteMany({
          categories: []
        }).exec().then((r3) => {
          const m3 = `categories: ${JSON.stringify(r3)}`;
          console.info(m3);
          dbApi.apiDatabase.model('Products', dbApi.models.Products.schema).deleteMany({
            'checked.httpStatus': {$ne: 200}
          }).exec().then((r4) => {
            const m4 = `http status <> 200; ${JSON.stringify(r4)}`;
            console.info(m4);
            const res = `${m1} - ${m2} - ${m3} - ${m4}`;

            dbApi.apiDatabase.model('Products', dbApi.models.Products.schema).updateMany({
              'checked.httpStatus': 429
            }, {
              'checked.httpStatus': null
            }).exec();

            resolve(res);
          });  
        });      
      });
    });
  } catch (error) {
    logger.warning(`[updateProduct] ${error?.message}`, error);
    reject(error);
  }
});

const updateImagesPromise = () => new Promise(async (resolve, reject) => {
  try {
    await dbApi.apiDatabase.model('products', dbApi.models.Products.schema)
      .find({'checked.httpStatus': 200},{importedId:1, image:1})
      .limit(50000)
      .then(async (products) => {
        const result = await Promise.all(products.map(async (product) => {
          await fetch(`${process.env.IMAGE_HOST_CDN}/${product.image}`, { method: 'GET' })
            .then((res) => {
              console.log(res)
              res.status
            }).catch(async(err) => {
              console.log(err)
              await dbApi.apiDatabase.model('products', dbApi.models.Products.schema)
                .updateMany({'product.image': product.image},{$set: {'checked.httpStatus': 0}}).exec();
            })
        }))
        resolve(result) 
      })
      .catch((err) => {});
  } catch(err) {
    logger.warning(`[updateProduct] ${err?.message}`, err);
    reject(err?.message);
  }
});

const updateTextsPromise = (limit=10, offset=0) => new Promise(async (resolve, reject) => {
  const result = await updateTexts(limit, offset);
  if(result.length > 0) {
    offset+=limit;
    return await updateTextsPromise((limit, offset));
  }
})

const updateTexts = (limit=10, offset=0) => new Promise(async (resolve, reject) => {
  try {
    const maxCall = 5;
    const key = process.env.P4U_CLIENT_AI_KEY;
    const titleTaskID = process.env.P4U_TITLE_TASK_ID;
    const descriptionTaskID = process.env.P4U_DESCRIPTION_TASK_ID;
    const aiApi = new AIClient(key);
    await dbApi.apiDatabase.model('products', dbApi.models.Products.schema)
      .find({'checked.httpStatus': 200},{importedId:1, title:1, description:1})
      .sort({importedId:1})
      .limit(limit)
      .skip(offset)
      .then(async (products) => {
        const result = [];
        for(let indx = 0; indx < products.length; indx++) {
          let call = 0;
          const query = Object.create(requestObject);
          query.idTask = titleTaskID;
          query.context = ' ';
          query.ask = products[indx].title.replace(new RegExp('"+|\'+','gui'), '');
          let responseTitle = null;
          do {
            if(call > maxCall) throw new Exception('max call rich');
            const rand = getRangeRnd(1,5);
            await sleep(rand);  
            responseTitle = await (await aiApi.runTask(query))?.data?.text || null;
            call++;
          } while(responseTitle === null)
          call = 0;
          query.taskID = descriptionTaskID;
          query.ask = products[indx].description;
          let responseDescription = null;
          do {
            if(call > maxCall) throw new Exception('max call rich');
            const rand = getRangeRnd(1,5);
            await sleep(rand);
            responseDescription = await (await aiApi.runTask(query))?.data?.text || null;
            call++;
          } while(responseDescription === null);
          const back = {
            importedId: products[indx].importedId,
            title: responseTitle,
            description: responseDescription
          }
          result.push(back)
          await dbApi.apiDatabase.model('products', dbApi.models.Products.schema)
          .updateOne({importedId:back.importedId},{title:back.title,description:back.description})
          .exec();
        }
        resolve(result) 
      })
      .catch((err) => {console.log(err)});
  } catch(err) {
    console.log(err);
    logger.warning(`[updateProduct] ${err?.message}, last offset: ${offset}; limit: ${limit}`, err);
    reject(err?.message);
  }
});

switch (process.argv[2]) {
  case 'categories' : updateCategoriesPromise().then((result) => { logger.info(result); process.exit() }); break;
  case 'cleanup' : cleanupPromise().then((result) => { logger.info(result); process.exit() }); break;
  case 'images' : updateImagesPromise().then((result) => { logger.info(result); process.exit() }); break;
  case 'texts' : updateTextsPromise().then((result) => { logger.info(result); process.exit() }); break;
  default: console.log('choose categories|cleanup|images|texts');
}

module.exports = {
  updateCategoriesPromise,
  cleanupPromise,
  updateImagesPromise,
  updateTextsPromise
};
