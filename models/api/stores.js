require('dotenv').config();
const mongoose = require('mongoose');
const moment = require('moment');
const { ObjectId } = require('bson');

const offersFilterValidDateSelect = require('../../constants/offersFilterValidDateSelect');

const {
  QUERY_LIMIT,
  QUERY_OFFSET
} = require('../../constants/query');

const {
  PERCENTAGE,
  SIGN_PERCENTAGE
} = require('../../constants/offersValueType');

const {
  FILTER_BY_VALID_DATE,
  SIDEBAR_GET_SIMILAR_COUPONS,
  SIDEBAR_FEATURE_RETAILER,
  OFFERS_SCORE_FUNCTION
} = require('../../constants/cacheKeyNames');

const logger = require('../../services/logger');
const offersScore = require('./offersScore');
const offers = require('./offers');
const faq = require('./faq');
const redisCacheKeys = require('../redisCacheKeys');

const { getCache } = require('../../utils/getCache');

const { Schema } = mongoose;

const Stores = new Schema(
  {
    skimLinksId: {
      type: Number
    },
    partnerSource: {
      type: String
    },
    name: {
      type: String
    },
    logo: {
      type: String
    },
    priority: {
      type: Number
    },
    domains: {
      type: Array
    },
    domain: {
      type: String
    },
    countries: {
      type: Array
    },
    country: {
      type: String
    },
    categories: {
      type: Array
    },
    epc: {
      type: mongoose.Decimal128
    },
    averageCommissionRate: {
      type: mongoose.Decimal128
    },
    averageBasketSize: {
      type: mongoose.Decimal128
    },
    averageConversionRate: {
      type: mongoose.Decimal128
    },
    specialRateType: {
      type: String
    },
    offers: {
      type: [offers.schema]
    },
    description: {
      type: String,
      default: null
    },
    faq: {
      type: [faq.schema]
    },
    aboutOffers: {
      type: String
    },
    meta: {
      type: String
    },
    offersScore: {
      type: offersScore.schema
    },
    star: {
      type: Number,
      default: 5
    },
    backup: {
      type: []
    },
    publicIndexing: {
      type: Date,
      default: null
    },
    indexing: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: false
    },
    checked: {
      type: {
        date: {
          type: Date
        }
      }
    },
    seo: {
      type: {
        contentLength: {
          type: Number,
          default: 0
        },
        contentUpdatedAt: {
          type: Date,
          default: null
        },
        jarvisContentUpdatedAt: {
          type: Date,
          default: null
        },
        dateManualCheck : {
          type: Date,
          default: null
        },
        longTail: {
          type: String,
          default: null
        }
      }
    }
  },
  { timestamps: true, autoCreate: true, autoIndex: Boolean(process.env.MONGO_DB_AUTO_INDEX === 'true') }
);

Stores.index({'categories': 1}, {collation: { locale: 'en', strength: 2 } });
Stores.index({'priority': 1});
Stores.index({'name': 1}, {collation: { locale: 'en', strength: 2 } });
Stores.index({'domains': 1}, {collation: { locale: 'en', strength: 2 } });
Stores.index({'domain': 1}, {unique:true, collation: { locale: 'en', strength: 2 } });
Stores.index({'offers._id': 1});
Stores.index({'offers.shortTitle': 1});
Stores.index({'offers.originId': 1});
Stores.index({"offers.verified": 1});
Stores.index({"offers.validDate": -1});
Stores.index({"offers.startDate": -1});
Stores.index({'offers.origin': 1}, {collation: { locale: 'en', strength: 2 } });
Stores.index({'offers.title': 1}, {collation: { locale: 'en', strength: 2 } });
Stores.index({"offers.redirectUrl": 1});
Stores.index({"offers.partnerSource": 1});
Stores.index({"offers.checked.httpStatus": 1});
Stores.index({"offers.checked.date": 1});

