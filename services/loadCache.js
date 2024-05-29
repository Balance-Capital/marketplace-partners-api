/* eslint-disable no-console */
/* eslint-disable no-continue */
/* eslint-disable no-await-in-loop */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-restricted-syntax */
require('dotenv').config();
const axios = require('axios');

const {
    SIGNAL_INIT,
    SIGNAL_PING,
    SIGNAL_PONG,
    SIGNAL_STATUS,
    SIGNAL_STATUS_OK,
    SIGNAL_STATUS_ERROR,
    SIGNAL_KILL
} = require('../constants/threads');

const {
    DEVELOPMENT,
    STAGING,
    TEST,
    DOMAIN_TEST_TEST,
    DOMAIN_TEST_DEVELOPMENT,
    DOMAIN_TEST_STAGING,
    DOMAIN_TEST_PRODUCTION,
    SEO_TOOL_DOMAIN
} = require('../constants/enviroment');

const MESSAGE_RESOLVE = 'cache warming up done';

let DOMAIN_TEST;
let RUNING = false;

switch(process.env.APP_ENV) {
    case DEVELOPMENT : DOMAIN_TEST = DOMAIN_TEST_STAGING || DOMAIN_TEST_DEVELOPMENT; break;
    case STAGING : DOMAIN_TEST = DOMAIN_TEST_STAGING; break;
    case TEST : DOMAIN_TEST = DOMAIN_TEST_TEST; break;
    default: DOMAIN_TEST = DOMAIN_TEST_PRODUCTION;
};

const DOMAIN_TEST_KEYWORDS = SEO_TOOL_DOMAIN;
const SEO_REPORT = false; // process.env.APP_ENV !== DEVELOPMENT;

const db = require('../models/index');
const dbApi = require('../models/apiDatabase')

const logger = require('./logger');

function* groupSiteGenerator(array) {
    yield* array;
};

const checkUrl = async (url) => {
    const options = {
        method: 'get',
        url
    };
    return axios(options);
};

const generate = async (url) => {
    const timerStart = Date.now();
    const status = await checkUrl(`${DOMAIN_TEST}/site/${url}`)
    .then(response => response.status)
    .catch(error => error && error.response && error.response.status)
    ;
    const responseTime = Date.now() - timerStart;
    const report = (status === 200 && SEO_REPORT)
        ? await checkUrl(`${DOMAIN_TEST_KEYWORDS}${DOMAIN_TEST}/site/${url}`).then(response=>response.data)
        : {
            title: { robots: '', text: null, size: 0, accurate: 0},
            words: { density: []}
        };
    
    const model = new db.models.LogUrls();
    model.url = `${DOMAIN_TEST}/site/${url}`;
    model.status = status || 0;
    model.robots = report && report.title && report.title.robots || null;
    model.title = {
        text: report && report.title && report.title.text || null,
        length: report && report.title && report.title.size || 0,
        accurate: report && report.title && report.title.accurate || 0
    };
    model.responseTime = responseTime/1000 || 0;
    model.keywords = report && report.words && report.words.density || null;
    model.save().catch(error => console.log(error));
};

const loadCache = (limit = null) => new Promise((resolve, reject) => {
    RUNING = true;
    
    db.models.LogUrls.deleteMany().exec();

    dbApi.apiDatabase.model('Stores', dbApi.models.Stores.schema).getAllOffersForSiteMap(limit)
    .catch(error => reject(error))
    .then(async groupSite => {
        try {
            const iterableGroupSite = groupSiteGenerator(groupSite);
    
            for(const value of iterableGroupSite) {
                const { origin, domain } = value;
                    
                const _domain = domain || origin;
                try {
                    await generate(_domain);
                } catch(error) {
                    logger.error(`catch:${error}`);
                };
            
            };
            resolve(MESSAGE_RESOLVE);
            RUNING = false;
    
        } catch(error) {
            reject(error);
            RUNING = false;
        };

    });
})

process.on('message', (msg) => {
    switch(msg) {
        case SIGNAL_PING: process.send(SIGNAL_PONG); process.exit(); break;
        case SIGNAL_STATUS: process.send(RUNING ? SIGNAL_STATUS_OK : SIGNAL_STATUS_ERROR);break;
        case SIGNAL_INIT: loadCache().then(result=>{
            process.send(result);
            process.send(SIGNAL_KILL);
            process.exit();
        }).catch(result => {
            process.send(result);
            process.send(SIGNAL_KILL);
            process.exit();
        }); break;
        case SIGNAL_KILL : process.exit(); break;
        default: ;
    }
})

if( process.argv[2] === 'start') {
    loadCache().then((resolve)=> { console.log(resolve); process.exit();});
}

module.exports = {
    loadCache
};
