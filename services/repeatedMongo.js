/* eslint-disable no-empty */
/* eslint-disable no-console */
/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-restricted-syntax */
// const moment = require('moment');

const {
  SIGNAL_INIT,
  SIGNAL_PING,
  SIGNAL_PONG,
  SIGNAL_STATUS,
  SIGNAL_STATUS_OK,
  SIGNAL_STATUS_ERROR,
  SIGNAL_KILL
} = require('../constants/threads');

// const MESSAGE_RESOLVE = 'clean up mongo done';

// eslint-disable-next-line prefer-const
let RUNING = false;
// const DAYS_TO_REMOVE = 2;

const dbApi = require('../models/apiDatabase');
// const db = require('../models/index');
const logger = require('./logger');

const repeatedMongo = async (limit=10,offset=0) => {
  const allActiveStores = await dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema)
    .find({isActive: true, 'offers': {$ne:[]}})
    .sort({'offers.updatedAt': 1})
    .limit(limit)
    .skip(offset)
    .exec();
  if(!allActiveStores.length) {
    // return offset;
    process.exit();
  };
  try {
    for(const store of allActiveStores) {
      const offers = store.offers.reduce((a,b) => { 
        if( 
          !a.filter(item => item.originId === b.originId).length 
          && !a.filter(item => item.title === b.title).length 
          // && !a.filter(item => item.description === b.description).length 
          // && !a.filter(item => item.shortTitle === b.shortTitle).length 
          )
          a.push(b); 
        return a;
      },[]);
      const removeOffers = store.offers.filter((e) => !offers.includes(e)).map((e) => e._id);
      console.log(store._id, store.name, offset, `repeated: ${removeOffers?.length}`);
      if(removeOffers?.length > 0) {
        await dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).updateMany({_id: store._id}, {
          $pull: { 
            offers: { 
              _id: {$in: removeOffers} 
            } 
          }
        },{ multi: true }).exec().then((result) => console.log(result)).catch((err) => logger.error(err));
      };
    };
  } catch(error) {
    logger.warning(`[repeatedMongo] ${error?.message}`, error);
  };
  const nextOffset = offset + limit;
  repeatedMongo(limit,nextOffset);
};

process.on('message', (msg) => {
  switch (msg) {
    case SIGNAL_PING:
      process.send(SIGNAL_PONG);
      process.exit();
      break;
    case SIGNAL_STATUS:
      process.send(RUNING ? SIGNAL_STATUS_OK : SIGNAL_STATUS_ERROR);
      break;
    case SIGNAL_INIT:
      repeatedMongo().then((result) => {
        process.send(result);
        process.send(SIGNAL_KILL);
        process.exit();
      });
      break;
    case SIGNAL_KILL:
      process.exit();
      break;
    default:
  }
});

if(process.argv[2] === 'repeated') {
  repeatedMongo(10,0);
};

module.exports = {
  repeatedMongo
};
