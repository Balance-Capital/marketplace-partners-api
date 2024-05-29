/**
 * Refactoring: to remove all
 */
const cron = require('cron');
const moment = require('moment');
// const { fork } = require('child_process');

let cronRunning;
let cronMaintenanceSchedule = null;
const CRON_SCHEDULE_NAME = 'maintenance-group';
const { TALK_TIMEOUT_MINUTES } = Object.freeze({
    TALK_TIMEOUT_MINUTES: 15
});

const {
    // SIGNAL_INIT, 
    SIGNAL_KILL
    // SIGNAL_STATUS, 
    // SIGNAL_STATUS_ERROR
} = require('../constants/threads');

let LOAD_CACHE_FORK;
// const FORK_SCRIPT = 'services/loadCache.js';
const FORK_ENABLE = false;

const db = require('../models/index');

// const { 
    // updateSidebarAvailableOffers
    // updateDefaultImageStrore, 
    // updateSubdomainToDomainOrigin
// } = require('../utils/maintenance');

const { storeAndOffersSnapshotPromise } = require('../utils/reports');

const { cleanUpMongo } = require("./cleanupMongo");

// const { cronIndexingStore } = require('../utils/seo');

// const { googleIndexingApiCron } = require('./googleIndexingApi');

const { redisClient } = require('./cacheRedis');

const logger = require('./logger');

const exit = () => process.exit();

const serviceTalk = (talk) => {
    const text = typeof talk === 'string' ? talk : JSON.stringify(talk);
    try {
        db.models.CronMaintenanceSchedule.updateMany(
          { name: CRON_SCHEDULE_NAME },
          {
            $push: {
                serviceTalk: {text}
            }
          }
        ).exec().catch(error=>logger.error(error)).then(() => {
            db.models.CronMaintenanceSchedule.updateMany(
                { name: CRON_SCHEDULE_NAME },
                {
                  $pull: {
                    serviceTalk : { timestamps: {$lte: moment().subtract(TALK_TIMEOUT_MINUTES,'minutes').toDate()}}
                  }
                }
              ).exec().catch(error=>logger.error(error));              
        });        
    } catch (error) {
        logger.error(error);
    };
    
};

const cronWork = async () => {
    cronRunning = 1;

    serviceTalk('service cron start working');

    serviceTalk('service clean up old offers');
    // await cleanUpMongo().then(result => serviceTalk(result)).catch(error => serviceTalk(error));

    // serviceTalk('service seo counting conntent length');
    // await cronIndexingStore().then(result => serviceTalk(result)).catch(error => serviceTalk(error));

    // serviceTalk('start updateSubdomainToDomainOrigin');
    // await updateSubdomainToDomainOrigin().then(result => serviceTalk(result)).catch(error => serviceTalk(error));

    // serviceTalk('start updateDefaultImageStrore');
    // await updateDefaultImageStrore().then(result => serviceTalk(result)).catch(error => serviceTalk(error));

    // serviceTalk('start updateSidebarAvailableOffers');
    // await updateSidebarAvailableOffers().then(result => serviceTalk(result)).catch(error => serviceTalk(error)); 

    if(FORK_ENABLE) {
        serviceTalk('cache clear');        
        redisClient.FLUSHALL((err,success) => {
            if(success) serviceTalk('cache clear done');
            if(err) serviceTalk(`cache clear err: ${err}`);
        });

        // serviceTalk('start loadCache fork');
        // if(LOAD_CACHE_FORK) {
        //     LOAD_CACHE_FORK.send(SIGNAL_STATUS);
        // } else {
        //     LOAD_CACHE_FORK = fork(FORK_SCRIPT);
        //     LOAD_CACHE_FORK.send(SIGNAL_INIT);
        //     LOAD_CACHE_FORK.on('message', (msg) => {
        //         switch(msg) {
        //             case SIGNAL_STATUS_ERROR: 
        //                 LOAD_CACHE_FORK.send(SIGNAL_KILL);
        //                 LOAD_CACHE_FORK = null;
        //             break;
        //             case SIGNAL_KILL: LOAD_CACHE_FORK = null; break;
        //             default: serviceTalk(msg);
        //         };
        //     });    
        // };    
            
    } else {
        serviceTalk('cache clear');
        redisClient.FLUSHALL((err,success) => {
            if(success) serviceTalk('cache clear done');
            if(err) serviceTalk(`cache clear err: ${err}`);
        });
    };

    serviceTalk('start storeAndOffersSnapshotPromise');
    await storeAndOffersSnapshotPromise().then(result => serviceTalk(result)).catch(error => serviceTalk(error));

    // serviceTalk('start googleIndexingApiCron');
    // await googleIndexingApiCron().then(result => serviceTalk(result)).catch(error => serviceTalk(error));

    serviceTalk('service cron stop working');
    cronRunning = 0;

};

const cronSchedule = new cron.CronJob('*/5 * * * * *', async () => {  
    db.models.CronMaintenanceSchedule.findOne({name:CRON_SCHEDULE_NAME}).exec().then(results => {
        if(!results) return;
        if(cronMaintenanceSchedule && cronMaintenanceSchedule.running && !results.active) {
            if(cronMaintenanceSchedule) {
                cronMaintenanceSchedule.stop();
                cronMaintenanceSchedule = null;
            };
            db.models.CronMaintenanceSchedule.updateOne({name:CRON_SCHEDULE_NAME},{running: false}).exec();
            serviceTalk('service cron stop');
            if(LOAD_CACHE_FORK) {
                LOAD_CACHE_FORK.send(SIGNAL_KILL);
                LOAD_CACHE_FORK = null;    
            };
            return;
        };
        
        if(!results.active) {
            return;
        };

        if(cronMaintenanceSchedule && cronMaintenanceSchedule.running) {
            return;
        };

        cronMaintenanceSchedule = new cron.CronJob(results.start, async () => {
            if(cronRunning) return;
            cronWork();
        });

        if(cronMaintenanceSchedule && !cronMaintenanceSchedule.running) {
            cronMaintenanceSchedule.start();
            db.models.CronMaintenanceSchedule.updateOne({name:CRON_SCHEDULE_NAME},{running: true}).exec();
            serviceTalk('service cron start');
        };

    });    
});

if(process.argv[2] === 'start') {
    cronSchedule.start();
    serviceTalk('cron schedule start');
    logger.info('cron schedule start');        
};

if(process.argv[2] === 'test') {
    cronWork();     
};

module.exports = { cronSchedule, exit, cronWork };