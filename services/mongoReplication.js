/* eslint-disable no-await-in-loop */
const {models, connect} = require('../models/replication');
const logger = require('./logger');

// const IMPORT_INDEX_MODEL = 0;

const replication = async (collection) => {
  const { dbMain, dbRep } = await connect();
  logger.debug(collection[0]);
  const source = dbMain.model(collection[0], collection[1].schema);
  const dest = dbRep.model(collection[0], collection[1].schema);
  const collections = await source.find().exec();
  logger.info(`${collection[0]} => ${collections.length}`);
  console.log(`${collection[0]} => ${collections.length}`);
  await dest.collection.drop().then(async() => {
    await dest.insertMany(collections, {upsert:true,ordered:false}).catch (e => {
      logger.error(e)
    });  
  });
}

// new Promise((resolve, reject) =>
// eslint-disable-next-line no-async-promise-executor
const mongoReplication = async () => { 
  try {
    const modelsObject = Object.entries(models);
    // eslint-disable-next-line no-restricted-syntax
    for(const model of modelsObject) {
      await replication(model);
    };
    // resolve('ok');
    // Promise.all(async() => m.map(model => replication(model))).then(()=>resolve('ok'));
      // for(let indx=IMPORT_INDEX_MODEL; indx < m.length; indx+=1) {
      //   // eslint-disable-next-line no-return-await
      //   (async () => (await replication(m[indx])))();
    // };

    // }).then(() => resolve('ok'))    
  } catch (error) {
    logger.error(error);
    // reject(error);
  };
};

mongoReplication()
// .then((result)=>{ console.log(result); process.exit()})

module.exports = {
  mongoReplication
};
