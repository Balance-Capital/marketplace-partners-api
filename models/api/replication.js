require('dotenv').config();
const Mongoose = require('mongoose');

const Users = require('./users');
const Visitors = require('./visitors');
const Stores = require('./stores');
const SiteMap = require('./sitemaps');
const OffersReport = require('./offersReport');
const DashBoard = require('./dashBoard');
const RedisCacheKeys = require('./redisCacheKeys');
const LogProcess = require('./logProcess');
const Referrals = require('./referrals');
const Products = require('./products');
const Wallets = require('./wallets');
const Withdraw = require('./withdraw');
const Mails = require('./mails');

const models = {
    Users,
    Visitors,
    Stores,
    SiteMap,
    OffersReport,
    DashBoard,
    RedisCacheKeys,
    LogProcess,
    Referrals,
    Products,
    Wallets,
    Withdraw,
    Mails
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