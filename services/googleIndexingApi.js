require('dotenv').config();
const {google} = require('googleapis');
const moment = require('moment');

const MODULE_NAME = 'GoogleIndexingApi';

const { 
    GOOGLE_AUTH_SCOPE_INDEXING, 
    GOOGLE_INDEXING_TYPE_UPDATED
} = require('../constants/sitemap');

const {
    PRODUCTION
} = require('../constants/enviroment');

const LIMIT = 10;

const APP_ENV = process.env.APP_ENV || 'none';

const MAIN_URL = 'https://XXX';

const configFile = './resources/private/google_service_account_XXX.json';

const logger = require('./logger');

const db = require('../models/index');

const auth = new google.auth.GoogleAuth({
    keyFilename: configFile,
    scopes: [GOOGLE_AUTH_SCOPE_INDEXING]
});

const addOrUpdateUrl = async (allData) => {
    const authClient = await auth.getClient();
    await allData.forEach((item) => { 
        google.indexing({version:'v3', auth: authClient}).urlNotifications.publish({
            requestBody: {
                "notifyTime": `${moment().toISOString()}`,
                "type": GOOGLE_INDEXING_TYPE_UPDATED,
                "url": `${item.loc}`
            }
        }).then((results) => {
            const meta = results.data.urlNotificationMetadata.latestUpdate;
            const domain = meta.url.replace(MAIN_URL,'')
            const updateTime = moment(meta.notifyTime).toDate();
            db.models.Stores.updateOne({domain},{publicIndexing: updateTime}).exec();
        }).catch((err) => logger.error(`${MODULE_NAME}: ${err}`));
    });
};

const getData = async () => {
    const data = await db.models.Stores
        .find({
            indexing: true,
            publicIndexing: null
            },{domain:1})
        .limit(LIMIT)
        .exec()
        .then((stores) => stores.map((store) => ({
                loc: `${MAIN_URL}${store.domain}`
            })));
    return data;
};

const googleIndexingApiCron = () => new Promise((resolve, reject) => {
    const resolveText = `${MODULE_NAME}: done`;
    const resolveTextNotProduction = `${MODULE_NAME}: no prod, skip`;
    try {
        if(APP_ENV !== PRODUCTION) {
            resolve(resolveTextNotProduction);
            return;
        };
        getData().then((allData) => {
            addOrUpdateUrl(allData).then(()=>{
                resolve(resolveText);
            });    
        });
    } catch(err) {
        reject(err);
    }
});

module.exports = {
    addOrUpdateUrl,
    getData,
    googleIndexingApiCron
};