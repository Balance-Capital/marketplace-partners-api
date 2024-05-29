/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
const myFetch = require("./myFetch");

const apiDb = require('../models/apiDatabase');

const storesData = async (limit, offset) => {
  const data = await apiDb.apiDatabase.model('Stores', apiDb.models.Stores.schema).find()
    .sort({_id: 1})
    .skip(offset)
    .limit(limit)
    .exec();
  return data;
};

const storesDataUpdate = async (store) => {
  await apiDb.apiDatabase.model('Stores', apiDb.models.Stores.schema).updateOne({_id: store._id}, {
    averageCommissionRate: store.averageCommissionRate,
    categories: store.categories,
    'store.seo.contentLength': store.seo.contentLength,
    indexing: store.indexing,
    isActive: store.isActive
  }).exec();
};

const checkImage = async (pathToImage) => {
  if(pathToImage && pathToImage?.match(/default/gui)) return 0;
  try {
    const score = await myFetch(`${process.env.IMAGE_HOST_CDN}/${pathToImage}`).then((response) => response.status >=200 && response.status < 300 ? 1 : 0);
    return score;
  } catch(err) {
    console.log(err);
    return 0;
  }
};

const run = async (limit, offset) => {
  const stores = await storesData(limit, offset);
  if(stores.length === 0) return;
  stores.forEach(async (store) => {
    let score = 0;
    
    score = await checkImage(store?.logo);

    // if(store?.offers?.length === 0) {
    //   score = -5;
    // };

    if(!store?.country) {
      score = -5;
    };

    score += store?.offers?.length > 0 ? 2 : 0;

    store.categories = store?.categories?.filter((item) => !!item);
    score += store?.categories?.length > 0 ? 1 : 0;
    
    store.averageCommissionRate = store?.averageCommissionRate || null;
    score += store?.averageCommissionRate ? 1 : 0;
    
    score += store?.faq?.length > 0 ? 2 : 0;
    
    store.seo = { ...store.seo, contentLength : store?.description?.length || 0 + store?.faq?.reduce((a,b) => a+b.length,0) || 0 };
    score += store?.seo?.contentLength > process.env.SEO_CONTENT_MIN_CHARS ? 2 : 0;
    
    store.indexing = false;
    store.isActive = !(score <= 1);
    
    storesDataUpdate(store);
    
    console.log(`score ${score} ${store.name}`);
  })
  const newOffset = limit + offset;
  console.log(newOffset)
  run(limit, newOffset);
}
run(10,0)
module.exports = { run };
