const {
    REDIS_CACHE_CONFIG
} = require('../constants/cacheKeyNames');
  
const {
    CACHE_DEFAULT_EXPIRE
} = require('../constants/cacheDefaultExpire');
  
const logger = require('../services/logger');
const { redisConnection } = require('../services/cacheRedis');

const getCache = async (queryBuilder, redisModelCache, keyCacheName) => {

    if(!redisConnection()) return queryBuilder.exec();
    if(!queryBuilder || !redisModelCache) return null;

    try {
        const cacheExpire = await redisModelCache
            .find({name:REDIS_CACHE_CONFIG})
            .cache({key:REDIS_CACHE_CONFIG,expire:CACHE_DEFAULT_EXPIRE})
            .limit(1)
            .exec()
            .catch(error => logger.error(error)) 
            .then(result => result[0].expire) || CACHE_DEFAULT_EXPIRE;
    
        const cache = await redisModelCache
            .find({name:keyCacheName})
            .cache({key:REDIS_CACHE_CONFIG,expire:cacheExpire})
            .limit(1)
            .exec()
            .then(result => result[0])
            .catch(error=>logger.error(error));
    
        if(cache && cache.active) 
            queryBuilder.cache({key:cache.name, expire: cache.expire});

    } catch(error) {
        logger.error(JSON.stringify(error));
    };
    
    return queryBuilder;
};

module.exports = {
    getCache
};