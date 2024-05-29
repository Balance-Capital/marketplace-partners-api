require('dotenv').config();
const Mongoose = require('mongoose');
const logger = require('../services/logger');

const Config = require('./config');
const CronSchedule = require('./cronSchedule');
const CronMaintenanceSchedule = require('./cronMaintenanceSchedule');

const SkimLinksOffers = require('./skimLinksOffers');
const EbayOffers = require('./eBayOffers');
const CommissionJunctionOffers = require('./commissionJunctionOffers');
const CouponApi = require('./couponApi');
const AdServiceAN = require('./adServiceAN');
const UnifyCommissionReport = require('./unifyCommissionReport');
const CommissionJunctionProducts = require('./commissionJunctionProducts');
const OffersArchive = require('./offersArchive');

const TitleGenerator = require('./titleGenerator');
const LogTimeOperations = require('./logTimeOperations');
const LogUrls = require('./logUrls');
const RedisCacheKeys = require('./redisCacheKeys');

const mongooseOptions = {
  autoIndex: Boolean(process.env.MONGO_DB_AUTO_INDEX === 'true'),
  useNewUrlParser: true,
  useUnifiedTopology: true,
  keepAlive: true,
  connectTimeoutMS: 30000  
};

Mongoose.set('debug', Boolean(process.env.MONGO_DB_DEBUG === 'true'));

(async () => {
  try {
    Mongoose.connect(process.env.MONGO_DB_CONNECTION, mongooseOptions)
  } catch (e) {
    logger.error('[MongoDB] Connection error:');
    logger.error(e);
  }
})();

const db = {
  models: {
    Config,
    CronSchedule,
    SkimLinksOffers,
    EbayOffers,
    CommissionJunctionOffers,
    CouponApi,
    AdServiceAN,
    UnifyCommissionReport,
    CommissionJunctionProducts,
    CronMaintenanceSchedule,
    TitleGenerator,
    LogTimeOperations,
    LogUrls,
    RedisCacheKeys
    // OffersArchive
  }
};

module.exports = db;
