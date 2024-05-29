require('dotenv').config();
const Mongoose = require('mongoose');

const Config = require('./config');
const CronSchedule = require('./cronSchedule');
const SkimLinksOffers = require('./skimLinksOffers');
const EbayOffers = require('./eBayOffers');
const CommissionJunctionOffers = require('./commissionJunctionOffers');
const UnifyCommissionReport = require('./unifyCommissionReport');
const AdService = require('./adServiceAN');
const CouponApi = require('./couponApi');

const AdServiceAN = require('./adServiceAN');
const CommissionJunctionProducts = require('./commissionJunctionProducts');
const OffersArchive = require('./offersArchive');
const CronSchedules = require('./cronSchedule');

const TitleGenerator = require('./titleGenerator');
const LogTimeOperations = require('./logTimeOperations');
const LogUrls = require('./logUrls');
const RedisCacheKeys = require('./redisCacheKeys');
const CronMaintenanceSchedule = require('./cronMaintenanceSchedule');

const models = {
  Config,
  CronSchedule,
  EbayOffers,
  CommissionJunctionOffers,
  UnifyCommissionReport,
  AdService,
  CouponApi,
  SkimLinksOffers,
  AdServiceAN,
  CommissionJunctionProducts,
  CronSchedules,
  TitleGenerator,
  LogTimeOperations,
  LogUrls,
  RedisCacheKeys,
  OffersArchive,
  CronMaintenanceSchedule  
};

const mongooseOptions = {
  autoIndex: false,
  useNewUrlParser: true,
  useUnifiedTopology: true
};

Mongoose.set('debug', true);
let dbMain = Mongoose.createConnection(process.env.MONGO_DB_CONNECTION, mongooseOptions);
let dbRep = Mongoose.createConnection(process.env.MONGO_DB_REPLICATION_CONNECTION, mongooseOptions);

const connect = async () => {
  dbMain = !dbMain.readyState >= 1 
    ? await Mongoose.createConnection(process.env.MONGO_DB_CONNECTION, mongooseOptions)
    : dbMain;
  dbRep = !dbRep.readyState >= 1 
    ? await Mongoose.createConnection(process.env.MONGO_DB_REPLICATION_CONNECTION, mongooseOptions)
    : dbRep;
  return {
    dbMain,
    dbRep
  }
}

module.exports = { 
  models,
  connect
};