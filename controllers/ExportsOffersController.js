/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-param-reassign */
const moment = require('moment');
const { ObjectId } = require('bson');

const {
  EXPORT_TO_API,
  SKIM_LINKS,
  COMMISSION_JUNCTION,
  EBAY,
  ADSERVICE_AN
} = require('../constants/partnersName');

const { TALK_TIMEOUT_MINUTES } = Object.freeze({
  TALK_TIMEOUT_MINUTES: 2
});

const { OTHER } = require('../constants/offersValueType');
const { DEFAULT_IMAGE_STORE } = require('../constants/defaultImageStore');
// const { MOMENT_DAY } = require('../constants/dateTime');

const {
  CACHE_DEFAULT_KEY
} = require('../constants/cacheKeyNames');

const {
  CACHE_DEFAULT_EXPIRE
} = require('../constants/cacheDefaultExpire');

const db = require('../models/index');
const dbApi = require('../models/apiDatabase');
const configController = require('./ConfigController');
const skimLinksController = require('./SkimLinksController');
const commissionJunctionController = require('./CommissionJunctionController');
const eBayController = require('./EbayController');
const adServiceANController = require('./AdServiceANController');
const { getOriginDomain } = require('../utils/getOriginDomain');
// const { makeTitle, findTitle, parserShortTitleAI } = require('../utils/makeTitle');
const { offersScoreFunction } = require('../utils/offersScore');
const { logTimeOperations } = require('../utils/logTimeOperation');

// const { api } = require('../services/api');
const logger = require('../services/logger');

const partnerTalk = (talk) => {
  try {
    db.models.Config.updateMany(
      { name: EXPORT_TO_API },
      { 
        $push: {
          partnerTalk: {text:talk}
        }
      }
    ).exec().catch(error=>logger.error(error)).then(() => {
      db.models.Config.updateMany(
        { name: EXPORT_TO_API },
        {
          $pull: {
            partnerTalk : { 'timestamps': {$lte: moment().subtract(TALK_TIMEOUT_MINUTES,'minutes').toDate()}}
          }
        }
      ).exec().catch(error=>logger.error(error));  
    });  
  
  } catch (error) {
    logger.error(error);
  };

};

const prepareUnifyCollection = async (params, id) => {
  const unifyExport = await Promise.all(
    params.map(async (item, index) => {
      let collection = [];
      let products = [];
      switch (item.apiName) {
        case SKIM_LINKS:
          collection = await skimLinksController.prepareToExportOffers(
            item.limit,
            item.offset
          );
          item.offset += collection.length;
          params[index] = item;
          collection = collection.filter(offer => moment(offer.validDate) > moment());
          configController.update(
            { _id: id },
            {
              otherParams: params
            }
          );
          partnerTalk(`skimLinks: ${collection.length}`);
          break;
        case COMMISSION_JUNCTION:
          collection = await commissionJunctionController?.prepareToExportOffers(
            item.limit,
            item.offset
          ) || [];

          products = await commissionJunctionController?.prepareToExportProducts(
            item.productLimit,
            item.productOffset
          ) || [];
          // eslint-disable-next-line no-case-declarations
          const filtered = products?.results?.filter((element) => element !== undefined);

          if(products.offset > 0) {
            try {
              if(filtered.length > 0)
                await dbApi.apiDatabase
                  .model('products', dbApi.models.Products.schema)
                  .insertMany(filtered,{ordered:false,upsert:true})
                  .catch((error) => logger.error(error));
            } catch(err) {
              logger.error(err);
            } finally {
              item.productOffset += products.offset > filtered.length ?  products.offset : filtered.length || 0;
              params[index] = item;
              await configController.update(
                { _id: id },
                {
                  otherParams: params,
                  $set: {running: false}
                }
              );
              partnerTalk(`cj: ${filtered.length}`);
            }          };
          item.offset += collection.length > 0 ? collection.length : 0;
          params[index] = item;
          collection = collection.filter(offer => moment(offer.validDate) > moment());
          configController.update(
            { _id: id },
            {
              otherParams: params
            }
          );
          partnerTalk(`cj: ${collection.length}`);
          break;
        case ADSERVICE_AN:
          collection = await adServiceANController.prepareToExportOffers(
              item.limit,
              item.offset
            );
            item.offset += collection.length > 0 ? collection.length : 0;
            params[index] = item;
            collection = collection.filter(offer => moment(offer.validDate) > moment());
            configController.update(
              { _id: id },
              {
                otherParams: params
              }
            );
            partnerTalk(`AdServiceAN: ${collection.length}`);
          break;
        case EBAY:
          collection = await eBayController.prepareToExportOffers(
            item.limit,
            item.offset
          );
          item.offset += collection.length > 0 ? collection.length : 0;
          params[index] = item;
          collection = collection.filter(offer => moment(offer.validDate) > moment());
          configController.update(
              { _id: id },
              {
                otherParams: params
              }
          );
          partnerTalk(`eBay: ${collection.length}`);
          break;
        default:
      }
      return collection;
    })
  ).then((result) => result);

  return unifyExport.flat();
};

