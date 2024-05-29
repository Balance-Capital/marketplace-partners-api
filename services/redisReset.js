const { redisClient } = require('./cacheRedis');
const logger = require('./logger');

/**
 * Clears the cache in a Redis database.
 * 
 * @returns {Promise} A promise that resolves with the success value if the cache is cleared successfully, or rejects with an error if there is an error.
 */
const redisReset = () => {
    return new Promise((resolve, reject) => {
        try {
            redisClient.FLUSHALL((err, success) => {
                if (success) {
                    logger.info('[redisReset] Cache cleared successfully');
                    resolve(success);
                } else {
                    logger.warning(`[redisReset] cache clear ${err?.message}`, err);
                    reject(err);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
};

if(process.argv[2] === 'start') {
    redisReset().then(()=>process.exit());
};

module.exports = { redisReset };