const cron = require('cron');
const moment = require('moment');

const {
  EXPORT_TO_API,
  SKIM_LINKS,
  EBAY,
  COMMISSION_JUNCTION,
  ADSERVICE_AN
} = require('./constants/partnersName');

const cronTab = [];

const logger = require('./services/logger');
const cronScheduelController = require('./controllers/CronScheduleController');
const skimLinksController = require('./controllers/SkimLinksController');
const exportOffersController = require('./controllers/ExportsOffersController');
const commissionJunctionController = require('./controllers/CommissionJunctionController');
const ebayController = require('./controllers/EbayController');
const adServiceAN = require('./controllers/AdServiceANController');

const cronSchedule = new cron.CronJob('* * * * * *', async () => {

  cronScheduelController.get().then(configCron => {

    configCron.forEach(async (item) => {
      const { name, start, active } = item;
      const utcDateTime = moment.utc(Date.now()).toDate();

      switch(name) {
        case SKIM_LINKS: 
          if(active && !cronTab[name]) {
            cronTab[name] = new cron.CronJob(start, skimLinksController.run);
            cronTab[name].start();
            logger.info(`CronSchedule for ${name} start at ${start} : ${utcDateTime}`)
          };

          if(!active && cronTab[name] && cronTab[name].running) {
            cronTab[name].stop();
            cronTab[name] = null;
            logger.info(`CronSchedule for ${name} stop`);
          };
        break;

        case COMMISSION_JUNCTION: 
          if(active && !cronTab[name]) {
            cronTab[name] = new cron.CronJob(start, commissionJunctionController.run);
            cronTab[name].start();
            logger.info(`CronSchedule for ${name} start at ${start} : ${utcDateTime}`)
          };

          if(!active && cronTab[name] && cronTab[name].running) {
            cronTab[name].stop();
            cronTab[name] = null;
            logger.info(`CronSchedule for ${name} stop`);
          };
        break;

        case EBAY: 
          if(active && !cronTab[name]) {
            cronTab[name] = new cron.CronJob(start, ebayController.run);
            cronTab[name].start();
            logger.info(`CronSchedule for ${name} start at ${start} : ${utcDateTime}`)
          };

          if(!active && cronTab[name] && cronTab[name].running) {
            cronTab[name].stop();
            cronTab[name] = null;
            logger.info(`CronSchedule for ${name} stop`);
          };
        break;

        case ADSERVICE_AN: 
          if(active && !cronTab[name]) {
            cronTab[name] = new cron.CronJob(start, adServiceAN.run);
            cronTab[name].start();
            logger.info(`CronSchedule for ${name} start at ${start} : ${utcDateTime}`)
          };

          if(!active && cronTab[name] && cronTab[name].running) {
            cronTab[name].stop();
            cronTab[name] = null;
            logger.info(`CronSchedule for ${name} stop`);
          };
        break;

        case EXPORT_TO_API: 
          if(active && !cronTab[name]) {
            cronTab[name] = new cron.CronJob(start, exportOffersController.run);
            cronTab[name].start();
            logger.info(`CronSchedule for ${name} start at ${start} : ${utcDateTime}`)
          };

          if(!active && cronTab[name] && cronTab[name].running) {
            cronTab[name].stop();
            cronTab[name] = null;
            logger.info(`CronSchedule for ${name} stop`);
          };
        break;

        default:
      };
        
    });
    
  });

});

cronSchedule.start();
