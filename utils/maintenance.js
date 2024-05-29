/* eslint-disable no-restricted-syntax */
/* eslint-disable no-underscore-dangle */
const { ObjectId } = require('bson');

const logger = require('../services/logger');

// const db = require('../models/index');
const dbApi = require('../models/apiDatabase');

const { DEFAULT_IMAGE_STORE } = require('../constants/defaultImageStore');
const { OFFERS_SCORE_FUNCTION } = require('../constants/cacheKeyNames');

const REGEXP_COM = new RegExp('.*\\.com');

// const { offersScoreFunction } = require("./offersScore");
const { getOriginDomain } = require('./getOriginDomain');
const { getRangeRnd } = require('./math');

const {
    clearCache,
    redisConnection
} = require('../services/cacheRedis');

const updateDefaultImageStrore = () => new Promise((resolve, reject) => {
    try {
        dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).updateMany(
            {logo:null},
            { $set: { logo: DEFAULT_IMAGE_STORE } }
        )
        .exec()
        .then( () => {
            resolve('default images updated');
        })
        .catch((error) => {
            logger.error(error);
            reject(error);
        });    
    } catch(error) {
        reject(error);
    }
});

const addRandomStarsForAllStores = () => new Promise((resolve, reject) => {
    try {
        dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).updateMany(
            {},
            { $set: { star: getRangeRnd(3,5) } }
        )
        .exec()
        .then( () => {
            resolve('default star update for stores');
        })
        .catch((error) => {
            logger.error(error);
            reject(error);
        });    
    } catch(error) {
        reject(error);
    };
});


function* yeildSidebarAvailableOffers(array) {
    return yield* array;
};

const updateSidebarAvailableOffers = () => new Promise((resolve, reject) => {      
    try{
        dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).find({isActive: true}, { _id: 1 }).exec().then(async stores => {
            const array = yeildSidebarAvailableOffers(stores);
            for(const store of array) {
                if(redisConnection()) {
                    clearCache(OFFERS_SCORE_FUNCTION);
                };    
                // eslint-disable-next-line no-await-in-loop
                const offersScore = await dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).offersScoreFunction(store._id);
                dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).updateMany(
                    { _id: ObjectId(store._id)},
                    { 
                        $set: {
                            'offersScore' : offersScore
                        }
                    }
                )
                .exec()
                .catch(err => {
                    logger.error(err);
                    reject(err);
                });
            };
            resolve('sidebar available offers updated');
        });
    
    } catch(error) {
        logger.error(error);
        reject(error);
    };
});

function* yeildSubdomainToDomainOrigin(array) {
    return yield* array;
};

const checkDomainsComFirst = (domains) => {
    const origin = domains.filter(item => item.match(REGEXP_COM))[0];
    return origin || domains[0];
};

const updateSubdomainToDomainOrigin = () => new Promise((resolve, reject) => {
    try { 
        dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).find().exec().then(stores => {
            const array = yeildSubdomainToDomainOrigin(stores);
            for(const store of array) {
                const domain = getOriginDomain(checkDomainsComFirst(store.domains));
                dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).updateMany(
                    { "_id": store._id},
                    { 
                        "$set": {
                            "domain" : domain
                        }
                    }).exec()
                    .catch(err => {
                        logger.error(err);
                    });            
                dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).updateMany(
                    { "_id": store._id, "offers": {"$elemMatch": {"origin": { $exists:true } }}},
                    { 
                        "$set": {
                            "offers.$[].domain": domain
                        }
                    },{multi: true})
                .exec()
                .catch(err => {
                    logger.error(err);
                });            
            };
            resolve('subdomain to domain updated');
        });
    
    }
    catch(error) {
        logger.error(error);
        reject(error);
    };
});

if(process.argv[2] === 'images') updateDefaultImageStrore();

if(process.argv[2] === 'domains') updateSubdomainToDomainOrigin()

if(process.argv[2] === 'sidebar') updateSidebarAvailableOffers();

if(process.argv[2] === 'storestar') addRandomStarsForAllStores();

module.exports = {
    updateDefaultImageStrore,
    updateSubdomainToDomainOrigin,
    updateSidebarAvailableOffers,
    addRandomStarsForAllStores
};