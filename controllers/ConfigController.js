const db = require('../models/index');

const get = async () => db.models.Config.find({}).exec();

const getByParams = async (query,fields=null) => db.models.Config.find(query,fields).exec();

const create = async (record) => db.models.Config.create(record);

const update = async (query, record) => db.models.Config.findOneAndUpdate(query, record).exec();

const findById = async (id) => db.models.Config.findById(id).exec();

const closeDB = async () => db.mongoose.close();

module.exports = { get, create, update, getByParams, findById, closeDB };