/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-unused-vars */
const cron = require('cron');
const util = require('util');
const moment = require('moment');
const exec = util.promisify(require('child_process').exec);
// const logger = require('./logger');

const JOBS = [];
const MOMENT_MINUTE_FORMAT = 'mm';
const MOMENT_HOUR_FORMAT = 'HH';
const MOMENT_DAY_FORMAT = 'DD';
const MOMENT_MONTH_FORMAT = 'MM';
const MOMENT_YEAR_FORMAT = 'YYYY';

const startCommand = async (command) => {
  const { stdout, stderr } = await exec(command);
  console.log('stdout:', stdout);
  console.error('stderr:', stderr);
};

const startCron = (job) => {
    const cronJob = new cron.CronJob(job.start, async () => {  
        startCommand(job.command);
        console.log(`cron schedule ${job.name} start`);
    });
    cronJob.start();
    JOBS.push({cron: cronJob, name: job.name});
}

// -------------------------------------------------
startCron({
    name: 'backup-mongo-partners_api',
    description: 'backup partners api database',
    start: `0 ${moment().add(5,'minute').format(MOMENT_MINUTE_FORMAT)} ${moment().format(MOMENT_HOUR_FORMAT)} * * *`,
    command: 'pm2 start "yarn backup:mongo:partners_api" --no-autorestart',
    file: 'services/backupMongo.js'
});

startCron({
    name: 'backup-mongo-api',
    description: 'backup api database',
    start: `0 ${moment().add(5,'minute').format(MOMENT_MINUTE_FORMAT)} ${moment().format(MOMENT_HOUR_FORMAT)} * * *`,
    command: 'pm2 start "yarn backup:mongo:api" --no-autorestart',
    file: 'services/backupMongo.js'
});

startCron({
    name: 'crawler-checker',
    description: 'crawler checker offers and products',
    start: `0 ${moment().add(10,'minute').format(MOMENT_MINUTE_FORMAT)} ${moment().format(MOMENT_HOUR_FORMAT)} * * *`,
    command: 'pm2 start "yarn crawler:start"',
    file: 'services/crawler.js'
});

// startCron({
//     name: 'remove-repeated-offers',
//     description: 'cleanup db, removing repeated offers',
//     start: `0 ${moment().add(2,'minute').format(MOMENT_MINUTE_FORMAT)} */1 * * *`,
//     command: 'pm2 start "yarn cron:repeated" --no-autorestart',
//     file: 'services/repeatedMongo.js'
// });

// working in cron maintenance - to delete all solution
// startCron({
//     name: 'cleanup-mongo-backups',
//     description: 'cleanup database mongo from old offers and do backups',
//     start: `0 ${moment().add(3,'minute').format(MOMENT_MINUTE_FORMAT)} ${moment().format(MOMENT_HOUR_FORMAT)} * * *`,
//     command: 'pm2 start "yarn cleanup:start" --no-autorestart',
//     file: 'services/cleanupMongo.js'
// });

startCron({
    name: 'cleanup-redis',
    description: 'cleanup, reset redis database (flush)',
    start: `0 ${moment().add(4,'minute').format(MOMENT_MINUTE_FORMAT)} */1 * * *`,
    command: 'pm2 start "yarn redis:reset" --no-autorestart',
    file: 'services/redisReset.js'
});

startCron({
    name: 'currency-update',
    description: 'currency rate update table',
    start: `0 ${moment().add(5,'minute').format(MOMENT_MINUTE_FORMAT)} ${moment().format(MOMENT_HOUR_FORMAT)} * * *`,
    command: 'pm2 start "yarn currency:update" --no-autorestart',
    file: 'services/currencyConverter.js'
});

startCron({
    name: 'warmingup-cache',
    description: 'check website, warming up with redis cache',
    start: `0 ${moment().add(6,'minute').format(MOMENT_MINUTE_FORMAT)} */4 * * *`,
    command: 'pm2 start "yarn loadcache" --no-autorestart',
    file: 'services/loadCache.js'
});

// startCron({
//     name: 'import-offers-honey',
//     description: 'import offers from scraper',
//     start: `0 ${moment().add(7,'minute').format(MOMENT_MINUTE_FORMAT)} ${moment().format(MOMENT_HOUR_FORMAT)} * * *`,
//     command: 'pm2 start "yarn scraper:import-offers" --no-autorestart',
//     file: 'services/scraperHoney.js'
// });

// startCron({
//     name: 'fix-countryCode',
//     description: 'fix countryCode - import from honey',
//     start: `0 */15 * * * *`,
//     command: 'pm2 start "yarn stores:update:country-code" --no-autorestart',
//     file: 'services/storesUpdate.js'
// });

// startCron({
//     name: 'update-information-about-stores',
//     description: 'update information about stores',
//     start: `0 ${moment().add(8,'minute').format(MOMENT_MINUTE_FORMAT)} * * * *`,
//     command: 'pm2 start "yarn stores:update" --no-autorestart',
//     file: 'services/storesUpdate'
// });

// to delete ? - refactpr
// startCron({
//     name: 'check-quality-of-stores',
//     description: 'checking quality of stores',
//     start: `0 ${moment().add(9,'minute').format(MOMENT_MINUTE_FORMAT)} * * * *`,
//     command: 'pm2 start "yarn stores:check" --no-autorestart',
//     file: 'services/storesChecker'
// });

// startCron({
//     name: 'update-information-about-stores-categories',
//     description: 'update information about stores categories',
//     start: `0 ${moment().add(10,'minute').format(MOMENT_MINUTE_FORMAT)} * * * *`,
//     command: 'pm2 start "yarn stores:update:categories" --no-autorestart',
//     file: 'services/storesUpdate'
// });

// startCron({
//     name: 'update-information-about-stores-logo',
//     description: 'update information about stores logo',
//     start: `0 ${moment().add(11,'minute').format(MOMENT_MINUTE_FORMAT)} * * * *`,
//     command: 'pm2 start "yarn stores:update:logo" --no-autorestart',
//     file: 'services/storesUpdate'
// });

// startCron({
//     name: 'update-short-title-offers',
//     description: 'update short title in offers',
//     start: `0 ${moment().add(12,'minute').format(MOMENT_MINUTE_FORMAT)} * * * *`,
//     command: 'pm2 start "yarn refresh:title" --no-autorestart',
//     file: 'services/refreshShortTitle'
// });