const filterByValidDate = async function filterByValidDate({firstMatch, lastMatch, limitQuery, offsetQuery, sort, countryCode='US' }) {
  const offset = offsetQuery || QUERY_OFFSET;
  const limit = limitQuery || QUERY_LIMIT;

  const query = [
    { $match: { isActive: true } },
    { $match: { 'offers.validDate': { $gte: moment().startOf('day').toDate()} } },
    { $match: { 'offers.startDate': { $lte: moment().startOf('day').toDate()} } },
    { $match: { 'offers.checked.httpStatus': 200} },
    { $match: { 'offers.countryCode': countryCode } },
    { $project: {
        ...offersFilterValidDateSelect,
        offers: {
          $slice:[{
            $filter: {
              input: '$offers',
              as: 'offer',
              cond: {
                $and: [
                  {$gte: ['$$offer.validDate', moment().startOf('day').toDate()]},
                  {$lte: ['$$offer.startDate', moment().startOf('day').toDate()]},
                  {$eq: ['$$offer.checked.httpStatus', 200]},
                  // {$eq: ['$$offer.countryCode', countryCode ]}
                  {$in: [countryCode, '$$offer.countryCode']}
                  // {$ne: ['$$offer.redirectUrl', null]}
                ]
              }
            }
          }, offset, limitQuery]
        }
      }
    }
  ];
  const queryWithoutSlice = [
    { $match: { isActive: true } },
    { $match: { 'offers.validDate': { $gte: moment().startOf('day').toDate()} } },
    { $match: { 'offers.startDate': { $lte: moment().startOf('day').toDate()} } },
    { $match: { 'offers.checked.httpStatus': 200} },
    { $match: { 'offers.countryCode': countryCode } },
    { $project: {
        ...offersFilterValidDateSelect,
        offers: {
          $filter: {
            input: '$offers',
            as: 'offer',
            cond: {
              $and: [
                {$gte: ['$$offer.validDate', moment().startOf('day').toDate()]},
                {$lte: ['$$offer.startDate', moment().startOf('day').toDate()]},
                {$eq: ['$$offer.checked.httpStatus', 200]},
                // {$eq: ['$$offer.countryCode', countryCode ]}
                {$in: [countryCode, '$$offer.countryCode']}
                // {$ne: ['$$offer.redirectUrl', null]}
              ]
            }
          }
        }
      }
    }
  ];

  if(lastMatch && limit < 0) {
    queryWithoutSlice.push(lastMatch);
  } else if(lastMatch) {
    query.push(lastMatch);
  };

  if(firstMatch && limit < 0) {
    queryWithoutSlice.unshift(firstMatch);
  } else if(firstMatch) {
    query.unshift(firstMatch);
  };
  
  const aggregate = this.aggregate(
    limit < 0 
      ? queryWithoutSlice
      : query
  );

  if(limit!==-1) aggregate.limit(limit+offset);  

  aggregate.skip(offset)
  if(sort) aggregate.sort(sort);

  const aggregateCache = getCache(aggregate, redisCacheKeys, FILTER_BY_VALID_DATE);
  const result = await aggregateCache.then(r=>r).catch(error=>logger.error(error));
  
  return result;
};

const sideBarGetSimilarCoupons = async function sideBarGetSimilarCoupons(store) {
  const similarCouponsFilter = [
    { $match: { isActive: true } },
    { $match: { 'offers.validDate': { $gte: moment().startOf('day').toDate()} } },
    { $match: { 'offers.startDate': { $lte: moment().startOf('day').toDate()} } },
    { $match: { categories: { $in: store.categories || [] } } },
    { $match: { offers: { $ne: []} } },
    { $match: { 'offers.countryCode': store.country } },
    { $match: { domain: {$ne: store.domain} } },
    { $match: { 'offers.checked.httpStatus': 200} },
    { $project: {
      name: 1,
      domains: 1,
      domain: 1,
      categories: 1,
      logo: 1,
      seo: 1,
      offers: {
        $slice:[{
          $filter: {
            input: '$offers',
            as: 'offer',
              cond: {
                $and: [
                  {$ne: ['$$offer.redirectUrl', null]},
                  {$eq: ['$$offer.checked.httpStatus', 200]},
                  {$in: [store?.country, '$$offer.countryCode']}
                ]
              }
            }
          },1]  
        }
      }
    },
    { $match: { domain: {$ne:null}, categories: {$ne:[]} } }
  ];  
  const similarCoupons = this.aggregate(similarCouponsFilter).limit(QUERY_LIMIT);

  const similarCouponsCache = getCache(similarCoupons, redisCacheKeys, SIDEBAR_GET_SIMILAR_COUPONS);

  const result = await similarCouponsCache
    .then(results => results)
    .catch(error=>logger.error(error))
    ;
  
  if (result.length === 1) {
    const filter = [...similarCouponsFilter];
    filter[0] = {$match: { priority: store.priority }};
    const mock = await this.aggregate(filter).limit(QUERY_LIMIT).exec();
    return mock.map(item  => ({ 
      name: item.name, 
      domains:item.domains, 
      domain:item.domain, 
      categories:item.categories,
      longTail: item?.seo?.longTail || null,
      logo: item.logo
    })).reduce((a,b) => {
      if(!a.filter(item => item.name === b.name).length) 
        a.push(b); 
      return a;
    },[]);
  }

  return result.map(item  => ({ 
    name: item.name, 
    domains:item.domains, 
    domain:item.domain, 
    categories:item.categories,
    longTail: item?.seo?.longTail || null,
    logo: item.logo
  })).reduce((a,b) => {
    if(!a.filter(item => item.name === b.name).length) 
      a.push(b); 
    return a;
  },[]);

};