const updateOrAddNew = async (store, importOffer) => {
  try {

    if(importOffer && importOffer.valueType === null) {
      importOffer.valueType = OTHER;
    }
    // const { offerImage, storeLogo } = await uploadImages(importOffer, store);
    // const offerImage = null; 
    const storeLogo  = null;

    const originDomain = getOriginDomain(importOffer.origin);
    importOffer.domain = originDomain;
    importOffer.priority = 11;
    // importOffer.image = offerImage;
    
    if(!store) {
      // const shortTitle = await makeTitle(
      //   importOffer?.value, 
      //   importOffer?.valueType === 'currency' ? importOffer.currency : '%', 
      //   importOffer?.title, 
      //   0
      // );      
      // importOffer.shortTitle = await parserShortTitleAI(shortTitle.value);

      const seo = {
        longTail: null,
        contentLength: (importOffer?.shortTitle?.length || 0 + importOffer?.description?.length || 0)
      }
  
      // add new one
      await dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).insertMany({
        skimLinksId: null,
        name: importOffer.advertiserName,
        logo: storeLogo || DEFAULT_IMAGE_STORE,
        priority: 11,
        domains: importOffer.domains,
        countries: importOffer.countryCode,
        country: typeof importOffer.country === 'string' ? importOffer.country : importOffer.country[0] || null,
        categories: importOffer.categories,
        epc:null,
        averageCommissionRate: null,
        averageBasketSize: null,
        averageConversionRate: null,
        specialRateType: null,
        offers: importOffer,
        description: importOffer?.description || null,
        faq: [],
        aboutOffers: null,
        meta: null,
        offersScore: offersScoreFunction([importOffer]),
        domain: originDomain,
        seo,
        partnerSource: importOffer.partnerSource
      })
      // .catch(error=>logger.error(error))
      ;  

    } else if (store) {

      const tsFT0 = new Date().getTime();
      // const shortTitle = await findTitle(
      //   importOffer?.value, 
      //   importOffer?.valueType === 'currency' ? importOffer.currency : '%',
      //   importOffer?.title, 
      //   store
      // );
      logTimeOperations('findTitle', ((new Date().getTime()) - tsFT0)/1000);

      const categories = new Set(store.categories);
      categories.add(...importOffer.categories);  
      importOffer.priority = store.priority || -1;

      const offerIndex = await dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).find({
        'offers.originId':importOffer.originId
      }, {
        'offers.$':1
      })
      // .cache({key: CACHE_DEFAULT_KEY, expire: CACHE_DEFAULT_EXPIRE})
      .exec();
      
      if (offerIndex && offerIndex?.length === 0) {

        const updateLogTime = new Date().getTime();

        await dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).updateOne({
          _id: store._id
        }, {
          categories: [...categories],
          // offersScore: offersScoreFunction(store.offers),
          domain: originDomain,
          // logo: storeLogo,
          $push: {
            offers: importOffer
          }
        })
        .exec()
        .then(()=>logTimeOperations('updateOneRecord', (new Date().getTime() - updateLogTime)/1000))
        // .catch(error=>logger.error(error))
        ;

      } else {
        const updateLogTime = new Date().getTime();

        await dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).updateOne({
          _id: store.id,
          'offers._id': { $in: offerIndex[0].offers.map(item=>ObjectId(`${item._id}`)) }
        }, {
          categories: [...categories],
          // offersScore: offersScoreFunction(store.offers),
          domain: originDomain,
          // logo = storeLogo,
          $set: {
            'offers.$.priority': store.priority || -1,
            'offers.$.partnerSource': importOffer.partnerSource || null,
            'offers.$.shortTitle': importOffer.shortTitle,
            'offers.$.domain': originDomain,
            'offers.$.categories': importOffer.categories,
            'offers.$.description': importOffer.description,
            'offers.$.salesCommission': importOffer.salesCommission,
            'offers.$.savingType': importOffer.savingType,
            'offers.$.linkType': importOffer.linkType,
            'offers.$.image': importOffer.image,
            'offers.$.redirecUrl': importOffer.redirectUrl,
            'offers.$.countryCode': typeof importOffer.countryCode === 'string' ? [importOffer.countryCode] : importOffer.countryCode || ['US']
          }
        })
        .exec()
        // .catch(error=>logger.error(error))
        .then(()=>logTimeOperations('updateOneRecord', (new Date().getTime() - updateLogTime)/1000))
        ;

      };
    }
  } catch (error) {
    logger.error(error);
  }

}

