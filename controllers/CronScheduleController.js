const db = require('../models/index');

const get = async () => db.models.CronSchedule.find({}).exec();

const getByParams = async (query) => db.models.CronSchedule.find(query).exec();

const create = async (record) => db.models.CronSchedule.create(record);

const update = async (query, record) => db.models.CronSchedule.findOneAndUpdate(query, record);

const closeDB = async () => db.mongoose.close();

module.exports = { get, create, update, getByParams, closeDB };