const sideBarFeatureRetailer = async function sideBarFeatureRetailer(store) {
  const featureFilter = [
    { $match: { isActive: true } },
    { $match: { 'offers.validDate': { $gte: moment().startOf('day').toDate()} } },
    { $match: { 'offers.startDate': { $lte: moment().startOf('day').toDate()} } },
    { $match: { priority: store.priority } },
    { $match: { domain: {$ne: store.domain} } },
    { $match: { 'offers.checked.httpStatus': 200} },
    { $match: { country: store?.country } },    
    { $match: { 'offers.countryCode': store?.country } },    
    { $project: {
      name: 1,
      domains: 1,
      domain: 1,
      logo: 1,
      id: 1,
      seo: 1,
      offers: {
        $slice:[{
          $filter: {
            input: '$offers',
            as: 'offer',
              cond: {
                $and: [
                  { $gte: [ '$$offer.validDate', moment().startOf('day').toDate() ] },
                  { $lte: [ '$$offer.startDate', moment().startOf('day').toDate() ] },
                  { $eq: ['$$offer.checked.httpStatus', 200]},
                  { $in: [store?.country, '$$offer.countryCode']},
                  { $ne: ['$$offer.redirectUrl', null]}
                ]
              }
            }
          },1]
        }
      }
    }
  ];  

  const featureRetailer = this.aggregate(featureFilter).limit(QUERY_LIMIT);
  
  const featureRetailerCache = getCache(featureRetailer, redisCacheKeys, SIDEBAR_FEATURE_RETAILER);
  const result = await featureRetailerCache.then(results => results).catch(error=>logger.error(error));

  return result.map(item  => ({ 
    name: item.name, 
    domains:item.domains, 
    domain:item.domain, 
    id:item.id,
    logo: item.logo,
    longTail: item?.seo?.longTail || null
  }));

};

/**
 * 
 * @param {*} limit 
 * @returns 
 */
const getAllOffersForSiteMap = async function getAllOffersForSiteMap(limit=null) {
  const models = this.find({ 
    domain: { $ne: null }, 
    'offers.validDate': { $gte: moment().startOf('day').toDate()},
    'offers.startDate': { $lte: moment().startOf('day').toDate()},
    'offers.checked.httpStatus': 200,
    isActive: true
  });
  if(limit)
    models.limit(limit);
  const result = await models.exec();

  const deduplicateTitleAndValidDate = result.map(store => {
    const localStore = store;
    localStore.offers = store.offers.reduce((a,b) => {
      if(
        b.validDate >= moment().startOf('day').toDate() 
        && b.startDate <= moment().startOf('day').toDate()
        && !a.filter(pos => pos.title === b.title).length
      ) {
          a.push(b);
      }
      return a;
      },[]);
    return localStore;
  }).reduce((a,b)=>{
    if(a.filter(pos=>pos.domain === b.domain).length === 0) {
      a.push(b);
    };
    return a;
  },[]);

  return deduplicateTitleAndValidDate;
};

