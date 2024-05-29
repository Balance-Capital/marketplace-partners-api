/* eslint-disable prefer-destructuring */
/* eslint-disable no-restricted-syntax */
/* eslint-disable import/no-extraneous-dependencies */
const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const fs = require('fs');
const moment = require('moment');

const PATH_TO_LOCAL_DB = 'resources/private/currency_rate.json';

const DATA_STRUCT = {
    time: moment().toDate(),
    from: 'EUR',
    to: 'USD',
    rate: 1
};

const oxr = require('open-exchange-rates');

const logger = require('./logger');

oxr.set({ app_id: process.env.OPEN_EXCHANGE_RATES_APP_ID });

const getRates = (callback) => {
    try {
        let fix = 0;
        oxr.latest(() => {
            if(fix === 0) {
                fix+=1;
                const rates = Object.entries(oxr.rates);
                const sets = [];
                for(const rate of rates) {
                    const newData = Object.create(DATA_STRUCT);
                    newData.to = 'USD';
                    newData.from = rate[0];
                    newData.rate = 1/rate[1];
                    newData.time = moment().toDate();
                    sets.push(newData);
                };
                callback(sets);
            };            
        });    
    } catch (err) {
        logger.warning(`[currency converter] getRates ${err?.message}`, err)
    }
};

const updateRateTable = () => {
    try {
        let db = [];
        if(fs.existsSync(PATH_TO_LOCAL_DB))
            db = JSON.parse( fs.readFileSync(PATH_TO_LOCAL_DB).toString('utf8') || '[]' );
        const dbChange = db.length || 0;
        const saveResults = (results) => {
            for(const result of results) {    
                const is = db.filter((item) => {
                    const date = moment(item.time).startOf('day').isAfter(moment().subtract(1,'day').startOf('day'));
                    const pair = item.from === result.from ;
                    return date && pair;
                });
                if(is.length === 0) {
                    db.push(result)
                }
            }
            if(db.length > 0 && dbChange < db.length)
                fs.writeFileSync(PATH_TO_LOCAL_DB, JSON.stringify(db));
        };
        getRates(saveResults);    
    } catch(err) {
        logger.warning(`[currency converter] updateRateTable ${err?.message}`, err)
    }
};

const converter = (resolve, reject, currency) => {
    try {
        if(!currency) reject(false);
        if(currency) {
            let db = [];
            if(fs.existsSync(PATH_TO_LOCAL_DB))
                db = JSON.parse( fs.readFileSync(PATH_TO_LOCAL_DB).toString('utf8') || '[]' );
            
            const result = db.filter((item) => item.from === currency && moment(item.time).startOf('day').isAfter(moment().subtract(1,'day').startOf('day')));

            const r = result.length > 0 ? result[0].rate : null;
            if(r === null) {
                updateRateTable();
                setTimeout(()=> {
                    converter(resolve, reject, currency);
                }, 15000);
            } else {
                resolve(r);
            }
        };    
    } catch(err) {
        logger.warning(`[currency converter] converter ${err?.message}`, err, currency)
        reject(err);
    }
};

const getCurrentRate = (currency) => new Promise((resolve, reject) => {
    try {
        converter(resolve, reject, currency.toUpperCase());
    } catch (err) {
        logger.warning(`[currency converter] getCurrentRate ${err?.message}`, err, currency)
        reject(err);
    };
});

if(process.argv[2] === 'update') {
    updateRateTable()
};

if(process.argv[2] === 'test') {
    getCurrentRate('EUR').then((rate) => console.log(rate));
};

module.exports = {
    getCurrentRate,
    updateRateTable
}