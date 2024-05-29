require('dotenv').config();
const Mongoose = require('mongoose');
// const logger = require('../services/logger');

const Products = require('./api/products');
const Referrals = require('./api/referrals');
const Stores = require('./api/stores');
const DashBoard = require('./api/dashBoard');
const Users = require('./api/users');
const Categories = require('./api/categories');
const Visitors = require('./api/visitors');
const SiteMap = require('./api/sitemaps');
const OffersReport = require('./api/offersReport');
// const RedisCacheKeys = require('./api/redisCacheKeys');
const LogProcess = require('./api/logProcess');
const Wallets = require('./api/wallets');
const Withdraw = require('./api/withdraw');
const Mails = require('./api/mails');
const ReferralsClick = require('./api/referralsClicks');

const mongooseOptions = {
  autoIndex: Boolean(process.env.MONGO_DB_AUTO_INDEX === 'true'),
  useNewUrlParser: true,
  useUnifiedTopology: true,
  keepAlive: true,
  connectTimeoutMS: 30000  
};

Mongoose.set('debug', Boolean(process.env.MONGO_DB_DEBUG === 'true'));
let apiDatabase = Mongoose.createConnection(process.env.MONGO_DB_API_DATABASE_CONNECTION, mongooseOptions);

const connect = async () => {
  apiDatabase = !apiDatabase.readyState >= 1 
    ? Mongoose.createConnection(process.env.MONGO_DB_API_DATABASE_CONNECTION, mongooseOptions)
    : apiDatabase;
    return apiDatabase;
};

const models = {
  Categories,
  Products,
  Referrals,
  Stores,
  DashBoard,
  Users,
  Visitors,
  SiteMap,
  OffersReport,
  // RedisCacheKeys,
  LogProcess,
  Wallets,
  Withdraw,
  Mails,
  ReferralsClick
};

module.exports = {
  models,
  connect,
  apiDatabase
};
