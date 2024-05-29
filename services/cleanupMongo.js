/* eslint-disable no-empty */
/* eslint-disable no-console */
/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-restricted-syntax */
const moment = require('moment');

const {
  SIGNAL_INIT,
  SIGNAL_PING,
  SIGNAL_PONG,
  SIGNAL_STATUS,
  SIGNAL_STATUS_OK,
  SIGNAL_STATUS_ERROR,
  SIGNAL_KILL
} = require('../constants/threads');

const MESSAGE_RESOLVE = 'clean up mongo done';

let RUNING = false;
const DAYS_TO_REMOVE = 2;

const dbApi = require('../models/apiDatabase');
const db = require('../models/index');
const logger = require('./logger');

const filter = [
  {
    $match: {
      'offers.validDate': {
        $lte: moment().subtract(DAYS_TO_REMOVE, 'days').startOf('day').toDate()
      }
    }
  },
  {
    $project: {
      offers: {
        $filter: {
          input: '$offers',
          as: 'offer',
          cond: {
            $lte: [
              '$$offer.validDate',
              moment().subtract(DAYS_TO_REMOVE, 'days').startOf('day').toDate()
            ]
          }
        }
      }
    }
  },
  { $match: { offers: { $not: { $size: 0 } } } }
];

const cleanUpMongo = () =>
  new Promise((resolve, reject) => {

    try {
      RUNING = true;
      // archive
      dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).aggregate(filter)
        .exec()
        .then(async (stores) => {
          for(const store of stores) {
            const documents = [];
            const documentsId = [];
            for(const offer of store.offers) {
              const doc = {
                verified: offer.verified,
                star: offer.star,
                validDate: offer.validDate,
                startDate: offer.startDate,
                value: offer.value,
                valueType: offer.valueType,
                currency: offer.currency,
                countryCode: offer.countryCode,
                image: offer.image,
                savingType: offer.savingType,
                storeUrl: offer.storeUrl,
                title: offer.title,
                shortTitle: offer.shortTitle,
                description: offer.description,
                code: offer.code,
                origin: offer.origin,
                domain: offer.domain,
                originId: offer.originId,
                redirectUrl: offer.redirectUrl,
                priority: offer.priority,
                partnerSource: offer.partnerSource,
                categories: offer.categories
              };
              documents.push(doc);
              documentsId.push(offer._id);
            };
            await db.models.OffersArchive.insertMany(documents).catch((error) =>
              logger.warning(`[cleanupMongo] insert offer to archive ${error?.message}`, error)
            ).then(async () => {
              dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).updateMany(
                { _id: store._id },
                {
                  $pull: {
                    offers: {
                      _id: {$in: documentsId}
                    }
                  }
                },{ multi: true })
              .exec()
              .catch((error) => 
                logger.warning(`[cleanupMongo] update stores ${error?.message}`, error)
              );

          });

        };
          resolve(MESSAGE_RESOLVE);
        })
    } catch (error) {
      reject(error);
      RUNING = false;
      logger.warning(`[cleanupMongo] general ${error?.message}`, error);
    }
});

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
      cleanUpMongo().then((result) => {
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

if(process.argv[2] === 'start') {
  cleanUpMongo().then(()=>process.exit());
};

module.exports = {
  cleanUpMongo
};
