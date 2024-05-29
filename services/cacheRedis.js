/* eslint-disable new-cap */
/* eslint-disable prefer-rest-params */
/* eslint-disable func-names */
require('dotenv').config();
const mongoose = require('mongoose');
const redis = require('redis');
const util = require('util');
const objectHash = require('object-hash');
const logger = require("./logger");

const CACHE_EXPIRE = process.env.REDIS_DEFAULT_EXPIRE || 120;
let REDIS_EXISTS = false;

const redisClient = redis.createClient({
  port: process.env.REDIS_PORT,
  host: process.env.REDIS_HOST,
  password: process.env.REDIS_SECRET,
  username: process.env.REDIS_USERNAME,
  retry_strategy: () => 1000,
  tls: {}
});

redisClient.get('testconnection', (err) => {
  if(redisClient.connected) {
    REDIS_EXISTS = true;
  };
  if(err) logger.error(err);
});

redisClient.hget = util.promisify(redisClient.hget);

const AggregateExec = mongoose.Aggregate.prototype.exec;
const QueryExec = mongoose.Query.prototype.exec;

mongoose.Aggregate.prototype.cache = function(
  options = { expire: CACHE_EXPIRE, key: null }
) {
  this.useCache = true;
  this.expire = options.expire || CACHE_EXPIRE;
  this.hashKey = JSON.stringify(options.key || this.model.name);
  return this;
};

mongoose.Query.prototype.cache = function(
  options = { expire: CACHE_EXPIRE, key: null }
) {
  this.useCache = true;
  this.expire = options.expire || CACHE_EXPIRE;
  this.hashKey = JSON.stringify(options.key || this.model.name);
  return this;
};

mongoose.Aggregate.prototype.exec = async function() {
  if (!this.useCache || !REDIS_EXISTS) {
    const result = await AggregateExec.apply(this, arguments);
    return result;
  };

  const hKey = JSON.stringify({
    hash: objectHash(this.pipeline())
  });

  const key = objectHash(JSON.stringify(this.pipeline()));

  const cacheValue = JSON.parse(await redisClient.hget(key, hKey));
  
  if (!cacheValue) {
    const result = await AggregateExec.apply(this, arguments); 
    if(redisClient.hset(key, hKey, JSON.stringify(result))){
      redisClient.expire(key, this.expire || CACHE_EXPIRE);
    };
    return result;
  };

  const result = cacheValue;
  return result;
};

mongoose.Query.prototype.exec = async function() {
  if (!this.useCache || !REDIS_EXISTS) {
    const result = await QueryExec.apply(this, arguments);
    return result;
  }

  const hKey = JSON.stringify({
    hash: objectHash(this.getQuery())
  });

  // eslint-disable-next-line no-underscore-dangle
  const key = objectHash(JSON.stringify(this._conditions));

  const cacheValue = JSON.parse(await redisClient.hget(key, hKey));

  if (!cacheValue) {
    const result = await QueryExec.apply(this, arguments);
    if(redisClient.hset(key, hKey, JSON.stringify(result))) {
      redisClient.expire(key, this.expire);
    };
    return result;
  }

  const result = cacheValue;
  return Array.isArray(result)
    ? result.map((d) => new this.model(d))
    : new this.model(result);
};

const clearCache = (key) => {
  redisClient.del(JSON.stringify(key));
};

const redisConnection = () => REDIS_EXISTS

module.exports = { clearCache, redisConnection, redisClient };
