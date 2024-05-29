const moment = require('moment');

const TIME_OUT_MINUTES_LOG = 15;

const db = require('../models/index');

const logTimeOperations = (operationName, time, timeout) => {
    const timeOutDelete = timeout || TIME_OUT_MINUTES_LOG;
    db.models.LogTimeOperations.deleteOne({
        operationName,
        createdAt: {$lte: moment().subtract(timeOutDelete,'minutes')}
    }).exec();    

    db.models.LogTimeOperations.findOne({operationName}).exec().then(log => {
        let avg = 0;
        if(log) {
            avg = log.timeOperations.reduce((a,b)=>a+b);
            avg /= log.timeOperations.length;
        };
        db.models.LogTimeOperations.updateOne(
            {
                operationName
            }, {
                $set: {
                    avgTime: avg
                },
                $push: {
                    timeOperations: time
                }
            },{ upsert : true })
        .exec();
    });

};

module.exports = {
    logTimeOperations 
}