const offersScoreFunction = async function offersScoreFunction(storeId, countryCode='US') {
  const queryBestDiscount = [
    { $match: {_id: ObjectId(storeId)} },
    { $match: { 'offers.countryCode': countryCode } },
    {
      $project: {
        offers: {
            $filter: {
              input: '$offers',
              as: 'offer',
              cond: {
                $and: [
                  {$gte: ['$$offer.validDate', moment().startOf('day').toDate()]},
                  {$lte: ['$$offer.startDate', moment().startOf('day').toDate()]},
                  {$ne:['$$offer.value',null]},
                  {$ne: ['$$offer.redirectUrl', null]},
                  {$eq: ['$$offer.checked.httpStatus', 200]},
                  {$in: [countryCode, '$$offer.countryCode']}
                ]
              }
            }
        }
      }
    },
    {$unwind: '$offers'},
    {$sort: {'offers.value':-1}}
  ];

  const aggregateBestDiscount = this.aggregate(queryBestDiscount);

  const aggregateBestDiscountCache = getCache(aggregateBestDiscount, redisCacheKeys, OFFERS_SCORE_FUNCTION);
  const BestDiscount = await aggregateBestDiscountCache.catch(error=>logger.error(error));

  const SIGN = BestDiscount[0] && BestDiscount[0].offers.valueType === PERCENTAGE ? SIGN_PERCENTAGE : BestDiscount[0] && BestDiscount[0].offers.currency || '';
 
  const bestDiscount = BestDiscount[0] && BestDiscount[0].offers.value
    ? `${BestDiscount[0].offers.value}${SIGN}`
    : null;

  const queryCouponCodes = [
    { $match: {_id: ObjectId(storeId)} },
    { $match: { 'offers.countryCode': countryCode } },
    {
      $project: {
        offers: {
          $size: {
            $filter: {
              input: '$offers',
              as: 'offer',
              cond: {
                $and: [
                  {$gte: ['$$offer.validDate', moment().startOf('day').toDate()]},
                  {$lte: ['$$offer.startDate', moment().startOf('day').toDate()]},
                  {$ne: ['$$offer.code',null]},
                  {$ne: ['$$offer.redirectUrl', null]},
                  {$eq: ['$$offer.checked.httpStatus', 200]},
                  {$in: [countryCode, '$$offer.countryCode']}
                ]
              }
            }
          }
        }
      }
    }
  ];
  const aggregateCouponCodes = this.aggregate(queryCouponCodes);

  const aggregateCouponCodesCache = getCache(aggregateCouponCodes, redisCacheKeys, OFFERS_SCORE_FUNCTION);
  const couponCodes = await aggregateCouponCodesCache.catch(error=>logger.error(error));

  const queryTotalOffers = [
    { $match: {_id: ObjectId(storeId)} },
    { $match: { 'offers.countryCode': countryCode } },
    {
      $project: {
        offers: {
          $size: {
            $filter: {
              input: '$offers',
              as: 'offer',
              cond: {
                $and: [
                  {$gte: ['$$offer.validDate', moment().startOf('day').toDate()]},
                  {$lte: ['$$offer.startDate', moment().startOf('day').toDate()]},
                  {$eq: ['$$offer.checked.httpStatus', 200]},
                  {$ne: ['$$offer.redirectUrl', null]},
                  {$in: [countryCode, '$$offer.countryCode']}
                ]
              }
            }
          }
        }
      }
    }   
  ];
  const aggregateTotalOffers = this.aggregate(queryTotalOffers);
  const aggregateTotalOffersCache = getCache(aggregateTotalOffers, redisCacheKeys, OFFERS_SCORE_FUNCTION);
  const totalOffers = await aggregateTotalOffersCache.catch(error=>logger.error(error));

  const queryAvgSaving = [
    { $match: {_id: ObjectId(storeId)} },
    { $match: { 'offers.countryCode': countryCode } },
    {
      $project: {
        offers: {
          $filter: {
            input: '$offers',
            as: 'offer',
            cond: {
              $and: [
                {$gte: ['$$offer.validDate', moment().startOf('day').toDate()]},
                {$lte: ['$$offer.startDate', moment().startOf('day').toDate()]},
                {$ne: ['$$offer.value',null]},
                {$ne: ['$$offer.value',' ']},
                {$eq: ['$$offer.checked.httpStatus', 200]},
                {$ne: ['$$offer.redirectUrl', null]},
                {$in: [countryCode, '$$offer.countryCode']}
              ]
            }
          }
        }
      }
    },
    {$unwind: '$offers'},
    {$group: {
        '_id' : '$_id',
        'documentsAvg' : { $avg : '$offers.value' }
      }
    }
  ];

  const aggregateAvgSavings = this.aggregate(queryAvgSaving);

  const aggregateAvgSavingsCache = getCache(aggregateAvgSavings, redisCacheKeys, OFFERS_SCORE_FUNCTION);
  const avgSavings = await aggregateAvgSavingsCache.catch(error=>logger.error(error));

  return {
    bestDiscount: SIGN !== '' 
      ? bestDiscount 
      : null,
    couponCodes: couponCodes[0] && couponCodes[0].offers || 0,
    totalOffers: totalOffers[0] && totalOffers[0].offers || 0,
    avgSavings: SIGN !== '' 
      ? `${avgSavings[0] && Math.ceil(avgSavings[0].documentsAvg) || 0}${SIGN}`
      : null
  };

};