function* importGenarator(array) {
  return yield* array;
}

const importUnifyOffers = async (data) => {
  try {
    const importDomains = [];
    const imports = importGenarator(data);
    
    const ts0 = new Date().getTime();

    for(const item of imports) {
      const tsGS = new Date().getTime();
      const domain = getOriginDomain(item.origin);
      const store = await dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).findOne({
        domain
      }, {
        _id:1,
        categories:1, 
        priority:1
      })
      .cache({key: CACHE_DEFAULT_KEY, expire: CACHE_DEFAULT_EXPIRE})
      .exec()
      // .catch(error=>logger.error(error))
      ;
      logTimeOperations('getStores', (new Date().getTime() - tsGS)/1000);

      const tsNU = new Date().getTime();
      await updateOrAddNew(store, item);
      logTimeOperations('updateOrAddNew', (new Date().getTime() - tsNU)/1000);

      /**
       * Report for daily import
       */
      // eslint-disable-next-line no-continue
      if(importDomains.filter(pos => pos === item.domains[0]).length > 0) continue;
      // importDomains.push(item.domains[0])
      // const importOffer = item; 
      // const allImport = req.body;
      // reportImportOffersDaily(store, importOffer, allImport);
    };
    const ts1 = new Date().getTime();
    logTimeOperations('main import loop', (ts1 - ts0)/1000);
  } catch (error) {
    logger.error(error);
  };

};

/**
 * The `run` function is responsible for exporting data to an API. It retrieves the necessary configuration from the database,
 * checks if the export process is already running, and then calls the `prepareUnifyCollection` function to collect the data to be exported.
 * If there is data to be exported, it calls the `importUnifyOffers` function to perform the actual export.
 * Finally, it updates the configuration in the database to mark the export process as completed.
 */
const run = async () => {
  try {
    partnerTalk('export to api: service start');

    // Retrieve the configuration for exporting data from the database
    const items = await configController.getByParams({ name: EXPORT_TO_API });
    const { _id, otherParams, running } = items[0];

    // Check if the export process is already running. If it is, exit the function.
    if (running) return;

    // Mark the export process as running in the configuration
    await configController.update({ _id }, { running: true });

    // Call the `prepareUnifyCollection` function with the necessary parameters to collect the data to be exported
    const payload = await prepareUnifyCollection(otherParams, _id);

    // If there is data to be exported, call the `importUnifyOffers` function with the collected data
    if (payload.length > 0) {
      await importUnifyOffers(payload);
    }

    // Update the configuration in the database to mark the export process as completed
    await configController.update({ _id }, { running: false });
    console.log('Finish job');
  } catch (error) {
    // Handle any errors that occur during the export process
    console.error('Error exporting data:', error);
  }
};

const closeDB = async () => {
  db.mongoose.close();
};

module.exports = {
  run,
  prepareUnifyCollection,
  closeDB,
  importUnifyOffers
};