const searchBar = async function serachBar({firstMatch, lastMatch, limitQuery, offsetQuery, sort, countryCode='US' }) {
  const offset = offsetQuery || QUERY_OFFSET;
  const limit = limitQuery || QUERY_LIMIT;

  const query = [
    { $match: { isActive: true, offers: {$ne: []} } },
    { $match: { country: new RegExp(`${countryCode}`,'gui') } },
    { $match: { 'offers.checked.httpStatus': 200} },
    { $match: { 'offers.validDate': { $gte: moment().startOf('day').toDate()} } },
    { $match: { 'offers.startDate': { $lte: moment().startOf('day').toDate()} } },
    { $match: { domain: { $ne: null } } },
    { $match: { 'offers.countryCode': countryCode } },
    {
      $project: {
        ...offersFilterValidDateSelect,
        offers: {
          $slice:[{
            $filter: {
              input: '$offers',
              as: 'offer',
              cond: {
                $and: [
                  {$ne: ['$$offer.redirectUrl', null]},
                  {$gte: ['$$offer.validDate', moment().startOf('day').toDate()]},
                  {$lte: ['$$offer.startDate', moment().startOf('day').toDate()]},
                  {$ne: ['$$offer.value',null]},
                  {$eq: ['$$offer.checked.httpStatus', 200]},
                  {$ne: ['$$offer.value',' ']},
                  {$in: [countryCode, '$$offer.countryCode']}
                ]
              }
            }
          }, offset, limitQuery]
        }
      }
    }
  ];

  const queryWithoutSlice = [
    { $match: { isActive: true, offers: {$ne: []} } },
    { $match: { 'offers.validDate': { $gte: moment().startOf('day').toDate()} } },
    { $match: { 'offers.startDate': { $lte: moment().startOf('day').toDate()} } },
    { $match: { 'offers.checked.httpStatus': 200} },
    { $match: { domain: { $ne: null } } },
    { $match: { 'offers.countryCode': countryCode } },
    {
      $project: {
        ...offersFilterValidDateSelect,
        offers: {
          $filter: {
            input: '$offers',
            as: 'offer',
            cond: {
              $and: [
                {$ne: ['$$offer.redirectUrl', null]},
                {$gte: ['$$offer.validDate', moment().startOf('day').toDate()]},
                {$lte: ['$$offer.startDate', moment().startOf('day').toDate()]},
                {$eq: ['$$offer.checked.httpStatus', 200]},
                {$ne: ['$$offer.value',null]},
                {$ne: ['$$offer.value',' ']},
                {$in: [countryCode, '$$offer.countryCode']}
              ]
            }
          }
        }
      }
    }
  ];

  if(lastMatch && limit < 0) {
    queryWithoutSlice.push(lastMatch);
  } else if(lastMatch) {
    query.push(lastMatch);
  };

  if(firstMatch && limit < 0) {
    queryWithoutSlice.unshift(firstMatch);
  } else if(firstMatch) {
    query.unshift(firstMatch);
  };
  
  const aggregate = this.aggregate(
    limit < 0 
      ? queryWithoutSlice
      : query
  );

  if(limit!==-1) aggregate.limit(limit+offset);  

  aggregate.skip(offset)
  if(sort) aggregate.sort(sort);

  const aggregateCache = getCache(aggregate, redisCacheKeys, FILTER_BY_VALID_DATE);
  const result = await aggregateCache.then(r=>r).catch(error=>logger.error(error));

  return result;
};

Stores.statics.offersScoreFunction = offersScoreFunction;
Stores.statics.getAllOffersForSiteMap = getAllOffersForSiteMap;
Stores.statics.sideBarFeatureRetailer = sideBarFeatureRetailer;
Stores.statics.filterByValidDate = filterByValidDate;
Stores.statics.sideBarGetSimilarCoupons = sideBarGetSimilarCoupons;
Stores.statics.searchBar = searchBar;

const model = mongoose.model('Stores', Stores);
module.exports = model;